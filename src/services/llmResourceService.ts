/**
 * LLM 资源生成服务
 * 使用 LLM 生成天气、景点、酒店等旅行资源数据
 * 避免外部 API 费用
 */

import { LLMService, type LLMMessage } from "./llmService"

// ============================================================================
// 类型定义
// ============================================================================

export interface WeatherData {
  date: string
  temperature: {
    min: number
    max: number
  }
  condition: string
  icon: string
  humidity: number
  precipitation: number
  description: string
}

export interface AttractionData {
  id: string
  name: string
  description: string
  category: string
  rating: number
  reviews: number
  price: string
  openingHours: string
  recommendedDuration: string
  bestTimeToVisit: string
  tips: string[]
  location?: {
    lat: number
    lng: number
  }
}

export interface HotelData {
  id: string
  name: string
  description: string
  address: string
  rating: number
  pricePerNight: {
    amount: number
    currency: string
  }
  amenities: string[]
  roomTypes: string[]
  bookingUrl?: string
  location?: {
    lat: number
    lng: number
  }
}

export interface RestaurantData {
  id: string
  name: string
  description: string
  cuisine: string
  priceRange: string
  rating: number
  address: string
  openingHours: string
  specialties: string[]
}

// ============================================================================
// 提示词模板
// ============================================================================

const PROMPTS = {
  /**
   * 天气数据生成提示词
   */
  WEATHER: (destination: string, date: string): LLMMessage[] => [
    {
      role: "system",
      content: `你是一个专业的天气数据服务。请根据目的地和日期，生成合理的天气预报数据。

请严格按照以下 JSON 格式返回，不要添加任何其他文字：
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "temperature": { "min": 最低温度(数字), "max": 最高温度(数字) },
  "condition": "天气状况(晴朗/多云/小雨/大雨/阴天)",
  "icon": "图标名称(sunny/cloudy/rainy)",
  "humidity": 湿度(0-100的数字),
  "precipitation": 降水概率(0-100的数字),
  "description": "天气描述(一句话，包含温度体感和建议)"
}
\`\`\`

注意：
1. 温度要符合目的地的季节特点
2. 湿度和降水要合理
3. 描述要包含穿衣建议`
    },
    {
      role: "user",
      content: `请生成 ${destination} 在 ${date} 的天气预报数据。`
    }
  ],

  /**
   * 景点数据生成提示词
   */
  ATTRACTIONS: (destination: string, count: number = 10): LLMMessage[] => [
    {
      role: "system",
      content: `你是一个专业的旅游景点推荐服务。请根据目的地，生成该地的热门旅游景点数据。

请严格按照以下 JSON 数组格式返回：
\`\`\`json
[
  {
    "id": "唯一ID(如attr-1)",
    "name": "景点名称",
    "description": "景点描述(30-50字)",
    "category": "类别(自然风光/历史人文/主题公园/博物馆/宗教建筑/购物街区/夜生活)",
    "rating": 评分(4.0-5.0之间的小数),
    "reviews": 评论数(1000-50000之间的数字),
    "price": "价格信息(如: 成人120元/免费)",
    "openingHours": "开放时间(如: 9:00-17:00)",
    "recommendedDuration": "建议游览时间(如: 2-3小时)",
    "bestTimeToVisit": "最佳游览时间(如: 上午或傍晚时分)",
    "tips": ["游览建议1", "游览建议2"]
  }
]
\`\`\`

要求：
1. 生成 ${count} 个不同类型的景点
2. 包含当地最知名的景点
3. 数据要真实可信
4. 价格和开放时间要合理`
    },
    {
      role: "user",
      content: `请推荐 ${destination} 的热门旅游景点。`
    }
  ],

  /**
   * 酒店数据生成提示词
   */
  HOTELS: (destination: string, count: number = 5): LLMMessage[] => [
    {
      role: "system",
      content: `你是一个专业的酒店推荐服务。请根据目的地，生成该地的酒店住宿推荐数据。

请严格按照以下 JSON 数组格式返回：
\`\`\`json
[
  {
    "id": "唯一ID(如hotel-1)",
    "name": "酒店名称",
    "description": "酒店描述(30-50字，突出特色)",
    "address": "酒店地址",
    "rating": 评分(3.5-5.0之间的小数),
    "pricePerNight": {
      "amount": 价格(数字),
      "currency": "CNY"
    },
    "amenities": ["设施1", "设施2"],
    "roomTypes": ["房型1", "房型2"]
  }
]
\`\`\`

要求：
1. 生成 ${count} 家不同档次的酒店（经济型、中档、高档）
2. 价格要符合当地消费水平
3. 包含常见的酒店设施
4. 地址要包含区域信息`
    },
    {
      role: "user",
      content: `请推荐 ${destination} 的酒店住宿。`
    }
  ],

  /**
   * 餐厅数据生成提示词
   */
  RESTAURANTS: (destination: string, count: number = 5): LLMMessage[] => [
    {
      role: "system",
      content: `你是一个专业的餐厅推荐服务。请根据目的地，生成该地的特色餐厅数据。

请严格按照以下 JSON 数组格式返回：
\`\`\`json
[
  {
    "id": "唯一ID(如rest-1)",
    "name": "餐厅名称",
    "description": "餐厅描述(30-50字)",
    "cuisine": "菜系类型",
    "priceRange": "价格区间(如: ¥¥/中档)",
    "rating": 评分(3.5-5.0之间的小数),
    "address": "餐厅地址",
    "openingHours": "营业时间",
    "specialties": ["特色菜1", "特色菜2"]
  }
]
\`\`\`

要求：
1. 生成 ${count} 家不同类型的餐厅
2. 包含当地特色菜系
3. 价格区间要多样化
4. 特色菜要具体`
    },
    {
      role: "user",
      content: `请推荐 ${destination} 的特色餐厅。`
    }
  ]
}

// ============================================================================
// JSON 解析工具
// ============================================================================

/**
 * 从 LLM 响应中提取 JSON
 */
function extractJSON(content: string): string {
  // 移除 markdown 代码块标记
  let cleaned = content.trim()

  // 移除 ```json 和 ``` 标记
  cleaned = cleaned.replace(/```json\s*/gi, "")
  cleaned = cleaned.replace(/```\s*$/gi, "")

  // 尝试找到第一个 { 和最后一个 }
  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace !== -1 && lastBrace !== -1) {
    return cleaned.substring(firstBrace, lastBrace + 1)
  }

  // 尝试找到第一个 [ 和最后一个 ]
  const firstBracket = cleaned.indexOf("[")
  const lastBracket = cleaned.lastIndexOf("]")

  if (firstBracket !== -1 && lastBracket !== -1) {
    return cleaned.substring(firstBracket, lastBracket + 1)
  }

  return cleaned
}

/**
 * 安全解析 JSON
 */
function safeParseJSON<T>(content: string, fallback: T): T {
  try {
    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as T
  } catch (error) {
    console.warn("[LLMResourceService] JSON parse error, using fallback:", error)
    return fallback
  }
}

// ============================================================================
// LLM 资源生成服务
// ============================================================================

export class LLMResourceService {
  private static retryCount = 3
  private static retryDelay = 1000

  /**
   * 检查服务是否可用
   */
  static isAvailable(): boolean {
    return LLMService.isConfigured()
  }

  /**
   * 生成天气数据
   */
  static async generateWeather(
    destination: string,
    date: string
  ): Promise<WeatherData | null> {
    if (!this.isAvailable()) {
      console.warn("[LLMResourceService] GLM not configured")
      return null
    }

    const messages = PROMPTS.WEATHER(destination, date)

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const response = await LLMService.chatCompletion(messages)

        const defaultWeather: WeatherData = {
          date,
          temperature: { min: 18, max: 25 },
          condition: "晴朗",
          icon: "sunny",
          humidity: 60,
          precipitation: 0,
          description: "天气晴朗，适合出游"
        }

        return safeParseJSON<WeatherData>(response, defaultWeather)
      } catch (error) {
        console.error(`[LLMResourceService] Weather generation attempt ${attempt + 1} failed:`, error)

        if (attempt < this.retryCount - 1) {
          await this.sleep(this.retryDelay * (attempt + 1))
        }
      }
    }

    return null
  }

  /**
   * 批量生成天气数据
   */
  static async generateWeatherBatch(
    destination: string,
    dates: string[]
  ): Promise<WeatherData[]> {
    const results: WeatherData[] = []

    for (const date of dates) {
      const weather = await this.generateWeather(destination, date)
      if (weather) {
        results.push(weather)
      } else {
        // 生成默认数据
        results.push({
          date,
          temperature: { min: 18, max: 25 },
          condition: "晴朗",
          icon: "sunny",
          humidity: 60,
          precipitation: 0,
          description: "适合出游"
        })
      }
    }

    return results
  }

  /**
   * 生成景点数据
   */
  static async generateAttractions(
    destination: string,
    count: number = 10
  ): Promise<AttractionData[]> {
    if (!this.isAvailable()) {
      console.warn("[LLMResourceService] GLM not configured")
      return []
    }

    const messages = PROMPTS.ATTRACTIONS(destination, count)

    try {
      const response = await LLMService.chatCompletion(messages)
      return safeParseJSON<AttractionData[]>(response, [])
    } catch (error) {
      console.error("[LLMResourceService] Attractions generation failed:", error)
      return []
    }
  }

  /**
   * 生成酒店数据
   */
  static async generateHotels(
    destination: string,
    count: number = 5
  ): Promise<HotelData[]> {
    if (!this.isAvailable()) {
      console.warn("[LLMResourceService] GLM not configured")
      return []
    }

    const messages = PROMPTS.HOTELS(destination, count)

    try {
      const response = await LLMService.chatCompletion(messages)
      return safeParseJSON<HotelData[]>(response, [])
    } catch (error) {
      console.error("[LLMResourceService] Hotels generation failed:", error)
      return []
    }
  }

  /**
   * 生成餐厅数据
   */
  static async generateRestaurants(
    destination: string,
    count: number = 5
  ): Promise<RestaurantData[]> {
    if (!this.isAvailable()) {
      console.warn("[LLMResourceService] GLM not configured")
      return []
    }

    const messages = PROMPTS.RESTAURANTS(destination, count)

    try {
      const response = await LLMService.chatCompletion(messages)
      return safeParseJSON<RestaurantData[]>(response, [])
    } catch (error) {
      console.error("[LLMResourceService] Restaurants generation failed:", error)
      return []
    }
  }

  /**
   * 生成所有资源数据（并行）
   */
  static async generateAllResources(destination: string, dates: string[]) {
    const [weather, attractions, hotels, restaurants] = await Promise.all([
      this.generateWeatherBatch(destination, dates),
      this.generateAttractions(destination, 10),
      this.generateHotels(destination, 5),
      this.generateRestaurants(destination, 5)
    ])

    return {
      weather,
      attractions,
      hotels,
      restaurants
    }
  }

  /**
   * 睡眠工具
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const llmResourceService = LLMResourceService
