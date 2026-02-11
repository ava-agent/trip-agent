/**
 * AgentProgressTracker - AGUI Agent进度追踪组件
 *
 * 实时显示多Agent协作进度，展示各阶段状态
 */

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AgentMessage, AgentRole } from "@/services/multiAgentService"

interface AgentProgressStage {
  id: string
  name: string
  agent: AgentRole
  status: "pending" | "in_progress" | "completed" | "error"
  progress: number
  messages: string[]
}

interface AgentProgressTrackerProps {
  stages: AgentProgressStage[]
  className?: string
}

const agentConfig: Record<AgentRole, { name: string; icon: string; color: string }> = {
  supervisor: { name: "协调者", icon: "🎯", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  planner: { name: "规划师", icon: "🗺️", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  recommender: { name: "推荐师", icon: "💡", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" },
  booking: { name: "预订师", icon: "💰", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" },
  document: { name: "文档师", icon: "📄", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200" },
}

const statusConfig: Record<AgentProgressStage["status"], { label: string; icon: string; color: string }> = {
  pending: { label: "等待中", icon: "⏳", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  in_progress: { label: "进行中", icon: "🔄", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
  completed: { label: "已完成", icon: "✓", color: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" },
  error: { label: "错误", icon: "⚠️", color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" },
}

export function AgentProgressTracker({ stages, className }: AgentProgressTrackerProps) {
  const completedCount = stages.filter(s => s.status === "completed").length
  const overallProgress = stages.length > 0 ? (completedCount / stages.length) * 100 : 0

  return (
    <Card
      className={cn(
        "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20",
        className
      )}
    >
      {/* Overall Progress Header */}
      <div className="border-b border-purple-200/50 dark:border-purple-800/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-lg">🤖</span>
            <span>AI Agent 协作进度</span>
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              overallProgress === 100
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
            )}
          >
            {completedCount}/{stages.length} 完成
          </Badge>
        </div>
        <Progress value={overallProgress} showLabel size="sm" variant="default" />
      </div>

      {/* Stages List */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1 p-2">
          {stages.map((stage, index) => {
            const agent = agentConfig[stage.agent]
            const status = statusConfig[stage.status]
            const isCompleted = stage.status === "completed"

            return (
              <div
                key={stage.id}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border p-3 transition-all",
                  isCompleted
                    ? "border-green-200/50 bg-green-50/30 dark:border-green-800/50 dark:bg-green-950/20"
                    : stage.status === "in_progress"
                      ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                      : stage.status === "error"
                        ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
                        : "border-transparent bg-muted/30",
                  stage.status === "in_progress" && "shadow-sm"
                )}
              >
                {/* Status Icon */}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm",
                    status.color
                  )}
                >
                  {status.icon}
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-base">{agent.icon}</span>
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", status.color)}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  {/* Stage Progress */}
                  {stage.status === "in_progress" && stage.progress > 0 && (
                    <div className="mb-2">
                      <Progress value={stage.progress} size="sm" variant="default" />
                    </div>
                  )}

                  {/* Messages */}
                  {stage.messages.length > 0 && (
                    <div className="space-y-1">
                      {stage.messages.map((message, msgIndex) => (
                        <div
                          key={msgIndex}
                          className={cn(
                            "text-xs leading-relaxed",
                            isCompleted
                              ? "text-green-700/80 dark:text-green-300/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stage Number */}
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : stage.status === "in_progress"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
              </div>
            )
          })}

          {/* Empty State */}
          {stages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <div className="mb-2 text-2xl">🤖</div>
              <p>等待 AI Agent 启动...</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

/**
 * Hook to convert AgentMessage array to progress stages
 */
export function messagesToProgressStages(
  messages: AgentMessage[],
  totalStages: number = 4
): AgentProgressStage[] {
  const stages: AgentProgressStage[] = []

  // Initialize stages based on agent sequence
  const agentSequence: AgentRole[] = ["supervisor", "planner", "recommender", "booking", "document"]

  for (let i = 0; i < Math.min(totalStages, agentSequence.length); i++) {
    const agent = agentSequence[i]
    const agentMessages = messages.filter(m => m.agent === agent)

    const stage: AgentProgressStage = {
      id: `stage-${i}`,
      name: agentConfig[agent].name,
      agent,
      status: "pending",
      progress: 0,
      messages: [],
    }

    if (agentMessages.length > 0) {
      const hasError = agentMessages.some(m => m.type === "error")
      const hasResult = agentMessages.some(m => m.type === "result")

      if (hasError) {
        stage.status = "error"
      } else if (hasResult) {
        stage.status = "completed"
        stage.progress = 100
      } else {
        stage.status = "in_progress"
        stage.progress = Math.min(agentMessages.length * 25, 75)
      }

      stage.messages = agentMessages.map(m => {
        // Remove tool call formatting for cleaner display
        const content = m.content.replace(/🔧 调用工具:\s*/, "").replace(/✓\s*/, "")
        return content
      })
    }

    stages.push(stage)
  }

  return stages
}
