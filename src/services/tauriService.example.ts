/**
 * Tauri Storage Service 使用示例
 *
 * 此文件展示了如何使用 tauriService 进行数据持久化操作
 */

import {
  saveTrip,
  loadTrips,
  loadTrip,
  deleteTrip,
  tripExists,
  savePreferences,
  loadPreferences,
  getDataDir,
} from "./tauriService"
import type { Trip, UserPreferences } from "../types"

// ============================================================================
// 基本使用示例
// ============================================================================

/**
 * 示例 1: 保存新的旅行计划
 */
async function exampleSaveTrip() {
  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    name: "东京春季之旅",
    destination: {
      name: "东京",
      country: "日本",
      coordinates: {
        lat: 35.6762,
        lng: 139.6503,
      },
    },
    duration: {
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-04-07"),
      days: 7,
    },
    preferences: {
      interests: ["文化", "美食", "购物", "动漫"],
      budget: {
        min: 10000,
        max: 20000,
        currency: "CNY",
      },
      accommodationType: ["mid-range"],
      transportationPreference: ["public", "walking"],
    },
    itinerary: [],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    await saveTrip(newTrip)
    console.log("旅行保存成功!")
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const storageError = error as { message: string; code?: string }
      console.error("保存失败:", storageError.message)
      console.error("错误代码:", storageError.code)
    }
  }
}

/**
 * 示例 2: 加载所有旅行计划
 */
async function exampleLoadAllTrips() {
  try {
    const trips = await loadTrips()
    console.log(`找到 ${trips.length} 个旅行计划:`)

    trips.forEach((trip) => {
      console.log(`- ${trip.name} (${trip.status})`)
      console.log(`  目的地: ${trip.destination.name}, ${trip.destination.country}`)
      console.log(`  时长: ${trip.duration.days} 天`)
    })

    return trips
  } catch (error) {
    console.error("加载失败:", error)
    return []
  }
}

/**
 * 示例 3: 加载单个旅行计划
 */
async function exampleLoadSingleTrip(tripId: string) {
  try {
    const trip = await loadTrip(tripId)

    if (!trip) {
      console.log("旅行不存在")
      return null
    }

    console.log("旅行详情:")
    console.log(`名称: ${trip.name}`)
    console.log(`状态: ${trip.status}`)
    console.log(`行程天数: ${trip.itinerary.length}`)

    return trip
  } catch (error) {
    console.error("加载失败:", error)
    return null
  }
}

/**
 * 示例 4: 更新现有旅行
 */
async function exampleUpdateTrip(tripId: string) {
  try {
    // 首先加载现有旅行
    const trip = await loadTrip(tripId)

    if (!trip) {
      console.log("旅行不存在，无法更新")
      return
    }

    // 更新数据（不可变模式）
    const updatedTrip: Trip = {
      ...trip,
      name: "东京春季之旅（已更新）",
      status: "confirmed",
      updatedAt: new Date(),
    }

    // 保存更新后的旅行
    await saveTrip(updatedTrip)
    console.log("旅行更新成功!")
  } catch (error) {
    console.error("更新失败:", error)
  }
}

/**
 * 示例 5: 删除旅行
 */
async function exampleDeleteTrip(tripId: string) {
  try {
    // 先检查旅行是否存在
    const exists = await tripExists(tripId)

    if (!exists) {
      console.log("旅行不存在，无需删除")
      return
    }

    await deleteTrip(tripId)
    console.log("旅行删除成功!")
  } catch (error) {
    console.error("删除失败:", error)
  }
}

// ============================================================================
// 用户偏好示例
// ============================================================================

/**
 * 示例 6: 保存用户偏好
 */
async function exampleSavePreferences() {
  const preferences: UserPreferences = {
    interests: ["文化探索", "美食体验", "自然风光", "历史遗迹"],
    budget: {
      min: 5000,
      max: 15000,
      currency: "CNY",
    },
    accommodationType: ["mid-range", "budget"],
    transportationPreference: ["public", "walking"],
    dietaryRestrictions: ["素食"],
    accessibilityNeeds: [],
  }

  try {
    await savePreferences(preferences)
    console.log("偏好保存成功!")
  } catch (error) {
    console.error("保存偏好失败:", error)
  }
}

/**
 * 示例 7: 加载用户偏好
 */
async function exampleLoadPreferences() {
  try {
    const prefs = await loadPreferences()

    if (!prefs) {
      console.log("未找到保存的偏好设置")
      return null
    }

    console.log("用户偏好:")
    console.log(`兴趣: ${prefs.interests.join(", ")}`)
    console.log(`预算: ${prefs.budget?.min} - ${prefs.budget?.max} ${prefs.budget?.currency}`)

    return prefs
  } catch (error) {
    console.error("加载偏好失败:", error)
    return null
  }
}

// ============================================================================
// React Hook 示例
// ============================================================================

/**
 * 示例 8: React Hook 用于旅行管理
 */
/*
import { useState, useEffect } from "react"

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载所有旅行
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await loadTrips()
        setTrips(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // 保存旅行
  const save = async (trip: Trip) => {
    try {
      await saveTrip(trip)
      // 重新加载列表
      const data = await loadTrips()
      setTrips(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败")
      throw err
    }
  }

  // 删除旅行
  const remove = async (id: string) => {
    try {
      await deleteTrip(id)
      // 从列表中移除
      setTrips((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
      throw err
    }
  }

  return {
    trips,
    loading,
    error,
    save,
    remove,
  }
}

// 使用示例
function TripList() {
  const { trips, loading, error, save, remove } = useTrips()

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>

  return (
    <ul>
      {trips.map((trip) => (
        <li key={trip.id}>
          {trip.name} - {trip.status}
          <button onClick={() => remove(trip.id)}>删除</button>
        </li>
      ))}
    </ul>
  )
}
*/

// ============================================================================
// 调试示例
// ============================================================================

/**
 * 示例 9: 获取数据目录路径（调试用）
 */
async function exampleGetDataDir() {
  try {
    const path = await getDataDir()
    console.log("数据存储位置:", path)
    // 在 Windows 上类似: C:\Users\<用户名>\AppData\Roaming\com.trip.agent\
    // 在 macOS 上类似: ~/Library/Application Support/com.trip.agent/
    // 在 Linux 上类似: ~/.config/com.trip.agent/
  } catch (error) {
    console.error("获取数据目录失败:", error)
  }
}

// ============================================================================
// 完整工作流示例
// ============================================================================

/**
 * 示例 10: 完整的旅行管理工作流
 */
async function exampleCompleteWorkflow() {
  console.log("=== 开始旅行管理工作流 ===")

  // 1. 创建新旅行
  console.log("\n1. 创建新旅行...")
  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    name: "京都文化之旅",
    destination: {
      name: "京都",
      country: "日本",
    },
    duration: {
      startDate: new Date("2025-05-01"),
      endDate: new Date("2025-05-05"),
      days: 5,
    },
    preferences: {
      interests: ["文化", "历史"],
    },
    itinerary: [],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await saveTrip(newTrip)
  console.log("旅行已创建:", newTrip.id)

  // 2. 加载所有旅行
  console.log("\n2. 加载所有旅行...")
  const allTrips = await loadTrips()
  console.log(`当前有 ${allTrips.length} 个旅行计划`)

  // 3. 加载特定旅行
  console.log("\n3. 加载特定旅行...")
  const loadedTrip = await loadTrip(newTrip.id)
  console.log("加载的旅行:", loadedTrip?.name)

  // 4. 更新旅行
  console.log("\n4. 更新旅行状态...")
  const updatedTrip: Trip = {
    ...newTrip,
    status: "confirmed",
    updatedAt: new Date(),
  }
  await saveTrip(updatedTrip)
  console.log("旅行状态已更新为 confirmed")

  // 5. 清理 - 删除示例旅行
  console.log("\n5. 清理...")
  await deleteTrip(newTrip.id)
  console.log("示例旅行已删除")

  console.log("\n=== 工作流完成 ===")
}

// 导出示例函数供使用
export const examples = {
  saveTrip: exampleSaveTrip,
  loadAllTrips: exampleLoadAllTrips,
  loadSingleTrip: exampleLoadSingleTrip,
  updateTrip: exampleUpdateTrip,
  deleteTrip: exampleDeleteTrip,
  savePreferences: exampleSavePreferences,
  loadPreferences: exampleLoadPreferences,
  getDataDir: exampleGetDataDir,
  completeWorkflow: exampleCompleteWorkflow,
}
