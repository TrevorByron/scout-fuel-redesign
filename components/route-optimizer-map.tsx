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
  mapLeftPadding = 0,
  mapBottomPadding = 0,
}: {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  routeCoordinates: LngLat[]
  fuelStopCoords?: LngLat[]
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
  }, [map, isLoaded, originCoords, destinationCoords, routeCoordinates, fuelStopCoords, mapLeftPadding, mapBottomPadding])

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
}

/** MapLibre paint properties need literal colors; CSS variables are not resolved */
const ROUTE_LINE_SELECTED = "#2563eb"
const ROUTE_LINE_ALT = "#94a3b8"

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
}: RouteOptimizerMapProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasRoute = routeCoordinates.length >= 2

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
        {originCoords && destinationCoords && hasRoute && (
          <FitRouteBounds
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={routeCoordinates}
            fuelStopCoords={fuelStopCoords}
            mapLeftPadding={mapLeftPadding}
            mapBottomPadding={mapBottomPadding}
          />
        )}
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
        <MapControls
          showZoom
          showLocate
          position="bottom-right"
          className="max-md:hidden"
        />
      </Map>
    </div>
  )
}
