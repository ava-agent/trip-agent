import { useToolResultStore, generateResultKey } from './toolResultStore'
import { llmResourceService } from './llmResourceService'
import type { DayPlan, Activity } from '@/types'

/**
 * 天气数据
 */
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
}

/**
 * 地点详情数据
 */
export interface PlaceDetails {
  id: string
  name: string
  description?: string
  openingHours?: string
  rating?: number
  price?: string
  images?: string[]
  location?: {
    lat: number
    lng: number
  }
  tips?: string[]
}

/**
 * 交通信息
 */
export interface TransportInfo {
  from: string
  to: string
  duration: string
  cost: string
  method: string
  instructions?: string[]
}

/**
 * 景点详情数据
 */
export interface AttractionData {
  id: string
  name: string
  description?: string
  category?: string
  rating?: number
  reviews?: number
  price?: string
  openingHours?: string
  recommendedDuration?: string
  bestTimeToVisit?: string
  tips?: string[]
  images?: string[]
  location?: {
    lat: number
    lng: number
  }
}

/**
 * 增强的行程数据
 */
export interface EnhancedItinerary {
  days: EnhancedDayPlan[]
  weatherForecast?: WeatherData[]
  recommendations?: {
    attractions?: AttractionData[]
    restaurants?: PlaceDetails[]
    accommodations?: PlaceDetails[]
  }
}

/**
 * 增强的行程日
 */
export interface EnhancedDayPlan extends DayPlan {
  weather?: WeatherData
  enhancedActivities?: EnhancedActivity[]
  transportSuggestions?: TransportInfo[]
}

/**
 * 增强的活动
 */
export interface EnhancedActivity extends Activity {
  placeDetails?: PlaceDetails
  transportFromPrevious?: TransportInfo
  crowdLevel?: 'low' | 'medium' | 'high'
  weatherSuitability?: 'excellent' | 'good' | 'fair' | 'poor'
}

/**
 * 行程增强服务
 */
export class ItineraryEnhancer {
  /**
   * 增强行程数据
   */
  static async enhanceItinerary(
    destination: string,
    startDate: string,
    endDate: string,
    days: DayPlan[]
  ): Promise<EnhancedItinerary> {
    const enhancedDays: EnhancedDayPlan[] = []

    // 并行获取所有必要数据
    const [weatherData, attractionData] = await Promise.all([
      this.fetchWeatherData(destination, startDate, endDate),
      this.fetchAttractionData(destination)
    ])

    // 为每一天添加增强数据
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const dayDate = new Date(startDate)
      dayDate.setDate(dayDate.getDate() + i)

      const enhancedDay: EnhancedDayPlan = {
        ...day,
        weather: weatherData.find(w => w.date === dayDate.toISOString().split('T')[0]),
        enhancedActivities: await this.enhanceActivities(day.activities, destination, attractionData),
        transportSuggestions: await this.fetchTransportInfo(day.activities, destination)
      }

      enhancedDays.push(enhancedDay)
    }

    return {
      days: enhancedDays,
      weatherForecast: weatherData,
      recommendations: {
        attractions: attractionData
      }
    }
  }

  /**
   * 增强活动列表
   */
  private static async enhanceActivities(
    activities: Activity[],
    _destination: string,
    attractionData: AttractionData[]
  ): Promise<EnhancedActivity[]> {
    return Promise.all(
      activities.map(async (activity) => {
        // 查找匹配的景点数据
        const locationName = activity.location.name || ""
        const placeInfo = attractionData.find(a =>
          a.name.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(a.name.toLowerCase())
        )

        return {
          ...activity,
          placeDetails: placeInfo,
          crowdLevel: await this.predictCrowdLevel(locationName, activity.time.start),
          weatherSuitability: this.assessWeatherSuitability(activity)
        }
      })
    )
  }

  /**
   * 获取天气数据（使用 LLM 生成）
   */
  private static async fetchWeatherData(
    destination: string,
    startDate: string,
    endDate: string
  ): Promise<WeatherData[]> {
    const cacheKey = generateResultKey('weather', { destination, startDate, endDate })
    const cached = useToolResultStore.getState().getResult(cacheKey)

    if (cached?.status === 'success') {
      return cached.result as WeatherData[]
    }

    try {
      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'weather',
        result: undefined,
        status: 'loading'
      })

      // 生成日期列表
      const dates: string[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }

      // 使用 LLM 生成天气数据
      let weatherData: WeatherData[] = []

      if (llmResourceService.isAvailable()) {
        console.log('[ItineraryEnhancer] 使用 LLM 生成天气数据')
        weatherData = await llmResourceService.generateWeatherBatch(destination, dates)
      } else {
        console.warn('[ItineraryEnhancer] LLM 未配置，使用模拟天气数据')
        // 使用模拟数据作为降级方案
        weatherData = dates.map(date => ({
          date,
          temperature: { min: 15, max: 25 },
          condition: '晴朗',
          icon: 'sunny',
          humidity: 60,
          precipitation: 0,
          description: '适合出游'
        }))
      }

      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'weather',
        result: weatherData,
        status: 'success'
      })

      return weatherData
    } catch (error) {
      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'weather',
        result: undefined,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch weather'
      })
      return []
    }
  }

  /**
   * 获取景点数据（使用 LLM 生成）
   */
  private static async fetchAttractionData(destination: string): Promise<AttractionData[]> {
    const cacheKey = generateResultKey('attractions', { destination })
    const cached = useToolResultStore.getState().getResult(cacheKey)

    if (cached?.status === 'success') {
      return cached.result as AttractionData[]
    }

    try {
      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'attractions',
        result: undefined,
        status: 'loading'
      })

      let attractionsData: AttractionData[] = []

      if (llmResourceService.isAvailable()) {
        console.log('[ItineraryEnhancer] 使用 LLM 生成景点数据')
        const llmAttractions = await llmResourceService.generateAttractions(destination, 10)

        // 转换 LLM 返回的数据格式为本地格式
        attractionsData = llmAttractions.map(attr => ({
          id: attr.id,
          name: attr.name,
          description: attr.description,
          category: attr.category,
          rating: attr.rating,
          reviews: attr.reviews,
          price: attr.price,
          openingHours: attr.openingHours,
          recommendedDuration: attr.recommendedDuration,
          bestTimeToVisit: attr.bestTimeToVisit,
          tips: attr.tips,
          images: [],
          location: attr.location
        }))
      } else {
        console.warn('[ItineraryEnhancer] LLM 未配置，使用模拟景点数据')
        // 使用模拟数据作为降级方案
        attractionsData = [
          {
            id: '1',
            name: `${destination}标志性景点`,
            description: `${destination}的著名景点，值得一游`,
            category: '观光',
            rating: 4.5,
            reviews: 5000,
            price: '价格合理',
            openingHours: '9:00-17:00',
            recommendedDuration: '2-3小时',
            bestTimeToVisit: '上午',
            tips: ['建议提前规划路线', '注意天气变化'],
            images: []
          }
        ]
      }

      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'attractions',
        result: attractionsData,
        status: 'success'
      })

      return attractionsData
    } catch (error) {
      useToolResultStore.getState().setResult(cacheKey, {
        toolName: 'attractions',
        result: undefined,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch attractions'
      })
      return []
    }
  }

  /**
   * 获取交通信息
   */
  private static async fetchTransportInfo(activities: Activity[], destination: string): Promise<TransportInfo[]> {
    const transports: TransportInfo[] = []

    for (let i = 1; i < activities.length; i++) {
      const from = activities[i - 1].location.name || "未知地点"
      const to = activities[i].location.name || "未知地点"

      const cacheKey = generateResultKey('transport', { from, to, destination })
      const cached = useToolResultStore.getState().getResult(cacheKey)

      if (cached?.status === 'success') {
        transports.push(cached.result as TransportInfo)
        continue
      }

      try {
        useToolResultStore.getState().setResult(cacheKey, {
          toolName: 'transport',
          result: undefined,
          status: 'loading'
        })

        // TODO: 实际调用交通 API
        const mockTransport: TransportInfo = {
          from,
          to,
          duration: '30 分钟',
          cost: '200 日元',
          method: '地铁',
          instructions: ['从附近车站乘坐 JR 线', '换乘地铁银座线', '在目的地站下车']
        }

        useToolResultStore.getState().setResult(cacheKey, {
          toolName: 'transport',
          result: mockTransport,
          status: 'success'
        })

        transports.push(mockTransport)
      } catch (error) {
        useToolResultStore.getState().setResult(cacheKey, {
          toolName: 'transport',
          result: undefined,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to fetch transport'
        })
      }
    }

    return transports
  }

  /**
   * 预测拥挤程度
   */
  private static async predictCrowdLevel(_location: string, time: string): Promise<'low' | 'medium' | 'high'> {
    // 基于时间的简单预测
    const hour = parseInt(time.split(':')[0])

    if (hour >= 9 && hour <= 11) return 'high'
    if (hour >= 14 && hour <= 16) return 'high'
    if (hour >= 18 && hour <= 20) return 'medium'
    return 'low'
  }

  /**
   * 评估天气适宜性
   */
  private static assessWeatherSuitability(activity: Activity): 'excellent' | 'good' | 'fair' | 'poor' {
    // 基于 activity 类型的简单评估
    if (activity.type === 'attraction') {
      return 'good' // TODO: 应该基于实际天气数据
    }
    return 'excellent'
  }
}

/**
 * 导出便捷函数
 */
export function enhanceItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  days: DayPlan[]
): Promise<EnhancedItinerary> {
  return ItineraryEnhancer.enhanceItinerary(destination, startDate, endDate, days)
}

/**
 * 导出 hook
 */
export function useEnhancedItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  days: DayPlan[],
  enabled: boolean = true
) {
  const key = generateResultKey('enhanced-itinerary', { destination, startDate, endDate, days })
  const { getResult, setResult, hasValidResult } = useToolResultStore()

  const cached = getResult(key)
  const isValid = enabled && hasValidResult(key)

  const enhance = async () => {
    setResult(key, { toolName: 'enhanced-itinerary', result: undefined, status: 'loading' })
    try {
      const result = await ItineraryEnhancer.enhanceItinerary(destination, startDate, endDate, days)
      setResult(key, { toolName: 'enhanced-itinerary', result, status: 'success' })
    } catch (error) {
      setResult(key, {
        toolName: 'enhanced-itinerary',
        result: undefined,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to enhance itinerary'
      })
    }
  }

  if (!isValid && enabled) {
    enhance()
  }

  return {
    data: cached?.result as EnhancedItinerary | undefined,
    error: cached?.error,
    isLoading: cached?.status === 'loading' || (!isValid && enabled),
    refetch: enhance
  }
}
