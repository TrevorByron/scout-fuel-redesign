"use client"

import * as React from "react"
import { CheckCircle2, BarChart3, XCircle } from "lucide-react"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerResults,
  DealBaselineStats,
  DealFuelNetwork,
  DealLocationComparisonRow,
} from "@/lib/deal-analyzer-types"
import { NETWORK_LABELS } from "@/lib/deal-analyzer-engine"
import { DealAnalyzerLocationComparisonSection } from "@/components/deal-analyzer/deal-analyzer-location-comparison"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChartUpIcon } from "@hugeicons/core-free-icons"
import type { FuelTransaction } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtUsdDetail(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

type SavingsTone = "good" | "bad" | "neutral"

function savingsTone(amount: number): SavingsTone {
  if (amount > 0) return "good"
  if (amount < 0) return "bad"
  return "neutral"
}

/** Proposed deal block — aligns with map popup “match” cards (`--warning`). */
function proposedDealSectionClass(tone: SavingsTone): string {
  if (tone === "bad") {
    return "rounded-lg border-2 border-destructive/35 bg-destructive/10"
  }
  return "rounded-lg border border-[var(--warning)]/45 bg-[var(--warning)]/10"
}

function breakdownCardClass(
  tone: SavingsTone,
  emphasis: "standard" | "best" = "standard"
): string {
  switch (tone) {
    case "good":
      if (emphasis === "best") {
        return "rounded-lg border-2 border-[var(--success)]/55 bg-[var(--success)]/14 shadow-sm ring-1 ring-[var(--success)]/20"
      }
      return "rounded-lg border-2 border-[var(--success)]/35 bg-[var(--success)]/5"
    case "bad":
      return "rounded-lg border-2 border-destructive/35 bg-destructive/10"
    default:
      return "rounded-lg border border-border bg-muted/30"
  }
}

function savingsValueClass(tone: SavingsTone): string {
  switch (tone) {
    case "good":
      return "text-[var(--success)]"
    case "bad":
      return "text-destructive"
    default:
      return "text-foreground"
  }
}

function formatSavingsUsd(savings: number): string {
  if (savings >= 0) return fmtUsd(savings)
  return `−${fmtUsd(Math.abs(savings))}`
}

function MetricBlock({
  label,
  value,
  valueClassName,
  emphasis = "primary",
}: {
  label: string
  value: string
  valueClassName?: string
  /** `secondary` matches the smaller breakdown stats used for avg $/gal before. */
  emphasis?: "primary" | "secondary"
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums tracking-tight",
          emphasis === "primary"
            ? "text-lg font-semibold sm:text-xl"
            : "text-xs font-medium text-foreground",
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

function normalizedOptimizedStats(
  optimized: NonNullable<DealAnalyzerResults["optimized"]>,
  baseline: DealBaselineStats
) {
  const totalSavingsVsBaseline =
    optimized.totalSavingsVsBaseline ??
    Math.round((baseline.totalSpend - optimized.totalSpend) * 100) / 100
  const avgPricePerGallon =
    optimized.avgPricePerGallon ??
    (baseline.totalGallons > 0
      ? Math.round((optimized.totalSpend / baseline.totalGallons) * 10000) /
        10000
      : 0)
  return { totalSavingsVsBaseline, avgPricePerGallon }
}

interface DealAnalyzerResultsViewProps {
  results: DealAnalyzerResults | null
  form: DealAnalyzerFormInput
  networkKey: DealFuelNetwork | ""
  locationComparisonRows?: DealLocationComparisonRow[]
  /** Same filtered slice used to build `locationComparisonRows` (for map coordinates). */
  analysisTransactionSlice?: FuelTransaction[]
  className?: string
}

export function DealAnalyzerResultsView({
  results,
  form,
  networkKey,
  locationComparisonRows = [],
  analysisTransactionSlice = [],
  className,
}: DealAnalyzerResultsViewProps) {
  const networkLabel =
    networkKey && NETWORK_LABELS[networkKey as DealFuelNetwork]
      ? NETWORK_LABELS[networkKey as DealFuelNetwork]
      : "network"

  if (!results) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 overflow-visible px-2 py-12 text-center",
          className
        )}
      >
        <HugeiconsIcon
          icon={ChartUpIcon}
          strokeWidth={2}
          className="size-14 text-muted-foreground/50"
        />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Results will appear here
          </p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Fill in the deal details, then tap Calculate to see instant analysis
            against your actual fuel data.
          </p>
        </div>
      </div>
    )
  }

  const { baseline, proposed, optimized, verdict, insights } = results
  const isPositive = proposed.savings >= 0
  const proposedTone = savingsTone(proposed.savings)
  const optNorm = optimized
    ? normalizedOptimizedStats(optimized, baseline)
    : null
  const optimizedTone = optNorm ? savingsTone(optNorm.totalSavingsVsBaseline) : null
  const verdictCardClass = isPositive
    ? "border-[var(--success)]/40 bg-[var(--success)]/5"
    : "border-destructive/40 bg-destructive/10"

  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 flex flex-1 flex-col gap-4 overflow-visible duration-300",
        className
      )}
    >
      <div
        className={cn(
          "flex min-h-[44px] gap-4 overflow-visible rounded-lg border-2 px-4 py-5 sm:items-center",
          verdictCardClass
        )}
      >
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            isPositive ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-destructive/15 text-destructive"
          )}
        >
          {isPositive ? (
            <CheckCircle2 className="size-7" aria-hidden />
          ) : (
            <XCircle className="size-7" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-lg font-semibold tracking-tight">{verdict.title}</p>
            <p className="text-sm text-muted-foreground">{verdict.subtitle}</p>
          </div>
          <div>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                isPositive ? "text-[var(--success)]" : "text-destructive"
              )}
            >
              {proposed.savings >= 0 ? "−" : "+"}
              {fmtUsd(Math.abs(proposed.savings))}
            </p>
            <p className="text-sm text-muted-foreground">
              ({fmtPct(proposed.savingsPercent)} vs baseline)
            </p>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4 overflow-visible">
        <header className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
            <h3 className="text-base font-semibold">Comparison breakdown</h3>
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Baseline uses your fleet purchases in the selected period.
          </p>
        </header>
        <div className="flex flex-col gap-4 pt-1">
          <section className={cn("p-4", breakdownCardClass("neutral"))}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Current (baseline)</span>
              <Badge variant="outline">Actual</Badge>
            </div>
            <div className="flex flex-col gap-4">
              <MetricBlock label="Total spend" value={fmtUsd(baseline.totalSpend)} />
              <MetricBlock
                label="Average cost per gallon"
                value={fmtUsdDetail(baseline.avgPricePerGallon)}
                emphasis="secondary"
              />
            </div>
          </section>

          <section className={cn("p-4", proposedDealSectionClass(proposedTone))}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">With {networkLabel}</span>
              <Badge
                variant={
                  proposedTone === "bad" ? "destructiveOutline" : "warning"
                }
              >
                Proposed
              </Badge>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">{proposed.discountLabel}</p>
            <div className="flex flex-col gap-4">
              <MetricBlock label="Total spend" value={fmtUsd(proposed.totalSpend)} />
              <MetricBlock
                label="Average cost per gallon"
                value={fmtUsdDetail(proposed.avgPricePerGallon)}
                emphasis="secondary"
              />
              <MetricBlock
                label="Total savings"
                value={formatSavingsUsd(proposed.savings)}
                valueClassName={savingsValueClass(proposedTone)}
              />
            </div>
          </section>

          {optimized && optNorm && optimizedTone ? (
            <>
              <Separator />
              <section
                className={cn(
                  "p-4",
                  optimizedTone === "good"
                    ? breakdownCardClass("good", "best")
                    : breakdownCardClass(optimizedTone)
                )}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">With smart routing</span>
                  <Badge
                    variant={
                      optimizedTone === "good"
                        ? "successFilled"
                        : optimizedTone === "bad"
                          ? "destructiveOutline"
                          : "outline"
                    }
                  >
                    Optimized
                  </Badge>
                </div>
                <div className="flex flex-col gap-4">
                  <MetricBlock
                    label="Total spend"
                    value={fmtUsd(optimized.totalSpend)}
                  />
                  <MetricBlock
                    label="Average cost per gallon"
                    value={fmtUsdDetail(optNorm.avgPricePerGallon)}
                    emphasis="secondary"
                  />
                  <MetricBlock
                    label="Total savings"
                    value={formatSavingsUsd(optNorm.totalSavingsVsBaseline)}
                    valueClassName={savingsValueClass(optimizedTone)}
                  />
                  <div
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      optimizedTone === "good"
                        ? "border-[var(--success)]/45 bg-[var(--success)]/10"
                        : "border-border bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "font-medium",
                        optimizedTone === "good"
                          ? "text-[var(--success)]"
                          : optimizedTone === "bad"
                            ? "text-destructive"
                            : "text-foreground"
                      )}
                    >
                      Saves you an additional: {fmtUsd(optimized.additionalSavings)}
                    </span>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </section>

      {insights.length > 0 ? (
        <section className="flex flex-col gap-3 overflow-visible pt-2">
          <header className="border-b border-border pb-4">
            <h3 className="text-base font-semibold">Key insights</h3>
          </header>
          <div className="flex flex-col gap-3 pt-1">
            {insights.map((ins, i) => (
              <InsightRow
                key={`${ins.type}-${i}`}
                type={ins.type}
                form={form}
                networkLabel={networkLabel}
                proposed={proposed}
                optimized={optimized}
              />
            ))}
          </div>
        </section>
      ) : null}

      {results && locationComparisonRows.length > 0 ? (
        <DealAnalyzerLocationComparisonSection
          rows={locationComparisonRows}
          transactionSlice={analysisTransactionSlice}
          proposedSavings={proposed.savings}
          optimizedTotalSavingsVsBaseline={
            optimized
              ? normalizedOptimizedStats(optimized, baseline).totalSavingsVsBaseline
              : null
          }
          showOptimizedColumn={
            optimized != null &&
            proposed.avgPricePerGallon > 0 &&
            optimized.avgPricePerGallon != null
          }
        />
      ) : null}
    </div>
  )
}

function InsightRow({
  type,
  form,
  networkLabel,
  proposed,
  optimized,
}: {
  type: DealAnalyzerResults["insights"][number]["type"]
  form: DealAnalyzerFormInput
  networkLabel: string
  proposed: DealAnalyzerResults["proposed"]
  optimized: DealAnalyzerResults["optimized"]
}) {
  if (type === "state_restriction") {
    const states =
      form.selectedStates.length > 0
        ? [...form.selectedStates].sort().slice(0, 12).join(", ") +
          (form.selectedStates.length > 12 ? "…" : "")
        : ""
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertTitle>State restriction</AlertTitle>
        <AlertDescription>
          This deal only applies in {form.selectedStates.length} states
          {states ? `: ${states}` : ""}.
        </AlertDescription>
      </Alert>
    )
  }
  if (type === "coverage_gap") {
    return (
      <Alert variant="warning">
        <AlertTitle>Coverage gap</AlertTitle>
        <AlertDescription>
          {proposed.noCoverage.toLocaleString()} transactions (
          {(100 - Math.round(proposed.coverage * 100)).toFixed(0)}%) have no nearby{" "}
          {networkLabel} location in this model.
        </AlertDescription>
      </Alert>
    )
  }
  if (type === "strong_coverage") {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/6">
        <div className="flex min-h-11 items-start gap-2 px-4 py-3 text-left text-sm text-[var(--success)]">
          <CheckCircle2
            className="size-5 shrink-0 translate-y-px text-[var(--success)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-none tracking-tight">
              Strong coverage
            </span>
            <span className="mt-1 block text-[var(--success)]/90 leading-relaxed">
              {Math.round(proposed.coverage * 100)}% of your fuel stops align with{" "}
              {networkLabel} coverage assumptions.
            </span>
          </span>
        </div>
      </div>
    )
  }
  if (type === "optimization" && optimized) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertTitle>Optimization opportunity</AlertTitle>
        <AlertDescription>
          {fmtUsd(optimized.additionalSavings)} more may be available through smart routing (avg{" "}
          {optimized.avgDetourMiles} mile detour).
        </AlertDescription>
      </Alert>
    )
  }
  return null
}
