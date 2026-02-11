import jsPDF from "jspdf"
import type { Trip, Activity } from "@/types"

export class PdfExportService {
  /**
   * 导出行程为 PDF
   */
  static exportToPdf(trip: Trip): void {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let yPosition = margin

    // 添加标题
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text(trip.name, margin, yPosition)
    yPosition += 15

    // 添加基本信息
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`目的地: ${trip.destination.name}, ${trip.destination.country}`, margin, yPosition)
    yPosition += 7
    doc.text(
      `行程: ${trip.duration.startDate.toLocaleDateString("zh-CN")} - ${trip.duration.endDate.toLocaleDateString("zh-CN")} (${trip.duration.days}天)`,
      margin,
      yPosition
    )
    yPosition += 7
    doc.text(`状态: ${this.getStatusLabel(trip.status)}`, margin, yPosition)
    yPosition += 10

    // 添加分隔线
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    // 添加每日行程
    for (const dayPlan of trip.itinerary) {
      // 检查是否需要新页面
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = margin
      }

      // 添加日期标题
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      const dayTitle = `第${dayPlan.dayNumber}天 - ${dayPlan.date.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })}`
      doc.text(dayTitle, margin, yPosition)
      yPosition += 10

      // 添加活动
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      for (const activity of dayPlan.activities) {
        if (yPosition > pageHeight - 30) {
          doc.addPage()
          yPosition = margin
        }

        yPosition = this.addActivityToPdf(doc, activity, margin, yPosition, contentWidth)
        yPosition += 5
      }

      // 添加当日预算
      if (dayPlan.estimatedBudget) {
        yPosition += 5
        doc.setFont("helvetica", "bold")
        doc.text(`当日预算: ¥${dayPlan.estimatedBudget.toFixed(0)}`, margin, yPosition)
        yPosition += 10
      }

      // 添加备注
      if (dayPlan.notes) {
        if (yPosition > pageHeight - 20) {
          doc.addPage()
          yPosition = margin
        }
        doc.setFont("helvetica", "italic")
        doc.setFontSize(10)
        const noteLines = doc.splitTextToSize(`备注: ${dayPlan.notes}`, contentWidth)
        doc.text(noteLines, margin, yPosition)
        yPosition += noteLines.length * 5 + 5
      }

      yPosition += 10
    }

    // 添加预算汇总
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = margin
    }

    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("预算汇总", margin, yPosition)
    yPosition += 10

    const totalBudget = trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`总预算: ¥${totalBudget.toFixed(0)}`, margin, yPosition)
    yPosition += 7
    doc.text(`日均预算: ¥${(totalBudget / trip.duration.days).toFixed(0)}`, margin, yPosition)

    // 添加页脚
    const pageCount = doc.internal.pages.length - 1
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.text(
        `由 Trip Agent 生成 - 第 ${i} / ${pageCount} 页`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    }

    // 保存 PDF
    doc.save(`${trip.name}.pdf`)
  }

  /**
   * 添加活动到 PDF
   */
  private static addActivityToPdf(
    doc: jsPDF,
    activity: Activity,
    x: number,
    y: number,
    maxWidth: number
  ): number {
    // 活动名称
    doc.setFont("helvetica", "bold")
    doc.text(`${activity.time.start} - ${activity.time.end} ${activity.name}`, x, y)
    y += 6

    // 描述
    if (activity.description) {
      doc.setFont("helvetica", "normal")
      const descLines = doc.splitTextToSize(activity.description, maxWidth - 10)
      doc.text(descLines, x + 5, y)
      y += descLines.length * 5
    }

    // 位置和费用
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`📍 ${activity.location.name}`, x + 5, y)
    y += 5

    if (activity.cost !== undefined) {
      doc.text(`💰 ¥${activity.cost}`, x + 5, y)
      y += 5
    }

    return y
  }

  /**
   * 获取状态标签
   */
  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: "草稿",
      planning: "规划中",
      confirmed: "已确认",
      completed: "已完成",
      cancelled: "已取消",
    }
    return labels[status] || status
  }
}
