import type { AgentMessage as AgentMessageType } from "@/services/multiAgentService"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AgentMessageProps {
  message: AgentMessageType
}

const agentConfig: Record<string, { name: string; color: string; icon: string }> = {
  supervisor: { name: "协调者", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-700", icon: "🎯" },
  planner: { name: "规划师", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-700", icon: "🗺️" },
  recommender: { name: "推荐师", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-700", icon: "💡" },
  booking: { name: "预订师", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 dark:border-orange-700", icon: "💰" },
  document: { name: "文档师", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200 border-gray-200 dark:border-gray-700", icon: "📄" },
}

const typeConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  thought: {
    label: "",
    bgColor: "bg-muted/30",
    textColor: "text-muted-foreground",
    borderColor: "border-transparent"
  },
  action: {
    label: "",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  result: {
    label: "",
    bgColor: "bg-green-50/50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-200 dark:border-green-800"
  },
  error: {
    label: "",
    bgColor: "bg-red-50/50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-200 dark:border-red-800"
  },
}

export function AgentMessage({ message }: AgentMessageProps) {
  const config = agentConfig[message.agent]
  const styleConfig = typeConfig[message.type]

  return (
    <div className={cn(
      "flex items-start gap-3 py-2.5 px-3 rounded-lg border transition-colors",
      styleConfig.bgColor,
      styleConfig.borderColor
    )}>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-xs font-medium",
          config.color
        )}
      >
        <span className="mr-1">{config.icon}</span>
        {config.name}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm whitespace-pre-wrap break-words leading-relaxed",
          styleConfig.textColor
        )}>
          {message.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
          {message.timestamp.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}
        </p>
      </div>
    </div>
  )
}
