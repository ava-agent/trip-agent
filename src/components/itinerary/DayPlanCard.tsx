import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Info, ChevronDown } from "lucide-react"
import { ActivityItem } from "./ActivityItem"
import { AnimatePresence, motion } from "framer-motion"
import type { DayPlan } from "@/types"

interface DayPlanCardProps {
  dayPlan: DayPlan
  defaultExpanded?: boolean
}

const COLLAPSED_LIMIT = 4

export function DayPlanCard({ dayPlan, defaultExpanded = true }: DayPlanCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const showExpandButton = dayPlan.activities.length > COLLAPSED_LIMIT
  const visibleActivities = expanded
    ? dayPlan.activities
    : dayPlan.activities.slice(0, COLLAPSED_LIMIT)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }

  const totalActivityCost = useMemo(
    () => dayPlan.activities.reduce((sum, activity) => sum + (activity.cost || 0), 0),
    [dayPlan.activities]
  )

  return (
    <Card className="transition-shadow hover:shadow-sm">
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
      <CardContent className="space-y-0">
        {/* Timeline */}
        <div className="relative">
          {visibleActivities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center w-6 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10 mt-4" />
                {index < visibleActivities.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              {/* Activity */}
              <div className="flex-1 pb-3">
                <ActivityItem activity={activity} />
              </div>
            </div>
          ))}
        </div>

        {/* Expand/collapse button */}
        {showExpandButton && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mr-1"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
            {expanded
              ? "收起"
              : `展开剩余 ${dayPlan.activities.length - COLLAPSED_LIMIT} 个活动`}
          </Button>
        )}

        {/* Budget summary */}
        <div className="flex items-center justify-between pt-3 border-t mt-3">
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

        {/* Notes */}
        <AnimatePresence>
          {dayPlan.notes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-2 border-t text-sm flex gap-2 text-muted-foreground bg-muted/30 rounded-lg p-3 mt-3"
            >
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{dayPlan.notes}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
