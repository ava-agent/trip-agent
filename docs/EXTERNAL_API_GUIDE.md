# External API Integration Guide

## Overview

The Trip Agent MVP now integrates with real external APIs for weather data, places search, and hotel availability. The system includes:

- **OpenWeatherMap API** - Current weather and 5-day forecasts
- **Google Places API** - Attractions, restaurants, and points of interest
- **Hotel API** - Mock data (can be extended with Booking.com API)

## Features

- **Caching** - Responses are cached for 1 hour to reduce API calls
- **Rate Limiting** - Token bucket algorithm prevents API quota exhaustion
- **Graceful Fallback** - Automatically falls back to mock data when APIs are unavailable
- **Source Tracking** - Each response indicates its source (api/cache/mock)

## Configuration

### Method 1: Environment Variables (Production)

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Add your API keys to `.env`:

```env
VITE_OPENWEATHER_API_KEY=your_openweathermap_api_key_here
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
VITE_BOOKING_API_KEY=your_booking_api_key_here
```

3. Restart the development server:

```bash
npm run dev
```

### Method 2: Runtime Configuration (Development)

For browser-based development, you can set API keys at runtime using the `apiConfigService`:

```typescript
import { apiConfigService } from '@/services/apiConfig'

// Set API keys
apiConfigService.setApiKey('openWeatherMap', 'your_api_key')
apiConfigService.setApiKey('googlePlaces', 'your_api_key')

// Check configuration status
const configured = apiConfigService.getConfiguredServices()
console.log('Configured services:', configured)

// Clear all keys
apiConfigService.clear()
```

## Getting API Keys

### OpenWeatherMap API (Free)

1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to API Keys section
4. Copy your API key

**Free Tier Limits:**
- 60 calls/minute
- 1,000,000 calls/month

### Google Places API (Free Tier Available)

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Places API" for your project
4. Create credentials (API Key)
5. Restrict the key to "Places API" only
6. Enable "Maps JavaScript API" for additional features

**Free Tier Limits:**
- $200 free credit per month
- After that: $2.83 per 1000 requests

### Booking.com API (Optional)

Note: Booking.com API requires partner approval. For MVP purposes, the system uses mock data for hotels.

## API Endpoints

### Weather

```typescript
import { externalApiService } from '@/services/externalApiService'

const weather = await externalApiService.getWeather('Tokyo')
console.log(weather.current.temp) // 22
console.log(weather.forecast) // 5-day forecast
```

### Places

```typescript
const attractions = await externalApiService.searchPlaces(
  'attractions tourist spots',
  'Paris',
  'attraction'
)

const restaurants = await externalApiService.searchPlaces(
  'restaurants food dining',
  'Tokyo',
  'restaurant'
)
```

### Hotels

```typescript
const hotels = await externalApiService.searchHotels(
  'New York',
  {
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-05')
  }
)
```

## Caching

The system automatically caches responses for 1 hour. You can:

```typescript
// Clear all cached data
externalApiService.clearCache()

// Check cache status (responses include source field)
const weather = await externalApiService.getWeather('London')
console.log(weather.source) // 'api' | 'cache' | 'mock'
```

## Rate Limiting

Rate limiting is automatically handled using the token bucket algorithm:

- Weather API: 60 requests/minute
- Places API: 100 requests/100 seconds
- Hotels API: 50 requests/10 seconds

## Mock Fallback

When API keys are not configured or APIs are unavailable, the system automatically falls back to mock data:

```typescript
const weather = await externalApiService.getWeather('Unknown City')
console.log(weather.source) // 'mock'
```

## Testing

To test with mock data only:

```typescript
// Disable API keys temporarily
apiConfigService.clear()

// All calls will use mock data
const weather = await externalApiService.getWeather('Tokyo')
console.log(weather.source) // 'mock'
```

## Security Notes

**Important:** In production, API calls should go through a backend proxy to:

1. Hide API keys from client-side code
2. Implement additional rate limiting
3. Log and monitor API usage
4. Handle authentication securely

For this MVP, keys are stored in localStorage for development convenience only.

## Troubleshooting

### API Returns 401 Unauthorized

Check that your API key is correct and properly set:

```typescript
console.log(externalApiService.getApiStatus())
```

### CORS Errors

Some APIs may block browser requests. Solutions:

1. Use a backend proxy
2. Enable CORS for your API key
3. Use a CORS proxy for development only

### Rate Limit Errors

The system handles rate limiting automatically, but you may see delays during high usage. Consider:

1. Increasing cache duration
2. Implementing request queuing
3. Using a backend to aggregate requests

## Type Definitions

All API responses are fully typed:

```typescript
import type { WeatherData, Place, Hotel } from '@/services/externalApiService'

const weather: WeatherData = {
  city: 'Tokyo',
  country: 'JP',
  current: { temp: 22, ... },
  forecast: [...],
  source: 'api'
}
```

## Future Enhancements

- [ ] Add Booking.com API integration
- [ ] Implement flight search API
- [ ] Add currency conversion
- [ ] Implement offline mode with service workers
- [ ] Add request retry logic with exponential backoff
