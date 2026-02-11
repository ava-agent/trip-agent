/**
 * Preference Learning Service
 * Analyzes user behavior to personalize recommendations
 */

import type {
  UserPreferences,
  DestinationInteraction,
  RecommendationFeedback,
  BehaviorAnalytics,
  ConversationMessage,
} from "@/types"
import { getUserPreferences } from "@/stores/sessionStore"

// ============================================================================
// Interest Analysis
// ============================================================================

const INTEREST_KEYWORDS: Record<string, string[]> = {
  "历史古迹": ["历史", "古迹", "博物馆", "文化", "遗产", "寺庙", "宫殿", "古堡"],
  "自然风光": ["自然", "风景", "山", "海", "湖", "公园", "海滩", "瀑布"],
  "美食体验": ["美食", "餐厅", "小吃", "烹饪", "当地菜", "特色菜", "美食街"],
  "购物": ["购物", "商场", "市场", "买", "特产", "纪念品", "奢侈品"],
  "夜生活": ["夜生活", "酒吧", "club", "夜店", "夜景", "晚上"],
  "艺术": ["艺术", "画廊", "画展", "美术馆", "艺术区", "创意"],
  "冒险": ["冒险", "徒步", "登山", "潜水", "滑雪", "极限运动", "探险"],
  "休闲度假": ["休闲", "度假", "放松", "spa", "海滩", "度假村"],
  "家庭亲子": ["亲子", "家庭", "小孩", "儿童", "游乐场", "主题公园"],
  "商务": ["商务", "会议", "出差", "办公"],
}

const DESTINATION_CATEGORIES: Record<string, string[]> = {
  "城市观光": ["东京", "纽约", "巴黎", "伦敦", "上海", "北京", "新加坡", "香港"],
  "海岛度假": ["巴厘岛", "普吉岛", "马尔代夫", "夏威夷", "冲绳", "三亚"],
  "历史古城": ["京都", "罗马", "雅典", "伊斯坦布尔", "西安", "开罗"],
  "自然探险": ["新西兰", "冰岛", "挪威", "瑞士", "加拿大", "澳大利亚"],
  "文化体验": ["印度", "泰国", "越南", "柬埔寨", "尼泊尔"],
}

export class PreferenceLearningService {
  /**
   * Extract interests from conversation message
   */
  static extractInterestsFromMessage(message: string): string[] {
    const detectedInterests: string[] = []
    const lowerMessage = message.toLowerCase()

    for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        detectedInterests.push(interest)
      }
    }

    return [...new Set(detectedInterests)]
  }

  /**
   * Extract destination type from message
   */
  static extractDestinationType(message: string): string | null {
    for (const [category, destinations] of Object.entries(DESTINATION_CATEGORIES)) {
      if (destinations.some((dest) => message.includes(dest))) {
        return category
      }
    }
    return null
  }

  /**
   * Analyze conversation history for emerging patterns
   */
  static analyzeConversationPatterns(messages: ConversationMessage[]): {
    newInterests: string[]
    preferredTripTypes: string[]
    suggestedBudgetAdjustment: { min?: number; max?: number } | null
  } {
    const recentMessages = messages.slice(-20) // Analyze last 20 messages
    const interestCounts: Record<string, number> = {}
    const tripTypeCounts: Record<string, number> = {}
    let budgetMentions: number[] = []

    recentMessages.forEach((msg) => {
      // Extract interests
      const interests = this.extractInterestsFromMessage(msg.content)
      interests.forEach((interest) => {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1
      })

      // Extract trip types
      const tripType = this.extractDestinationType(msg.content)
      if (tripType) {
        tripTypeCounts[tripType] = (tripTypeCounts[tripType] || 0) + 1
      }

      // Extract budget mentions
      const budgetMatches = msg.content.match(/(\d{3,5})\s*(元|CNY|RMB|¥)/gi)
      if (budgetMatches) {
        const amounts = budgetMatches.map((m) => parseInt(m.replace(/[^\d]/g, "")))
        budgetMentions.push(...amounts.filter((a) => a >= 500 && a <= 50000))
      }
    })

    // Determine new interests (mentioned 3+ times)
    const newInterests = Object.entries(interestCounts)
      .filter(([_, count]) => count >= 3)
      .map(([interest]) => interest)

    // Determine preferred trip types
    const preferredTripTypes = Object.entries(tripTypeCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)

    // Suggest budget adjustment if enough data
    let suggestedBudgetAdjustment: { min?: number; max?: number } | null = null
    if (budgetMentions.length >= 3) {
      const avgBudget = budgetMentions.reduce((a, b) => a + b, 0) / budgetMentions.length
      const currentPrefs = getUserPreferences()

      if (currentPrefs.budget) {
        const currentAvg = (currentPrefs.budget.min + currentPrefs.budget.max) / 2
        if (Math.abs(avgBudget - currentAvg) > currentAvg * 0.2) {
          // Suggest adjustment if significantly different
          suggestedBudgetAdjustment = {
            min: Math.round(avgBudget * 0.7),
            max: Math.round(avgBudget * 1.3),
          }
        }
      } else {
        suggestedBudgetAdjustment = {
          min: Math.round(avgBudget * 0.7),
          max: Math.round(avgBudget * 1.3),
        }
      }
    }

    return { newInterests, preferredTripTypes, suggestedBudgetAdjustment }
  }

  /**
   * Calculate destination affinity score
   */
  static calculateDestinationAffinity(
    destination: string,
    interactions: DestinationInteraction[],
    feedback: RecommendationFeedback[]
  ): number {
    const interaction = interactions.find((d) => d.destination === destination)
    const destinationFeedback = feedback.filter((f) => f.itemName === destination)

    let score = 0

    if (interaction) {
      // Query frequency score
      score += Math.min(interaction.queryCount * 2, 20)

      // Feedback score
      score += interaction.positiveFeedback * 10
      score -= interaction.negativeFeedback * 5

      // Saved bonus
      if (interaction.saved) score += 15

      // Recency boost (queried in last 7 days)
      const daysSinceQuery = (Date.now() - interaction.lastQueried.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceQuery < 7) score += 5
    }

    // Additional feedback score
    destinationFeedback.forEach((f) => {
      if (f.feedback === "positive") score += 8
      else if (f.feedback === "negative") score -= 4
    })

    return Math.max(0, score)
  }

  /**
   * Get personalized destination recommendations
   */
  static getPersonalizedRecommendations(
    allDestinations: string[],
    interactions: DestinationInteraction[],
    preferences: UserPreferences
  ): { destination: string; score: number; reason: string[] }[] {
    const recommendations = allDestinations.map((dest) => {
      const affinityScore = this.calculateDestinationAffinity(dest, interactions, [])
      const reasons: string[] = []

      // Add reasons based on preferences
      if (preferences.interests.includes("历史古迹") && ["罗马", "雅典", "京都", "西安"].includes(dest)) {
        reasons.push("符合你对历史古迹的兴趣")
      }
      if (preferences.interests.includes("海岛度假") && ["巴厘岛", "普吉岛", "马尔代夫"].includes(dest)) {
        reasons.push("符合你对海岛度假的偏好")
      }
      if (preferences.interests.includes("美食体验") && ["东京", "大阪", "成都", "广州"].includes(dest)) {
        reasons.push("美食天堂，符合你的口味")
      }

      // Check if similar to favorites
      const favorites = interactions.filter((i) => i.saved).map((i) => i.destination)
      if (favorites.length > 0) {
        const similarType = this.extractDestinationType(favorites[0])
        if (similarType && DESTINATION_CATEGORIES[similarType]?.includes(dest)) {
          reasons.push(`与你收藏的${favorites[0]}类似`)
        }
      }

      return {
        destination: dest,
        score: affinityScore,
        reason: reasons,
      }
    })

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 10)
  }

  /**
   * Generate personalized context string for AI agents
   */
  static generatePersonalizedContext(
    preferences: UserPreferences,
    analytics: BehaviorAnalytics
  ): string {
    const contextParts: string[] = []

    // User profile summary
    contextParts.push("=== 用户画像 ===")

    if (preferences.interests.length > 0) {
      contextParts.push(`兴趣偏好: ${preferences.interests.join("、")}`)
    }

    if (preferences.budget) {
      contextParts.push(`预算范围: ¥${preferences.budget.min} - ¥${preferences.budget.max}`)
    }

    if (preferences.accommodationType?.length) {
      const accommodationMap = {
        "budget": "经济型",
        "mid-range": "舒适型",
        "luxury": "豪华型"
      }
      const accTypes = preferences.accommodationType.map(t => accommodationMap[t] || t).join("、")
      contextParts.push(`住宿偏好: ${accTypes}`)
    }

    if (preferences.transportationPreference?.length) {
      const transportMap = {
        "public": "公共交通",
        "rental": "租车",
        "walking": "步行",
        "taxi": "出租车"
      }
      const transTypes = preferences.transportationPreference.map(t => transportMap[t] || t).join("、")
      contextParts.push(`交通偏好: ${transTypes}`)
    }

    // Behavioral insights
    contextParts.push("\n=== 行为洞察 ===")

    if (analytics.preferredDestinations.length > 0) {
      const topDests = analytics.preferredDestinations.slice(0, 3).map(d => d.destination).join("、")
      contextParts.push(`偏好目的地: ${topDests}`)
    }

    if (analytics.averageTripDuration > 0) {
      contextParts.push(`平均行程天数: ${analytics.averageTripDuration}天`)
    }

    if (analytics.totalTripsPlanned > 0) {
      contextParts.push(`已规划行程: ${analytics.totalTripsPlanned}次`)
    }

    // Recommendation hints
    contextParts.push("\n=== 推荐建议 ===")

    if (analytics.topInterests.length > 0) {
      const topInterest = analytics.topInterests[0].interest
      contextParts.push(`推荐重点突出${topInterest}相关内容`)
    }

    if (analytics.preferredAccommodationTypes.length > 0) {
      contextParts.push(`优先推荐${analytics.preferredAccommodationTypes[0]}住宿`)
    }

    return contextParts.join("\n")
  }

  /**
   * Detect and suggest preference updates based on behavior
   */
  static detectPreferenceChanges(
    messages: ConversationMessage[],
    currentPreferences: UserPreferences
  ): Partial<UserPreferences> & { confidence: number } {
    const patterns = this.analyzeConversationPatterns(messages)
    const changes: Partial<UserPreferences> & { confidence: number } = {
      confidence: 0,
    }

    // Interest changes
    if (patterns.newInterests.length > 0) {
      const combinedInterests = [...new Set([...currentPreferences.interests, ...patterns.newInterests])]
      if (combinedInterests.length > currentPreferences.interests.length) {
        changes.interests = combinedInterests
        changes.confidence += patterns.newInterests.length * 0.2
      }
    }

    // Budget adjustment
    if (patterns.suggestedBudgetAdjustment) {
      const { min, max } = patterns.suggestedBudgetAdjustment
      if (min !== undefined && max !== undefined) {
        changes.budget = {
          min,
          max,
          currency: currentPreferences.budget?.currency || "CNY",
        }
        changes.confidence += 0.3
      }
    }

    // Keep confidence between 0 and 1
    changes.confidence = Math.min(1, changes.confidence)

    return changes
  }

  /**
   * Learn from feedback and adjust recommendations
   */
  static learnFromFeedback(
    feedback: RecommendationFeedback,
    currentPreferences: UserPreferences
  ): Partial<UserPreferences> {
    const learning: Partial<UserPreferences> = {}

    if (feedback.feedback === "positive") {
      // Positive feedback reinforces current preferences
      // Could add item name to a "liked" list for future matching
    } else if (feedback.feedback === "negative") {
      // Negative feedback might indicate preferences to avoid
      // Could track "disliked" categories
    }

    // Extract reason for learning
    if (feedback.reason) {
      const interests = this.extractInterestsFromMessage(feedback.reason)
      if (interests.length > 0 && feedback.feedback === "positive") {
        learning.interests = [...new Set([...currentPreferences.interests, ...interests])]
      }
    }

    return learning
  }

  /**
   * Generate onboarding questions based on current knowledge gaps
   */
  static generateOnboardingQuestions(preferences: UserPreferences): string[] {
    const questions: string[] = []

    if (preferences.interests.length === 0) {
      questions.push("你最喜欢什么类型的旅行活动？（如：观光、美食、购物、冒险等）")
    }

    if (!preferences.budget) {
      questions.push("你每次旅行通常的预算范围是多少？")
    }

    if (!preferences.accommodationType || preferences.accommodationType.length === 0) {
      questions.push("你偏好什么类型的住宿？（如：经济型、舒适型、豪华型）")
    }

    if (!preferences.transportationPreference || preferences.transportationPreference.length === 0) {
      questions.push("旅行时你更倾向于什么交通方式？（如：公共交通、租车、步行）")
    }

    return questions
  }

  /**
   * Calculate session maturity (how much we know about the user)
   */
  static calculateSessionMaturity(preferences: UserPreferences, analytics: BehaviorAnalytics): number {
    let score = 0

    // Preferences filled
    if (preferences.interests.length > 0) score += 0.2
    if (preferences.budget) score += 0.15
    if (preferences.accommodationType?.length) score += 0.15
    if (preferences.transportationPreference?.length) score += 0.15

    // Behavioral data
    if (analytics.preferredDestinations.length > 0) score += 0.15
    if (analytics.totalTripsPlanned > 0) score += 0.1

    // Interest diversity
    if (analytics.topInterests.length >= 3) score += 0.1

    return Math.min(1, score)
  }
}
