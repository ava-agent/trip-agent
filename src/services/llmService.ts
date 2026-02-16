/**
 * LLM Service for Trip Agent
 * Provides real API integration with OpenAI/Anthropic for trip planning
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type LLMProvider = "openai" | "anthropic" | "glm" | "proxy"

export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMStreamChunk {
  content: string
  done: boolean
}

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model?: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
}

export interface LLMError {
  message: string
  code?: string
  retryable: boolean
}

// ============================================================================
// LLM Service Implementation
// ============================================================================

export class LLMService {
  private static config: LLMConfig | null = null
  private static readonly DEFAULT_MAX_TOKENS = 4000
  private static readonly DEFAULT_TEMPERATURE = 0.7
  private static readonly MAX_RETRIES = 3
  private static readonly BASE_RETRY_DELAY = 1000

  /**
   * Initialize the LLM service with configuration
   */
  static initialize(config: LLMConfig): void {
    this.config = {
      ...config,
      maxTokens: config.maxTokens ?? this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? this.DEFAULT_TEMPERATURE,
    }
  }

  /**
   * Check if the service is configured
   */
  static isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0
  }

  /**
   * Get current configuration
   */
  static getConfig(): LLMConfig | null {
    return this.config
  }

  /**
   * Stream chat completion with retry logic
   */
  static async *streamChat(
    messages: LLMMessage[],
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    if (!this.isConfigured()) {
      throw new LLMAPIError("LLM service not configured. Please set API key.", "not_configured", false)
    }

    const config = this.config!

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        if (config.provider === "proxy") {
          yield* this.streamProxy(messages, config, onChunk)
        } else if (config.provider === "openai") {
          yield* this.streamOpenAI(messages, config, onChunk)
        } else if (config.provider === "anthropic") {
          yield* this.streamAnthropic(messages, config, onChunk)
        } else if (config.provider === "glm") {
          yield* this.streamGLM(messages, config, onChunk)
        }
        return
      } catch (error) {
        const llmError = this.handleError(error)

        if (!llmError.retryable || attempt === this.MAX_RETRIES - 1) {
          throw new LLMAPIError(llmError.message, llmError.code, false)
        }

        // Exponential backoff
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt)
        await this.sleep(delay)
      }
    }
  }

  /**
   * Stream completion from OpenAI API
   */
  private static async *streamOpenAI(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<LLMStreamChunk> {
    const baseURL = config.baseURL || "https://api.openai.com/v1"
    const model = config.model || "gpt-4o-mini"

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === "data: [DONE]") continue
          if (!trimmed.startsWith("data: ")) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              onChunk?.(content)
              yield { content, done: false }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { content: "", done: true }
  }

  /**
   * Stream completion from Anthropic Claude API
   */
  private static async *streamAnthropic(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<LLMStreamChunk> {
    const baseURL = config.baseURL || "https://api.anthropic.com"
    const model = config.model || "claude-3-5-sonnet-20241022"

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system")?.content || ""
    const chatMessages = messages.filter((m) => m.role !== "system")

    const response = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemMessage,
        messages: chatMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data: ")) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.type === "content_block_delta" && data.delta?.text) {
              const content = data.delta.text
              onChunk?.(content)
              yield { content, done: false }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { content: "", done: true }
  }

  /**
   * Stream completion from GLM (智谱 AI) API
   */
  private static async *streamGLM(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<LLMStreamChunk> {
    const baseURL = config.baseURL || "https://open.bigmodel.cn/api/paas/v4"
    const model = config.model || "glm-4-flash"

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === "data: [DONE]") continue
          if (!trimmed.startsWith("data: ")) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              onChunk?.(content)
              yield { content, done: false }
            }

            // Check if stream is complete
            if (data.choices?.[0]?.finish_reason) {
              return
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { content: "", done: true }
  }

  /**
   * Stream completion via server-side API proxy (/api/llm)
   */
  private static async *streamProxy(
    messages: LLMMessage[],
    config: LLMConfig,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<LLMStreamChunk> {
    const proxyURL = config.baseURL || "/api/llm"

    const response = await fetch(proxyURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(errorData.error || `Proxy error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body from proxy")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === "data: [DONE]") continue
          if (!trimmed.startsWith("data: ")) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            // OpenAI/GLM format
            const content = data.choices?.[0]?.delta?.content
              // Anthropic format
              || (data.type === "content_block_delta" ? data.delta?.text : undefined)
            if (content) {
              onChunk?.(content)
              yield { content, done: false }
            }
            if (data.choices?.[0]?.finish_reason) {
              return
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { content: "", done: true }
  }

  /**
   * Non-streaming chat completion (for convenience)
   */
  static async chatCompletion(messages: LLMMessage[]): Promise<string> {
    let fullContent = ""

    for await (const chunk of this.streamChat(messages)) {
      if (!chunk.done) {
        fullContent += chunk.content
      }
    }

    return fullContent
  }

  /**
   * Handle and classify errors
   */
  private static handleError(error: unknown): LLMError {
    if (error instanceof LLMAPIError) {
      return error
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    const errorStr = message.toLowerCase()

    // Rate limit errors
    if (errorStr.includes("rate limit") || errorStr.includes("429")) {
      return {
        message: "API rate limit exceeded. Please try again later.",
        code: "rate_limit",
        retryable: true,
      }
    }

    // Network errors
    if (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("connection")) {
      return {
        message: "Network error. Please check your connection.",
        code: "network",
        retryable: true,
      }
    }

    // Authentication errors
    if (errorStr.includes("unauthorized") || errorStr.includes("401") || errorStr.includes("api key")) {
      return {
        message: "Invalid API key. Please check your configuration.",
        code: "auth",
        retryable: false,
      }
    }

    // Server errors
    if (errorStr.includes("500") || errorStr.includes("502") || errorStr.includes("503")) {
      return {
        message: "Server error. Please try again later.",
        code: "server",
        retryable: true,
      }
    }

    // Context length errors
    if (errorStr.includes("context") && errorStr.includes("exceed")) {
      return {
        message: "Request too large. Please reduce the input length.",
        code: "context_length",
        retryable: false,
      }
    }

    // Default error
    return {
      message: `LLM API error: ${message}`,
      code: "unknown",
      retryable: false,
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Reset configuration (useful for testing)
   */
  static reset(): void {
    this.config = null
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class LLMAPIError extends Error {
  code?: string
  retryable: boolean

  constructor(
    message: string,
    code?: string,
    retryable: boolean = false
  ) {
    super(message)
    this.name = "LLMAPIError"
    this.code = code
    this.retryable = retryable
  }

  toLLMError(): LLMError {
    return {
      message: this.message,
      code: this.code,
      retryable: this.retryable,
    }
  }
}

// ============================================================================
// Prompt Templates for Trip Planning
// ============================================================================

export const PROMPTS = {
  /**
   * System prompt for the Supervisor agent
   */
  SUPERVISOR: `你是一个专业的旅行规划助手的主管 Agent。你的职责是：

1. **理解用户意图**：分析用户消息，识别他们想要什么（规划行程、获取推荐、预订服务、导出文档等）
2. **提取关键信息**：从消息中提取目的地、旅行天数、预算、偏好等信息
3. **任务分配**：根据意图将任务分配给合适的专业 Agent（规划师、推荐师、预订专员、文档专员）

请用简洁、专业的中文回复。`,

  /**
   * System prompt for the Planner agent
   */
  PLANNER: `你是一个专业的旅行规划 Agent。你的职责是：

1. **设计每日行程**：根据目的地和天数，合理安排每日活动
2. **景点选择**：推荐当地著名景点和特色活动
3. **时间规划**：考虑景点间的距离和游览时间，优化路线
4. **平衡安排**：确保每天的活动量适中，不过于紧凑

请用结构化的方式展示行程计划，包括：
- 每天的时间安排
- 景点名称和简介
- 预计游览时间
- 活动类型（观光、美食、文化、购物等）

用简洁的中文回复。`,

  /**
   * System prompt for the Recommender agent
   */
  RECOMMENDER: `你是一个专业的旅行推荐 Agent。你的职责是：

1. **个性化推荐**：根据用户兴趣推荐景点、餐厅、活动
2. **当地特色**：推荐当地特色美食、文化体验
3. **住宿建议**：根据预算推荐合适的住宿区域和类型
4. **实用信息**：提供天气、交通等实用信息

请用友好、热情的中文回复，突出推荐的亮点。`,

  /**
   * System prompt for the Booking agent
   */
  BOOKING: `你是一个专业的旅行预订咨询 Agent。你的职责是：

1. **价格对比**：提供不同平台的价格比较
2. **预订建议**：推荐可靠的预订渠道
3. **优惠信息**：提示当前可用的优惠和折扣
4. **预订提醒**：提醒预订注意事项

请提供实用的预订建议，但不要直接进行预订操作。用简洁的中文回复。`,

  /**
   * System prompt for the Document agent
   */
  DOCUMENT: `你是一个专业的旅行文档生成 Agent。你的职责是：

1. **格式化行程**：将行程信息整理成易读的格式
2. **添加备注**：添加实用的旅行贴士
3. **预算汇总**：整理各项费用估算
4. **准备清单**：生成出行准备清单

请用清晰的 Markdown 格式输出，便于用户保存和分享。`,

  /**
   * Template for trip planning request
   */
  TRIP_PLANNING_TEMPLATE: (userMessage: string, tripInfo: { destination?: string; days?: number; preferences?: string[] }) => {
    const { destination, days, preferences } = tripInfo
    return `用户消息：${userMessage}

提取的信息：
${destination ? `- 目的地：${destination}` : "- 目的地：未指定"}
${days ? `- 旅行天数：${days} 天` : "- 旅行天数：未指定"}
${preferences && preferences.length > 0 ? `- 偏好：${preferences.join("、")}` : "- 偏好：未指定"}

请根据以上信息，${destination ? `为用户规划${destination}${days || "X"}日游的详细行程` : "询问用户更多信息以规划行程"}。`
  },
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Load LLM configuration from environment variables
 */
export function loadLLMConfigFromEnv(): LLMConfig | null {
  // Check for API key in order of preference: GLM > OpenAI > Anthropic
  const glmKey = import.meta.env.VITE_GLM_API_KEY || ""
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || ""
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ""

  // Prefer GLM if available
  if (glmKey) {
    return {
      provider: "glm",
      apiKey: glmKey,
      model: import.meta.env.VITE_GLM_MODEL || undefined,
      baseURL: import.meta.env.VITE_GLM_BASE_URL || undefined,
    }
  }

  // Then OpenAI
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: import.meta.env.VITE_OPENAI_MODEL || undefined,
      baseURL: import.meta.env.VITE_OPENAI_BASE_URL || undefined,
    }
  }

  // Finally Anthropic
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: import.meta.env.VITE_ANTHROPIC_MODEL || undefined,
    }
  }

  // Web deployment mode: use server-side API proxy
  if (import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === "true") {
    return {
      provider: "proxy",
      apiKey: "server-managed",
      baseURL: "/api/llm",
    }
  }

  return null
}

/**
 * Initialize LLM service from environment variables
 */
export function initializeLLMFromEnv(): boolean {
  const config = loadLLMConfigFromEnv()
  if (config) {
    LLMService.initialize(config)
    return true
  }
  return false
}
