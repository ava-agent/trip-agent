import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, Calendar } from "lucide-react"
import { useTripStore } from "@/stores/tripStore"
import { useUiStore } from "@/stores/uiStore"
import type { TripStatus } from "@/types"

const statusColors: Record<TripStatus, string> = {
  draft: "text-gray-600",
  planning: "text-yellow-600",
  confirmed: "text-green-600",
  completed: "text-muted-foreground",
  cancelled: "text-red-600",
}

const statusLabels: Record<TripStatus, string> = {
  draft: "草稿",
  planning: "规划中",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
}

export function Sidebar() {
  const trips = useTripStore((state) => state.trips)
  const selectedTripId = useUiStore((state) => state.selectedTripId)
  const setSelectedTripId = useUiStore((state) => state.setSelectedTripId)

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">我的旅行</h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => setSelectedTripId(trip.id)}
              className={`w-full rounded-lg p-3 text-left transition-colors hover:bg-accent ${
                selectedTripId === trip.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{trip.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{trip.destination}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{trip.duration} 天</span>
                  </div>
                </div>
                <span className={`text-xs ${statusColors[trip.status]}`}>
                  {statusLabels[trip.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button variant="outline" className="w-full" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          历史记录
        </Button>
      </div>
    </aside>
  )
}
