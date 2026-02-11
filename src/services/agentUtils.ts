/**
 * Shared utility functions for Multi-Agent System
 */

import { externalApiService } from "./externalApiService"
import type { WeatherData, Place, Hotel } from "./externalApiService"

export type TripInfo = {
  destination: string | null
  days: number
}

/**
 * Normalize destination name to Chinese
 */
function normalizeDestination(input: string): string | null {
  const destinationMap: Record<string, string> = {
    // English -> Chinese mapping (case-insensitive)
    "shanghai": "上海",
    "beijing": "北京",
    "tokyo": "东京",
    "paris": "巴黎",
    "newyork": "纽约",
    "new york": "纽约",
    "london": "伦敦",
    "hongkong": "香港",
    "hong kong": "香港",
    "seoul": "首尔",
    "singapore": "新加坡",
    "bangkok": "曼谷",
    "dubai": "迪拜",
    "sydney": "悉尼",
    "rome": "罗马",
    "barcelona": "巴塞罗那",
    "osaka": "大阪",
    "kyoto": "京都",
    "nice": "尼斯",
    "losangeles": "洛杉矶",
    "los angeles": "洛杉矶",
    "huaqiao": "花桥",
    "hua qiao": "花桥",
    // Chinese destinations (already correct)
    "花桥": "花桥",
    "东京": "东京",
    "巴黎": "巴黎",
    "纽约": "纽约",
    "伦敦": "伦敦",
    "北京": "北京",
    "上海": "上海",
    "香港": "香港",
    "首尔": "首尔",
    "新加坡": "新加坡",
    "曼谷": "曼谷",
    "迪拜": "迪拜",
    "悉尼": "悉尼",
    "罗马": "罗马",
    "巴塞罗那": "巴塞罗那",
    "大阪": "大阪",
    "京都": "京都",
    "尼斯": "尼斯",
    "洛杉矶": "洛杉矶",
  }

  const normalizedInput = input.toLowerCase().replace(/\s+/g, "")
  console.log('[normalizeDestination] Normalized input:', normalizedInput)

  for (const [key, value] of Object.entries(destinationMap)) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, "")
    if (normalizedInput === normalizedKey || normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
      console.log('[normalizeDestination] Matched:', key, '->', value)
      return value
    }
  }

  // Check if input itself matches a Chinese destination
  const chineseDestinations = ["东京", "巴黎", "纽约", "伦敦", "北京", "上海", "香港", "首尔", "新加坡", "曼谷", "迪拜", "悉尼", "罗马", "巴塞罗那", "大阪", "京都", "尼斯", "洛杉矶", "花桥"]
  for (const dest of chineseDestinations) {
    if (input.includes(dest)) {
      console.log('[normalizeDestination] Matched Chinese destination:', dest)
      return dest
    }
  }

  console.log('[normalizeDestination] No match found for:', input)
  return null
}

/**
 * Context collected from A2UI questions
 */
export type ExistingContext = Partial<{
  destination: string
  days: number
  budget: { min: number; max: number; currency: string }
  startDate: Date
  preferences: string[]
}>

/**
 * Extract trip information from user message
 * @param message - The user's message
 * @param existingContext - Optional context collected from A2UI questions
 */
export function extractTripInfo(message: string, existingContext?: ExistingContext): TripInfo {
  // Extract destination (support both English and Chinese)
  let destination: string | null = null

  // Remove common suffixes first (like "5天", "天游", etc.) to get clean destination
  const cleanedMessage = message
    .replace(/(\d+)\s*(?:[天日][游旅]*|days?)/gi, "")
    .replace(/[游旅]计划|行程|旅游|trip|travel/gi, "")
    .trim()

  console.log('[extractTripInfo] Original message:', message)
  console.log('[extractTripInfo] Cleaned message:', cleanedMessage)
  console.log('[extractTripInfo] Existing context:', existingContext)

  // Try to extract destination from the cleaned message
  if (cleanedMessage) {
    destination = normalizeDestination(cleanedMessage)
    console.log('[extractTripInfo] Normalized destination from message:', destination)
  }

  // IMPORTANT: Use existingContext.destination ONLY if not found in message (from A2UI)
  // This preserves A2UI-collected context when answering follow-up questions
  if (!destination && existingContext?.destination) {
    destination = existingContext.destination
    console.log('[extractTripInfo] Using destination from existingContext:', destination)
  }

  // Extract days (支持 "5天", "5日", "5 days", "Paris 5" 等格式)
  // First try with unit suffixes
  let daysMatch = message.match(/(\d+)\s*(?:天|日|days?)/i)
  if (!daysMatch) {
    // Try standalone number at the end of message (e.g., "NewYork 10")
    daysMatch = message.match(/(\d+)$/)
  }

  let days = daysMatch ? parseInt(daysMatch[1]) : 0

  // IMPORTANT: Use existingContext.days ONLY if not found in message (from A2UI)
  if (days === 0 && existingContext?.days !== undefined) {
    days = existingContext.days
    console.log('[extractTripInfo] Using days from existingContext:', days)
  }

  console.log('[extractTripInfo] Final result:', { destination, days })
  return { destination, days }
}

/**
 * Analyze user intent from message
 */
export function analyzeIntent(message: string): { label: string; agents: string[] } {
  const intents = [
    { keywords: ["规划", "行程", "怎么玩", "旅游", "游"], label: "规划行程", agents: ["planner", "recommender"] },
    { keywords: ["推荐", "好玩", "必去", "看什么"], label: "获取推荐", agents: ["recommender"] },
    { keywords: ["预订", "买票", "酒店", "机票", "住"], label: "预订服务", agents: ["booking"] },
    { keywords: ["导出", "下载", "PDF", "保存"], label: "导出文档", agents: ["document"] },
  ]

  for (const intent of intents) {
    if (intent.keywords.some((k) => message.includes(k))) {
      return { label: intent.label, agents: intent.agents }
    }
  }

  return { label: "一般咨询", agents: ["planner", "recommender"] }
}

/**
 * Get weather forecast (uses external API or falls back to mock)
 */
export async function getWeatherForecast(city?: string): Promise<{ condition: string; temp: string; source: string }> {
  if (city) {
    try {
      const weatherData: WeatherData = await externalApiService.getWeather(city)
      return {
        condition: weatherData.current.description || weatherData.current.condition,
        temp: `${weatherData.current.temp}°C`,
        source: weatherData.source,
      }
    } catch (error) {
      console.warn("Failed to fetch weather, using fallback:", error)
    }
  }

  // Fallback to mock
  const weathers = [
    { condition: "晴天", temp: "22°C" },
    { condition: "多云", temp: "20°C" },
    { condition: "阴天", temp: "18°C" },
  ]
  const mock = weathers[Math.floor(Math.random() * weathers.length)]
  return { ...mock, source: "mock" }
}

/**
 * Get country for destination
 */
export function getCountry(destination: string): string {
  const countryMap: Record<string, string> = {
    东京: "日本",
    大阪: "日本",
    京都: "日本",
    巴黎: "法国",
    尼斯: "法国",
    纽约: "美国",
    洛杉矶: "美国",
    伦敦: "英国",
    北京: "中国",
    上海: "中国",
    香港: "中国",
    首尔: "韩国",
    新加坡: "新加坡",
    曼谷: "泰国",
    迪拜: "阿联酋",
    悉尼: "澳大利亚",
    罗马: "意大利",
    巴塞罗那: "西班牙",
  }
  return countryMap[destination] || "未知"
}

/**
 * Search attractions using external API or fallback to mock
 */
export async function searchAttractions(destination: string): Promise<Place[]> {
  try {
    return await externalApiService.searchPlaces("attractions tourist spots", destination, "attraction")
  } catch (error) {
    console.warn("Failed to search attractions, using fallback:", error)
    return []
  }
}

/**
 * Search restaurants using external API or fallback to mock
 */
export async function searchRestaurants(destination: string): Promise<Place[]> {
  try {
    return await externalApiService.searchPlaces("restaurants food dining", destination, "restaurant")
  } catch (error) {
    console.warn("Failed to search restaurants, using fallback:", error)
    return []
  }
}

/**
 * Search hotels using external API or fallback to mock
 */
export async function searchHotels(destination: string, startDate?: Date, endDate?: Date): Promise<Hotel[]> {
  try {
    const dates = {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    }
    return await externalApiService.searchHotels(destination, dates)
  } catch (error) {
    console.warn("Failed to search hotels, using fallback:", error)
    return []
  }
}

/**
 * Format weather data for display
 */
export function formatWeatherData(weather: WeatherData): string {
  const { current, city, source } = weather
  const sourceLabel = source === "api" ? "" : source === "cache" ? " (缓存)" : " (模拟)"
  return `${city}: ${current.description}, ${current.temp}°C${sourceLabel}`
}

/**
 * Format place data for display
 */
export function formatPlaceData(place: Place): string {
  const rating = place.rating ? ` (${place.rating.toFixed(1)}★)` : ""
  return `${place.name}${rating} - ${place.address}`
}
