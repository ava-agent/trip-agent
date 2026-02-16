import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Loader2, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react"
import type { DayPlan, Activity } from "@/types"
import L from "leaflet"
import { AnimatePresence, motion } from "framer-motion"

import "leaflet/dist/leaflet.css"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import iconUrl from "leaflet/dist/images/marker-icon.png"
import shadowUrl from "leaflet/dist/images/marker-shadow.png"

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
  transportation: "#3b82f6",
  attraction: "#8b5cf6",
  dining: "#ef4444",
  accommodation: "#10b981",
  shopping: "#f59e0b",
  other: "#6b7280",
}

const activityTypeIcons: Record<string, string> = {
  transportation: "🚗",
  attraction: "🏛️",
  dining: "🍽️",
  accommodation: "🏨",
  shopping: "🛍️",
  other: "📍",
}

const activityTypeLabels: Record<string, string> = {
  transportation: "交通",
  attraction: "景点",
  dining: "餐饮",
  accommodation: "住宿",
  shopping: "购物",
  other: "其他",
}

// Route line colors per day
const dayRouteColors = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
]

export function ItineraryMap({
  itinerary,
  className = "",
  onActivitySelect,
}: ItineraryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylinesRef = useRef<L.Polyline[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number>(0) // 0 = all days

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([35.0, 105.0], 4)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map
    map.whenReady(() => setLoading(false))

    return () => {
      markersRef.current.forEach((m) => m.remove())
      polylinesRef.current.forEach((p) => p.remove())
      markersRef.current = []
      polylinesRef.current = []
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle fullscreen resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300)
    }
  }, [isFullscreen])

  // Update markers and routes when itinerary or selectedDay changes
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers and polylines
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    polylinesRef.current.forEach((polyline) => polyline.remove())
    polylinesRef.current = []

    // Filter days
    const daysToShow = selectedDay === 0
      ? itinerary
      : itinerary.filter((d) => d.dayNumber === selectedDay)

    // Collect activities with coords
    const allBounds: L.LatLngTuple[] = []

    daysToShow.forEach((dayPlan) => {
      const dayActivities: Array<{ activity: Activity; coords: L.LatLngTuple }> = []

      dayPlan.activities.forEach((activity) => {
        const coords = activity.location.coordinates
        if (!coords) return

        const latLng: L.LatLngTuple = [coords.lat, coords.lng]
        dayActivities.push({ activity, coords: latLng })
        allBounds.push(latLng)

        // Create marker
        const color = activityColors[activity.type] || activityColors.other
        const emoji = activityTypeIcons[activity.type] || activityTypeIcons.other

        const icon = L.divIcon({
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

        const marker = L.marker(latLng, { icon })
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${activity.name}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              第 ${dayPlan.dayNumber} 天 · ${activity.time.start} - ${activity.time.end}
            </div>
            <div style="font-size: 12px; color: #666;">
              📍 ${activity.location.name}
            </div>
            ${activity.cost !== undefined ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">💰 ¥${activity.cost}</div>` : ""}
          </div>
        `
        marker.bindPopup(popupContent)
        marker.on("click", () => onActivitySelect?.(activity))
        marker.addTo(mapInstanceRef.current!)
        markersRef.current.push(marker)
      })

      // Draw route polyline connecting activities for this day
      if (dayActivities.length >= 2) {
        const routeColor = dayRouteColors[(dayPlan.dayNumber - 1) % dayRouteColors.length]
        const routeCoords = dayActivities.map((a) => a.coords)

        const polyline = L.polyline(routeCoords, {
          color: routeColor,
          weight: 3,
          opacity: 0.7,
          dashArray: "8, 6",
          smoothFactor: 1,
        })

        polyline.addTo(mapInstanceRef.current!)
        polylinesRef.current.push(polyline)

        // Add distance labels between consecutive points
        for (let i = 0; i < routeCoords.length - 1; i++) {
          const from = L.latLng(routeCoords[i])
          const to = L.latLng(routeCoords[i + 1])
          const distance = from.distanceTo(to)
          const midLat = (routeCoords[i][0] + routeCoords[i + 1][0]) / 2
          const midLng = (routeCoords[i][1] + routeCoords[i + 1][1]) / 2

          const distanceText = distance >= 1000
            ? `${(distance / 1000).toFixed(1)} km`
            : `${Math.round(distance)} m`

          const distanceIcon = L.divIcon({
            className: "distance-label",
            html: `<div style="
              background: white;
              padding: 1px 6px;
              border-radius: 10px;
              font-size: 10px;
              color: ${routeColor};
              font-weight: 600;
              border: 1px solid ${routeColor};
              white-space: nowrap;
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            ">${distanceText}</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          })

          const distanceMarker = L.marker([midLat, midLng], { icon: distanceIcon, interactive: false })
          distanceMarker.addTo(mapInstanceRef.current!)
          markersRef.current.push(distanceMarker)
        }
      }
    })

    // Fit bounds
    if (allBounds.length > 0) {
      mapInstanceRef.current.fitBounds(allBounds, { padding: [50, 50] })
    }
  }, [itinerary, selectedDay, onActivitySelect])

  const totalDays = itinerary.length

  return (
    <Card className={`${className} ${isFullscreen ? "fixed inset-4 z-40" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            行程地图
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Day navigation */}
            {totalDays > 1 && (
              <div className="flex items-center gap-1 bg-muted rounded-md px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                  disabled={selectedDay === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium min-w-[48px] text-center">
                  {selectedDay === 0 ? "全部" : `第 ${selectedDay} 天`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedDay(Math.min(totalDays, selectedDay + 1))}
                  disabled={selectedDay === totalDays}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "退出全屏" : "全屏地图"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className={`w-full rounded-lg overflow-hidden relative ${
            isFullscreen ? "h-[calc(100vh-200px)]" : "h-[400px]"
          }`}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(activityTypeLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activityColors[type] }}
              />
              <span>{label}</span>
            </div>
          ))}
          {selectedDay === 0 && totalDays > 1 && (
            <>
              <div className="w-px h-4 bg-border" />
              <span className="text-muted-foreground">路线颜色按天区分</span>
            </>
          )}
        </div>
      </CardContent>

      {/* Fullscreen backdrop */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="fixed inset-0 bg-black/30 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </Card>
  )
}
