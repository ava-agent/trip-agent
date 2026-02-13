/**
 * Tauri Storage Service
 *
 * 提供与 Tauri 后端通信的接口，用于本地数据存储和管理。
 * 在浏览器环境中会自动回退到 mockTauri 实现。
 */

import type { Trip, UserPreferences } from "../types"

// Lazy import Tauri API to avoid "process is not defined" error in browser
type InvokeFunction = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
let invoke: InvokeFunction | null = null

async function getInvoke(): Promise<InvokeFunction | null> {
  if (!invoke) {
    try {
      const tauri = await import("@tauri-apps/api/core")
      invoke = tauri.invoke as InvokeFunction
    } catch {
      // Tauri not available
      invoke = null
    }
  }
  return invoke
}

// ============================================================================
// Error Types
// ============================================================================

export class StorageError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "StorageError"
    this.code = code
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// Tauri Detection
// ============================================================================

export const isTauriAvailable = (): boolean => {
  return typeof window !== "undefined" && "__TAURI__" in window
}

// ============================================================================
// Storage Service
// ============================================================================

class TauriStorageService {
  /**
   * 保存旅行计划到本地存储
   */
  async saveTrip(trip: Trip): Promise<void> {
    try {
      const invoker = await getInvoke()
      if (isTauriAvailable() && invoker) {
        await invoker("save_trip", { trip })
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        await TauriStorage.saveTrip(trip)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(`Failed to save trip: ${message}`, "SAVE_TRIP_ERROR")
    }
  }

  /**
   * 加载所有旅行计划
   */
  async loadTrips(): Promise<Trip[]> {
    try {
      let trips: unknown[]
      const invoker = await getInvoke()

      if (isTauriAvailable() && invoker) {
        trips = await invoker<Trip[]>("load_trips")
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        trips = await TauriStorage.loadTrips()
      }

      // Convert date strings back to Date objects
      return trips.map((trip) => this.deserializeTrip(trip as Trip))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(`Failed to load trips: ${message}`, "LOAD_TRIPS_ERROR")
    }
  }

  /**
   * 加载单个旅行计划
   */
  async loadTrip(id: string): Promise<Trip | null> {
    try {
      let trip: unknown
      const invoker = await getInvoke()

      if (isTauriAvailable() && invoker) {
        trip = await invoker<Trip>("load_trip", { id })
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        trip = await TauriStorage.loadTrip(id)
      }

      if (!trip) {
        return null
      }

      return this.deserializeTrip(trip as Trip)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Check if it's a "trip not found" error
      if (message.includes("not found") || message.includes("Trip not found")) {
        return null
      }
      throw new StorageError(`Failed to load trip: ${message}`, "LOAD_TRIP_ERROR")
    }
  }

  /**
   * 删除旅行计划
   */
  async deleteTrip(id: string): Promise<void> {
    try {
      const invoker = await getInvoke()
      if (isTauriAvailable() && invoker) {
        await invoker("delete_trip", { id })
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        await TauriStorage.deleteTrip(id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(`Failed to delete trip: ${message}`, "DELETE_TRIP_ERROR")
    }
  }

  /**
   * 检查旅行计划是否存在
   */
  async tripExists(id: string): Promise<boolean> {
    try {
      const invoker = await getInvoke()
      if (isTauriAvailable() && invoker) {
        return await invoker<boolean>("trip_exists", { id })
      } else {
        // Fallback: try to load the trip
        const trip = await this.loadTrip(id)
        return trip !== null
      }
    } catch (error) {
      return false
    }
  }

  /**
   * 保存用户偏好设置
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      const invoker = await getInvoke()
      if (isTauriAvailable() && invoker) {
        await invoker("save_preferences", { prefs: preferences })
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        await TauriStorage.savePreferences(preferences)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(
        `Failed to save preferences: ${message}`,
        "SAVE_PREFERENCES_ERROR"
      )
    }
  }

  /**
   * 加载用户偏好设置
   */
  async loadPreferences(): Promise<UserPreferences | null> {
    try {
      let prefs: unknown
      const invoker = await getInvoke()

      if (isTauriAvailable() && invoker) {
        prefs = await invoker<UserPreferences | null>("load_preferences")
      } else {
        // Fallback to mock implementation
        const { TauriStorage } = await import("../lib/mockTauri")
        prefs = await TauriStorage.loadPreferences()
      }

      return (prefs as UserPreferences | null) ?? null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(
        `Failed to load preferences: ${message}`,
        "LOAD_PREFERENCES_ERROR"
      )
    }
  }

  /**
   * 获取应用数据目录路径（用于调试）
   */
  async getDataDir(): Promise<string> {
    try {
      const invoker = await getInvoke()
      if (isTauriAvailable() && invoker) {
        return await invoker<string>("get_data_dir")
      } else {
        return "localStorage (browser mode)"
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new StorageError(
        `Failed to get data directory: ${message}`,
        "GET_DATA_DIR_ERROR"
      )
    }
  }

  /**
   * 将后端返回的旅行数据转换为前端使用的格式
   * 处理日期字符串到 Date 对象的转换
   */
  private deserializeTrip(trip: Trip): Trip {
    return {
      ...trip,
      duration: {
        ...trip.duration,
        startDate: new Date(trip.duration.startDate),
        endDate: new Date(trip.duration.endDate),
      },
      createdAt: new Date(trip.createdAt),
      updatedAt: new Date(trip.updatedAt),
      itinerary: trip.itinerary.map((day) => ({
        ...day,
        date: new Date(day.date),
      })),
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const tauriStorageService = new TauriStorageService()

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * 便捷函数：保存旅行计划
 */
export const saveTrip = (trip: Trip): Promise<void> =>
  tauriStorageService.saveTrip(trip)

/**
 * 便捷函数：加载所有旅行计划
 */
export const loadTrips = (): Promise<Trip[]> =>
  tauriStorageService.loadTrips()

/**
 * 便捷函数：加载单个旅行计划
 */
export const loadTrip = (id: string): Promise<Trip | null> =>
  tauriStorageService.loadTrip(id)

/**
 * 便捷函数：删除旅行计划
 */
export const deleteTrip = (id: string): Promise<void> =>
  tauriStorageService.deleteTrip(id)

/**
 * 便捷函数：检查旅行计划是否存在
 */
export const tripExists = (id: string): Promise<boolean> =>
  tauriStorageService.tripExists(id)

/**
 * 便捷函数：保存用户偏好
 */
export const savePreferences = (prefs: UserPreferences): Promise<void> =>
  tauriStorageService.savePreferences(prefs)

/**
 * 便捷函数：加载用户偏好
 */
export const loadPreferences = (): Promise<UserPreferences | null> =>
  tauriStorageService.loadPreferences()

/**
 * 便捷函数：获取数据目录
 */
export const getDataDir = (): Promise<string> =>
  tauriStorageService.getDataDir()
