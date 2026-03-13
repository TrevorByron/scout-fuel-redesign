"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getGradeColor } from "@/lib/fuelScore"
import { cn } from "@/lib/utils"

const MAX_BAR_HEIGHT_PX = 40

export interface FleetScoreCardProps {
  grade: string
  gradeSuffix?: string
  weekDate: string
  complianceRate: number
  totalTransactions: number
  previousGrade: string
  targetGrade: string
  targetDate: string
  missedSavings: number
  /** Optional: target compliance % and estimated additional monthly savings at that level. Shows "At X% you save an additional ~$Y/mo" below the alert. */
  targetCompliancePercent?: number
  additionalSavingsAtTarget?: number
  trendData: {
    month: string
    value: number
  }[]
}

export function FleetScoreCard({
  grade,
  gradeSuffix,
  weekDate,
  complianceRate,
  totalTransactions,
  previousGrade,
  targetGrade,
  targetDate,
  missedSavings,
  targetCompliancePercent = 80,
  additionalSavingsAtTarget,
  trendData,
}: FleetScoreCardProps) {
  const gradeColorClass = getGradeColor(grade)

  return (
    <Card className="border-0 ring-0 bg-muted overflow-hidden">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-stretch sm:gap-6">
        {/* Left column — Grade display */}
        <div className="flex shrink-0 items-center">
          <div className={cn("font-bold tabular-nums", gradeColorClass)}>
            <span className="text-5xl sm:text-6xl">{grade}</span>
            {gradeSuffix != null && gradeSuffix !== "" && (
              <span className="ml-0.5 text-3xl">{gradeSuffix}</span>
            )}
          </div>
        </div>

        {/* Middle column — Score metadata */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="text-sm font-medium">
            Fleet fuel compliance — week of {weekDate}
          </p>
          <p className="text-sm text-muted-foreground">
            {complianceRate}% of fill-ups at optimized locations ·{" "}
            {totalTransactions.toLocaleString("en-US")} total transactions
          </p>
          <p className="text-sm font-medium text-[var(--success)]">
            ↑ Up from {previousGrade} last week · Target: {targetGrade} by{" "}
            {targetDate}
          </p>
        </div>

        {/* Right column — Alert + trend chart */}
        <div className="flex shrink-0 flex-col gap-3 sm:min-w-[200px]">
          <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning)]/10 px-3 py-2">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                $
                {missedSavings.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </span>{" "}
              left on the table this week from non-compliant fill-ups.
            </p>
          </div>
          {additionalSavingsAtTarget != null && (
            <p className="text-sm text-foreground">
              At {targetCompliancePercent}% you save an additional{" "}
              <span className="font-semibold tabular-nums text-[var(--success)]">
                ~$
                {additionalSavingsAtTarget.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
                /mo
              </span>
            </p>
          )}
          <div className="flex items-end gap-2">
            <div className="flex items-end gap-1.5">
              {trendData.map((item, i) => {
                const isCurrent = i === trendData.length - 1
                const heightPx = (item.value / 100) * MAX_BAR_HEIGHT_PX
                return (
                  <div
                    key={item.month}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={cn(
                        "w-3 rounded-t min-h-[2px]",
                        isCurrent
                          ? "bg-[var(--success)]"
                          : "bg-muted-foreground/30"
                      )}
                      style={{ height: `${heightPx}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {item.month}
                    </span>
                  </div>
                )
              })}
            </div>
            <span className="mb-1 ml-1 text-xs font-medium">Compliance trend</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
