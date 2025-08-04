"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Wrench, BarChart3, Bug, Zap, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { useChatContext } from "~/components/chat/ChatContext";
import { AnthropIcProviderMetadata } from "~/services/providers/types";

export default function RightPanel() {
  // Placeholder local UI state only (no hard-coded fake datasets)
  const [activeToolCalls] = useState<Array<{ id: string; name: string; progress: number }>>([]);
  const [toolHistory] = useState<
    Array<{ id: string; name: string; success: boolean; duration: number; parameters: unknown }>
  >([]);
  const [debugLogs] = useState<Array<{ id: string; level: "info" | "error"; timestamp: string; message: string }>>(
    [],
  );

  // Chat context wiring
  const { manager, sessionId, session, providerId, setProviderId } = useChatContext();

  // Provider metadata map (extensible)
  const providerMetadata = useMemo(() => {
    return {
      anthropic: AnthropIcProviderMetadata,
      // openrouter provider metadata can be added here when ready
    } as const;
  }, []);

  const meta = providerMetadata[providerId as keyof typeof providerMetadata];

  // MCP server discovery: derive list from session (persisted) for now
  const mcpServers = session?.mcpServers ?? [];

  // Settings local derived values
  const currentSettings = session?.settings ?? {};

  // Handlers
  const handleSettingsChange = (patch: Record<string, unknown>) => {
    if (!sessionId) return;
    manager.updateSessionSettings(sessionId, patch as any);
  };

  const handleServersChange = (serverId: string, checked: boolean) => {
    if (!sessionId) return;
    const next = new Set(mcpServers);
    if (checked) next.add(serverId);
    else next.delete(serverId);
    manager.updateSessionMCPServers(sessionId, Array.from(next));
  };

  return (
    <div className="h-full border-l bg-muted/10">
      <Tabs defaultValue="tools" className="flex h-full flex-col">
        <div className="mx-4 mt-4 overflow-x-auto">
          <TabsList className="w-max min-w-full flex-nowrap">
            <TabsTrigger value="tools">
              <Wrench className="mr-1 h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="settings">
              Settings
            </TabsTrigger>
            <TabsTrigger value="usage">
              <BarChart3 className="mr-1 h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="mr-1 h-4 w-4" />
              Debug
            </TabsTrigger>
            <TabsTrigger value="performance">
              <Zap className="mr-1 h-4 w-4" />
              Perf
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tools Tab */}
        <TabsContent value="tools" className="flex-1 px-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active Tool Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeToolCalls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active tool calls</p>
                  ) : (
                    <div className="space-y-2">
                      {activeToolCalls.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between">
                          <Badge variant="outline">{tool.name}</Badge>
                          <Progress value={tool.progress} className="h-2 w-16" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Tool Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {toolHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No history</p>
                    ) : (
                      toolHistory.map((tool) => (
                        <Collapsible key={tool.id}>
                          <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-muted">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={tool.success ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {tool.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{tool.duration}ms</span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="p-2 text-xs">
                            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                              {JSON.stringify(tool.parameters, null, 2)}
                            </pre>
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 px-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 py-4">
              {/* Provider selection mirrors ChatInterface but uses context to switch */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={providerId} onValueChange={setProviderId}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline">{providerId}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Provider-specific settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Model & Generation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meta?.settingsFields?.map((field) => {
                    const key = field.key as keyof typeof currentSettings;
                    const value = (currentSettings as any)?.[key];

                    if (field.type === "select") {
                      return (
                        <div key={field.key} className="space-y-1">
                          <div className="text-xs font-medium">{field.label}</div>
                          <Select
                            value={typeof value === "string" ? value : (field.defaultValue ?? "")}
                            onValueChange={(val) => handleSettingsChange({ [field.key]: val })}
                          >
                            <SelectTrigger className="w-[260px]">
                              <SelectValue placeholder={`Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    if (field.type === "number") {
                      return (
                        <div key={field.key} className="space-y-1">
                          <div className="text-xs font-medium">{field.label}</div>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            className="w-[160px]"
                            value={typeof value === "number" ? value : (field.defaultValue ?? 0)}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n)) handleSettingsChange({ [field.key]: n });
                            }}
                          />
                        </div>
                      );
                    }

                    if (field.type === "boolean") {
                      return (
                        <div key={field.key} className="flex items-center justify-between">
                          <div className="text-xs font-medium">{field.label}</div>
                          <Input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={typeof value === "boolean" ? value : !!field.defaultValue}
                            onChange={(e) => handleSettingsChange({ [field.key]: e.target.checked })}
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                </CardContent>
              </Card>

              {/* MCP Servers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">MCP Servers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mcpServers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No servers selected</p>
                  ) : (
                    mcpServers.map((sid) => (
                      <label key={sid} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                        <span className="truncate">{sid}</span>
                        <Input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={true}
                          onChange={(e) => handleServersChange(sid, e.target.checked)}
                        />
                      </label>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="flex-1 px-4">
          <ScrollArea className="h-full">
            <div className="grid gap-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tool Calls Today</span>
                    <Badge variant="outline">—</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <Badge variant="default">—</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Response Time</span>
                    <Badge variant="secondary">—</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="flex-1 px-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 py-4">
              {debugLogs.length === 0 ? (
                <Alert>
                  <AlertDescription className="font-mono text-xs">
                    No debug logs available.
                  </AlertDescription>
                </Alert>
              ) : (
                debugLogs.map((log) => (
                  <Alert key={log.id} variant={log.level === "error" ? "destructive" : "default"}>
                    <AlertDescription className="font-mono text-xs">
                      [{log.timestamp}] {log.message}
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Perf Tab */}
        <TabsContent value="performance" className="min-w-0 flex-1 px-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-sm">Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
