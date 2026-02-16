import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Square, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { LLMService } from "@/services/llmService"
import { useUiStore } from "@/stores/uiStore"

interface InputAreaProps {
  onSend: (content: string) => void
  onCancel?: () => void
  disabled?: boolean
}

export function InputArea({ onSend, onCancel, disabled }: InputAreaProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toggleSettings = useUiStore((state) => state.toggleSettings)
  const isLLMConfigured = LLMService.isConfigured()

  // Focus textarea when not disabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSubmit = () => {
    const trimmedInput = input.trim()
    if (trimmedInput && !disabled) {
      setIsSending(true)
      onSend(trimmedInput)
      setInput("")
      // Brief animation feedback
      setTimeout(() => setIsSending(false), 200)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "AI 正在思考..." : "告诉我你想去哪里旅行...（Enter 发送，Shift+Enter 换行）"}
          disabled={disabled}
          className={cn(
            "min-h-[60px] max-h-[200px] resize-y transition-opacity",
            disabled && "opacity-60"
          )}
          rows={1}
        />
        <div className="flex flex-col gap-1">
          {disabled && onCancel ? (
            <Button
              onClick={onCancel}
              size="icon"
              variant="destructive"
              className="h-[60px] w-[60px] shrink-0"
              title="取消"
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <motion.div
              animate={isSending ? { scale: [1, 0.9, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleSubmit}
                size="icon"
                disabled={disabled || !input.trim()}
                className={cn(
                  "h-[60px] w-[60px] shrink-0 transition-all",
                  !input.trim() && "opacity-50"
                )}
                aria-label="发送消息"
              >
                {disabled ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      {/* LLM not configured warning */}
      {!isLLMConfigured && (
        <button
          onClick={toggleSettings}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors w-full text-left"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>未配置 AI 模型密钥，请点击此处前往设置</span>
        </button>
      )}
      {/* Hint text */}
      <div className="flex justify-between px-1">
        <p className="text-xs text-muted-foreground/50">
          试试: "帮我规划一个东京5天的旅行" 或 "推荐巴厘岛的酒店"
        </p>
        {input.length > 0 && (
          <p className="text-xs text-muted-foreground/50">{input.length} 字</p>
        )}
      </div>
    </div>
  )
}
