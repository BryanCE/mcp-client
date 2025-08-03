"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import LeftNav from "~/components/layout/LeftNav";
import RightPanel from "~/components/layout/RightPanel";
import { ResizablePanelGroup } from "~/components/ui/resizable";
import { MessageSquareText, PanelLeft, PanelRight } from "lucide-react";

type MobileBottomNavProps = {
  className?: string;
};

export default function MobileBottomNav({ className }: MobileBottomNavProps) {
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);

  return (
    <nav
      className={
        [
          "fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden",
          className ?? ""
        ].join(" ")
      }
      aria-label="Mobile Navigation"
    >
      <div className="mx-auto max-w-screen-lg px-3 py-2">
        <div className="grid grid-cols-3 gap-2">
          {/* LeftNav Sheet trigger */}
          <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="w-full justify-center" aria-label="Open Servers Navigation">
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
          <Button
            variant="default"
            className="w-full justify-center"
            aria-label="Go to Chat"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
              // noop: Chat is already the main view, this ensures sheets close.
            }}
          >
            <MessageSquareText className="mr-2 h-5 w-5" />
            <span className="text-sm">Chat</span>
          </Button>

          {/* RightPanel Sheet trigger */}
          <Sheet open={rightOpen} onOpenChange={setRightOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="w-full justify-center" aria-label="Open Info Panel">
                <PanelRight className="mr-2 h-5 w-5" />
                <span className="text-sm">Info</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[90vw] sm:w-[420px]">
              <SheetHeader className="px-4 py-3">
                <SheetTitle>Information</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-56px)]">
                {/* Ensure RightPanel's ResizablePanel is wrapped in a PanelGroup to satisfy react-resizable-panels requirement */}
                <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                  <RightPanel />
                </ResizablePanelGroup>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
