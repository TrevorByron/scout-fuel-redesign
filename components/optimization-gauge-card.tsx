"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChartUpIcon, ChartDownIcon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ImprovementAttentionDrawer } from "@/components/improvement-attention-drawer"
import type { DriverNeedingAttention } from "@/lib/driver-utils"
import type { LocationListStats } from "@/lib/location-utils"
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
  /** Data for the "How to save more" drawer. When provided with hasRoomForImprovement, shows the button. */
  improvementData?: {
    drivers: DriverNeedingAttention[]
    locations: LocationListStats[]
  }
  /** Period label for the improvement drawer (e.g. "week", "month"). */
  periodLabel?: string
  /** When true and improvementData has drivers or locations, show "How to save more" button. */
  hasRoomForImprovement?: boolean
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
  improvementData,
  periodLabel = "period",
  hasRoomForImprovement = false,
}: OptimizationGaugeCardProps) {
  const pct = clamp(value)
  const pctRounded = Math.round(pct)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const isCompact = size === "sm"
  const showImproveButton =
    hasRoomForImprovement &&
    improvementData &&
    (improvementData.drivers.length > 0 || improvementData.locations.length > 0)

  return (
    <Card size={size} className={cn(isCompact && "gap-2 py-2")}>
      <CardHeader className={cn("pb-1", isCompact && "pb-0")}>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">Fleet Compliance</CardTitle>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="What is fleet compliance?"
                >
                  <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" strokeWidth={2} />
                </button>
              }
            />
            <TooltipContent side="top" className="max-w-sm">
              Compliance is the percentage of fill-ups at optimized locations—places that offer the best price for the route. A higher score means more drivers are fueling where they get the best price.
            </TooltipContent>
          </Tooltip>
        </div>
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
      <CardContent className={cn("flex flex-1 flex-col items-center justify-center pt-0", isCompact && "pt-0")}>
        <figure className={cn("mx-auto flex w-full min-w-0 max-w-[340px] flex-col items-center", isCompact ? "-mt-0.5" : "-mt-1")} aria-labelledby="optimization-gauge-label">
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
                width: 8,
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
          <figcaption id="optimization-gauge-label" className={cn("flex flex-col items-center gap-0.5", isCompact ? "mt-0.5" : "mt-1")}>
            <span
              className={cn(
                "text-center font-bold tabular-nums",
                isCompact ? "text-xl" : "text-2xl",
                gaugeSegmentColorClass(pct)
              )}
            >
              {pctRounded}%
            </span>
            <span className="text-center text-sm font-normal text-muted-foreground">
              Compliance score
            </span>
          </figcaption>
        </figure>
      </CardContent>
      {showImproveButton && improvementData && (
        <CardFooter className={cn("pt-0", isCompact && "pt-0")}>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] w-full"
            onClick={() => setDrawerOpen(true)}
          >
            How to save more
          </Button>
          <ImprovementAttentionDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            drivers={improvementData.drivers}
            locations={improvementData.locations}
            periodLabel={periodLabel}
            source="compliance"
          />
        </CardFooter>
      )}
    </Card>
  )
}
