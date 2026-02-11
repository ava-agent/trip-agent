import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign, Download, ChevronDown, ChevronUp, FileText, Printer, FileJson } from "lucide-react"
import { useState } from "react"
import { DayPlanCard } from "./DayPlanCard"
import { ItineraryMap } from "./ItineraryMap"
import { ExportService } from "@/services/exportService"
import type { Trip } from "@/types"

interface ItineraryCardProps {
  trip: Trip
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  planning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

const statusLabels: Record<string, string> = {
  draft: "草稿",
  planning: "规划中",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
}

export function ItineraryCard({ trip }: ItineraryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const totalBudget = trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0)
  const totalActivities = trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)
  const hasCoordinates = trip.itinerary.some((day) =>
    day.activities.some((activity) => activity.location.coordinates)
  )

  const handleExportPdf = () => {
    ExportService.exportToPdf(trip)
    setShowExportMenu(false)
  }

  const handleExportJson = () => {
    ExportService.exportToJson(trip)
    setShowExportMenu(false)
  }

  const handleExportMarkdown = () => {
    ExportService.exportToMarkdown(trip)
    setShowExportMenu(false)
  }

  const handleExportPrint = () => {
    ExportService.exportToPrint(trip)
    setShowExportMenu(false)
  }

  const formatDateRange = () => {
    const { startDate, endDate } = trip.duration
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-xl">{trip.name}</CardTitle>
              <Badge className={statusColors[trip.status]} variant="outline">
                {statusLabels[trip.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{trip.destination.name}</span>
                {trip.destination.country && <span>, {trip.destination.country}</span>}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDateRange()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{trip.duration.days} 天</span>
                <span>·</span>
                <span>{totalActivities} 个活动</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium text-foreground">¥{totalBudget.toFixed(0)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-background border rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={handleExportPdf}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                      <FileJson className="h-4 w-4" />
                      导出 PDF (jsPDF)
                    </button>
                    <button
                      onClick={handleExportPrint}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      导出 PDF (打印)
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      导出 Markdown
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                      <FileJson className="h-4 w-4" />
                      导出 JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-6">
          {/* 地图部分 */}
          {hasCoordinates && (
            <ItineraryMap
              itinerary={trip.itinerary}
              destinationName={trip.destination.name}
            />
          )}

          {/* 行程详情 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">行程详情</h3>
            {trip.itinerary.map((day) => (
              <DayPlanCard key={day.dayNumber} dayPlan={day} />
            ))}
          </div>

          {/* 预算汇总 */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">预算汇总</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">总预算</div>
                <div className="text-lg font-semibold">¥{totalBudget.toFixed(0)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">日均预算</div>
                <div className="text-lg font-semibold">¥{(totalBudget / trip.duration.days).toFixed(0)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">活动总数</div>
                <div className="text-lg font-semibold">{totalActivities}</div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
