"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Loader2, Send, Paperclip, Wrench, Bot } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ id: string; name: string }>;
};

export default function ChatInterface() {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [connectionStatus] = useState<string>("Disconnected");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;
    setIsLoading(true);

    // Add user message
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    // Simulate assistant streaming placeholder (no fake content persisted)
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "…",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Clear input
    setInputValue("");

    // End loading after a short delay (placeholder for real streaming)
    setTimeout(() => {
      setIsLoading(false);
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
      <Card className="m-2 mb-1 sm:m-3 sm:mb-2">
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
      <ScrollArea className="flex-1 min-w-0 px-2 sm:px-3">
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Welcome to MCP Client. Select a provider and start chatting.
            </div>
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <Card className="max-w-[85%] bg-primary text-primary-foreground">
                    <CardContent className="p-3">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <Card className="max-w-[85%]">
                    <CardContent className="p-3">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.toolCalls.map((tool) => (
                            <Badge key={tool.id} variant="secondary" className="text-xs">
                              {tool.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ),
            )
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <Card className="m-2 mt-1 sm:m-3 sm:mt-2">
        <CardContent className="p-2 pt-0 sm:p-3">
          <div className="flex min-w-0 items-start gap-2">
            <Textarea
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
