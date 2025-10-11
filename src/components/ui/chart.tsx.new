"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Simple chart container component
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config?: Record<string, any>
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("chart-container", className)}
      {...props}
    />
  )
})
ChartContainer.displayName = "ChartContainer"

// Simple chart tooltip component  
const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("chart-tooltip", className)}
      {...props}
    />
  )
})
ChartTooltip.displayName = "ChartTooltip"

// Simple chart tooltip content
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("chart-tooltip-content", className)}
      {...props}
    />
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// Simple chart legend
const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("chart-legend", className)}
      {...props}
    />
  )
})
ChartLegend.displayName = "ChartLegend"

// Simple chart legend content
const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideIcon?: boolean
    nameKey?: string
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("chart-legend-content", className)}
      {...props}
    />
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
