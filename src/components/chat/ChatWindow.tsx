import { useEffect, useRef, useState, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { InputArea } from "./InputArea"
import { MessageList } from "./MessageList"
import { AgentMessageList } from "./AgentMessageList"
import { QuestionPanel } from "./QuestionPanel"
import { useChatStore } from "@/stores/chatStore"
import { useAgentProcessing } from "@/hooks/useAgentProcessing"
import { ArrowDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages)
  const isProcessing = useChatStore((state) => state.isProcessing)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)

  const {
    agentMessages,
    questionState,
    isDisabled,
    handleSendMessage,
    handleQuestionAnswer,
    handleSkipQuestion,
  } = useAgentProcessing()

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setIsUserScrolledUp(!isAtBottom)
  }, [])

  // Auto-scroll only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrolledUp && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, agentMessages, questionState.sequence, isUserScrolledUp])

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    setIsUserScrolledUp(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef} onScrollCapture={handleScroll}>
          <div className="mx-auto max-w-3xl p-6">
            <MessageList messages={messages} />
            {agentMessages.length > 0 && <AgentMessageList messages={agentMessages} />}
            {/* A2UI: Question Panel */}
            {questionState.sequence && (
              <div className="mb-4">
                <QuestionPanel
                  sequence={questionState.sequence}
                  onAnswer={handleQuestionAnswer}
                  onSkip={handleSkipQuestion}
                  isLoading={isProcessing}
                />
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {isUserScrolledUp && (
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollToBottom}
                className="rounded-full shadow-md"
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                回到底部
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t bg-card p-4 transition-colors duration-300">
        <div className="mx-auto max-w-3xl">
          <InputArea onSend={handleSendMessage} disabled={isDisabled} />
        </div>
      </div>
    </div>
  )
}
