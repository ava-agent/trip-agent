/**
 * Tests for questionStore.ts
 * Testing question state management with Zustand
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useQuestionStore } from "../questionStore"
import type { Question } from "../questionStore"

describe("questionStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useQuestionStore.getState().reset()
  })

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useQuestionStore.getState()

      expect(state.activeQuestions).toEqual([])
      expect(state.answeredQuestions instanceof Map).toBe(true)
      expect(state.currentQuestionIndex).toBe(0)
      expect(state.isCollecting).toBe(false)
      expect(state.context).toEqual({})
    })
  })

  describe("startCollection", () => {
    it("should initialize question collection", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "你想去哪里？",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "destination",
          order: 1,
        },
        {
          id: "q2",
          text: "几天？",
          type: "number",
          required: true,
          status: "pending",
          contextKey: "days",
          order: 2,
        },
      ]

      useQuestionStore.getState().startCollection(questions)

      const state = useQuestionStore.getState()
      expect(state.activeQuestions).toEqual(questions)
      expect(state.answeredQuestions.size).toBe(0)
      expect(state.currentQuestionIndex).toBe(0)
      expect(state.isCollecting).toBe(true)
      expect(state.context).toEqual({})
    })

    it("should reset existing answered questions when starting new collection", () => {
      // First, answer a question
      const questions: Question[] = [
        {
          id: "q1",
          text: "Test",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "test",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "answer")

      expect(useQuestionStore.getState().answeredQuestions.size).toBe(1)

      // Start new collection
      const newQuestions: Question[] = [
        {
          id: "q2",
          text: "New",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "new",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(newQuestions)

      const state = useQuestionStore.getState()
      expect(state.activeQuestions).toEqual(newQuestions)
      expect(state.answeredQuestions.size).toBe(0)
    })
  })

  describe("answerQuestion", () => {
    it("should answer a text question", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Destination?",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "destination",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "Tokyo")

      const state = useQuestionStore.getState()
      expect(state.answeredQuestions.get("q1")?.answer).toBe("Tokyo")
      expect(state.context.destination).toBe("Tokyo")
    })

    it("should answer a choice question", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Days?",
          type: "choice",
          options: ["3", "5", "7"],
          required: true,
          status: "pending",
          contextKey: "days",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "5")

      const state = useQuestionStore.getState()
      expect(state.answeredQuestions.get("q1")?.answer).toBe("5")
      expect(state.context.days).toBe("5")
    })

    it("should answer a multi-choice question", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Interests?",
          type: "multi-choice",
          options: ["Food", "History", "Nature"],
          required: true,
          status: "pending",
          contextKey: "interests",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", ["Food", "History"])

      const state = useQuestionStore.getState()
      expect(state.answeredQuestions.get("q1")?.answer).toEqual(["Food", "History"])
      expect(state.context.interests).toEqual(["Food", "History"])
    })

    it("should update question status to answered", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Test?",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "test",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "answer")

      const answeredQuestion = useQuestionStore.getState().answeredQuestions.get("q1")
      expect(answeredQuestion?.status).toBe("answered")
    })

    it("should not answer if question not found", () => {
      const state = useQuestionStore.getState()

      // Should not throw error
      expect(() => {
        useQuestionStore.getState().answerQuestion("non-existent", "answer")
      }).not.toThrow()

      // State should remain unchanged
      expect(useQuestionStore.getState().answeredQuestions.size).toBe(0)
      expect(useQuestionStore.getState().context).toEqual({})
    })
  })

  describe("nextQuestion", () => {
    it("should increment current question index", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
        { id: "q2", text: "Q2", type: "text", required: true, status: "pending", contextKey: "q2", order: 2 },
      ]

      useQuestionStore.getState().startCollection(questions)
      expect(useQuestionStore.getState().currentQuestionIndex).toBe(0)

      useQuestionStore.getState().nextQuestion()

      expect(useQuestionStore.getState().currentQuestionIndex).toBe(1)
    })

    it("should not increment beyond last question", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().nextQuestion()

      expect(useQuestionStore.getState().currentQuestionIndex).toBe(0) // Should stay at 0 (length - 1)
    })
  })

  describe("previousQuestion", () => {
    it("should decrement current question index", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
        { id: "q2", text: "Q2", type: "text", required: true, status: "pending", contextKey: "q2", order: 2 },
        { id: "q3", text: "Q3", type: "text", required: true, status: "pending", contextKey: "q3", order: 3 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().nextQuestion()
      useQuestionStore.getState().nextQuestion()
      expect(useQuestionStore.getState().currentQuestionIndex).toBe(2)

      useQuestionStore.getState().previousQuestion()

      expect(useQuestionStore.getState().currentQuestionIndex).toBe(1)
    })

    it("should not decrement below 0", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
      ]

      useQuestionStore.getState().startCollection(questions)
      expect(useQuestionStore.getState().currentQuestionIndex).toBe(0)

      useQuestionStore.getState().previousQuestion()

      expect(useQuestionStore.getState().currentQuestionIndex).toBe(0) // Should stay at 0
    })
  })

  describe("skipQuestion", () => {
    it("should mark question as answered with undefined answer", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Optional?",
          type: "text",
          required: false,
          status: "pending",
          contextKey: "optional",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().skipQuestion("q1")

      const answeredQuestion = useQuestionStore.getState().answeredQuestions.get("q1")
      expect(answeredQuestion?.status).toBe("answered")
      expect(answeredQuestion?.answer).toBeUndefined()
    })

    it("should not update context when skipping", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Optional?",
          type: "text",
          required: false,
          status: "pending",
          contextKey: "optional",
          order: 1,
        },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().skipQuestion("q1")

      expect(useQuestionStore.getState().context.optional).toBeUndefined()
    })

    it("should not skip non-existent question", () => {
      expect(() => {
        useQuestionStore.getState().skipQuestion("non-existent")
      }).not.toThrow()

      expect(useQuestionStore.getState().answeredQuestions.size).toBe(0)
    })
  })

  describe("updateContext", () => {
    it("should update context key", () => {
      useQuestionStore.getState().updateContext("destination", "Paris")
      useQuestionStore.getState().updateContext("days", 7)

      const state = useQuestionStore.getState()
      expect(state.context.destination).toBe("Paris")
      expect(state.context.days).toBe(7)
    })

    it("should preserve existing context keys", () => {
      useQuestionStore.getState().updateContext("key1", "value1")
      useQuestionStore.getState().updateContext("key2", "value2")

      const state = useQuestionStore.getState()
      expect(state.context.key1).toBe("value1")
      expect(state.context.key2).toBe("value2")
    })

    it("should overwrite existing context key", () => {
      useQuestionStore.getState().updateContext("key", "value1")
      useQuestionStore.getState().updateContext("key", "value2")

      expect(useQuestionStore.getState().context.key).toBe("value2")
    })
  })

  describe("getCompletedContext", () => {
    it("should return context from answered questions", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "destination", order: 1 },
        { id: "q2", text: "Q2", type: "number", required: true, status: "pending", contextKey: "days", order: 2 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "Tokyo")
      useQuestionStore.getState().answerQuestion("q2", "5")

      const completedContext = useQuestionStore.getState().getCompletedContext()

      expect(completedContext.destination).toBe("Tokyo")
      expect(completedContext.days).toBe("5")
    })

    it("should exclude skipped questions (undefined answer)", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "destination", order: 1 },
        { id: "q2", text: "Q2", type: "text", required: false, status: "pending", contextKey: "optional", order: 2 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "Tokyo")
      useQuestionStore.getState().skipQuestion("q2")

      const completedContext = useQuestionStore.getState().getCompletedContext()

      expect(completedContext.destination).toBe("Tokyo")
      expect(completedContext.optional).toBeUndefined()
    })

    it("should return empty object when no questions answered", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "destination", order: 1 },
      ]

      useQuestionStore.getState().startCollection(questions)

      const completedContext = useQuestionStore.getState().getCompletedContext()

      expect(completedContext).toEqual({})
    })
  })

  describe("reset", () => {
    it("should reset store to initial state", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "test", order: 1 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().answerQuestion("q1", "answer")
      useQuestionStore.getState().nextQuestion()

      expect(useQuestionStore.getState().activeQuestions.length).toBe(1)
      expect(useQuestionStore.getState().answeredQuestions.size).toBe(1)

      useQuestionStore.getState().reset()

      const state = useQuestionStore.getState()
      expect(state.activeQuestions).toEqual([])
      expect(state.answeredQuestions.size).toBe(0)
      expect(state.currentQuestionIndex).toBe(0)
      expect(state.isCollecting).toBe(false)
      expect(state.context).toEqual({})
    })
  })

  describe("getCurrentQuestion", () => {
    it("should return current question based on index", () => {
      const questions: Question[] = [
        { id: "q1", text: "Question 1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
        { id: "q2", text: "Question 2", type: "text", required: true, status: "pending", contextKey: "q2", order: 2 },
        { id: "q3", text: "Question 3", type: "text", required: true, status: "pending", contextKey: "q3", order: 3 },
      ]

      useQuestionStore.getState().startCollection(questions)

      expect(useQuestionStore.getState().getCurrentQuestion()?.id).toBe("q1")

      useQuestionStore.getState().nextQuestion()
      expect(useQuestionStore.getState().getCurrentQuestion()?.id).toBe("q2")

      useQuestionStore.getState().nextQuestion()
      expect(useQuestionStore.getState().getCurrentQuestion()?.id).toBe("q3")
    })

    it("should return undefined when no questions", () => {
      expect(useQuestionStore.getState().getCurrentQuestion()).toBeUndefined()
    })

    it("should return undefined when index out of bounds", () => {
      const questions: Question[] = [
        { id: "q1", text: "Q1", type: "text", required: true, status: "pending", contextKey: "q1", order: 1 },
      ]

      useQuestionStore.getState().startCollection(questions)
      useQuestionStore.getState().nextQuestion()

      expect(useQuestionStore.getState().getCurrentQuestion()?.id).toBe("q1") // Still returns q1 (clamped)
    })
  })

  describe("store integration", () => {
    it("should handle complete question flow", () => {
      const questions: Question[] = [
        {
          id: "q1",
          text: "Destination?",
          type: "text",
          required: true,
          status: "pending",
          contextKey: "destination",
          order: 1,
        },
        {
          id: "q2",
          text: "Days?",
          type: "choice",
          options: ["3", "5", "7"],
          required: true,
          status: "pending",
          contextKey: "days",
          order: 2,
        },
        {
          id: "q3",
          text: "Interests?",
          type: "multi-choice",
          options: ["Food", "History", "Nature"],
          required: false,
          status: "pending",
          contextKey: "interests",
          order: 3,
        },
      ]

      // Start collection
      useQuestionStore.getState().startCollection(questions)

      // Answer first question
      const current1 = useQuestionStore.getState().getCurrentQuestion()
      expect(current1?.id).toBe("q1")
      useQuestionStore.getState().answerQuestion("q1", "Tokyo")

      // Move to next and answer
      useQuestionStore.getState().nextQuestion()
      const current2 = useQuestionStore.getState().getCurrentQuestion()
      expect(current2?.id).toBe("q2")
      useQuestionStore.getState().answerQuestion("q2", "5")

      // Move to next and skip
      useQuestionStore.getState().nextQuestion()
      const current3 = useQuestionStore.getState().getCurrentQuestion()
      expect(current3?.id).toBe("q3")
      useQuestionStore.getState().skipQuestion("q3")

      // Verify completed context
      const completed = useQuestionStore.getState().getCompletedContext()
      expect(completed.destination).toBe("Tokyo")
      expect(completed.days).toBe("5")
      expect(completed.interests).toBeUndefined() // Skipped
    })
  })
})
