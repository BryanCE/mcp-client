"use client";

import * as React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import LeftNav from "~/components/layout/LeftNav";
import RightPanel from "~/components/layout/RightPanel";
import ChatInterface from "~/components/chat/ChatInterface";
import Header from "~/components/layout/Header";
import MobileBottomNav from "~/components/layout/MobileBottomNav";
import { ChatProvider } from "~/components/chat/ChatContext";

export default function HomePage() {

  return (
    <ChatProvider>
      <div className="flex h-screen w-full flex-col">
        {/* Header rendered at page-level */}
        <Header />

        {/* Mobile layout: stack content; hide side panels by default */}
        <div className="flex-1 min-h-0 min-w-0 lg:hidden">
          {/* Make the main content area account for bottom nav height */}
          <div className="flex h-full w-full min-h-0 min-w-0 flex-col pb-20">
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              <ChatInterface />
            </div>
          </div>

          {/* Mobile bottom navigation */}
          <MobileBottomNav />
        </div>

        {/* Desktop layout: resizable panels */}
        <div className="hidden lg:block flex-1 min-h-0 min-w-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="flex h-full w-full"
          >
            <ResizablePanel
              defaultSize={22}
              minSize={18}
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
              minSize={20}
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
    </ChatProvider>
  );
}
