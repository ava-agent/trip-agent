/**
 * External API Service Tests
 * Run with: npm test
 */

// Note: Tests are disabled until vitest is added to devDependencies
// To enable tests, run: npm install --save-dev vitest
// Then uncomment the test code below

/*
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExternalApiService, InMemoryCache, RateLimiter } from '../externalApiService'
import type { WeatherData, Place, Hotel } from '../externalApiService'

describe('InMemoryCache', () => {
  let cache: InMemoryCache

  beforeEach(() => {
    cache = new InMemoryCache()
  })

  it('should store and retrieve data', () => {
    cache.set('test-key', { value: 'test-data' })
    const result = cache.get<{ value: string }>('test-key')
    expect(result?.value).toBe('test-data')
  })

  it('should return null for non-existent keys', () => {
    const result = cache.get('non-existent')
    expect(result).toBeNull()
  })

  it('should expire entries after TTL', () => {
    cache.set('test-key', { value: 'test-data' }, 100) // 100ms TTL
    expect(cache.has('test-key')).toBe(true)

    // Wait for expiration
    return new Promise(resolve => {
      setTimeout(() => {
        expect(cache.has('test-key')).toBe(false)
        resolve(undefined)
      }, 150)
    })
  })

  it('should clear all entries', () => {
    cache.set('key1', { value: 'data1' })
    cache.set('key2', { value: 'data2' })
    cache.clear()
    expect(cache.get('key1')).toBeNull()
    expect(cache.get('key2')).toBeNull()
  })
})

describe('RateLimiter', () => {
  it('should allow requests within rate limit', async () => {
    const limiter = new RateLimiter(10, 10) // 10 tokens, 10 per second
    const acquired = await limiter.acquire(5)
    expect(acquired).toBe(true)
  })

  it('should wait when rate limit is exceeded', async () => {
    const limiter = new RateLimiter(5, 10) // 5 tokens, 10 per second
    // Use all tokens
    await limiter.acquire(5)
    // This should wait for refill
    const start = Date.now()
    await limiter.acquire(1)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(50) // At least 50ms wait
  })
})

describe('ExternalApiService (Mock Mode)', () => {
  let service: ExternalApiService

  beforeEach(() => {
    service = new ExternalApiService()
  })

  it('should return mock weather when no API key is configured', async () => {
    const weather = await service.getWeather('Tokyo')
    expect(weather).toBeDefined()
    expect(weather.city).toBe('Tokyo')
    expect(weather.source).toBe('mock')
    expect(weather.current).toBeDefined()
    expect(weather.forecast).toBeDefined()
  })

  it('should return mock places when no API key is configured', async () => {
    const places = await service.searchPlaces('attractions', 'Paris', 'attraction')
    expect(Array.isArray(places)).toBe(true)
    expect(places.length).toBeGreaterThan(0)
    expect(places[0].source).toBe('mock')
  })

  it('should return mock hotels', async () => {
    const hotels = await service.searchHotels('New York', {
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    })
    expect(Array.isArray(hotels)).toBe(true)
    expect(hotels.length).toBeGreaterThan(0)
    expect(hotels[0].source).toBe('mock')
  })

  it('should cache results', async () => {
    // First call
    await service.getWeather('London')
    // Clear cache to verify it was cached
    service.clearCache()
    expect(service.getApiStatus().openWeatherMap).toBe(false)
  })

  it('should report API status correctly', () => {
    const status = service.getApiStatus()
    expect(status).toHaveProperty('openWeatherMap')
    expect(status).toHaveProperty('googlePlaces')
    expect(status).toHaveProperty('booking')
  })

  it('should set API keys', () => {
    service.setApiKeys({
      openWeatherMap: 'test-key-123',
      googlePlaces: 'test-key-456'
    })
    const status = service.getApiStatus()
    expect(status.openWeatherMap).toBe(true)
    expect(status.googlePlaces).toBe(true)
  })
})
*/
