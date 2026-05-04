"use client"

import * as React from "react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MapRoute,
  MapControls,
  useMap,
} from "@/components/ui/map"
import { MAP_US_CENTER, MAP_US_ZOOM } from "@/lib/map-us-defaults"
import { mapPaint } from "@/lib/map-paint-colors"
import { Loader2 } from "lucide-react"
const SINGLE_POINT_ZOOM = 13
const FLY_DURATION_MS = 600

type LngLat = [number, number]

function FitSinglePoint({ coords }: { coords: LngLat }) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    map.resize()
    map.flyTo({
      center: coords,
      zoom: SINGLE_POINT_ZOOM,
      duration: FLY_DURATION_MS,
    })
  }, [map, isLoaded, coords[0], coords[1]])

  return null
}

const DEFAULT_PADDING = 100

function FitRouteBounds({
  originCoords,
  destinationCoords,
  routeCoordinates,
  fuelStopCoords = [],
  extraBoundsCoords = [],
  mapLeftPadding = 0,
  mapBottomPadding = 0,
}: {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  routeCoordinates: LngLat[]
  fuelStopCoords?: LngLat[]
  /** Unioned into fitBounds (insight pair, actual refuel dots, etc.). */
  extraBoundsCoords?: LngLat[]
  mapLeftPadding?: number
  mapBottomPadding?: number
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    if (!originCoords || !destinationCoords) return

    map.resize()

    let minLng = Math.min(originCoords[0], destinationCoords[0])
    let maxLng = Math.max(originCoords[0], destinationCoords[0])
    let minLat = Math.min(originCoords[1], destinationCoords[1])
    let maxLat = Math.max(originCoords[1], destinationCoords[1])

    if (routeCoordinates.length >= 2) {
      for (const [lng, lat] of routeCoordinates) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }

    for (const [lng, lat] of fuelStopCoords) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    for (const [lng, lat] of extraBoundsCoords) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: {
          left: mapLeftPadding,
          right: DEFAULT_PADDING,
          top: DEFAULT_PADDING,
          bottom: Math.max(DEFAULT_PADDING, mapBottomPadding),
        },
        maxZoom: 12,
        duration: FLY_DURATION_MS,
      }
    )
  }, [
    map,
    isLoaded,
    originCoords,
    destinationCoords,
    routeCoordinates,
    fuelStopCoords,
    extraBoundsCoords,
    mapLeftPadding,
    mapBottomPadding,
  ])

  return null
}

/** Zoom/fit when user selects a fuel stop on the Trips sheet (actual+optimized pair or single point). */
export type StopSelectionMapFocus =
  | { kind: "pair"; a: LngLat; b: LngLat }
  | { kind: "point"; center: LngLat; zoom?: number }

function FitStopSelectionFocus({
  focus,
  mapLeftPadding,
  mapBottomPadding,
}: {
  focus: StopSelectionMapFocus
  mapLeftPadding: number
  mapBottomPadding: number
}) {
  const { map, isLoaded } = useMap()

  const focusKey = React.useMemo(() => {
    if (focus.kind === "pair") {
      return `pair:${focus.a[0]},${focus.a[1]},${focus.b[0]},${focus.b[1]}`
    }
    return `point:${focus.center[0]},${focus.center[1]},${focus.zoom ?? 11.5}`
  }, [focus])

  React.useEffect(() => {
    if (!isLoaded || !map) return
    map.resize()

    if (focus.kind === "pair") {
      const [lng1, lat1] = focus.a
      const [lng2, lat2] = focus.b
      const minLng = Math.min(lng1, lng2)
      const maxLng = Math.max(lng1, lng2)
      const minLat = Math.min(lat1, lat2)
      const maxLat = Math.max(lat1, lat2)
      const lngSpan = maxLng - minLng
      const latSpan = maxLat - minLat
      if (lngSpan < 1e-5 && latSpan < 1e-5) {
        map.flyTo({
          center: focus.a,
          zoom: 12,
          duration: FLY_DURATION_MS,
        })
        return
      }
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: {
            left: mapLeftPadding,
            right: 80,
            top: 80,
            bottom: Math.max(80, mapBottomPadding),
          },
          maxZoom: 13,
          duration: FLY_DURATION_MS,
        }
      )
      return
    }

    map.flyTo({
      center: focus.center,
      zoom: focus.zoom ?? 11.5,
      duration: FLY_DURATION_MS,
    })
  }, [map, isLoaded, focusKey, mapLeftPadding, mapBottomPadding, focus])

  return null
}

export type RouteOptimizerMapProps = {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  routeCoordinates: LngLat[]
  routeLoading?: boolean
  fuelStopCoords?: LngLat[]
  /** Left padding in px for fitBounds (e.g. sidebar width) so route stays visible. */
  mapLeftPadding?: number
  /** Bottom padding in px for fitBounds (e.g. form height on mobile) so route fits in visible area above form. */
  mapBottomPadding?: number
  /** Optional alternative polylines; selected index renders on top. */
  routeAlternatives?: LngLat[][]
  selectedRouteIndex?: number
  onSelectRoute?: (index: number) => void
  /** e.g. duration/distance route chips — bottom-right, below zoom/locate controls. */
  routeSwitcher?: React.ReactNode
  /** Trips: actual purchase vs optimized alternative (driver/location insights pattern). */
  insightFocus?: {
    actual: LngLat
    optimized: LngLat
    routePolyline: LngLat[] | null
    loading?: boolean
    stopIndex: number
  } | null
  /** Trips: all matched actual refuel locations (green = on plan, red = paid more). */
  tripActualRefuels?: Array<{
    coords: LngLat
    outcome: "optimal" | "inefficient"
    stopIndex: number
  }>
  /** Trips: select stop from map marker tap (syncs with sheet + insight card). */
  onTripActualRefuelClick?: (stopIndex: number) => void
  /** Trips: zoom map when user selects a stop in the sheet (overrides full-route fit until cleared). */
  stopSelectionFocus?: StopSelectionMapFocus | null
  /** Trips: selected-stop ActualVsOptimizedCard, stacked under the map legend (top-right). */
  tripStopInsightCard?: React.ReactNode
}

/** MapLibre paint properties need literal colors; CSS variables are not resolved */
const ROUTE_LINE_SELECTED = mapPaint.routeSelected
const ROUTE_LINE_ALT = mapPaint.routeAlt
const INSIGHT_CONNECTOR_COLOR = mapPaint.connector
const ACTUAL_OPTIMAL_HEX = mapPaint.success

export function RouteOptimizerMap({
  originCoords,
  destinationCoords,
  routeCoordinates,
  routeLoading = false,
  fuelStopCoords = [],
  mapLeftPadding = 0,
  mapBottomPadding = 0,
  routeAlternatives,
  selectedRouteIndex = 0,
  onSelectRoute,
  routeSwitcher,
  insightFocus = null,
  tripActualRefuels,
  stopSelectionFocus = null,
  tripStopInsightCard,
  onTripActualRefuelClick,
}: RouteOptimizerMapProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasRoute = routeCoordinates.length >= 2

  const extraFitBoundsCoords = React.useMemo((): LngLat[] => {
    const fromInsight = insightFocus ? [insightFocus.actual, insightFocus.optimized] : []
    const fromActuals = (tripActualRefuels ?? []).map((r) => r.coords)
    return [...fromInsight, ...fromActuals]
  }, [insightFocus, tripActualRefuels])

  const alternatives = React.useMemo(() => {
    if (routeAlternatives && routeAlternatives.length > 0) return routeAlternatives
    if (routeCoordinates.length >= 2) return [routeCoordinates]
    return [] as LngLat[][]
  }, [routeAlternatives, routeCoordinates])

  const routeDrawOrder = React.useMemo(() => {
    const n = alternatives.length
    if (n < 2) return [...Array(n).keys()]
    return [...Array(n).keys()].sort((a, b) => {
      if (a === selectedRouteIndex) return 1
      if (b === selectedRouteIndex) return -1
      return 0
    })
  }, [alternatives, selectedRouteIndex])

  if (!mounted) {
    return (
      <div
        className="flex h-full min-h-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground"
        aria-label="Route map"
      >
        Loading map…
      </div>
    )
  }

  return (
    <div
      className="box-content h-full min-h-0 w-full rounded-none overflow-hidden"
      aria-label="Route map"
    >
      <Map
        className="h-full w-full min-h-[160px] rounded-none"
        center={MAP_US_CENTER}
        zoom={MAP_US_ZOOM}
      >
        {originCoords && !destinationCoords && (
          <FitSinglePoint coords={originCoords} />
        )}
        {destinationCoords && !originCoords && (
          <FitSinglePoint coords={destinationCoords} />
        )}
        {originCoords && destinationCoords && hasRoute && !stopSelectionFocus && (
          <FitRouteBounds
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={routeCoordinates}
            fuelStopCoords={fuelStopCoords}
            extraBoundsCoords={extraFitBoundsCoords}
            mapLeftPadding={mapLeftPadding}
            mapBottomPadding={mapBottomPadding}
          />
        )}
        {stopSelectionFocus ? (
          <FitStopSelectionFocus
            focus={stopSelectionFocus}
            mapLeftPadding={mapLeftPadding}
            mapBottomPadding={mapBottomPadding}
          />
        ) : null}
        {originCoords && (
          <MapMarker longitude={originCoords[0]} latitude={originCoords[1]}>
            <MarkerContent>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: "var(--chart-2)" }}
                aria-hidden
              >
                <span className="text-[var(--text-2xs)] font-bold text-primary-foreground">
                  A
                </span>
              </div>
            </MarkerContent>
          </MapMarker>
        )}
        {destinationCoords && (
          <MapMarker
            longitude={destinationCoords[0]}
            latitude={destinationCoords[1]}
          >
            <MarkerContent>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: "var(--destructive)" }}
                aria-hidden
              >
                <span className="text-[var(--text-2xs)] font-bold text-primary-foreground">
                  B
                </span>
              </div>
            </MarkerContent>
          </MapMarker>
        )}
        {hasRoute &&
          routeDrawOrder.map((i) => {
            const coords = alternatives[i]
            if (!coords || coords.length < 2) return null
            const isSelected =
              alternatives.length < 2 || i === selectedRouteIndex
            return (
              <MapRoute
                key={`route-opt-${i}`}
                id={`route-opt-${i}`}
                coordinates={coords}
                color={isSelected ? ROUTE_LINE_SELECTED : ROUTE_LINE_ALT}
                width={isSelected ? 5 : 4}
                opacity={isSelected ? 0.95 : 0.55}
                interactive={Boolean(onSelectRoute) && alternatives.length > 1}
                onClick={
                  onSelectRoute && alternatives.length > 1
                    ? () => onSelectRoute(i)
                    : undefined
                }
              />
            )
          })}
        {insightFocus &&
          insightFocus.routePolyline &&
          insightFocus.routePolyline.length >= 2 && (
            <MapRoute
              id="trip-insight-connector"
              coordinates={insightFocus.routePolyline}
              color={INSIGHT_CONNECTOR_COLOR}
              width={4}
              opacity={0.9}
            />
          )}
        {routeLoading && !hasRoute && originCoords && destinationCoords && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/50 pointer-events-none">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}
        {fuelStopCoords.map((coords, i) => (
          <MapMarker key={i} longitude={coords[0]} latitude={coords[1]}>
            <MarkerContent>
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: "var(--chart-3)" }}
                aria-hidden
              >
                <span className="text-[var(--text-2xs-sm)] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
        {(tripActualRefuels ?? [])
          .filter(
            (r) =>
              !(
                insightFocus &&
                r.stopIndex === insightFocus.stopIndex
              )
          )
          .map((r) => (
            <MapMarker
              key={`actual-refuel-${r.stopIndex}`}
              longitude={r.coords[0]}
              latitude={r.coords[1]}
              onClick={() => onTripActualRefuelClick?.(r.stopIndex)}
            >
              <MarkerContent>
                <div
                  className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center touch-manipulation"
                  aria-label={
                    r.outcome === "optimal"
                      ? "On-plan refuel, open details"
                      : "Paid more at this refuel, open details"
                  }
                >
                  <div
                    className="size-3.5 shrink-0 rounded-full border-2 border-background shadow-md"
                    style={{
                      backgroundColor:
                        r.outcome === "optimal" ? ACTUAL_OPTIMAL_HEX : "var(--destructive)",
                    }}
                    aria-hidden
                  />
                </div>
              </MarkerContent>
            </MapMarker>
          ))}
        {insightFocus && (
          <>
            <MapMarker
              longitude={insightFocus.actual[0]}
              latitude={insightFocus.actual[1]}
              onClick={() => onTripActualRefuelClick?.(insightFocus.stopIndex)}
            >
              <MarkerContent>
                <div
                  className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center touch-manipulation"
                  aria-label="Actual purchase, open details"
                >
                  <div
                    className="size-4 rounded-full border-2 border-background shadow-md bg-destructive"
                    aria-hidden
                  />
                </div>
              </MarkerContent>
            </MapMarker>
            <MapMarker
              longitude={insightFocus.optimized[0]}
              latitude={insightFocus.optimized[1]}
              onClick={() => onTripActualRefuelClick?.(insightFocus.stopIndex)}
            >
              <MarkerContent>
                <div
                  className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center touch-manipulation"
                  aria-label="Optimized alternative, open details"
                >
                  <div
                    className="size-4 rounded-full border-2 border-background shadow-md"
                    style={{ backgroundColor: "var(--chart-2)" }}
                    aria-hidden
                  />
                </div>
              </MarkerContent>
            </MapMarker>
          </>
        )}
        {insightFocus ||
        (tripActualRefuels?.length ?? 0) > 0 ||
        tripStopInsightCard ? (
          <div className="pointer-events-none absolute right-3 top-3 z-20 flex w-full max-w-[min(100%-1.5rem,20rem)] flex-col items-end gap-2">
            {insightFocus ? (
              <div className="flex max-w-full flex-col gap-1.5 rounded-md border border-border bg-card/90 px-2 py-1.5 text-[length:var(--text-2xs)] font-medium text-muted-foreground shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full bg-destructive" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--chart-2)" }}
                    />
                    Optimized
                  </span>
                </div>
                {insightFocus.loading ? (
                  <span className="flex items-center gap-1.5 font-normal text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
                    Routing…
                  </span>
                ) : null}
              </div>
            ) : (tripActualRefuels?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-card/90 px-2 py-1.5 text-[length:var(--text-2xs)] font-medium text-muted-foreground shadow-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ACTUAL_OPTIMAL_HEX }}
                    />
                    On plan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 shrink-0 rounded-full bg-destructive" />
                    Paid more
                  </span>
                </span>
              </div>
            ) : null}
            {tripStopInsightCard ? (
              <div className="pointer-events-auto w-full max-h-[min(42vh,340px)] overflow-y-auto rounded-lg border border-border bg-card/95 p-3 text-xs shadow-md backdrop-blur-sm">
                {tripStopInsightCard}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-10 right-2 z-20 flex max-w-[min(100%-1rem,20rem)] flex-col-reverse items-end gap-2 sm:bottom-6">
          {routeSwitcher ? (
            <div className="pointer-events-auto flex w-full flex-col gap-2 items-end">
              {routeSwitcher}
            </div>
          ) : null}
          <div className="pointer-events-auto max-md:hidden">
            <MapControls
              showZoom
              showLocate
              position="inline"
            />
          </div>
        </div>
      </Map>
    </div>
  )
}
