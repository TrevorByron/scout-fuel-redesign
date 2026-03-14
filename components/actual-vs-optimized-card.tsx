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

/** Build LocationComparison from a transaction that has a betterOption; otherwise null. */
export function transactionToComparison(
  t: FuelTransaction
): LocationComparison | null {
  const opt = t.betterOption
  if (!opt) return null
  const optimizedTotal = Math.round(t.gallons * opt.pricePerGallon * 100) / 100
  return {
    actualChain: t.stationBrand,
    actualLocation: t.location,
    actualCpg: t.pricePerGallon,
    actualTotal: t.totalCost,
    optimizedChain: opt.stationName,
    optimizedLocation: opt.location,
    optimizedCpg: opt.pricePerGallon,
    optimizedTotal,
    savings: opt.potentialSavings,
    distanceMiles: opt.distanceMiles,
  }
}

type Position = "bottom-left" | "bottom-right" | "bottom"

const positionClasses: Record<Position, string> = {
  "bottom-left": "bottom-3 left-3 max-w-sm",
  "bottom-right": "bottom-3 right-3 max-w-sm",
  bottom: "bottom-3 left-3 right-3 max-w-sm",
}

type ActualVsOptimizedCardProps =
  | {
      variant: "comparison"
      comparison: LocationComparison
      position?: Position
    }
  | {
      variant: "optimal"
      transaction: FuelTransaction
      position?: Position
    }

export function ActualVsOptimizedCard(
  props: ActualVsOptimizedCardProps
) {
  const position = props.position ?? "bottom"
  const baseClasses =
    "absolute z-10 rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur-sm"

  if (props.variant === "optimal") {
    const { transaction } = props
    return (
      <div
        className={cn(
          baseClasses,
          positionClasses[position]
        )}
      >
        <p className="text-[10px] font-medium text-muted-foreground pb-1">
          Optimal purchase
        </p>
        <p className="text-sm font-medium text-foreground">
          Great purchase
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          In-network fill-up at the best available price.
        </p>
        <div className="mt-2 pt-2 border-t border-border space-y-0.5 text-[10px]">
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

  const { comparison } = props
  return (
    <div
      className={cn(
        baseClasses,
        positionClasses[position]
      )}
    >
      <div className="flex flex-wrap items-center gap-3 pb-2 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
          Optimized
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
        <div className="space-y-0.5 border-l-2 border-l-destructive pl-2">
          <p className="font-medium text-muted-foreground">Actual</p>
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
          style={{ borderLeftColor: "var(--chart-2)" }}
        >
          <p className="font-medium text-muted-foreground">Optimized</p>
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
      </div>
      <p
        className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] font-medium tabular-nums"
        style={{ color: "var(--chart-2)" }}
      >
        <span>Could have saved</span>
        <span>${comparison.savings.toFixed(2)}</span>
      </p>
    </div>
  )
}
