/**
 * Export Service for Trip Agent
 * Handles exporting trip data to PDF, JSON, and Markdown formats
 */

import type { Trip } from "@/types"
import { PdfExportService } from "@/lib/export/pdfExport"
import { MarkdownExportService } from "@/lib/export/markdownExport"
import { PrintExportService } from "@/lib/export/printStyles"

export class ExportService {
  /**
   * 导出为 JSON
   */
  static exportToJson(trip: Trip): void {
    const data = JSON.stringify(trip, null, 2)
    this.downloadFile(data, `${trip.name}.json`, "application/json")
  }

  /**
   * 导出为 Markdown（使用改进的服务）
   */
  static exportToMarkdown(trip: Trip): void {
    MarkdownExportService.exportToMarkdown(trip)
  }

  /**
   * 导出为 PDF（使用 jsPDF）
   */
  static exportToPdf(trip: Trip): void {
    try {
      PdfExportService.exportToPdf(trip)
    } catch (error) {
      if (import.meta.env.DEV) console.error("PDF 导出失败，尝试使用打印方式:", error)
      // 如果 jsPDF 失败，回退到打印方式
      this.exportToPrint(trip)
    }
  }

  /**
   * 导出为打印格式（优化的 HTML）
   */
  static exportToPrint(trip: Trip): void {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("无法打开打印窗口。请检查浏览器弹出窗口设置。")
      return
    }

    const html = PrintExportService.generatePrintHtml(trip)
    printWindow.document.write(html)
    printWindow.document.close()
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
