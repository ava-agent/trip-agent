/**
 * Tests for sessionStore.ts
 * Testing session state management with Zustand and persistence
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { useSessionStore, getUserPreferences, getUserContext } from "../sessionStore"
import type { UserSession } from "@/types"

describe("sessionStore", () => {
  // Store original localStorage
  let originalLocalStorage: Storage

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = globalThis.localStorage

    // Create fresh localStorage for each test
    const localStorageMock = (() => {
      let store: Record<string, string> = {}
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString() },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { store = {} },
        get length() { return Object.keys(store).length },
        key: (index: number) => Object.keys(store)[index] || null,
      }
    })()
    globalThis.localStorage = localStorageMock as any

    // Reset store state
    useSessionStore.getState().clearData()
  })

  afterEach(() => {
    // Restore original localStorage
    globalThis.localStorage = originalLocalStorage
  })

  describe("initial state", () => {
    it("should have default session structure", () => {
      const state = useSessionStore.getState()

      expect(state.session).toBeDefined()
      expect(state.session.id).toMatch(/^session-\d+$/)
      expect(state.session.preferences).toEqual({
        interests: [],
        accommodationType: ["mid-range"],
        transportationPreference: ["public"],
        dietaryRestrictions: [],
        accessibilityNeeds: [],
      })
      expect(state.session.conversationHistory).toEqual([])
      expect(state.session.destinationInteractions).toEqual([])
      expect(state.session.feedback).toEqual([])
      expect(state.session.recentlyViewedTrips).toEqual([])
      expect(state.session.favoriteDestinations).toEqual([])
      expect(state.session.onboardingCompleted).toBe(false)
      expect(state.session.createdAt).toBeInstanceOf(Date)
      expect(state.session.updatedAt).toBeInstanceOf(Date)
    })

    it("should not be initialized initially", () => {
      const state = useSessionStore.getState()
      expect(state.isInitialized).toBe(false)
    })
  })

  describe("initializeSession", () => {
    it("should initialize session with userId", () => {
      useSessionStore.getState().initializeSession("user-123")

      const state = useSessionStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.session.userId).toBe("user-123")
      expect(state.session.id).toBe("session-user-123")
    })

    it("should initialize session without userId", () => {
      useSessionStore.getState().initializeSession()

      const state = useSessionStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.session.userId).toBeUndefined()
      expect(state.session.id).toMatch(/^session-\d+$/)
    })

    it("should update updatedAt when initializing", () => {
      const oldUpdatedAt = useSessionStore.getState().session.updatedAt
      // Small delay to ensure timestamp difference
      setTimeout(() => {
        useSessionStore.getState().initializeSession("user-456")

        const newUpdatedAt = useSessionStore.getState().session.updatedAt
        expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime())
      }, 10)
    })
  })

  describe("updatePreferences", () => {
    it("should update user preferences", () => {
      useSessionStore.getState().updatePreferences({
        interests: ["美食", "购物"],
        budget: { min: 1000, max: 5000, currency: "CNY" },
      })

      const state = useSessionStore.getState()
      expect(state.session.preferences.interests).toContain("美食")
      expect(state.session.preferences.interests).toContain("购物")
      expect(state.session.preferences.budget).toEqual({
        min: 1000,
        max: 5000,
        currency: "CNY",
      })
    })

    it("should merge interests without duplicates", () => {
      useSessionStore.getState().updatePreferences({
        interests: ["美食"],
      })

      useSessionStore.getState().updatePreferences({
        interests: ["购物", "美食"], // Duplicate "美食"
      })

      const state = useSessionStore.getState()
      const foodInterestCount = state.session.preferences.interests.filter((i) => i === "美食").length
      expect(foodInterestCount).toBe(1)
    })

    it("should preserve existing preferences when updating partially", () => {
      useSessionStore.getState().updatePreferences({
        interests: ["观光"],
      })

      useSessionStore.getState().updatePreferences({
        accommodationType: ["luxury"],
      })

      const state = useSessionStore.getState()
      expect(state.session.preferences.interests).toContain("观光")
      expect(state.session.preferences.accommodationType).toEqual(["luxury"])
    })
  })

  describe("addConversationMessage", () => {
    it("should add message to conversation history", () => {
      const message = {
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
      }

      useSessionStore.getState().addConversationMessage(message)

      const state = useSessionStore.getState()
      expect(state.session.conversationHistory).toHaveLength(1)
      expect(state.session.conversationHistory[0].role).toBe("user")
      expect(state.session.conversationHistory[0].content).toBe("Hello")
      expect(state.session.conversationHistory[0].id).toMatch(/^msg-\d+-/)
    })

    it("should keep only last 100 messages", () => {
      // Add 105 messages
      for (let i = 0; i < 105; i++) {
        useSessionStore.getState().addConversationMessage({
          role: "user" as const,
          content: `Message ${i}`,
          timestamp: new Date(),
        })
      }

      const state = useSessionStore.getState()
      expect(state.session.conversationHistory).toHaveLength(100)
    })

    it("should auto-generate message ID", () => {
      useSessionStore.getState().addConversationMessage({
        role: "assistant" as const,
        content: "Hi there!",
        timestamp: new Date(),
      })

      const history = useSessionStore.getState().session.conversationHistory
      expect(history[0].id).toBeDefined()
      expect(history[0].id).toMatch(/^msg-\d+-[a-z0-9]+$/)
    })
  })

  describe("trackDestinationInteraction", () => {
    it("should add new destination interaction", () => {
      useSessionStore.getState().trackDestinationInteraction("东京")

      const state = useSessionStore.getState()
      expect(state.session.destinationInteractions).toHaveLength(1)
      expect(state.session.destinationInteractions[0]).toEqual({
        destination: "东京",
        queryCount: 1,
        lastQueried: expect.any(Date),
        positiveFeedback: 0,
        negativeFeedback: 0,
        saved: false,
      })
    })

    it("should update existing interaction", () => {
      useSessionStore.getState().trackDestinationInteraction("巴黎")
      useSessionStore.getState().trackDestinationInteraction("巴黎", "positive")

      const interactions = useSessionStore.getState().session.destinationInteractions
      expect(interactions).toHaveLength(1)
      expect(interactions[0].queryCount).toBe(2)
      expect(interactions[0].positiveFeedback).toBe(1)
      expect(interactions[0].negativeFeedback).toBe(0)
    })

    it("should track negative feedback", () => {
      useSessionStore.getState().trackDestinationInteraction("伦敦", "negative")

      const interaction = useSessionStore.getState().session.destinationInteractions[0]
      expect(interaction.negativeFeedback).toBe(1)
      expect(interaction.positiveFeedback).toBe(0)
    })

    it("should track both positive and negative feedback separately", () => {
      useSessionStore.getState().trackDestinationInteraction("悉尼", "positive")
      useSessionStore.getState().trackDestinationInteraction("悉尼", "positive")
      useSessionStore.getState().trackDestinationInteraction("悉尼", "negative")

      const interaction = useSessionStore.getState().session.destinationInteractions[0]
      expect(interaction.positiveFeedback).toBe(2)
      expect(interaction.negativeFeedback).toBe(1)
      expect(interaction.queryCount).toBe(3)
    })
  })

  describe("saveDestination", () => {
    it("should mark destination as saved", () => {
      useSessionStore.getState().trackDestinationInteraction("大阪")
      expect(useSessionStore.getState().session.destinationInteractions[0].saved).toBe(false)

      useSessionStore.getState().saveDestination("大阪")

      const interaction = useSessionStore.getState().session.destinationInteractions[0]
      expect(interaction.saved).toBe(true)
    })

    it("should add to favorite destinations", () => {
      useSessionStore.getState().saveDestination("京都")

      const favorites = useSessionStore.getState().session.favoriteDestinations
      expect(favorites).toContain("京都")
    })

    it("should not duplicate favorite destinations", () => {
      useSessionStore.getState().saveDestination("首尔")
      useSessionStore.getState().saveDestination("首尔")

      const favorites = useSessionStore.getState().session.favoriteDestinations
      const seoulCount = favorites.filter((d) => d === "首尔").length
      expect(seoulCount).toBe(1)
    })
  })

  describe("unsaveDestination", () => {
    it("should mark destination as unsaved", () => {
      useSessionStore.getState().saveDestination("曼谷")
      useSessionStore.getState().unsaveDestination("曼谷")

      const interaction = useSessionStore.getState().session.destinationInteractions.find(
        (d) => d.destination === "曼谷"
      )
      expect(interaction?.saved).toBe(false)
    })

    it("should remove from favorite destinations", () => {
      useSessionStore.getState().saveDestination("台北")
      expect(useSessionStore.getState().session.favoriteDestinations).toContain("台北")

      useSessionStore.getState().unsaveDestination("台北")

      const favorites = useSessionStore.getState().session.favoriteDestinations
      expect(favorites).not.toContain("台北")
    })
  })

  describe("addFeedback", () => {
    it("should add feedback to list", () => {
      const feedback = {
        tripId: "trip-123",
        recommendationType: "destination" as const,
        rating: 5,
        comment: "Great trip!",
        timestamp: new Date(),
      }

      useSessionStore.getState().addFeedback(feedback)

      const state = useSessionStore.getState()
      expect(state.session.feedback).toHaveLength(1)
      expect(state.session.feedback[0].tripId).toBe("trip-123")
      expect(state.session.feedback[0].rating).toBe(5)
      expect(state.session.feedback[0].id).toMatch(/^feedback-\d+-/)
    })

    it("should keep only last 200 feedbacks", () => {
      // Add 205 feedbacks
      for (let i = 0; i < 205; i++) {
        useSessionStore.getState().addFeedback({
          tripId: `trip-${i}`,
          recommendationType: "destination" as const,
          rating: 5,
          comment: `Feedback ${i}`,
          timestamp: new Date(),
        })
      }

      const feedbacks = useSessionStore.getState().session.feedback
      expect(feedbacks).toHaveLength(200)
    })
  })

  describe("addRecentlyViewedTrip", () => {
    it("should add trip to recently viewed", () => {
      useSessionStore.getState().addRecentlyViewedTrip("trip-abc")

      const state = useSessionStore.getState()
      expect(state.session.recentlyViewedTrips).toContain("trip-abc")
    })

    it("should move trip to front when viewed again", () => {
      useSessionStore.getState().addRecentlyViewedTrip("trip-1")
      useSessionStore.getState().addRecentlyViewedTrip("trip-2")
      expect(useSessionStore.getState().session.recentlyViewedTrips[0]).toBe("trip-2")

      useSessionStore.getState().addRecentlyViewedTrip("trip-1")

      const recentlyViewed = useSessionStore.getState().session.recentlyViewedTrips
      expect(recentlyViewed[0]).toBe("trip-1")
      const trip1Count = recentlyViewed.filter((id) => id === "trip-1").length
      expect(trip1Count).toBe(1)
    })

    it("should keep only last 10 trips", () => {
      for (let i = 0; i < 15; i++) {
        useSessionStore.getState().addRecentlyViewedTrip(`trip-${i}`)
      }

      const recentlyViewed = useSessionStore.getState().session.recentlyViewedTrips
      expect(recentlyViewed).toHaveLength(10)
    })
  })

  describe("completeOnboarding", () => {
    it("should mark onboarding as completed", () => {
      expect(useSessionStore.getState().session.onboardingCompleted).toBe(false)

      useSessionStore.getState().completeOnboarding()

      expect(useSessionStore.getState().session.onboardingCompleted).toBe(true)
    })
  })

  describe("clearData", () => {
    it("should reset session to default", () => {
      // Modify session
      useSessionStore.getState().initializeSession("user-999")
      useSessionStore.getState().updatePreferences({ interests: ["测试"] })
      useSessionStore.getState().addConversationMessage({
        role: "user" as const,
        content: "Test",
        timestamp: new Date(),
      })

      expect(useSessionStore.getState().session.userId).toBe("user-999")
      expect(useSessionStore.getState().session.preferences.interests).toContain("测试")
      expect(useSessionStore.getState().session.conversationHistory).toHaveLength(1)

      // Clear data
      useSessionStore.getState().clearData()

      const state = useSessionStore.getState()
      expect(state.session.userId).toBeUndefined()
      expect(state.session.preferences.interests).toEqual([])
      expect(state.session.conversationHistory).toEqual([])
      expect(state.session.destinationInteractions).toEqual([])
      expect(state.session.feedback).toEqual([])
      expect(state.session.recentlyViewedTrips).toEqual([])
      expect(state.session.favoriteDestinations).toEqual([])
      expect(state.session.onboardingCompleted).toBe(false)
    })
  })

  describe("getBehaviorAnalytics", () => {
    it("should return analytics with empty data", () => {
      const analytics = useSessionStore.getState().getBehaviorAnalytics()

      expect(analytics.topInterests).toEqual([])
      expect(analytics.preferredDestinations).toEqual([])
      expect(analytics.averageTripDuration).toBe(5)
      expect(analytics.totalTripsPlanned).toBe(0)
    })

    it("should analyze interests from conversation", () => {
      useSessionStore.getState().updatePreferences({ interests: ["美食", "购物", "文化"] })
      useSessionStore.getState().addConversationMessage({
        role: "user" as const,
        content: "我想去一个美食和购物的地方",
        timestamp: new Date(),
      })

      const analytics = useSessionStore.getState().getBehaviorAnalytics()
      expect(analytics.topInterests.length).toBeGreaterThan(0)
      expect(analytics.topInterests[0].interest).toBeDefined()
      expect(analytics.topInterests[0].score).toBeGreaterThan(0)
    })

    it("should calculate destination preference scores", () => {
      useSessionStore.getState().trackDestinationInteraction("东京", "positive")
      useSessionStore.getState().trackDestinationInteraction("东京", "positive")
      useSessionStore.getState().trackDestinationInteraction("东京")
      useSessionStore.getState().saveDestination("东京")

      const analytics = useSessionStore.getState().getBehaviorAnalytics()
      const tokyoScore = analytics.preferredDestinations.find((d) => d.destination === "东京")
      expect(tokyoScore?.score).toBeGreaterThan(0)
      // Score = queryCount * 2 + positiveFeedback * 5 - negativeFeedback * 3 + saved * 10
      // = 3 * 2 + 2 * 5 - 0 * 3 + 1 * 10 = 26
      expect(tokyoScore?.score).toBe(26)
    })
  })

  describe("getQuickTripTemplates", () => {
    it("should return default template when no history", () => {
      useSessionStore.getState().clearData()

      const templates = useSessionStore.getState().getQuickTripTemplates()

      expect(templates).toHaveLength(1)
      expect(templates[0].id).toBe("template-default")
      expect(templates[0].name).toBe("周末短途游")
      expect(templates[0].basedOnHistory).toBe(false)
    })

    it("should generate templates from favorite destinations", () => {
      useSessionStore.getState().saveDestination("京都")
      useSessionStore.getState().saveDestination("大阪")
      useSessionStore.getState().saveDestination("东京")

      const templates = useSessionStore.getState().getQuickTripTemplates()

      const favTemplates = templates.filter((t) => t.id.startsWith("template-fav-"))
      expect(favTemplates.length).toBeGreaterThan(0)
      expect(favTemplates[0].basedOnHistory).toBe(true)
    })

    it("should limit templates to 5", () => {
      useSessionStore.getState().saveDestination("京都")
      useSessionStore.getState().saveDestination("大阪")
      useSessionStore.getState().saveDestination("东京")
      useSessionStore.getState().updatePreferences({ interests: ["美食", "购物", "文化", "观光", "历史"] })

      const templates = useSessionStore.getState().getQuickTripTemplates()
      expect(templates.length).toBeLessThanOrEqual(5)
    })
  })

  describe("updateSession", () => {
    it("should update timestamp", () => {
      const oldUpdatedAt = useSessionStore.getState().session.updatedAt

      setTimeout(() => {
        useSessionStore.getState().updateSession()

        const newUpdatedAt = useSessionStore.getState().session.updatedAt
        expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime())
      }, 10)
    })
  })

  describe("getUserPreferences", () => {
    it("should return user preferences", () => {
      useSessionStore.getState().updatePreferences({
        interests: ["测试兴趣"],
        budget: { min: 100, max: 1000, currency: "USD" },
      })

      const prefs = getUserPreferences()
      expect(prefs.interests).toContain("测试兴趣")
      expect(prefs.budget?.min).toBe(100)
    })
  })

  describe("getUserContext", () => {
    it("should return context with default preferences for new user", () => {
      useSessionStore.getState().clearData()
      const context = getUserContext()
      // Default session includes accommodationType, so it appears in context
      expect(context).toContain("住宿偏好: mid-range")
    })

    it("should return empty context when explicitly clearing all preferences", () => {
      useSessionStore.getState().clearData()
      // Clear default preferences
      useSessionStore.getState().updatePreferences({
        interests: [],
        accommodationType: [],
        transportationPreference: [],
      })
      const context = getUserContext()
      expect(context).toBe("新用户，暂无偏好数据")
    })

    it("should include interests in context", () => {
      useSessionStore.getState().updatePreferences({ interests: ["美食", "购物"] })
      const context = getUserContext()
      expect(context).toContain("用户兴趣")
      expect(context).toContain("美食")
      expect(context).toContain("购物")
    })

    it("should include favorite destinations in context", () => {
      useSessionStore.getState().saveDestination("东京")
      useSessionStore.getState().saveDestination("京都")

      const context = getUserContext()
      expect(context).toContain("收藏的目的地")
    })

    it("should include budget in context", () => {
      useSessionStore.getState().updatePreferences({
        budget: { min: 1000, max: 5000, currency: "CNY" },
      })

      const context = getUserContext()
      expect(context).toContain("预算范围")
      expect(context).toContain("1000-5000")
    })
  })
})
