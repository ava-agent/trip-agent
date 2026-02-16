import type { TripStatus } from "@/types"

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  draft: "text-gray-600",
  planning: "text-yellow-600",
  confirmed: "text-green-600",
  completed: "text-muted-foreground",
  cancelled: "text-red-600",
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "草稿",
  planning: "规划中",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
}

export const TRIP_STATUS_BG_COLORS: Record<TripStatus, string> = {
  draft: "bg-gray-100 dark:bg-gray-800",
  planning: "bg-yellow-50 dark:bg-yellow-900/20",
  confirmed: "bg-green-50 dark:bg-green-900/20",
  completed: "bg-muted",
  cancelled: "bg-red-50 dark:bg-red-900/20",
}
