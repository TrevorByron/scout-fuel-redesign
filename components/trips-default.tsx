"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useTrips } from "@/lib/trips-context"
import type { TripPlan } from "@/lib/trips"
import { sendTripToDriver } from "@/lib/trip-send-to-driver"
import { computeTripProgress } from "@/lib/trips"
import { trucks } from "@/lib/mock-data"
import { getTransactionsForTripPlan } from "@/lib/trip-transactions"
import { fetchDrivingRoutes, pickDrivingRoutePolyline } from "@/lib/osrm-route"
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
import {
  ActualVsOptimizedCard,
  transactionToComparison,
} from "@/components/actual-vs-optimized-card"
import { useTripRoute } from "@/lib/use-trip-route"
import { useTouchSheetScrollEnabled } from "@/hooks/use-touch-sheet-scroll-enabled"
import { MapSheetLayout } from "@/components/map-sheet-layout"
import type { StopSelectionMapFocus } from "@/components/route-optimizer-map"

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
  const { tripPlans, getTripPlan, updateTripPlan } = useTrips()
  const [driverFilter, setDriverFilter] = React.useState<string>("all")
  const [sidebarWidth, setSidebarWidth] = React.useState(0)
  const sidebarRef = React.useRef<HTMLElement>(null)
  const formContentRef = React.useRef<HTMLDivElement>(null)
  const touchSheetScroll = useTouchSheetScrollEnabled()

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

  const handleSendToDriver = React.useCallback(() => {
    if (!selectedTrip) return
    sendTripToDriver(selectedTrip, updateTripPlan)
  }, [selectedTrip, updateTripPlan])

  const mapProps = useTripRoute(selectedTrip)

  const [selectedStopIndex, setSelectedStopIndex] = React.useState<number | null>(null)
  const [insightPolyline, setInsightPolyline] = React.useState<[number, number][] | null>(null)
  const [insightLoading, setInsightLoading] = React.useState(false)

  const tripProgress = React.useMemo(() => {
    if (!selectedTrip) return null
    return computeTripProgress(selectedTrip, getTransactionsForTripPlan(selectedTrip))
  }, [selectedTrip])

  React.useEffect(() => {
    setSelectedStopIndex(null)
  }, [selectedTrip?.id])

  const selectedStopProgress =
    tripProgress && selectedStopIndex !== null
      ? tripProgress.stopProgress[selectedStopIndex]
      : undefined
  const insightTxn = selectedStopProgress?.matchedTransaction
  const insightBetter = insightTxn?.betterOption

  React.useEffect(() => {
    if (!insightTxn || !insightBetter) {
      setInsightPolyline(null)
      setInsightLoading(false)
      return
    }
    const ac = new AbortController()
    setInsightLoading(true)
    setInsightPolyline(null)
    fetchDrivingRoutes([insightTxn.lng, insightTxn.lat], [insightBetter.lng, insightBetter.lat], {
      signal: ac.signal,
    })
      .then((routes) => {
        const poly = pickDrivingRoutePolyline(routes)
        setInsightPolyline(
          poly && poly.length >= 2
            ? (poly as [number, number][])
            : [
                [insightTxn.lng, insightTxn.lat],
                [insightBetter.lng, insightBetter.lat],
              ]
        )
      })
      .catch(() => {
        setInsightPolyline([
          [insightTxn.lng, insightTxn.lat],
          [insightBetter.lng, insightBetter.lat],
        ])
      })
      .finally(() => setInsightLoading(false))
    return () => ac.abort()
  }, [insightTxn?.id, insightBetter?.lat, insightBetter?.lng])

  const insightFocus = React.useMemo(() => {
    if (
      !insightTxn ||
      !insightBetter ||
      selectedStopIndex === null ||
      selectedStopProgress?.status !== "completed"
    ) {
      return null
    }
    return {
      stopIndex: selectedStopIndex,
      actual: [insightTxn.lng, insightTxn.lat] as [number, number],
      optimized: [insightBetter.lng, insightBetter.lat] as [number, number],
      routePolyline: insightPolyline,
      loading: insightLoading,
    }
  }, [
    insightTxn,
    insightBetter,
    selectedStopIndex,
    selectedStopProgress?.status,
    insightPolyline,
    insightLoading,
  ])

  const tripActualRefuels = React.useMemo(() => {
    if (!tripProgress) return undefined
    const rows: {
      coords: [number, number]
      outcome: "optimal" | "inefficient"
      stopIndex: number
    }[] = []
    tripProgress.stopProgress.forEach((sp, stopIndex) => {
      if (sp.status !== "completed" || !sp.matchedTransaction) return
      const comp = transactionToComparison(sp.matchedTransaction)
      rows.push({
        coords: [sp.matchedTransaction.lng, sp.matchedTransaction.lat],
        outcome: comp && comp.savings > 0 ? "inefficient" : "optimal",
        stopIndex,
      })
    })
    return rows.length > 0 ? rows : undefined
  }, [tripProgress])

  const stopSelectionFocus = React.useMemo((): StopSelectionMapFocus | null => {
    if (selectedStopIndex === null || !selectedTrip || !tripProgress) return null
    const sp = tripProgress.stopProgress[selectedStopIndex]
    if (!sp) return null

    const bo = sp.matchedTransaction?.betterOption
    if (sp.status === "completed" && sp.matchedTransaction && bo) {
      const mt = sp.matchedTransaction
      return {
        kind: "pair",
        a: [mt.lng, mt.lat],
        b: [bo.lng, bo.lat],
      }
    }
    if (sp.status === "completed" && sp.matchedTransaction) {
      const mt = sp.matchedTransaction
      return { kind: "point", center: [mt.lng, mt.lat], zoom: 11.2 }
    }
    const planned = selectedTrip.stops[selectedStopIndex]
    if (planned) {
      return { kind: "point", center: [planned.lng, planned.lat], zoom: 11 }
    }
    return null
  }, [selectedStopIndex, selectedTrip, tripProgress])

  const tripStopInsightCard = React.useMemo(() => {
    if (selectedStopIndex === null || !tripProgress) return undefined
    const sp = tripProgress.stopProgress[selectedStopIndex]
    if (!sp?.matchedTransaction) return undefined
    const mt = sp.matchedTransaction
    const when = format(new Date(mt.dateTime), "MMM d, yyyy · h:mm a")
    const header = (
      <p className="mb-2 text-xs text-muted-foreground tabular-nums">{when}</p>
    )
    const comp = transactionToComparison(mt)
    if (comp && comp.savings > 0) {
      return (
        <>
          {header}
          <ActualVsOptimizedCard
            variant="comparison"
            comparison={comp}
            layout="map"
          />
        </>
      )
    }
    return (
      <>
        {header}
        <ActualVsOptimizedCard
          variant="optimal"
          transaction={mt}
          layout="map"
        />
      </>
    )
  }, [selectedStopIndex, tripProgress])

  return (
    <MapSheetLayout
      map={
        <RouteOptimizerMapDynamic
          originCoords={mapProps.originCoords}
          destinationCoords={mapProps.destinationCoords}
          routeCoordinates={mapProps.routeCoordinates}
          routeLoading={mapProps.routeLoading}
          fuelStopCoords={mapProps.fuelStopCoords}
          mapLeftPadding={touchSheetScroll ? 0 : sidebarWidth}
          insightFocus={insightFocus}
          tripActualRefuels={tripActualRefuels}
          onTripActualRefuelClick={setSelectedStopIndex}
          stopSelectionFocus={stopSelectionFocus}
          tripStopInsightCard={tripStopInsightCard}
        />
      }
      ariaLabel="Trip details"
      sidebarRef={sidebarRef}
      formContentRef={formContentRef}
      cardDataSlot="card"
      cardClassName="rounded-lg bg-card text-card-foreground shadow-md ring-1 ring-foreground/10 max-md:pb-[env(safe-area-inset-bottom,0px)] md:min-h-0 md:max-h-none md:flex-1"
    >
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
                <div className="max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto p-0 md:p-4">
                  {tripProgress ? (
                    <TripDetailContentDefault
                      trip={selectedTrip}
                      progress={tripProgress}
                      selectedStopIndex={selectedStopIndex}
                      onSelectStopIndex={setSelectedStopIndex}
                      onBack={handleBack}
                      hideBackButton
                    />
                  ) : null}
                </div>
                <footer className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur-sm max-md:sticky max-md:bottom-0 max-md:z-10 md:relative md:z-auto md:bg-background/20">
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full sm:min-h-0"
                      onClick={() =>
                        router.push(`/route-optimizer?tripId=${selectedTrip.id}`)
                      }
                    >
                      Edit trip
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="min-h-11 w-full sm:min-h-0"
                      disabled={!selectedTrip.driverId?.trim()}
                      aria-describedby={
                        !selectedTrip.driverId?.trim()
                          ? "trips-send-driver-help"
                          : undefined
                      }
                      onClick={handleSendToDriver}
                    >
                      Send to driver
                    </Button>
                    {!selectedTrip.driverId?.trim() ? (
                      <p id="trips-send-driver-help" className="sr-only">
                        Assign a driver on this trip to send the trip plan.
                      </p>
                    ) : null}
                  </div>
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
                <div className="max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto p-4 md:p-4">
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
                <div className="max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto p-0 md:p-4">
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
                      <ul className="space-y-2 px-0.5">
                        {filteredTrips.map((trip) => {
                          const status = getTripStatus(trip)
                          return (
                            <li key={trip.id}>
                              <Link
                                href={`/trips?id=${trip.id}`}
                                className="w-full text-left rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm transition-colors flex items-center gap-3 hover:bg-muted/50"
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
    </MapSheetLayout>
  )
}
