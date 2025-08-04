import type { ChatSession } from "~/types";
import { api } from "~/trpc/react";
import type { ProviderId } from "~/services/providers/types";

export class ChatSessionManager {
  private sessions: Map<string, ChatSession> = new Map<string, ChatSession>();
  private readonly storageKey = "chat_sessions_v1";

  constructor() {
    // Attempt hydration on construction (no-op on server)
    this.hydrateFromStorage();
  }

  createSession(
    userId?: string,
    mcpServers: string[] = [],
    settings: Partial<ChatSession['settings']> = {}
  ): ChatSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      userId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpServers,
      settings: {
        // Provider-agnostic defaults; UI will override via updateSessionSettings
        model: 'default',
        temperature: 0.7,
        maxTokens: 4096,
        enableTools: true,
        ...settings
      }
    };

    this.sessions.set(sessionId, session);
    this.persistToStorage();
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    // Ensure hydrated before access
    this.hydrateFromStorage();
    return this.sessions.get(sessionId);
  }

  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      stream?: boolean;
      onText?: (text: string) => void;
      onToolUse?: (toolUse: { type: 'tool_use'; id: string; name: string; input: unknown }) => void;
      onToolResult?: (result: { toolUse: { name: string; input: unknown }; success: boolean; error?: string; result?: unknown }) => void;
    } = {}
  ): Promise<{ session: ChatSession; response: string }> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: message
    });

    // Get allowed tools based on session's enabled MCP servers
    const allowedTools = session.mcpServers.length > 0 
      ? session.mcpServers.map(serverId => `${serverId}__`)
      : undefined;

    let responseContent = '';

    // tRPC client usage via utils.client (Context7 docs: use utils.client.<proc>.mutate for imperative calls)
    const utils = api.useUtils();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("chat_provider_id_v1") : null;
    const providerId: ProviderId = stored === "openrouter" ? "openrouter" : "anthropic";

    const sendResult = await utils.client.chat.send.mutate({
      providerId,
      sessionId,
      messages: session.messages as any,
      settings: {
        ...session.settings,
        allowedTools,
      },
      stream: !!options.stream,
    });

    if (Array.isArray(sendResult?.content)) {
      const textBlocks = sendResult.content.filter((b: { type: string }) => b.type === "text");
      responseContent = textBlocks.map((b: { text?: string }) => b.text ?? "").join("");
    }

    // Add assistant response to session
    session.messages.push({
      role: 'assistant',
      content: responseContent
    });

    session.updatedAt = new Date();
    this.persistToStorage();

    // Update title if this is the first exchange
    if (session.messages.length === 2 && session.title === 'New Chat') {
      session.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    const finalResult = {
      session,
      response: responseContent
    };
    this.persistToStorage();
    return finalResult;
  }

  updateSessionSettings(
    sessionId: string,
    settings: Partial<ChatSession['settings']>
  ): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.settings = { ...session.settings, ...settings };
    session.updatedAt = new Date();
    this.persistToStorage();
  }

  updateSessionMCPServers(sessionId: string, mcpServers: string[]): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.mcpServers = mcpServers;
    session.updatedAt = new Date();
    this.persistToStorage();
  }

  getAllSessions(userId?: string): ChatSession[] {
    this.hydrateFromStorage();
    const sessions = Array.from(this.sessions.values());
    
    if (userId) {
      return sessions.filter(session => session.userId === userId);
    }
    
    return sessions;
  }

  deleteSession(sessionId: string): boolean {
    const ok = this.sessions.delete(sessionId);
    if (ok) this.persistToStorage();
    return ok;
  }

  clearMessages(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages = [];
    session.updatedAt = new Date();
    this.persistToStorage();
  }
  // ------------------------------
  // Persistence Helpers
  // ------------------------------
  private isBrowser(): boolean {
    return typeof window !== "undefined" && !!window.localStorage;
  }

  private persistToStorage(): void {
    if (!this.isBrowser()) return;
    // Serialize with ISO dates
    const serialized = JSON.stringify(
      Array.from(this.sessions.entries()).map(([id, s]) => ({
        id,
        value: {
          ...s,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
        },
      })),
    );
    try {
      window.localStorage.setItem(this.storageKey, serialized);
    } catch {
      // ignore storage errors
    }
  }

  private hydrateFromStorage(): void {
    if (!this.isBrowser()) return;
    if (this.sessions.size > 0) return; // hydrate only once if already populated
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const entries: Array<{ id: string; value: any }> = JSON.parse(raw);
      for (const entry of entries) {
        const s = entry.value as ChatSession;
        // Convert dates
        const createdAt = typeof (s as any).createdAt === "string" ? new Date((s as any).createdAt) : s.createdAt;
        const updatedAt = typeof (s as any).updatedAt === "string" ? new Date((s as any).updatedAt) : s.updatedAt;
        this.sessions.set(entry.id, { ...s, createdAt, updatedAt });
      }
    } catch {
      // ignore parse errors
    }
  }
}
