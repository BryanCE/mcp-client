"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Loader2, Send, Paperclip, Wrench, Bot } from "lucide-react";
import type { ChatMessage } from "~/types/chat";
import { MessageList } from "~/components/chat/MessageList";


export default function ChatInterface() {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [connectionStatus] = useState<string>("Disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    // Start streaming placeholder (no fake completion content persisted)
    setStreamingMessage({ id: crypto.randomUUID(), role: "assistant", content: "", status: "streaming" });
    setIsStreaming(true);

    // Clear input
    setInputValue("");

    // Simulated end of streaming phase
    setTimeout(() => {
      setIsStreaming(false);
      setStreamingMessage(null);
      setIsLoading(false);
      // Return focus to the input after message is sent
      textareaRef.current?.focus();
    }, 400);
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col text-sm">
      {/* Provider Indicator */}
      <Card className="m-2 mb-1 sm:m-3 sm:mb-2 shrink-0">
        <CardContent className="flex items-center justify-between gap-2 p-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger size="sm" className="w-[160px] sm:w-[200px]">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Badge variant="outline" className="h-6 shrink-0 whitespace-nowrap px-2 py-0 text-xs">
            {connectionStatus}
          </Badge>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 min-w-0 px-2 sm:px-3 overflow-hidden">
        {/* Only the message list scrolls; container is constrained by min-h-0 in parent flex */}
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingMessage={streamingMessage ?? undefined}
          showTypingIndicator={!isStreaming && isLoading}
          loadingCount={isLoading && messages.length === 0 ? 1 : 0}
          className="h-full"
        />
      </div>

      {/* Input Area - non-scrolling footer within this flex column */}
      <Card className="m-2 mt-1 sm:m-3 sm:mt-2 shrink-0">
        <CardContent className="p-2 pt-0 sm:p-3">
          <div className="flex min-w-0 items-start gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="min-h-[40px] flex-1 min-w-0 resize-none"
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0"
              aria-label="Send message"
              title="Send (Ctrl+Enter)"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Paperclip className="mr-1 h-4 w-4" />
                Attach
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Wrench className="mr-1 h-4 w-4" />
                MCP Tools
              </Button>
            </div>
            <span className="whitespace-nowrap">Ctrl+Enter to send</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
