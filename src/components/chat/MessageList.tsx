import { memo, useEffect, useRef, useState, useCallback } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { ChatMessage } from "~/types/chat";
import { MessageBubble } from "~/components/chat/MessageBubble";
import AIResponse from "~/components/chat/AIResponse";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";

type MessageListProps = {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingMessage?: ChatMessage | null;
  showTypingIndicator?: boolean;
  className?: string;
  loadingCount?: number; // how many skeleton rows to show while loading (optional)
};

/**
 * MessageList renders the conversation thread, including:
 * - Historical messages as MessageBubble
 * - An AIResponse row (AI-only) while the assistant is streaming
 * - Optional Skeleton placeholders for loading states
 */
function MessageListBase({
  messages,
  isStreaming = false,
  streamingMessage = null,
  showTypingIndicator = false,
  className,
  loadingCount = 0,
}: MessageListProps) {
  // Track whether user is pinned to bottom
  const [isAtBottom, setIsAtBottom] = useState(true);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Helper to scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Observe scroll position to determine if the user is at bottom
  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const threshold = 24; // px tolerance from bottom
    const atBottom = viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight) <= threshold;
    setIsAtBottom(atBottom);
  }, []);

  // Auto-scroll when new content arrives only if user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isStreaming, streamingMessage?.content, loadingCount]);

  // Also observe size changes (streaming line wraps) and keep pinned if at bottom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottom) {
        scrollToBottom("auto");
      }
    });

    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [isAtBottom, scrollToBottom]);

  return (
    <div className="relative h-full">
      <ScrollArea className={className}>
        {/* ScrollArea renders a wrapper; we need the viewport node to track scroll.
            shadcn/ui exposes a data-radix-scroll-area-viewport attribute we can query in effect.
            We attach a ref after mount. */}
        <div
          // This wrapper allows us to capture the actual viewport element reference on mount
          ref={(node) => {
            if (!node) return;
            // Find the viewport within this ScrollArea
            const viewport = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
            if (viewport && viewportRef.current !== viewport) {
              viewportRef.current = viewport;
              viewport.addEventListener("scroll", handleScroll, { passive: true });
            }
          }}
        />
        <div className="space-y-3 p-2 sm:p-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isStreaming && streamingMessage && (
            // AI response row only (user input is always MessageBubble)
            <AIResponse message={streamingMessage} isStreaming className="mt-1" />
          )}


          {loadingCount > 0 &&
            Array.from({ length: loadingCount }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="flex justify-start">
                <Card className="max-w-[85%]">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Jump to latest button when user is not at bottom */}
      {!isAtBottom && (
        <button
          type="button"
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow hover:opacity-90"
          onClick={() => {
            scrollToBottom("smooth");
            setIsAtBottom(true);
          }}
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}

export const MessageList = memo(MessageListBase);
export default MessageList;
