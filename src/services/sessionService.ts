/**
 * Session Management Service
 * Provides a high-level API for managing user sessions and preferences
 */

import { useSessionStore } from "@/stores/sessionStore"
import { PreferenceLearningService } from "./preferenceService"
import type { UserPreferences, RecommendationFeedback, DestinationInteraction } from "@/types"

/**
 * Initialize the user session
 * Should be called when the app starts
 */
export function initializeSession(userId?: string): void {
  useSessionStore.getState().initializeSession(userId)
}

/**
 * Track a user message and extract learnings
 */
export function trackUserMessage(
  message: string,
  tripId?: string,
  destinations?: string[]
): void {
  const store = useSessionStore.getState()

  // Add to conversation history
  store.addConversationMessage({
    role: "user",
    content: message,
    timestamp: new Date(),
    tripId,
    destinations,
  })

  // Extract and track destinations
  if (destinations) {
    destinations.forEach((dest) => {
      store.trackDestinationInteraction(dest)
    })
  }

  // Extract interests from message
  const detectedInterests = PreferenceLearningService.extractInterestsFromMessage(message)
  if (detectedInterests.length > 0) {
    store.updatePreferences({ interests: detectedInterests })
  }
}

/**
 * Track an AI response
 */
export function trackAssistantMessage(content: string, tripId?: string): void {
  useSessionStore.getState().addConversationMessage({
    role: "assistant",
    content,
    timestamp: new Date(),
    tripId,
  })
}

/**
 * Record user feedback on a recommendation
 */
export function recordFeedback(
  tripId: string,
  itemType: "destination" | "hotel" | "restaurant" | "activity",
  itemName: string,
  feedback: "positive" | "negative" | "neutral",
  reason?: string
): void {
  const store = useSessionStore.getState()
  const prefs = store.session.preferences

  store.addFeedback({
    tripId,
    recommendationType: itemType,
    itemName,
    feedback,
    timestamp: new Date(),
    reason,
  })

  // Learn from feedback
  const learning = PreferenceLearningService.learnFromFeedback(
    {
      tripId,
      recommendationType: itemType,
      itemName,
      feedback,
      timestamp: new Date(),
      reason,
    } as RecommendationFeedback,
    prefs
  )

  if (Object.keys(learning).length > 0) {
    store.updatePreferences(learning)
  }

  // Track destination interaction
  if (itemType === "destination") {
    store.trackDestinationInteraction(itemName, feedback === "positive" ? "positive" : "negative")
  }
}

/**
 * Save or unsave a destination
 */
export function toggleFavoriteDestination(destination: string): void {
  const store = useSessionStore.getState()
  const isSaved = store.session.favoriteDestinations.includes(destination)

  if (isSaved) {
    store.unsaveDestination(destination)
  } else {
    store.saveDestination(destination)
  }
}

/**
 * Check if a destination is saved
 */
export function isDestinationSaved(destination: string): boolean {
  return useSessionStore.getState().session.favoriteDestinations.includes(destination)
}

/**
 * Get user's favorite destinations
 */
export function getFavoriteDestinations(): string[] {
  return useSessionStore.getState().session.favoriteDestinations
}

/**
 * Get user's recent destinations (sorted by interaction)
 */
export function getRecentDestinations(limit = 10): DestinationInteraction[] {
  const store = useSessionStore.getState()
  return store.session.destinationInteractions
    .sort((a, b) => b.lastQueried.getTime() - a.lastQueried.getTime())
    .slice(0, limit)
}

/**
 * Get personalized context for AI prompts
 */
export function getPersonalizedContext(): string {
  const store = useSessionStore.getState()
  const { session } = store
  const analytics = store.getBehaviorAnalytics()

  return PreferenceLearningService.generatePersonalizedContext(session.preferences, analytics)
}

/**
 * Get user preferences
 */
export function getUserPreferences(): UserPreferences {
  return useSessionStore.getState().session.preferences
}

/**
 * Update user preferences
 */
export function updateUserPreferences(preferences: Partial<UserPreferences>): void {
  useSessionStore.getState().updatePreferences(preferences)
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  return useSessionStore.getState().session.onboardingCompleted
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding(): void {
  useSessionStore.getState().completeOnboarding()
}

/**
 * Get session maturity score (0-1)
 */
export function getSessionMaturity(): number {
  const store = useSessionStore.getState()
  const { session } = store
  const analytics = store.getBehaviorAnalytics()

  return PreferenceLearningService.calculateSessionMaturity(session.preferences, analytics)
}

/**
 * Get behavior analytics
 */
export function getBehaviorAnalytics() {
  return useSessionStore.getState().getBehaviorAnalytics()
}

/**
 * Get quick trip templates based on user history
 */
export function getQuickTemplates() {
  return useSessionStore.getState().getQuickTripTemplates()
}

/**
 * Export user data (GDPR compliance)
 */
export function exportUserData(): string {
  return useSessionStore.getState().exportData()
}

/**
 * Delete all user data (GDPR compliance)
 */
export function deleteUserData(): void {
  useSessionStore.getState().clearData()
}

/**
 * Track when a trip is viewed
 */
export function trackTripView(tripId: string): void {
  useSessionStore.getState().addRecentlyViewedTrip(tripId)
}

/**
 * Get recently viewed trips
 */
export function getRecentTrips(): string[] {
  return useSessionStore.getState().session.recentlyViewedTrips
}

/**
 * Get personalized recommendations for destinations
 */
export function getPersonalizedDestinationRecommendations(
  allDestinations: string[]
): Array<{ destination: string; score: number; reasons: string[] }> {
  const store = useSessionStore.getState()
  const { destinationInteractions, preferences } = store.session

  const recommendations = PreferenceLearningService.getPersonalizedRecommendations(
    allDestinations,
    destinationInteractions,
    preferences
  )

  // Transform 'reason' to 'reasons' for type compatibility
  return recommendations.map((rec) => ({
    destination: rec.destination,
    score: rec.score,
    reasons: rec.reason,
  }))
}

/**
 * Detect if user preferences should be updated based on behavior
 */
export function detectPreferenceChanges(): {
  changes: Partial<UserPreferences>
  confidence: number
} {
  const store = useSessionStore.getState()
  const { conversationHistory, preferences } = store.session

  const result = PreferenceLearningService.detectPreferenceChanges(conversationHistory, preferences)

  return {
    changes: result,
    confidence: result.confidence || 0,
  }
}

/**
 * Apply suggested preference changes
 */
export function applyPreferenceChanges(changes: Partial<UserPreferences>): void {
  if (Object.keys(changes).length > 0) {
    useSessionStore.getState().updatePreferences(changes)
  }
}

/**
 * Get onboarding questions based on current knowledge gaps
 */
export function getOnboardingQuestions(): string[] {
  const preferences = useSessionStore.getState().session.preferences
  return PreferenceLearningService.generateOnboardingQuestions(preferences)
}
