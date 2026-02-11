import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Bot, User, MoreHorizontal } from "lucide-react"
import type { ChatMessage } from "@/types"
import { cn } from "@/lib/utils"
import { useTripStore } from "@/stores/tripStore"
import { ItineraryCard } from "@/components/itinerary/ItineraryCard"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const isStreaming = message.status === "streaming"
  const isError = message.status === "error"
  const currentTrip = useTripStore((state) => state.currentTrip)
  const tripId = message.metadata?.tripId

  // 如果消息关联了行程且行程在 store 中存在，显示行程卡片
  const shouldShowTripCard = tripId && currentTrip && currentTrip.id === tripId

  return (
    <div className="space-y-3">
      {/* 原始消息内容 */}
      <div className={cn("flex gap-3 w-full", isAssistant ? "flex-row" : "flex-row-reverse")}>
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
        <Card className={cn(
          "max-w-[80%] p-4",
          isAssistant
            ? "bg-muted/50 border-border"
            : "bg-primary/10 border-primary/20",
          isError && "border-destructive/50 bg-destructive/5"
        )}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-flex items-center ml-1">
                <MoreHorizontal className="h-4 w-4 animate-pulse" />
              </span>
            )}
          </div>
          <p className={cn(
            "mt-2 text-xs text-muted-foreground",
            isAssistant ? "text-left" : "text-right"
          )}>
            {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </Card>
      </div>

      {/* 行程卡片 */}
      {shouldShowTripCard && currentTrip && (
        <div className={cn(isAssistant ? "pl-11" : "pr-11")}>
          <ItineraryCard trip={currentTrip} />
        </div>
      )}
    </div>
  )
}
