/**
 * Tests for contextValidator.ts
 * Testing the ContextValidator service (A2UI context validation)
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  ContextValidator,
  contextValidator,
  validateTripContext,
  type ValidationResult,
  type TripContext,
  type MissingInfo,
  type TripContextField,
} from "../contextValidator"
import type { UserPreferences } from "@/types"

describe("ContextValidator", () => {
  let validator: ContextValidator

  beforeEach(() => {
    validator = new ContextValidator()
  })

  describe("Constructor", () => {
    it("should use default options when none provided", () => {
      const defaultValidator = new ContextValidator()
      const result = defaultValidator.validate({})

      expect(result).toBeDefined()
    })

    it("should respect custom options", () => {
      const customValidator = new ContextValidator({
        preferencesRequired: true,
        budgetRequired: true,
        minDays: 3,
        maxDays: 14,
      })
      const result = customValidator.validate({
        destination: "东京",
        days: 5,
      })

      expect(result.missingInfo).toHaveLength(3) // budget, startDate, preferences
    })

    it("should use defaultDays from options", () => {
      const validator = new ContextValidator({ defaultDays: 7 })
      const context = validator.getDefaultContext("东京")

      expect(context.days).toBe(7)
    })
  })

  describe("validateFromMessage", () => {
    it("should extract trip info from message", () => {
      const result = validator.validateFromMessage("东京5天")

      expect(result.context.destination).toBe("东京")
      expect(result.context.days).toBe(5)
    })

    it("should merge with existing context", () => {
      const result = validator.validateFromMessage(
        "5天",
        { destination: "东京" }
      )

      expect(result.context.destination).toBe("东京")
      expect(result.context.days).toBe(5)
    })

    it("should merge user preferences", () => {
      const preferences: UserPreferences = {
        interests: ["美食"],
        accommodationType: ["luxury"],
        transportationPreference: ["taxi"],
        dietaryRestrictions: ["素食"],
        accessibilityNeeds: [],
      }
      const result = validator.validateFromMessage(
        "东京旅游",
        undefined,
        preferences
      )

      expect(result.context.preferences).toEqual(["美食"])
    })

    it("should merge budget from preferences", () => {
      const preferences: UserPreferences = {
        interests: [],
        accommodationType: [],
        transportationPreference: [],
        dietaryRestrictions: [],
        accessibilityNeeds: [],
        budget: { min: 5000, max: 10000, currency: "CNY" },
      }
      const result = validator.validateFromMessage(
        "东京旅游",
        undefined,
        preferences
      )

      expect(result.context.budget).toEqual({ min: 5000, max: 10000, currency: "CNY" })
    })
  })

  describe("validate - destination", () => {
    it("should mark destination as missing when not provided", () => {
      const result = validator.validate({})

      expect(result.isComplete).toBe(false)
      const destMissing = result.missingInfo.find(m => m.field === "destination")
      expect(destMissing).toBeDefined()
      expect(destMissing?.priority).toBe("required")
    })

    it("should accept valid destination", () => {
      const result = validator.validate({ destination: "东京" })

      const destMissing = result.missingInfo.find(m => m.field === "destination")
      expect(destMissing).toBeUndefined()
    })

    it("should reject empty destination", () => {
      const result = validator.validate({ destination: "   " })

      const destMissing = result.missingInfo.find(m => m.field === "destination")
      expect(destMissing).toBeDefined()
    })

    it("should reject null destination", () => {
      const result = validator.validate({ destination: null as any })

      const destMissing = result.missingInfo.find(m => m.field === "destination")
      expect(destMissing).toBeDefined()
    })

    it("should provide quick replies for destination", () => {
      const result = validator.validate({})

      const destMissing = result.missingInfo.find(m => m.field === "destination")
      expect(destMissing?.quickReplies).toEqual([
        "东京",
        "巴黎",
        "纽约",
        "上海",
        "北京",
        "新加坡",
      ])
    })
  })

  describe("validate - days", () => {
    it("should mark days as missing when not provided", () => {
      const result = validator.validate({ destination: "东京" })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeDefined()
      expect(daysMissing?.priority).toBe("required")
    })

    it("should accept valid days within range", () => {
      const result = validator.validate({ destination: "东京", days: 5 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeUndefined()
    })

    it("should accept days at min boundary", () => {
      const validator = new ContextValidator({ minDays: 3 })
      const result = validator.validate({ destination: "东京", days: 3 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeUndefined()
    })

    it("should accept days at max boundary", () => {
      const validator = new ContextValidator({ maxDays: 14 })
      const result = validator.validate({ destination: "东京", days: 14 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeUndefined()
    })

    it("should reject days below minimum", () => {
      const validator = new ContextValidator({ minDays: 3 })
      const result = validator.validate({ destination: "东京", days: 2 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeDefined()
    })

    it("should reject days above maximum", () => {
      const validator = new ContextValidator({ maxDays: 14 })
      const result = validator.validate({ destination: "东京", days: 15 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeDefined()
    })

    it("should reject zero days", () => {
      const result = validator.validate({ destination: "东京", days: 0 })

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeDefined()
    })

    it("should provide quick replies for days", () => {
      const result = validator.validate({})

      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing?.quickReplies).toEqual(["3天", "5天", "7天", "10天"])
    })
  })

  describe("validate - startDate", () => {
    it("should mark startDate as recommended when not required", () => {
      const result = validator.validate({ destination: "东京", days: 5 })

      const dateMissing = result.missingInfo.find(m => m.field === "startDate")
      expect(dateMissing).toBeDefined()
      expect(dateMissing?.priority).toBe("recommended")
    })

    it("should mark startDate as required when option is set", () => {
      const validator = new ContextValidator({ startDateRequired: true })
      const result = validator.validate({ destination: "东京", days: 5 })

      const dateMissing = result.missingInfo.find(m => m.field === "startDate")
      expect(dateMissing).toBeDefined()
      expect(dateMissing?.priority).toBe("required")
    })

    it("should accept valid startDate", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        startDate: new Date("2025-06-15"),
      })

      const dateMissing = result.missingInfo.find(m => m.field === "startDate")
      expect(dateMissing).toBeUndefined()
    })

    it("should provide quick replies for startDate", () => {
      const result = validator.validate({})

      const dateMissing = result.missingInfo.find(m => m.field === "startDate")
      expect(dateMissing?.quickReplies).toEqual(["明天", "下周", "下个月", "暂不确定"])
    })
  })

  describe("validate - budget", () => {
    it("should mark budget as recommended when not required", () => {
      const result = validator.validate({ destination: "东京", days: 5 })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
      expect(budgetMissing?.priority).toBe("recommended")
    })

    it("should mark budget as required when option is set", () => {
      const validator = new ContextValidator({ budgetRequired: true })
      const result = validator.validate({ destination: "东京", days: 5 })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
      expect(budgetMissing?.priority).toBe("required")
    })

    it("should accept valid budget with all properties", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        budget: { min: 5000, max: 10000, currency: "CNY" },
      })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeUndefined()
    })

    it("should reject budget with missing min", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        budget: { min: undefined as any, max: 10000, currency: "CNY" },
      })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
    })

    it("should reject budget with missing max", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        budget: { min: 5000, max: undefined as any, currency: "CNY" },
      })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
    })

    it("should reject budget where max <= min", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        budget: { min: 10000, max: 5000, currency: "CNY" },
      })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
    })

    it("should reject budget with empty currency", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        budget: { min: 5000, max: 10000, currency: "   " },
      })

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing).toBeDefined()
    })

    it("should provide quick replies for budget", () => {
      const result = validator.validate({})

      const budgetMissing = result.missingInfo.find(m => m.field === "budget")
      expect(budgetMissing?.quickReplies).toEqual([
        "经济型（<5000元）",
        "舒适型（5000-15000元）",
        "豪华型（>15000元）",
      ])
    })
  })

  describe("validate - preferences", () => {
    it("should mark preferences as recommended when not required", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        preferences: [],
      })

      const prefsMissing = result.missingInfo.find(m => m.field === "preferences")
      expect(prefsMissing).toBeDefined()
      expect(prefsMissing?.priority).toBe("recommended")
    })

    it("should mark preferences as required when option is set", () => {
      const validator = new ContextValidator({ preferencesRequired: true })
      const result = validator.validate({
        destination: "东京",
        days: 5,
        preferences: [],
      })

      const prefsMissing = result.missingInfo.find(m => m.field === "preferences")
      expect(prefsMissing).toBeDefined()
      expect(prefsMissing?.priority).toBe("required")
    })

    it("should accept non-empty preferences", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
        preferences: ["美食"],
      })

      const prefsMissing = result.missingInfo.find(m => m.field === "preferences")
      expect(prefsMissing).toBeUndefined()
    })

    it("should provide quick replies for preferences", () => {
      const result = validator.validate({})

      const prefsMissing = result.missingInfo.find(m => m.field === "preferences")
      expect(prefsMissing?.quickReplies).toEqual([
        "历史文化",
        "自然风光",
        "美食体验",
        "购物娱乐",
        "艺术博物馆",
        "户外运动",
      ])
    })
  })

  describe("validate - isComplete calculation", () => {
    it("should be complete when all required fields present", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
      })

      expect(result.isComplete).toBe(true)
    })

    it("should not be complete when destination missing", () => {
      const result = validator.validate({ days: 5 })

      expect(result.isComplete).toBe(false)
    })

    it("should not be complete when days missing", () => {
      const result = validator.validate({ destination: "东京" })

      expect(result.isComplete).toBe(false)
    })

    it("should be complete with only required fields (optional missing)", () => {
      const result = validator.validate({
        destination: "东京",
        days: 5,
      })

      // No budget, startDate, or preferences
      expect(result.isComplete).toBe(true)
    })
  })

  describe("validate - missing info sorting", () => {
    it("should sort required fields before recommended", () => {
      const result = validator.validate({})

      const requiredIndices = result.missingInfo
        .map((m, i) => (m.priority === "required" ? i : -1))
        .filter(i => i >= 0)

      const recommendedIndices = result.missingInfo
        .map((m, i) => (m.priority === "recommended" ? i : -1))
        .filter(i => i >= 0)

      // All required indices should come before any recommended index
      if (requiredIndices.length > 0 && recommendedIndices.length > 0) {
        const lastRequired = Math.max(...requiredIndices)
        const firstRecommended = Math.min(...recommendedIndices)
        expect(lastRequired).toBeLessThan(firstRecommended)
      }
    })
  })

  describe("getDefaultContext", () => {
    it("should create context with destination and default days", () => {
      const context = validator.getDefaultContext("东京")

      expect(context.destination).toBe("东京")
      expect(context.days).toBe(5) // default
      expect(context.preferences).toEqual([])
    })

    it("should use custom default days from options", () => {
      const customValidator = new ContextValidator({ defaultDays: 10 })
      const context = customValidator.getDefaultContext("巴黎")

      expect(context.destination).toBe("巴黎")
      expect(context.days).toBe(10)
    })
  })

  describe("canStartPlanning", () => {
    it("should return true when all required fields present", () => {
      const result: ValidationResult = {
        isComplete: true,
        missingInfo: [],
        context: { destination: "东京", days: 5, preferences: [] },
      }

      expect(validator.canStartPlanning(result)).toBe(true)
    })

    it("should return false when required fields missing", () => {
      const result: ValidationResult = {
        isComplete: false,
        missingInfo: [
          { field: "destination", priority: "required", question: "" },
          { field: "days", priority: "required", question: "" },
        ],
        context: {},
      }

      expect(validator.canStartPlanning(result)).toBe(false)
    })

    it("should return true when only recommended fields missing", () => {
      const result: ValidationResult = {
        isComplete: false,
        missingInfo: [
          { field: "budget", priority: "recommended", question: "" },
          { field: "startDate", priority: "recommended", question: "" },
        ],
        context: { destination: "东京", days: 5, preferences: [] },
      }

      expect(validator.canStartPlanning(result)).toBe(true)
    })
  })

  describe("Singleton instance", () => {
    it("should export default contextValidator", () => {
      expect(contextValidator).toBeInstanceOf(ContextValidator)
    })

    it("should use default options", () => {
      const result = contextValidator.validate({})

      expect(result).toBeDefined()
    })
  })

  describe("validateTripContext convenience function", () => {
    it("should validate context from message", () => {
      const result = validateTripContext("东京5天")

      expect(result.context.destination).toBe("东京")
      expect(result.context.days).toBe(5)
    })

    it("should use custom options when provided", () => {
      const result = validateTripContext(
        "东京5天",
        undefined,
        undefined,
        { minDays: 3, maxDays: 10 }
      )

      // With minDays=3, days=5 should be valid
      const daysMissing = result.missingInfo.find(m => m.field === "days")
      expect(daysMissing).toBeUndefined()
    })
  })
})

describe("TripContextField Type", () => {
  it("should support all context fields", () => {
    const fields: TripContextField[] = [
      "destination",
      "days",
      "budget",
      "startDate",
      "preferences",
    ]

    fields.forEach(field => {
      expect(field).toBeDefined()
    })
  })
})
