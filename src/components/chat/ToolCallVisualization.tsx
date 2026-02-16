/**
 * ToolCallVisualization - AGUI 工具调用可视化组件
 *
 * 显示Agent调用的工具及其结果，提供透明的执行过程
 */

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AgentMessage } from "@/services/multiAgentService"

interface ToolCall {
  id: string
  name: string
  args: string
  status: "pending" | "running" | "success" | "error"
  result?: string
  error?: string
  duration?: number
  timestamp: Date
}

interface ToolCallVisualizationProps {
  messages: AgentMessage[]
  className?: string
  maxHeight?: string
}

const toolStatusConfig: Record<ToolCall["status"], { icon: string; label: string; color: string }> = {
  pending: { icon: "⏳", label: "等待", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  running: { icon: "🔄", label: "执行中", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
  success: { icon: "✓", label: "成功", color: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" },
  error: { icon: "✕", label: "失败", color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" },
}

/**
 * Parse tool call from message content
 */
function parseToolCall(message: AgentMessage): ToolCall | null {
  const toolMatch = message.content.match(/🔧 调用工具:\s*(.+?)\((.*?)\)/)

  if (!toolMatch) {
    return null
  }

  const [, name, args] = toolMatch

  const status: ToolCall["status"] =
    message.type === "error"
      ? "error"
      : message.type === "result"
        ? "success"
        : message.type === "action"
          ? "running"
          : "pending"

  return {
    id: `tool-${message.agent}-${Date.now()}`,
    name: name.trim(),
    args: args.trim(),
    status,
    result: message.type === "result" ? message.content.replace(/✓\s*/, "") : undefined,
    error: message.type === "error" ? message.content : undefined,
    timestamp: message.timestamp,
  }
}

export function ToolCallVisualization({
  messages,
  className,
  maxHeight = "300px",
}: ToolCallVisualizationProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  // Extract tool calls from messages
  const toolCalls = useMemo(
    () => messages.map(msg => parseToolCall(msg)).filter((call): call is ToolCall => call !== null),
    [messages]
  )

  // Toggle expansion
  const toggleExpand = (id: string) => {
    setExpandedCalls(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (toolCalls.length === 0) {
    return null
  }

  const displayedCalls = showAll ? toolCalls : toolCalls.slice(0, 3)

  return (
    <Card
      className={cn(
        "border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-cyan-200/50 dark:border-cyan-800/50 p-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-lg">🔧</span>
            <span>工具调用详情</span>
            <Badge variant="outline" className="text-xs">
              {toolCalls.length} 次
            </Badge>
          </h3>
          {toolCalls.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="h-7 text-xs"
            >
              {showAll ? "收起" : `显示全部 (${toolCalls.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Tool Calls List */}
      <ScrollArea className={maxHeight}>
        <div className="divide-y divide-cyan-200/50 dark:divide-cyan-800/50">
          {displayedCalls.map((call) => {
            const status = toolStatusConfig[call.status]
            const isExpanded = expandedCalls.has(call.id)

            return (
              <div
                key={call.id}
                className="group hover:bg-cyan-100/30 dark:hover:bg-cyan-900/20"
              >
                {/* Summary Row */}
                <button
                  onClick={() => toggleExpand(call.id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors"
                >
                  {/* Status */}
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                      status.color
                    )}
                  >
                    {status.icon}
                  </div>

                  {/* Tool Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                        {call.name}
                      </code>
                      {call.args && (
                        <span className="text-xs text-muted-foreground">
                          ({call.args})
                        </span>
                      )}
                    </div>

                    {/* Result Preview */}
                    {call.result && !isExpanded && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {call.result}
                      </p>
                    )}
                    {call.error && !isExpanded && (
                      <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">
                        {call.error}
                      </p>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <div
                    className={cn(
                      "text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  >
                    ▶
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {call.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-cyan-200/50 dark:border-cyan-800/50 bg-cyan-100/30 dark:bg-cyan-900/20 p-3">
                    {/* Arguments */}
                    {call.args && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">参数:</span>
                        <code className="ml-2 rounded bg-background px-2 py-1 text-xs">
                          {call.args}
                        </code>
                      </div>
                    )}

                    {/* Result */}
                    {call.result && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">结果:</span>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                          {call.result}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {call.error && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">错误:</span>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                          {call.error}
                        </p>
                      </div>
                    )}

                    {/* Duration */}
                    {call.duration && (
                      <div className="text-xs text-muted-foreground">
                        执行时间: {call.duration}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Summary Footer */}
      <div className="border-t border-cyan-200/50 dark:border-cyan-800/50 bg-cyan-100/30 dark:bg-cyan-900/20 p-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            成功: <span className="text-green-600 dark:text-green-400">{toolCalls.filter(c => c.status === "success").length}</span>
          </span>
          <span>
            执行中: <span className="text-blue-600 dark:text-blue-400">{toolCalls.filter(c => c.status === "running").length}</span>
          </span>
          <span>
            失败: <span className="text-red-600 dark:text-red-400">{toolCalls.filter(c => c.status === "error").length}</span>
          </span>
        </div>
      </div>
    </Card>
  )
}

/**
 * Compact version - inline tool call display
 */
export function ToolCallInline({ messages }: { messages: AgentMessage[] }) {
  const toolCalls = messages
    .map(msg => parseToolCall(msg))
    .filter((call): call is ToolCall => call !== null)

  if (toolCalls.length === 0) {
    return null
  }

  const latestCall = toolCalls[toolCalls.length - 1]
  const status = toolStatusConfig[latestCall.status]

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{status.icon}</span>
      <code className="text-cyan-700 dark:text-cyan-300">{latestCall.name}</code>
      {latestCall.args && (
        <span className="text-muted-foreground">({latestCall.args})</span>
      )}
    </div>
  )
}
