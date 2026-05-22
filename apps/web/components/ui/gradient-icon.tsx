import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface GradientIconProps {
  children: ReactNode
  color?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16"
}

export function GradientIcon({ children, color = "var(--color-background)", size = "xl", className }: GradientIconProps) {
  const id = `gradient-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div className={cn("relative inline-flex items-center justify-center", sizeClasses[size], className)}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-blur1`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          <filter id={`${id}-blur2`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Base rounded rectangle */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--color-muted)" />

        {/* Gradient sheen overlay */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}-sheen)`} />

        {/* Blurred glow circles */}
        <circle cx="48" cy="48" r="12" fill={color} opacity="0.3" filter={`url(#${id}-blur1)`} />
        <circle cx="44" cy="52" r="8" fill={color} opacity="0.1" filter={`url(#${id}-blur2)`} />
        <circle cx="52" cy="44" r="6" fill={color} opacity="0.4" filter={`url(#${id}-blur2)`} />

        {/* Flat color overlay */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill={color} opacity="0.15" />

        {/* Border stroke */}
        <rect x="2" y="2" width="60" height="60" rx="14" stroke="white" strokeOpacity="0.1" strokeWidth="1" fill="none" />
      </svg>

      {/* Icon content */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
