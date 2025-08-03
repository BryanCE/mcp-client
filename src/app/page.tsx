"use client";

import * as React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import LeftNav from "~/components/layout/LeftNav";
import RightPanel from "~/components/layout/RightPanel";
import ChatInterface from "~/components/layout/ChatInterface";
import Header from "~/components/layout/Header";
import MobileBottomNav from "~/components/layout/MobileBottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { MessageSquareText, PanelLeft, PanelRight } from "lucide-react";

export default function HomePage() {
  // State for mobile sheets
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header rendered at page-level */}
      <Header />

      {/* Mobile layout: stack content; hide side panels by default */}
      <div className="flex-1 min-h-0 min-w-0 lg:hidden">
        {/* Make the main content area a flex column so only ChatInterface center scrolls */}
        <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <ChatInterface />
          </div>
        </div>

        {/* Mobile bottom navigation with Sheets for LeftNav and RightPanel */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-screen-lg px-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              {/* LeftNav Sheet trigger */}
              <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="w-full justify-center">
                    <PanelLeft className="mr-2 h-5 w-5" />
                    <span className="text-sm">Servers</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[90vw] sm:w-[420px]">
                  <SheetHeader className="px-4 py-3">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-56px)]">
                    <LeftNav />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Center: Chat (no sheet, it's the main surface) */}
              <Button variant="default" className="w-full justify-center" onClick={() => { setLeftOpen(false); setRightOpen(false); }}>
                <MessageSquareText className="mr-2 h-5 w-5" />
                <span className="text-sm">Chat</span>
              </Button>

              {/* RightPanel Sheet trigger */}
              <Sheet open={rightOpen} onOpenChange={setRightOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="w-full justify-center">
                    <PanelRight className="mr-2 h-5 w-5" />
                    <span className="text-sm">Info</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-[90vw] sm:w-[420px]">
                  <SheetHeader className="px-4 py-3">
                    <SheetTitle>Information</SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-56px)]">
                    <RightPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </div>

      {/* Desktop layout: resizable panels */}
      <div className="hidden lg:block flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex h-full w-full"
        >
          <ResizablePanel
            defaultSize={22}
            minSize={16}
            maxSize={34}
            className="min-w-0 min-h-0"
          >
            <div className="h-full w-full min-w-0 overflow-hidden">
              <LeftNav />
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border" />

          <ResizablePanel
            defaultSize={56}
            minSize={36}
            maxSize={68}
            className="min-w-0 min-h-0"
          >
            {/* Center panel: ensure only inner message list scrolls, not the whole app */}
            <div className="flex h-full w-full min-w-0 min-h-0 overflow-hidden">
              <ChatInterface />
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border" />

          <ResizablePanel
            defaultSize={32}
            minSize={22}
            maxSize={40}
            className="min-w-0 min-h-0"
          >
            <div className="h-full w-full min-w-0 overflow-hidden">
              <RightPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
