/**
 * React Error Boundary Component
 * Catches React component errors and displays user-friendly error messages
 */

import { Component } from "react"
import type { ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { reportError, getRecoveryActions, ErrorCode } from "@/services/errorService"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}

export class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    // Log error to error service
    reportError(ErrorCode.UNKNOWN_ERROR, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }, error)

    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onRetry: () => void
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps): ReactNode {
  // Get recovery actions based on error type
  let errorCode = ErrorCode.UNKNOWN_ERROR

  // Try to determine error type from error message
  if (error?.message) {
    const message = error.message.toLowerCase()
    if (message.includes("network") || message.includes("fetch")) {
      errorCode = ErrorCode.NETWORK_ERROR
    } else if (message.includes("api key") || message.includes("unauthorized")) {
      errorCode = ErrorCode.INVALID_API_KEY
    } else if (message.includes("timeout")) {
      errorCode = ErrorCode.TIMEOUT
    } else if (message.includes("rate limit")) {
      errorCode = ErrorCode.RATE_LIMIT_EXCEEDED
    }
  }

  const recoveryActions = getRecoveryActions(errorCode)

  // Get icon for primary action
  const getIcon = (icon?: string) => {
    switch (icon) {
      case "retry":
        return <RefreshCw className="w-5 h-5" />
      case "refresh":
        return <RefreshCw className="w-5 h-5" />
      case "settings":
        return <Settings className="w-5 h-5" />
      case "home":
        return <Home className="w-5 h-5" />
      default:
        return <RefreshCw className="w-5 h-5" />
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full">
        <div className="p-6">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-semibold text-center mb-2">
            出错了
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {error?.message || "发生了意外错误"}
          </p>

          {/* Error Details (Development Only) */}
          {import.meta.env.DEV && error && (
            <details className="mb-4 p-3 bg-muted/50 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                错误详情 (开发模式)
              </summary>
              <div className="mt-2 text-xs">
                <div className="font-mono bg-background p-2 rounded overflow-auto max-h-32">
                  {error.stack}
                </div>
              </div>
            </details>
          )}

          {/* Recovery Actions */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              您可以尝试以下操作来解决问题：
            </p>
            {recoveryActions.map((action, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  action.action()
                  if (index === 0) {
                    onRetry()
                  }
                }}
              >
                {getIcon(action.icon)}
                <span className="ml-2">
                  {action.labelZh}
                </span>
              </Button>
            ))}
          </div>

          {/* Support Link */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              如果问题持续存在，请联系支持或查看
              <a
                href="https://github.com/your-repo/trip-agent/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                GitHub Issues
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Export as default and named export
const ErrorBoundary = ErrorBoundaryClass
export { ErrorBoundary }
export default ErrorBoundaryClass
