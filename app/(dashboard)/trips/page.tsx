"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { format } from "date-fns"
import { useTrips } from "@/lib/trips-context"
import type { TripPlan } from "@/lib/trips"
import { computeTripProgress } from "@/lib/trips"
import { fuelTransactions, trucks } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Fuel, ChevronRight, Pencil, CheckCircle2, AlertCircle } from "lucide-react"
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

export default function TripsPage() {
  const { tripPlans, getTripPlan } = useTrips()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [driverFilter, setDriverFilter] = React.useState<string>("all")
  const selectedTrip = selectedId ? getTripPlan(selectedId) : null
  const progress = React.useMemo(() => {
    if (!selectedTrip) return null
    return computeTripProgress(selectedTrip, fuelTransactions)
  }, [selectedTrip])

  const driverOptions = React.useMemo(() => {
    const truckIds = [...new Set(tripPlans.map((t) => t.truckId))].sort()
    return truckIds.map((id) => {
      const truck = trucks.find((t) => t.id === id)
      return { value: id, label: truck ? `${truck.driverName} · ${id}` : id }
    })
  }, [tripPlans])

  const filteredTrips = React.useMemo(() => {
    if (driverFilter === "all") return tripPlans
    return tripPlans.filter((t) => t.truckId === driverFilter)
  }, [tripPlans, driverFilter])

  return (
    <div
      className="flex flex-col-reverse md:flex-row flex-1 min-h-0 gap-0"
      style={{
        maxHeight: "calc(100dvh - var(--header-height, 3rem))",
      }}
    >
      {/* List panel */}
      <aside className="flex flex-col w-full md:max-w-sm md:w-1/3 border-r border-border bg-background overflow-hidden">
        <div className="p-4 px-[18px]">
          <h1 className="text-lg font-semibold">Trips</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trip plans from the Optimizer. Select one to track progress.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="trips-driver-filter" className="text-xs font-medium text-muted-foreground">
              Driver
            </label>
            <Select value={driverFilter} onValueChange={(v) => setDriverFilter(v ?? "all")}>
              <SelectTrigger id="trips-driver-filter" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {driverOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 px-[18px]">
          {tripPlans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No trip plans yet</p>
              <p className="mt-1">
                Create one in the Optimizer and save it to see it here.
              </p>
              <Link
                href="/route-optimizer"
                className="inline-flex h-6 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted hover:text-foreground mt-3"
              >
                Open Optimizer
              </Link>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No trips for this driver</p>
              <p className="mt-1">Change the driver filter or create trips in the Optimizer.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredTrips.map((trip) => {
                const status = getTripStatus(trip)
                const isSelected = selectedId === trip.id
                return (
                  <li key={trip.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(trip.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-colors flex items-center gap-3",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {trip.name ?? `${trip.origin} → ${trip.destination}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(trip.tripStart), "MMM d, yyyy")} – {format(new Date(trip.tripEnd), "MMM d, yyyy")} · {trip.truckId}
                        </p>
                        <Badge
                          variant={status === "completed" ? "secondary" : status === "in_progress" ? "default" : "outline"}
                          className="mt-1.5 text-[var(--text-2xs)]"
                        >
                          {status === "upcoming" && "Upcoming"}
                          {status === "in_progress" && "In progress"}
                          {status === "completed" && "Completed"}
                        </Badge>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
        {!selectedTrip ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground text-sm">
            <p>Select a trip to view details and track progress.</p>
          </div>
        ) : (
          (() => {
            const detailStatus = getTripStatus(selectedTrip);
            return (
          <div className="space-y-6 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold truncate">
                {selectedTrip.name ?? `${selectedTrip.origin} → ${selectedTrip.destination}`}
              </h2>
              <Badge
                variant={
                  detailStatus === "completed"
                    ? "secondary"
                    : detailStatus === "in_progress"
                      ? "default"
                      : "outline"
                }
                className="text-[var(--text-2xs)]"
              >
                {detailStatus === "upcoming" && "Upcoming"}
                {detailStatus === "in_progress" && "In progress"}
                {detailStatus === "completed" && "Completed"}
              </Badge>
              <Link
                href={`/route-optimizer?tripId=${selectedTrip.id}`}
                className="ml-auto inline-flex h-6 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" />
                Edit trip
              </Link>
            </div>

            {/* Trip map */}
            {selectedTrip.routeCoordinates.length >= 2 && (
              <div className="h-[280px] w-full min-w-0 rounded-lg border border-border overflow-hidden bg-muted/20">
                <RouteOptimizerMapDynamic
                  originCoords={selectedTrip.routeCoordinates[0] ?? null}
                  destinationCoords={selectedTrip.routeCoordinates[selectedTrip.routeCoordinates.length - 1] ?? null}
                  routeCoordinates={selectedTrip.routeCoordinates}
                  fuelStopCoords={selectedTrip.stops.map((s) => [s.lng, s.lat] as [number, number])}
                />
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Trip plan</CardTitle>
                <CardDescription>
                  {selectedTrip.truckId} · {format(new Date(selectedTrip.tripStart), "MMM d, yyyy")} – {format(new Date(selectedTrip.tripEnd), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-0.5">
                    <MapPin className="size-4 shrink-0 text-primary" />
                    {selectedTrip.stops.map((_, i) => (
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
                      <p className="text-sm font-medium truncate">{selectedTrip.origin}</p>
                    </div>
                    {selectedTrip.stops.map((stop, i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground">Stop {i + 1}: {stop.station}</p>
                        <p className="text-sm font-medium truncate">{stop.location}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-muted-foreground">Destination</p>
                      <p className="text-sm font-medium truncate">{selectedTrip.destination}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <p className="font-medium">
                    Total estimated fuel cost: ${selectedTrip.summary.totalCost.toLocaleString()}
                  </p>
                  <p className="text-[var(--success)] mt-0.5">
                    Savings vs alternative routes: ${selectedTrip.summary.savingsVsAlternate}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Progress & route adherence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Track progress</CardTitle>
                <CardDescription>
                  Fuel transactions for {selectedTrip.truckId} during the trip window.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                              <Badge variant="secondary" className="shrink-0 text-[var(--text-2xs)]">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-[var(--text-2xs)]">
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
              </CardContent>
            </Card>
          </div>
            );
          })())}
      </main>
    </div>
  )
}
