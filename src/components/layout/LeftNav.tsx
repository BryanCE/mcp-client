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
    <div className="h-full border-r bg-muted/10">
      <div className="p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Server className="h-4 w-4" />
          <span>Navigation</span>
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100%-44px)] p-3">
        <Accordion type="multiple" defaultValue={["mcp", "ai"]} className="space-y-3">
          <AccordionItem value="mcp" className="border rounded-md">
            <AccordionTrigger className="px-3">📁 MCP Servers</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Badge variant="default" className="mr-2">●</Badge>
                  noaa-free (Connected)
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Badge variant="destructive" className="mr-2">●</Badge>
                  weather-api (Disconnected)
                </Button>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add MCP Server
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai" className="border rounded-md">
            <AccordionTrigger className="px-3">🤖 AI Providers</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Badge variant="default" className="mr-2">●</Badge>
                  OpenAI (GPT-4)
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Badge variant="secondary" className="mr-2">●</Badge>
                  Anthropic (Rate Limited)
                </Button>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="settings" className="border rounded-md">
            <AccordionTrigger className="px-3">⚙️ Settings</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Configure providers in Settings page
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </div>
  );
}
