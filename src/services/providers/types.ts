import type { AnthropicMessageParam, ConversationMessage, MCPTool } from "~/types";

export type ProviderId = "anthropic" | string;

export type SendMessageOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableTools?: boolean;
  allowedTools?: string[];
  stream?: boolean;
  onText?: (text: string) => void;
  onToolUse?: (toolUse: { type: "tool_use"; id: string; name: string; input: unknown }) => void;
  onToolResult?: (result: {
    toolUse: { name: string; input: unknown };
    success: boolean;
    error?: string;
    result?: unknown;
  }) => void;
};

export interface ChatLLMProvider {
  readonly id: ProviderId;
  sendMessage(messages: ConversationMessage[], options?: Omit<SendMessageOptions, "stream">): Promise<unknown>;
  streamMessage(messages: ConversationMessage[], options?: Omit<SendMessageOptions, "stream">): Promise<unknown>;
  getAvailableTools(): MCPTool[];
  getToolsByServer(serverId: string): MCPTool[];
  countTokens(messages: ConversationMessage[]): Promise<number>;
}

/**
 * Declarative field metadata so the RightPanel can render provider-specific controls.
 * Keep this minimal and UI-agnostic: it's just structure and constraints.
 */
export type ProviderSettingField =
  | {
      key: string;
      label: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
      defaultValue?: string;
    }
  | {
      key: string;
      label: string;
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      defaultValue?: number;
    }
  | {
      key: string;
      label: string;
      type: "boolean";
      defaultValue?: boolean;
    };

export type ProviderMetadata = {
  id: ProviderId;
  displayName: string;
  settingsFields: ProviderSettingField[];
  /**
   * Optional transform to map generic session settings -> provider call options
   * This allows providers to evolve without breaking stored session data
   */
  toProviderOptions: (settings: Record<string, unknown>) => {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    enableTools?: boolean;
  };
};

// Curated Anthropic models agreed upon during planning
export const ANTHROPIC_MODELS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-7-haiku-20250219",
  "claude-4-opus-latest",
  "claude-4-sonnet-latest",
  "claude-4-haiku-latest",
] as const;

export const AnthropIcProviderMetadata: ProviderMetadata = {
  id: "anthropic",
  displayName: "Anthropic",
  settingsFields: [
    {
      key: "model",
      label: "Model",
      type: "select",
      options: ANTHROPIC_MODELS.map((m) => ({ value: m, label: m })),
      defaultValue: ANTHROPIC_MODELS[0],
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.7,
    },
    {
      key: "maxTokens",
      label: "Max Tokens",
      type: "number",
      min: 1,
      max: 200000,
      step: 1,
      defaultValue: 4096,
    },
    {
      key: "enableTools",
      label: "Enable Tools",
      type: "boolean",
      defaultValue: true,
    },
  ],
  toProviderOptions: (settings) => {
    const model = typeof settings.model === "string" ? settings.model : undefined;
    const temperature =
      typeof settings.temperature === "number" ? settings.temperature : undefined;
    const maxTokens =
      typeof settings.maxTokens === "number" ? settings.maxTokens : undefined;
    const enableTools =
      typeof settings.enableTools === "boolean" ? settings.enableTools : undefined;
    return { model, temperature, maxTokens, enableTools };
  },
};
