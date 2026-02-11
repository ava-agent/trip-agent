import { cn } from "@/lib/utils"

interface ThinkingIndicatorProps {
  text?: string
  className?: string
}

export function ThinkingIndicator({ text = "AI 正在思考", className }: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground py-3 px-4", className)}>
      <div className="flex gap-1 items-center" aria-label="加载中" aria-live="polite">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}
