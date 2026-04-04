"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { Loader2, MapPin, Route, X } from "lucide-react"
import { pricingSummaryRows } from "@/lib/mock-data"
import {
  buildAreaPricingStops,
  buildRoutePricingStops,
  lowestPrice,
  sortAreaStopsForDisplay,
} from "@/lib/along-route-stops"
import { fetchDrivingRoutes, type RouteData } from "@/lib/osrm-route"
import type { LngLat } from "@/lib/trips"
import { useDebouncedGeocode } from "@/hooks/use-debounced-geocode"
import { useTouchSheetScrollEnabled } from "@/hooks/use-touch-sheet-scroll-enabled"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { PricingStationListRow } from "@/components/pricing-station-list-row"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { MapSheetLayout } from "@/components/map-sheet-layout"

const PricingRouteMapDynamic = dynamic(
  () =>
    import("@/components/pricing-route-map").then((m) => ({
      default: m.PricingRouteMap,
    })),
  { ssr: false }
)

const METERS_PER_MILE = 1609.344

const RADIUS_MILES_OPTIONS = [10, 25, 50] as const

function dateToKey(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function formatRouteChipSecondary(route: RouteData): string {
  const mi = route.distance / 1609.344
  const sec = route.duration
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const time =
    h > 0 ? `${h} hr ${m} min` : sec > 0 ? `${Math.max(1, m)} min` : "—"
  const dist = mi > 0 ? `${mi.toFixed(0)} mi` : "—"
  return `${time} · ${dist}`
}

export function PricingSummaryUber() {
  const [searchMode, setSearchMode] = React.useState<"route" | "area">("route")
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [areaQuery, setAreaQuery] = React.useState("")
  const [radiusMiles, setRadiusMiles] = React.useState<(typeof RADIUS_MILES_OPTIONS)[number]>(25)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [dateOpen, setDateOpen] = React.useState(false)
  const [routeOptions, setRouteOptions] = React.useState<RouteData[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = React.useState(0)
  const [routeLoading, setRouteLoading] = React.useState(false)
  const [sidebarWidth, setSidebarWidth] = React.useState(0)
  const sidebarRef = React.useRef<HTMLElement>(null)
  const formContentRef = React.useRef<HTMLDivElement>(null)
  const touchSheetScroll = useTouchSheetScrollEnabled()

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

  const {
    coords: areaCoords,
    loading: areaGeocodeLoading,
    error: areaGeocodeError,
  } = useDebouncedGeocode(areaQuery, 500)

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

  React.useEffect(() => {
    if (searchMode !== "route") {
      setRouteOptions([])
      setSelectedRouteIndex(0)
      setRouteLoading(false)
      return
    }
    if (!originCoords || !destinationCoords) {
      setRouteOptions([])
      setSelectedRouteIndex(0)
      setRouteLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    setRouteOptions([])
    setSelectedRouteIndex(0)
    setRouteLoading(true)
    fetchDrivingRoutes(originCoords, destinationCoords, {
      signal: controller.signal,
    })
      .then((routes) => {
        if (!active) return
        if (routes.length > 0) {
          const sorted = [...routes].sort((a, b) => a.duration - b.duration)
          setRouteOptions(sorted)
          setSelectedRouteIndex(0)
        } else {
          setRouteOptions([
            {
              coordinates: [originCoords, destinationCoords],
              duration: 0,
              distance: 0,
            },
          ])
          setSelectedRouteIndex(0)
        }
      })
      .catch(() => {
        if (!active) return
        setRouteOptions([
          {
            coordinates: [originCoords, destinationCoords],
            duration: 0,
            distance: 0,
          },
        ])
        setSelectedRouteIndex(0)
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
  }, [searchMode, originCoords, destinationCoords])

  const routeCoordinates = React.useMemo((): LngLat[] => {
    if (routeOptions.length === 0) return []
    const r = routeOptions[selectedRouteIndex]
    if (r?.coordinates && r.coordinates.length >= 2) return r.coordinates
    return []
  }, [routeOptions, selectedRouteIndex])

  const routeKey = React.useMemo(
    () => `${selectedRouteIndex}-${routeCoordinates.length}`,
    [selectedRouteIndex, routeCoordinates.length]
  )

  const dateFilterKey = selectedDate ? dateToKey(selectedDate) : null

  const routeStops = React.useMemo(() => {
    if (searchMode !== "route") return []
    return buildRoutePricingStops({
      polyline: routeCoordinates,
      routeKey,
      mockRows: pricingSummaryRows,
      dateFilter: dateFilterKey,
    })
  }, [searchMode, routeCoordinates, routeKey, dateFilterKey])

  const areaSearchKey = React.useMemo(() => {
    if (!areaCoords) return ""
    return `area-${Math.round(areaCoords[0] * 1e6)}-${Math.round(areaCoords[1] * 1e6)}-${Math.round(radiusMiles * METERS_PER_MILE)}`
  }, [areaCoords, radiusMiles])

  const areaStopsRaw = React.useMemo(() => {
    if (searchMode !== "area" || !areaCoords) return []
    return buildAreaPricingStops({
      center: areaCoords,
      radiusMeters: radiusMiles * METERS_PER_MILE,
      mockRows: pricingSummaryRows,
      dateFilter: dateFilterKey,
      searchKey: areaSearchKey,
    })
  }, [searchMode, areaCoords, radiusMiles, dateFilterKey, areaSearchKey])

  const areaStops = React.useMemo(
    () => sortAreaStopsForDisplay(areaStopsRaw),
    [areaStopsRaw]
  )

  const stops = searchMode === "area" ? areaStops : routeStops

  const lowest = lowestPrice(stops)

  const clearRoute = () => {
    setOrigin("")
    setDestination("")
    setRouteOptions([])
    setSelectedRouteIndex(0)
  }

  const clearArea = () => {
    setAreaQuery("")
  }

  const hasBothAddresses = Boolean(origin.trim()) && Boolean(destination.trim())
  const canShowRoute =
    searchMode === "route" &&
    originCoords &&
    destinationCoords &&
    !originGeocodeError &&
    !destinationGeocodeError

  const canShowArea =
    searchMode === "area" &&
    Boolean(areaQuery.trim()) &&
    areaCoords &&
    !areaGeocodeError

  const showSummaryChip =
    lowest != null &&
    stops.length > 0 &&
    ((searchMode === "route" && canShowRoute && routeCoordinates.length >= 2) ||
      (searchMode === "area" && canShowArea))

  const onSearchModeChange = (value: string) => {
    const m = value as "route" | "area"
    setSearchMode(m)
    if (m === "route") {
      setAreaQuery("")
      setRadiusMiles(25)
    } else {
      setOrigin("")
      setDestination("")
      setRouteOptions([])
      setSelectedRouteIndex(0)
    }
  }

  const searchModeTabTriggerClass = cn(
    "rounded-md px-3 py-2 text-sm font-medium",
    "text-muted-foreground transition-colors",
    "data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm",
    "dark:data-active:bg-primary dark:data-active:text-primary-foreground",
    "hover:text-foreground data-active:hover:text-primary-foreground"
  )

  const fuelAriaLabel =
    searchMode === "area"
      ? "Find fuel near a location"
      : "Find fuel along route"

  return (
    <MapSheetLayout
      map={
        <PricingRouteMapDynamic
          searchMode={searchMode}
          areaCenterCoords={
            searchMode === "area" && canShowArea ? areaCoords : null
          }
          areaRadiusMeters={
            searchMode === "area" && canShowArea
              ? radiusMiles * METERS_PER_MILE
              : undefined
          }
          originCoords={searchMode === "route" ? originCoords : null}
          destinationCoords={searchMode === "route" ? destinationCoords : null}
          routeCoordinates={canShowRoute ? routeCoordinates : []}
          routeAlternatives={
            canShowRoute && routeOptions.length > 0
              ? routeOptions.map((r) => r.coordinates)
              : []
          }
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          routeLoading={searchMode === "route" ? routeLoading : false}
          stops={
            searchMode === "area" && canShowArea
              ? stops
              : searchMode === "route" &&
                  canShowRoute &&
                  routeCoordinates.length >= 2
                ? stops
                : []
          }
          lowestYourPrice={lowest}
          mapLeftPadding={touchSheetScroll ? 0 : sidebarWidth}
          mapBottomPadding={0}
        />
      }
      overlay={
        showSummaryChip ? (
          <div className="pointer-events-none absolute left-4 right-4 top-3 z-20 flex justify-center sm:left-auto sm:right-6 sm:top-6 sm:justify-end">
            <div
              className="pointer-events-auto flex max-w-[min(100%,320px)] items-center gap-2 rounded-full border border-border bg-card/95 py-2 pl-3 pr-1 shadow-lg backdrop-blur-sm sm:max-w-none sm:gap-3 sm:pl-4 sm:pr-1.5"
              role="status"
              aria-live="polite"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-bold tabular-nums sm:h-10 sm:w-10 sm:text-sm"
                aria-hidden
              >
                {stops.length}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xl font-bold tabular-nums leading-none sm:text-2xl">
                  ${lowest.toFixed(2)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px] font-medium sm:text-xs">
                  Lowest
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:size-9"
                onClick={searchMode === "route" ? clearRoute : clearArea}
                aria-label={
                  searchMode === "route" ? "Clear route" : "Clear location search"
                }
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null
      }
      ariaLabel={fuelAriaLabel}
      sidebarRef={sidebarRef}
      formContentRef={formContentRef}
      cardDataSlot="card"
      cardClassName="rounded-lg bg-card text-card-foreground shadow-md ring-1 ring-foreground/10 max-md:pb-[env(safe-area-inset-bottom,0px)] md:min-h-0 md:max-h-none md:flex-1"
    >
          <header className="shrink-0 border-b border-border p-4">
            <Tabs
              value={searchMode}
              onValueChange={onSearchModeChange}
              className="w-full"
            >
              <TabsList
                className={cn(
                  "grid h-fit w-full grid-cols-2 gap-1 p-1",
                  "group-data-horizontal/tabs:h-fit",
                  "bg-muted/50 text-card-foreground ring-1 ring-border/60"
                )}
              >
                <TabsTrigger value="route" className={searchModeTabTriggerClass}>
                  <Route className="size-4 shrink-0" aria-hidden />
                  Along route
                </TabsTrigger>
                <TabsTrigger value="area" className={searchModeTabTriggerClass}>
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  Near a place
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </header>

          <div className="flex flex-col gap-4 p-4 md:min-h-0 md:flex-1 md:overflow-hidden">
              {searchMode === "route" ? (
                <div className="shrink-0 flex flex-col gap-2">
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
              ) : (
                <div className="shrink-0 flex flex-col gap-3">
                  <Field>
                    <FieldLabel className="sr-only">Location</FieldLabel>
                    <div className="relative">
                      <MapPin
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        placeholder="City, state, or address"
                        value={areaQuery}
                        onChange={(e) => setAreaQuery(e.target.value)}
                        aria-invalid={areaGeocodeError}
                        className="min-h-11 pl-9 sm:min-h-9"
                      />
                      {areaGeocodeLoading ? (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        >
                          <Loader2 className="size-4 animate-spin" />
                        </span>
                      ) : null}
                    </div>
                    {areaGeocodeError && areaQuery.trim() ? (
                      <p className="mt-1 text-xs text-destructive">
                        Could not find location. Try a different search.
                      </p>
                    ) : null}
                  </Field>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Search radius</Label>
                    <div
                      className="flex flex-wrap gap-2"
                      role="radiogroup"
                      aria-label="Search radius in miles"
                    >
                      {RADIUS_MILES_OPTIONS.map((mi) => (
                        <button
                          key={mi}
                          type="button"
                          role="radio"
                          aria-checked={radiusMiles === mi}
                          onClick={() => setRadiusMiles(mi)}
                          className={cn(
                            "min-h-11 min-w-[4.5rem] rounded-lg border px-3 text-xs font-medium transition-colors sm:min-h-9",
                            radiusMiles === mi
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-border bg-card/80 text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          {mi} mi
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {searchMode === "route" && routeOptions.length > 1 ? (
                <div className="shrink-0 flex flex-col gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Driving route</Label>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      All routes are shown on the map. Tap a line to select it, or pick below.
                    </p>
                  </div>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
                    role="listbox"
                    aria-label="Route options"
                  >
                    {routeOptions.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        aria-selected={i === selectedRouteIndex}
                        onClick={() => setSelectedRouteIndex(i)}
                        className={cn(
                          "min-h-[44px] min-w-[8.5rem] shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                          i === selectedRouteIndex
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card/80 hover:bg-muted/50"
                        )}
                      >
                        <span className="font-semibold text-foreground">
                          Route {i + 1}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground sm:text-[11px]">
                          {formatRouteChipSecondary(r)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="shrink-0 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Mock pricing date (filters network stations)
                </Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="default"
                        className="min-h-11 w-full justify-start text-xs font-normal sm:min-h-9"
                      >
                        <HugeiconsIcon
                          icon={Calendar01Icon}
                          strokeWidth={1.5}
                          className="mr-2 size-4 shrink-0 text-muted-foreground"
                        />
                        {selectedDate
                          ? format(selectedDate, "MM/dd/yyyy")
                          : "All dates"}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        setDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {searchMode === "route" && canShowRoute && routeCoordinates.length >= 2 ? (
                <p className="shrink-0 text-muted-foreground text-sm">
                  {stops.length} station{stops.length === 1 ? "" : "s"} found
                </p>
              ) : searchMode === "route" && hasBothAddresses && !canShowRoute ? (
                <p className="shrink-0 text-muted-foreground text-sm">
                  Enter valid start and end locations to see prices on the map.
                </p>
              ) : searchMode === "area" && canShowArea ? (
                <p className="shrink-0 text-muted-foreground text-sm">
                  {stops.length} station{stops.length === 1 ? "" : "s"} in {radiusMiles}{" "}
                  mi — cheapest first
                </p>
              ) : searchMode === "area" && areaQuery.trim() && !canShowArea ? (
                <p className="shrink-0 text-muted-foreground text-sm">
                  Enter a location we can find on the map to see nearby prices.
                </p>
              ) : null}

              {searchMode === "area" && canShowArea && stops.length === 0 ? (
                <p className="shrink-0 text-muted-foreground text-sm">
                  No stations in this radius. Try a larger radius. Mock network rows are
                  densest in the Southeast; elsewhere you may see sample prices only.
                </p>
              ) : null}

              {((searchMode === "route" &&
                canShowRoute &&
                routeCoordinates.length >= 2 &&
                stops.length > 0) ||
                (searchMode === "area" && canShowArea && stops.length > 0)) ? (
                <div className="flex flex-col md:min-h-0 md:flex-1">
                  <ul
                    className={cn(
                      "rounded-lg border border-border bg-card px-2 py-0 shadow-sm",
                      "md:min-h-0 md:flex-1 md:overflow-y-auto"
                    )}
                    aria-label={
                      searchMode === "area"
                        ? "Stations near search"
                        : "Stations along route"
                    }
                  >
                    {stops.slice(0, 24).map((s) => (
                      <PricingStationListRow
                        key={s.id}
                        stop={s}
                        isBestPrice={
                          lowest != null && Math.abs(s.yourPrice - lowest) < 1e-6
                        }
                      />
                    ))}
                    {stops.length > 24 ? (
                      <li className="border-t border-border px-2 py-3 text-muted-foreground text-[11px] sm:text-xs">
                        Zoom the map for more detail — {stops.length - 24} more in this
                        {searchMode === "area" ? " area" : " route"}.
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
          </div>
    </MapSheetLayout>
  )
}
