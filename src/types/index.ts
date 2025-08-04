import { z } from "zod";

// ============================================================================
// MCP Server Configuration Types
// ============================================================================

export const MCPServerConfigSchema = z.object({
  id: z.string().min(1, "Server ID is required"),
  name: z.string().min(1, "Server name is required"),
  serverType: z.enum(["local", "remote", "remote-streamable"]),
  
  // Local server fields
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
  
  // Remote server fields
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  
  // Common fields
  autoStart: z.boolean().default(false),
  timeout: z.number().positive().default(30000),
  retryAttempts: z.number().min(0).default(3),
  maxRestarts: z.number().min(0).default(5),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
}).refine((data) => {
  if (data.serverType === "local") {
    return data.command && data.command.length > 0;
  } else {
    return data.url && data.url.length > 0;
  }
}, {
  message: "Local servers require a command, remote servers require a URL",
});

export const GlobalSettingsSchema = z.object({
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  maxConcurrentServers: z.number().positive().default(10),
  defaultTimeout: z.number().positive().default(30000),
  configVersion: z.string().default("1.0.0"),
});

export const MCPConfigurationSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerConfigSchema),
  globalSettings: GlobalSettingsSchema.optional(),
});

export const ServerStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["stopped", "starting", "running", "error", "restarting"]),
  pid: z.number().optional(),
  startTime: z.date().optional(),
  errorMessage: z.string().optional(),
  restartCount: z.number().optional(),
  lastError: z.string().optional(),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;
export type MCPConfiguration = z.infer<typeof MCPConfigurationSchema>;
export type ServerStatus = z.infer<typeof ServerStatusSchema>;

// ============================================================================
// MCP Tool Types
// ============================================================================

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.object({
    type: z.literal("object"), // Anthropic requires exactly "object"
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()).optional(),
  }),
});

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  response: z.unknown().optional(),
  error: z.string().optional(),
  duration: z.number().optional(),
  mcpServerId: z.string().optional(),
});

export const ToolResultSchema = z.object({
  tool_use_id: z.string(),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.string(),
      text: z.string(),
    }))
  ]),
  is_error: z.boolean().optional(),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;

// ============================================================================
// Chat and Conversation Types
// ============================================================================

export const ChatRoleSchema = z.enum(["user", "assistant", "system"]);

export const MessageContentSchema = z.union([
  z.string(),
  z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
    tool_use: z.object({
      id: z.string(),
      name: z.string(),
      input: z.any(),
    }).optional(),
  }))
]);

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatRoleSchema,
  content: z.string(),
  timestamp: z.union([z.date(), z.string()]).optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["pending", "streaming", "done", "error"]).optional(),
});

export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: MessageContentSchema,
});

export const ChatSessionSettingsSchema = z.object({
  model: z.string(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
  enableTools: z.boolean(),
  allowedTools: z.array(z.string()).optional(),
});

export const ChatSessionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  title: z.string(),
  messages: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  mcpServers: z.array(z.string()),
  settings: ChatSessionSettingsSchema,
});

export type ChatRole = z.infer<typeof ChatRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ChatSessionSettings = z.infer<typeof ChatSessionSettingsSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ============================================================================
// Anthropic API Compatible Types
// ============================================================================

// Anthropic expects very specific content block formats
export const AnthropicTextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const AnthropicToolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.any(),
});

export const AnthropicToolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.string(),
  is_error: z.boolean().optional(),
});

export const AnthropicContentBlockSchema = z.union([
  AnthropicTextBlockSchema,
  AnthropicToolUseBlockSchema,
  AnthropicToolResultBlockSchema,
]);

export const AnthropicMessageParamSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    z.string(),
    z.array(AnthropicContentBlockSchema)
  ]),
});

export type AnthropicTextBlock = z.infer<typeof AnthropicTextBlockSchema>;
export type AnthropicToolUseBlock = z.infer<typeof AnthropicToolUseBlockSchema>;
export type AnthropicToolResultBlock = z.infer<typeof AnthropicToolResultBlockSchema>;
export type AnthropicContentBlock = z.infer<typeof AnthropicContentBlockSchema>;
export type AnthropicMessageParam = z.infer<typeof AnthropicMessageParamSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

export const validateMCPServerConfig = (data: unknown) => MCPServerConfigSchema.parse(data);
export const validateMCPConfiguration = (data: unknown) => MCPConfigurationSchema.parse(data);
export const validateServerStatus = (data: unknown) => ServerStatusSchema.parse(data);
export const validateMCPTool = (data: unknown) => MCPToolSchema.parse(data);
export const validateToolCall = (data: unknown) => ToolCallSchema.parse(data);
export const validateToolResult = (data: unknown) => ToolResultSchema.parse(data);
export const validateChatMessage = (data: unknown) => ChatMessageSchema.parse(data);
export const validateConversationMessage = (data: unknown) => ConversationMessageSchema.parse(data);
export const validateChatSession = (data: unknown) => ChatSessionSchema.parse(data);
export const validateAnthropicMessageParam = (data: unknown) => AnthropicMessageParamSchema.parse(data);

// ============================================================================
// Message Format Transformation Helpers
// ============================================================================

// No transformation needed - ConversationMessage now uses Anthropic format directly
export const convertToAnthropicFormat = (message: ConversationMessage): AnthropicMessageParam => {
  return validateAnthropicMessageParam(message);
};