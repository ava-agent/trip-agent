/**
 * External API Integration Service
 * Integrates with OpenWeatherMap, Google Places, and hotel booking APIs
 * Features: caching, rate limiting, timeout handling, circuit breaker, retry logic
 */

// ============================================================================
// Types
// ============================================================================

// Circuit breaker states
type CircuitState = "closed" | "open" | "half-open"

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening
  resetTimeout: number // Milliseconds to wait before trying half-open
  monitoringPeriod: number // Milliseconds to consider for failure counting
}

// Circuit breaker state tracking
interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  lastFailureTime: Date | null
  lastStateChange: Date
  nextAttemptTime: Date | null
}

// Retry configuration
interface RetryConfig {
  maxRetries: number
  baseDelay: number // Base delay in milliseconds
  maxDelay: number // Maximum delay in milliseconds
  retryableStatusCodes: Set<number>
  retryableErrors: Set<string>
}

// API error types for comprehensive error handling
enum ApiErrorType {
  TIMEOUT = "TIMEOUT",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  RATE_LIMIT = "RATE_LIMIT",
  UNAUTHORIZED = "UNAUTHORIZED",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN"
}

// Custom API error class
class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    public service: string,
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface WeatherData {
  city: string
  country: string
  current: {
    temp: number
    feels_like: number
    condition: string
    description: string
    icon: string
    humidity: number
    wind_speed: number
  }
  forecast: Array<{
    date: Date
    temp_min: number
    temp_max: number
    condition: string
    icon: string
  }>
  source: "api" | "cache" | "mock"
  cached_at?: Date
}

export interface Place {
  id: string
  name: string
  type: "attraction" | "restaurant" | "hotel" | "shopping"
  description?: string
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
  rating?: number
  price_level?: number
  photos?: string[]
  opening_hours?: string
  source: "api" | "cache" | "mock"
}

export interface Hotel {
  id: string
  name: string
  description?: string
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
  rating?: number
  price_per_night?: {
    amount: number
    currency: string
  }
  amenities?: string[]
  photos?: string[]
  booking_url?: string
  source: "api" | "cache" | "mock"
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

// ============================================================================
// API Response Types (for OpenWeatherMap and Google Places)
// ============================================================================

interface OpenWeatherResponse {
  coord: { lat: number; lon: number }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  wind: { speed: number; deg: number }
  name: string
  sys: { country: string }
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number
    main: {
      temp: number
      temp_min: number
      temp_max: number
      humidity: number
    }
    weather: Array<{ main: string; description: string; icon: string }>
    wind: { speed: number }
  }>
  city: { name: string; country: string; coord: { lat: number; lon: number } }
}

interface GooglePlacesResponse {
  results: Array<{
    place_id: string
    name: string
    types: string[]
    vicinity: string
    geometry?: {
      location: { lat: number; lng: number }
    }
    rating?: number
    price_level?: number
    photos?: Array<{ photo_reference: string }>
    opening_hours?: { open_now: boolean }
  }>
  status: string
  error_message?: string
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
  private state: CircuitBreakerState
  private readonly config: CircuitBreakerConfig
  private failureTimestamps: number[] = [] // Track recent failure times

  constructor(config: CircuitBreakerConfig) {
    this.config = config
    this.state = {
      state: "closed",
      failureCount: 0,
      lastFailureTime: null,
      lastStateChange: new Date(),
      nextAttemptTime: null
    }
  }

  /**
   * Execute an operation through the circuit breaker
   * Throws an error if the circuit is open
   */
  async execute<T>(operation: () => Promise<T>, serviceId: string): Promise<T> {
    // Check if we should allow the request
    if (!this.allowRequest()) {
      const waitTime = this.state.nextAttemptTime
        ? Math.max(0, this.state.nextAttemptTime.getTime() - Date.now())
        : this.config.resetTimeout
      throw new ApiError(
        ApiErrorType.SERVER_ERROR,
        serviceId,
        `Circuit breaker is OPEN for ${serviceId}. Too many failures. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`
      )
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Check if the request should be allowed based on circuit state
   */
  private allowRequest(): boolean {
    const now = Date.now()

    // Clean up old failure timestamps outside monitoring period
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => now - timestamp < this.config.monitoringPeriod
    )

    switch (this.state.state) {
      case "closed":
        // In closed state, check if we've exceeded the threshold
        return true

      case "open":
        // In open state, check if reset timeout has passed
        if (this.state.nextAttemptTime && now >= this.state.nextAttemptTime.getTime()) {
          this.transitionTo("half-open")
          return true
        }
        return false

      case "half-open":
        // In half-open state, allow a single request to test
        return true

      default:
        return true
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state.state === "half-open") {
      this.transitionTo("closed")
    }
    // Reset failure count on success
    this.state.failureCount = 0
    this.failureTimestamps = []
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = Date.now()
    this.state.lastFailureTime = new Date(now)
    this.failureTimestamps.push(now)

    // Clean up old timestamps
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => now - timestamp < this.config.monitoringPeriod
    )

    this.state.failureCount = this.failureTimestamps.length

    // Check if we should open the circuit
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.transitionTo("open")
    }
  }

  /**
   * Transition to a new circuit state
   */
  private transitionTo(newState: CircuitState): void {
    const now = new Date()
    this.state.state = newState
    this.state.lastStateChange = now

    if (newState === "open") {
      // Set next attempt time based on reset timeout
      this.state.nextAttemptTime = new Date(now.getTime() + this.config.resetTimeout)
    } else if (newState === "closed") {
      this.state.nextAttemptTime = null
      this.state.failureCount = 0
      this.failureTimestamps = []
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Manually reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = {
      state: "closed",
      failureCount: 0,
      lastFailureTime: null,
      lastStateChange: new Date(),
      nextAttemptTime: null
    }
    this.failureTimestamps = []
  }
}

// ============================================================================
// Retry Logic Implementation
// ============================================================================

class RetryHandler {
  private readonly config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    serviceId: string,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        // Check if we should retry
        if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateBackoff(attempt)
          if (import.meta.env.DEV) console.warn(
            `[RetryHandler] ${serviceId} request failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}). Retrying in ${delay}ms...`,
            error instanceof Error ? error.message : error
          )

          // Wait before retry, but check for abort signal
          await this.waitWithAbort(delay, abortSignal)

          continue
        }

        // Don't retry on final attempt or non-retryable errors
        throw error
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError
  }

  /**
   * Check if an error is retryable
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.type === ApiErrorType.TIMEOUT ||
             error.type === ApiErrorType.SERVER_ERROR ||
             error.type === ApiErrorType.NETWORK_ERROR
    }

    if (error instanceof TypeError) {
      // Network errors (e.g., fetch failed)
      return error.message.includes("fetch") ||
             error.message.includes("network") ||
             error.message.includes("ECONNREFUSED")
    }

    return false
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt)
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay
    return Math.min(this.config.maxDelay, exponentialDelay + jitter)
  }

  /**
   * Wait for specified duration, with abort signal support
   */
  private async waitWithAbort(delay: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), delay)

      abortSignal?.addEventListener("abort", () => {
        clearTimeout(timeout)
        reject(new Error("Retry aborted due to timeout"))
      })
    })
  }
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: Date
  ttl: number
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly DEFAULT_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = new Date()
    const age = now.getTime() - entry.timestamp.getTime()

    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear expired entries
  cleanup(): void {
    const now = new Date()
    for (const [key, entry] of this.cache.entries()) {
      const age = now.getTime() - entry.timestamp.getTime()
      if (age > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// ============================================================================
// Rate Limiter (Token Bucket Algorithm)
// ============================================================================

class RateLimiter {
  private tokens: number
  private last_refill: Date
  private readonly max_tokens: number
  private readonly refill_rate: number // tokens per millisecond
  private readonly refill_interval: number

  constructor(max_tokens: number, refill_per_second: number) {
    this.max_tokens = max_tokens
    this.tokens = max_tokens
    this.last_refill = new Date()
    this.refill_rate = refill_per_second / 1000
    this.refill_interval = 100
    void this.refill_interval
  }

  async acquire(tokens: number = 1): Promise<boolean> {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    // Wait for refill
    const wait_time = ((tokens - this.tokens) / this.refill_rate)
    await new Promise(resolve => setTimeout(resolve, wait_time))
    return this.acquire(tokens)
  }

  private refill(): void {
    const now = new Date()
    const time_passed = now.getTime() - this.last_refill.getTime()
    const tokens_to_add = time_passed * this.refill_rate

    this.tokens = Math.min(this.max_tokens, this.tokens + tokens_to_add)
    this.last_refill = now
  }

  reset(): void {
    this.tokens = this.max_tokens
    this.last_refill = new Date()
  }
}

// ============================================================================
// HTTP Fetch Wrapper with Timeout and Error Handling
// ============================================================================

class HttpFetcher {
  private readonly defaultTimeout: number
  private readonly circuitBreakers: Map<string, CircuitBreaker>
  private readonly retryHandler: RetryHandler

  constructor(defaultTimeout: number = 10000) {
    this.defaultTimeout = defaultTimeout
    this.circuitBreakers = new Map()
    this.retryHandler = new RetryHandler({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 400,
      retryableStatusCodes: new Set([408, 429, 500, 502, 503, 504]),
      retryableErrors: new Set(["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"])
    })

    // Initialize circuit breakers for different services
    this.circuitBreakers.set("openweathermap", new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 30000 // 30 seconds
    }))

    this.circuitBreakers.set("googleplaces", new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 30000 // 30 seconds
    }))

    this.circuitBreakers.set("booking", new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 90000, // 1.5 minutes
      monitoringPeriod: 45000 // 45 seconds
    }))
  }

  /**
   * Fetch with timeout, retry, and circuit breaker protection
   */
  async fetch(
    url: string,
    options: RequestInit = {},
    serviceId: string,
    timeout: number = this.defaultTimeout
  ): Promise<Response> {
    const circuitBreaker = this.circuitBreakers.get(serviceId)
    if (!circuitBreaker) {
      throw new Error(`Unknown service ID: ${serviceId}`)
    }

    // Execute through circuit breaker
    return circuitBreaker.execute(async () => {
      return this.retryHandler.execute(
        () => this.fetchWithTimeout(url, options, timeout, serviceId),
        serviceId,
        options.signal ?? undefined
      )
    }, serviceId)
  }

  /**
   * Fetch with timeout and comprehensive error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number,
    serviceId: string
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Combine abort signals if provided
      const signal = options.signal
        ? this.combineAbortSignals([controller.signal, options.signal])
        : controller.signal

      const response = await fetch(url, {
        ...options,
        signal
      })

      clearTimeout(timeoutId)

      // Handle HTTP errors with comprehensive error messages
      if (!response.ok) {
        await this.handleHttpError(response, serviceId, url)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle different error types
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(
          ApiErrorType.TIMEOUT,
          serviceId,
          `Request timeout after ${timeout}ms. Please check your connection and try again.`,
          error
        )
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new ApiError(
          ApiErrorType.NETWORK_ERROR,
          serviceId,
          `Network error. Please check your internet connection and try again.`,
          error
        )
      }

      throw error
    }
  }

  /**
   * Handle HTTP error responses with comprehensive error messages
   */
  private async handleHttpError(response: Response, serviceId: string, url: string): Promise<never> {
    let errorMessage = response.statusText
    let errorType: ApiErrorType

    try {
      // Try to get more details from response body
      const clone = response.clone()
      const body = await clone.json()

      // Parse error messages from different APIs
      if (serviceId === "openweathermap") {
        errorMessage = body.message || errorMessage
        if (body.cod === 429) {
          errorType = ApiErrorType.QUOTA_EXCEEDED
        }
      } else if (serviceId === "googleplaces") {
        errorMessage = body.error_message || errorMessage
        if (body.status === "OVER_QUERY_LIMIT") {
          errorType = ApiErrorType.QUOTA_EXCEEDED
        }
      }
    } catch {
      // If parsing fails, use status text
    }

    // Determine error type based on status code
    switch (response.status) {
      case 401:
      case 403:
        errorType = ApiErrorType.UNAUTHORIZED
        errorMessage = this.getUnauthorizedMessage(serviceId)
        break

      case 429:
        errorType = ApiErrorType.QUOTA_EXCEEDED
        errorMessage = this.getQuotaExceededMessage(serviceId)
        break

      case 408:
      case 504:
        errorType = ApiErrorType.TIMEOUT
        break

      case 500:
      case 502:
      case 503:
        errorType = ApiErrorType.SERVER_ERROR
        errorMessage = `The ${serviceId} service is currently experiencing issues. Please try again later.`
        break

      default:
        errorType = ApiErrorType.UNKNOWN
    }

    throw new ApiError(
      errorType,
      serviceId,
      `${serviceId} API error (${response.status}): ${errorMessage}`,
      { status: response.status, statusText: response.statusText, url }
    )
  }

  /**
   * Get comprehensive unauthorized error message
   */
  private getUnauthorizedMessage(serviceId: string): string {
    switch (serviceId) {
      case "openweathermap":
        return "Invalid OpenWeatherMap API key. Please check your API key configuration in settings."
      case "googleplaces":
        return "Invalid Google Places API key. Please check your API key configuration in settings. Also verify that the Places API is enabled in your Google Cloud Console."
      case "booking":
        return "Invalid Booking API key. Please check your API key configuration."
      default:
        return "Invalid API key. Please check your API key configuration in settings."
    }
  }

  /**
   * Get comprehensive quota exceeded error message
   */
  private getQuotaExceededMessage(serviceId: string): string {
    switch (serviceId) {
      case "openweathermap":
        return "OpenWeatherMap API quota exceeded. Your free tier limit has been reached. Please upgrade your plan or wait for the quota to reset (typically daily)."
      case "googleplaces":
        return "Google Places API quota exceeded. You have reached your request limit. Please check your Google Cloud Console for billing details and quota limits."
      case "booking":
        return "Booking API quota exceeded. Please check your API usage limits."
      default:
        return "API quota exceeded. Please check your service plan and usage limits."
    }
  }

  /**
   * Combine multiple abort signals into a single signal
   * Aborts if any of the signals abort
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController()

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort()
        break
      }
      signal.addEventListener("abort", () => controller.abort(), { once: true })
    }

    return controller.signal
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(serviceId: string): CircuitBreakerState | null {
    const breaker = this.circuitBreakers.get(serviceId)
    return breaker ? breaker.getState() : null
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(serviceId: string): void {
    const breaker = this.circuitBreakers.get(serviceId)
    breaker?.reset()
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
  }
}

// ============================================================================
// External API Service
// NO MOCK DATA - All data must come from real APIs or LLM
// ============================================================================

class ExternalApiService {
  private cache = new InMemoryCache()
  private weatherRateLimiter = new RateLimiter(60, 60) // 60 requests per minute
  private placesRateLimiter = new RateLimiter(100, 100) // 100 requests per 100 seconds
  private hotelRateLimiter = new RateLimiter(50, 10) // 50 requests per 10 seconds
  private httpFetcher: HttpFetcher

  // API Keys (from environment variables or runtime configuration)
  private openWeatherApiKey: string | undefined
  private googlePlacesApiKey: string | undefined
  private bookingApiKey: string | undefined

  // Default timeout for API requests (10 seconds)
  private static readonly DEFAULT_TIMEOUT = 10000

  constructor() {
    // Initialize HTTP fetcher with timeout and circuit breaker
    this.httpFetcher = new HttpFetcher(ExternalApiService.DEFAULT_TIMEOUT)

    // Try to load from global first (set by apiConfigService)
    this.openWeatherApiKey = (globalThis as any).__OPENWEATHER_API_KEY__
    this.googlePlacesApiKey = (globalThis as any).__GOOGLE_PLACES_API_KEY__
    this.bookingApiKey = (globalThis as any).__BOOKING_API_KEY__

    // Also try environment variables (for Vite build)
    if (!this.openWeatherApiKey) {
      this.openWeatherApiKey = (import.meta.env as any)?.VITE_OPENWEATHER_API_KEY
    }
    if (!this.googlePlacesApiKey) {
      this.googlePlacesApiKey = (import.meta.env as any)?.VITE_GOOGLE_PLACES_API_KEY
    }
    if (!this.bookingApiKey) {
      this.bookingApiKey = (import.meta.env as any)?.VITE_BOOKING_API_KEY
    }

    // Cleanup cache every 10 minutes
    setInterval(() => this.cache.cleanup(), 10 * 60 * 1000)
  }

  // Refresh API keys from global/storage
  refreshApiKeys(): void {
    this.openWeatherApiKey = (globalThis as any).__OPENWEATHER_API_KEY__
    this.googlePlacesApiKey = (globalThis as any).__GOOGLE_PLACES_API_KEY__
    this.bookingApiKey = (globalThis as any).__BOOKING_API_KEY__
  }

  // ========================================================================
  // Weather API (OpenWeatherMap)
  // ========================================================================

  /**
   * Get weather data for a city
   * Uses OpenWeatherMap API with caching and rate limiting
   */
  async getWeather(city: string): Promise<WeatherData> {
    const cacheKey = `weather:${city}`
    const cached = this.cache.get<WeatherData>(cacheKey)
    if (cached) {
      return { ...cached, source: "cache" }
    }

    // Check if API key is available - try proxy if not
    if (!this.openWeatherApiKey) {
      if (import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === "true") {
        const weather = await this.fetchWeatherFromProxy(city)
        this.cache.set(cacheKey, weather)
        return weather
      }
      throw new Error("OpenWeatherMap API key not configured. Please configure VITE_OPENWEATHER_API_KEY to get weather data.")
    }

    // Rate limiting
    await this.weatherRateLimiter.acquire()

    const weather = await this.fetchWeatherFromAPI(city)
    this.cache.set(cacheKey, weather)
    return weather
  }

  private async fetchWeatherFromProxy(city: string): Promise<WeatherData> {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Weather proxy error: ${response.status}`)
    }
    const data = await response.json()
    const current = data.current
    const forecast = data.forecast

    // Process forecast data
    const dailyForecast: WeatherData["forecast"] = []
    if (forecast?.list) {
      const processedDates = new Set<string>()
      for (const item of forecast.list) {
        const date = new Date(item.dt * 1000)
        const dateKey = date.toISOString().split("T")[0]
        if (!processedDates.has(dateKey) && date.getHours() >= 11 && date.getHours() <= 13) {
          dailyForecast.push({
            date,
            temp_min: item.main.temp_min,
            temp_max: item.main.temp_max,
            condition: item.weather[0]?.main || "Unknown",
            icon: item.weather[0]?.icon || "01d",
          })
          processedDates.add(dateKey)
        }
        if (dailyForecast.length >= 5) break
      }
    }

    return {
      city: current.name || city,
      country: current.sys?.country || "",
      current: {
        temp: current.main?.temp ?? 0,
        feels_like: current.main?.feels_like ?? 0,
        humidity: current.main?.humidity ?? 0,
        condition: current.weather?.[0]?.main || "Unknown",
        description: current.weather?.[0]?.description || "",
        icon: current.weather?.[0]?.icon || "01d",
        wind_speed: current.wind?.speed ?? 0,
      },
      forecast: dailyForecast,
      source: "api",
    }
  }

  private async fetchWeatherFromAPI(city: string): Promise<WeatherData> {
    // Get current weather with timeout, retry, and circuit breaker
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${this.openWeatherApiKey}&units=metric&lang=zh_cn`
    const currentResponse = await this.httpFetcher.fetch(currentUrl, {}, "openweathermap", ExternalApiService.DEFAULT_TIMEOUT)

    const currentData = (await currentResponse.json()) as OpenWeatherResponse

    // Get 5-day forecast with timeout, retry, and circuit breaker
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${this.openWeatherApiKey}&units=metric&lang=zh_cn`
    const forecastResponse = await this.httpFetcher.fetch(forecastUrl, {}, "openweathermap", ExternalApiService.DEFAULT_TIMEOUT)

    const forecastData = (await forecastResponse.json()) as OpenWeatherForecastResponse

    // Process forecast data (get one reading per day at noon)
    const dailyForecast: WeatherData["forecast"] = []
    const processedDates = new Set<string>()

    for (const item of forecastData.list) {
      const date = new Date(item.dt * 1000)
      const dateKey = date.toISOString().split("T")[0]

      if (!processedDates.has(dateKey) && date.getHours() >= 11 && date.getHours() <= 13) {
        dailyForecast.push({
          date,
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          condition: item.weather[0]?.main || "Unknown",
          icon: item.weather[0]?.icon || "01d",
        })
        processedDates.add(dateKey)
      }

      if (dailyForecast.length >= 5) break
    }

    return {
      city: currentData.name || city,
      country: currentData.sys.country || "",
      current: {
        temp: Math.round(currentData.main.temp),
        feels_like: Math.round(currentData.main.feels_like),
        condition: currentData.weather[0]?.main || "Unknown",
        description: currentData.weather[0]?.description || "",
        icon: currentData.weather[0]?.icon || "01d",
        humidity: currentData.main.humidity,
        wind_speed: currentData.wind.speed,
      },
      forecast: dailyForecast,
      source: "api",
    }
  }

  // REMOVED: getMockWeather - no mock data fallback

  // ========================================================================
  // Places API (Google Places)
  // ========================================================================

  /**
   * Search for places (attractions, restaurants, etc.)
   * Uses Google Places API with caching and rate limiting
   */
  async searchPlaces(query: string, location: string, type: "attraction" | "restaurant" | "hotel" | "shopping" = "attraction"): Promise<Place[]> {
    const cacheKey = `places:${type}:${query}:${location}`
    const cached = this.cache.get<Place[]>(cacheKey)
    if (cached) {
      return cached.map(p => ({ ...p, source: "cache" as const }))
    }

    // Check if API key is available - try proxy if not
    if (!this.googlePlacesApiKey) {
      if (import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === "true") {
        const places = await this.fetchPlacesFromProxy(query, location, type)
        this.cache.set(cacheKey, places)
        return places
      }
      throw new Error("Google Places API key not configured. Please configure VITE_GOOGLE_PLACES_API_KEY to get place recommendations.")
    }

    // Rate limiting
    await this.placesRateLimiter.acquire()

    const places = await this.fetchPlacesFromAPI(query, location, type)
    this.cache.set(cacheKey, places)
    return places
  }

  private async fetchPlacesFromProxy(query: string, location: string, type: string): Promise<Place[]> {
    const typeMap: Record<string, string> = {
      attraction: "tourist_attraction",
      restaurant: "restaurant",
      hotel: "lodging",
      shopping: "shopping_mall",
    }
    const googleType = typeMap[type] || "establishment"
    const params = new URLSearchParams({
      action: "search",
      query,
      location,
      type: googleType,
    })
    const response = await fetch(`/api/places?${params}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Places proxy error: ${response.status}`)
    }
    const data = await response.json()
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${data.error_message || data.status}`)
    }
    return (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: type as Place["type"],
      description: place.types?.join(", "),
      address: place.vicinity || "",
      coordinates: place.geometry?.location ? {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      } : undefined,
      rating: place.rating,
      price_level: place.price_level,
      photos: place.photos?.map((p: any) => p.proxy_url || ""),
      opening_hours: place.opening_hours ? (place.opening_hours.open_now ? "营业中" : "已打烊") : undefined,
      source: "api" as const,
    }))
  }

  private async fetchPlacesFromAPI(query: string, location: string, type: string): Promise<Place[]> {
    // First, geocode the location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.googlePlacesApiKey}`
    const geocodeResponse = await fetch(geocodeUrl)

    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding API error: ${geocodeResponse.statusText}`)
    }

    const geocodeData = await geocodeResponse.json()
    const coords = geocodeData.results[0]?.geometry?.location

    if (!coords) {
      throw new Error("Could not geocode location")
    }

    // Map type to Google Places type
    const typeMap: Record<string, string> = {
      attraction: "tourist_attraction",
      restaurant: "restaurant",
      hotel: "lodging",
      shopping: "shopping_mall",
    }

    const googleType = typeMap[type] || "establishment"

    // Search for places
    const searchQuery = `${query} ${location}`.trim()
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${coords.lat},${coords.lng}&radius=10000&type=${googleType}&key=${this.googlePlacesApiKey}&language=zh`
    const placesResponse = await fetch(placesUrl)

    if (!placesResponse.ok) {
      throw new Error(`Places API error: ${placesResponse.statusText}`)
    }

    const placesData = (await placesResponse.json()) as GooglePlacesResponse

    if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${placesData.error_message || placesData.status}`)
    }

    return placesData.results.map(place => ({
      id: place.place_id,
      name: place.name,
      type: type as Place["type"],
      description: place.types?.join(", "),
      address: place.vicinity || "",
      coordinates: place.geometry?.location ? {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      } : undefined,
      rating: place.rating,
      price_level: place.price_level,
      photos: place.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${this.googlePlacesApiKey}`),
      opening_hours: place.opening_hours ? (place.opening_hours.open_now ? "营业中" : "已打烊") : undefined,
      source: "api" as const,
    }))
  }

  // REMOVED: getMockPlaces - no mock data fallback

  // ========================================================================
  // Hotels API (now uses Google Places API)
  // ========================================================================

  /**
   * Search for hotels in a location
   * Uses Google Places API to search for lodging
   */
  async searchHotels(location: string, dates: DateRange): Promise<Hotel[]> {
    const cacheKey = `hotels:${location}:${dates.startDate.toISOString()}:${dates.endDate.toISOString()}`
    const cached = this.cache.get<Hotel[]>(cacheKey)

    if (cached) {
      return cached.map(h => ({ ...h, source: "cache" as const }))
    }

    // Check if API key is available (proxy mode is handled by searchPlaces)
    if (!this.googlePlacesApiKey && !import.meta.env.PROD && import.meta.env.VITE_USE_PROXY !== "true") {
      throw new Error("Google Places API key not configured. Please configure VITE_GOOGLE_PLACES_API_KEY to get hotel recommendations.")
    }

    // Rate limiting
    await this.hotelRateLimiter.acquire()

    // Use Google Places API to search for hotels/lodging
    const places = await this.searchPlaces("hotel", location, "hotel")

    // Convert Place results to Hotel format
    const hotels: Hotel[] = places.map(place => ({
      id: place.id,
      name: place.name,
      description: place.description,
      address: place.address,
      coordinates: place.coordinates,
      rating: place.rating,
      price_per_night: place.price_level ? {
        amount: this.estimatePriceFromPriceLevel(place.price_level),
        currency: "CNY"
      } : undefined,
      photos: place.photos,
      source: place.source,
    }))

    this.cache.set(cacheKey, hotels)
    return hotels
  }

  /**
   * Estimate nightly price from Google Places price_level
   * price_level: 0=Free, 1=Inexpensive, 2=Moderate, 3=Expensive, 4=Very Expensive
   */
  private estimatePriceFromPriceLevel(priceLevel: number): number {
    // Rough estimates in CNY
    const estimates = [0, 200, 400, 800, 1500]
    return estimates[priceLevel] || 400
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Check if API keys are configured
   */
  getApiStatus(): {
    openWeatherMap: boolean
    googlePlaces: boolean
    booking: boolean
  } {
    return {
      openWeatherMap: !!this.openWeatherApiKey,
      googlePlaces: !!this.googlePlacesApiKey,
      booking: !!this.bookingApiKey,
    }
  }

  /**
   * Set API keys (for client-side configuration)
   */
  setApiKeys(keys: {
    openWeatherMap?: string
    googlePlaces?: string
    booking?: string
  }): void {
    if (keys.openWeatherMap !== undefined) {
      if (keys.openWeatherMap) {
        (globalThis as any).__OPENWEATHER_API_KEY__ = keys.openWeatherMap
        this.openWeatherApiKey = keys.openWeatherMap
      } else {
        delete (globalThis as any).__OPENWEATHER_API_KEY__
        this.openWeatherApiKey = undefined
      }
    }
    if (keys.googlePlaces !== undefined) {
      if (keys.googlePlaces) {
        (globalThis as any).__GOOGLE_PLACES_API_KEY__ = keys.googlePlaces
        this.googlePlacesApiKey = keys.googlePlaces
      } else {
        delete (globalThis as any).__GOOGLE_PLACES_API_KEY__
        this.googlePlacesApiKey = undefined
      }
    }
    if (keys.booking !== undefined) {
      if (keys.booking) {
        (globalThis as any).__BOOKING_API_KEY__ = keys.booking
        this.bookingApiKey = keys.booking
      } else {
        delete (globalThis as any).__BOOKING_API_KEY__
        this.bookingApiKey = undefined
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const externalApiService = new ExternalApiService()

// Export types and service class for testing
export { ExternalApiService, InMemoryCache, RateLimiter }
