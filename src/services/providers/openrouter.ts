import { EventEmitter } from "events";
import type { ChatLLMProvider } from "~/services/providers/types";
import type { ConversationMessage, MCPTool } from "~/types";

/**
 * Stub OpenRouter provider implementing ChatLLMProvider so the app can switch providers.
 * Networking is not implemented yet. It simply echoes a placeholder response.
 * Uses NEXT_PUBLIC_OPENROUTER_API_KEY for configuration.
 */
export class OpenRouterProvider extends EventEmitter implements ChatLLMProvider {
  readonly id = "openrouter" as const;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async sendMessage(
    _messages: ConversationMessage[],
    _options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      enableTools?: boolean;
      allowedTools?: string[];
    }
  ): Promise<{ content: Array<{ type: string; text?: string }> }> {
    // Placeholder non-networked response to maintain interface contracts
    return {
      content: [
        {
          type: "text",
          text:
            "OpenRouter provider is not yet implemented. Please configure networking and models. " +
            (this.apiKey ? "API key detected." : "No API key found."),
        },
      ],
    };
  }

  async streamMessage(
    _messages: ConversationMessage[],
    _options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      enableTools?: boolean;
      allowedTools?: string[];
      onText?: (text: string) => void;
      onToolUse?: (toolUse: { type: "tool_use"; id: string; name: string; input: unknown }) => void;
      onToolResult?: (result: {
        toolUse: { name: string; input: unknown };
        success: boolean;
        error?: string;
        result?: unknown;
      }) => void;
    }
  ): Promise<{ content: Array<{ type: string; text?: string }> }> {
    // Emit a single chunk if provided
    _options?.onText?.(
      "OpenRouter provider streaming is not yet implemented. Please configure networking and models."
    );
    return {
      content: [{ type: "text", text: "OpenRouter provider streaming stub complete." }],
    };
  }

  getAvailableTools(): MCPTool[] {
    // No MCP tools integration for OpenRouter stub
    return [];
  }

  getToolsByServer(_serverId: string): MCPTool[] {
    return [];
  }

  async countTokens(_messages: ConversationMessage[]): Promise<number> {
    // Stubbed token counting
    return 0;
  }
}
