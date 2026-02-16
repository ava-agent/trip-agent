import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, User, MoreHorizontal, Copy, Check } from "lucide-react"
import Markdown from "react-markdown"
import type { ChatMessage } from "@/types"
import { cn } from "@/lib/utils"
import { useTripStore } from "@/stores/tripStore"
import { ItineraryCard } from "@/components/itinerary/ItineraryCard"
import { toast } from "sonner"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const isStreaming = message.status === "streaming"
  const isError = message.status === "error"
  const currentTrip = useTripStore((state) => state.currentTrip)
  const tripId = message.metadata?.tripId
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const shouldShowTripCard = tripId && currentTrip && currentTrip.id === tripId

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast.success("已复制到剪贴板")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败")
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn("flex gap-3 w-full group", isAssistant ? "flex-row" : "flex-row-reverse")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn(
            "text-sm",
            isAssistant
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="relative max-w-[80%]">
          <Card className={cn(
            "p-4 transition-shadow",
            isAssistant
              ? "bg-muted/50 border-border"
              : "bg-primary/10 border-primary/20",
            isError && "border-destructive/50 bg-destructive/5"
          )}>
            {/* Markdown rendering for assistant, plain text for user */}
            {isAssistant ? (
              <div className="text-sm leading-relaxed break-words prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <Markdown>{message.content}</Markdown>
                {isStreaming && (
                  <span className="inline-flex items-center ml-1">
                    <MoreHorizontal className="h-4 w-4 animate-pulse" />
                  </span>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {message.content}
              </div>
            )}
            <p className={cn(
              "mt-2 text-xs text-muted-foreground",
              isAssistant ? "text-left" : "text-right"
            )}>
              {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </Card>

          {/* Message actions */}
          {isHovered && !isStreaming && (
            <div className={cn(
              "absolute -bottom-2 flex gap-1",
              isAssistant ? "left-2" : "right-2"
            )}>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 rounded-full shadow-sm"
                onClick={handleCopy}
                title="复制"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Trip card */}
      {shouldShowTripCard && currentTrip && (
        <div className={cn(isAssistant ? "pl-11" : "pr-11")}>
          <ItineraryCard trip={currentTrip} />
        </div>
      )}
    </div>
  )
}
