/**
 * MCP Inline Server Implementation
 * Provides built-in tools that run within the application
 */

import type { McpInlineServerConfig, McpTool, McpToolResult, McpInlineExecutionContext } from "./types"
import { externalApiService } from "../externalApiService"

// ============================================================================
// Built-in MCP Tools
// ============================================================================

/**
 * Get current date and time
 */
async function getCurrentDate(_params: unknown, _context?: McpInlineExecutionContext): Promise<McpToolResult> {
  const now = new Date()

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("zh-CN"),
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }, null, 2)
    }]
  }
}

/**
 * Get weather for a location
 */
async function getWeather(params: unknown, _context?: McpInlineExecutionContext): Promise<McpToolResult> {
  const args = params as { location?: string }

  if (!args.location) {
    return {
      content: [{
        type: "text",
        text: "Error: location parameter is required"
      }],
      isError: true
    }
  }

  try {
    const weather = await externalApiService.getWeather(args.location)

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          location: weather.city,
          country: weather.country,
          current: {
            temp: weather.current.temp,
            condition: weather.current.condition,
            description: weather.current.description,
            humidity: weather.current.humidity,
            wind_speed: weather.current.wind_speed
          },
          forecast: weather.forecast.slice(0, 3).map(f => ({
            date: f.date.toISOString().split("T")[0],
            temp_min: f.temp_min,
            temp_max: f.temp_max,
            condition: f.condition
          }))
        }, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error fetching weather"
      }],
      isError: true
    }
  }
}

/**
 * Search for places (attractions, restaurants, hotels)
 */
async function searchPlaces(params: unknown, _context?: McpInlineExecutionContext): Promise<McpToolResult> {
  const args = params as {
    query?: string
    location?: string
    type?: "attraction" | "restaurant" | "hotel" | "shopping"
  }

  if (!args.query || !args.location) {
    return {
      content: [{
        type: "text",
        text: "Error: query and location parameters are required"
      }],
      isError: true
    }
  }

  try {
    const type = args.type || "attraction"
    const places = await externalApiService.searchPlaces(args.query, args.location, type)

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          query: args.query,
          location: args.location,
          type: type,
          results: places.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            address: p.address,
            rating: p.rating,
            price_level: p.price_level,
            source: p.source
          }))
        }, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error searching places"
      }],
      isError: true
    }
  }
}

/**
 * Search for hotels
 */
async function searchHotels(params: unknown, _context?: McpInlineExecutionContext): Promise<McpToolResult> {
  const args = params as {
    location?: string
    checkIn?: string
    checkOut?: string
  }

  if (!args.location) {
    return {
      content: [{
        type: "text",
        text: "Error: location parameter is required"
      }],
      isError: true
    }
  }

  try {
    const startDate = args.checkIn ? new Date(args.checkIn) : new Date()
    const endDate = args.checkOut ? new Date(args.checkOut) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)

    const hotels = await externalApiService.searchHotels(args.location, {
      startDate,
      endDate
    })

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          location: args.location,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          results: hotels.slice(0, 10).map(h => ({
            id: h.id,
            name: h.name,
            description: h.description,
            address: h.address,
            rating: h.rating,
            price_per_night: h.price_per_night,
            source: h.source
          }))
        }, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error searching hotels"
      }],
      isError: true
    }
  }
}

/**
 * Calculate distance and estimated travel time between two locations
 */
async function calculateDistance(params: unknown, _context?: McpInlineExecutionContext): Promise<McpToolResult> {
  const args = params as {
    from?: { lat: number; lng: number; name: string }
    to?: { lat: number; lng: number; name: string }
    mode?: "driving" | "walking" | "transit"
  }

  if (!args.from || !args.to) {
    return {
      content: [{
        type: "text",
        text: "Error: from and to parameters are required"
      }],
      isError: true
    }
  }

  try {
    // Calculate distance using Haversine formula
    const R = 6371 // Earth's radius in km
    const dLat = toRadians(args.to.lat - args.from.lat)
    const dLon = toRadians(args.to.lng - args.from.lng)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(args.from.lat)) * Math.cos(toRadians(args.to.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // Estimate travel time based on mode
    const mode = args.mode || "driving"
    let speed = 30 // km/h average for driving

    if (mode === "walking") {
      speed = 5 // km/h average walking speed
    } else if (mode === "transit") {
      speed = 20 // km/h average for public transit
    }

    const travelTime = Math.round((distance / speed) * 60) // in minutes

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          from: args.from.name,
          to: args.to.name,
          distance: Math.round(distance),
          distance_unit: "km",
          mode: mode,
          travel_time: travelTime,
          travel_time_unit: "minutes"
        }, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error calculating distance"
      }],
      isError: true
    }
  }
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const BUILTIN_TOOLS: McpTool[] = [
  {
    name: "get_current_date",
    description: "获取当前日期和时间",
    inputSchema: {
      type: "object",
      description: "返回当前日期和时间信息",
      properties: {},
      required: []
    },
    handler: getCurrentDate
  },
  {
    name: "get_weather",
    description: "获取指定地点的天气信息",
    inputSchema: {
      type: "object",
      description: "获取城市天气数据，包括当前天气和预报",
      properties: {
        location: {
          type: "string",
          description: "城市名称，例如：Tokyo、Paris、New York"
        }
      },
      required: ["location"]
    },
    handler: getWeather
  },
  {
    name: "search_places",
    description: "搜索地点（景点、餐厅、酒店）",
    inputSchema: {
      type: "object",
      description: "根据关键词和位置搜索地点",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词，例如：museum、sushi、luxury hotel"
        },
        location: {
          type: "string",
          description: "搜索位置，例如：Tokyo、Paris、New York"
        },
        type: {
          type: "string",
          description: "地点类型",
          enum: ["attraction", "restaurant", "hotel", "shopping"],
          default: "attraction"
        }
      },
      required: ["query", "location"]
    },
    handler: searchPlaces
  },
  {
    name: "search_hotels",
    description: "搜索酒店",
    inputSchema: {
      type: "object",
      description: "根据位置和日期搜索酒店",
      properties: {
        location: {
          type: "string",
          description: "搜索位置"
        },
        checkIn: {
          type: "string",
          description: "入住日期 (YYYY-MM-DD)"
        },
        checkOut: {
          type: "string",
          description: "退房日期 (YYYY-MM-DD)"
        }
      },
      required: ["location"]
    },
    handler: searchHotels
  },
  {
    name: "calculate_distance",
    description: "计算两地之间的距离和预计旅行时间",
    inputSchema: {
      type: "object",
      description: "使用经纬度坐标计算距离",
      properties: {
        from: {
          type: "object",
          description: "起点位置",
          properties: {
            lat: { type: "number", description: "纬度" },
            lng: { type: "number", description: "经度" },
            name: { type: "string", description: "位置名称" }
          },
          required: ["lat", "lng", "name"]
        },
        to: {
          type: "object",
          description: "终点位置",
          properties: {
            lat: { type: "number", description: "纬度" },
            lng: { type: "number", description: "经度" },
            name: { type: "string", description: "位置名称" }
          },
          required: ["lat", "lng", "name"]
        },
        mode: {
          type: "string",
          description: "出行方式",
          enum: ["driving", "walking", "transit"],
          default: "driving"
        }
      },
      required: ["from", "to"]
    },
    handler: calculateDistance
  }
]

// ============================================================================
// Inline Server Config
// ============================================================================

export const INLINE_SERVER_CONFIG: McpInlineServerConfig = {
  name: "builtin",
  tools: BUILTIN_TOOLS,
  capabilities: {
    tools: true,
    resources: false,
    prompts: false
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

export function getBuiltinTools(): McpTool[] {
  return BUILTIN_TOOLS
}

export function getTool(name: string): McpTool | undefined {
  return BUILTIN_TOOLS.find(t => t.name === name)
}

export function getToolNames(): string[] {
  return BUILTIN_TOOLS.map(t => t.name)
}
