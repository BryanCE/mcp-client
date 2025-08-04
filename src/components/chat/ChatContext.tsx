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
    // The client selects provider by id; server manages keys and SDK initialization.
    if (providerId === "anthropic") {
      return new AnthropicMCPService();
    }

    if (providerId === "openrouter") {
      // Do NOT read API keys on the client; server should proxy these calls.
      // OpenRouterProvider now has a 0-arg constructor (server will manage keys).
      return new OpenRouterProvider();
    }

    // Default fallback to anthropic with no client-side keys.
    return new AnthropicMCPService();
  }, [providerId]);

  // ChatSessionManager is client-side storage/UX only and does not take a provider argument.
  const manager = useMemo(() => new ChatSessionManager(), []);

  const [sessionId, setSessionIdState] = useState<string>("");
  const [session, setSession] = useState<ChatSession | undefined>(undefined);

  // Restore or create session
  useEffect(() => {
    // Try restore sessionId
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_ID_STORAGE_KEY) : null;
    let sid = saved || "";
    if (!sid) {
      // Create new session with explicit defaults
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
