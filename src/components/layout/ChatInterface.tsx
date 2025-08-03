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
    <div className="flex h-full flex-col">
      {/* Provider Indicator */}
      <Card className="m-4 mb-2">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline">{connectionStatus}</Badge>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Welcome to MCP Client. Select a provider and start chatting.
            </div>
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <Card className="max-w-[80%] bg-primary text-primary-foreground">
                    <CardContent className="p-3">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <Card className="max-w-[80%]">
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
      <Card className="m-4 mt-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Message</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex space-x-2">
            <Textarea
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="min-h-[40px] flex-1 resize-none"
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSend} disabled={!inputValue.trim() || isLoading} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm">
                <Paperclip className="mr-1 h-4 w-4" />
                Attach
              </Button>
              <Button variant="ghost" size="sm">
                <Wrench className="mr-1 h-4 w-4" />
                MCP Tools
              </Button>
            </div>
            <span>Ctrl+Enter to send</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
