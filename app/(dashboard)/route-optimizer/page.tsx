"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { trucks, mockRouteStops, mockRouteSummary } from "@/lib/mock-data"
import { geocodeAddress } from "@/lib/geocode"
import { useTrips } from "@/lib/trips-context"
import type { TripPlanStop, TripPlanSummary, LngLat } from "@/lib/trips"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, MapPin, Plus, ChevronLeft, Trash2, Fuel } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const RouteOptimizerMapDynamic = dynamic(
  () =>
    import("@/components/route-optimizer-map").then((m) => ({
      default: m.RouteOptimizerMap,
    })),
  { ssr: false }
)

const OSRM_ROUTE_URL = (origin: LngLat, dest: LngLat) =>
  `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`

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

function useDebouncedGeocode(
  address: string,
  debounceMs: number
): {
  coords: LngLat | null
  loading: boolean
  error: boolean
} {
  const [coords, setCoords] = React.useState<LngLat | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    const trimmed = address.trim()
    if (!trimmed) {
      setCoords(null)
      setLoading(false)
      setError(false)
      return
    }

    const timer = setTimeout(() => {
      setLoading(true)
      setError(false)
      geocodeAddress(trimmed)
        .then((result) => {
          if (result) setCoords([result.lng, result.lat])
          else {
            setCoords(null)
            setError(true)
          }
        })
        .catch(() => {
          setCoords(null)
          setError(true)
        })
        .finally(() => setLoading(false))
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [address, debounceMs])

  return { coords, loading, error }
}

export default function RouteOptimizerPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <RouteOptimizerPageContent />
    </React.Suspense>
  )
}

function RouteOptimizerPageContent() {
  const searchParams = useSearchParams()
  const { addTripPlan, getTripPlan } = useTrips()
  const [tripStart, setTripStart] = React.useState<Date | undefined>(undefined)
  const [tripEnd, setTripEnd] = React.useState<Date | undefined>(undefined)
  const [tripStartOpen, setTripStartOpen] = React.useState(false)
  const [tripEndOpen, setTripEndOpen] = React.useState(false)
  const [initialFuelLevel, setInitialFuelLevel] = React.useState(100)
  const [truckId, setTruckId] = React.useState("")
  const [tankSize, setTankSize] = React.useState("")
  const [mpg, setMpg] = React.useState("")
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [waypoints, setWaypoints] = React.useState<string[]>([])
  const [calculated, setCalculated] = React.useState(false)
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [routeCoordinates, setRouteCoordinates] = React.useState<LngLat[]>([])
  const [routeLoading, setRouteLoading] = React.useState(false)
  const [openSections, setOpenSections] = React.useState<("where" | "when" | "who")[]>(["where"])
  const [planStops, setPlanStops] = React.useState<TripPlanStop[]>([])
  const [planSummary, setPlanSummary] = React.useState<TripPlanSummary | null>(null)

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

  // Fetch OSRM route when both coords exist (same API as mapcn example; long routes can take 30–60s)
  React.useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRouteCoordinates([])
      setRouteLoading(false)
      return
    }

    const fallback = () => setRouteCoordinates([originCoords, destinationCoords])
    const controller = new AbortController()
    const timeoutMs = 60_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    setRouteLoading(true)
    fetch(OSRM_ROUTE_URL(originCoords, destinationCoords), { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates
          if (Array.isArray(coords) && coords.length >= 2) {
            setRouteCoordinates(coords)
            return
          }
        }
        fallback()
      })
      .catch(() => fallback())
      .finally(() => {
        clearTimeout(timeoutId)
        setRouteLoading(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [originCoords, destinationCoords])

  // Load trip by tripId from URL (e.g. from Trips page "Edit")
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
    setRouteCoordinates(plan.routeCoordinates)
    setPlanStops(plan.stops)
    setPlanSummary(plan.summary)
    setCalculated(true)
  }, [tripIdParam, getTripPlan])

  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      setIsOptimizing(false)
      if (origin?.trim() && destination?.trim() && truckId) {
        setCalculated(true)
        const coords = sampleRouteForStops(routeCoordinates, mockRouteStops.length)
        setPlanStops(
          mockRouteStops.map((stop, i) => ({
            ...stop,
            lat: coords[i]?.[1] ?? 0,
            lng: coords[i]?.[0] ?? 0,
          }))
        )
        setPlanSummary(mockRouteSummary)
      }
    }, 4000)
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

  // Auto-advance to next accordion when current section BECOMES complete (not when user reopens a completed section)
  const whereComplete =
    Boolean(origin.trim()) &&
    Boolean(destination.trim()) &&
    !originGeocodeError &&
    !destinationGeocodeError
  const whenComplete = tripStart != null && tripEnd != null

  const prevWhereComplete = React.useRef(whereComplete)
  const prevWhenComplete = React.useRef(whenComplete)

  React.useEffect(() => {
    if (openSections.includes("where") && whereComplete && !prevWhereComplete.current) {
      prevWhereComplete.current = true
      setOpenSections((prev) => (prev.includes("when") ? prev : [...prev, "when"]))
    } else if (openSections.includes("when") && whenComplete && !prevWhenComplete.current) {
      prevWhenComplete.current = true
      setOpenSections((prev) => (prev.includes("who") ? prev : [...prev, "who"]))
    }
    prevWhereComplete.current = whereComplete
    prevWhenComplete.current = whenComplete
  }, [openSections, whereComplete, whenComplete])

  const fuelStopCoords = React.useMemo((): LngLat[] => {
    if (!calculated || routeCoordinates.length < 2) return []
    if (planStops.length > 0 && planStops.every((s) => "lat" in s && "lng" in s)) {
      return planStops.map((s) => [s.lng, s.lat])
    }
    return sampleRouteForStops(routeCoordinates, (planStops.length ? planStops : mockRouteStops).length)
  }, [calculated, routeCoordinates, planStops])
  const displayStops = planStops.length ? planStops : mockRouteStops
  const displaySummary = planSummary ?? mockRouteSummary

  const handleSaveTrip = () => {
    const start = tripStart?.toISOString?.() ?? ""
    const end = tripEnd?.toISOString?.() ?? ""
    if (!start || !end || !planSummary) return
    addTripPlan({
      name: `${origin} → ${destination}`,
      origin,
      destination,
      waypoints,
      tripStart: start,
      tripEnd: end,
      truckId,
      stops: planStops.length ? planStops : mockRouteStops.map((s, i) => ({
        ...s,
        lat: fuelStopCoords[i]?.[1] ?? 0,
        lng: fuelStopCoords[i]?.[0] ?? 0,
      })),
      summary: planSummary,
      routeCoordinates,
    })
    toast.success("Trip saved. View it in Trips.")
  }

  return (
    <div
      className="relative flex flex-col-reverse flex-1 min-h-0 gap-0 overflow-y-auto p-0 md:overflow-visible md:flex-row"
      style={{
        height: "100%",
        maxHeight: "calc(100dvh - var(--header-height, 3rem))",
      }}
    >
      {/* Left panel: form 1/3 */}
      <aside
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-r-0 border-border bg-background md:max-w-md md:w-1/3 md:flex-shrink-0 md:border-r"
        aria-label="Route details"
      >
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {calculated ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 justify-start gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setCalculated(false)}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <h2 className="text-lg font-semibold">
                Trip plan
              </h2>
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1 self-stretch">
                  <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                  {displayStops.map((_, i) => (
                    <React.Fragment key={i}>
                      <div className="w-px flex-1 min-h-4 border-l border-dashed border-border" />
                      <Fuel className="size-4 shrink-0 text-primary" aria-hidden />
                    </React.Fragment>
                  ))}
                  <div className="w-px flex-1 min-h-4 border-l border-dashed border-border" />
                  <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                </div>
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                    <p className="text-xs font-medium truncate">{origin || "Starting location"}</p>
                  </div>
                  {displayStops.map((stop, i) => {
                    const costAtStop = stop.pricePerGallon * stop.refuelGallons
                    return (
                      <div key={i}>
                        <p className="text-xs font-medium text-muted-foreground">Stop {i + 1}: {stop.station}</p>
                        <p className="text-xs font-medium truncate">{stop.location}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Estimated fuel at stop: {stop.fuelPct}% · ${costAtStop.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stop.distanceFromPrev} mi from previous · ETA {stop.eta}
                        </p>
                      </div>
                    )
                  })}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Destination</p>
                    <p className="text-xs font-medium truncate">{destination || "Ending location"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                <p className="font-medium text-foreground">
                  Total estimated fuel cost: ${displaySummary.totalCost.toLocaleString()}
                </p>
                <p className="text-[var(--success)]">
                  Savings vs alternative routes: ${displaySummary.savingsVsAlternate}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  className="w-full gap-2"
                  onClick={handleSaveTrip}
                >
                  Save trip
                </Button>
              </div>
            </div>
          ) : (
          <FieldGroup className="gap-4">
            <h2 className="text-lg font-semibold">Optimize fuel purchases</h2>
            <p className="text-xs font-medium text-muted-foreground">
              Trip location information
            </p>
            <Accordion
              multiple
              className="w-full -space-y-px rounded-lg border"
              value={openSections}
              onValueChange={(v) => {
                const arr = Array.isArray(v) ? v : []
                setOpenSections(
                  arr.filter(
                    (x): x is "where" | "when" | "who" =>
                      x === "where" || x === "when" || x === "who"
                  )
                )
              }}
            >
              <AccordionItem
                value="where"
                className="overflow-hidden border-0 border-b border-border bg-background first:rounded-t-lg last:rounded-b-lg last:border-b-0"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  Where?
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="flex flex-col gap-3 pt-1">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                        <div className="w-px flex-1 border-l border-dashed border-border" />
                        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        <Field>
                          <FieldLabel className="sr-only">Starting location</FieldLabel>
                          <div className="relative">
                            <Input
                              placeholder="Starting location"
                              value={origin}
                              onChange={(e) => setOrigin(e.target.value)}
                              aria-invalid={originGeocodeError}
                            />
                            {originGeocodeLoading && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </span>
                            )}
                          </div>
                          {originGeocodeError && origin.trim() && (
                            <p className="mt-1 text-xs text-destructive">Could not find location</p>
                          )}
                        </Field>
                        {waypoints.map((_, i) => (
                          <Field key={i} className="group/waypoint">
                            <FieldLabel className="sr-only">Waypoint {i + 1}</FieldLabel>
                            <div className="relative">
                              <Input
                                placeholder={`Waypoint ${i + 1}`}
                                value={waypoints[i]}
                                onChange={(e) => {
                                  const next = [...waypoints]
                                  next[i] = e.target.value
                                  setWaypoints(next)
                                }}
                                className="pr-9"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-0 group-hover/waypoint:opacity-100 text-muted-foreground hover:text-destructive focus:opacity-100"
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
                            <Input
                              placeholder="Ending location"
                              value={destination}
                              onChange={(e) => setDestination(e.target.value)}
                              aria-invalid={destinationGeocodeError}
                            />
                            {destinationGeocodeLoading && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </span>
                            )}
                          </div>
                          {destinationGeocodeError && destination.trim() && (
                            <p className="mt-1 text-xs text-destructive">Could not find location</p>
                          )}
                        </Field>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addWaypoint}>
                      <Plus className="size-4" />
                      Add waypoint
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="when"
                className="overflow-hidden border-0 border-b border-border bg-background first:rounded-t-lg last:rounded-b-lg last:border-b-0"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  When?
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="flex flex-col gap-3 pt-1">
                    <Field>
                      <FieldLabel>Trip start</FieldLabel>
                      <Popover open={tripStartOpen} onOpenChange={setTripStartOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              className={cn(
                                "min-w-0 w-full justify-start truncate text-left font-normal",
                                !tripStart && "text-muted-foreground"
                              )}
                            >
                              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="mr-2 size-4 shrink-0" />
                              <span className="min-w-0 truncate">
                                {tripStart ? format(tripStart, "MMM d, yyyy") : "Pick date"}
                              </span>
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tripStart}
                            onSelect={(date) => {
                              setTripStart(date)
                              setTripStartOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field>
                      <FieldLabel>Trip end</FieldLabel>
                      <Popover open={tripEndOpen} onOpenChange={setTripEndOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              className={cn(
                                "min-w-0 w-full justify-start truncate text-left font-normal",
                                !tripEnd && "text-muted-foreground"
                              )}
                            >
                              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="mr-2 size-4 shrink-0" />
                              <span className="min-w-0 truncate">
                                {tripEnd ? format(tripEnd, "MMM d, yyyy") : "Pick date"}
                              </span>
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tripEnd}
                            onSelect={(date) => {
                              setTripEnd(date)
                              setTripEndOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="who"
                className="overflow-hidden border-0 border-b border-border bg-background first:rounded-t-lg last:rounded-b-lg last:border-b-0"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  Who?
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="flex flex-col gap-4 pt-1">
                    <Field>
                      <FieldLabel>Select truck</FieldLabel>
                      <Select value={truckId} onValueChange={(v) => setTruckId(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                        <SelectContent>
                          {trucks.slice(0, 20).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.id} · {t.driverName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Initial fuel tank level
                      </p>
                      <div className="flex items-center gap-2">
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
                        <FieldLabel>Tank size</FieldLabel>
                        <Input
                          type="number"
                          placeholder="e.g. 120"
                          value={tankSize}
                          onChange={(e) => setTankSize(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>MPG</FieldLabel>
                        <Input
                          type="number"
                          placeholder="e.g. 7"
                          value={mpg}
                          onChange={(e) => setMpg(e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button
              onClick={handleOptimize}
              className="w-full"
              disabled={!origin?.trim() || !destination?.trim()}
            >
              Optimize trip
            </Button>
          </FieldGroup>
          )}
        </div>
      </aside>

      {/* Right panel: map ~3/4 (on mobile: on top, fixed height) */}
      <div className="flex h-[26vh] min-h-[160px] shrink-0 flex-col pl-0 md:h-auto md:min-h-0 md:flex-1 md:pl-0">
        <div className="h-full min-h-0 w-full">
          <RouteOptimizerMapDynamic
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={routeCoordinates}
            routeLoading={routeLoading}
            showOptimizingOverlay={isOptimizing}
            fuelStopCoords={fuelStopCoords}
          />
        </div>
      </div>
    </div>
  )
}
