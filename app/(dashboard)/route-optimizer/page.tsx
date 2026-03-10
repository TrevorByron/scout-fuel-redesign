"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { trucks, mockRouteStops, mockRouteSummary } from "@/lib/mock-data"
import { geocodeAddress } from "@/lib/geocode"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Loader2, MapPin, Plus, ChevronLeft } from "lucide-react"
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

type LngLat = [number, number]

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
  const [tripStart, setTripStart] = React.useState<Date | undefined>(undefined)
  const [tripEnd, setTripEnd] = React.useState<Date | undefined>(undefined)
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

  // Fetch OSRM route when both coords exist
  React.useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRouteCoordinates([])
      return
    }

    setRouteLoading(true)
    fetch(OSRM_ROUTE_URL(originCoords, destinationCoords))
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setRouteCoordinates(data.routes[0].geometry.coordinates)
        } else {
          setRouteCoordinates([originCoords, destinationCoords])
        }
      })
      .catch(() => {
        setRouteCoordinates([originCoords, destinationCoords])
      })
      .finally(() => setRouteLoading(false))
  }, [originCoords, destinationCoords])

  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      setIsOptimizing(false)
      if (origin?.trim() && destination?.trim() && truckId) {
        setCalculated(true)
      }
    }, 4000)
  }

  const addWaypoint = () => {
    setWaypoints((w) => [...w, ""])
  }

  const selectedTruck = trucks.find((t) => t.id === truckId)

  React.useEffect(() => {
    if (!selectedTruck) return
    setInitialFuelLevel(selectedTruck.fuelLevel)
    setMpg(String(selectedTruck.avgMpg))
    setTankSize("120")
  }, [selectedTruck?.id])

  const fuelStopCoords = React.useMemo(() => {
    if (!calculated || routeCoordinates.length < 2) return []
    return sampleRouteForStops(routeCoordinates, mockRouteStops.length)
  }, [calculated, routeCoordinates])

  return (
    <div
      className="relative flex flex-col-reverse flex-1 min-h-0 gap-0 overflow-y-auto p-0 md:overflow-visible md:flex-row"
      style={{
        height: "100%",
        maxHeight: "calc(100dvh - var(--header-height, 3rem) - 2rem)",
      }}
    >
      {/* Left panel: form 1/3 */}
      <aside
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-r-0 border-border bg-background md:w-1/3 md:flex-shrink-0 md:border-r"
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
              <p className="text-xs font-medium text-muted-foreground">
                Trip plan
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium">{origin || "Starting location"}</p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Refuel stops</p>
                {mockRouteStops.map((stop, i) => {
                  const costAtStop = stop.pricePerGallon * stop.refuelGallons
                  return (
                    <Card key={i} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">
                          Stop {i + 1}: {stop.station}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground">
                        <p>{stop.location}</p>
                        <p>Estimated fuel at stop: {stop.fuelPct}%</p>
                        <p>Estimated cost at stop: ${costAtStop.toFixed(2)}</p>
                        <p>
                          {stop.distanceFromPrev} mi from previous · ETA {stop.eta}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                <p className="font-medium text-foreground">
                  Total estimated fuel cost: ${mockRouteSummary.totalCost.toLocaleString()}
                </p>
                <p className="text-[var(--success)]">
                  Savings vs alternative routes: ${mockRouteSummary.savingsVsAlternate}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCalculated(false)}
              >
                Plan another trip
              </Button>
            </div>
          ) : (
          <FieldGroup className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Trip location information
              </p>
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
                    <Field key={i}>
                      <FieldLabel className="sr-only">Waypoint {i + 1}</FieldLabel>
                      <Input
                        placeholder={`Waypoint ${i + 1}`}
                        value={waypoints[i]}
                        onChange={(e) => {
                          const next = [...waypoints]
                          next[i] = e.target.value
                          setWaypoints(next)
                        }}
                      />
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

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Trip start</FieldLabel>
                <Popover>
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
                    <Calendar mode="single" selected={tripStart} onSelect={setTripStart} initialFocus />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel>Trip end</FieldLabel>
                <Popover>
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
                    <Calendar mode="single" selected={tripEnd} onSelect={setTripEnd} initialFocus />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

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
      <div className="flex h-[26vh] min-h-[160px] shrink-0 flex-col p-4 md:h-auto md:min-h-0 md:flex-1 md:pl-0">
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
