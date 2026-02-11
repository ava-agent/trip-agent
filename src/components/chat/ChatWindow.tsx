import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InputArea } from "./InputArea"
import { MessageList } from "./MessageList"
import { AgentMessageList } from "./AgentMessageList"
import { QuestionPanel } from "./QuestionPanel"
import { useChatStore } from "@/stores/chatStore"
import { useSessionStore } from "@/stores/sessionStore"
import { useTripStore } from "@/stores/tripStore"
import { MultiAgentService } from "@/services/multiAgentService"
import { QuestionGenerator, type Question, type QuestionSequence } from "@/services/questionGenerator"
import { trackUserMessage, trackAssistantMessage } from "@/services/sessionService"
import { getUserContext } from "@/stores/sessionStore"
import type { ChatMessage, UserPreferences } from "@/types"
import type { AgentMessage as AgentMessageType } from "@/services/multiAgentService"

interface QuestionState {
  sequence: QuestionSequence | null
  pendingMessage: string | null
  collectedContext: Record<string, unknown>
}

/**
 * 类型守卫：检查是否是 need_more_info 响应
 */
function isNeedMoreInfoResponse(response: { message: AgentMessageType; done?: boolean } | { type: "need_more_info"; questions: Question[]; extractedContext?: Record<string, unknown> }): response is { type: "need_more_info"; questions: Question[]; extractedContext: Record<string, unknown> } {
  return 'type' in response && response.type === 'need_more_info'
}

/**
 * 类型守卫：检查是否是 agent 消息响应
 */
function isAgentMessageResponse(response: { message: AgentMessageType; done?: boolean } | { type: "need_more_info"; questions: Question[]; extractedContext?: Record<string, unknown> }): response is { message: AgentMessageType; done?: boolean } {
  return 'message' in response
}

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const setProcessing = useChatStore((state) => state.setProcessing)
  const isProcessing = useChatStore((state) => state.isProcessing)
  const userPreferences = useSessionStore((state) => state.session.preferences)

  const [agentMessages, setAgentMessages] = useState<AgentMessageType[]>([])
  const [questionState, setQuestionState] = useState<QuestionState>({
    sequence: null,
    pendingMessage: null,
    collectedContext: {},
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const isStreamingRef = useRef(false)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, agentMessages, questionState.sequence])

  /**
   * 处理发送消息
   */
  const handleSendMessage = useCallback(async (content: string) => {
    // 如果正在问答模式，则不处理
    if (questionState.sequence) {
      return
    }

    if (isStreamingRef.current || isProcessing) return

    // 添加用户消息到聊天界面
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
      status: "completed",
    }
    addMessage(userMessage)

    trackUserMessage(content, undefined, undefined)

    // 开始处理
    setAgentMessages([])
    setProcessing(true)
    isStreamingRef.current = true

    try {
      const personalizedContext = getUserContext()

      const existingContext: Partial<{
        destination: string
        days: number
        budget: { min: number; max: number; currency: string }
        startDate: Date
        preferences: string[]
      }> = {}

      const agentContext = {
        userMessage: content,
        conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        userPreferences,
        personalizedContext,
        existingContext,
      }

      // 流式处理 Agent，传递已收集的上下文
      for await (const response of MultiAgentService.processWithAgents(agentContext, existingContext)) {
        // 使用类型守卫检查响应类型
        if (isNeedMoreInfoResponse(response)) {
          // 显示问题面板，保留已提取的上下文（如从消息中提取的目的地）
          console.log('[ChatWindow] A2UI triggered, extractedContext:', response.extractedContext)
          setQuestionState({
            sequence: {
              questions: response.questions,
              currentIndex: 0,
              isComplete: false,
            },
            pendingMessage: content,
            collectedContext: response.extractedContext || {},
          })
          setAgentMessages([])
          isStreamingRef.current = false
          setProcessing(false)
          return
        }

        if (isAgentMessageResponse(response)) {
          const { message: agentMsg, done } = response
          console.log('[ChatWindow] Received agent message:', agentMsg.agent, agentMsg.content.substring(0, 50), 'done:', done)

          setAgentMessages((prev) => {
            const newMessages = [...prev, agentMsg]
            console.log('[ChatWindow] Agent messages count:', newMessages.length)
            return newMessages
          })

          if (done) {
            console.log('[ChatWindow] Processing done, waiting before clearing agent messages')
            await new Promise(resolve => setTimeout(resolve, 800))

            const trip = await MultiAgentService.generateTripFromContext(agentContext)

            // 存储行程到 tripStore
            useTripStore.getState().setCurrentTrip(trip)

            const finalResponse = `✨ ${trip.name}已生成完成！\n\n` +
              `📅 行程概览：\n` +
              `• 目的地：${trip.destination.name}\n` +
              `• 天数：${trip.duration.days}天\n` +
              `• 活动数：${trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)}个\n` +
              `• 预算：¥${trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0).toFixed(0)}\n\n` +
              `💡 点击下方行程卡片查看详细安排，或使用"导出"功能保存行程。`

            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: finalResponse,
              timestamp: new Date(),
              status: "completed",
              metadata: { tripId: trip.id },
            }
            addMessage(assistantMessage)

            trackAssistantMessage(finalResponse, trip.id)

            // Keep agent messages visible to show the thinking process
            // setAgentMessages([])
            break
          }
        }
      }

      isStreamingRef.current = false
      setProcessing(false)
    } catch (error) {
      console.error("Agent error:", error)
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "抱歉，处理你的请求时出错。请重试。",
        timestamp: new Date(),
        status: "completed",
      }
      addMessage(errorMessage)
      setAgentMessages([])
      isStreamingRef.current = false
      setProcessing(false)
    }
  }, [addMessage, setProcessing, messages, userPreferences, isProcessing, questionState.sequence])

  /**
   * 继续处理收集的上下文
   */
  const continueWithCollectedContext = useCallback(async (userMessage: string, collectedContext: Record<string, unknown>) => {
    setAgentMessages([])
    setProcessing(true)
    isStreamingRef.current = true

    try {
      const personalizedContext = getUserContext()

      const existingContext: Partial<{
        destination: string
        days: number
        budget: { min: number; max: number; currency: string }
        startDate: Date
        preferences: string[]
      }> = {}

      if (collectedContext.destination) existingContext.destination = collectedContext.destination as string
      if (collectedContext.days) existingContext.days = collectedContext.days as number
      if (collectedContext.budget) existingContext.budget = collectedContext.budget as { min: number; max: number; currency: string }
      if (collectedContext.startDate) existingContext.startDate = collectedContext.startDate as Date
      if (collectedContext.preferences) existingContext.preferences = collectedContext.preferences as string[]

      const agentContext = {
        userMessage,
        conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        userPreferences: {
          ...userPreferences,
          ...collectedContext,
        } as UserPreferences,
        personalizedContext,
        existingContext,
      }

      console.log('[ChatWindow] continueWithCollectedContext - agentContext:', {
        userMessage,
        existingContext,
        userPreferences: agentContext.userPreferences,
      })

      // 流式处理 Agent，传递已收集的上下文
      for await (const response of MultiAgentService.processWithAgents(agentContext, existingContext)) {
        if (isNeedMoreInfoResponse(response)) {
          // 再次需要更多信息（不应该发生，但处理以防万一）
          setQuestionState({
            sequence: {
              questions: response.questions,
              currentIndex: 0,
              isComplete: false,
            },
            pendingMessage: userMessage,
            collectedContext,
          })
          setAgentMessages([])
          isStreamingRef.current = false
          setProcessing(false)
          return
        }

        if (isAgentMessageResponse(response)) {
          const { message: agentMsg, done } = response
          console.log('[ChatWindow] Received agent message:', agentMsg.agent, agentMsg.content.substring(0, 50), 'done:', done)

          setAgentMessages((prev) => {
            const newMessages = [...prev, agentMsg]
            return newMessages
          })

          if (done) {
            await new Promise(resolve => setTimeout(resolve, 800))

            const trip = await MultiAgentService.generateTripFromContext(agentContext)

            // 存储行程到 tripStore
            useTripStore.getState().setCurrentTrip(trip)

            const finalResponse = `✨ ${trip.name}已生成完成！\n\n` +
              `📅 行程概览：\n` +
              `• 目的地：${trip.destination.name}\n` +
              `• 天数：${trip.duration.days}天\n` +
              `• 活动数：${trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)}个\n` +
              `• 预算：¥${trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0).toFixed(0)}\n\n` +
              `💡 点击下方行程卡片查看详细安排，或使用"导出"功能保存行程。`

            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: finalResponse,
              timestamp: new Date(),
              status: "completed",
              metadata: { tripId: trip.id },
            }
            addMessage(assistantMessage)

            trackAssistantMessage(finalResponse, trip.id)

            // Keep agent messages visible to show the thinking process
            // setAgentMessages([])
            break
          }
        }
      }

      isStreamingRef.current = false
      setProcessing(false)
    } catch (error) {
      console.error("Agent error:", error)
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "抱歉，处理你的请求时出错。请重试。",
        timestamp: new Date(),
        status: "completed",
      }
      addMessage(errorMessage)
      setAgentMessages([])
      isStreamingRef.current = false
      setProcessing(false)
    }
  }, [addMessage, setProcessing, messages, userPreferences, isProcessing])

  /**
   * 处理问题回答
   * 当用户回答问题时，更新上下文并继续处理
   */
  const handleQuestionAnswer = useCallback(async (question: Question, answer: string) => {
    if (!questionState.sequence) return

    const generator = new QuestionGenerator()
    const updatedContext = generator.parseAnswer(question, answer, questionState.collectedContext)

    // 移动到下一个问题
    const nextSequence = generator.advanceToNext(questionState.sequence)

    if (nextSequence.isComplete) {
      // 所有问题已回答，开始处理
      const originalMessage = questionState.pendingMessage || ""
      const fullContext = {
        ...updatedContext,
        ...questionState.collectedContext,
      }

      // 清除问题状态
      setQuestionState({
        sequence: null,
        pendingMessage: null,
        collectedContext: {},
      })

      // 开始处理完整的上下文
      await continueWithCollectedContext(originalMessage, fullContext)
    } else {
      // 还有更多问题，更新状态
      setQuestionState({
        ...questionState,
        sequence: nextSequence,
        collectedContext: updatedContext,
      })
    }
  }, [questionState, continueWithCollectedContext])

  /**
   * 跳过当前问题
   */
  const handleSkipQuestion = useCallback(() => {
    if (!questionState.sequence) return

    const generator = new QuestionGenerator()
    const nextSequence = generator.advanceToNext(questionState.sequence)

    if (nextSequence.isComplete) {
      // 跳过后完成，开始处理
      const originalMessage = questionState.pendingMessage || ""

      setQuestionState({
        sequence: null,
        pendingMessage: null,
        collectedContext: questionState.collectedContext,
      })

      // 继续处理
      continueWithCollectedContext(originalMessage, questionState.collectedContext)
    } else {
      setQuestionState({
        ...questionState,
        sequence: nextSequence,
      })
    }
  }, [questionState, continueWithCollectedContext])

  const isDisabled = isProcessing || isStreamingRef.current || questionState.sequence !== null

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
