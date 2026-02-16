/**
 * useAgentProcessing Hook
 * Extracts agent processing, question handling, and context collection
 * logic from ChatWindow into a reusable hook.
 */

import { useCallback, useRef, useState } from "react"
import { useChatStore } from "@/stores/chatStore"
import { useSessionStore } from "@/stores/sessionStore"
import { useTripStore } from "@/stores/tripStore"
import { MultiAgentService } from "@/services/multiAgentService"
import { QuestionGenerator, type Question, type QuestionSequence } from "@/services/questionGenerator"
import { trackUserMessage, trackAssistantMessage } from "@/services/sessionService"
import { getUserContext } from "@/stores/sessionStore"
import type { ChatMessage, UserPreferences } from "@/types"
import type { AgentMessage } from "@/services/multiAgentService"

// ============================================================================
// Types
// ============================================================================

interface QuestionState {
    sequence: QuestionSequence | null
    pendingMessage: string | null
    collectedContext: Record<string, unknown>
}

type AgentResponse =
    | { message: AgentMessage; done?: boolean }
    | { type: "need_more_info"; questions: Question[]; extractedContext?: Record<string, unknown> }

interface ExistingContext {
    destination?: string
    days?: number
    budget?: { min: number; max: number; currency: string }
    startDate?: Date
    preferences?: string[]
}

// ============================================================================
// Type Guards
// ============================================================================

function isNeedMoreInfoResponse(
    response: AgentResponse
): response is { type: "need_more_info"; questions: Question[]; extractedContext: Record<string, unknown> } {
    return "type" in response && response.type === "need_more_info"
}

function isAgentMessageResponse(
    response: AgentResponse
): response is { message: AgentMessage; done?: boolean } {
    return "message" in response
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentProcessing() {
    const messages = useChatStore((state) => state.messages)
    const addMessage = useChatStore((state) => state.addMessage)
    const setProcessing = useChatStore((state) => state.setProcessing)
    const isProcessing = useChatStore((state) => state.isProcessing)
    const userPreferences = useSessionStore((state) => state.session.preferences)

    const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
    const [questionState, setQuestionState] = useState<QuestionState>({
        sequence: null,
        pendingMessage: null,
        collectedContext: {},
    })
    const isStreamingRef = useRef(false)

    /**
     * Build agent context from user message and optional existing context
     */
    const buildAgentContext = useCallback(
        (userMessage: string, existingContext: ExistingContext = {}, overridePreferences?: Partial<UserPreferences>) => {
            const personalizedContext = getUserContext()
            return {
                userMessage,
                conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
                userPreferences: overridePreferences
                    ? ({ ...userPreferences, ...overridePreferences } as UserPreferences)
                    : userPreferences,
                personalizedContext,
                existingContext,
            }
        },
        [messages, userPreferences]
    )

    /**
     * Generate trip and add final response message
     */
    const finalizeTripGeneration = useCallback(
        async (agentContext: ReturnType<typeof buildAgentContext>) => {
            await new Promise((resolve) => setTimeout(resolve, 800))

            try {
                const trip = await MultiAgentService.generateTripFromContext(agentContext)
                useTripStore.getState().setCurrentTrip(trip)
                useChatStore.getState().setCurrentTripId(trip.id)

                // Auto-save trip to persistent storage
                try {
                    await useTripStore.getState().saveTripToStorage(trip)
                } catch (saveError) {
                    if (import.meta.env.DEV) console.warn("Failed to auto-save trip:", saveError)
                }

                const totalBudget = trip.itinerary.reduce(
                    (sum, day) => sum + (day.estimatedBudget || 0),
                    0
                )

                const finalResponse =
                    `✨ ${trip.name}已生成完成！\n\n` +
                    `📅 行程概览：\n` +
                    `• 目的地：${trip.destination.name}\n` +
                    `• 天数：${trip.duration.days}天\n` +
                    `• 活动数：${trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)}个\n` +
                    (totalBudget > 0 ? `• 预计费用：¥${totalBudget.toFixed(0)}\n` : "") +
                    `\n💡 点击下方行程卡片查看详细安排，或使用"导出"功能保存行程。`

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
            } catch (error) {
                const errorDetail = error instanceof Error ? error.message : "未知错误"
                const errorMessage: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: `⚠️ 行程生成失败：${errorDetail}\n\n请重试，或尝试简化您的需求。`,
                    timestamp: new Date(),
                    status: "completed",
                }
                addMessage(errorMessage)
            }
        },
        [addMessage, buildAgentContext]
    )

    /**
     * Process agent stream responses
     */
    const processAgentStream = useCallback(
        async (
            agentContext: ReturnType<typeof buildAgentContext>,
            existingContext: ExistingContext,
            pendingMessage: string,
            collectedContext: Record<string, unknown> = {}
        ) => {
            for await (const response of MultiAgentService.processWithAgents(agentContext, existingContext)) {
                if (isNeedMoreInfoResponse(response)) {
                    setQuestionState({
                        sequence: {
                            questions: response.questions,
                            currentIndex: 0,
                            isComplete: false,
                        },
                        pendingMessage,
                        collectedContext: response.extractedContext || collectedContext,
                    })
                    setAgentMessages([])
                    isStreamingRef.current = false
                    setProcessing(false)
                    return
                }

                if (isAgentMessageResponse(response)) {
                    const { message: agentMsg, done } = response

                    setAgentMessages((prev) => [...prev, agentMsg])

                    if (done) {
                        setAgentMessages([])
                        await finalizeTripGeneration(agentContext)
                        break
                    }
                }
            }
        },
        [setProcessing, finalizeTripGeneration]
    )

    /**
     * Handle sending a new user message
     */
    const handleSendMessage = useCallback(
        async (content: string) => {
            if (questionState.sequence) return
            if (isStreamingRef.current || isProcessing) return

            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content,
                timestamp: new Date(),
                status: "completed",
            }
            addMessage(userMessage)
            trackUserMessage(content, undefined, undefined)

            setAgentMessages([])
            setProcessing(true)
            isStreamingRef.current = true

            try {
                const existingContext: ExistingContext = {}
                const agentContext = buildAgentContext(content, existingContext)

                await processAgentStream(agentContext, existingContext, content)

                isStreamingRef.current = false
                setProcessing(false)
            } catch (error) {
                if (import.meta.env.DEV) console.error("Agent error:", error)
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
        },
        [addMessage, setProcessing, isProcessing, questionState.sequence, buildAgentContext, processAgentStream]
    )

    /**
     * Continue processing with collected context (after A2UI questions answered)
     */
    const continueWithCollectedContext = useCallback(
        async (userMessage: string, collectedContext: Record<string, unknown>) => {
            setAgentMessages([])
            setProcessing(true)
            isStreamingRef.current = true

            try {
                const existingContext: ExistingContext = {}
                if (collectedContext.destination) existingContext.destination = collectedContext.destination as string
                if (collectedContext.days) existingContext.days = collectedContext.days as number
                if (collectedContext.budget)
                    existingContext.budget = collectedContext.budget as { min: number; max: number; currency: string }
                if (collectedContext.startDate) existingContext.startDate = collectedContext.startDate as Date
                if (collectedContext.preferences) existingContext.preferences = collectedContext.preferences as string[]

                const agentContext = buildAgentContext(userMessage, existingContext, collectedContext as Partial<UserPreferences>)

                await processAgentStream(agentContext, existingContext, userMessage, collectedContext)

                isStreamingRef.current = false
                setProcessing(false)
            } catch (error) {
                if (import.meta.env.DEV) console.error("Agent error:", error)
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
        },
        [addMessage, setProcessing, buildAgentContext, processAgentStream]
    )

    /**
     * Handle answering an A2UI question
     */
    const handleQuestionAnswer = useCallback(
        async (question: Question, answer: string) => {
            if (!questionState.sequence) return

            const generator = new QuestionGenerator()
            const updatedContext = generator.parseAnswer(question, answer, questionState.collectedContext)
            const nextSequence = generator.advanceToNext(questionState.sequence)

            if (nextSequence.isComplete) {
                const originalMessage = questionState.pendingMessage || ""
                const fullContext = { ...questionState.collectedContext, ...updatedContext }

                setQuestionState({ sequence: null, pendingMessage: null, collectedContext: {} })
                await continueWithCollectedContext(originalMessage, fullContext)
            } else {
                setQuestionState({
                    ...questionState,
                    sequence: nextSequence,
                    collectedContext: updatedContext,
                })
            }
        },
        [questionState, continueWithCollectedContext]
    )

    /**
     * Skip the current A2UI question
     */
    const handleSkipQuestion = useCallback(() => {
        if (!questionState.sequence) return

        const generator = new QuestionGenerator()
        const nextSequence = generator.advanceToNext(questionState.sequence)

        if (nextSequence.isComplete) {
            const originalMessage = questionState.pendingMessage || ""

            setQuestionState({
                sequence: null,
                pendingMessage: null,
                collectedContext: questionState.collectedContext,
            })
            continueWithCollectedContext(originalMessage, questionState.collectedContext)
        } else {
            setQuestionState({ ...questionState, sequence: nextSequence })
        }
    }, [questionState, continueWithCollectedContext])

    const isDisabled = isProcessing || isStreamingRef.current || questionState.sequence !== null

    return {
        agentMessages,
        questionState,
        isDisabled,
        handleSendMessage,
        handleQuestionAnswer,
        handleSkipQuestion,
    }
}
