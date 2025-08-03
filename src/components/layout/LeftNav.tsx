"use client";

import * as React from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Plus, Server, Bot } from "lucide-react";

export default function LeftNav() {
  return (
    <div className="h-full border-r bg-muted/10 min-w-0 overflow-visible">
      <div className="p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Server className="h-4 w-4" />
          <span>Navigation</span>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100%-44px)] p-3 overflow-x-visible overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={["mcp", "ai"]}
          className="space-y-3 overflow-visible"
        >
          <AccordionItem value="mcp" className="border rounded-md overflow-visible">
            <AccordionTrigger className="px-3 min-w-0 overflow-visible">
              <span className="truncate">📁 MCP Servers</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 overflow-visible">
              <div className="space-y-2">
                <div className="w-full min-w-0">
                  <Button variant="ghost" className="w-full justify-start min-w-0 rounded-md pr-2">
                    <Badge variant="default" className="mr-2 shrink-0">●</Badge>
                    <span className="truncate break-words">noaa-free (Connected)</span>
                  </Button>
                </div>
                <div className="w-full min-w-0">
                  <Button variant="ghost" className="w-full justify-start min-w-0 rounded-md pr-2">
                    <Badge variant="destructive" className="mr-2 shrink-0">●</Badge>
                    <span className="truncate break-words">weather-api (Disconnected)</span>
                  </Button>
                </div>
                <div className="w-full min-w-0">
                  <Button variant="outline" className="w-full min-w-0 justify-start rounded-md pr-2">
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate break-words">Add MCP Server</span>
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai" className="border rounded-md overflow-visible">
            <AccordionTrigger className="px-3 min-w-0 overflow-visible">
              <span className="truncate">🤖 AI Providers</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 overflow-visible">
              <div className="space-y-2">
                <div className="w-full min-w-0">
                  <Button variant="ghost" className="w-full justify-start min-w-0 rounded-md pr-2">
                    <Badge variant="default" className="mr-2 shrink-0">●</Badge>
                    <span className="truncate break-words">OpenAI (GPT-4)</span>
                  </Button>
                </div>
                <div className="w-full min-w-0">
                  <Button variant="ghost" className="w-full justify-start min-w-0 rounded-md pr-2">
                    <Badge variant="secondary" className="mr-2 shrink-0">●</Badge>
                    <span className="truncate break-words">Anthropic (Rate Limited)</span>
                  </Button>
                </div>
                <div className="w-full min-w-0">
                  <Button variant="outline" className="w-full min-w-0 justify-start rounded-md pr-2">
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate break-words">Add Provider</span>
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="settings" className="border rounded-md overflow-visible">
            <AccordionTrigger className="px-3 min-w-0 overflow-visible">
              <span className="truncate">⚙️ Settings</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 overflow-visible">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="h-4 w-4 shrink-0" />
                  <span className="truncate break-words">Configure providers in Settings page</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </div>
  );
}
