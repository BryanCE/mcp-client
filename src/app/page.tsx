"use client";

import * as React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import LeftNav from "~/components/layout/LeftNav";
import RightPanel from "~/components/layout/RightPanel";
import ChatInterface from "~/components/layout/ChatInterface";
import Header from "~/components/layout/Header";

export default function HomePage() {
  return (
    <div className="flex min-h-[100svh] w-full flex-col">
      {/* Header rendered at page-level */}
      <Header />
      <div className="flex-1 min-h-0 min-w-0">
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
            <LeftNav />
          </ResizablePanel>

          <ResizableHandle className="bg-border" />

          <ResizablePanel
            defaultSize={56}
            minSize={36}
            maxSize={68}
            className="min-w-0 min-h-0"
          >
            <div className="flex h-full w-full overflow-hidden">
              <ChatInterface />
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border" />

          <ResizablePanel
            defaultSize={22}
            minSize={16}
            maxSize={40}
            className="min-w-0 min-h-0"
          >
            <RightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
