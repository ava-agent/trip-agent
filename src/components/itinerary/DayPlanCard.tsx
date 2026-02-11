import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Info } from "lucide-react"
import { ActivityItem } from "./ActivityItem"
import type { DayPlan } from "@/types"

interface DayPlanCardProps {
  dayPlan: DayPlan
}

export function DayPlanCard({ dayPlan }: DayPlanCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }

  const totalActivityCost = dayPlan.activities.reduce((sum, activity) => sum + (activity.cost || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">第 {dayPlan.dayNumber} 天</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {formatDate(dayPlan.date)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {dayPlan.activities.length} 个活动
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dayPlan.activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>活动费用</span>
            </div>
            <span className="font-medium">¥{totalActivityCost.toFixed(0)}</span>
          </div>
          {dayPlan.estimatedBudget && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">当日预算</span>
              <Badge variant="outline">¥{dayPlan.estimatedBudget.toFixed(0)}</Badge>
            </div>
          )}
        </div>
        {dayPlan.notes && (
          <div className="pt-2 border-t text-sm flex gap-2 text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{dayPlan.notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
