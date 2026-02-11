/**
 * GLM-4.7 API Service for Trip Agent
 * 智谱 AI GLM-4.7 API 集成服务
 * API 文档: https://open.bigmodel.cn/dev/api
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface GLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GLMStreamChunk {
  content: string
  done: boolean
}

export interface GLMConfig {
  apiKey: string
  model?: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

export interface GLMError {
  message: string
  code?: string
  retryable: boolean
}

interface GLMStreamChoice {
  index: number
  delta: {
    role?: string
    content?: string
  }
  finish_reason: string | null
}

interface GLMStreamResponse {
  id: string
  created: number
  model: string
  choices: GLMStreamChoice[]
}

// ============================================================================
// GLM Service Implementation
// ============================================================================

export class GLMService {
  private static config: GLMConfig | null = null
  private static readonly DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
  private static readonly DEFAULT_MODEL = "glm-4-flash"
  private static readonly DEFAULT_MAX_TOKENS = 4000
  private static readonly DEFAULT_TEMPERATURE = 0.7
  private static readonly DEFAULT_TOP_P = 0.9
  private static readonly MAX_RETRIES = 3
  private static readonly BASE_RETRY_DELAY = 1000

  /**
   * Initialize the GLM service with configuration
   */
  static initialize(config: GLMConfig): void {
    this.config = {
      ...config,
      model: config.model || this.DEFAULT_MODEL,
      baseURL: config.baseURL || this.DEFAULT_BASE_URL,
      maxTokens: config.maxTokens ?? this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? this.DEFAULT_TEMPERATURE,
      topP: config.topP ?? this.DEFAULT_TOP_P,
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
  static getConfig(): GLMConfig | null {
    return this.config
  }

  /**
   * Stream chat completion with retry logic
   */
  static async *streamChat(
    messages: GLMMessage[],
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<GLMStreamChunk, void, unknown> {
    if (!this.isConfigured()) {
      throw new GLMAPIError("GLM service not configured. Please set API key.", "not_configured", false)
    }

    const config = this.config!

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        yield* this.streamGLM(messages, config, onChunk)
        return
      } catch (error) {
        const glmError = this.handleError(error)

        if (!glmError.retryable || attempt === this.MAX_RETRIES - 1) {
          throw new GLMAPIError(glmError.message, glmError.code, false)
        }

        // Exponential backoff with jitter
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 500
        await this.sleep(delay)
      }
    }
  }

  /**
   * Stream completion from GLM API
   */
  private static async *streamGLM(
    messages: GLMMessage[],
    config: GLMConfig,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<GLMStreamChunk> {
    const baseURL = config.baseURL!
    const endpoint = `${baseURL}/chat/completions`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response)
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
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
            const jsonStr = trimmed.slice(6)
            const data = JSON.parse(jsonStr) as GLMStreamResponse

            if (data.choices && data.choices[0]) {
              const choice = data.choices[0]
              const content = choice.delta?.content

              if (content) {
                onChunk?.(content)
                yield { content, done: false }
              }

              // Check if stream is complete
              if (choice.finish_reason === "stop" || choice.finish_reason === "length") {
                yield { content: "", done: true }
                return
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            console.debug("Failed to parse SSE chunk:", parseError)
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
  static async chatCompletion(messages: GLMMessage[]): Promise<string> {
    let fullContent = ""

    for await (const chunk of this.streamChat(messages)) {
      if (!chunk.done) {
        fullContent += chunk.content
      }
    }

    return fullContent
  }

  /**
   * Parse error response from GLM API
   */
  private static async parseErrorResponse(response: Response): Promise<{ error: { message: string; code?: string } }> {
    try {
      return await response.json()
    } catch {
      return { error: { message: response.statusText } }
    }
  }

  /**
   * Handle and classify errors
   */
  private static handleError(error: unknown): GLMError {
    if (error instanceof GLMAPIError) {
      return error
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    const errorStr = message.toLowerCase()

    // Rate limit errors (GLM uses 429 for rate limiting)
    if (errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("too many requests")) {
      return {
        message: "API rate limit exceeded. Please try again later.",
        code: "rate_limit",
        retryable: true,
      }
    }

    // Network errors
    if (
      errorStr.includes("network") ||
      errorStr.includes("fetch") ||
      errorStr.includes("connection") ||
      errorStr.includes("timeout")
    ) {
      return {
        message: "Network error. Please check your connection.",
        code: "network",
        retryable: true,
      }
    }

    // Authentication errors
    if (
      errorStr.includes("unauthorized") ||
      errorStr.includes("401") ||
      errorStr.includes("invalid api key") ||
      errorStr.includes("authentication")
    ) {
      return {
        message: "Invalid GLM API key. Please check your configuration.",
        code: "auth",
        retryable: false,
      }
    }

    // Server errors
    if (errorStr.includes("500") || errorStr.includes("502") || errorStr.includes("503")) {
      return {
        message: "GLM server error. Please try again later.",
        code: "server",
        retryable: true,
      }
    }

    // Context length errors
    if (
      errorStr.includes("context") &&
      (errorStr.includes("exceed") || errorStr.includes("too long") || errorStr.includes("max tokens"))
    ) {
      return {
        message: "Request too large. Please reduce the input length.",
        code: "context_length",
        retryable: false,
      }
    }

    // Quota exceeded
    if (errorStr.includes("quota") || errorStr.includes("insufficient")) {
      return {
        message: "API quota exceeded. Please check your GLM account.",
        code: "quota",
        retryable: false,
      }
    }

    // Model not found
    if (errorStr.includes("model") && (errorStr.includes("not found") || errorStr.includes("invalid"))) {
      return {
        message: "Invalid model. Please check the model name.",
        code: "invalid_model",
        retryable: false,
      }
    }

    // Default error
    return {
      message: `GLM API error: ${message}`,
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

  /**
   * Get available GLM models
   */
  static getAvailableModels(): string[] {
    return [
      "glm-4-flash", // 快速响应，适合实时对话
      "glm-4-plus", // 高级推理能力
      "glm-4-air", // 轻量级模型
      "glm-4", // 标准版本
      "glm-3-turbo", // 上一代模型
    ]
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class GLMAPIError extends Error {
  code?: string
  retryable: boolean

  constructor(message: string, code?: string, retryable: boolean = false) {
    super(message)
    this.name = "GLMAPIError"
    this.code = code
    this.retryable = retryable
  }

  toGLMError(): GLMError {
    return {
      message: this.message,
      code: this.code,
      retryable: this.retryable,
    }
  }
}

// ============================================================================
// Prompt Templates for Trip Planning (GLM Optimized)
// ============================================================================

export const GLM_PROMPTS = {
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
  TRIP_PLANNING_TEMPLATE: (
    userMessage: string,
    tripInfo: { destination?: string; days?: number; preferences?: string[] }
  ) => {
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
 * Load GLM configuration from environment variables
 */
export function loadGLMConfigFromEnv(): GLMConfig | null {
  const apiKey = import.meta.env.VITE_GLM_API_KEY || ""

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    model: import.meta.env.VITE_GLM_MODEL || undefined,
    baseURL: import.meta.env.VITE_GLM_BASE_URL || undefined,
    maxTokens: import.meta.env.VITE_GLM_MAX_TOKENS ? Number(import.meta.env.VITE_GLM_MAX_TOKENS) : undefined,
    temperature: import.meta.env.VITE_GLM_TEMPERATURE ? Number(import.meta.env.VITE_GLM_TEMPERATURE) : undefined,
    topP: import.meta.env.VITE_GLM_TOP_P ? Number(import.meta.env.VITE_GLM_TOP_P) : undefined,
  }
}

/**
 * Initialize GLM service from environment variables
 */
export function initializeGLMFromEnv(): boolean {
  const config = loadGLMConfigFromEnv()
  if (config) {
    GLMService.initialize(config)
    return true
  }
  return false
}

/**
 * Create a mock response for fallback
 */
export function createMockResponse(userMessage: string): string {
  const destination = extractDestination(userMessage)

  if (destination) {
    return `收到！为你规划${destination}之旅。

📅 **建议行程（5天4夜）**

**第1天** - 抵达与初探
• 上午：抵达${destination}，酒店办理入住
• 下午：市中心观光，熟悉环境
• 晚上：欢迎晚餐

**第2天** - 标志性景点
• 上午：参观著名博物馆
• 下午：地标建筑游览
• 晚上：夜景观赏

**第3天** - 文化体验
• 上午：当地市场体验
• 下午：文化遗址探索
• 晚上：特色表演

**第4天** - 自由活动
• 购物、美食或深度游览

**第5天** - 返程
• 上午：最后采购，前往机场

💰 预估预算：约 ¥15,000 - ¥25,000/人

需要我帮你预订酒店和机票吗？`
  }

  return "请告诉我你想去哪里旅行，我将为你制定详细的行程计划！"
}

/**
 * Extract destination from user message
 */
function extractDestination(message: string): string | null {
  const destinations = [
    "东京", "巴黎", "纽约", "伦敦", "北京", "上海", "香港", "首尔", "新加坡",
    "曼谷", "迪拜", "悉尼", "罗马", "巴塞罗那", "阿姆斯特丹", "柏林", "维也纳",
    "布拉格", "布达佩斯", "雅典", "伊斯坦布尔", "开罗", "约翰内斯堡", "里约热内卢",
    "多伦多", "温哥华", "洛杉矶", "旧金山", "拉斯维加斯", "迈阿密", "芝加哥"
  ]

  for (const dest of destinations) {
    if (message.includes(dest)) {
      return dest
    }
  }

  return null
}
