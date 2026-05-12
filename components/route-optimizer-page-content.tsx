"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { driverDisplayName, loadDriverContacts } from "@/lib/driver-contact-store"
import { trucks, drivers, mockRouteStops, mockRouteSummary } from "@/lib/mock-data"
import { useTrips } from "@/lib/trips-context"
import type { TripPlanStop, TripPlanSummary, LngLat } from "@/lib/trips"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  MapPin,
  Plus,
  ChevronLeft,
  Trash2,
  Fuel,
  Route,
  Clock,
} from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { useTouchSheetScrollEnabled } from "@/hooks/use-touch-sheet-scroll-enabled"
import { useDebouncedGeocode } from "@/hooks/use-debounced-geocode"
import {
  fetchDrivingRoutes,
  type RouteData,
} from "@/lib/osrm-route"
import { formatDuration, formatDistanceMeters } from "@/lib/format-route-meta"
import { cn } from "@/lib/utils"
import { MapSheetLayout } from "@/components/map-sheet-layout"

/** Matches `Input` / `SelectTrigger`: border-input, bg-input, typography, and route-form min-heights. */
const ROUTE_OPT_FIELD_POPOVER_TRIGGER =
  "border-input bg-input/20 font-normal shadow-none transition-colors dark:bg-input/30 hover:bg-input/35 hover:text-foreground dark:hover:bg-input/45 aria-expanded:bg-input/45 aria-expanded:text-foreground min-h-11 w-full justify-start gap-2 rounded-md px-2 py-0.5 text-sm md:text-xs/relaxed sm:min-h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0"

const RouteOptimizerMapDynamic = dynamic(
  () =>
    import("@/components/route-optimizer-map").then((m) => ({
      default: m.RouteOptimizerMap,
    })),
  { ssr: false }
)

function sampleRouteForStops(routeCoords: LngLat[], stopCount: number): LngLat[] {
  if (routeCoords.length < 2 || stopCount < 1) return []
  const result: LngLat[] = []
  for (let i = 0; i < stopCount; i++) {
    const t = (i + 1) / (stopCount + 1)
    const idx = Math.min(
      Math.floor(t * routeCoords.length),
      routeCoords.length - 1
    )
    result.push(routeCoords[idx])
  }
  return result
}

export function RouteOptimizerPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addTripPlan, updateTripPlan, removeTripPlan, getTripPlan } = useTrips()
  const [tripStart, setTripStart] = React.useState<Date | undefined>(undefined)
  const [tripEnd, setTripEnd] = React.useState<Date | undefined>(undefined)
  const [tripStartOpen, setTripStartOpen] = React.useState(false)
  const [tripEndOpen, setTripEndOpen] = React.useState(false)
  const [initialFuelLevel, setInitialFuelLevel] = React.useState(100)
  const [driverId, setDriverId] = React.useState("")
  const [truckId, setTruckId] = React.useState("")
  const [tankSize, setTankSize] = React.useState("")
  const [mpg, setMpg] = React.useState("")
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [waypoints, setWaypoints] = React.useState<string[]>([])
  const [calculated, setCalculated] = React.useState(false)
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [routeCoordinates, setRouteCoordinates] = React.useState<LngLat[]>([])
  const [routeOptions, setRouteOptions] = React.useState<RouteData[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = React.useState(0)
  const [routeLoading, setRouteLoading] = React.useState(false)
  const [planStops, setPlanStops] = React.useState<TripPlanStop[]>([])
  const [planSummary, setPlanSummary] = React.useState<TripPlanSummary | null>(null)
  const [sidebarWidth, setSidebarWidth] = React.useState(0)
  const sidebarRef = React.useRef<HTMLElement>(null)
  const formContentRef = React.useRef<HTMLDivElement>(null)
  const touchSheetScroll = useTouchSheetScrollEnabled()
  const driverContacts = React.useMemo(() => loadDriverContacts(drivers), [])

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

  const {
    coords: originCoords,
    loading: originGeocodeLoading,
    error: originGeocodeError,
  } = useDebouncedGeocode(origin, 500)

  const {
    coords: destinationCoords,
    loading: destinationGeocodeLoading,
    error: destinationGeocodeError,
  } = useDebouncedGeocode(destination, 500)

  React.useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRouteCoordinates([])
      setRouteOptions([])
      setSelectedRouteIndex(0)
      setRouteLoading(false)
      return
    }

    const fallback = () => {
      setRouteOptions([])
      setSelectedRouteIndex(0)
      setRouteCoordinates([originCoords, destinationCoords])
    }
    let active = true
    const controller = new AbortController()
    const timeoutMs = 30_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    setRouteCoordinates([])
    setRouteOptions([])
    setSelectedRouteIndex(0)
    setRouteLoading(true)
    fetchDrivingRoutes(originCoords, destinationCoords, { signal: controller.signal })
      .then((routes) => {
        if (!active) return
        if (routes.length > 0) {
          const sorted = [...routes].sort((a, b) => a.duration - b.duration)
          setRouteOptions(sorted)
          setSelectedRouteIndex(0)
          if (sorted[0]?.coordinates?.length >= 2) return
        }
        fallback()
      })
      .catch(() => {
        if (active) fallback()
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (active) setRouteLoading(false)
      })

    return () => {
      active = false
      controller.abort()
      clearTimeout(timeoutId)
      setRouteLoading(false)
    }
  }, [originCoords, destinationCoords])

  const mapRouteCoordinates = React.useMemo((): LngLat[] => {
    const r = routeOptions[selectedRouteIndex]
    if (r?.coordinates && r.coordinates.length >= 2) return r.coordinates
    return routeCoordinates
  }, [routeOptions, selectedRouteIndex, routeCoordinates])

  const tripIdParam = searchParams.get("tripId")

  React.useEffect(() => {
    if (!tripIdParam) return
    const plan = getTripPlan(tripIdParam)
    if (!plan) return
    setOrigin(plan.origin)
    setDestination(plan.destination)
    setWaypoints(plan.waypoints ?? [])
    setTripStart(plan.tripStart ? new Date(plan.tripStart) : undefined)
    setTripEnd(plan.tripEnd ? new Date(plan.tripEnd) : undefined)
    setTruckId(plan.truckId)
    setDriverId(plan.driverId ?? "")
    setRouteCoordinates(plan.routeCoordinates)
    setRouteOptions([])
    setSelectedRouteIndex(0)
    setPlanStops(plan.stops)
    setPlanSummary(plan.summary)
    setCalculated(false)
  }, [tripIdParam, getTripPlan])

  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      setIsOptimizing(false)
      if (origin?.trim() && destination?.trim() && truckId) {
        setCalculated(true)
        const coords = sampleRouteForStops(mapRouteCoordinates, mockRouteStops.length)
        setPlanStops(
          mockRouteStops.map((stop, i) => ({
            ...stop,
            lat: coords[i]?.[1] ?? 0,
            lng: coords[i]?.[0] ?? 0,
          }))
        )
        setPlanSummary(mockRouteSummary)
      }
    }, 900)
  }

  const addWaypoint = () => {
    setWaypoints((w) => [...w, ""])
  }

  const removeWaypoint = (index: number) => {
    setWaypoints((w) => w.filter((_, i) => i !== index))
  }

  const selectedTruck = trucks.find((t) => t.id === truckId)

  React.useEffect(() => {
    if (!selectedTruck) return
    setInitialFuelLevel(selectedTruck.fuelLevel)
    setMpg(String(selectedTruck.avgMpg))
    setTankSize("120")
  }, [selectedTruck?.id])

  const fuelStopCoords = React.useMemo((): LngLat[] => {
    if (!calculated || mapRouteCoordinates.length < 2) return []
    if (planStops.length > 0 && planStops.every((s) => "lat" in s && "lng" in s)) {
      return planStops.map((s) => [s.lng, s.lat])
    }
    return sampleRouteForStops(
      mapRouteCoordinates,
      (planStops.length ? planStops : mockRouteStops).length
    )
  }, [calculated, mapRouteCoordinates, planStops])
  const displayStops = planStops.length ? planStops : mockRouteStops
  const displaySummary = planSummary ?? mockRouteSummary

  const saveTrip = (opts: { sendToDriver?: boolean } = {}) => {
    const sendToDriver = opts.sendToDriver ?? false
    const start = tripStart?.toISOString?.() ?? ""
    const end = tripEnd?.toISOString?.() ?? ""
    if (!start || !end || !planSummary) return
    const fleetDriver = drivers.find((d) => d.driverId === driverId)
    const driverName = fleetDriver
      ? driverDisplayName(fleetDriver.driverName, driverContacts[driverId])
      : undefined
    const updates = {
      name: `${origin} → ${destination}`,
      origin,
      destination,
      waypoints,
      tripStart: start,
      tripEnd: end,
      truckId,
      driverId,
      driverName,
      stops: planStops.length ? planStops : mockRouteStops.map((s, i) => ({
        ...s,
        lat: fuelStopCoords[i]?.[1] ?? 0,
        lng: fuelStopCoords[i]?.[0] ?? 0,
      })),
      summary: planSummary,
      routeCoordinates: mapRouteCoordinates,
    }
    if (tripIdParam) {
      updateTripPlan(tripIdParam, updates)
      if (sendToDriver) {
        router.push(
          `/trips?id=${encodeURIComponent(tripIdParam)}&send=1`
        )
      } else {
        toast.success("Trip updated.")
        router.push(`/trips?id=${encodeURIComponent(tripIdParam)}`)
      }
    } else {
      const saved = addTripPlan(updates)
      if (sendToDriver) {
        router.push(`/trips?id=${encodeURIComponent(saved.id)}&send=1`)
      } else {
        toast.success("Trip saved. View it in Trips.")
      }
    }
  }

  const handleDeleteTrip = () => {
    if (!tripIdParam) return
    removeTripPlan(tripIdParam)
    toast.success("Trip deleted.")
    router.push("/trips")
  }

  return (
    <MapSheetLayout
      map={
        <RouteOptimizerMapDynamic
          originCoords={originCoords}
          destinationCoords={destinationCoords}
          routeCoordinates={mapRouteCoordinates}
          routeAlternatives={
            routeOptions.length > 0
              ? routeOptions.map((o) => o.coordinates)
              : undefined
          }
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          routeLoading={routeLoading}
          fuelStopCoords={fuelStopCoords}
          mapLeftPadding={touchSheetScroll ? 0 : sidebarWidth}
          mapBottomPadding={0}
          routeSwitcher={
            !isOptimizing &&
            originCoords &&
            destinationCoords &&
            routeOptions.length > 0 &&
            !routeLoading ? (
              <>
                {routeOptions.map((route, index) => {
                  const isActive = index === selectedRouteIndex
                  const isFastest = index === 0
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={isActive ? "default" : "secondary"}
                      size="sm"
                      className="h-auto min-h-11 justify-start gap-2 py-2 sm:min-h-9"
                      onClick={() => setSelectedRouteIndex(index)}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0" aria-hidden />
                        <span className="font-medium">
                          {formatDuration(route.duration)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs opacity-80">
                        <Route className="size-3 shrink-0" aria-hidden />
                        {formatDistanceMeters(route.distance)}
                      </span>
                      {isFastest ? (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                          Fastest
                        </span>
                      ) : null}
                    </Button>
                  )
                })}
              </>
            ) : null
          }
        />
      }
      overlay={
        isOptimizing ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 animate-pulse pointer-events-auto">
            <p className="text-sm font-medium text-foreground">Optimizing route</p>
          </div>
        ) : null
      }
      ariaLabel="Route details"
      sidebarRef={sidebarRef}
      formContentRef={formContentRef}
      cardClassName="rounded-lg text-card-foreground backdrop-blur-md max-md:bg-background/95 max-md:ring-0 max-md:shadow-none md:bg-background/88 md:ring-1 md:ring-border/40 md:shadow-md md:min-h-0 md:max-h-none md:flex-1"
    >
          {calculated ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-visible rounded-none border border-border shadow-sm md:flex-1 md:overflow-hidden md:rounded-xl">
              <header className="shrink-0 border-b border-border p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 min-h-11 w-fit justify-start gap-1.5 text-muted-foreground hover:text-foreground sm:min-h-0"
                  onClick={() => setCalculated(false)}
                  aria-label="Back to form"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </Button>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-visible p-0 md:flex-1 md:overflow-y-auto md:p-4">
                <Card className="py-0">
                  <CardContent className="p-4">
                    <h2 className="text-base font-semibold mb-4">
                      Trip plan
                    </h2>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-1 self-stretch">
                        <MapPin className="size-5 shrink-0 text-primary sm:size-4" aria-hidden />
                        {displayStops.map((_, i) => (
                          <React.Fragment key={i}>
                            <div className="w-px flex-1 min-h-5 border-l border-dashed border-border sm:min-h-4" />
                            <Fuel className="size-5 shrink-0 text-primary sm:size-4" aria-hidden />
                          </React.Fragment>
                        ))}
                        <div className="w-px flex-1 min-h-5 border-l border-dashed border-border sm:min-h-4" />
                        <MapPin className="size-5 shrink-0 text-primary sm:size-4" aria-hidden />
                      </div>
                      <div className="flex flex-1 flex-col gap-4 min-w-0 sm:gap-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground sm:text-xs">Pickup</p>
                          <p className="text-sm font-medium truncate sm:text-xs">{origin || "Starting location"}</p>
                        </div>
                        {displayStops.map((stop, i) => {
                          const costAtStop = stop.pricePerGallon * stop.refuelGallons
                          return (
                            <div key={i} className="space-y-0.5">
                              <p className="text-sm font-medium text-muted-foreground sm:text-xs">Stop {i + 1}: {stop.station}</p>
                              <p className="text-sm font-medium truncate sm:text-xs">{stop.location}</p>
                              <p className="text-sm text-muted-foreground sm:text-xs">
                                Estimated fuel at stop: {stop.fuelPct}% · ${costAtStop.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground sm:text-xs">
                                {stop.distanceFromPrev} mi from previous · ETA {stop.eta}
                              </p>
                            </div>
                          )
                        })}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground sm:text-xs">Destination</p>
                          <p className="text-sm font-medium truncate sm:text-xs">{destination || "Ending location"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:text-xs">
                      <p className="font-medium text-foreground">
                        Total estimated fuel cost: ${displaySummary.totalCost.toLocaleString()}
                      </p>
                      <p className="mt-0.5 text-[var(--success)]">
                        Savings vs alternative routes: ${displaySummary.savingsVsAlternate}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <footer
                className={cn(
                  "shrink-0 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm",
                  "max-md:sticky max-md:bottom-0 max-md:z-10",
                  "md:relative md:z-auto md:bg-background/20 md:pb-4"
                )}
              >
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full sm:min-h-0"
                    onClick={() => saveTrip({ sendToDriver: false })}
                  >
                    {tripIdParam ? "Save changes" : "Save trip"}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="min-h-11 w-full sm:min-h-0"
                    disabled={!driverId?.trim()}
                    aria-describedby={
                      !driverId?.trim()
                        ? "route-opt-send-driver-help"
                        : undefined
                    }
                    onClick={() => saveTrip({ sendToDriver: true })}
                  >
                    {tripIdParam
                      ? "Save changes and send to driver"
                      : "Save trip and send to driver"}
                  </Button>
                  {!driverId?.trim() ? (
                    <p id="route-opt-send-driver-help" className="sr-only">
                      Select a driver to enable sending the trip plan.
                    </p>
                  ) : null}
                </div>
              </footer>
            </div>
          ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-visible md:flex-1 md:overflow-hidden">
            <header className="shrink-0 border-b border-border p-4">
              <h2 className="text-lg font-semibold tracking-tight md:text-2xl">Optimize fuel purchases</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Trip location information
              </p>
            </header>
            <div
              role="region"
              aria-label="Trip and route details"
              className="flex min-h-0 flex-1 flex-col overflow-visible md:flex-1 md:basis-0 md:overflow-y-auto md:overscroll-y-contain md:[-webkit-overflow-scrolling:touch]"
            >
              <div className="flex flex-col gap-4 p-4 pb-8 md:min-h-0">
                <section
                  className="flex shrink-0 flex-col gap-2 py-4"
                  aria-labelledby="route-opt-where-heading"
                >
                  <h3
                    id="route-opt-where-heading"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Where
                  </h3>
                  <div className="flex flex-col gap-2">
                    <Field>
                      <FieldLabel className="sr-only">Starting location</FieldLabel>
                      <div className="relative">
                        <Route
                          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          placeholder="Starting location"
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          aria-invalid={originGeocodeError}
                          className="min-h-11 pl-9 sm:min-h-9"
                        />
                        {originGeocodeLoading ? (
                          <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          >
                            <Loader2 className="size-4 animate-spin" />
                          </span>
                        ) : null}
                      </div>
                      {originGeocodeError && origin.trim() ? (
                        <p className="mt-1 text-xs text-destructive">
                          Could not find location. Try a different search.
                        </p>
                      ) : null}
                    </Field>
                    {waypoints.map((_, i) => (
                      <Field key={i} className="group/waypoint">
                        <FieldLabel className="sr-only">Waypoint {i + 1}</FieldLabel>
                        <div className="relative">
                          <Route
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            placeholder={`Waypoint ${i + 1}`}
                            value={waypoints[i]}
                            onChange={(e) => {
                              const next = [...waypoints]
                              next[i] = e.target.value
                              setWaypoints(next)
                            }}
                            className="min-h-11 pl-9 pr-12 sm:min-h-9"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 text-muted-foreground hover:text-destructive sm:size-9 sm:min-h-9 sm:min-w-9"
                            onClick={() => removeWaypoint(i)}
                            aria-label={`Remove waypoint ${i + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </Field>
                    ))}
                    <Field>
                      <FieldLabel className="sr-only">Ending location</FieldLabel>
                      <div className="relative">
                        <Route
                          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          placeholder="Ending location"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          aria-invalid={destinationGeocodeError}
                          className="min-h-11 pl-9 sm:min-h-9"
                        />
                        {destinationGeocodeLoading ? (
                          <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          >
                            <Loader2 className="size-4 animate-spin" />
                          </span>
                        ) : null}
                      </div>
                      {destinationGeocodeError && destination.trim() ? (
                        <p className="mt-1 text-xs text-destructive">
                          Could not find location. Try a different search.
                        </p>
                      ) : null}
                    </Field>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 w-full gap-2 sm:min-h-9"
                    onClick={addWaypoint}
                  >
                    <Plus className="size-4" />
                    Add waypoint
                  </Button>
                </section>

                <Separator
                  className="bg-border/70"
                  aria-hidden
                />

                <section
                  className="flex shrink-0 flex-col gap-2 py-4"
                  aria-labelledby="route-opt-when-heading"
                >
                  <h3
                    id="route-opt-when-heading"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    When
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground" htmlFor="route-opt-trip-start">
                      Trip start
                    </Label>
                    <Popover open={tripStartOpen} onOpenChange={setTripStartOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            id="route-opt-trip-start"
                            variant="outline"
                            size="default"
                            data-form-control=""
                            className={cn(
                              ROUTE_OPT_FIELD_POPOVER_TRIGGER,
                              !tripStart && "text-muted-foreground"
                            )}
                          >
                            <HugeiconsIcon
                              icon={Calendar01Icon}
                              strokeWidth={1.5}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            {tripStart ? format(tripStart, "MM/dd/yyyy") : "Pick date"}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto max-w-[min(100vw-2rem,288px)] p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tripStart}
                          onSelect={(date) => {
                            setTripStart(date)
                            setTripStartOpen(false)
                          }}
                          initialFocus
                          className="[--cell-size:2.75rem] sm:[--cell-size:--spacing(6)]"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground" htmlFor="route-opt-trip-end">
                      Trip end
                    </Label>
                    <Popover open={tripEndOpen} onOpenChange={setTripEndOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            id="route-opt-trip-end"
                            variant="outline"
                            size="default"
                            data-form-control=""
                            className={cn(
                              ROUTE_OPT_FIELD_POPOVER_TRIGGER,
                              !tripEnd && "text-muted-foreground"
                            )}
                          >
                            <HugeiconsIcon
                              icon={Calendar01Icon}
                              strokeWidth={1.5}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            {tripEnd ? format(tripEnd, "MM/dd/yyyy") : "Pick date"}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto max-w-[min(100vw-2rem,288px)] p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tripEnd}
                          onSelect={(date) => {
                            setTripEnd(date)
                            setTripEndOpen(false)
                          }}
                          initialFocus
                          className="[--cell-size:2.75rem] sm:[--cell-size:--spacing(6)]"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </section>

                <Separator
                  className="bg-border/70"
                  aria-hidden
                />

                <section
                  className="flex shrink-0 flex-col gap-3 py-4"
                  aria-labelledby="route-opt-who-heading"
                >
                  <h3
                    id="route-opt-who-heading"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Who
                  </h3>
                  <Field>
                    <FieldLabel className="text-xs text-muted-foreground">Driver</FieldLabel>
                    <Select
                      value={driverId}
                      onValueChange={(v) => setDriverId(v ?? "")}
                    >
                      <SelectTrigger className="min-h-11 w-full sm:min-h-9">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.driverId} value={d.driverId}>
                            {driverDisplayName(d.driverName, driverContacts[d.driverId])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs text-muted-foreground">Select truck</FieldLabel>
                    <Select
                      value={truckId}
                      onValueChange={(v) => setTruckId(v ?? "")}
                    >
                      <SelectTrigger className="min-h-11 w-full sm:min-h-9">
                        <SelectValue placeholder="Select truck" />
                      </SelectTrigger>
                      <SelectContent>
                        {trucks.slice(0, 20).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Initial fuel tank level
                    </p>
                    <div className="flex min-h-11 items-center gap-2 sm:min-h-9">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">E</span>
                      <Slider
                        className="min-w-0 flex-1"
                        min={0}
                        max={100}
                        step={1}
                        value={[initialFuelLevel]}
                        onValueChange={(v) => setInitialFuelLevel(Array.isArray(v) ? (v[0] ?? 0) : Number(v))}
                        aria-label="Initial fuel tank level"
                      />
                      <span className="text-xs font-medium text-muted-foreground shrink-0">F</span>
                    </div>
                    <p className="text-xs font-medium text-primary">{initialFuelLevel}%</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs text-muted-foreground">Tank size</FieldLabel>
                      <Input
                        type="number"
                        placeholder="e.g. 120"
                        value={tankSize}
                        onChange={(e) => setTankSize(e.target.value)}
                        className="min-h-11 sm:min-h-9"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs text-muted-foreground">MPG</FieldLabel>
                      <Input
                        type="number"
                        placeholder="e.g. 7"
                        value={mpg}
                        onChange={(e) => setMpg(e.target.value)}
                        className="min-h-11 sm:min-h-9"
                      />
                    </Field>
                  </div>
                </section>
              </div>
            </div>
            <footer
              className={cn(
                "w-full shrink-0 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm flex flex-col gap-2",
                "max-md:sticky max-md:bottom-0 max-md:z-[100000]",
                "md:relative md:z-auto md:bg-background/20 md:pb-4"
              )}
            >
              <Button
                onClick={handleOptimize}
                className="min-h-11 w-full sm:min-h-9"
                disabled={!origin?.trim() || !destination?.trim()}
              >
                Optimize trip
              </Button>
              {tripIdParam && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        className="h-11 min-h-11 w-full sm:h-9 sm:min-h-9"
                        aria-label="Delete trip"
                      />
                    }
                  >
                    Delete trip
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete trip?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This trip will be removed from your trips list. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDeleteTrip}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </footer>
          </div>
          )}
    </MapSheetLayout>
  )
}
