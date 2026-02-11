import { AgentMessage } from "./AgentMessage"
import type { AgentMessage as AgentMessageType } from "@/services/multiAgentService"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AgentMessageListProps {
  messages: AgentMessageType[]
  isProcessing?: boolean
}

export function AgentMessageList({ messages, isProcessing = true }: AgentMessageListProps) {
  if (messages.length === 0) {
    return null
  }

  return (
    <div className="my-4 space-y-1">
      {/* 标题栏 */}
      <div className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 rounded-lg bg-muted/30",
        isProcessing && "animate-pulse"
      )}>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="font-medium">
          {isProcessing ? "AI Agent 协作中..." : "AI Agent 协作完成"}
        </span>
        <span className="text-xs ml-auto">
          {messages.length} 条消息
        </span>
      </div>

      {/* 消息列表 */}
      <div className="space-y-1 pl-2 border-l-2 border-muted">
        {messages.map((msg, index) => (
          <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AgentMessage message={msg} />
          </div>
        ))}
      </div>

      <Separator className="my-4" />
    </div>
  )
}
