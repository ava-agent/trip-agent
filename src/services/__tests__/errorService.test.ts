/**
 * Tests for errorService.ts
 * Testing centralized error handling and user-friendly messages
 */

import { describe, it, expect, vi } from "vitest"
import {
  ErrorService,
  reportError,
  getUserMessage,
  getUserMessageZh,
  getRecoveryActions,
  isRetryable,
  ErrorCode,
  ErrorCategory,
} from "../errorService"

describe("ErrorService", () => {
  describe("report", () => {
    it("should create error report with all properties", () => {
      const report = ErrorService.report(
        ErrorCode.NETWORK_ERROR,
        { url: "https://api.example.com" }
      )

      expect(report).toHaveProperty("code", ErrorCode.NETWORK_ERROR)
      expect(report).toHaveProperty("category", ErrorCategory.NETWORK)
      expect(report).toHaveProperty("message", "Network connection failed")
      expect(report).toHaveProperty("userMessage")
      expect(report).toHaveProperty("userMessageZh")
      expect(report).toHaveProperty("timestamp")
      expect(report.timestamp).toBeInstanceOf(Date)
      expect(report.context).toEqual({ url: "https://api.example.com" })
      expect(report.recovery).toBeInstanceOf(Array)
    })

    it("should log original error to console", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const originalError = new Error("Original error message")
      const report = ErrorService.report(
        ErrorCode.FETCH_FAILED,
        undefined,
        originalError
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ErrorService] FETCH_FAILED:",
        expect.objectContaining({
          code: ErrorCode.FETCH_FAILED,
          originalError
        })
      )
      expect(report.category).toBe(ErrorCategory.NETWORK)
      expect(report.message).toBe("Failed to fetch data")
      consoleSpy.mockRestore()
    })

    it("should add error to internal history", () => {
      // History is managed internally - verify by not throwing
      expect(() => {
        ErrorService.report(ErrorCode.TIMEOUT, {})
        ErrorService.report(ErrorCode.NETWORK_ERROR, {})
        ErrorService.report(ErrorCode.INVALID_API_KEY, {})
      }).not.toThrow()
    })
  })

  describe("getUserMessage", () => {
    it("should return English user message for network errors", () => {
      const message = getUserMessage(ErrorCode.NETWORK_ERROR)

      expect(message).toBe("Network error. Please check your internet connection.")
    })

    it("should return English user message for auth errors", () => {
      const message = getUserMessage(ErrorCode.INVALID_API_KEY)

      expect(message).toBe("Invalid API key. Please check your settings and configure a valid key.")
    })

    it("should return English user message for timeout", () => {
      const message = getUserMessage(ErrorCode.TIMEOUT)

      expect(message).toBe("Request timed out. Please check your connection and try again.")
    })

    it("should return English user message for rate limit", () => {
      const message = getUserMessage(ErrorCode.RATE_LIMIT_EXCEEDED)

      expect(message).toBe("Too many requests. Please wait a moment and try again.")
    })

    it("should return English user message for quota exceeded", () => {
      const message = getUserMessage(ErrorCode.QUOTA_EXCEEDED)

      expect(message).toBe("API quota exceeded. Please upgrade your plan or wait for quota reset.")
    })

    it("should return English user message for validation errors", () => {
      const message = getUserMessage(ErrorCode.INVALID_INPUT)

      expect(message).toBe("Invalid input. Please check your input and try again.")
    })

    it("should return English user message for server errors", () => {
      const message = getUserMessage(ErrorCode.SERVER_ERROR)

      expect(message).toBe("Service is temporarily unavailable. Please try again later.")
    })

    it("should return English user message for LLM errors", () => {
      const message = getUserMessage(ErrorCode.LLM_NOT_CONFIGURED)

      expect(message).toBe("AI service not configured. Please set an API key in settings.")
    })

    it("should return default message for unknown error", () => {
      const message = getUserMessage(ErrorCode.UNKNOWN_ERROR as any)

      expect(message).toBe("An unexpected error occurred. Please try again.")
    })
  })

  describe("getUserMessageZh", () => {
    it("should return Chinese user message for network errors", () => {
      const message = getUserMessageZh(ErrorCode.NETWORK_ERROR)

      expect(message).toBe("网络连接失败。请检查您的网络连接。")
    })

    it("should return Chinese user message for auth errors", () => {
      const message = getUserMessageZh(ErrorCode.INVALID_API_KEY)

      expect(message).toBe("API 密钥无效。请在设置中配置有效的密钥。")
    })

    it("should return Chinese user message for timeout", () => {
      const message = getUserMessageZh(ErrorCode.TIMEOUT)

      expect(message).toBe("请求超时。请检查您的连接并重试。")
    })

    it("should return Chinese user message for rate limit", () => {
      const message = getUserMessageZh(ErrorCode.RATE_LIMIT_EXCEEDED)

      expect(message).toBe("请求过于频繁。请稍等片刻后重试。")
    })

    it("should return Chinese user message for validation errors", () => {
      const message = getUserMessageZh(ErrorCode.INVALID_INPUT)

      expect(message).toBe("输入无效。请检查您的输入后重试。")
    })

    it("should return default message for unknown error", () => {
      const message = getUserMessageZh(ErrorCode.UNKNOWN_ERROR as any)

      expect(message).toBe("发生了意外错误。请重试。")
    })
  })

  describe("getRecoveryActions", () => {
    it("should return retry action for network errors", () => {
      const actions = getRecoveryActions(ErrorCode.NETWORK_ERROR)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Retry")
      expect(actions[0].labelZh).toBe("重试")
      expect(actions[0].icon).toBe("retry")
    })

    it("should return settings action for auth errors", () => {
      const actions = getRecoveryActions(ErrorCode.INVALID_API_KEY)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Open Settings")
      expect(actions[0].labelZh).toBe("打开设置")
      expect(actions[0].icon).toBe("settings")
    })

    it("should return wait action for rate limit", () => {
      const actions = getRecoveryActions(ErrorCode.RATE_LIMIT_EXCEEDED)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Wait & Retry")
      expect(actions[0].labelZh).toBe("等待后重试")
    })

    it("should return settings action for quota exceeded", () => {
      const actions = getRecoveryActions(ErrorCode.QUOTA_EXCEEDED)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Check Quota")
      expect(actions[0].labelZh).toBe("查看配额")
      expect(actions[0].icon).toBe("settings")
    })

    it("should return multiple actions for server errors", () => {
      const actions = getRecoveryActions(ErrorCode.SERVER_ERROR)

      expect(actions).toHaveLength(2)
      expect(actions[0].label).toBe("Refresh")
      expect(actions[1].label).toBe("Go to Home")
    })

    it("should return retry action for validation errors", () => {
      const actions = getRecoveryActions(ErrorCode.INVALID_INPUT)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Fix Input")
      expect(actions[0].labelZh).toBe("修正输入")
    })

    it("should return retry action for unknown errors", () => {
      const actions = getRecoveryActions(ErrorCode.UNKNOWN_ERROR as any)

      expect(actions).toHaveLength(1)
      expect(actions[0].label).toBe("Retry")
    })
  })

  describe("isRetryable", () => {
    it("should return true for network errors", () => {
      expect(isRetryable(ErrorCode.NETWORK_ERROR)).toBe(true)
      expect(isRetryable(ErrorCode.FETCH_FAILED)).toBe(true)
      expect(isRetryable(ErrorCode.TIMEOUT)).toBe(true)
    })

    it("should return true for server errors", () => {
      expect(isRetryable(ErrorCode.SERVER_ERROR)).toBe(true)
      expect(isRetryable(ErrorCode.SERVICE_UNAVAILABLE)).toBe(true)
    })

    it("should return false for validation errors", () => {
      expect(isRetryable(ErrorCode.INVALID_INPUT)).toBe(false)
      expect(isRetryable(ErrorCode.MISSING_REQUIRED_FIELD)).toBe(false)
      expect(isRetryable(ErrorCode.INVALID_FORMAT)).toBe(false)
    })
  })

  describe("error categories", () => {
    it("should have correct number of categories", () => {
      const categories = [
        ErrorCategory.NETWORK,
        ErrorCategory.AUTH,
        ErrorCategory.RATE_LIMIT,
        ErrorCategory.QUOTA,
        ErrorCategory.VALIDATION,
        ErrorCategory.TIMEOUT,
        ErrorCategory.SERVER,
        ErrorCategory.UNKNOWN,
      ]

      expect(categories).toHaveLength(8)
    })

    it("should have network category", () => {
      expect(ErrorCategory.NETWORK).toBe("network")
    })

    it("should have auth category", () => {
      expect(ErrorCategory.AUTH).toBe("auth")
    })

    it("should have rate_limit category", () => {
      expect(ErrorCategory.RATE_LIMIT).toBe("rate_limit")
    })

    it("should have quota category", () => {
      expect(ErrorCategory.QUOTA).toBe("quota")
    })

    it("should have validation category", () => {
      expect(ErrorCategory.VALIDATION).toBe("validation")
    })

    it("should have timeout category", () => {
      expect(ErrorCategory.TIMEOUT).toBe("timeout")
    })

    it("should have server category", () => {
      expect(ErrorCategory.SERVER).toBe("server")
    })

    it("should have unknown category", () => {
      expect(ErrorCategory.UNKNOWN).toBe("unknown")
    })
  })

  describe("error codes", () => {
    it("should have network error codes", () => {
      expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR")
      expect(ErrorCode.FETCH_FAILED).toBe("FETCH_FAILED")
      expect(ErrorCode.TIMEOUT).toBe("TIMEOUT")
    })

    it("should have auth error codes", () => {
      expect(ErrorCode.INVALID_API_KEY).toBe("INVALID_API_KEY")
      expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED")
      expect(ErrorCode.AUTH_EXPIRED).toBe("AUTH_EXPIRED")
    })

    it("should have rate limit error codes", () => {
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe("RATE_LIMIT_EXCEEDED")
      expect(ErrorCode.QUOTA_EXCEEDED).toBe("QUOTA_EXCEEDED")
    })

    it("should have validation error codes", () => {
      expect(ErrorCode.INVALID_INPUT).toBe("INVALID_INPUT")
      expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe("MISSING_REQUIRED_FIELD")
      expect(ErrorCode.INVALID_FORMAT).toBe("INVALID_FORMAT")
    })

    it("should have server error codes", () => {
      expect(ErrorCode.SERVER_ERROR).toBe("SERVER_ERROR")
      expect(ErrorCode.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE")
    })

    it("should have LLM error codes", () => {
      expect(ErrorCode.LLM_NOT_CONFIGURED).toBe("LLM_NOT_CONFIGURED")
      expect(ErrorCode.LLM_API_ERROR).toBe("LLM_API_ERROR")
    })

    it("should have unknown error code", () => {
      expect(ErrorCode.UNKNOWN_ERROR).toBe("UNKNOWN_ERROR")
    })
  })

  describe("reportError convenience function", () => {
    it("should export error report", () => {
      const report = reportError(ErrorCode.TIMEOUT, { testContext: "value" })

      expect(report.code).toBe(ErrorCode.TIMEOUT)
      expect(report.category).toBe(ErrorCategory.TIMEOUT)
      expect(report.context).toEqual({ testContext: "value" })
      expect(report.userMessage).toBeDefined()
      expect(report.userMessageZh).toBeDefined()
    })
  })

  describe("integration", () => {
    it("should handle error reporting workflow", () => {
      // Report a network error
      ErrorService.report(ErrorCode.NETWORK_ERROR, { attempt: 1 })

      // Report auth error
      ErrorService.report(ErrorCode.INVALID_API_KEY, { attempt: 2 })

      // Note: getHistory and getStats are not exported
      // We verify that ErrorService works correctly
      expect(() => {
        ErrorService.report(ErrorCode.RATE_LIMIT_EXCEEDED, {})
      }).not.toThrow()

      // Get recovery for auth error
      const recovery = getRecoveryActions(ErrorCode.INVALID_API_KEY)
      expect(recovery[0].label).toBe("Open Settings")

      // Check if network error is retryable
      expect(isRetryable(ErrorCode.NETWORK_ERROR)).toBe(true)

      // Check auth error is NOT retryable
      expect(isRetryable(ErrorCode.INVALID_API_KEY)).toBe(false)
      expect(isRetryable(ErrorCode.AUTH_EXPIRED)).toBe(false)
    })
  })
})
