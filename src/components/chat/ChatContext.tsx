"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import type { ChatSession } from "~/types";
import { ChatSessionManager } from "~/services/providers/chat-session-manager";
import { AnthropicMCPService } from "~/services/providers/anthropic";
import { OpenRouterProvider } from "~/services/providers/openrouter";
import type { ChatLLMProvider } from "~/services/providers/types";

type ChatContextValue = {
  manager: ChatSessionManager;
  sessionId: string;
  session: ChatSession | undefined;
  setSessionId: (id: string) => void;
  providerId: string;
  setProviderId: (id: string) => void;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const useChatContext = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
};

type Props = {
  children: React.ReactNode;
};

const SESSION_ID_STORAGE_KEY = "active_chat_session_id_v1";

export function ChatProvider({ children }: Props) {
  // Persist provider selection
  const PROVIDER_STORAGE_KEY = "chat_provider_id_v1";
  const [providerId, setProviderIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "anthropic";
    return window.localStorage.getItem(PROVIDER_STORAGE_KEY) ?? "anthropic";
  });

  // Build provider instance from providerId (extensible)
  const provider = useMemo<ChatLLMProvider>(() => {
    // In the client/browser we must NOT import server-only modules (like child_process).
    // Use optional deps for Anthropic provider to avoid bundling server managers.
    if (providerId === "anthropic") {
      const apiKey = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ANTHROPIC_API_KEY
        ? process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
        : "";
      return new AnthropicMCPService(apiKey);
    }

    if (providerId === "openrouter") {
      const apiKey = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OPENROUTER_API_KEY
        ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
        : "";
      return new OpenRouterProvider(apiKey);
    }

    // Default fallback
    const fallbackKey = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ANTHROPIC_API_KEY
      ? process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      : "";
    return new AnthropicMCPService(fallbackKey);
  }, [providerId]);

  const manager = useMemo(() => new ChatSessionManager(provider), [provider]);

  const [sessionId, setSessionIdState] = useState<string>("");
  const [session, setSession] = useState<ChatSession | undefined>(undefined);

  // Restore or create session
  useEffect(() => {
    // Try restore sessionId
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_ID_STORAGE_KEY) : null;
    let sid = saved || "";
    if (!sid) {
      // Create new session
      const s = manager.createSession(undefined, [], {});
      sid = s.id;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sid);
      }
    }
    setSessionIdState(sid);
    setSession(manager.getSession(sid));
  }, [manager]);

  const setSessionId = useCallback((id: string) => {
    setSessionIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(SESSION_ID_STORAGE_KEY, id);
    setSession(manager.getSession(id));
  }, [manager]);

  const setProviderId = useCallback((id: string) => {
    setProviderIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
    // ChatSessionManager re-instantiated via useMemo when provider changes
  }, []);

  // Keep session in sync when manager persists
  useEffect(() => {
    if (!sessionId) return;
    // Polling is simple; can be optimized via events later
    const t = setInterval(() => {
      setSession(manager.getSession(sessionId));
    }, 1000);
    return () => clearInterval(t);
  }, [manager, sessionId]);

  const value: ChatContextValue = {
    manager,
    sessionId,
    session,
    setSessionId,
    providerId,
    setProviderId,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
