"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useTrips } from "@/lib/trips-context"
import type { TripPlan } from "@/lib/trips"
import { trucks } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TripDetailContentDefault } from "@/components/trip-detail-default"
import { useTripRoute } from "@/lib/use-trip-route"

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

export interface TripsDefaultProps {
  selectedTripId: string | null
}

export function TripsDefault({ selectedTripId }: TripsDefaultProps) {
  const router = useRouter()
  const { tripPlans, getTripPlan } = useTrips()
  const [driverFilter, setDriverFilter] = React.useState<string>("all")
  const [sidebarWidth, setSidebarWidth] = React.useState(0)
  const sidebarRef = React.useRef<HTMLElement>(null)

  const selectedTrip = selectedTripId ? getTripPlan(selectedTripId) : null

  React.useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? { width: 0 }
      setSidebarWidth(Math.round(width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const driverOptions = React.useMemo(() => {
    const truckIds = [...new Set(tripPlans.map((t) => t.truckId))].sort()
    return truckIds.map((id) => {
      const truck = trucks.find((t) => t.id === id)
      return { value: id, label: truck ? `${truck.driverName} · ${id}` : id }
    })
  }, [tripPlans])

  const driverSelectItems = React.useMemo(
    () => [{ value: "all", label: "All drivers" } as const, ...driverOptions],
    [driverOptions]
  )

  const filteredTrips = React.useMemo(() => {
    if (driverFilter === "all") return tripPlans
    return tripPlans.filter((t) => t.truckId === driverFilter)
  }, [tripPlans, driverFilter])

  const handleBack = React.useCallback(() => {
    router.push("/trips")
  }, [router])

  const mapProps = useTripRoute(selectedTrip)

  return (
    <div
      className="relative flex flex-1 min-h-0 overflow-hidden p-0"
      style={{
        height: "100%",
        maxHeight: "calc(100dvh - var(--header-height, 3rem))",
      }}
    >
      {/* Full-bleed map background */}
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full">
          <RouteOptimizerMapDynamic
            originCoords={mapProps.originCoords}
            destinationCoords={mapProps.destinationCoords}
            routeCoordinates={mapProps.routeCoordinates}
            routeLoading={mapProps.routeLoading}
            fuelStopCoords={mapProps.fuelStopCoords}
            mapLeftPadding={sidebarWidth}
          />
        </div>
      </div>

      {/* Left overlay: blocks map interaction; contains floating card */}
      <aside
        ref={sidebarRef}
        className="absolute left-0 top-0 bottom-0 z-10 flex w-full min-w-0 flex-col pt-4 px-0 pb-0 md:p-4 md:min-w-[23.75rem] md:max-w-xl md:w-[43%]"
        aria-label="Trip details"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:justify-start md:rounded-xl md:border md:border-border md:bg-background/20 md:backdrop-blur-md md:shadow-lg">
          <div className="min-h-[140px] max-h-[33.333vh] flex-1 md:hidden" aria-hidden />
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background/20 shadow-lg backdrop-blur-md md:border-0 md:rounded-none md:shadow-none">
            {selectedTrip ? (
              <>
                <header className="shrink-0 border-b border-border p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 min-h-11 w-fit justify-start gap-1.5 text-muted-foreground hover:text-foreground sm:min-h-0"
                    onClick={handleBack}
                    aria-label="Back to trips"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Back
                  </Button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-0 md:p-4">
                  <TripDetailContentDefault trip={selectedTrip} onBack={handleBack} hideBackButton />
                </div>
                <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur-sm md:bg-background/20">
                  <Button
                    className="min-h-11 w-full sm:min-h-0"
                    onClick={() => router.push(`/route-optimizer?tripId=${selectedTrip.id}`)}
                  >
                    Edit trip
                  </Button>
                </footer>
              </>
            ) : selectedTripId ? (
              <>
                <header className="shrink-0 border-b border-border p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 min-h-11 w-fit justify-start gap-1.5 text-muted-foreground hover:text-foreground sm:min-h-0"
                    onClick={handleBack}
                    aria-label="Back to trips"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Back
                  </Button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-4">
                  <p className="text-sm text-muted-foreground">Trip not found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The trip may have been removed or the link is invalid.
                  </p>
                </div>
              </>
            ) : (
              <>
                <header className="shrink-0 border-b border-border p-4">
                  <h2 className="text-lg font-semibold tracking-tight md:text-2xl">Trips</h2>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Trip plans from the Optimizer. Select one to track progress.
                  </p>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-0 md:p-4">
                  <div className="flex flex-col gap-4 p-4 md:p-0">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="trips-driver-filter" className="text-xs font-medium text-muted-foreground">
                        Driver
                      </label>
                      <Select
                        value={driverFilter}
                        onValueChange={(v) => setDriverFilter(v ?? "all")}
                        items={driverSelectItems}
                      >
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
                          return (
                            <li key={trip.id}>
                              <Link
                                href={`/trips?id=${trip.id}`}
                                data-slot="card"
                                className="w-full text-left rounded-lg border border-border p-3 transition-colors flex items-center gap-3 bg-card text-card-foreground shadow-sm hover:bg-muted/50"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {trip.name ?? `${trip.origin} → ${trip.destination}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(trip.tripStart), "MMM d, yyyy")} – {format(new Date(trip.tripEnd), "MMM d, yyyy")} · {trip.truckId}
                                  </p>
                                  <Badge
                                    variant={status === "completed" ? "default" : status === "in_progress" ? "default" : "outline"}
                                    className="mt-1.5 text-[length:var(--text-2xs)]"
                                  >
                                    {status === "upcoming" && "Upcoming"}
                                    {status === "in_progress" && "In progress"}
                                    {status === "completed" && "Completed"}
                                  </Badge>
                                </div>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
