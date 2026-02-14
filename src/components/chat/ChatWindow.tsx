import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InputArea } from "./InputArea"
import { MessageList } from "./MessageList"
import { AgentMessageList } from "./AgentMessageList"
import { QuestionPanel } from "./QuestionPanel"
import { useChatStore } from "@/stores/chatStore"
import { useAgentProcessing } from "@/hooks/useAgentProcessing"

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages)
  const isProcessing = useChatStore((state) => state.isProcessing)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    agentMessages,
    questionState,
    isDisabled,
    handleSendMessage,
    handleQuestionAnswer,
    handleSkipQuestion,
  } = useAgentProcessing()

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, agentMessages, questionState.sequence])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="mx-auto max-w-3xl p-6">
            <MessageList messages={messages} />
            {agentMessages.length > 0 && <AgentMessageList messages={agentMessages} />}
            {/* A2UI: 问题面板 */}
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
      </div>
      <div className="border-t bg-card p-4">
        <div className="mx-auto max-w-3xl">
          <InputArea onSend={handleSendMessage} disabled={isDisabled} />
        </div>
      </div>
    </div>
  )
}
