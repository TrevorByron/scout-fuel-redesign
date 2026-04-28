"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import {
  type CarrierRebateOverview,
  type RebateProgramSummary,
  type RebateTier,
} from "@/lib/rebate"

interface PilotRebateCardProps {
  overview: CarrierRebateOverview
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
  return `${(tier.rebateRateOnSpend * 100).toFixed(2)}% base on eligible spend`
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

function RebateProgramSection({
  program,
}: {
  program: RebateProgramSummary
}) {
  const {
    shortLabel,
    eligibilityHint,
    previousMonth,
    currentMonth,
    nextTier,
    progressPctToNextTier,
    shortfallSpendDollars,
    byFuel,
    showFuelBreakdown,
  } = program

  const hasNextTier = !!nextTier
  const shortfallDisplay =
    shortfallSpendDollars >= 10_000
      ? Math.round(shortfallSpendDollars / 1000) * 1000
      : Math.round(shortfallSpendDollars)

  const tierSpendLabel =
    currentMonth.tierWeightedSpendDollars !== currentMonth.spendDollars
      ? `${formatUsd0(currentMonth.tierWeightedSpendDollars)} toward tier`
      : `${formatUsd0(currentMonth.spendDollars)} spend`

  return (
    <div className="space-y-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={cn(
              "flex items-center gap-1.5 font-medium",
              "text-base"
            )}
          >
            <span className="truncate">{shortLabel}</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${shortLabel} program eligibility`}
                  >
                    <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" strokeWidth={2} />
                  </button>
                }
              />
              <TooltipContent side="top" className="max-w-[14rem] text-xs">
                {eligibilityHint}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">Prior month — final</span>
            <span className="text-[length:var(--text-2xs)] text-muted-foreground">
              {previousMonth.tier.label} · {tierRateLabel(previousMonth.tier)}
            </span>
          </div>
          <span className="tabular-nums text-base font-semibold">{formatUsd0(previousMonth.rebateDollars)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">This month</span>
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
            data-rebate-progress=""
            className="h-2 bg-emerald-100/80 dark:bg-emerald-900/30"
          />
          <div className="flex items-center justify-between gap-1 text-[length:var(--text-2xs)]">
            <span className="min-w-0 text-muted-foreground">
              {tierSpendLabel}
              {currentMonth.tierWeightedSpendDollars !== currentMonth.spendDollars ? (
                <span className="text-muted-foreground/80"> · {formatUsd0(currentMonth.spendDollars)} total</span>
              ) : null}
            </span>
            <span className="shrink-0 font-medium text-[var(--warning)]">
              ${formatSpendToNextCompact(nextTier.spendToNextTierDollars)} to next tier
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 border-t border-border pt-2 text-[length:var(--text-2xs)]">
            <span className="text-muted-foreground">
              Next tier at {formatUsd0(nextTier.unlockSpendDollars)} eligible spend
            </span>
            <span className="shrink-0 font-medium text-[var(--warning)]">
              {(nextTier.tier.rebateRateOnSpend * 100).toFixed(2)}% base +$
              {nextTier.additionalDollarsAtNextRate.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-md bg-muted/60 px-3 py-2 text-[length:var(--text-2xs)] text-muted-foreground">
        {shortfallSpendDollars > 0 && hasNextTier ? (
          <>
            At current pace you&apos;ll{" "}
            <span className="font-medium text-[var(--warning)]">fall ~{formatUsd0(shortfallDisplay)} short</span> of
            the next tier.
          </>
        ) : (
          <>At current pace you&apos;re on track for the next {shortLabel} tier.</>
        )}
      </div>

      {showFuelBreakdown && byFuel.length > 0 && (
        <Accordion
          defaultValue={[]}
          data-rebate-fuel-accordion=""
          className="rounded-md border border-border/80 shadow-none"
        >
          <AccordionItem value={`fuel-${program.programId}`} className="border-0">
            <AccordionTrigger className="px-2 py-2 text-[length:var(--text-2xs)] font-medium hover:no-underline">
              By fuel
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2 pt-0">
              <div className="space-y-1.5">
                {byFuel.map((row) => (
                  <div
                    key={row.fuelType}
                    className="flex items-baseline justify-between gap-2 text-[length:var(--text-2xs)]"
                  >
                    <span className="text-muted-foreground">
                      {row.fuelType}
                      {row.rebateRateMultiplier !== 1 || row.tierWeight === 0 ? (
                        <span className="text-muted-foreground/70">
                          {" "}
                          · {row.tierWeight === 0 ? "excluded from tier" : `${row.rebateRateMultiplier}× rate`}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">
                      {formatUsd0(row.rebateDollars)}
                      <span className="text-muted-foreground/80"> · {formatUsd0(row.eligibleSpendDollars)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}

export function PilotRebateCard({ overview, className }: PilotRebateCardProps) {
  const { programs, totalMtdRebateDollars, totalPreviousMonthRebateDollars } = overview
  const monthLabel = programs[0]?.currentMonth.monthLabel ?? ""
  const daysLeftInMonth = programs[0]?.daysLeftInMonth ?? 0
  const resetDateLabel = programs[0]?.resetDateLabel ?? ""

  return (
    <Card className={cn("flex min-h-0 min-w-0 flex-col overflow-visible", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle
              className={cn(
                "flex flex-wrap items-center gap-1.5",
                "text-base"
              )}
            >
              Fleet rebates — {monthLabel}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="How are rebates calculated?"
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" strokeWidth={2} />
                    </button>
                  }
                />
                <TooltipContent side="top" className="max-w-[16rem] text-xs">
                  Month-to-date rebate estimates from eligible fuel spend and each program&apos;s tier ladder. Per-fuel
                  rules apply where noted.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Resets {resetDateLabel} · {formatUsd0(totalPreviousMonthRebateDollars)} last month ·{" "}
              {formatUsd0(totalMtdRebateDollars)} MTD combined
            </CardDescription>
          </div>
          <Badge variant="warning" className="shrink-0 rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-medium">
            {daysLeftInMonth} day{daysLeftInMonth === 1 ? "" : "s"} left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 pt-0 text-xs">
        {programs.map((program) => (
          <RebateProgramSection key={program.programId} program={program} />
        ))}
      </CardContent>
    </Card>
  )
}
