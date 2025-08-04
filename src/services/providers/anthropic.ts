import Anthropic from '@anthropic-ai/sdk';
import type { MCPConfigManager } from '~/services/mcp-config-manager';
import type { MCPServerManager } from '~/services/mcp-server-manager';
import { EventEmitter } from 'events';
import { validateMCPTool, convertToAnthropicFormat, type ConversationMessage, type ToolResult, type MCPTool, type AnthropicMessageParam } from '~/types';
import type { ChatLLMProvider } from '~/services/providers/types';


export class AnthropicMCPService extends EventEmitter implements ChatLLMProvider {
  readonly id = "anthropic" as const;
  private anthropic?: Anthropic;
  private serverManager?: MCPServerManager;
  private configManager?: MCPConfigManager;
  private availableTools: Map<string, MCPTool> = new Map();

  constructor() {
    super();
    // Do not initialize Anthropic SDK or read API keys on the client.
    // The SDK will be initialized server-side via initializeWithServerManagers.
  }

  /**
   * Server-only initialization. Injects managers and initializes Anthropic SDK with server-side key.
   */
  async initializeWithServerManagers(anthropicApiKey: string, serverManager: MCPServerManager, configManager?: MCPConfigManager): Promise<void> {
    this.serverManager = serverManager;
    this.configManager = configManager;

    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Wire MCP server events
    this.serverManager.on('serverStarted', (serverId: string) => { void this.updateToolsForServer(serverId); });
    this.serverManager.on('serverStopped', (serverId: string) => { this.removeToolsForServer(serverId); });

    // Load tools from all running servers
    const runningServers = Array.from(this.serverManager.getAllServerStatus().entries())
      .filter(([_, status]) => status.status === 'running')
      .map(([serverId]) => serverId);

    for (const serverId of runningServers) {
      await this.updateToolsForServer(serverId);
    }

    console.log(`Initialized Anthropic MCP Service with ${this.availableTools.size} tools (server)`);
  }

  /**
   * Backward-compat: no-op client-side initializer.
   */
  async initialize(): Promise<void> {
    if (!this.serverManager) {
      console.log(`Initialized Anthropic MCP Service (client) with 0 tools`);
      return;
    }
    // If serverManager exists but anthropic not initialized (shouldn't happen in server), skip.
    const runningServers = Array.from(this.serverManager.getAllServerStatus().entries())
      .filter(([_, status]) => status.status === 'running')
      .map(([serverId]) => serverId);

    for (const serverId of runningServers) {
      await this.updateToolsForServer(serverId);
    }

    console.log(`Initialized Anthropic MCP Service with ${this.availableTools.size} tools`);
  }

  private async updateToolsForServer(serverId: string): Promise<void> {
    try {
      if (!this.serverManager) return;
      const client = this.serverManager.getClient(serverId);
      if (!client) {
        console.warn(`No client available for server ${serverId}`);
        return;
      }

      const toolsResponse = await client.listTools();
      
      for (const tool of toolsResponse.tools) {
        const toolKey = `${serverId}__${tool.name}`;
        
        // Create and validate MCPTool using our unified types
        const mcpTool: MCPTool = {
          name: toolKey,
          description: `[${serverId}] ${tool.description}`,
          input_schema: {
            type: "object", // Always "object" for Anthropic compatibility
            properties: tool.inputSchema?.properties ?? {},
            required: tool.inputSchema?.required
          }
        };
        
        // Validate using our Zod schema
        const validatedTool = validateMCPTool(mcpTool);
        this.availableTools.set(toolKey, validatedTool);
      }

      console.log(`Updated ${toolsResponse.tools.length} tools for server ${serverId}`);
      this.emit('toolsUpdated', serverId, toolsResponse.tools);
    } catch (error) {
      console.error(`Failed to update tools for server ${serverId}:`, error);
    }
  }

  private removeToolsForServer(serverId: string): void {
    const toolsToRemove = Array.from(this.availableTools.keys())
      .filter(toolKey => toolKey.startsWith(`${serverId}__`));
    
    for (const toolKey of toolsToRemove) {
      this.availableTools.delete(toolKey);
    }

    console.log(`Removed ${toolsToRemove.length} tools for server ${serverId}`);
    this.emit('toolsRemoved', serverId, toolsToRemove);
  }

  async sendMessage(
    messages: ConversationMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
      enableTools?: boolean;
      allowedTools?: string[];
    } = {}
  ): Promise<Anthropic.Message> {
    const {
      model = 'claude-3-5-sonnet-20240620',
      maxTokens = 4096,
      temperature = 0.7,
      stream = false,
      enableTools = true,
      allowedTools
    } = options;

    // Transform messages to Anthropic's expected format using our unified types
    const anthropicMessages: AnthropicMessageParam[] = messages.map(msg => convertToAnthropicFormat(msg));
    
    // Prepare tools for Claude
    const tools = enableTools ? this.prepareToolsForClaude(allowedTools) : [];

    if (stream) {
      // For streaming, we'll use the existing streamMessage method
      return await this.streamMessage(messages, options);
    } else {
      // Non-streaming message params - explicitly no stream
      const messageParams: Anthropic.MessageCreateParams = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages,
        tools: tools.length > 0 ? tools : undefined,
        stream: false // Explicitly set to false for type safety
      };

      if (!this.anthropic) throw new Error("Anthropic SDK not initialized on client. Calls must go through server.");
      const response = await this.anthropic.messages.create(messageParams);
      
      // Handle tool use in the response
      if (response.content.some(block => block.type === 'tool_use')) {
        return await this.handleToolUse(response, messages);
      }
      
      return response;
    }
  }

  private prepareToolsForClaude(allowedTools?: string[]): Anthropic.Tool[] {
    const toolsToInclude = allowedTools 
      ? Array.from(this.availableTools.entries()).filter(([key]) => 
          allowedTools.some(allowed => key.includes(allowed))
        )
      : Array.from(this.availableTools.entries());

    return toolsToInclude.map(([_, tool]) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object" as const, // Anthropic requires exactly "object"
        properties: tool.input_schema.properties,
        required: tool.input_schema.required
      }
    }));
  }

  private async handleToolUse(
    response: Anthropic.Message,
    previousMessages: ConversationMessage[]
  ): Promise<Anthropic.Message> {
    const toolResults: ToolResult[] = [];

    for (const contentBlock of response.content) {
      if (contentBlock.type === 'tool_use') {
        try {
          const result = await this.executeToolUse(
            contentBlock.name,
            contentBlock.input
          );
          
          toolResults.push({
            tool_use_id: contentBlock.id,
            content: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          });
        } catch (error) {
          toolResults.push({
            tool_use_id: contentBlock.id,
            content: `Error executing tool: ${(error as Error).message}`,
            is_error: true
          });
        }
      }
    }

    // Send tool results back to Claude - use Anthropic format directly
    const followUpMessages: ConversationMessage[] = [
      ...previousMessages,
      {
        role: 'assistant',
        content: response.content // Already in Anthropic format
      },
      {
        role: 'user',
        content: toolResults.map(result => ({
          type: 'tool_result',
          tool_use_id: result.tool_use_id,
          content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
          is_error: result.is_error
        }))
      }
    ];

    // Transform messages to Anthropic format
    const anthropicFollowUpMessages = followUpMessages.map(msg => convertToAnthropicFormat(msg));

    if (!this.anthropic) throw new Error("Anthropic SDK not initialized on client. Calls must go through server.");
    return await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      messages: anthropicFollowUpMessages,
      tools: this.prepareToolsForClaude()
    });
  }

  private async executeToolUse(toolName: string, input: unknown): Promise<unknown> {
    // Parse the tool name to get server ID and actual tool name
    const [serverId, actualToolName] = toolName.split('__', 2);
    
    if (!serverId || !actualToolName) {
      throw new Error(`Invalid tool name format: ${toolName}`);
    }

    if (!this.serverManager) {
      throw new Error(`MCP server ${serverId} is not available in this context`);
    }
    const client = this.serverManager.getClient(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    console.log(`Executing tool ${actualToolName} on server ${serverId} with input:`, input);
    
    const result = await client.callTool({
      name: actualToolName,
      // Pass through as a plain object for SDK compatibility
      arguments: (input ?? {}) as Record<string, unknown>
    });

    this.emit('toolExecuted', {
      serverId,
      toolName: actualToolName,
      input,
      result
    });

    return result;
  }

  async streamMessage(
    messages: ConversationMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      enableTools?: boolean;
      allowedTools?: string[];
      onText?: (text: string) => void;
      onToolUse?: (toolUse: { type: 'tool_use'; id: string; name: string; input: unknown }) => void;
      onToolResult?: (result: { toolUse: { name: string; input: unknown }; success: boolean; error?: string; result?: unknown }) => void;
    } = {}
  ): Promise<Anthropic.Message> {
    const {
      model = 'claude-3-5-sonnet-20240620',
      maxTokens = 4096,
      temperature = 0.7,
      enableTools = true,
      allowedTools,
      onText,
      onToolUse,
      onToolResult
    } = options;

    // Transform messages to Anthropic's expected format using our unified types
    const anthropicMessages: AnthropicMessageParam[] = messages.map(msg => convertToAnthropicFormat(msg));
    
    const tools = enableTools ? this.prepareToolsForClaude(allowedTools) : [];

    if (!this.anthropic) throw new Error("Anthropic SDK not initialized on client. Calls must go through server.");
    const stream = this.anthropic.messages
      .stream({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages,
        tools: tools.length > 0 ? tools : undefined
      })
      .on('text', (text) => {
        onText?.(text);
      })
      .on('contentBlock', (contentBlock) => {
        if (contentBlock.type === 'tool_use') {
          onToolUse?.(contentBlock);
        }
      });

    const finalMessage = await stream.finalMessage();

    // Handle any tool use in the final message
    const toolUseBlocks = finalMessage.content.filter((block): block is Extract<typeof block, { type: 'tool_use' }> => block.type === 'tool_use');
    
    if (toolUseBlocks.length > 0) {
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await this.executeToolUse(toolUse.name, toolUse.input);
          onToolResult?.({ toolUse, result, success: true });
        } catch (error) {
          onToolResult?.({ toolUse, error: (error as Error).message, success: false });
        }
      }
    }

    return finalMessage;
  }

  getAvailableTools(): MCPTool[] {
    return Array.from(this.availableTools.values());
  }

  getToolsByServer(serverId: string): MCPTool[] {
    return Array.from(this.availableTools.entries())
      .filter(([key]) => key.startsWith(`${serverId}__`))
      .map(([_, tool]) => tool);
  }

  async countTokens(messages: ConversationMessage[]): Promise<number> {
    // Transform messages to Anthropic format
    const anthropicMessages = messages.map(msg => convertToAnthropicFormat(msg));
    
    if (!this.anthropic) throw new Error("Anthropic SDK not initialized on client. Calls must go through server.");
    const response = await this.anthropic.messages.countTokens({
      model: 'claude-3-5-sonnet-20240620',
      messages: anthropicMessages as Anthropic.MessageParam[] // narrow unknown -> sdk-accepted shape
    });

    return response.input_tokens;
  }
}
