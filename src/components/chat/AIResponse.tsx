"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "~/components/ui/card";
import type { ChatMessage } from "~/types/chat";
import { cn } from "~/lib/utils";

/**
 * AIResponse renders ONLY the assistant's response row.
 * - While streaming and before first token arrives (no content), shows 3-dot animation.
 * - Once content exists, renders content and hides dots.
 * - No caret. No separate TypingIndicator.
 * - This component is NOT used for user input.
 */
type AIResponseProps = {
  message: ChatMessage;      // assistant message only (never user)
  className?: string;
  isStreaming: boolean;      // true while streaming API is active for this assistant turn
};

export default function AIResponse({ message, className, isStreaming }: AIResponseProps) {
  const endRef = useRef<HTMLSpanElement | null>(null);

  // Auto-scroll into view as content grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [message.content]);

  const hasContent = !!message.content && message.content.trim().length > 0;
  // Show dots ONLY when waiting for AI: streaming active AND no visible content yet
  const showTypingDots = isStreaming && !hasContent;

  return (
    <div className={cn("flex justify-start")}>
      <Card className={cn("max-w-[85%]", className)}>
        <CardContent className="p-3">
          <p className="whitespace-pre-wrap break-words">
            {hasContent ? message.content : null}
            {showTypingDots && (
              <span
                className="ml-0 inline-flex items-end gap-1 align-baseline"
                aria-hidden="true"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-duration:1.2s] [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-duration:1.2s] [animation-delay:150ms]" />
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-duration:1.2s] [animation-delay:300ms]" />
              </span>
            )}
          </p>
          <span ref={endRef} />
        </CardContent>
      </Card>
    </div>
  );
}
