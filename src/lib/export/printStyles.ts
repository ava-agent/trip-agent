/**
 * 打印样式和 HTML 生成工具
 */

export class PrintExportService {
  /**
   * 生成打印优化的 HTML
   */
  static generatePrintHtml(trip: import("@/types").Trip): string {
    const totalBudget = trip.itinerary.reduce((sum, day) => sum + (day.estimatedBudget || 0), 0)
    const totalActivities = trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.name} - 行程单</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 28px;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
      font-size: 14px;
      color: #6b7280;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-item svg {
      width: 16px;
      height: 16px;
    }

    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: ${this.getStatusColor(trip.status)};
      color: ${this.getStatusTextColor(trip.status)};
    }

    .section {
      margin: 30px 0;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }

    .day {
      margin: 25px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .day-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .day-date {
      font-size: 14px;
      color: #6b7280;
    }

    .activity {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }

    .activity-time {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 5px;
    }

    .activity-name {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 5px;
    }

    .activity-desc {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 10px;
    }

    .activity-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 13px;
      color: #6b7280;
    }

    .activity-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .budget-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .budget-card {
      padding: 15px;
      background: #f3f4f6;
      border-radius: 8px;
      text-align: center;
    }

    .budget-card-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .budget-card-value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .notes {
      margin-top: 15px;
      padding: 12px;
      background: #fffbeb;
      border-radius: 6px;
      font-size: 13px;
      color: #92400e;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }

      .day {
        page-break-inside: avoid;
      }

      .activity {
        page-break-inside: avoid;
      }

      .section {
        page-break-after: avoid;
      }
    }

    @media (max-width: 600px) {
      .container {
        padding: 20px;
      }

      .meta-grid {
        grid-template-columns: 1fr;
      }

      .day-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${trip.name}</h1>
      <div class="meta-grid">
        <div class="meta-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span>${trip.destination.name}, ${trip.destination.country}</span>
        </div>
        <div class="meta-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>${trip.duration.startDate.toLocaleDateString("zh-CN")} - ${trip.duration.endDate.toLocaleDateString("zh-CN")}</span>
        </div>
        <div class="meta-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>${trip.duration.days} 天 · ${totalActivities} 个活动</span>
        </div>
        <div class="meta-item">
          <span class="status">${this.getStatusLabel(trip.status)}</span>
        </div>
      </div>
    </div>

    <!-- Itinerary -->
    <div class="section">
      <h2 class="section-title">行程详情</h2>
      ${trip.itinerary.map((dayPlan) => this.generateDayHtml(dayPlan)).join("")}
    </div>

    <!-- Budget Summary -->
    <div class="section">
      <h2 class="section-title">预算汇总</h2>
      <div class="budget-summary">
        <div class="budget-card">
          <div class="budget-card-label">总预算</div>
          <div class="budget-card-value">¥${totalBudget.toFixed(0)}</div>
        </div>
        <div class="budget-card">
          <div class="budget-card-label">日均预算</div>
          <div class="budget-card-value">¥${(totalBudget / trip.duration.days).toFixed(0)}</div>
        </div>
        <div class="budget-card">
          <div class="budget-card-label">活动总数</div>
          <div class="budget-card-value">${totalActivities}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>由 Trip Agent 生成 · ${new Date().toLocaleString("zh-CN")}</p>
    </div>
  </div>

  <script>
    // 自动触发打印
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`

    return html
  }

  /**
   * 生成单日 HTML
   */
  private static generateDayHtml(dayPlan: import("@/types").DayPlan): string {
    const dateStr = dayPlan.date.toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    })

    const activitiesHtml = dayPlan.activities
      .map((activity) => this.generateActivityHtml(activity))
      .join("")

    const notesHtml = dayPlan.notes ? `<div class="notes">💡 ${dayPlan.notes}</div>` : ""
    const budgetHtml = dayPlan.estimatedBudget
      ? `<div style="margin-top: 15px; font-size: 14px; font-weight: 600; color: #6b7280;">当日预算: ¥${dayPlan.estimatedBudget.toFixed(0)}</div>`
      : ""

    return `
      <div class="day">
        <div class="day-header">
          <div class="day-title">第 ${dayPlan.dayNumber} 天</div>
          <div class="day-date">${dateStr}</div>
        </div>
        ${activitiesHtml}
        ${budgetHtml}
        ${notesHtml}
      </div>
    `
  }

  /**
   * 生成活动 HTML
   */
  private static generateActivityHtml(activity: import("@/types").Activity): string {
    const icon = this.getActivityIcon(activity.type)
    const descHtml = activity.description ? `<div class="activity-desc">${activity.description}</div>` : ""
    const costHtml =
      activity.cost !== undefined
        ? `<span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ¥${activity.cost}</span>`
        : ""

    return `
      <div class="activity">
        <div class="activity-time">${activity.time.start} - ${activity.time.end} (${activity.time.duration}分钟)</div>
        <div class="activity-name">${icon} ${activity.name}</div>
        ${descHtml}
        <div class="activity-meta">
          <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> ${activity.location.name}</span>
          ${costHtml}
        </div>
      </div>
    `
  }

  /**
   * 获取活动图标
   */
  private static getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      transportation: "🚗",
      attraction: "🏛️",
      dining: "🍽️",
      accommodation: "🏨",
      shopping: "🛍️",
      other: "📍",
    }
    return icons[type] || icons.other
  }

  /**
   * 获取状态颜色
   */
  private static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      draft: "#e5e7eb",
      planning: "#fef3c7",
      confirmed: "#d1fae5",
      completed: "#dbeafe",
      cancelled: "#fee2e2",
    }
    return colors[status] || colors.draft
  }

  /**
   * 获取状态文字颜色
   */
  private static getStatusTextColor(status: string): string {
    const colors: Record<string, string> = {
      draft: "#374151",
      planning: "#92400e",
      confirmed: "#065f46",
      completed: "#1e40af",
      cancelled: "#991b1b",
    }
    return colors[status] || colors.draft
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
