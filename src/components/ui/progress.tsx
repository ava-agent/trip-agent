import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "h-full w-full overflow-hidden rounded-full bg-secondary transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        error: "bg-red-500",
      },
      size: {
        default: "h-2",
        sm: "h-1",
        lg: "h-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  showLabel?: boolean
  label?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant, size, showLabel, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div className="w-full space-y-1">
        {(showLabel || label) && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            {showLabel && <span>{Math.round(percentage)}%</span>}
          </div>
        )}
        <div
          ref={ref}
          className={cn("relative w-full overflow-hidden rounded-full bg-secondary", size, className)}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          {...props}
        >
          <div
            className={cn(
              "h-full w-full flex-1 transition-all duration-500 ease-in-out",
              progressVariants({ variant })
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress, progressVariants }
