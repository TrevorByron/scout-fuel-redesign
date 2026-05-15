"use client"

import * as React from "react"
import { AlertCircle, BarChart3, CheckCircle2, Info, XCircle } from "lucide-react"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerResults,
  DealBaselineStats,
  DealFuelNetwork,
  DealLocationComparisonRow,
  DealVerdict,
} from "@/lib/deal-analyzer-types"
import { dealPricingTooltipSummary, NETWORK_LABELS } from "@/lib/deal-analyzer-engine"
import { getAllLocationKeys } from "@/lib/location-utils"
import { DealAnalyzerLocationComparisonSection } from "@/components/deal-analyzer/deal-analyzer-location-comparison"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

function fmtUsdPerGal3(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
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

type VerdictTier = DealVerdict["tier"]

/** Hero + proposed breakdown: green excellent/good, yellow marginal, red bad. */
function verdictTierHeroShellClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "border-[var(--success)]/40 bg-[var(--success)]/5"
    case "marginal":
      return "border-[var(--warning)]/45 bg-[var(--warning)]/10"
    case "bad":
      return "border-destructive/40 bg-destructive/10"
    default:
      return "border-border bg-muted/30"
  }
}

function verdictTierSectionShellClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "rounded-lg border-2 border-[var(--success)]/35 bg-[var(--success)]/5"
    case "marginal":
      return "rounded-lg border border-[var(--warning)]/45 bg-[var(--warning)]/10"
    case "bad":
      return "rounded-lg border-2 border-destructive/35 bg-destructive/10"
    default:
      return "rounded-lg border border-border bg-muted/30"
  }
}

function verdictTierIconShellClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "bg-[var(--success)]/15 text-[var(--success)]"
    case "marginal":
      return "bg-[var(--warning)]/15 text-[var(--warning)]"
    case "bad":
      return "bg-destructive/15 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function verdictTierHeadlineClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "text-[var(--success)]"
    case "marginal":
      return "text-[var(--warning)]"
    case "bad":
      return "text-destructive"
    default:
      return "text-foreground"
  }
}

function verdictTierProposedBadgeVariant(
  tier: VerdictTier
): "success" | "warning" | "destructiveOutline" | "outline" {
  switch (tier) {
    case "excellent":
    case "good":
      return "success"
    case "marginal":
      return "warning"
    case "bad":
      return "destructiveOutline"
    default:
      return "outline"
  }
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

function PumpFeeMetricBlock({
  weightedPumpFeePerGal,
}: {
  weightedPumpFeePerGal: number | null | undefined
}) {
  const display =
    weightedPumpFeePerGal != null && !Number.isNaN(weightedPumpFeePerGal)
      ? fmtUsdPerGal3(weightedPumpFeePerGal)
      : "—"
  return (
    <MetricBlock label="WPF" value={display} emphasis="secondary" />
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
  const weightedPumpFeePerGal =
    optimized.weightedPumpFeePerGal ??
    (baseline.weightedPumpFeePerGal != null && baseline.avgPricePerGallon > 0
      ? Math.round(
          baseline.weightedPumpFeePerGal *
            (avgPricePerGallon / baseline.avgPricePerGallon) *
            10000
        ) / 10000
      : undefined)
  return { totalSavingsVsBaseline, avgPricePerGallon, weightedPumpFeePerGal }
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
  networkKey: _networkKey,
  locationComparisonRows = [],
  analysisTransactionSlice = [],
  className,
}: DealAnalyzerResultsViewProps) {
  const networkLabel = React.useMemo(() => {
    const configuredBrands = form.brands.filter((b) => b.network !== "")
    if (configuredBrands.length === 0) return "chain"
    const labels = configuredBrands.map(
      (b) => NETWORK_LABELS[b.network as DealFuelNetwork] ?? b.network
    )
    if (labels.length === 1) return labels[0]
    if (labels.length === 2) return `${labels[0]} + ${labels[1]}`
    return `${labels[0]} + ${labels.length - 1} more`
  }, [form.brands])

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
  const verdictTier = verdict.tier
  const optNorm = optimized
    ? normalizedOptimizedStats(optimized, baseline)
    : null
  const optimizedTone = optNorm ? savingsTone(optNorm.totalSavingsVsBaseline) : null
  const verdictCardClass = verdictTierHeroShellClass(verdictTier)

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 max-lg:overflow-visible lg:shrink-0 lg:overflow-visible",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 gap-4 rounded-lg border-2 px-4 py-5 sm:items-center",
          verdictCardClass
        )}
      >
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            verdictTierIconShellClass(verdictTier)
          )}
        >
          {verdictTier === "bad" ? (
            <XCircle className="size-7" aria-hidden />
          ) : verdictTier === "marginal" ? (
            <AlertCircle className="size-7" aria-hidden />
          ) : (
            <CheckCircle2 className="size-7" aria-hidden />
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
                verdictTierHeadlineClass(verdictTier)
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

      <section className="flex shrink-0 flex-col gap-4 overflow-x-hidden">
        <header className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
            <h3 className="text-base font-semibold">Comparison breakdown</h3>
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Baseline uses your fleet purchases in the selected period.
          </p>
        </header>
        <div
          className={cn(
            "flex flex-col gap-4 pt-1",
            /* Named container `main` is on dashboard layout — row when the pane is wide enough */
            "@[56rem]/main:flex-row @[56rem]/main:items-stretch @[56rem]/main:gap-3"
          )}
        >
          <section
            className={cn("p-4", breakdownCardClass("neutral"), "min-w-0 flex-1")}
          >
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
              <PumpFeeMetricBlock weightedPumpFeePerGal={baseline.weightedPumpFeePerGal} />
            </div>
          </section>

          <section
            className={cn(
              "p-4",
              verdictTierSectionShellClass(verdictTier),
              "min-w-0 flex-1"
            )}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1 text-sm font-medium leading-none">
                <span className="truncate">With {networkLabel}</span>
                <Tooltip>
                  <TooltipTrigger
                    delay={0}
                    render={
                      <span
                        tabIndex={0}
                        aria-label="View proposed deal pricing details"
                        className={cn(
                          "inline-flex shrink-0 cursor-help items-center justify-center rounded-sm p-0.5 outline-none",
                          "text-muted-foreground hover:text-foreground",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        )}
                      >
                        <Info className="size-3.5" aria-hidden />
                      </span>
                    }
                  />
                  <TooltipContent
                    side="left"
                    className="max-w-[min(22rem,calc(100vw-2rem))] text-left text-xs leading-snug"
                  >
                    <div className="space-y-2 py-0.5">
                      <p className="font-medium text-background">
                        {proposed.discountLabel}
                      </p>
                      <p className="whitespace-pre-line border-t border-background/25 pt-2 text-background/90">
                        {dealPricingTooltipSummary(form)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Badge variant={verdictTierProposedBadgeVariant(verdictTier)}>
                Proposed
              </Badge>
            </div>
            <div className="flex flex-col gap-4">
              <MetricBlock label="Total spend" value={fmtUsd(proposed.totalSpend)} />
              <MetricBlock
                label="Average cost per gallon"
                value={fmtUsdDetail(proposed.avgPricePerGallon)}
                emphasis="secondary"
              />
              <PumpFeeMetricBlock weightedPumpFeePerGal={proposed.weightedPumpFeePerGal} />
              <MetricBlock
                label="Total savings"
                value={formatSavingsUsd(proposed.savings)}
                valueClassName={verdictTierHeadlineClass(verdictTier)}
              />
            </div>
          </section>

          {optimized && optNorm && optimizedTone ? (
            <section
              className={cn(
                "p-4",
                optimizedTone === "good"
                  ? breakdownCardClass("good", "best")
                  : breakdownCardClass(optimizedTone),
                "min-w-0 flex-1"
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
                <PumpFeeMetricBlock weightedPumpFeePerGal={optNorm.weightedPumpFeePerGal} />
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
          ) : null}
        </div>
      </section>

      {insights.length > 0 ? (
        <section className="flex shrink-0 flex-col gap-3 overflow-x-hidden pt-2">
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
        <div className="shrink-0">
          <DealAnalyzerLocationComparisonSection
            rows={locationComparisonRows}
            transactionSlice={analysisTransactionSlice}
            verdictTier={verdictTier}
            showOptimizedColumn={
              optimized != null &&
              proposed.avgPricePerGallon > 0 &&
              optimized.avgPricePerGallon != null
            }
          />
        </div>
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
    const allStates = new Set<string>()
    for (const t of form.brands.flatMap((b) => b.tiers)) {
      if (t.locationCoverage === "specific_states") {
        for (const s of t.selectedStates) {
          allStates.add(s.trim().toUpperCase())
        }
      }
    }
    const sorted = [...allStates].sort()
    const states =
      sorted.length > 0
        ? sorted.slice(0, 12).join(", ") + (sorted.length > 12 ? "…" : "")
        : ""
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertTitle>State restriction</AlertTitle>
        <AlertDescription>
          This deal includes state-specific rules covering {sorted.length} state
          {sorted.length === 1 ? "" : "s"}
          {states ? `: ${states}` : ""}.
        </AlertDescription>
      </Alert>
    )
  }
  if (type === "site_restriction") {
    const keys = new Set<string>()
    for (const t of form.brands.flatMap((b) => b.tiers)) {
      if (t.locationCoverage === "specific_sites") {
        for (const k of t.selectedLocationKeys) keys.add(k)
      }
    }
    const keyArr = [...keys]
    const catalog = getAllLocationKeys()
    const labels =
      keyArr.length > 0
        ? keyArr
            .map((k) => catalog.find((e) => e.key === k)?.display ?? k)
            .sort()
            .slice(0, 8)
            .join(", ") + (keyArr.length > 8 ? "…" : "")
        : ""
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <AlertTitle>Specific locations</AlertTitle>
        <AlertDescription>
          This deal includes location-specific rules at {keyArr.length} site
          {keyArr.length === 1 ? "" : "s"}
          {labels ? `: ${labels}` : "."}
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
