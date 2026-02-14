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

