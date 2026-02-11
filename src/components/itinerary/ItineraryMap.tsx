import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Loader2 } from "lucide-react"
import type { DayPlan, Activity } from "@/types"
import L from "leaflet"

// 修复 Leaflet 默认图标问题
import "leaflet/dist/leaflet.css"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import iconUrl from "leaflet/dist/images/marker-icon.png"
import shadowUrl from "leaflet/dist/images/marker-shadow.png"

// 配置 Leaflet 默认图标
;(L as any).Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

interface ItineraryMapProps {
  itinerary: DayPlan[]
  destinationName: string
  className?: string
  onActivitySelect?: (activity: Activity) => void
}

const activityColors: Record<string, string> = {
  transportation: "#3b82f6", // blue
  attraction: "#8b5cf6", // purple
  dining: "#ef4444", // red
  accommodation: "#10b981", // green
  shopping: "#f59e0b", // amber
  other: "#6b7280", // gray
}

const activityTypeIcons: Record<string, string> = {
  transportation: "🚗",
  attraction: "🏛️",
  dining: "🍽️",
  accommodation: "🏨",
  shopping: "🛍️",
  other: "📍",
}

export function ItineraryMap({ itinerary, className = "", onActivitySelect }: ItineraryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [loading, setLoading] = useState(true)

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // 创建地图实例
    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([35.6762, 139.6503], 12) // 默认东京坐标

    // 添加 OpenStreetMap 图层
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    // 加载完成后隐藏 loading
    map.whenReady(() => {
      setLoading(false)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 更新地图标记
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // 清除现有标记
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // 收集所有活动位置
    const activitiesWithCoords: Array<{ activity: Activity; dayNumber: number }> = []
    itinerary.forEach((dayPlan) => {
      dayPlan.activities.forEach((activity) => {
        if (activity.location.coordinates) {
          activitiesWithCoords.push({ activity, dayNumber: dayPlan.dayNumber })
        }
      })
    })

    if (activitiesWithCoords.length === 0) {
      // 如果没有坐标，使用目的地名称进行地理编码
      // 这里使用默认坐标，实际应用中应该调用地理编码 API
      return
    }

    // 创建自定义图标
    const createCustomIcon = (activityType: string) => {
      const color = activityColors[activityType] || activityColors.other
      const emoji = activityTypeIcons[activityType] || activityTypeIcons.other

      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          <div style="
            transform: rotate(45deg);
            font-size: 14px;
          ">${emoji}</div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
    }

    // 添加标记
    const bounds: L.LatLngBoundsExpression = []
    activitiesWithCoords.forEach(({ activity, dayNumber }) => {
      const { coordinates } = activity.location
      if (!coordinates) return

      const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: createCustomIcon(activity.type),
      })

      // 创建弹出窗口内容
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${activity.name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            第 ${dayNumber} 天 · ${activity.time.start} - ${activity.time.end}
          </div>
          <div style="font-size: 12px; color: #666;">
            📍 ${activity.location.name}
          </div>
          ${activity.cost !== undefined ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">💰 ¥${activity.cost}</div>` : ""}
        </div>
      `

      marker.bindPopup(popupContent)
      marker.on("click", () => {
        onActivitySelect?.(activity)
      })
      marker.addTo(mapInstanceRef.current!)
      markersRef.current.push(marker)

      bounds.push([coordinates.lat, coordinates.lng])
    })

    // 调整地图视图以包含所有标记
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [itinerary])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            行程地图
          </CardTitle>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-lg overflow-hidden relative"
          style={{ minHeight: "400px" }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors.attraction }} />
            <span>景点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors.dining }} />
            <span>餐饮</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors.accommodation }} />
            <span>住宿</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors.transportation }} />
            <span>交通</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColors.shopping }} />
            <span>购物</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
