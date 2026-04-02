"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type PilotRebateSummary, type RebateTier } from "@/lib/rebate"
import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"

interface PilotRebateCardProps {
  summary: PilotRebateSummary
  className?: string
}

function formatUsd0(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function tierRateLabel(tier: RebateTier): string {
  return `${(tier.rebateRateOnSpend * 100).toFixed(2)}% back on spend`
}

function formatSpendToNextCompact(dollars: number): string {
  if (dollars >= 1_000_000) {
    const m = dollars / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (dollars >= 1000) {
    return `${Math.round(dollars / 1000)}K`
  }
  return dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

export function PilotRebateCard({ summary, className }: PilotRebateCardProps) {
  const { style } = useStyle()
  const {
    previousMonth,
    currentMonth,
    nextTier,
    daysLeftInMonth,
    resetDateLabel,
    progressPctToNextTier,
    shortfallSpendDollars,
  } = summary

  const hasNextTier = !!nextTier
  const shortfallDisplay =
    shortfallSpendDollars >= 10_000
      ? Math.round(shortfallSpendDollars / 1000) * 1000
      : Math.round(shortfallSpendDollars)

  return (
    <Card className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className={cn("flex items-center gap-1.5", isUberStyle(style) ? "text-sm font-medium" : "text-base")}>
              Pilot rebate — {currentMonth.monthLabel}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="How is this rebate calculated?"
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" strokeWidth={2} />
                    </button>
                  }
                />
                <TooltipContent side="top">
                  Based on Pilot fuel spend this month and rebate tiers.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>Resets {resetDateLabel}</CardDescription>
          </div>
          <Badge variant="warning" className="rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-medium">
            {daysLeftInMonth} day{daysLeftInMonth === 1 ? "" : "s"} left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0 text-xs">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium">Previous month — final</span>
              <span className="text-[length:var(--text-2xs)] text-muted-foreground">
                {previousMonth.tier.label} · {tierRateLabel(previousMonth.tier)}
              </span>
            </div>
            <span className="tabular-nums text-base font-semibold">
              {formatUsd0(previousMonth.rebateDollars)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
            <div className="flex flex-col">
              <span className="font-medium">Current month — in progress</span>
              <span className="text-[length:var(--text-2xs)] text-muted-foreground">
                {currentMonth.tier.label} · {tierRateLabel(currentMonth.tier)}
              </span>
            </div>
            <span className="tabular-nums text-base font-semibold text-green-600 dark:text-green-500">
              {formatUsd0(currentMonth.rebateDollars)}
            </span>
          </div>
        </div>

        {hasNextTier && nextTier && (
          <div className="space-y-1">
            <Progress
              value={progressPctToNextTier}
              className="h-2 bg-emerald-100/80 dark:bg-emerald-900/30"
            >
              {/* progress bar purely presentational */}
            </Progress>
            <div className="flex items-center justify-between text-[length:var(--text-2xs)]">
              <span className="text-muted-foreground">
                {formatUsd0(currentMonth.spendDollars)} spent at Pilot so far
              </span>
              <span className="font-medium text-[var(--warning)]">
                ${formatSpendToNextCompact(nextTier.spendToNextTierDollars)} to next tier
              </span>
            </div>
            <div className="flex items-center justify-between text-[length:var(--text-2xs)] border-t border-border pt-2 mt-1">
              <span className="text-muted-foreground">
                Next tier at {formatUsd0(nextTier.unlockSpendDollars)} Pilot spend
              </span>
              <span className="font-medium text-[var(--warning)]">
                {(nextTier.tier.rebateRateOnSpend * 100).toFixed(2)}% back +$
                {nextTier.additionalDollarsAtNextRate.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-[length:var(--text-2xs)] text-muted-foreground">
          {shortfallSpendDollars > 0 && hasNextTier ? (
            <>
              At current pace you&apos;ll{" "}
              <span className="font-medium text-[var(--warning)]">
                fall ~{formatUsd0(shortfallDisplay)} short
              </span>
              .
            </>
          ) : (
            <>At current pace you&apos;re on track to reach your next Pilot rebate tier.</>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
