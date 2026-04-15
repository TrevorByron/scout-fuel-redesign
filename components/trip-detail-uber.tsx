"use client"

import * as React from "react"
import { format } from "date-fns"
import type { TripPlan } from "@/lib/trips"
import type { TripProgressResult } from "@/lib/trips"
import { drivers, trucks } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Fuel, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { transactionToComparison } from "@/components/actual-vs-optimized-card"

function getTripStatus(trip: TripPlan): "upcoming" | "in_progress" | "completed" {
  const now = Date.now()
  const start = new Date(trip.tripStart).getTime()
  const end = new Date(trip.tripEnd).getTime()
  if (now < start) return "upcoming"
  if (now > end) return "completed"
  return "in_progress"
}

export interface TripDetailContentUberProps {
  trip: TripPlan
  progress: TripProgressResult
  selectedStopIndex: number | null
  onSelectStopIndex: (index: number | null) => void
  onBack: () => void
  /** When true, Back button is not rendered (used when parent renders it sticky) */
  hideBackButton?: boolean
}

export function TripDetailContentUber({
  trip,
  progress,
  selectedStopIndex,
  onSelectStopIndex,
  onBack,
  hideBackButton,
}: TripDetailContentUberProps) {
  const detailStatus = getTripStatus(trip)
  const driverDisplay =
    trip.driverName ??
    (trip.driverId
      ? drivers.find((d) => d.driverId === trip.driverId)?.driverName
      : undefined) ??
    trucks.find((t) => t.id === trip.truckId)?.driverName

  const allStopsMatched =
    progress.totalStops > 0 && progress.followedCount === progress.totalStops
  const anyPaidMore = progress.stopProgress.some((sp) => {
    if (!sp.matchedTransaction) return false
    const c = transactionToComparison(sp.matchedTransaction)
    return c != null && c.savings > 0
  })

  return (
    <div className="space-y-4">
      {!hideBackButton && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 justify-start gap-1 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold truncate">
          {trip.name ?? `${trip.origin} → ${trip.destination}`}
        </h2>
        <Badge
          variant={
            detailStatus === "completed"
              ? "default"
              : detailStatus === "in_progress"
                ? "default"
                : "outline"
          }
          className="text-[length:var(--text-2xs)]"
        >
          {detailStatus === "upcoming" && "Upcoming"}
          {detailStatus === "in_progress" && "In progress"}
          {detailStatus === "completed" && "Completed"}
        </Badge>
      </div>

      <Card variant="flat">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trip plan</CardTitle>
          <CardDescription>
            {driverDisplay ? `${driverDisplay} · ` : ""}
            {trip.truckId} · {format(new Date(trip.tripStart), "MMM d, yyyy")} –{" "}
            {format(new Date(trip.tripEnd), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <MapPin className="size-4 shrink-0 text-primary" />
              {trip.stops.map((_, i) => (
                <React.Fragment key={i}>
                  <div className="w-px flex-1 min-h-3 border-l border-dashed border-border" />
                  <Fuel className="size-4 shrink-0 text-primary" />
                </React.Fragment>
              ))}
              <div className="w-px flex-1 min-h-3 border-l border-dashed border-border" />
              <MapPin className="size-4 shrink-0 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium truncate">{trip.origin}</p>
              </div>
              {trip.stops.map((stop, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">
                    Stop {i + 1}: {stop.station}
                  </p>
                  <p className="text-sm font-medium truncate">{stop.location}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="text-sm font-medium truncate">{trip.destination}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
            <p className="font-medium">
              Total estimated fuel cost: ${trip.summary.totalCost.toLocaleString()}
            </p>
            <p className="text-[var(--success)] mt-0.5">
              Savings vs alternative routes: ${trip.summary.savingsVsAlternate}
            </p>
          </div>
        </CardContent>
        <div className="border-t border-border px-4 pt-4 pb-4">
          <h2 className="text-sm font-medium mb-1">Track progress</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Refuels for {trip.truckId} along this route during the trip window. Tap a stop to
            compare actual vs optimized on the map.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {allStopsMatched && !anyPaidMore ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--success)]">
                  <CheckCircle2 className="size-4" />
                  All {progress.totalStops} refuels on plan — actual stops match optimized pricing
                </span>
              ) : allStopsMatched && anyPaidMore ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
                  <AlertCircle className="size-4" />
                  All {progress.totalStops} refuels recorded — tap “Paid more” for missed savings
                </span>
              ) : progress.followedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
                  <AlertCircle className="size-4" />
                  {progress.followedCount}/{progress.totalStops} stops matched on corridor
                </span>
              ) : progress.totalStops > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  No matching refuels in trip window yet
                </span>
              ) : null}
            </div>
            <ul className="space-y-2">
              {progress.stopProgress.map((sp) => {
                const comp =
                  sp.matchedTransaction != null
                    ? transactionToComparison(sp.matchedTransaction)
                    : null
                const isSelected = selectedStopIndex === sp.stopIndex
                return (
                  <li key={sp.stopIndex}>
                    <button
                      type="button"
                      className={cn(
                        "min-h-11 w-full rounded-lg border p-3 text-left text-sm transition-colors",
                        sp.status === "completed"
                          ? comp && comp.savings > 0
                            ? "border-amber-500/35 bg-amber-500/5"
                            : "border-[var(--success)]/30 bg-[var(--success)]/5"
                          : "border-border bg-muted/10",
                        isSelected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      )}
                      onClick={() =>
                        onSelectStopIndex(isSelected ? null : sp.stopIndex)
                      }
                      aria-pressed={isSelected}
                      aria-label={`Stop ${sp.stopIndex + 1}: ${sp.stop.station}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            Stop {sp.stopIndex + 1}: {sp.stop.station}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{sp.stop.location}</p>
                        </div>
                        {sp.status === "completed" && sp.matchedTransaction ? (
                          comp && comp.savings > 0 ? (
                            <Badge
                              variant="destructive"
                              className="shrink-0 text-[length:var(--text-2xs)]"
                            >
                              Paid more
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-emerald-600/35 bg-emerald-600/10 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 text-[length:var(--text-2xs)]"
                            >
                              On plan
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-[length:var(--text-2xs)]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {sp.transaction && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Refueled {format(new Date(sp.transaction.dateTime), "MMM d, HH:mm")} ·{" "}
                          {sp.transaction.gallons} gal · ${sp.transaction.totalCost.toFixed(2)}
                        </p>
                      )}
                      {comp && comp.savings > 0 ? (
                        <p
                          className="mt-1 text-xs font-medium tabular-nums"
                          style={{ color: "var(--chart-2)" }}
                        >
                          Could have saved ${comp.savings.toFixed(2)}
                        </p>
                      ) : sp.status === "completed" && sp.matchedTransaction && (!comp || comp.savings <= 0) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          At optimized network price
                        </p>
                      ) : null}
                    </button>
                  </li>
                )
                })}
            </ul>
            {progress.offRouteTransactions.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Off-route refuels
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {progress.offRouteTransactions.map((t, i) => (
                    <li key={i}>
                      {t.stationBrand}, {t.location} — {format(new Date(t.dateTime), "MMM d, HH:mm")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
