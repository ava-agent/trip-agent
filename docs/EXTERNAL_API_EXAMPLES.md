/**
 * External API Service Usage Examples
 *
 * This file demonstrates how to use the external API service
 * Copy these examples into your components or services as needed
 */

import { externalApiService } from '@/services/externalApiService'
import { apiConfigService } from '@/services/apiConfig'
import type { WeatherData, Place, Hotel } from '@/services/externalApiService'

// ============================================================================
// Configuration Examples
// ============================================================================

/**
 * Example 1: Configure API keys at runtime
 */
export async function configureApiKeys() {
  // Set API keys
  apiConfigService.setApiKey('openWeatherMap', 'your_openweathermap_api_key')
  apiConfigService.setApiKey('googlePlaces', 'your_google_places_api_key')

  // Check what's configured
  const configured = apiConfigService.getConfiguredServices()
  console.log('Configured services:', configured)

  // Check specific service
  if (apiConfigService.isConfigured('openWeatherMap')) {
    console.log('OpenWeatherMap is ready to use')
  }
}

/**
 * Example 2: Get API status
 */
export function getApiStatus() {
  const status = externalApiService.getApiStatus()
  console.log('API Status:', status)
  // Output: { openWeatherMap: true, googlePlaces: true, booking: false }
}

// ============================================================================
// Weather API Examples
// ============================================================================

/**
 * Example 3: Get current weather for a city
 */
export async function getCurrentWeather(city: string) {
  const weather: WeatherData = await externalApiService.getWeather(city)

  console.log(`Weather in ${weather.city}:`)
  console.log(`- Temperature: ${weather.current.temp}°C`)
  console.log(`- Feels like: ${weather.current.feels_like}°C`)
  console.log(`- Condition: ${weather.current.description}`)
  console.log(`- Humidity: ${weather.current.humidity}%`)
  console.log(`- Data source: ${weather.source}`)

  return weather
}

/**
 * Example 4: Get weather forecast
 */
export async function getWeatherForecast(city: string) {
  const weather: WeatherData = await externalApiService.getWeather(city)

  console.log(`5-Day Forecast for ${city}:`)
  weather.forecast.forEach((day, index) => {
    console.log(`Day ${index + 1} (${day.date.toDateString()}):`)
    console.log(`- High: ${day.temp_max}°C, Low: ${day.temp_min}°C`)
    console.log(`- Condition: ${day.condition}`)
  })
}

/**
 * Example 5: Display weather with source indicator
 */
export function formatWeatherDisplay(weather: WeatherData): string {
  const sourceLabel = {
    api: '',
    cache: ' (from cache)',
    mock: ' (demo data)'
  }[weather.source]

  return `${weather.city}: ${weather.current.description}, ${weather.current.temp}°C${sourceLabel}`
}

// ============================================================================
// Places API Examples
// ============================================================================

/**
 * Example 6: Search for attractions
 */
export async function searchAttractions(destination: string) {
  const places: Place[] = await externalApiService.searchPlaces(
    'attractions tourist spots landmarks',
    destination,
    'attraction'
  )

  console.log(`Found ${places.length} attractions in ${destination}:`)
  places.forEach((place, index) => {
    console.log(`${index + 1}. ${place.name}`)
    console.log(`   Address: ${place.address}`)
    if (place.rating) {
      console.log(`   Rating: ${place.rating}★`)
    }
    console.log(`   Source: ${place.source}`)
  })

  return places
}

/**
 * Example 7: Search for restaurants
 */
export async function searchRestaurants(destination: string) {
  const places: Place[] = await externalApiService.searchPlaces(
    'restaurants food dining cuisine',
    destination,
    'restaurant'
  )

  // Filter by rating
  const topRated = places.filter(p => p.rating && p.rating >= 4.5)

  console.log(`Top-rated restaurants in ${destination}:`)
  topRated.forEach(place => {
    console.log(`- ${place.name} (${place.rating}★)`)
    console.log(`  ${place.description || ''}`)
  })

  return topRated
}

/**
 * Example 8: Search for shopping
 */
export async function searchShopping(destination: string) {
  const places: Place[] = await externalApiService.searchPlaces(
    'shopping malls markets boutiques',
    destination,
    'shopping'
  )

  return places
}

// ============================================================================
// Hotels API Examples
// ============================================================================

/**
 * Example 9: Search for hotels
 */
export async function searchHotels(destination: string, checkIn: Date, checkOut: Date) {
  const hotels: Hotel[] = await externalApiService.searchHotels(destination, {
    startDate: checkIn,
    endDate: checkOut
  })

  console.log(`Found ${hotels.length} hotels in ${destination}:`)
  hotels.forEach((hotel, index) => {
    console.log(`${index + 1}. ${hotel.name}`)
    if (hotel.rating) {
      console.log(`   Rating: ${hotel.rating}★`)
    }
    if (hotel.price_per_night) {
      console.log(`   Price: ${hotel.price_per_night.amount} ${hotel.price_per_night.currency}/night`)
    }
    if (hotel.amenities) {
      console.log(`   Amenities: ${hotel.amenities.join(', ')}`)
    }
  })

  return hotels
}

/**
 * Example 10: Filter hotels by price range
 */
export async function findHotelsByBudget(
  destination: string,
  maxPricePerNight: number,
  checkIn: Date,
  checkOut: Date
) {
  const hotels: Hotel[] = await externalApiService.searchHotels(destination, {
    startDate: checkIn,
    endDate: checkOut
  })

  const affordable = hotels.filter(h =>
    h.price_per_night && h.price_per_night.amount <= maxPricePerNight
  )

  console.log(`Hotels under ${maxPricePerNight}/night:`)
  affordable.forEach(h => {
    console.log(`- ${h.name}: ${h.price_per_night?.amount}`)
  })

  return affordable
}

// ============================================================================
// Caching Examples
// ============================================================================

/**
 * Example 11: Clear cache
 */
export function clearAllCaches() {
  externalApiService.clearCache()
  console.log('All caches cleared')
}

/**
 * Example 12: Check if data is from cache
 */
export async function getDataWithCacheInfo(city: string) {
  // First call - will be from API or mock
  const weather1 = await externalApiService.getWeather(city)
  console.log(`First call source: ${weather1.source}`)

  // Second call - will be from cache (if API was used)
  const weather2 = await externalApiService.getWeather(city)
  console.log(`Second call source: ${weather2.source}`)
}

// ============================================================================
// Error Handling Examples
// ============================================================================

/**
 * Example 13: Handle API failures gracefully
 */
export async function getWeatherWithErrorHandling(city: string) {
  try {
    const weather = await externalApiService.getWeather(city)

    if (weather.source === 'mock') {
      console.warn('Using mock data - API key may not be configured')
    }

    return weather
  } catch (error) {
    console.error('Failed to fetch weather:', error)

    // Return fallback mock data
    return {
      city,
      country: '',
      current: {
        temp: 20,
        feels_like: 18,
        condition: 'Unknown',
        description: 'Data unavailable',
        icon: '',
        humidity: 50,
        wind_speed: 5
      },
      forecast: [],
      source: 'mock'
    } as WeatherData
  }
}

/**
 * Example 14: Batch requests with error handling
 */
export async function getMultipleDestinationsWeather(cities: string[]) {
  const results = await Promise.allSettled(
    cities.map(city => externalApiService.getWeather(city))
  )

  const successful: WeatherData[] = []
  const failed: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      failed.push(cities[index])
    }
  })

  console.log(`Successfully fetched ${successful.length} weather reports`)
  console.log(`Failed for ${failed.length} cities: ${failed.join(', ')}`)

  return { successful, failed }
}

// ============================================================================
// Integration with Multi-Agent System
// ============================================================================

/**
 * Example 15: Use with Planner Agent
 */
export async function planWithRealData(destination: string, days: number) {
  // Get weather for the destination
  const weather = await externalApiService.getWeather(destination)

  // Get attractions
  const attractions = await externalApiService.searchPlaces(
    'attractions',
    destination,
    'attraction'
  )

  // Get restaurants
  const restaurants = await externalApiService.searchPlaces(
    'restaurants',
    destination,
    'restaurant'
  )

  // Generate itinerary using real data
  const itinerary = {
    destination,
    days,
    weather: {
      current: weather.current,
      forecast: weather.forecast.slice(0, days)
    },
    attractions: attractions.slice(0, days * 2).map(a => ({
      name: a.name,
      address: a.address,
      rating: a.rating
    })),
    restaurants: restaurants.slice(0, days).map(r => ({
      name: r.name,
      address: r.address,
      rating: r.rating
    }))
  }

  return itinerary
}

/**
 * Example 16: Refresh API keys and retry
 */
export async function refreshAndRetry(city: string) {
  // Set new API key
  apiConfigService.setApiKey('openWeatherMap', 'new_api_key')

  // Refresh service
  externalApiService.setApiKeys({ openWeatherMap: 'new_api_key' })

  // Clear cache to force fresh data
  externalApiService.clearCache()

  // Retry request
  const weather = await externalApiService.getWeather(city)
  return weather
}

// ============================================================================
// Complete Usage Example
// ============================================================================

/**
 * Example 17: Complete trip planning with external APIs
 */
export async function planCompleteTrip(destination: string, days: number) {
  console.log(`Planning ${days}-day trip to ${destination}...`)

  // Step 1: Configure API keys (in real app, do this once at startup)
  // apiConfigService.setApiKey('openWeatherMap', 'your_key')
  // apiConfigService.setApiKey('googlePlaces', 'your_key')

  // Step 2: Get weather
  console.log('\n1. Fetching weather data...')
  const weather = await externalApiService.getWeather(destination)
  console.log(`   Current: ${weather.current.temp}°C, ${weather.current.description}`)

  // Step 3: Get attractions
  console.log('\n2. Finding attractions...')
  const attractions = await externalApiService.searchPlaces(
    'tourist attractions landmarks',
    destination,
    'attraction'
  )
  console.log(`   Found ${attractions.length} attractions`)

  // Step 4: Get restaurants
  console.log('\n3. Finding restaurants...')
  const restaurants = await externalApiService.searchPlaces(
    'restaurants food dining',
    destination,
    'restaurant'
  )
  console.log(`   Found ${restaurants.length} restaurants`)

  // Step 5: Get hotels
  console.log('\n4. Searching hotels...')
  const startDate = new Date()
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const hotels = await externalApiService.searchHotels(destination, {
    startDate,
    endDate
  })
  console.log(`   Found ${hotels.length} hotels`)

  // Step 6: Compile trip plan
  console.log('\n5. Creating itinerary...')
  const tripPlan = {
    destination,
    dates: { start: startDate, end: endDate },
    days,
    weather: {
      current: weather.current,
      forecast: weather.forecast.slice(0, days)
    },
    recommendations: {
      topAttractions: attractions.slice(0, 5),
      topRestaurants: restaurants
        .filter(r => r.rating && r.rating >= 4.5)
        .slice(0, 5),
      hotels: hotels.slice(0, 3)
    },
    dataSource: {
      weather: weather.source,
      places: attractions[0]?.source || 'unknown',
      hotels: hotels[0]?.source || 'unknown'
    }
  }

  return tripPlan
}
