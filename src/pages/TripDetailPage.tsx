import { useParams, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { useTripStore } from "@/stores/tripStore"
import { useUiStore } from "@/stores/uiStore"
import { ItineraryCard } from "@/components/itinerary/ItineraryCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, MapPin } from "lucide-react"

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentTrip = useTripStore((state) => state.currentTrip)
  const isLoading = useTripStore((state) => state.isLoading)
  const loadTripById = useTripStore((state) => state.loadTripById)
  const setSelectedTripId = useUiStore((state) => state.setSelectedTripId)

  useEffect(() => {
    if (id) {
      setSelectedTripId(id)
      // Load full trip data if not already loaded or different trip
      if (!currentTrip || currentTrip.id !== id) {
        loadTripById(id)
      }
    }
  }, [id, setSelectedTripId, loadTripById, currentTrip])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!currentTrip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <MapPin className="h-12 w-12" />
        <p className="text-lg">未找到行程</p>
        <p className="text-sm">该行程可能已被删除或不存在</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </div>
        <ItineraryCard trip={currentTrip} />
      </div>
    </div>
  )
}
