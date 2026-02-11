import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, DollarSign, ExternalLink } from "lucide-react"
import type { Activity } from "@/types"

interface ActivityItemProps {
  activity: Activity
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

const activityTypeBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  transportation: "secondary",
  attraction: "default",
  dining: "outline",
  accommodation: "secondary",
  shopping: "outline",
  other: "outline",
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const handleOpenBooking = () => {
    if (activity.bookingUrl) {
      window.open(activity.bookingUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
        {activityTypeIcons[activity.type] || activityTypeIcons.other}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{activity.name}</p>
              <Badge variant={activityTypeBadgeVariants[activity.type] || "outline"} className="text-xs">
                {activityTypeLabels[activity.type] || activityTypeLabels.other}
              </Badge>
            </div>
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
            )}
          </div>
          {activity.bookingUrl && (
            <button
              onClick={handleOpenBooking}
              className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
              title="打开预订链接"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{activity.time.start} - {activity.time.end}</span>
            <span className="text-muted-foreground/60">({activity.time.duration}分钟)</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{activity.location.name}</span>
          </div>
          {activity.cost !== undefined && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium text-foreground">¥{activity.cost}</span>
            </div>
          )}
        </div>
        {activity.rating && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="text-xs font-medium">{activity.rating.toFixed(1)}</span>
          </div>
        )}
        {activity.notes && (
          <div className="mt-2 p-2 rounded bg-background/50 text-xs text-muted-foreground">
            💡 {activity.notes}
          </div>
        )}
      </div>
    </div>
  )
}
