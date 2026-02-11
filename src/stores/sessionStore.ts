import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  UserSession,
  UserPreferences,
  ConversationMessage,
  RecommendationFeedback,
  QuickTripTemplate,
  BehaviorAnalytics,
} from "@/types"

interface SessionState {
  session: UserSession
  isInitialized: boolean
  initializeSession: (userId?: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  addConversationMessage: (message: Omit<ConversationMessage, "id">) => void
  trackDestinationInteraction: (
    destination: string,
    feedbackType?: "positive" | "negative"
  ) => void
  saveDestination: (destination: string) => void
  unsaveDestination: (destination: string) => void
  addFeedback: (feedback: Omit<RecommendationFeedback, "id">) => void
  addRecentlyViewedTrip: (tripId: string) => void
  completeOnboarding: () => void
  exportData: () => string
  clearData: () => void
  getBehaviorAnalytics: () => BehaviorAnalytics
  getQuickTripTemplates: () => QuickTripTemplate[]
  updateSession: () => void
}

const createDefaultSession = (): UserSession => ({
  id: `session-${Date.now()}`,
  preferences: {
    interests: [],
    accommodationType: ["mid-range"],
    transportationPreference: ["public"],
    dietaryRestrictions: [],
    accessibilityNeeds: [],
  },
  conversationHistory: [],
  destinationInteractions: [],
  feedback: [],
  recentlyViewedTrips: [],
  favoriteDestinations: [],
  onboardingCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

// Storage adapter using localStorage for web environment
// Tauri fs integration is disabled for now (requires @tauri-apps/plugin-fs package)
const storageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    return localStorage.getItem(name)
  },
  setItem: async (name: string, value: string): Promise<void> => {
    localStorage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    localStorage.removeItem(name)
  },
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: createDefaultSession(),
      isInitialized: false,

      initializeSession: (userId) => {
        set((state) => ({
          session: {
            ...state.session,
            id: userId ? `session-${userId}` : state.session.id,
            userId,
            updatedAt: new Date(),
          },
          isInitialized: true,
        }))
      },

      updatePreferences: (newPreferences) => {
        set((state) => ({
          session: {
            ...state.session,
            preferences: {
              ...state.session.preferences,
              ...newPreferences,
              interests: newPreferences.interests
                ? [...new Set([...state.session.preferences.interests, ...newPreferences.interests])]
                : state.session.preferences.interests,
            },
            updatedAt: new Date(),
          },
        }))
      },

      addConversationMessage: (message) => {
        const newMessage: ConversationMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }

        set((state) => ({
          session: {
            ...state.session,
            conversationHistory: [...state.session.conversationHistory, newMessage].slice(-100), // Keep last 100
            updatedAt: new Date(),
          },
        }))
      },

      trackDestinationInteraction: (destination, feedbackType) => {
        set((state) => {
          const interactions = [...state.session.destinationInteractions]
          const existingIndex = interactions.findIndex((d) => d.destination === destination)

          if (existingIndex >= 0) {
            const existing = interactions[existingIndex]
            interactions[existingIndex] = {
              ...existing,
              queryCount: existing.queryCount + 1,
              lastQueried: new Date(),
              positiveFeedback:
                feedbackType === "positive" ? existing.positiveFeedback + 1 : existing.positiveFeedback,
              negativeFeedback:
                feedbackType === "negative" ? existing.negativeFeedback + 1 : existing.negativeFeedback,
            }
          } else {
            interactions.push({
              destination,
              queryCount: 1,
              lastQueried: new Date(),
              positiveFeedback: feedbackType === "positive" ? 1 : 0,
              negativeFeedback: feedbackType === "negative" ? 1 : 0,
              saved: false,
            })
          }

          return {
            session: {
              ...state.session,
              destinationInteractions: interactions,
              updatedAt: new Date(),
            },
          }
        })
      },

      saveDestination: (destination) => {
        set((state) => {
          const interactions = [...state.session.destinationInteractions]
          const existingIndex = interactions.findIndex((d) => d.destination === destination)

          if (existingIndex >= 0) {
            interactions[existingIndex] = { ...interactions[existingIndex], saved: true }
          } else {
            interactions.push({
              destination,
              queryCount: 1,
              lastQueried: new Date(),
              positiveFeedback: 0,
              negativeFeedback: 0,
              saved: true,
            })
          }

          const favoriteDestinations = [...new Set([...state.session.favoriteDestinations, destination])]

          return {
            session: {
              ...state.session,
              destinationInteractions: interactions,
              favoriteDestinations,
              updatedAt: new Date(),
            },
          }
        })
      },

      unsaveDestination: (destination) => {
        set((state) => {
          const interactions = state.session.destinationInteractions.map((d) =>
            d.destination === destination ? { ...d, saved: false } : d
          )

          const favoriteDestinations = state.session.favoriteDestinations.filter((d) => d !== destination)

          return {
            session: {
              ...state.session,
              destinationInteractions: interactions,
              favoriteDestinations,
              updatedAt: new Date(),
            },
          }
        })
      },

      addFeedback: (feedback) => {
        const newFeedback: RecommendationFeedback = {
          ...feedback,
          id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }

        set((state) => ({
          session: {
            ...state.session,
            feedback: [...state.session.feedback, newFeedback].slice(-200), // Keep last 200
            updatedAt: new Date(),
          },
        }))
      },

      addRecentlyViewedTrip: (tripId) => {
        set((state) => {
          const recentlyViewed = [tripId, ...state.session.recentlyViewedTrips.filter((id) => id !== tripId)].slice(
            -10
          ) // Keep last 10

          return {
            session: {
              ...state.session,
              recentlyViewedTrips: recentlyViewed,
              updatedAt: new Date(),
            },
          }
        })
      },

      completeOnboarding: () => {
        set((state) => ({
          session: {
            ...state.session,
            onboardingCompleted: true,
            updatedAt: new Date(),
          },
        }))
      },

      exportData: () => {
        const { session } = get()
        // Remove sensitive data
        const safeExport = {
          preferences: session.preferences,
          conversationHistory: session.conversationHistory.map((msg) => ({
            ...msg,
            // Remove any potential PII from content
            content: msg.content.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]").replace(/\d{11}/g, "[PHONE]"),
          })),
          destinationInteractions: session.destinationInteractions,
          feedback: session.feedback,
          favoriteDestinations: session.favoriteDestinations,
          exportedAt: new Date().toISOString(),
        }
        return JSON.stringify(safeExport, null, 2)
      },

      clearData: () => {
        set({
          session: createDefaultSession(),
        })
      },

      getBehaviorAnalytics: () => {
        const { session } = get()
        const { conversationHistory, destinationInteractions, feedback, preferences } = session

        // Analyze interests from conversation history
        const interestCounts: Record<string, number> = {}
        conversationHistory.forEach((msg) => {
          const content = msg.content.toLowerCase()
          preferences.interests.forEach((interest) => {
            if (content.includes(interest.toLowerCase())) {
              interestCounts[interest] = (interestCounts[interest] || 0) + 1
            }
          })
        })

        const topInterests = Object.entries(interestCounts)
          .map(([interest, score]) => ({ interest, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)

        // Analyze destination preferences
        const preferredDestinations = destinationInteractions
          .map((d) => ({
            destination: d.destination,
            score: d.queryCount * 2 + d.positiveFeedback * 5 - d.negativeFeedback * 3 + (d.saved ? 10 : 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)

        // Calculate average trip duration from feedback
        const tripDurations = feedback
          .filter((f) => f.recommendationType === "destination")
          .map((f) => {
            // Extract duration from tripId if encoded
            const match = f.tripId.match(/(\d+)day/)
            return match ? parseInt(match[1]) : 5
          })
        const averageTripDuration =
          tripDurations.length > 0
            ? Math.round(tripDurations.reduce((a, b) => a + b, 0) / tripDurations.length)
            : 5

        return {
          topInterests,
          preferredDestinations,
          averageTripDuration,
          preferredAccommodationTypes: preferences.accommodationType || [],
          preferredTransportationTypes: preferences.transportationPreference || [],
          totalTripsPlanned: feedback.filter((f) => f.recommendationType === "destination").length,
          favoriteSeasons: [], // Could be extracted from conversation
        }
      },

      getQuickTripTemplates: () => {
        const { session } = get()
        const analytics = get().getBehaviorAnalytics()
        const templates: QuickTripTemplate[] = []

        // Generate templates based on favorite destinations
        session.favoriteDestinations.slice(0, 3).forEach((dest, idx) => {
          templates.push({
            id: `template-fav-${idx}`,
            name: `${dest}之旅`,
            description: `基于你的收藏生成的${dest}旅行计划`,
            destination: dest,
            days: analytics.averageTripDuration,
            estimatedBudget: 3000,
            interests: session.preferences.interests.slice(0, 3),
            basedOnHistory: true,
          })
        })

        // Generate templates based on top interests
        analytics.topInterests.slice(0, 2).forEach((interest, idx) => {
          const destinationsForInterest = session.destinationInteractions
            .filter((d) => d.positiveFeedback > 0)
            .sort((a, b) => b.positiveFeedback - a.positiveFeedback)

          if (destinationsForInterest.length > idx) {
            templates.push({
              id: `template-interest-${idx}`,
              name: `${interest.interest}主题游`,
              description: `专注${interest.interest}的深度体验`,
              destination: destinationsForInterest[idx].destination,
              days: Math.max(3, analytics.averageTripDuration - 1),
              estimatedBudget: 2000,
              interests: [interest.interest],
              basedOnHistory: true,
            })
          }
        })

        // Add a generic template if no history
        if (templates.length === 0) {
          templates.push({
            id: "template-default",
            name: "周末短途游",
            description: "轻松的周末 getaway",
            destination: "周边城市",
            days: 2,
            estimatedBudget: 1000,
            interests: ["观光", "美食"],
            basedOnHistory: false,
          })
        }

        return templates.slice(0, 5)
      },

      updateSession: () => {
        set((state) => ({
          session: {
            ...state.session,
            updatedAt: new Date(),
          },
        }))
      },
    }),
    {
      name: "trip-agent-session",
      storage: createJSONStorage(() => storageAdapter),
      partialize: (state) => ({ session: state.session, isInitialized: state.isInitialized }),
    }
  )
)

// Helper to get preferences for use in other services
export const getUserPreferences = (): UserPreferences => {
  return useSessionStore.getState().session.preferences
}

// Helper to get user context for agent prompts
export const getUserContext = (): string => {
  const state = useSessionStore.getState()
  const { preferences, favoriteDestinations, destinationInteractions } = state.session

  const parts: string[] = []

  if (preferences.interests.length > 0) {
    parts.push(`用户兴趣: ${preferences.interests.join(", ")}`)
  }

  if (preferences.budget) {
    parts.push(`预算范围: ${preferences.budget.min}-${preferences.budget.max} ${preferences.budget.currency}`)
  }

  if (preferences.accommodationType && preferences.accommodationType.length > 0) {
    parts.push(`住宿偏好: ${preferences.accommodationType.join(", ")}`)
  }

  if (favoriteDestinations.length > 0) {
    parts.push(`收藏的目的地: ${favoriteDestinations.join(", ")}`)
  }

  const topDestinations = destinationInteractions
    .sort((a, b) => b.queryCount - a.queryCount)
    .slice(0, 3)
    .map((d) => d.destination)
  if (topDestinations.length > 0) {
    parts.push(`常查询目的地: ${topDestinations.join(", ")}`)
  }

  return parts.length > 0 ? parts.join("\n") : "新用户，暂无偏好数据"
}
