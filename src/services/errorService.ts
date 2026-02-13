/**
 * Centralized Error Handling Service
 * Provides error categorization, user-friendly messages, and recovery suggestions
 */

// ============================================================================
// Error Types and Categories
// ============================================================================

export enum ErrorCategory {
  NETWORK = "network",
  AUTH = "auth",
  RATE_LIMIT = "rate_limit",
  QUOTA = "quota",
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  SERVER = "server",
  UNKNOWN = "unknown"
}

export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = "NETWORK_ERROR",
  FETCH_FAILED = "FETCH_FAILED",
  TIMEOUT = "TIMEOUT",

  // Auth Errors
  INVALID_API_KEY = "INVALID_API_KEY",
  UNAUTHORIZED = "UNAUTHORIZED",
  AUTH_EXPIRED = "AUTH_EXPIRED",

  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Validation Errors
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",

  // Server Errors
  SERVER_ERROR = "SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // LLM Errors
  LLM_NOT_CONFIGURED = "LLM_NOT_CONFIGURED",
  LLM_API_ERROR = "LLM_API_ERROR",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface ErrorReport {
  code: ErrorCode
  category: ErrorCategory
  message: string
  userMessage: string
  userMessageZh: string
  timestamp: Date
  context?: Record<string, unknown>
  recovery?: RecoveryAction[]
}

export interface RecoveryAction {
  label: string
  labelZh: string
  action: () => void | Promise<void>
  icon?: "retry" | "refresh" | "settings" | "home"
}

// ============================================================================
// Error Message Mappings
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string; userMessageZh: string; category: ErrorCategory }> = {
  // Network Errors
  [ErrorCode.NETWORK_ERROR]: {
    message: "Network connection failed",
    userMessage: "Network error. Please check your internet connection.",
    userMessageZh: "网络连接失败。请检查您的网络连接。",
    category: ErrorCategory.NETWORK
  },
  [ErrorCode.FETCH_FAILED]: {
    message: "Failed to fetch data",
    userMessage: "Failed to load data. Please try again.",
    userMessageZh: "加载数据失败。请重试。",
    category: ErrorCategory.NETWORK
  },
  [ErrorCode.TIMEOUT]: {
    message: "Request timeout",
    userMessage: "Request timed out. Please check your connection and try again.",
    userMessageZh: "请求超时。请检查您的连接并重试。",
    category: ErrorCategory.TIMEOUT
  },

  // Auth Errors
  [ErrorCode.INVALID_API_KEY]: {
    message: "Invalid API key",
    userMessage: "Invalid API key. Please check your settings and configure a valid key.",
    userMessageZh: "API 密钥无效。请在设置中配置有效的密钥。",
    category: ErrorCategory.AUTH
  },
  [ErrorCode.UNAUTHORIZED]: {
    message: "Unauthorized access",
    userMessage: "Access denied. Please check your API key configuration.",
    userMessageZh: "访问被拒绝。请检查您的 API 密钥配置。",
    category: ErrorCategory.AUTH
  },
  [ErrorCode.AUTH_EXPIRED]: {
    message: "Authentication expired",
    userMessage: "Your authentication has expired. Please reconfigure your API key.",
    userMessageZh: "身份验证已过期。请重新配置您的 API 密钥。",
    category: ErrorCategory.AUTH
  },

  // Rate Limit Errors
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    message: "Rate limit exceeded",
    userMessage: "Too many requests. Please wait a moment and try again.",
    userMessageZh: "请求过于频繁。请稍等片刻后重试。",
    category: ErrorCategory.RATE_LIMIT
  },
  [ErrorCode.QUOTA_EXCEEDED]: {
    message: "API quota exceeded",
    userMessage: "API quota exceeded. Please upgrade your plan or wait for quota reset.",
    userMessageZh: "API 配额已用尽。请升级您的套餐或等待配额重置。",
    category: ErrorCategory.QUOTA
  },

  // Validation Errors
  [ErrorCode.INVALID_INPUT]: {
    message: "Invalid input provided",
    userMessage: "Invalid input. Please check your input and try again.",
    userMessageZh: "输入无效。请检查您的输入后重试。",
    category: ErrorCategory.VALIDATION
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: "Required field is missing",
    userMessage: "Required information is missing. Please provide all required details.",
    userMessageZh: "缺少必需信息。请提供所有必需的详细信息。",
    category: ErrorCategory.VALIDATION
  },
  [ErrorCode.INVALID_FORMAT]: {
    message: "Invalid format",
    userMessage: "The format of your input is invalid. Please check and try again.",
    userMessageZh: "输入格式无效。请检查后重试。",
    category: ErrorCategory.VALIDATION
  },

  // Server Errors
  [ErrorCode.SERVER_ERROR]: {
    message: "Server error occurred",
    userMessage: "Service is temporarily unavailable. Please try again later.",
    userMessageZh: "服务暂时不可用。请稍后重试。",
    category: ErrorCategory.SERVER
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: "Service unavailable",
    userMessage: "The service is currently unavailable. Please try again later.",
    userMessageZh: "该服务当前不可用。请稍后重试。",
    category: ErrorCategory.SERVER
  },

  // LLM Errors
  [ErrorCode.LLM_NOT_CONFIGURED]: {
    message: "LLM service not configured",
    userMessage: "AI service not configured. Please set an API key in settings.",
    userMessageZh: "AI 服务未配置。请在设置中设置 API 密钥。",
    category: ErrorCategory.AUTH
  },
  [ErrorCode.LLM_API_ERROR]: {
    message: "LLM API error",
    userMessage: "AI service error. Please try again or check your API key.",
    userMessageZh: "AI 服务错误。请重试或检查您的 API 密钥。",
    category: ErrorCategory.SERVER
  },

  // Unknown
  [ErrorCode.UNKNOWN_ERROR]: {
    message: "An unknown error occurred",
    userMessage: "An unexpected error occurred. Please try again.",
    userMessageZh: "发生了意外错误。请重试。",
    category: ErrorCategory.UNKNOWN
  }
}

// ============================================================================
// Recovery Action Templates
// ============================================================================

function getRecoveryActionsImpl(code: ErrorCode): RecoveryAction[] {
  switch (code) {
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.FETCH_FAILED:
    case ErrorCode.TIMEOUT:
      return [
        {
          label: "Retry",
          labelZh: "重试",
          icon: "retry",
          action: () => window.location.reload()
        }
      ]

    case ErrorCode.INVALID_API_KEY:
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.AUTH_EXPIRED:
    case ErrorCode.LLM_NOT_CONFIGURED:
      return [
        {
          label: "Open Settings",
          labelZh: "打开设置",
          icon: "settings",
          action: () => {
            // Navigate to settings - will be handled by component
            window.dispatchEvent(new CustomEvent("open-settings"))
          }
        }
      ]

    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return [
        {
          label: "Wait & Retry",
          labelZh: "等待后重试",
          icon: "retry",
          action: () => window.location.reload()
        }
      ]

    case ErrorCode.QUOTA_EXCEEDED:
      return [
        {
          label: "Check Quota",
          labelZh: "查看配额",
          icon: "settings",
          action: () => {
            window.dispatchEvent(new CustomEvent("open-quota"))
          }
        }
      ]

    case ErrorCode.SERVER_ERROR:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return [
        {
          label: "Refresh",
          labelZh: "刷新",
          icon: "refresh",
          action: () => window.location.reload()
        },
        {
          label: "Go to Home",
          labelZh: "返回首页",
          icon: "home",
          action: () => { window.location.href = "/" }
        }
      ]

    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FORMAT:
      return [
        {
          label: "Fix Input",
          labelZh: "修正输入",
          icon: "retry",
          action: () => {
            window.dispatchEvent(new CustomEvent("focus-input"))
          }
        }
      ]

    default:
      return [
        {
          label: "Retry",
          labelZh: "重试",
          icon: "retry",
          action: () => window.location.reload()
        }
      ]
  }
}

// ============================================================================
// Error Service
// ============================================================================

class ErrorServiceClass {
  private errorHistory: ErrorReport[] = []
  private readonly MAX_HISTORY = 50

  /**
   * Report an error
   */
  report(
    code: ErrorCode,
    context?: Record<string, unknown>,
    originalError?: Error | unknown
  ): ErrorReport {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]
    const report: ErrorReport = {
      code,
      category: errorInfo.category,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      userMessageZh: errorInfo.userMessageZh,
      timestamp: new Date(),
      context,
      recovery: getRecoveryActions(code)
    }

    // Add to history
    this.errorHistory.push(report)
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift()
    }

    // Log to console with context
    console.error(`[ErrorService] ${code}:`, {
      ...report,
      originalError
    })

    return report
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(code: ErrorCode): string {
    const errorInfo = ERROR_MESSAGES[code]
    if (!errorInfo) {
      return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR].userMessage
    }
    return errorInfo.userMessage
  }

  /**
   * Get user-friendly error message in Chinese
   */
  getUserMessageZh(code: ErrorCode): string {
    const errorInfo = ERROR_MESSAGES[code]
    if (!errorInfo) {
      return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR].userMessageZh
    }
    return errorInfo.userMessageZh
  }

  /**
   * Get recovery actions for an error code
   */
  getRecoveryActions(code: ErrorCode): RecoveryAction[] {
    return getRecoveryActionsImpl(code)
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.FETCH_FAILED,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      ErrorCode.SERVER_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE
    ].includes(code)
  }

  /**
   * Get error history
   */
  getHistory(): ErrorReport[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getStats(): { byCategory: Record<string, number>; total: number } {
    const byCategory: Record<string, number> = {}
    for (const error of this.errorHistory) {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1
    }
    return {
      byCategory,
      total: this.errorHistory.length
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const ErrorService = new ErrorServiceClass()

// Convenience exports
export function reportError(
  code: ErrorCode,
  context?: Record<string, unknown>,
  originalError?: Error | unknown
): ErrorReport {
  return ErrorService.report(code, context, originalError)
}

export function getUserMessage(code: ErrorCode): string {
  return ErrorService.getUserMessage(code)
}

export function getUserMessageZh(code: ErrorCode): string {
  return ErrorService.getUserMessageZh(code)
}

export function getRecoveryActions(code: ErrorCode): RecoveryAction[] {
  return getRecoveryActionsImpl(code)
}

export function isRetryable(code: ErrorCode): boolean {
  return ErrorService.isRetryable(code)
}
