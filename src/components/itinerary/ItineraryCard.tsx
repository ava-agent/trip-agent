import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign, Download, ChevronDown, FileText, Printer, FileJson, CalendarPlus } from "lucide-react"
import { useState, useRef, useEffect, useMemo } from "react"
import { DayPlanCard } from "./DayPlanCard"
import { ItineraryMap } from "./ItineraryMap"
import { ExportService } from "@/services/exportService"
import { TRIP_STATUS_LABELS } from "@/constants/tripStatus"
import { downloadICS } from "@/lib/export/calendarExport"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import type { Trip } from "@/types"

interface ItineraryCardProps {
  trip: Trip
}

const statusBadgeColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  planning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

export function ItineraryCard({ trip }: ItineraryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const totalBudget = useMemo(
    () => trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0),
    [trip.itinerary]
  )
  const totalActivities = useMemo(
    () => trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0),
    [trip.itinerary]
  )
  const hasCoordinates = useMemo(
    () => trip.itinerary.some((day) =>
      day.activities.some((activity) => activity.location.coordinates)
    ),
    [trip.itinerary]
  )

  // Click outside to close export menu
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showExportMenu])

  const handleExport = async (format: string, exportFn: () => void) => {
    setExporting(format)
    try {
      exportFn()
      toast.success(`${format} 导出成功`)
    } catch {
      toast.error(`${format} 导出失败，请重试`)
    } finally {
      setExporting(null)
      setShowExportMenu(false)
    }
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
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-xl">{trip.name}</CardTitle>
              <Badge className={statusBadgeColors[trip.status]} variant="outline">
                {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
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
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                aria-label="导出选项"
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    className="absolute right-0 mt-2 w-56 bg-popover border rounded-md shadow-lg z-10"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => handleExport("PDF", () => ExportService.exportToPdf(trip))}
                        disabled={exporting === "PDF"}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileJson className="h-4 w-4" />
                        {exporting === "PDF" ? "导出中..." : "导出 PDF"}
                      </button>
                      <button
                        onClick={() => handleExport("打印", () => ExportService.exportToPrint(trip))}
                        disabled={exporting === "打印"}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <Printer className="h-4 w-4" />
                        {exporting === "打印" ? "准备中..." : "打印预览"}
                      </button>
                      <button
                        onClick={() => handleExport("Markdown", () => ExportService.exportToMarkdown(trip))}
                        disabled={exporting === "Markdown"}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileText className="h-4 w-4" />
                        {exporting === "Markdown" ? "导出中..." : "导出 Markdown"}
                      </button>
                      <button
                        onClick={() => handleExport("JSON", () => ExportService.exportToJson(trip))}
                        disabled={exporting === "JSON"}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileJson className="h-4 w-4" />
                        {exporting === "JSON" ? "导出中..." : "导出 JSON"}
                      </button>
                      <div className="border-t my-1" />
                      <button
                        onClick={() => handleExport("日历", () => downloadICS(trip))}
                        disabled={exporting === "日历"}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        {exporting === "日历" ? "导出中..." : "导出到日历 (.ics)"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5" />
              </motion.div>
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-6">
              {/* Map */}
              {hasCoordinates && (
                <ItineraryMap
                  itinerary={trip.itinerary}
                  destinationName={trip.destination.name}
                />
              )}

              {/* Itinerary details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">行程详情</h3>
                {trip.itinerary.map((day) => (
                  <DayPlanCard key={day.dayNumber} dayPlan={day} />
                ))}
              </div>

              {/* Budget summary */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">预算汇总</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">总预算</div>
                    <div className="text-lg font-semibold">¥{totalBudget.toFixed(0)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">日均预算</div>
                    <div className="text-lg font-semibold">
                      ¥{trip.duration.days > 0 ? (totalBudget / trip.duration.days).toFixed(0) : 0}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">活动总数</div>
                    <div className="text-lg font-semibold">{totalActivities}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
