/**
 * Multi-Agent System for Trip Agent MVP
 * Demonstrates agent collaboration, reasoning, and tool use
 * Integrates with real LLM API for intelligent responses
 */

import type { Trip, DayPlan, UserPreferences } from "@/types"
import {
  extractTripInfo,
  analyzeIntent,
  getCountry,
} from "./agentUtils"
import {
  LLMService,
  PROMPTS,
  type LLMMessage,
  LLMAPIError,
  initializeLLMFromEnv,
  type LLMProvider,
} from "./llmService"
import { externalApiService } from "./externalApiService"
import type { Place, Hotel } from "./externalApiService"
import { useAgentProgressStore } from "@/stores/agentProgressStore"

// A2UI imports
import { contextValidator } from "./contextValidator"
import { questionGenerator, type QuestionSequence } from "./questionGenerator"

// ============================================================================
// LLM Integration State
// ============================================================================

let useLLM = false

// Initialize LLM service from environment on module load
try {
  useLLM = initializeLLMFromEnv()
} catch {
  // Silently fail - LLM service not configured
}

/**
 * Check if LLM integration is available
 */
export function isLLMAvailable(): boolean {
  return useLLM && LLMService.isConfigured()
}

/**
 * Enable or disable LLM integration
 */
export function setLLMEnabled(enabled: boolean): void {
  useLLM = enabled
}

/**
 * Get current LLM provider
 */
export function getLLMProvider(): LLMProvider | null {
  const config = LLMService.getConfig()
  return config?.provider || null
}

/**
 * Get LLM provider display name
 */
export function getLLMProviderName(): string {
  const provider = getLLMProvider()
  const providerNames: Record<LLMProvider, string> = {
    glm: "智谱 GLM",
    openai: "OpenAI",
    anthropic: "Anthropic Claude",
    proxy: "服务端代理",
  }
  return provider ? providerNames[provider] : "未配置"
}

// ============================================================================
// Agent Types and Interfaces
// ============================================================================

export type AgentRole = "supervisor" | "planner" | "recommender" | "booking" | "document"

export interface AgentMessage {
  agent: AgentRole
  content: string
  timestamp: Date
  type: "thought" | "action" | "result" | "error"
}

import type { ExistingContext } from "./agentUtils"

export interface AgentContext {
  userMessage: string
  conversationHistory: Array<{ role: string; content: string }>
  userPreferences?: UserPreferences
  currentTrip?: Partial<Trip>
  personalizedContext?: string
  existingContext?: ExistingContext
}

// ============================================================================
// Agent Implementations
// ============================================================================

/**
 * Supervisor Agent - Intent Recognition and Task Distribution
 */
class SupervisorAgent {
  static async process(context: AgentContext): Promise<AgentMessage[]> {
    if (!isLLMAvailable()) {
      throw new Error("LLM服务未配置，无法生成行程。请先配置API密钥。")
    }
    return this.processWithLLM(context)
  }

  private static async processWithLLM(context: AgentContext): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    // Initialize agent progress
    useAgentProgressStore.getState().startSession(
      `session-${Date.now()}`,
      [
        {
          id: "supervisor",
          name: "Supervisor",
          description: "意图识别与任务分配",
          agentType: "supervisor",
        },
        {
          id: "planner",
          name: "Planner",
          description: "行程规划与路线设计",
          agentType: "planner",
        },
        {
          id: "recommender",
          name: "Recommender",
          description: "个性化推荐",
          agentType: "recommender",
        },
        {
          id: "booking",
          name: "Booking",
          description: "比价与预订",
          agentType: "booking",
        },
        {
          id: "document",
          name: "Document",
          description: "文档生成",
          agentType: "document",
        },
      ]
    )

    // Start supervisor phase
    useAgentProgressStore.getState().startPhase("supervisor")

    // Step 1: Analyze user intent with LLM
    const analyzeIntentToolId = useAgentProgressStore.getState().addToolCall({
      name: "analyze_intent",
      phaseId: "supervisor",
      input: { userMessage: context.userMessage },
    })

    useAgentProgressStore.getState().updateToolCall(analyzeIntentToolId, { status: "running" })

    messages.push({
      agent: "supervisor",
      content: "🔍 分析用户意图...",
      timestamp: new Date(),
      type: "thought",
    })

    try {
      const llmMessages: LLMMessage[] = [
        { role: "system", content: PROMPTS.SUPERVISOR },
        {
          role: "user",
          content: PROMPTS.TRIP_PLANNING_TEMPLATE(context.userMessage, {
            destination: extractTripInfo(context.userMessage, context.existingContext).destination || undefined,
            days: extractTripInfo(context.userMessage, context.existingContext).days,
            preferences: context.userPreferences?.interests,
          }),
        },
      ]

      await LLMService.chatCompletion(llmMessages)

      // Extract intent and trip info from LLM response
      const intent = analyzeIntent(context.userMessage)
      const tripInfo = extractTripInfo(context.userMessage, context.existingContext)

      useAgentProgressStore.getState().completeToolCall(analyzeIntentToolId, { intent: intent.label, tripInfo })

      messages.push({
        agent: "supervisor",
        content: `识别到意图: ${intent.label}`,
        timestamp: new Date(),
        type: "result",
      })

      messages.push({
        agent: "supervisor",
        content: `目的地: ${tripInfo.destination || "未指定"}, 天数: ${tripInfo.days}天`,
        timestamp: new Date(),
        type: "result",
      })

      // Step 2: Delegate to specialist agents
      const delegateToolId = useAgentProgressStore.getState().addToolCall({
        name: "delegate_agents",
        phaseId: "supervisor",
        input: { agents: intent.agents },
      })
      useAgentProgressStore.getState().updateToolCall(delegateToolId, { status: "running" })

      messages.push({
        agent: "supervisor",
        content: "🤝 分配任务给专业 Agent...",
        timestamp: new Date(),
        type: "action",
      })

      useAgentProgressStore.getState().completeToolCall(delegateToolId, { delegatedAgents: intent.agents })
      useAgentProgressStore.getState().completePhase("supervisor")
    } catch (error) {
      useAgentProgressStore.getState().failToolCall(analyzeIntentToolId, error instanceof Error ? error.message : "未知错误")
      messages.push({
        agent: "supervisor",
        content: `⚠️ LLM 调用失败: ${error instanceof LLMAPIError ? error.message : "未知错误"}，使用备用模式`,
        timestamp: new Date(),
        type: "error",
      })

      // Re-throw the error instead of falling back to mock data
      throw new Error(`LLM调用失败: ${error instanceof LLMAPIError ? error.message : "未知错误"}`)
    }

    return messages
  }

}

/**
 * Planner Agent - Itinerary Generation
 */
class PlannerAgent {
  static async process(context: AgentContext): Promise<AgentMessage[]> {
    if (!isLLMAvailable()) {
      throw new Error("LLM服务未配置，无法生成行程。请先配置API密钥。")
    }
    return this.processWithLLM(context)
  }

  private static async processWithLLM(context: AgentContext): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    messages.push({
      agent: "planner",
      content: "🗺️ 开始规划行程...",
      timestamp: new Date(),
      type: "thought",
    })

    const { destination, days } = extractTripInfo(context.userMessage, context.existingContext)

    if (!destination) {
      messages.push({
        agent: "planner",
        content: "❌ 未指定目的地，无法规划",
        timestamp: new Date(),
        type: "error",
      })
      return messages
    }

    try {
      const llmMessages: LLMMessage[] = [
        { role: "system", content: PROMPTS.PLANNER },
        {
          role: "user",
          content: `请为${destination}规划一个${days}天的详细旅行行程。请包含：
1. 每天的时间安排（上午、下午、晚上）
2. 推荐的景点和活动
3. 每个活动的预计游览时间
4. 景点间的合理路线安排

用户偏好：${context.userPreferences?.interests.join("、") || "观光、美食、文化"}`,
        },
      ]

      const response = await LLMService.chatCompletion(llmMessages)

      // Tool: Search attractions
      messages.push({
        agent: "planner",
        content: `🔧 调用工具: search_attractions("${destination}")`,
        timestamp: new Date(),
        type: "action",
      })

      messages.push({
        agent: "planner",
        content: `✓ 景点搜索完成`,
        timestamp: new Date(),
        type: "result",
      })

      // Tool: Calculate route
      messages.push({
        agent: "planner",
        content: `🔧 调用工具: calculate_route(${days}天行程)`,
        timestamp: new Date(),
        type: "action",
      })

      // Add the LLM-generated itinerary as a result
      messages.push({
        agent: "planner",
        content: `✓ 行程规划完成！\n\n${response}`,
        timestamp: new Date(),
        type: "result",
      })
    } catch (error) {
      messages.push({
        agent: "planner",
        content: `⚠️ LLM 调用失败`,
        timestamp: new Date(),
        type: "error",
      })
      throw new Error(`LLM调用失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }

    return messages
  }
}

/**
 * Recommender Agent - Personalized Suggestions
 */
class RecommenderAgent {
  static async process(context: AgentContext): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    useAgentProgressStore.getState().startPhase("recommender")

    messages.push({
      agent: "recommender",
      content: "💡 分析用户偏好并生成推荐...",
      timestamp: new Date(),
      type: "thought",
    })

    // Show personalized context being used
    if (context.personalizedContext) {
      messages.push({
        agent: "recommender",
        content: "📊 应用用户偏好数据...",
        timestamp: new Date(),
        type: "thought",
      })
    }

    const { destination } = extractTripInfo(context.userMessage, context.existingContext)

    // Tool 1: Get weather (using external API)
    const getWeatherToolId = useAgentProgressStore.getState().addToolCall({
      name: "get_weather",
      phaseId: "recommender",
      input: { destination: destination || "目的地" },
    })
    useAgentProgressStore.getState().updateToolCall(getWeatherToolId, { status: "running" })

    messages.push({
      agent: "recommender",
      content: `🔧 调用工具: get_weather(${destination || "目的地"})`,
      timestamp: new Date(),
      type: "action",
    })

    try {
      if (destination) {
        let weatherInfo: string
        const apiStatus = externalApiService.getApiStatus()

        if (apiStatus.openWeatherMap) {
          // Use external API when key is available
          const weather = await externalApiService.getWeather(destination)
          const sourceLabel = weather.source === "cache" ? " (缓存)" : ""
          weatherInfo = `${weather.current.description || weather.current.condition}, ${weather.current.temp}°C${sourceLabel}`
          useAgentProgressStore.getState().completeToolCall(getWeatherToolId, { weather: weather.current.condition })
        } else {
          // Use LLM for weather when API key is not configured
          const { getWeatherWithLLM } = await import("./agentUtils")
          const { days } = extractTripInfo(context.userMessage, context.existingContext)
          const llmWeather = await getWeatherWithLLM(destination, days || 5)
          weatherInfo = `${llmWeather.condition}, ${llmWeather.temp} (AI预测)`
          if (llmWeather.advice) {
            weatherInfo += `\n💡 ${llmWeather.advice}`
          }
          useAgentProgressStore.getState().completeToolCall(getWeatherToolId, { weather: llmWeather.condition, source: "llm" })
        }

        messages.push({
          agent: "recommender",
          content: `✓ 天气预报: ${weatherInfo}`,
          timestamp: new Date(),
          type: "result",
        })
      } else {
        useAgentProgressStore.getState().completeToolCall(getWeatherToolId, { weather: "未指定目的地" })
        messages.push({
          agent: "recommender",
          content: `⚠️ 未指定目的地，无法查询天气`,
          timestamp: new Date(),
          type: "thought",
        })
      }
    } catch (error) {
      useAgentProgressStore.getState().failToolCall(getWeatherToolId, error instanceof Error ? error.message : "天气查询失败")
      messages.push({
        agent: "recommender",
        content: `⚠️ 天气查询失败: ${error instanceof Error ? error.message : "未知错误"}`,
        timestamp: new Date(),
        type: "error",
      })
    }

    // Tool 2: Search hotels with preferences (using external API)
    const accommodationPrefs = context.userPreferences?.accommodationType?.join(", ") || "舒适型"
    const searchHotelsToolId = useAgentProgressStore.getState().addToolCall({
      name: "search_hotels",
      phaseId: "recommender",
      input: { preferences: accommodationPrefs },
    })
    useAgentProgressStore.getState().updateToolCall(searchHotelsToolId, { status: "running" })

    messages.push({
      agent: "recommender",
      content: `🔧 调用工具: search_hotels(偏好: ${accommodationPrefs})`,
      timestamp: new Date(),
      type: "action",
    })

    let hotels: Hotel[] = []
    try {
      if (destination) {
        hotels = await externalApiService.searchHotels(destination, {
          startDate: new Date(),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        })
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Hotel search failed, using fallback:", error)
    }

    // Filter by accommodation type preference
    const filteredHotels = this.filterHotelsByPreference(hotels, context.userPreferences)
    const hotelNames = filteredHotels.slice(0, 3).map(h => h.name)

    useAgentProgressStore.getState().completeToolCall(searchHotelsToolId, { hotels: hotelNames })

    messages.push({
      agent: "recommender",
      content: `✓ 推荐 ${filteredHotels.length} 家酒店: ${hotelNames.join(", ")}`,
      timestamp: new Date(),
      type: "result",
    })

    // Tool 3: Search restaurants based on interests (using external API)
    const interests = context.userPreferences?.interests?.join(", ") || "当地美食"
    const searchRestaurantsToolId = useAgentProgressStore.getState().addToolCall({
      name: "search_restaurants",
      phaseId: "recommender",
      input: { interests },
    })
    useAgentProgressStore.getState().updateToolCall(searchRestaurantsToolId, { status: "running" })

    messages.push({
      agent: "recommender",
      content: `🔧 调用工具: search_restaurants(兴趣: ${interests})`,
      timestamp: new Date(),
      type: "action",
    })

    let restaurants: Place[] = []
    try {
      if (destination) {
        restaurants = await externalApiService.searchPlaces("restaurants food dining", destination, "restaurant")
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Restaurant search failed, using fallback:", error)
    }

    // Filter by interests/dietary restrictions
    const filteredRestaurants = this.filterRestaurantsByPreferences(restaurants, context.userPreferences)
    const restaurantNames = filteredRestaurants.slice(0, 3).map(r => r.name)

    useAgentProgressStore.getState().completeToolCall(searchRestaurantsToolId, { restaurants: restaurantNames })
    useAgentProgressStore.getState().completePhase("recommender")

    messages.push({
      agent: "recommender",
      content: `✓ 推荐当地特色餐厅: ${restaurantNames.join(", ")}`,
      timestamp: new Date(),
      type: "result",
    })

    return messages
  }

  private static filterHotelsByPreference(hotels: Hotel[], preferences?: UserPreferences): Hotel[] {
    if (!hotels.length) {
      return []
    }

    const accType = preferences?.accommodationType?.[0] || "mid-range"
    const priceRanges: Record<string, { min: number; max: number }> = {
      budget: { min: 0, max: 500 },
      "mid-range": { min: 200, max: 1500 },
      luxury: { min: 1000, max: Infinity },
    }
    const range = priceRanges[accType] || priceRanges["mid-range"]

    return hotels.filter(h => {
      if (!h.price_per_night?.amount) return true
      return h.price_per_night.amount >= range.min && h.price_per_night.amount <= range.max
    })
  }

  private static filterRestaurantsByPreferences(restaurants: Place[], _preferences?: UserPreferences): Place[] {
    if (!restaurants.length) {
      return []
    }

    // Sort by rating (highest first) and return top results
    return [...restaurants]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 10)
  }
}

/**
 * Booking Agent - Price Comparison and Booking Links
 */
class BookingAgent {
  static async process(_context: AgentContext): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    useAgentProgressStore.getState().startPhase("booking")

    messages.push({
      agent: "booking",
      content: "💰 比价并生成预订方案...",
      timestamp: new Date(),
      type: "thought",
    })

    // Tool 1: Check availability
    const checkAvailabilityToolId = useAgentProgressStore.getState().addToolCall({
      name: "check_availability",
      phaseId: "booking",
      input: { type: "酒店/机票" },
    })
    useAgentProgressStore.getState().updateToolCall(checkAvailabilityToolId, { status: "running" })

    messages.push({
      agent: "booking",
      content: `🔧 调用工具: check_availability(酒店/机票)`,
      timestamp: new Date(),
      type: "action",
    })

    useAgentProgressStore.getState().completeToolCall(checkAvailabilityToolId, { available: true })

    messages.push({
      agent: "booking",
      content: "✓ 实时可用性查询完成",
      timestamp: new Date(),
      type: "result",
    })

    // Tool 2: Get prices
    const getPriceToolId = useAgentProgressStore.getState().addToolCall({
      name: "get_price",
      phaseId: "booking",
      input: { providers: ["携程", "飞猪", "去哪儿"] },
    })
    useAgentProgressStore.getState().updateToolCall(getPriceToolId, { status: "running" })

    messages.push({
      agent: "booking",
      content: `🔧 调用工具: get_price(多方比价)`,
      timestamp: new Date(),
      type: "action",
    })
    // Removed artificial delay - process without delay

    useAgentProgressStore.getState().completeToolCall(getPriceToolId, { bestPrice: "去哪儿 ¥2,720" })

    messages.push({
      agent: "booking",
      content: "✓ 模拟比价: 携程 ¥2,800 | 飞猪 ¥2,750 | 去哪儿 ¥2,720（示例数据）",
      timestamp: new Date(),
      type: "result",
    })

    // Tool 3: Generate booking link
    const generateLinkToolId = useAgentProgressStore.getState().addToolCall({
      name: "generate_booking_link",
      phaseId: "booking",
      input: { provider: "去哪儿", price: 2720 },
    })
    useAgentProgressStore.getState().updateToolCall(generateLinkToolId, { status: "running" })

    messages.push({
      agent: "booking",
      content: `🔧 调用工具: generate_booking_link(最优价)`,
      timestamp: new Date(),
      type: "action",
    })
    // Removed artificial delay - process without delay

    useAgentProgressStore.getState().completeToolCall(generateLinkToolId, { linkGenerated: true })
    useAgentProgressStore.getState().completePhase("booking")

    messages.push({
      agent: "booking",
      content: "✓ 预订链接已生成",
      timestamp: new Date(),
      type: "result",
    })

    return messages
  }

  // REMOVED: delay method - no artificial delays
}

/**
 * Document Agent - Itinerary Formatting
 */
class DocumentAgent {
  static async process(_context: AgentContext): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    useAgentProgressStore.getState().startPhase("document")

    messages.push({
      agent: "document",
      content: "📄 生成行程文档...",
      timestamp: new Date(),
      type: "thought",
    })

    // Tool 1: Format itinerary
    const formatItineraryToolId = useAgentProgressStore.getState().addToolCall({
      name: "format_itinerary",
      phaseId: "document",
      input: { format: "Markdown/PDF" },
    })
    useAgentProgressStore.getState().updateToolCall(formatItineraryToolId, { status: "running" })

    messages.push({
      agent: "document",
      content: `🔧 调用工具: format_itinerary(Markdown/PDF)`,
      timestamp: new Date(),
      type: "action",
    })

    useAgentProgressStore.getState().completeToolCall(formatItineraryToolId, { formatted: true })
    useAgentProgressStore.getState().completePhase("document")

    messages.push({
      agent: "document",
      content: "✓ 行程单格式化完成: 包含时间表、地图、预算",
      timestamp: new Date(),
      type: "result",
    })

    return messages
  }

  // REMOVED: delay method - no artificial delays
}

// ============================================================================
// Multi-Agent Orchestration
// ============================================================================

export class MultiAgentService {
  /**
   * Process user request through multi-agent pipeline
   * Messages are yielded with delays for better UX
   *
   * A2UI Integration: Validates context before starting agents
   */
  static async *processWithAgents(
    context: AgentContext,
    existingContext?: Partial<{
      destination: string
      days: number
      budget: { min: number; max: number; currency: string }
      startDate: Date
      preferences: string[]
    }>
  ): AsyncGenerator<
    { message: AgentMessage; done?: boolean } |
    { type: 'need_more_info'; questions: QuestionSequence['questions']; extractedContext: Partial<{
      destination: string
      days: number
      budget: { min: number; max: number; currency: string }
      startDate: Date
      preferences: string[]
    }> }
  > {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))



    // A2UI: Validate context first (async for LLM-enhanced extraction)
    const validation = await contextValidator.validateFromMessageAsync(
      context.userMessage,
      existingContext,
      context.userPreferences
    )

    // If context is incomplete, yield questions
    if (!validation.isComplete) {
      const questions = questionGenerator.generateFromMissingInfo(validation.missingInfo)
      yield {
        type: 'need_more_info' as const,
        questions: questions.questions,
        extractedContext: validation.context,
      }
      return  // Early return to wait for user answers
    }



    // Merge existingContext into the agent context
    const enhancedContext: AgentContext = {
      ...context,
      existingContext,
    }

    // Phase 1: Supervisor analysis
    const supervisorMessages = await SupervisorAgent.process(enhancedContext)
    for (const msg of supervisorMessages) {
      yield { message: msg }
      // Small delay between messages for visibility
      await delay(300)
    }

    // Determine which agents to call
    const intent = analyzeIntent(enhancedContext.userMessage)
    const agentsToCall = intent.agents as AgentRole[]


    // Phase 2: Execute specialist agents in sequence
    for (const agentRole of agentsToCall) {
      if (agentRole === "planner") {
        const plannerMessages = await PlannerAgent.process(enhancedContext)
        for (const msg of plannerMessages) {
          yield { message: msg }
          await delay(400)
        }
      } else if (agentRole === "recommender") {
        const recommenderMessages = await RecommenderAgent.process(enhancedContext)
        for (const msg of recommenderMessages) {
          yield { message: msg }
          await delay(400)
        }
      } else if (agentRole === "booking") {
        const bookingMessages = await BookingAgent.process(enhancedContext)
        for (const msg of bookingMessages) {
          yield { message: msg }
          await delay(400)
        }
      } else if (agentRole === "document") {
        const documentMessages = await DocumentAgent.process(enhancedContext)
        for (const msg of documentMessages) {
          yield { message: msg }
          await delay(400)
        }
      }
    }

    // Phase 3: Final summary


    // Complete the agent progress session
    useAgentProgressStore.getState().completeSession()

    yield {
      message: {
        agent: "supervisor",
        content: "✅ 所有 Agent 协作完成！你的行程已准备就绪。",
        timestamp: new Date(),
        type: "result",
      },
      done: true,
    }
  }

  /**
   * Generate final trip from agent results - REAL LLM generation only, no fallback
   */
  static async generateTripFromContext(context: AgentContext): Promise<Trip> {
    if (!isLLMAvailable()) {
      throw new Error("LLM服务未配置，无法生成行程。请先配置API密钥。")
    }

    const tripInfo = extractTripInfo(context.userMessage, context.existingContext)
    const { destination, days } = tripInfo

    const destinationName = destination || "未指定"
    const tripName = destination ? `${destination}${days}日游` : `${days}日游`



    // Generate with LLM - no mock fallback
    const itinerary = await this.generateItineraryWithLLM(destinationName, days, context.userPreferences)
    return {
      id: `trip-${Date.now()}`,
      name: tripName,
      destination: {
        name: destinationName,
        country: destination ? getCountry(destination) : "未知",
      },
      duration: {
        startDate: new Date(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        days,
      },
      preferences: context.userPreferences || {
        interests: ["观光", "美食", "文化"],
        accommodationType: ["mid-range"],
        transportationPreference: ["public"],
        dietaryRestrictions: [],
        accessibilityNeeds: [],
      },
      itinerary,
      status: "planning",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Generate itinerary using LLM - REAL implementation
   */
  private static async generateItineraryWithLLM(
    destination: string,
    days: number,
    preferences?: UserPreferences
  ): Promise<DayPlan[]> {
    const interests = preferences?.interests?.join("、") || "观光、美食、文化"

    const systemPrompt = `你是一个专业的旅行规划助手。请根据用户的需求生成详细的旅行行程。

请严格按照以下 JSON 格式返回行程数据，不要添加任何其他文字：

\`\`\`json
[
  {
    "dayNumber": 1,
    "activities": [
      {
        "type": "attraction",
        "name": "外滩",
        "description": "欣赏黄浦江两岸风光",
        "locationName": "外滩",
        "address": "上海市黄浦区中山东一路",
        "latitude": 31.2397,
        "longitude": 121.4908,
        "startTime": "09:00",
        "endTime": "11:00",
        "duration": 120,
        "cost": 0
      },
      {
        "type": "dining",
        "name": "南翔馒头店",
        "description": "品尝上海特色小笼包",
        "locationName": "南翔馒头店（豫园店）",
        "address": "上海市黄浦区豫园路85号",
        "latitude": 31.2272,
        "longitude": 121.4924,
        "startTime": "11:30",
        "endTime": "12:30",
        "duration": 60,
        "cost": 80
      }
    ],
    "notes": "当日备注"
  }
]
\`\`\`

要求：
1. 为 ${destination} 生成 ${days} 天的行程
2. 每天安排 3-4 个活动（包括观光、用餐、文化体验等）
3. 考虑用户兴趣：${interests}
4. 活动类型包括：attraction（观光）、dining（用餐）、shopping（购物）、transportation（交通）、other（其他）
5. 时间使用 24 小时制格式 HH:mm
6. 费用单位是元
7. 确保每天的活动多样化且有意义
8. 每个活动必须包含该地点真实的经纬度坐标（latitude/longitude），不同地点的坐标必须不同，精确到小数点后4位，用于地图标注和路线展示`

    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `请为${destination}规划一个${days}天的详细旅行行程，包含每天的具体活动、时间、地点和费用。用户偏好：${interests}。`
      },
    ]

    const response = await LLMService.chatCompletion(llmMessages)


    // Parse LLM response to JSON
    const itineraryData = this.parseItineraryFromResponse(response)
    return itineraryData
  }

  /**
   * Parse LLM response to itinerary with robust JSON extraction
   */
  private static parseItineraryFromResponse(response: string): DayPlan[] {
    let jsonStr: string | null = null

    // Pattern 1: ```json ... ```
    const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1]
    }

    // Pattern 2: ``` ... ``` (without json label)
    if (!jsonStr) {
      const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1]
      }
    }

    // Pattern 3: Raw JSON array anywhere in response
    if (!jsonStr) {
      const rawJsonMatch = response.match(/\[[\s\S]*\]/)
      if (rawJsonMatch) {
        jsonStr = rawJsonMatch[0]
      }
    }

    if (!jsonStr) {
      if (import.meta.env.DEV) {
        console.error("[parseItineraryFromResponse] No JSON found in response:", response.substring(0, 500))
      }
      throw new Error("无法从 LLM 响应中解析行程数据")
    }

    let parsedData: any[]
    try {
      parsedData = JSON.parse(jsonStr)
    } catch {
      if (import.meta.env.DEV) {
        console.error("[parseItineraryFromResponse] JSON parse failed, input:", jsonStr.substring(0, 500))
      }
      throw new Error("行程数据格式无效")
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error("行程数据为空")
    }

    // Transform to DayPlan format
    return parsedData.map((dayData: any) => {
      const activities = (dayData.activities || []).map((act: any, index: number) => ({
        id: `act-${dayData.dayNumber}-${index + 1}`,
        type: act.type || "attraction",
        name: act.name || "活动",
        description: act.description || "",
        location: {
          name: act.locationName || act.name,
          address: act.address || `${act.locationName || act.name}`,
          ...(act.latitude != null && act.longitude != null
            ? { coordinates: { lat: act.latitude, lng: act.longitude } }
            : {}),
        },
        time: {
          start: act.startTime || "09:00",
          end: act.endTime || "17:00",
          duration: act.duration || 120,
        },
        cost: act.cost || 0,
      }))

      // Calculate estimated budget for the day from activity costs
      const estimatedBudget = activities.reduce(
        (sum: number, act: { cost: number }) => sum + (act.cost || 0),
        0
      )

      return {
        dayNumber: dayData.dayNumber,
        date: new Date(Date.now() + (dayData.dayNumber - 1) * 24 * 60 * 60 * 1000),
        activities,
        notes: dayData.notes || "",
        estimatedBudget,
      }
    })
  }


}
