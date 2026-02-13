/**
 * Tests for questionGenerator.ts
 * Testing the QuestionGenerator service (A2UI question generation)
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  QuestionGenerator,
  generateQuestions,
  type Question,
  type QuestionSequence,
  type QuestionType,
} from "../questionGenerator"
import type { MissingInfo } from "../contextValidator"

describe("QuestionGenerator", () => {
  let generator: QuestionGenerator

  beforeEach(() => {
    generator = new QuestionGenerator({ language: "zh-CN" })
  })

  describe("Constructor", () => {
    it("should use default options when none provided", () => {
      const defaultGenerator = new QuestionGenerator()
      const sequence = defaultGenerator.generateFromMissingInfo([])

      expect(sequence.questions).toEqual([])
      expect(sequence.isComplete).toBe(true)
    })

    it("should use Chinese templates by default", () => {
      const zhGenerator = new QuestionGenerator({ language: "zh-CN" })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]
      const sequence = zhGenerator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].text).toContain("请问您")
    })

    it("should use English templates when specified", () => {
      const enGenerator = new QuestionGenerator({ language: "en-US" })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]
      const sequence = enGenerator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].text).toContain("Where would you like")
    })

    it("should respect includeQuickReplies option", () => {
      const withReplies = new QuestionGenerator({
        includeQuickReplies: true,
        language: "zh-CN",
      })
      const withoutReplies = new QuestionGenerator({
        includeQuickReplies: false,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]

      const withResult = withReplies.generateFromMissingInfo(missingInfo)
      const withoutResult = withoutReplies.generateFromMissingInfo(missingInfo)

      expect(withResult.questions[0].quickReplies).toBeDefined()
      expect(withoutResult.questions[0].quickReplies).toBeUndefined()
    })

    it("should respect maxQuestions option", () => {
      const generator = new QuestionGenerator({ maxQuestions: 2, language: "zh-CN" })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions).toHaveLength(2)
    })

    it("should respect mergeRelated option", () => {
      const mergeGenerator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const noMergeGenerator = new QuestionGenerator({
        mergeRelated: false,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const mergeResult = mergeGenerator.generateFromMissingInfo(missingInfo)
      const noMergeResult = noMergeGenerator.generateFromMissingInfo(missingInfo)

      expect(mergeResult.questions.length).toBeLessThan(noMergeResult.questions.length)
    })
  })

  describe("generateFromMissingInfo", () => {
    it("should return complete sequence when no missing info", () => {
      const sequence = generator.generateFromMissingInfo([])

      expect(sequence.questions).toEqual([])
      expect(sequence.currentIndex).toBe(0)
      expect(sequence.isComplete).toBe(true)
    })

    it("should generate question for destination", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions).toHaveLength(1)
      expect(sequence.questions[0].field).toBe("destination")
      expect(sequence.questions[0].type).toBe("choice")
      expect(sequence.questions[0].required).toBe(true)
      expect(sequence.questions[0].priority).toBe("required")
      expect(sequence.questions[0].text).toBe("请问您想去哪里旅游？")
    })

    it("should generate question for days", () => {
      const missingInfo: MissingInfo[] = [
        { field: "days", priority: "required", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].field).toBe("days")
      expect(sequence.questions[0].type).toBe("choice")
      expect(sequence.questions[0].text).toBe("您计划旅行多少天？")
    })

    it("should generate question for budget", () => {
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].field).toBe("budget")
      expect(sequence.questions[0].type).toBe("choice")
      expect(sequence.questions[0].required).toBe(false)
      expect(sequence.questions[0].priority).toBe("recommended")
    })

    it("should generate question for startDate", () => {
      const missingInfo: MissingInfo[] = [
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].field).toBe("startDate")
      expect(sequence.questions[0].type).toBe("date")
    })

    it("should generate question for preferences", () => {
      const missingInfo: MissingInfo[] = [
        { field: "preferences", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].field).toBe("preferences")
      expect(sequence.questions[0].type).toBe("multi-choice")
    })

    it("should include quick replies for destination", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].quickReplies).toEqual([
        "东京",
        "巴黎",
        "纽约",
        "上海",
        "北京",
        "新加坡",
        "曼谷",
        "迪拜",
      ])
    })

    it("should include quick replies for days", () => {
      const missingInfo: MissingInfo[] = [
        { field: "days", priority: "required", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].quickReplies).toEqual([
        "3天",
        "5天",
        "7天",
        "10天",
        "14天",
      ])
    })

    it("should include quick replies for budget", () => {
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].quickReplies).toEqual([
        "经济型（<5000元）",
        "舒适型（5000-15000元）",
        "豪华型（>15000元）",
      ])
    })

    it("should use custom quick replies when provided", () => {
      const customReplies = ["选项A", "选项B", "选项C"]
      const missingInfo: MissingInfo[] = [
        {
          field: "destination",
          priority: "required",
          question: "自定义问题",
          quickReplies: customReplies,
        },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].quickReplies).toEqual(customReplies)
      expect(sequence.questions[0].text).toBe("自定义问题")
    })

    it("should preserve order from missing info (when merge is disabled)", () => {
      const noMergeGenerator = new QuestionGenerator({
        mergeRelated: false,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
        { field: "budget", priority: "recommended", question: "" },
      ]

      const sequence = noMergeGenerator.generateFromMissingInfo(missingInfo)

      // QuestionGenerator preserves the order from missingInfo when merge is disabled
      expect(sequence.questions).toHaveLength(3)
      expect(sequence.questions[0].field).toBe("destination")
      expect(sequence.questions[1].field).toBe("days")
      expect(sequence.questions[2].field).toBe("budget")
    })

    it("should create unique question IDs", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].id).not.toBe(sequence.questions[1].id)
    })

    it("should limit questions to maxQuestions", () => {
      const generator = new QuestionGenerator({ maxQuestions: 2, language: "zh-CN" })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
        { field: "budget", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions).toHaveLength(2)
    })
  })

  describe("Question Merging", () => {
    it("should merge budget and startDate questions", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      // Should be merged into one question
      expect(sequence.questions.length).toBe(1)
      expect(sequence.questions[0].field).toBe("budget,startDate")
    })

    it("should merge days and startDate questions", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "days", priority: "required", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions.length).toBe(1)
      expect(sequence.questions[0].field).toBe("days,startDate")
    })

    it("should create merged question with Chinese text", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].text).toContain("预算")
      expect(sequence.questions[0].text).toContain("出发日期")
    })

    it("should create merged question with English text", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "en-US",
      })
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].text).toContain("budget")
      expect(sequence.questions[0].text).toContain("start date")
    })

    it("should not merge non-mergeable fields", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "preferences", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      // Should remain separate
      expect(sequence.questions.length).toBe(2)
      expect(sequence.questions[0].field).toBe("destination")
      expect(sequence.questions[1].field).toBe("preferences")
    })

    it("should set required priority when either question is required", () => {
      const generator = new QuestionGenerator({
        mergeRelated: true,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "days", priority: "required", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions[0].priority).toBe("required")
    })

    it("should not merge when mergeRelated is false", () => {
      const generator = new QuestionGenerator({
        mergeRelated: false,
        language: "zh-CN",
      })
      const missingInfo: MissingInfo[] = [
        { field: "budget", priority: "recommended", question: "" },
        { field: "startDate", priority: "recommended", question: "" },
      ]

      const sequence = generator.generateFromMissingInfo(missingInfo)

      expect(sequence.questions.length).toBe(2)
    })
  })

  describe("getNextQuestion", () => {
    it("should return first question when at start", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
      ]
      const sequence = generator.generateFromMissingInfo(missingInfo)

      const nextQuestion = generator.getNextQuestion(sequence)

      expect(nextQuestion).toEqual(sequence.questions[0])
    })

    it("should return next question when advanced", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
      ]
      let sequence = generator.generateFromMissingInfo(missingInfo)
      sequence = generator.advanceToNext(sequence)

      const nextQuestion = generator.getNextQuestion(sequence)

      expect(nextQuestion).toEqual(sequence.questions[1])
    })

    it("should return null when all questions answered", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]
      let sequence = generator.generateFromMissingInfo(missingInfo)
      sequence = generator.advanceToNext(sequence)

      const nextQuestion = generator.getNextQuestion(sequence)

      expect(nextQuestion).toBeNull()
    })

    it("should return null when no questions", () => {
      const sequence = generator.generateFromMissingInfo([])

      const nextQuestion = generator.getNextQuestion(sequence)

      expect(nextQuestion).toBeNull()
    })
  })

  describe("advanceToNext", () => {
    it("should increment currentIndex", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
      ]
      const originalSequence = generator.generateFromMissingInfo(missingInfo)

      const advancedSequence = generator.advanceToNext(originalSequence)

      expect(advancedSequence.currentIndex).toBe(originalSequence.currentIndex + 1)
    })

    it("should set isComplete to true when at end", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]
      let sequence = generator.generateFromMissingInfo(missingInfo)
      sequence = generator.advanceToNext(sequence)

      expect(sequence.isComplete).toBe(true)
    })

    it("should keep isComplete false when questions remain", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
        { field: "days", priority: "required", question: "" },
      ]
      let sequence = generator.generateFromMissingInfo(missingInfo)
      sequence = generator.advanceToNext(sequence)

      expect(sequence.isComplete).toBe(false)
    })

    it("should not modify original sequence", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]
      const originalSequence = generator.generateFromMissingInfo(missingInfo)
      const originalIndex = originalSequence.currentIndex

      generator.advanceToNext(originalSequence)

      expect(originalSequence.currentIndex).toBe(originalIndex)
    })
  })

  describe("parseAnswer", () => {
    const createQuestion = (field: string): Question => ({
      id: "q-test",
      text: "Test question",
      field,
      type: "text",
      required: true,
      priority: "required",
    })

    it("should parse destination answer", () => {
      const question = createQuestion("destination")
      const answer = "东京"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.destination).toBe("东京")
    })

    it("should trim destination answer", () => {
      const question = createQuestion("destination")
      const answer = "  东京  "

      const result = generator.parseAnswer(question, answer, {})

      expect(result.destination).toBe("东京")
    })

    it("should parse days answer as number", () => {
      const question = createQuestion("days")
      const answer = "5天"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.days).toBe(5)
    })

    it("should extract first number from days answer", () => {
      const question = createQuestion("days")
      const answer = "我想去大概7-10天"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.days).toBe(7)
    })

    it("should default to 5 when no number in days answer", () => {
      const question = createQuestion("days")
      const answer = "大概几天吧"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.days).toBe(5)
    })

    it("should parse budget answer with CNY", () => {
      const question = createQuestion("budget")
      const answer = "5000-10000元"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget).toEqual({
        min: 5000,
        max: 10000,
        currency: "CNY",
      })
    })

    it("should parse budget answer with USD", () => {
      const question = createQuestion("budget")
      const answer = "$1000-$2000"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget).toEqual({
        min: 1000,
        max: 2000,
        currency: "USD",
      })
    })

    it("should parse single number budget as range with +/- 20%", () => {
      const question = createQuestion("budget")
      const answer = "10000元"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget?.min).toBe(8000)
      expect(result.budget?.max).toBe(12000)
    })

    it("should parse budget with 'less than' indicator", () => {
      const question = createQuestion("budget")
      const answer = "5000元以下"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget).toEqual({
        min: 0,
        max: 5000,
        currency: "CNY",
      })
    })

    it("should parse budget with 'more than' indicator", () => {
      const question = createQuestion("budget")
      const answer = "10000元以上"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget?.min).toBe(10000)
      expect(result.budget?.max).toBe(20000)
    })

    it("should return undefined for invalid budget", () => {
      const question = createQuestion("budget")
      const answer = "大概合适的价格"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.budget).toBeUndefined()
    })

    it("should parse 'tomorrow' date", () => {
      const question = createQuestion("startDate")
      const answer = "明天"

      const result = generator.parseAnswer(question, answer, {})
      const expectedDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

      expect(result.startDate).toBeInstanceOf(Date)
      if (result.startDate) {
        const diff = Math.abs(result.startDate.getTime() - expectedDate.getTime())
        expect(diff).toBeLessThan(1000) // Within 1 second
      }
    })

    it("should parse 'next week' date", () => {
      const question = createQuestion("startDate")
      const answer = "下周"

      const result = generator.parseAnswer(question, answer, {})
      const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      expect(result.startDate).toBeInstanceOf(Date)
      if (result.startDate) {
        const diff = Math.abs(result.startDate.getTime() - expectedDate.getTime())
        expect(diff).toBeLessThan(1000)
      }
    })

    it("should parse 'not sure' date as undefined", () => {
      const question = createQuestion("startDate")
      const answer = "暂不确定"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.startDate).toBeUndefined()
    })

    it("should parse standard date format", () => {
      const question = createQuestion("startDate")
      const answer = "2025-06-15"

      const result = generator.parseAnswer(question, answer, {})

      expect(result.startDate).toBeInstanceOf(Date)
      expect(result.startDate?.toISOString().startsWith("2025-06-15")).toBe(true)
    })

    it("should parse preferences with Chinese comma", () => {
      const question = createQuestion("preferences")
      const answer = "历史文化、美食体验"
      const existingPrefs = ["观光"]

      const result = generator.parseAnswer(question, answer, { preferences: existingPrefs })

      expect(result.preferences).toEqual(["观光", "历史文化", "美食体验"])
    })

    it("should parse preferences with English comma", () => {
      const generator = new QuestionGenerator({ language: "en-US" })
      const question = createQuestion("preferences")
      const answer = "History, Food, Art"
      const existingPrefs = ["Sightseeing"]

      const result = generator.parseAnswer(question, answer, { preferences: existingPrefs })

      expect(result.preferences).toEqual(["Sightseeing", "History", "Food", "Art"])
    })

    it("should deduplicate preferences", () => {
      const question = createQuestion("preferences")
      const answer = "历史文化、美食、历史文化"
      const existingPrefs = ["美食"]

      const result = generator.parseAnswer(question, answer, { preferences: existingPrefs })

      const uniquePrefs = result.preferences as string[]
      expect(uniquePrefs).toContain("历史文化")
      expect(uniquePrefs.filter((p) => p === "历史文化").length).toBe(1)
    })

    it("should trim whitespace from preferences", () => {
      const question = createQuestion("preferences")
      const answer = "  历史文化 、 美食体验  "

      const result = generator.parseAnswer(question, answer, {})

      expect(result.preferences).toEqual(["历史文化", "美食体验"])
    })

    it("should parse merged field answer", () => {
      const question = createQuestion("days,startDate")
      const answer = "5天"
      const existingContext = { destination: "东京" }

      const result = generator.parseAnswer(question, answer, existingContext)

      // The answer "5天" contains days information
      expect(result.days).toBeDefined()
      expect(result.days).toBe(5)
      // startDate won't be set from "5天" as it has no date info
      expect(result.destination).toBe("东京")
    })

    it("should preserve existing context", () => {
      const question = createQuestion("destination")
      const answer = "东京"
      const existingContext = { days: 5, budget: { min: 5000, max: 10000, currency: "CNY" } }

      const result = generator.parseAnswer(question, answer, existingContext)

      expect(result.days).toBe(5)
      expect(result.budget).toEqual({ min: 5000, max: 10000, currency: "CNY" })
    })
  })

  describe("generateFollowUpQuestion", () => {
    it("should return null (no follow-up implemented)", () => {
      const question = generator.generateFollowUpQuestion(
        "东京",
        "destination",
        {}
      )

      expect(question).toBeNull()
    })
  })

  describe("convenience function", () => {
    it("should generate questions using singleton generator", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]

      const sequence = generateQuestions(missingInfo)

      expect(sequence.questions).toHaveLength(1)
    })

    it("should use custom options when provided", () => {
      const missingInfo: MissingInfo[] = [
        { field: "destination", priority: "required", question: "" },
      ]

      const sequence = generateQuestions(missingInfo, { language: "en-US" })

      expect(sequence.questions[0].text).toContain("Where")
    })
  })
})

describe("Question Types", () => {
  it("should support all question types", () => {
    const types: QuestionType[] = ["text", "choice", "date", "number", "multi-choice"]

    types.forEach(type => {
      expect(type).toBeDefined()
    })
  })
})
