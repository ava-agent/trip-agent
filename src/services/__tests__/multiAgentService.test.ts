/**
 * Tests for multiAgentService.ts
 * Testing the Multi-Agent orchestration system (public API only)
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  MultiAgentService,
  isLLMAvailable,
  setLLMEnabled,
  getLLMProvider,
  getLLMProviderName,
  type AgentMessage,
  type AgentContext,
  type AgentRole,
} from "../multiAgentService"
import { LLMService } from "../llmService"

// Mock dependencies
vi.mock("../llmService", () => ({
  LLMService: {
    isConfigured: vi.fn(() => false),
    chatCompletion: vi.fn(),
    getConfig: vi.fn(() => null),
  },
  PROMPTS: {
    SUPERVISOR: "You are a supervisor",
    PLANNER: "You are a planner",
    TRIP_PLANNING_TEMPLATE: vi.fn((dest: string, prefs: any) => `${dest} ${JSON.stringify(prefs)}`),
  },
  initializeLLMFromEnv: vi.fn(() => true),
  LLMAPIError: class extends Error {
    code = "API_ERROR"
  },
}))

vi.mock("../externalApiService", () => ({
  externalApiService: {
    getWeather: vi.fn(),
    searchHotels: vi.fn(),
    searchPlaces: vi.fn(),
  },
}))

vi.mock("@/stores/agentProgressStore", () => ({
  useAgentProgressStore: {
    getState: vi.fn(() => ({
      startSession: vi.fn(),
      startPhase: vi.fn(),
      addToolCall: vi.fn(() => "tool-id-1"),
      updateToolCall: vi.fn(),
      completeToolCall: vi.fn(),
      failToolCall: vi.fn(),
      completePhase: vi.fn(),
      completeSession: vi.fn(),
    })),
  },
}))

describe("MultiAgentService Utility Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset LLM enabled state
    setLLMEnabled(false)
  })

  describe("isLLMAvailable", () => {
    it("should return false when LLM is not configured", () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(false)
      expect(isLLMAvailable()).toBe(false)
    })

    it("should return true when LLM is configured", () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      setLLMEnabled(true)
      expect(isLLMAvailable()).toBe(true)
    })

    it("should return false when LLM is disabled even if configured", () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      setLLMEnabled(false)
      expect(isLLMAvailable()).toBe(false)
    })
  })

  describe("setLLMEnabled", () => {
    it("should enable LLM when set to true", () => {
      setLLMEnabled(true)
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      expect(isLLMAvailable()).toBe(true)
    })

    it("should disable LLM when set to false", () => {
      setLLMEnabled(true)
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      expect(isLLMAvailable()).toBe(true)

      setLLMEnabled(false)
      expect(isLLMAvailable()).toBe(false)
    })
  })

  describe("getLLMProvider", () => {
    it("should return null when config is null", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue(null)
      expect(getLLMProvider()).toBe(null)
    })

    it("should return provider when config has provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue({ provider: "glm" as const, apiKey: "" } as any)
      expect(getLLMProvider()).toBe("glm")
    })

    it("should return anthropic provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue({ provider: "anthropic" as const, apiKey: "" } as any)
      expect(getLLMProvider()).toBe("anthropic")
    })
  })

  describe("getLLMProviderName", () => {
    it("should return correct name for glm provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue({ provider: "glm" as const, apiKey: "" } as any)
      expect(getLLMProviderName()).toBe("智谱 GLM")
    })

    it("should return correct name for openai provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue({ provider: "openai" as const, apiKey: "" } as any)
      expect(getLLMProviderName()).toBe("OpenAI")
    })

    it("should return correct name for anthropic provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue({ provider: "anthropic" as const, apiKey: "" } as any)
      expect(getLLMProviderName()).toBe("Anthropic Claude")
    })

    it("should return '未配置' when no provider", () => {
      vi.mocked(LLMService.getConfig).mockReturnValue(null)
      expect(getLLMProviderName()).toBe("未配置")
    })
  })
})

describe("MultiAgentService Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLLMEnabled(false)
  })

  const createMockContext = (message: string): AgentContext => ({
    userMessage: message,
    conversationHistory: [],
    userPreferences: {
      interests: ["观光"],
      accommodationType: ["mid-range"],
      transportationPreference: ["public"],
      dietaryRestrictions: [],
      accessibilityNeeds: [],
    },
  })

  describe("processWithAgents", () => {
    it("should yield need_more_info when context is incomplete", async () => {
      const context = createMockContext("我想旅游") // No destination or days

      const generator = MultiAgentService.processWithAgents(context)
      const firstResult = await generator.next()

      expect(firstResult.value).toHaveProperty("type", "need_more_info")
      expect(firstResult.value).toHaveProperty("questions")
      expect(firstResult.value).toHaveProperty("extractedContext")
    })

    it("should yield need_more_info when only destination provided", async () => {
      const context = createMockContext("东京旅游") // No days

      const generator = MultiAgentService.processWithAgents(context)
      const firstResult = await generator.next()

      expect(firstResult.value).toHaveProperty("type", "need_more_info")
      // Check that questions include days (may be combined with other fields)
      const questions = firstResult.value.questions as any[]
      const hasDaysQuestion = questions.some((q: any) => q.field === "days" || q.field === "days,startDate")
      expect(hasDaysQuestion).toBe(true)
    })

    it("should yield need_more_info when only days provided", async () => {
      const context = createMockContext("5天") // No destination

      const generator = MultiAgentService.processWithAgents(context)
      const firstResult = await generator.next()

      expect(firstResult.value).toHaveProperty("type", "need_more_info")
      const questions = firstResult.value.questions as any[]
      const hasDestinationQuestion = questions.some((q: any) => q.field === "destination" || q.field === "destination,startDate")
      expect(hasDestinationQuestion).toBe(true)
    })

    it("should throw error when LLM is not available and context is complete", async () => {
      const context = createMockContext("东京5天旅游")
      const existingContext = { destination: "东京", days: 5 }

      const generator = MultiAgentService.processWithAgents(context, existingContext)

      // The generator should yield an error since LLM is not available
      try {
        for await (const result of generator) {
          if ((result as any).message?.type === "error") {
            // Expected to get an error message
            return
          }
        }
        // If we didn't get an error, the test should fail
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error.message).toContain("LLM")
      }
    })
  })

  describe("generateTripFromContext", () => {
    beforeEach(() => {
      setLLMEnabled(true)
    })

    it("should throw error when LLM is not available", async () => {
      setLLMEnabled(false)
      vi.mocked(LLMService.isConfigured).mockReturnValue(false)
      const context = createMockContext("东京旅游")

      await expect(MultiAgentService.generateTripFromContext(context)).rejects.toThrow("LLM服务未配置")
    })

    it("should generate trip with LLM", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [
              {
                type: "attraction",
                name: "浅草寺",
                description: "东京最古老的寺庙",
                locationName: "台东区",
                address: "东京都台东区浅草",
                startTime: "09:00",
                endTime: "12:00",
                duration: 180,
                cost: 0,
              },
            ],
            notes: "穿着舒适的鞋子",
          },
        ])
      )

      const context = createMockContext("东京5天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip).toBeDefined()
      expect(trip.destination.name).toBe("东京")
      expect(trip.duration.days).toBe(5)
      expect(trip.itinerary).toBeDefined()
      expect(trip.itinerary.length).toBeGreaterThan(0)
      expect(trip.itinerary[0].activities.length).toBe(1)
      expect(trip.itinerary[0].activities[0].name).toBe("浅草寺")
    })

    it("should include user preferences in trip", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [],
            notes: "",
          },
        ])
      )

      const context: AgentContext = {
        userMessage: "大阪旅游",
        conversationHistory: [],
        userPreferences: {
          interests: ["美食", "历史"],
          accommodationType: ["luxury"],
          transportationPreference: ["taxi"],
          dietaryRestrictions: ["素食"],
          accessibilityNeeds: ["wheelchair"],
        },
      }

      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.preferences.interests).toEqual(["美食", "历史"])
      expect(trip.preferences.accommodationType).toEqual(["luxury"])
      expect(trip.preferences.dietaryRestrictions).toEqual(["素食"])
      expect(trip.preferences.accessibilityNeeds).toEqual(["wheelchair"])
    })

    it("should use default preferences when not provided", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [],
            notes: "",
          },
        ])
      )

      const context: AgentContext = {
        userMessage: "名古屋旅游",
        conversationHistory: [],
      }

      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.preferences.interests).toEqual(["观光", "美食", "文化"])
      expect(trip.preferences.accommodationType).toEqual(["mid-range"])
      expect(trip.preferences.transportationPreference).toEqual(["public"])
    })

    it("should set trip dates correctly", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [],
            notes: "",
          },
        ])
      )

      const context = createMockContext("神户3天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      const daysDiff = Math.floor(
        (trip.duration.endDate.getTime() - trip.duration.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(daysDiff).toBe(3)
    })

    it("should set trip status to planning", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [],
            notes: "",
          },
        ])
      )

      const context = createMockContext("横滨旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.status).toBe("planning")
    })

    it("should generate unique trip ID", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify([
          {
            dayNumber: 1,
            activities: [],
            notes: "",
          },
        ])
      )

      const context = createMockContext("广岛旅游")

      const trip1 = await MultiAgentService.generateTripFromContext(context)
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1))
      const trip2 = await MultiAgentService.generateTripFromContext(context)

      expect(trip1.id).not.toBe(trip2.id)
    })

    it("should parse LLM response correctly", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)

      const mockItinerary = [
        {
          dayNumber: 1,
          activities: [
            {
              type: "attraction",
              name: "东京塔",
              description: "地标性建筑",
              locationName: "港区",
              address: "东京都港区芝公园",
              startTime: "10:00",
              endTime: "12:00",
              duration: 120,
              cost: 150,
            },
            {
              type: "dining",
              name: "寿司午餐",
              description: "新鲜寿司",
              locationName: "银座",
              address: "东京都银座",
              startTime: "12:30",
              endTime: "14:00",
              duration: 90,
              cost: 80,
            },
          ],
          notes: "Day 1 notes",
        },
        {
          dayNumber: 2,
          activities: [],
          notes: "Day 2 notes",
        },
      ]

      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        "```json\n" + JSON.stringify(mockItinerary) + "\n```"
      )

      const context = createMockContext("东京2天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.itinerary).toHaveLength(2)
      expect(trip.itinerary[0].dayNumber).toBe(1)
      expect(trip.itinerary[0].activities).toHaveLength(2)
      expect(trip.itinerary[0].activities[0].name).toBe("东京塔")
      expect(trip.itinerary[0].activities[0].cost).toBe(150)
      expect(trip.itinerary[0].activities[1].type).toBe("dining")
      expect(trip.itinerary[1].dayNumber).toBe(2)
      expect(trip.itinerary[0].notes).toBe("Day 1 notes")
    })

    it("should handle LLM response without code block", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)

      const mockItinerary = [
        {
          dayNumber: 1,
          activities: [],
          notes: "",
        },
      ]

      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify(mockItinerary)
      )

      const context = createMockContext("京都1天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.itinerary).toHaveLength(1)
    })

    it("should throw error when LLM response is invalid JSON", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)
      vi.mocked(LLMService.chatCompletion).mockResolvedValue("Invalid JSON response")

      const context = createMockContext("奈良旅游")

      await expect(MultiAgentService.generateTripFromContext(context)).rejects.toThrow()
    })

    it("should handle response with different activity types", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)

      const mockItinerary = [
        {
          dayNumber: 1,
          activities: [
            {
              type: "attraction",
              name: "寺庙",
              locationName: "奈良",
              address: "奈良市",
              startTime: "09:00",
              endTime: "11:00",
              duration: 120,
              cost: 0,
            },
            {
              type: "dining",
              name: "午餐",
              locationName: "奈良",
              address: "奈良市",
              startTime: "12:00",
              endTime: "13:30",
              duration: 90,
              cost: 50,
            },
            {
              type: "transportation",
              name: "巴士",
              locationName: "奈良",
              address: "巴士站",
              startTime: "14:00",
              endTime: "14:30",
              duration: 30,
              cost: 20,
            },
            {
              type: "other",
              name: "自由时间",
              locationName: "奈良",
              address: "市中心",
              startTime: "15:00",
              endTime: "17:00",
              duration: 120,
              cost: 0,
            },
          ],
          notes: "",
        },
      ]

      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify(mockItinerary)
      )

      const context = createMockContext("奈良1天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.itinerary[0].activities).toHaveLength(4)
      expect(trip.itinerary[0].activities[0].type).toBe("attraction")
      expect(trip.itinerary[0].activities[1].type).toBe("dining")
      expect(trip.itinerary[0].activities[2].type).toBe("transportation")
      expect(trip.itinerary[0].activities[3].type).toBe("other")
    })

    it("should calculate activity duration correctly", async () => {
      vi.mocked(LLMService.isConfigured).mockReturnValue(true)

      const mockItinerary = [
        {
          dayNumber: 1,
          activities: [
            {
              type: "attraction",
              name: "景点",
              locationName: "东京",
              address: "东京",
              startTime: "09:00",
              endTime: "12:30",
              duration: 210, // 3.5 hours in minutes
              cost: 100,
            },
          ],
          notes: "",
        },
      ]

      vi.mocked(LLMService.chatCompletion).mockResolvedValue(
        JSON.stringify(mockItinerary)
      )

      const context = createMockContext("东京1天旅游")
      const trip = await MultiAgentService.generateTripFromContext(context)

      expect(trip.itinerary[0].activities[0].time.duration).toBe(210)
      expect(trip.itinerary[0].activities[0].time.start).toBe("09:00")
      expect(trip.itinerary[0].activities[0].time.end).toBe("12:30")
    })
  })
})

describe("AgentMessage Types", () => {
  it("should support all message types", () => {
    const types: Array<AgentMessage["type"]> = ["thought", "action", "result", "error"]

    types.forEach(type => {
      const message: AgentMessage = {
        agent: "supervisor",
        content: `Test ${type} message`,
        timestamp: new Date(),
        type,
      }
      expect(message.type).toBe(type)
    })
  })

  it("should support all agent roles", () => {
    const roles: Array<AgentRole> = ["supervisor", "planner", "recommender", "booking", "document"]

    roles.forEach(role => {
      const message: AgentMessage = {
        agent: role,
        content: `Test ${role} message`,
        timestamp: new Date(),
        type: "thought",
      }
      expect(message.agent).toBe(role)
    })
  })
})
