import { create } from "zustand"

// ============================================================================
// Question Types
// ============================================================================

export type QuestionStatus = "pending" | "active" | "answered"

export interface Question {
  id: string
  text: string
  type: "text" | "choice" | "multi-choice" | "date" | "number"
  options?: string[]
  required: boolean
  status: QuestionStatus
  answer?: string | string[]
  contextKey: string
  order: number
  dependsOn?: string // ID of question this depends on
  condition?: (answers: Map<string, Question>) => boolean
}

export interface QuestionContext {
  destination?: string
  startDate?: string
  endDate?: string
  duration?: number
  budget?: {
    min?: number
    max?: number
    currency?: string
  }
  interests?: string[]
  accommodationType?: string
  travelers?: number
  [key: string]: unknown
}

// ============================================================================
// Question Store State
// ============================================================================

interface QuestionState {
  // State
  activeQuestions: Question[]
  answeredQuestions: Map<string, Question>
  currentQuestionIndex: number
  isCollecting: boolean
  context: QuestionContext

  // Actions
  startCollection: (questions: Question[]) => void
  answerQuestion: (questionId: string, answer: string | string[]) => void
  nextQuestion: () => void
  previousQuestion: () => void
  skipQuestion: (questionId: string) => void
  updateContext: (key: string, value: unknown) => void
  getCompletedContext: () => QuestionContext
  reset: () => void
  getCurrentQuestion: () => Question | undefined
}

// ============================================================================
// Question Store Implementation
// ============================================================================

export const useQuestionStore = create<QuestionState>((set, get) => ({
  // Initial State
  activeQuestions: [],
  answeredQuestions: new Map(),
  currentQuestionIndex: 0,
  isCollecting: false,
  context: {},

  // Start question collection
  startCollection: (questions) =>
    set({
      activeQuestions: questions,
      answeredQuestions: new Map(),
      currentQuestionIndex: 0,
      isCollecting: true,
      context: {},
    }),

  // Answer current question
  answerQuestion: (questionId, answer) => {
    const state = get()
    const question = state.activeQuestions.find((q) => q.id === questionId)

    if (!question) return

    const answeredQuestion: Question = {
      ...question,
      status: "answered",
      answer,
    }

    const newAnswered = new Map(state.answeredQuestions)
    newAnswered.set(questionId, answeredQuestion)

    // Update context
    const newContext = { ...state.context }
    newContext[question.contextKey] = answer

    set({
      answeredQuestions: newAnswered,
      context: newContext,
    })
  },

  // Move to next question
  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(
        state.currentQuestionIndex + 1,
        state.activeQuestions.length - 1
      ),
    })),

  // Move to previous question
  previousQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),

  // Skip a question
  skipQuestion: (questionId) => {
    const state = get()
    const question = state.activeQuestions.find((q) => q.id === questionId)

    if (!question) return

    const answeredQuestion: Question = {
      ...question,
      status: "answered",
      answer: undefined,
    }

    const newAnswered = new Map(state.answeredQuestions)
    newAnswered.set(questionId, answeredQuestion)

    set({ answeredQuestions: newAnswered })
  },

  // Update context directly
  updateContext: (key, value) =>
    set((state) => ({
      context: {
        ...state.context,
        [key]: value,
      },
    })),

  // Get completed context from answered questions
  getCompletedContext: () => {
    const state = get()
    const context: QuestionContext = {}

    state.answeredQuestions.forEach((question) => {
      if (question.answer !== undefined) {
        context[question.contextKey] = question.answer
      }
    })

    return context
  },

  // Reset store
  reset: () =>
    set({
      activeQuestions: [],
      answeredQuestions: new Map(),
      currentQuestionIndex: 0,
      isCollecting: false,
      context: {},
    }),

  // Get current question
  getCurrentQuestion: () => {
    const state = get()
    return state.activeQuestions[state.currentQuestionIndex]
  },
}))
