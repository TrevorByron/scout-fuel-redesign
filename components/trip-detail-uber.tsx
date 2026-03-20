"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { useTrips } from "@/lib/trips-context"
import type { TripPlan } from "@/lib/trips"
import { computeTripProgress } from "@/lib/trips"
import { getFuelTransactions, drivers, trucks } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Fuel, ArrowLeft, Pencil, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const RouteOptimizerMapDynamic = dynamic(
  () =>
    import("@/components/route-optimizer-map").then((m) => ({
      default: m.RouteOptimizerMap,
    })),
  { ssr: false }
)

function getTripStatus(trip: TripPlan): "upcoming" | "in_progress" | "completed" {
  const now = Date.now()
  const start = new Date(trip.tripStart).getTime()
  const end = new Date(trip.tripEnd).getTime()
  if (now < start) return "upcoming"
  if (now > end) return "completed"
  return "in_progress"
}

export function TripDetailUber() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null
  const { getTripPlan } = useTrips()
  const trip = id ? getTripPlan(id) : null
  const progress = React.useMemo(() => {
    if (!trip) return null
    return computeTripProgress(trip, getFuelTransactions())
  }, [trip])

  if (!id || !trip) {
    return (
      <main className="flex flex-1 flex-col min-h-0 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground">Trip not found</p>
          <p className="mt-1">The trip may have been removed or the link is invalid.</p>
          <Link
            href="/trips"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground mt-4"
          >
            <ArrowLeft className="size-4" />
            Back to trips
          </Link>
        </div>
      </main>
    )
  }

  const detailStatus = getTripStatus(trip)
  const driverDisplay =
    trip.driverName ??
    (trip.driverId
      ? drivers.find((d) => d.driverId === trip.driverId)?.driverName
      : undefined) ??
    trucks.find((t) => t.id === trip.truckId)?.driverName

  return (
    <main className="flex flex-1 flex-col min-h-0 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <div className="space-y-6">
        <Link
          href="/trips"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted hover:text-foreground w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to trips
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold truncate">
            {trip.name ?? `${trip.origin} → ${trip.destination}`}
          </h1>
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
          <Link
            href={`/route-optimizer?tripId=${trip.id}`}
            className="ml-auto inline-flex h-6 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
            Edit trip
          </Link>
        </div>

        {trip.routeCoordinates.length >= 2 && (
          <div className="h-[280px] w-full min-w-0 rounded-lg border border-border overflow-hidden bg-muted/20">
            <RouteOptimizerMapDynamic
              originCoords={trip.routeCoordinates[0] ?? null}
              destinationCoords={trip.routeCoordinates[trip.routeCoordinates.length - 1] ?? null}
              routeCoordinates={trip.routeCoordinates}
              fuelStopCoords={trip.stops.map((s) => [s.lng, s.lat] as [number, number])}
            />
          </div>
        )}

        <Card variant="flat">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trip plan</CardTitle>
            <CardDescription>
              {driverDisplay ? `${driverDisplay} · ` : ""}
              {trip.truckId} · {format(new Date(trip.tripStart), "MMM d, yyyy")} – {format(new Date(trip.tripEnd), "MMM d, yyyy")}
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
                    <p className="text-xs text-muted-foreground">Stop {i + 1}: {stop.station}</p>
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
            <h2 className="text-sm font-medium mb-3">Track progress</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Fuel transactions for {trip.truckId} during the trip window.
            </p>
            <div className="space-y-4">
            {progress && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {progress.followedCount === progress.totalStops && progress.totalStops > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--success)]">
                      <CheckCircle2 className="size-4" />
                      Driver followed route — {progress.followedCount}/{progress.totalStops} stops at planned stations
                    </span>
                  ) : progress.followedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
                      <AlertCircle className="size-4" />
                      {progress.followedCount}/{progress.totalStops} stops at planned stations
                    </span>
                  ) : progress.totalStops > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      No matching refuels in trip window yet
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {progress.stopProgress.map((sp) => (
                    <li
                      key={sp.stopIndex}
                      className={cn(
                        "rounded-lg border p-3 text-sm",
                        sp.status === "completed"
                          ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                          : "border-border bg-muted/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            Stop {sp.stopIndex + 1}: {sp.stop.station}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{sp.stop.location}</p>
                        </div>
                        {sp.status === "completed" && sp.transaction ? (
                          <Badge variant="default" className="shrink-0 text-[length:var(--text-2xs)]">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-[length:var(--text-2xs)]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {sp.transaction && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Refueled {format(new Date(sp.transaction.dateTime), "MMM d, HH:mm")} · {sp.transaction.gallons} gal · ${sp.transaction.totalCost.toFixed(2)}
                        </p>
                      )}
                    </li>
                  ))}
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
              </>
            )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
