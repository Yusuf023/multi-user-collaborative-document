"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface GradientIconProps {
  children: ReactNode
  color?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg"
}

export function GradientIcon({
  children,
  color = "var(--color-primary)",
  size = "md",
  className
}: GradientIconProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <div className="relative flex min-h-full min-w-full w-full h-full items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          className="absolute h-full left-0 saturate-150 top-0 w-full z-0 size-full"
          aria-hidden="true"
        >
          <title>Gradient background</title>
          <g clipPath="url(#gradient-icon-clip)">
            <rect width="20" height="20" fill="var(--color-gradient-fill)" rx="5.5" />
            <rect
              width="20"
              height="20"
              fill="url(#gradient-icon-gradient)"
              fillOpacity="0.2"
              rx="5.5"
            />
            <g filter="url(#gradient-icon-blur-1)" opacity="0.3">
              <circle cx="16" cy="17" r="6" fill={color} fillOpacity="0.671" />
            </g>
            <g filter="url(#gradient-icon-blur-2)" opacity="0.1">
              <circle cx="16" cy="16" r="6" fill={color} fillOpacity="0.671" />
            </g>
            <g filter="url(#gradient-icon-blur-3)" opacity="0.4">
              <circle cx="17" cy="19" r="6" fill={color} fillOpacity="0.671" />
            </g>
            <rect width="20" height="20" fill={color} fillOpacity="0.15" rx="5.5" />
            <g style={{ mixBlendMode: "hard-light" }}>
              <rect width="20" height="20" fill={color} fillOpacity="0.1" rx="5.5" />
            </g>
          </g>
          <rect
            width="19"
            height="19"
            x="0.5"
            y="0.5"
            stroke="#FDFDFD"
            strokeOpacity="0.1"
            rx="5"
          />
          <defs>
            <filter
              id="gradient-icon-blur-1"
              width="32"
              height="32"
              x="0"
              y="1"
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="5" />
            </filter>
            <filter
              id="gradient-icon-blur-2"
              width="22"
              height="22"
              x="5"
              y="5"
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter
              id="gradient-icon-blur-3"
              width="22"
              height="22"
              x="6"
              y="8"
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <linearGradient
              id="gradient-icon-gradient"
              x1="10"
              x2="10"
              y1="0"
              y2="20"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FDFDFD" />
              <stop offset="1" stopColor="#FDFDFD" stopOpacity="0" />
            </linearGradient>
            <clipPath id="gradient-icon-clip">
              <rect width="20" height="20" fill="#FDFDFD" rx="5.5" />
            </clipPath>
          </defs>
        </svg>
        <div className="absolute z-10 flex items-center text-foreground/60 justify-center w-full h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
