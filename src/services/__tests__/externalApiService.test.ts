/**
 * External API Service Tests
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ExternalApiService, InMemoryCache, RateLimiter } from '../externalApiService'

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

describe('ExternalApiService', () => {
  let service: ExternalApiService

  beforeEach(() => {
    service = new ExternalApiService()
  })

  it('should throw error when no API key is configured for weather', async () => {
    await expect(service.getWeather('Tokyo')).rejects.toThrow('OpenWeatherMap API key not configured')
  })

  it('should throw error when no API key is configured for places', async () => {
    await expect(service.searchPlaces('attractions', 'Paris', 'attraction')).rejects.toThrow('Google Places API key not configured')
  })

  it('should throw error when no API key is configured for hotels', async () => {
    await expect(service.searchHotels('New York', {
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    })).rejects.toThrow('Google Places API key not configured')
  })

  it('should report API status correctly when no keys set', () => {
    const status = service.getApiStatus()
    expect(status).toHaveProperty('openWeatherMap')
    expect(status).toHaveProperty('googlePlaces')
    expect(status).toHaveProperty('booking')
    // When no keys are set, all should be false
    expect(status.openWeatherMap).toBe(false)
    expect(status.googlePlaces).toBe(false)
    expect(status.booking).toBe(false)
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

  it('should clear cache without errors', () => {
    // Clear cache should not throw
    expect(() => service.clearCache()).not.toThrow()
  })
})

