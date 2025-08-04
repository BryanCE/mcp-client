import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  ConversationMessageSchema,
  ChatSessionSettingsSchema,
  type ConversationMessage,
} from "~/types";
import { AnthropicMCPService } from "~/services/providers/anthropic";
import { OpenRouterProvider } from "~/services/providers/openrouter";

// Define input schema (reusing shared types)
const SendInputSchema = z.object({
  providerId: z.enum(["anthropic", "openrouter"]),
  sessionId: z.string().min(1),
  messages: z.array(ConversationMessageSchema),
  settings: ChatSessionSettingsSchema.partial(), // allow partial overrides from the client
  stream: z.boolean().default(false),
});

export const chatRouter = createTRPCRouter({
  send: publicProcedure
    .input(SendInputSchema)
    .mutation(async ({ input }) => {
      const { providerId, messages, settings, stream } = input;

      // Instantiate provider server-side ONLY. Never expose secrets to client.
      // Read keys from environment (server-side only).
      if (providerId === "anthropic") {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "";
        const provider = new AnthropicMCPService(apiKey);
        if (stream) {
          const finalMessage = await provider.streamMessage(messages as ConversationMessage[], {
            model: settings.model,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            enableTools: settings.enableTools,
            allowedTools: settings.allowedTools,
          });
          return { content: finalMessage.content };
        } else {
          const response = await provider.sendMessage(messages as ConversationMessage[], {
            model: settings.model,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            enableTools: settings.enableTools,
            allowedTools: settings.allowedTools,
            stream: false,
          });
          return { content: response.content };
        }
      }

      if (providerId === "openrouter") {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
        const provider = new OpenRouterProvider(apiKey);
        if (stream) {
          const finalMessage = await provider.streamMessage(messages as ConversationMessage[], {
            model: settings.model,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            enableTools: settings.enableTools,
            allowedTools: settings.allowedTools,
          });
          return { content: (finalMessage as any).content ?? [] };
        } else {
          const response = await provider.sendMessage(messages as ConversationMessage[], {
            model: settings.model,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            enableTools: settings.enableTools,
            allowedTools: settings.allowedTools,
          });
          return { content: (response as any).content ?? [] };
        }
      }

      throw new Error(`Unsupported providerId: ${providerId}`);
    }),
});
