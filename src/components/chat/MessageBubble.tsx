import { memo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { ChatMessage } from "~/types/chat";
import { cn } from "~/lib/utils";

type MessageBubbleProps = {
  message: ChatMessage;
  className?: string;
  showToolBadges?: boolean;
};

function MessageBubbleBase({ message, className, showToolBadges = true }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <Card
        className={cn(
          "max-w-[85%]",
          isUser ? "bg-primary text-primary-foreground" : "",
          className,
        )}
      >
        <CardContent className="p-3">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {showToolBadges && !isUser && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.toolCalls.map((tool) => (
                <Badge key={tool.id} variant="secondary" className="text-xs">
                  {tool.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
