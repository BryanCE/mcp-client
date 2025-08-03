"use client";

import * as React from "react";
import { useState } from "react";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Wrench, BarChart3, Bug, Zap, ChevronDown } from "lucide-react";

export default function RightPanel() {
  // Placeholder local UI state only (no hard-coded fake datasets)
  const [activeToolCalls] = useState<Array<{ id: string; name: string; progress: number }>>([]);
  const [toolHistory] = useState<
    Array<{ id: string; name: string; success: boolean; duration: number; parameters: unknown }>
  >([]);
  const [debugLogs] = useState<Array<{ id: string; level: "info" | "error"; timestamp: string; message: string }>>(
    [],
  );

  // Ensure ResizablePanel is always rendered within a ResizablePanelGroup to satisfy library requirements
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <div className="h-full border-l bg-muted/10">
        <Tabs defaultValue="tools" className="flex h-full flex-col">
          <div className="mx-4 mt-4 overflow-x-auto">
            <TabsList className="w-max min-w-full flex-nowrap">
            <TabsTrigger value="tools">
              <Wrench className="mr-1 h-4 w-4" />
              Tools
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
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
