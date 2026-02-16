/**
 * Mock Tauri API for browser-based development
 * When Tauri is available, it will use the real Tauri API
 * Otherwise, it falls back to localStorage and browser APIs
 */

// ============================================================================
// Storage Command Mocks
// ============================================================================

const STORAGE_KEYS = {
  TRIPS: "trip_agent_trips",
  CURRENT_TRIP: "trip_agent_current_trip",
  PREFERENCES: "trip_agent_preferences",
} as const

export const TauriStorage = {
  /**
   * 保存旅行计划
   */
  async saveTrip(trip: unknown): Promise<void> {
    const trips = this.loadTripsSync()
    const tripData = trip as { id: string }
    const index = trips.findIndex((t) => (t as { id: string }).id === tripData.id)
    if (index >= 0) {
      trips[index] = trip
    } else {
      trips.push(trip)
    }
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips))
  },

  /**
   * 加载旅行列表
   */
  async loadTrips(): Promise<unknown[]> {
    return this.loadTripsSync()
  },

  loadTripsSync(): unknown[] {
    const data = localStorage.getItem(STORAGE_KEYS.TRIPS)
    return data ? JSON.parse(data) : []
  },

  /**
   * 加载单个旅行
   */
  async loadTrip(tripId: string): Promise<unknown | null> {
    const trips = this.loadTripsSync()
    return trips.find((t) => (t as { id: string }).id === tripId) || null
  },

  /**
   * 删除旅行
   */
  async deleteTrip(tripId: string): Promise<void> {
    const trips = this.loadTripsSync()
    const filtered = trips.filter((t) => (t as { id: string }).id !== tripId)
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(filtered))
  },

  /**
   * 保存用户偏好
   */
  async savePreferences(preferences: unknown): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences))
  },

  /**
   * 加载用户偏好
   */
  async loadPreferences(): Promise<unknown | null> {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES)
    return data ? JSON.parse(data) : null
  },
}

// ============================================================================
// Chat Command Mocks
// ============================================================================

export const TauriChat = {
  /**
   * 发送聊天消息（模拟）
   */
  async sendMessage(message: string, _context?: unknown): Promise<{ response: string }> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 简单的关键词响应
    const responses: Record<string, string> = {
      "东京": "东京是个很棒的旅行目的地！我为你推荐以下景点：浅草寺、东京塔、涩谷十字路口、秋叶原...",
      "巴黎": "巴黎，浪漫之都！推荐景点：埃菲尔铁塔、卢浮宫、凯旋门、塞纳河游船...",
      "纽约": "纽约，不夜城！推荐景点：自由女神像、时代广场、中央公园、百老汇...",
    }

    for (const [keyword, response] of Object.entries(responses)) {
      if (message.includes(keyword)) {
        return { response }
      }
    }

    return {
      response: "收到你的消息！请告诉我你想去哪里旅行，我将为你制定详细的行程计划。",
    }
  },

  /**
   * 流式聊天消息
   */
  async *streamMessage(message: string): AsyncGenerator<{ chunk: string; done: boolean }> {
    const { response } = await this.sendMessage(message)
    const words = response.split("")

    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 30))
      yield { chunk: word, done: false }
    }

    yield { chunk: "", done: true }
  },
}

// ============================================================================
// Trip Command Mocks
// ============================================================================

export const TauriTrip = {
  /**
   * 创建新旅行
   */
  async createTrip(request: { name: string; destination: string; days: number }): Promise<{ tripId: string }> {
    const tripId = `trip-${Date.now()}`
    const trip = {
      id: tripId,
      name: request.name,
      destination: request.destination,
      duration: request.days,
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itinerary: [],
    }

    await TauriStorage.saveTrip(trip)
    return { tripId }
  },

  /**
   * 生成旅行行程
   */
  async generateItinerary(_tripId: string, _preferences: unknown): Promise<{ success: boolean }> {
    // 模拟 AI 生成行程
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 这里应该调用 AI 服务生成行程
    // 暂时返回成功
    return { success: true }
  },
}

// ============================================================================
// Export Command Mocks
// ============================================================================

export const TauriExport = {
  /**
   * 导出为 PDF（模拟）
   */
  async exportToPdf(tripId: string): Promise<{ success: boolean; filename: string }> {
    const trip = await TauriStorage.loadTrip(tripId)
    if (!trip) {
      throw new Error("Trip not found")
    }

    const filename = `${(trip as { name: string }).name.replace(/\s+/g, "_")}_行程单.pdf`

    // 模拟 PDF 生成
    if (import.meta.env.DEV) console.log("Generating PDF for trip:", tripId)

    return { success: true, filename }
  },

  /**
   * 导出为 JSON
   */
  async exportToJson(tripId: string): Promise<{ success: boolean; data: string }> {
    const trip = await TauriStorage.loadTrip(tripId)
    if (!trip) {
      throw new Error("Trip not found")
    }

    return { success: true, data: JSON.stringify(trip, null, 2) }
  },
}

// ============================================================================
// System Command Mocks
// ============================================================================

export const TauriSystem = {
  /**
   * 获取应用版本
   */
  async getVersion(): Promise<{ version: string }> {
    return { version: "0.1.0-mock" }
  },

  /**
   * 打开外部链接
   */
  async openUrl(url: string): Promise<void> {
    window.open(url, "_blank")
  },
}

// ============================================================================
// Unified Tauri Command Mock Export
// ============================================================================

export const mockTauriCommands = {
  // Storage commands
  save_trip: TauriStorage.saveTrip.bind(TauriStorage),
  load_trips: TauriStorage.loadTrips.bind(TauriStorage),
  load_trip: TauriStorage.loadTrip.bind(TauriStorage),
  delete_trip: TauriStorage.deleteTrip.bind(TauriStorage),
  save_preferences: TauriStorage.savePreferences.bind(TauriStorage),
  load_preferences: TauriStorage.loadPreferences.bind(TauriStorage),

  // Chat commands
  send_message: TauriChat.sendMessage.bind(TauriChat),

  // Trip commands
  create_trip: TauriTrip.createTrip.bind(TauriTrip),
  generate_itinerary: TauriTrip.generateItinerary.bind(TauriTrip),

  // Export commands
  export_to_pdf: TauriExport.exportToPdf.bind(TauriExport),
  export_to_json: TauriExport.exportToJson.bind(TauriExport),

  // System commands
  get_version: TauriSystem.getVersion.bind(TauriSystem),
  open_url: TauriSystem.openUrl.bind(TauriSystem),
}
