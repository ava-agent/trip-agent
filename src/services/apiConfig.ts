/**
 * API Configuration Service
 * Manages external API keys and configuration
 * NOTE: In production, API calls should go through a backend proxy
 */

interface ApiConfig {
  openWeatherMap: string | null
  googlePlaces: string | null
  booking: string | null
}

class ApiConfigService {
  private config: ApiConfig = {
    openWeatherMap: null,
    googlePlaces: null,
    booking: null,
  }

  // Load config from localStorage
  load(): void {
    try {
      const stored = localStorage.getItem("trip-agent-api-config")
      if (stored) {
        this.config = JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Failed to load API config from localStorage:", error)
    }
  }

  // Save config to localStorage
  private save(): void {
    try {
      localStorage.setItem("trip-agent-api-config", JSON.stringify(this.config))
    } catch (error) {
      console.warn("Failed to save API config to localStorage:", error)
    }
  }

  // Set API key
  setApiKey(service: keyof ApiConfig, key: string): void {
    this.config[service] = key || null
    this.save()

    // Also update globalThis for externalApiService
    const globalKeyMap: Record<keyof ApiConfig, string> = {
      openWeatherMap: "__OPENWEATHER_API_KEY__",
      googlePlaces: "__GOOGLE_PLACES_API_KEY__",
      booking: "__BOOKING_API_KEY__",
    }

    if (key) {
      ;(globalThis as any)[globalKeyMap[service]] = key
    } else {
      delete (globalThis as any)[globalKeyMap[service]]
    }
  }

  // Get API key
  getApiKey(service: keyof ApiConfig): string | null {
    return this.config[service]
  }

  // Get all config
  getAll(): ApiConfig {
    return { ...this.config }
  }

  // Clear all config
  clear(): void {
    this.config = {
      openWeatherMap: null,
      googlePlaces: null,
      booking: null,
    }
    this.save()

    // Clear global keys
    delete (globalThis as any).__OPENWEATHER_API_KEY__
    delete (globalThis as any).__GOOGLE_PLACES_API_KEY__
    delete (globalThis as any).__BOOKING_API_KEY__
  }

  // Check if service is configured
  isConfigured(service: keyof ApiConfig): boolean {
    return !!this.config[service]
  }

  // Get configured services
  getConfiguredServices(): (keyof ApiConfig)[] {
    return (Object.keys(this.config) as (keyof ApiConfig)[]).filter(
      (key) => !!this.config[key]
    )
  }
}

// Export singleton instance
export const apiConfigService = new ApiConfigService()

// Load config on module initialization
apiConfigService.load()
