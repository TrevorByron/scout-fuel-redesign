"use client"

import * as React from "react"
import type { FuelTransaction } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export type LocationComparison = {
  actualChain: string
  actualLocation: string
  actualCpg: number
  actualTotal: number
  optimizedChain: string
  optimizedLocation: string
  optimizedCpg: number
  optimizedTotal: number
  savings: number
  /** Miles from actual location to optimized location. */
  distanceMiles: number
}

/** Modeled “fleet optimized” tier for Deal Analyzer map (illustrative); shown as third column. */
export type IllustrativeOptimizedColumn = {
  /** Single line, e.g. "TA/Petro · Cheyenne, WY" */
  headline: string
  netCpg: number | null
  distanceMiles: number | null
  avgDiscountPerGal: number | null
}

/** Optional copy overrides for the comparison variant (defaults match Location Insights). */
export type ComparisonCardLabels = {
  legendPrimary?: string
  legendSecondary?: string
  legendTertiary?: string
  columnLeft?: string
  columnRight?: string
  columnTertiary?: string
  savingsFooter?: string
}

const MILES_PER_DEGREE_APPROX = 69

/** Planar approximation; matches `lib/trips.ts` stop-distance helper. */
function distanceMilesApprox(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * MILES_PER_DEGREE_APPROX
  const dLng =
    (lng2 - lng1) * MILES_PER_DEGREE_APPROX * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/** Build LocationComparison from a transaction that has a betterOption; otherwise null. */
export function transactionToComparison(
  t: FuelTransaction
): LocationComparison | null {
  const opt = t.betterOption
  if (!opt) return null
  const optimizedTotal = Math.round(t.gallons * opt.pricePerGallon * 100) / 100
  const rawSavings = Math.round((t.totalCost - optimizedTotal) * 100) / 100
  const savings = Math.max(0, rawSavings)
  const distanceMiles =
    Math.round(distanceMilesApprox(t.lat, t.lng, opt.lat, opt.lng) * 10) / 10
  return {
    actualChain: t.stationBrand,
    actualLocation: t.location,
    actualCpg: t.pricePerGallon,
    actualTotal: t.totalCost,
    optimizedChain: opt.stationName,
    optimizedLocation: opt.location,
    optimizedCpg: opt.pricePerGallon,
    optimizedTotal,
    savings,
    distanceMiles,
  }
}

type Position = "bottom-left" | "bottom-right" | "bottom"

/* Inset matches page padding (px-4 = 1rem) so card stays inside padded content area */
const positionClasses: Record<Position, string> = {
  "bottom-left": "bottom-3 left-4 right-4 max-w-md",
  "bottom-right": "bottom-3 left-4 right-4 max-w-md",
  bottom: "bottom-3 left-4 right-4 max-w-md",
}

/** Map filter / pin swatch literals (e.g. from `mapPaint` + `verdictTierToProposedMapColor`). */
export type ComparisonMapPinAccents = {
  baseline: string
  proposed: string
  optimized: string
}

type ActualVsOptimizedCardProps =
  | {
      variant: "comparison"
      comparison: LocationComparison
      position?: Position
      /** `embedded` = sheet; `map` = inside Trips map stack (chrome from parent); `floating` = map overlay. */
      layout?: "floating" | "embedded" | "map"
      labels?: ComparisonCardLabels
      /** Deal Analyzer: third column with illustrative optimized metrics. */
      illustrativeOptimized?: IllustrativeOptimizedColumn
      /**
       * When set (Deal Analyzer map), legend dots and column left borders match
       * the same hex values as the map layer filter swatches.
       */
      mapPinAccents?: ComparisonMapPinAccents
    }
  | {
      variant: "optimal"
      transaction: FuelTransaction
      position?: Position
      layout?: "floating" | "embedded" | "map"
    }

function fmtCpgUsd3(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

function fmtDiscountUsd3(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

export function ActualVsOptimizedCard(
  props: ActualVsOptimizedCardProps
) {
  const position = props.position ?? "bottom"
  const layout = props.layout ?? "floating"
  const baseClasses =
    layout === "embedded"
      ? "relative z-0 min-w-0 w-full max-w-none rounded-lg border border-border bg-card p-3 text-xs shadow-sm"
      : layout === "map"
        ? "relative z-0 min-w-0 w-full max-w-none border-0 bg-transparent p-0 text-xs shadow-none"
        : "absolute z-10 min-w-0 rounded-lg border border-border bg-card/95 p-3 text-xs shadow-md backdrop-blur-sm"

  if (props.variant === "optimal") {
    const { transaction } = props
    return (
      <div
        className={cn(
          baseClasses,
          layout === "floating" && positionClasses[position]
        )}
      >
        <p className="font-medium text-muted-foreground pb-1">
          Optimal purchase
        </p>
        <p className="font-medium text-foreground">
          Great purchase
        </p>
        <p className="text-muted-foreground mt-0.5">
          In-network fill-up at the best available price.
        </p>
        <div className="mt-2 pt-2 border-t border-border space-y-0.5">
          <p className="font-medium text-foreground">
            {transaction.stationBrand} · {transaction.location}
          </p>
          <p className="tabular-nums text-foreground">
            ${transaction.pricePerGallon.toFixed(2)}/gal → $
            {transaction.totalCost.toFixed(2)}
          </p>
        </div>
      </div>
    )
  }

  const { comparison, labels, illustrativeOptimized, mapPinAccents } = props
  const legendPrimary = labels?.legendPrimary ?? "Actual"
  const legendSecondary = labels?.legendSecondary ?? "Optimized"
  const legendTertiary = labels?.legendTertiary ?? "Optimized"
  const columnLeft = labels?.columnLeft ?? "Actual"
  const columnRight = labels?.columnRight ?? "Optimized"
  const columnTertiary = labels?.columnTertiary ?? "Optimized"
  const savingsFooter = labels?.savingsFooter ?? "Could have saved"
  const hasThird = Boolean(illustrativeOptimized)

  const baselineAccent = mapPinAccents?.baseline
  const proposedAccent = mapPinAccents?.proposed
  const optimizedAccent = mapPinAccents?.optimized

  return (
    <div
      className={cn(
        baseClasses,
        layout === "floating" && positionClasses[position]
      )}
    >
      <div className="flex flex-wrap items-center gap-3 pb-2 font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              !baselineAccent && "bg-destructive"
            )}
            style={
              baselineAccent
                ? { backgroundColor: baselineAccent }
                : undefined
            }
            aria-hidden
          />
          {legendPrimary}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={
              proposedAccent
                ? { backgroundColor: proposedAccent }
                : { backgroundColor: "var(--chart-2)" }
            }
            aria-hidden
          />
          {legendSecondary}
        </span>
        {hasThird ? (
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                !optimizedAccent && "bg-[var(--success)]"
              )}
              style={
                optimizedAccent
                  ? { backgroundColor: optimizedAccent }
                  : undefined
              }
              aria-hidden
            />
            {legendTertiary}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "grid gap-x-3 gap-y-2",
          hasThird ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"
        )}
      >
        <div
          className={cn(
            "space-y-0.5 border-l-2 pl-2",
            !baselineAccent && "border-l-destructive"
          )}
          style={
            baselineAccent ? { borderLeftColor: baselineAccent } : undefined
          }
        >
          <p className="font-medium text-muted-foreground">{columnLeft}</p>
          <p className="font-medium text-foreground">
            {comparison.actualChain} · {comparison.actualLocation}
          </p>
          <p className="tabular-nums text-foreground">
            ${comparison.actualCpg.toFixed(2)}/gal → $
            {comparison.actualTotal.toFixed(2)}
          </p>
        </div>
        <div
          className="space-y-0.5 border-l-2 pl-2"
          style={{
            borderLeftColor: proposedAccent ?? "var(--chart-2)",
          }}
        >
          <p className="font-medium text-muted-foreground">{columnRight}</p>
          <p className="font-medium text-foreground">
            {comparison.optimizedChain} · {comparison.optimizedLocation}
          </p>
          <p className="tabular-nums text-foreground">
            ${comparison.optimizedCpg.toFixed(2)}/gal → $
            {comparison.optimizedTotal.toFixed(2)}
          </p>
          <p className="text-muted-foreground">
            {comparison.distanceMiles} mi away
          </p>
        </div>
        {illustrativeOptimized ? (
          <div
            className={cn(
              "space-y-0.5 border-l-2 pl-2",
              !optimizedAccent && "border-l-[var(--success)]"
            )}
            style={
              optimizedAccent
                ? { borderLeftColor: optimizedAccent }
                : undefined
            }
          >
            <p className="font-medium text-muted-foreground">{columnTertiary}</p>
            <p className="font-medium text-foreground">
              {illustrativeOptimized.headline}
            </p>
            <div className="flex flex-col gap-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-muted-foreground">Net CPG</span>
                <span className="tabular-nums font-medium text-foreground">
                  {illustrativeOptimized.netCpg != null
                    ? fmtCpgUsd3(illustrativeOptimized.netCpg)
                    : "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-muted-foreground">Distance</span>
                <span className="tabular-nums font-medium text-foreground">
                  {illustrativeOptimized.distanceMiles != null
                    ? `${illustrativeOptimized.distanceMiles} mi`
                    : "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-muted-foreground">Avg discount</span>
                <span className="tabular-nums font-medium text-foreground">
                  {illustrativeOptimized.avgDiscountPerGal != null
                    ? fmtDiscountUsd3(illustrativeOptimized.avgDiscountPerGal)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <p
        className="mt-2 flex items-center justify-between border-t border-border pt-2 font-medium tabular-nums"
        style={{
          color: proposedAccent ?? "var(--chart-2)",
        }}
      >
        <span>{savingsFooter}</span>
        <span>${comparison.savings.toFixed(2)}</span>
      </p>
    </div>
  )
}
