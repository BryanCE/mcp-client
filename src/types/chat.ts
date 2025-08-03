export type ChatRole = "user" | "assistant" | "system";

export interface ToolCall {
  id: string;
  name: string;
  parameters?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  duration?: number;
  mcpServerId?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp?: Date | string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  status?: "pending" | "streaming" | "done" | "error";
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date | string;
}
