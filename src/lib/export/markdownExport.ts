import type { Trip, DayPlan, Activity } from "@/types"

export class MarkdownExportService {
  /**
   * 导出行程为 Markdown
   */
  static exportToMarkdown(trip: Trip): void {
    const markdown = this.generateMarkdown(trip)
    this.downloadFile(markdown, `${trip.name}.md`, "text/markdown")
  }

  /**
   * 生成 Markdown 格式
   */
  static generateMarkdown(trip: Trip): string {
    let md = this.generateHeader(trip)
    md += this.generateTableOfContents(trip)
    md += this.generateTripOverview(trip)
    md += this.generateItinerary(trip)
    md += this.generateBudgetSummary(trip)
    md += this.generateFooter(trip)

    return md
  }

  /**
   * 生成头部信息
   */
  private static generateHeader(trip: Trip): string {
    return `# ${trip.name}

> ${trip.destination.name}, ${trip.destination.country} · ${trip.duration.days}天行程

`
  }

  /**
   * 生成目录
   */
  private static generateTableOfContents(trip: Trip): string {
    let toc = `## 目录

- [行程概览](#行程概览)
`
    for (const dayPlan of trip.itinerary) {
      toc += `- [第${dayPlan.dayNumber}天](#第${dayPlan.dayNumber}天)\n`
    }
    toc += `- [预算汇总](#预算汇总)\n\n`

    return toc
  }

  /**
   * 生成行程概览
   */
  private static generateTripOverview(trip: Trip): string {
    const totalBudget = trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0)
    const totalActivities = trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)

    let overview = `## 行程概览

### 基本信息

| 项目 | 详情 |
|------|------|
| **目的地** | ${trip.destination.name}, ${trip.destination.country} |
| **开始日期** | ${trip.duration.startDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })} |
| **结束日期** | ${trip.duration.endDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })} |
| **行程天数** | ${trip.duration.days} 天 |
| **活动总数** | ${totalActivities} 个 |
| **总预算** | ¥${totalBudget.toFixed(0)} |
| **日均预算** | ¥${(totalBudget / trip.duration.days).toFixed(0)} |
| **状态** | ${this.getStatusLabel(trip.status)} |

`

    return overview
  }

  /**
   * 生成详细行程
   */
  private static generateItinerary(trip: Trip): string {
    let itinerary = `---\n\n## 详细行程\n\n`

    for (const dayPlan of trip.itinerary) {
      itinerary += this.generateDayPlan(dayPlan)
    }

    return itinerary
  }

  /**
   * 生成单日行程
   */
  private static generateDayPlan(dayPlan: DayPlan): string {
    const dateStr = dayPlan.date.toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    })

    let day = `### 第${dayPlan.dayNumber}天 - ${dateStr}\n\n`

    // 添加活动表格
    day += `| 时间 | 活动 | 地点 | 类型 | 费用 |\n`
    day += `|------|------|------|------|------|\n`

    for (const activity of dayPlan.activities) {
      const time = `${activity.time.start} - ${activity.time.end}`
      const name = activity.name
      const location = activity.location.name
      const type = this.getActivityTypeLabel(activity.type)
      const cost = activity.cost !== undefined ? `¥${activity.cost}` : "-"

      day += `| ${time} | ${name} | ${location} | ${type} | ${cost} |\n`
    }

    day += "\n"

    // 添加活动详情
    day += `#### 活动详情\n\n`

    for (const activity of dayPlan.activities) {
      day += this.generateActivityDetail(activity)
    }

    // 添加当日预算
    if (dayPlan.estimatedBudget) {
      day += `**当日预算**: ¥${dayPlan.estimatedBudget.toFixed(0)}\n\n`
    }

    // 添加备注
    if (dayPlan.notes) {
      day += `> 💡 ${dayPlan.notes}\n\n`
    }

    return day
  }

  /**
   * 生成活动详情
   */
  private static generateActivityDetail(activity: Activity): string {
    let detail = `##### ${activity.time.start} - ${activity.time.end} ${activity.name}\n\n`

    if (activity.description) {
      detail += `${activity.description}\n\n`
    }

    detail += `- 📍 **地点**: ${activity.location.name}\n`

    if (activity.location.address) {
      detail += `- 🏠 **地址**: ${activity.location.address}\n`
    }

    detail += `- 🏷️ **类型**: ${this.getActivityTypeLabel(activity.type)}\n`

    if (activity.cost !== undefined) {
      detail += `- 💰 **费用**: ¥${activity.cost}\n`
    }

    if (activity.rating) {
      detail += `- ⭐ **评分**: ${activity.rating.toFixed(1)}/5.0\n`
    }

    if (activity.bookingUrl) {
      detail += `- 🔗 **预订**: [预订链接](${activity.bookingUrl})\n`
    }

    if (activity.notes) {
      detail += `- 📝 **备注**: ${activity.notes}\n`
    }

    detail += "\n"

    return detail
  }

  /**
   * 生成预算汇总
   */
  private static generateBudgetSummary(trip: Trip): string {
    const totalBudget = trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0)
    const dailyBudgets = trip.itinerary.map((day) => day.estimatedBudget || 0)

    let summary = `---\n\n## 预算汇总\n\n`

    summary += `### 总体预算\n\n`
    summary += `- **总预算**: ¥${totalBudget.toFixed(0)}\n`
    summary += `- **日均预算**: ¥${(totalBudget / trip.duration.days).toFixed(0)}\n`
    summary += `- **最高单日预算**: ¥${Math.max(...dailyBudgets).toFixed(0)}\n`
    summary += `- **最低单日预算**: ¥${Math.min(...dailyBudgets).toFixed(0)}\n\n`

    summary += `### 每日预算明细\n\n`
    summary += `| 日期 | 预算 |\n`
    summary += `|------|------|\n`

    for (const dayPlan of trip.itinerary) {
      const dateStr = dayPlan.date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      })
      const budget = dayPlan.estimatedBudget ? `¥${dayPlan.estimatedBudget.toFixed(0)}` : "-"
      summary += `| 第${dayPlan.dayNumber}天 (${dateStr}) | ${budget} |\n`
    }

    summary += "\n"

    return summary
  }

  /**
   * 生成页脚
   */
  private static generateFooter(_trip: Trip): string {
    const timestamp = new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    return `---\n\n*由 Trip Agent 生成于 ${timestamp}*\n\n## 使用说明\n\n- 本文档为 Markdown 格式，可在任何支持 Markdown 的编辑器中打开\n- 可以使用 GitHub、GitLab 等平台进行预览\n- 推荐使用 Typora、Obsidian、VS Code 等工具进行编辑\n- 导出 PDF 可使用浏览器打印功能（Ctrl/Cmd + P）\n`
  }

  /**
   * 获取活动类型标签
   */
  private static getActivityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      transportation: "交通",
      attraction: "景点",
      dining: "餐饮",
      accommodation: "住宿",
      shopping: "购物",
      other: "其他",
    }
    return labels[type] || type
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

  /**
   * 下载文件
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
