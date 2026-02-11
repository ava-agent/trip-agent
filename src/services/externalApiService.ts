/**
 * External API Integration Service
 * Integrates with OpenWeatherMap, Google Places, and hotel booking APIs
 * Features: caching, rate limiting, graceful fallback to mock data
 */

// ============================================================================
// Types
// ============================================================================

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
    this.refill_interval = 100 // refill check every 100ms
    void this.refill_interval // Mark as intentionally unused for future use
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
// External API Service
// NO MOCK DATA - All data must come from real APIs or LLM
// ============================================================================

class ExternalApiService {
  private cache = new InMemoryCache()
  private weatherRateLimiter = new RateLimiter(60, 60) // 60 requests per minute
  private placesRateLimiter = new RateLimiter(100, 100) // 100 requests per 100 seconds
  private hotelRateLimiter = new RateLimiter(50, 10) // 50 requests per 10 seconds

  // API Keys (from environment variables or runtime configuration)
  private openWeatherApiKey: string | undefined
  private googlePlacesApiKey: string | undefined
  private bookingApiKey: string | undefined

  constructor() {
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

    // Check if API key is available
    if (!this.openWeatherApiKey) {
      throw new Error("OpenWeatherMap API key not configured. Please configure VITE_OPENWEATHER_API_KEY to get weather data.")
    }

    // Rate limiting
    await this.weatherRateLimiter.acquire()

    const weather = await this.fetchWeatherFromAPI(city)
    this.cache.set(cacheKey, weather)
    return weather
  }

  private async fetchWeatherFromAPI(city: string): Promise<WeatherData> {
    // Get current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${this.openWeatherApiKey}&units=metric&lang=zh_cn`
    const currentResponse = await fetch(currentUrl)

    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.statusText}`)
    }

    const currentData = (await currentResponse.json()) as OpenWeatherResponse

    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${this.openWeatherApiKey}&units=metric&lang=zh_cn`
    const forecastResponse = await fetch(forecastUrl)

    if (!forecastResponse.ok) {
      throw new Error(`Weather forecast API error: ${forecastResponse.statusText}`)
    }

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

    // Check if API key is available
    if (!this.googlePlacesApiKey) {
      throw new Error("Google Places API key not configured. Please configure VITE_GOOGLE_PLACES_API_KEY to get place recommendations.")
    }

    // Rate limiting
    await this.placesRateLimiter.acquire()

    const places = await this.fetchPlacesFromAPI(query, location, type)
    this.cache.set(cacheKey, places)
    return places
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

    // Check if API key is available
    if (!this.googlePlacesApiKey) {
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
