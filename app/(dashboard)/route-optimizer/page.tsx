"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { trucks, driverLeaderboard, mockRouteStops, mockRouteSummary } from "@/lib/mock-data"
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
import { Loader2, MapPin, Plus } from "lucide-react"
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
  const [driverId, setDriverId] = React.useState("")
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
    if (origin && destination && truckId) setCalculated(true)
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

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-row gap-0 p-0"
      style={{
        height: "100%",
        maxHeight: "calc(100dvh - var(--header-height, 3rem) - 2rem)",
      }}
    >
      {/* Left panel: form 1/3 */}
      <aside
        className="flex w-full min-w-0 flex-shrink-0 flex-col border-r border-border bg-background md:w-1/3"
        aria-label="Route details"
      >
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div>
            <h2 className="text-lg font-semibold">Fuel Purchase Optimizer</h2>
          </div>

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
                          "w-full justify-start text-left font-normal",
                          !tripStart && "text-muted-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="mr-2 size-4" />
                        {tripStart ? format(tripStart, "PPP") : "Pick date"}
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
                          "w-full justify-start text-left font-normal",
                          !tripEnd && "text-muted-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="mr-2 size-4" />
                        {tripEnd ? format(tripEnd, "PPP") : "Pick date"}
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
              <p className="text-sm font-medium text-primary">{initialFuelLevel}%</p>
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

            <Field>
              <FieldLabel>Select driver</FieldLabel>
              <Select value={driverId} onValueChange={(v) => setDriverId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {driverLeaderboard.map((d) => (
                    <SelectItem key={d.truckId} value={d.truckId}>
                      {d.driverName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Button onClick={handleOptimize} className="w-full">
              Optimize trip
            </Button>
          </FieldGroup>

          {calculated && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended fuel stops</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockRouteStops.map((stop, i) => (
                      <Card key={i} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs">{stop.station}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                          <p>{stop.location}</p>
                          <p>
                            ${stop.pricePerGallon.toFixed(2)}/gal · {stop.refuelGallons} gal refuel
                          </p>
                          <p>
                            {stop.distanceFromPrev} mi from previous · ETA {stop.eta} · Fuel {stop.fuelPct}%
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Trip summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">Total trip cost (est.):</span>{" "}
                    ${mockRouteSummary.totalCost.toLocaleString()}
                  </p>
                  <p className="text-[var(--success)]">
                    Savings vs alternative routes: ${mockRouteSummary.savingsVsAlternate}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </aside>

      {/* Right panel: map ~3/4 */}
      <div className="flex min-h-0 flex-1 flex-col p-4 pl-0">
        <div className="h-full min-h-0 w-full">
          <RouteOptimizerMapDynamic
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={routeCoordinates}
            routeLoading={routeLoading}
          />
        </div>
      </div>
    </div>
  )
}
