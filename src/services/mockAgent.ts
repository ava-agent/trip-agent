/**
 * Mock Agent Service for Trip Agent MVP
 * Simulates AI agent responses for trip planning
 */

import type { Trip, DayPlan, UserPreferences } from "@/types"

export interface AgentResponse {
  message: string
  trip?: Trip
  suggestions?: string[]
}

export interface AgentRequest {
  type: "plan_trip" | "recommend" | "book" | "export"
  data: unknown
}

/**
 * Mock Agent Service
 */
export class MockAgentService {
  /**
   * 处理用户请求并生成响应
   */
  static async processRequest(request: AgentRequest): Promise<AgentResponse> {
    switch (request.type) {
      case "plan_trip":
        return this.planTrip(request.data as { destination: string; days: number; preferences?: Partial<UserPreferences> })
      case "recommend":
        return this.recommend(request.data as { destination: string; interests?: string[] })
      case "book":
        return this.book(request.data as { tripId: string })
      case "export":
        return this.exportTrip(request.data as { tripId: string; format: "pdf" | "json" })
      default:
        return { message: "抱歉，我不理解这个请求。" }
    }
  }

  /**
   * 规划旅行
   */
  private static async planTrip(data: {
    destination: string
    days: number
    preferences?: Partial<UserPreferences>
  }): Promise<AgentResponse> {
    const { destination, days } = data

    // 模拟 AI 思考时间
    await this.delay(1500)

    // 生成行程
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      name: `${destination}${days}日游`,
      destination: {
        name: destination,
        country: this.getCountry(destination),
      },
      duration: {
        startDate: new Date(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        days,
      },
      preferences: {
        interests: data.preferences?.interests || ["观光", "美食", "文化"],
        accommodationType: data.preferences?.accommodationType || ["mid-range"],
        transportationPreference: data.preferences?.transportationPreference || ["public"],
        dietaryRestrictions: data.preferences?.dietaryRestrictions || [],
        accessibilityNeeds: data.preferences?.accessibilityNeeds || [],
      },
      itinerary: this.generateItinerary(destination, days),
      status: "planning",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return {
      message: `✨ 已为你生成${destination}${days}日游的完整行程！\n\n行程包含：\n• ${days}天精心安排的活动\n• 推荐景点和餐厅\n• 预估时间和预算\n\n你可以查看详细行程，也可以让我帮你调整任何部分。`,
      trip,
    }
  }

  /**
   * 生成推荐
   */
  private static async recommend(data: { destination: string; interests?: string[] }): Promise<AgentResponse> {
    await this.delay(800)

    const recommendations = this.getRecommendations(data.destination, data.interests)

    return {
      message: `🎯 根据你的兴趣，我为你推荐${data.destination}的以下活动：\n\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n需要我帮你安排到行程中吗？`,
      suggestions: recommendations,
    }
  }

  /**
   * 预订服务（模拟）
   */
  private static async book(_data: { tripId: string }): Promise<AgentResponse> {
    await this.delay(1000)

    return {
      message: "📝 预订功能即将推出！\n\n目前你可以：\n• 查看完整的行程安排\n• 导出行程为 PDF\n• 保存行程到本地\n\n完整的在线预订功能将在下一个版本中提供。",
    }
  }

  /**
   * 导出行程
   */
  private static async exportTrip(data: { tripId: string; format: "pdf" | "json" }): Promise<AgentResponse> {
    await this.delay(500)

    return {
      message: `📄 行程已导出为 ${data.format.toUpperCase()} 格式！\n\n文件已保存到你的下载文件夹。`,
    }
  }

  /**
   * 生成每日行程
   */
  private static generateItinerary(destination: string, days: number): DayPlan[] {
    const activities = this.getDestinationActivities(destination)
    const itinerary: DayPlan[] = []

    for (let day = 1; day <= days; day++) {
      const dayPlan: DayPlan = {
        dayNumber: day,
        date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000),
        activities: [
          {
            id: `activity-${day}-1`,
            type: "attraction",
            name: activities[(day - 1) * 3] || "市中心观光",
            description: "探索当地著名景点",
            location: {
              name: `${destination}市中心`,
              address: `${destination}市中心`,
            },
            time: {
              start: "09:00",
              end: "12:00",
              duration: 180,
            },
            cost: 0,
          },
          {
            id: `activity-${day}-2`,
            type: "dining",
            name: activities[(day - 1) * 3 + 1] || "当地特色午餐",
            description: "品尝当地美食",
            location: {
              name: "推荐餐厅",
              address: `${destination}主要街道`,
            },
            time: {
              start: "12:00",
              end: "13:30",
              duration: 90,
            },
            cost: 100,
          },
          {
            id: `activity-${day}-3`,
            type: "attraction",
            name: activities[(day - 1) * 3 + 2] || "文化体验",
            description: "了解当地历史文化",
            location: {
              name: "博物馆/文化中心",
              address: `${destination}文化区`,
            },
            time: {
              start: "14:00",
              end: "17:00",
              duration: 180,
            },
            cost: 50,
          },
        ],
        notes: `第${day}天注意事项：携带身份证件，穿舒适的鞋子`,
        estimatedBudget: 150 + Math.random() * 200,
      }
      itinerary.push(dayPlan)
    }

    return itinerary
  }

  /**
   * 获取目的地活动推荐
   */
  private static getDestinationActivities(destination: string): string[] {
    const activitiesMap: Record<string, string[]> = {
      东京: [
        "浅草寺参观",
        "东京塔夜景",
        "秋叶原动漫购物",
        "涩谷十字路口",
        "筑地市场美食",
        "明治神宫",
        "新宿购物",
        "上野公园赏花",
        "银座高端购物",
        "东京迪士尼乐园",
        "TeamLab数字艺术馆",
        "皇居东御苑",
        "天空树观景台",
        "原宿竹下通",
        "谷中银座商店街",
      ],
      巴黎: [
        "埃菲尔铁塔",
        "卢浮宫博物馆",
        "凯旋门登顶",
        "塞纳河游船",
        "蒙马特高地",
        "香榭丽舍大道",
        "凡尔赛宫",
        "奥赛博物馆",
        "圣心大教堂",
        "巴黎歌剧院",
        "蓬皮杜中心",
        "卢森堡公园",
        "拉丁区漫步",
        "玛黑区购物",
        "先贤祠",
      ],
      纽约: [
        "自由女神像",
        "时代广场",
        "中央公园",
        "帝国大厦",
        "大都会博物馆",
        "百老汇音乐剧",
        "布鲁克林大桥",
        "华尔街铜牛",
        "现代艺术博物馆",
        "高线公园",
        "911纪念馆",
        "切尔西市场",
        "第五大道购物",
        " Rockefeller 中心",
        "古根海姆博物馆",
      ],
      北京: [
        "故宫博物院",
        "长城八达岭",
        "天坛公园",
        "颐和园",
        "南锣鼓巷",
        "798艺术区",
        "国家大剧院",
        "三里屯购物",
        "什刹海",
        "恭王府",
        "雍和宫",
        "鸟巢水立方",
        "圆明园",
        "北海公园",
        "景山公园",
      ],
      上海: [
        "外滩夜景",
        "东方明珠塔",
        "豫园城隍庙",
        "南京路步行街",
        "新天地",
        "田子坊",
        "上海博物馆",
        "迪士尼乐园",
        "朱家角古镇",
        "多伦路文化街",
        "武康路",
        "静安寺",
        "上海中心大厦",
        "世博园",
        "思南公馆",
      ],
    }

    return activitiesMap[destination] || [
      "市中心观光",
      "当地博物馆",
      "特色市场",
      "历史古迹",
      "自然公园",
      "购物区",
      "夜景观赏",
      "文化表演",
      "美食体验",
      "艺术画廊",
      "当地寺庙/教堂",
      "海滨/河畔散步",
      "传统工艺体验",
      "咖啡文化体验",
      "夜市探索",
    ]
  }

  /**
   * 获取推荐活动
   */
  private static getRecommendations(destination: string, _interests?: string[]): string[] {
    const activities = this.getDestinationActivities(destination)
    return activities.slice(0, 5)
  }

  /**
   * 获取国家
   */
  private static getCountry(destination: string): string {
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
    }
    return countryMap[destination] || "未知"
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
