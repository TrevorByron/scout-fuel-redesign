"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChartUpIcon, ChartDownIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const GaugeComponent = dynamic(
  () => import("@knowyourdeveloper/react-gauge-component").then((m) => m.GaugeComponent),
  { ssr: false }
)

export interface OptimizationGaugeCardProps {
  value: number
  /** Optional trend vs comparison period (e.g. 12.5 for "+12.5% from last month"). */
  trendFromLastMonth?: number
  /** Label for the trend, e.g. "from yesterday", "from last week", "from last month". Default "from last month". */
  trendLabel?: string
  /** Card size: "sm" reduces padding and gap. */
  size?: "default" | "sm"
}

/** Clamp value to 0–100 for display. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/** Tailwind text color class matching the gauge segment: red → yellow gradient below 90%, green only at 90%+. */
function gaugeSegmentColorClass(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-500"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-500"
  return "text-red-600 dark:text-red-500"
}

/**
 * Speedometer-style gauge: gradient from red (0%) through yellow to green only at 90%+.
 * Layout: responsive stack on small screens, side-by-side on md+ with insights in a clear right column.
 */
export function OptimizationGaugeCard({
  value,
  trendFromLastMonth,
  trendLabel = "from last month",
  size = "default",
}: OptimizationGaugeCardProps) {
  const pct = clamp(value)
  const pctRounded = Math.round(pct)

  return (
    <Card size={size}>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Fleet optimization</CardTitle>
        {trendFromLastMonth != null && (
          <CardAction>
            <Badge variant="outline" className="gap-1.5 font-medium tabular-nums">
              <HugeiconsIcon
                icon={trendFromLastMonth >= 0 ? ChartUpIcon : ChartDownIcon}
                strokeWidth={2}
                className="size-3"
              />
              {trendFromLastMonth >= 0 ? "+" : ""}
              {trendFromLastMonth}% {trendLabel}
            </Badge>
          </CardAction>
        )}
        <CardDescription aria-hidden className="hidden" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center pt-0">
        <figure className="-mt-1 mx-auto flex w-full min-w-0 max-w-[340px] flex-col items-center" aria-labelledby="optimization-gauge-label">
          <div
            className="min-w-0 w-full max-w-[340px] h-fit pb-0 [&_.semicircle-gauge]:pb-0 [&_.semicircle-gauge]:overflow-visible [&_.semicircle-gauge_circle]:fill-[var(--gauge-pointer)]"
            aria-hidden
          >
            <GaugeComponent
              type="semicircle"
              minValue={0}
              maxValue={100}
              value={pct}
              style={{ width: "100%", height: "100%" }}
              arc={{
                width: 0.2,
                padding: 0.005,
                subArcs: [
                  { limit: 18, color: "#dc2626", showTick: true },
                  { limit: 36, color: "#ea580c", showTick: true },
                  { limit: 54, color: "#ca8a04", showTick: true },
                  { limit: 72, color: "#eab308", showTick: true },
                  { limit: 90, color: "#84cc16", showTick: true },
                  { color: "#16a34a", showTick: true },
                ],
              }}
              pointer={{
                type: "needle",
                length: 0.8,
                width: 4,
                color: "var(--gauge-pointer)",
                baseColor: "var(--gauge-pointer)",
              }}
              labels={{
                valueLabel: { hide: true },
                tickLabels: {
                  defaultTickValueConfig: { hide: true },
                  defaultTickLineConfig: { hide: true },
                },
              }}
            />
          </div>
          <figcaption id="optimization-gauge-label" className="mt-1 flex flex-col items-center gap-0.5">
            <span
              className={cn(
                "text-center text-2xl font-bold tabular-nums",
                gaugeSegmentColorClass(pct)
              )}
            >
              {pctRounded}%
            </span>
            <span className="text-center text-sm font-normal text-muted-foreground">
              optimization score
            </span>
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  )
}
