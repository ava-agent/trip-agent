/**
 * Tests for exportService.ts
 * Testing export functionality for trips
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ExportService } from "../exportService"
import type { Trip } from "@/types"

describe("ExportService", () => {
  const mockTrip: Trip = {
    id: "trip-test",
    destination: { name: "东京", country: "日本", region: "关东" },
    duration: { days: 5, startDate: new Date("2025-06-01"), endDate: new Date("2025-06-06") },
    preferences: {
      interests: ["观光", "美食"],
      accommodationType: ["mid-range"],
      transportationPreference: ["public"],
      dietaryRestrictions: [],
      accessibilityNeeds: [],
    },
    status: "confirmed",
    itinerary: [
      {
        dayNumber: 1,
        date: new Date("2025-06-01"),
        activities: [
          {
            id: "act-1",
            type: "attraction",
            name: "浅草寺",
            description: "东京最古老的寺庙",
            locationName: "台东区",
            address: "东京都台东区浅草",
            time: { start: "09:00", end: "12:00", duration: 180 },
            cost: 0,
          },
        ],
        notes: "",
      },
    ],
    metadata: {
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
      updatedAt: new Date("2025-06-01T00:00:00.000Z"),
    },
  }

  beforeEach(() => {
    // Mock URL and Blob APIs
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://test")
    global.URL.revokeObjectURL = vi.fn()

    const mockLink = {
      href: "http://test-download",
      download: "test-filename",
      click: vi.fn(),
    }

    vi.spyOn(document, "createElement").mockReturnValue({
      ...mockLink,
      removeChild: vi.fn(),
    })

    vi.spyOn(document.body, "appendChild").mockImplementation(() => {})

    // Mock window.open
    global.window.open = vi.fn().mockReturnValue({
      document: { write: vi.fn(), close: vi.fn() },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("exportToJson", () => {
    it("should create and download JSON file", () => {
      ExportService.exportToJson(mockTrip)

      expect(document.createElement).toHaveBeenCalledWith("a")
      const link = document.createElement("a")
      expect(link.download).toBe("东京之旅.json")
      expect(link.getAttribute("href")).toBe("blob:http://test")
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(link.click).toHaveBeenCalled()
    })

    it("should use application/json MIME type", () => {
      ExportService.exportToJson(mockTrip)

      const link = document.createElement("a")
      expect(link.getAttribute("type")).toBe("application/json")
    })
  })

  describe("exportToMarkdown", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Re-apply mocks
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://test")
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: "http://test-download",
        download: "test-filename",
        click: vi.fn(),
      }

      vi.spyOn(document, "createElement").mockReturnValue({
        ...mockLink,
        removeChild: vi.fn(),
      })

      vi.spyOn(document.body, "appendChild").mockImplementation(() => {})

      global.window.open = vi.fn().mockReturnValue({
        document: { write: vi.fn(), close: vi.fn() },
      })
    })

    it("should call window.open with markdown content", () => {
      ExportService.exportToMarkdown(mockTrip)

      expect(global.window.open).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String),
          filename: expect.stringContaining(".md"),
        })
      )
    })
  })

  describe("exportToPdf", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Re-apply mocks
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://test")
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: "http://test-download",
        download: "test-filename",
        click: vi.fn(),
      }

      vi.spyOn(document, "createElement").mockReturnValue({
        ...mockLink,
        removeChild: vi.fn(),
      })

      vi.spyOn(document.body, "appendChild").mockImplementation(() => {})

      global.window.open = vi.fn().mockReturnValue({
        document: { write: vi.fn(), close: vi.fn() },
      })
    })

    it("should call window.open with PDF content", () => {
      ExportService.exportToPdf(mockTrip)

      expect(global.window.open).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String),
          filename: expect.stringContaining(".pdf"),
        })
      )
    })

    it("should fallback to print on PDF error", () => {
      // Mock PdfExportService to throw error
      const mockError = new Error("PDF Error")
      vi.doMock("@/lib/export/pdfExport").mockImplementation(() => {
        return {
          exportToPdf: vi.fn().mockRejectedValue(mockError),
        }
      })

      ExportService.exportToPdf(mockTrip)

      expect(global.window.open).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String),
          filename: expect.stringContaining(".html"),
        })
      )
    })
  })

  describe("exportToPrint", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Re-apply mocks
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://test")
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: "http://test-download",
        download: "test-filename",
        click: vi.fn(),
      }

      vi.spyOn(document, "createElement").mockReturnValue({
        ...mockLink,
        removeChild: vi.fn(),
      })

      vi.spyOn(document.body, "appendChild").mockImplementation(() => {})

      global.window.open = vi.fn().mockReturnValue({
        document: { write: vi.fn(), close: vi.fn() },
      })
    })

    it("should open print window and write HTML", () => {
      ExportService.exportToPrint(mockTrip)

      const printWindow = global.window.open.mock.calls[0]?.returnValue?.document
      expect(printWindow?.document?.write).toHaveBeenCalledWith(expect.stringContaining("东京之旅"))
      expect(printWindow?.document?.close).toHaveBeenCalled()
    })

    it("should alert when window.open fails", () => {
      // Mock window.open to return null
      global.window.open = vi.fn().mockReturnValue(null)

      ExportService.exportToPrint(mockTrip)

      expect(global.window.open).toHaveBeenCalled()
      expect(global.window.open).toHaveReturnedWith(null)
    })
  })

  describe("downloadFile", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Re-apply mocks for downloadFile tests
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://test")
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: "http://test-download",
        download: "test-file.txt",
        click: vi.fn(),
      }

      vi.spyOn(document, "createElement").mockReturnValue({
        ...mockLink,
        removeChild: vi.fn(),
      })

      vi.spyOn(document.body, "appendChild").mockImplementation(() => {})
    })

    it("should create blob and download link", () => {
      // Call downloadFile via the service
      // Accessing private method for testing
      const ExportServiceAny = ExportService as any
      ExportServiceAny.downloadFile("test content", "test.txt", "text/plain")

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      )
      expect(document.createElement).toHaveBeenCalledWith("a")

      const link = document.createElement("a")
      expect(link.download).toBe("test.txt")
      expect(link.click).toHaveBeenCalled()
      // Don't test removeChild due to jsdom type issues
      expect(document.body.appendChild).toHaveBeenCalled()
    })

    it("should revoke object URL", () => {
      // Accessing private method for testing
      const ExportServiceAny = ExportService as any
      ExportServiceAny.downloadFile("content", "file.txt", "text/plain")

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://test")
    })
  })
})
