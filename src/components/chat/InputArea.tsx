import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface InputAreaProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function InputArea({ onSend, disabled }: InputAreaProps) {
  const [input, setInput] = useState("")

  const handleSubmit = () => {
    const trimmedInput = input.trim()
    if (trimmedInput && !disabled) {
      onSend(trimmedInput)
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "AI 正在思考..." : "告诉我你想去哪里旅行...（按 Enter 发送，Shift+Enter 换行）"}
        disabled={disabled}
        className={cn(
          "min-h-[60px] max-h-[200px] resize-y",
          disabled && "opacity-60"
        )}
        rows={1}
      />
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
    </div>
  )
}
