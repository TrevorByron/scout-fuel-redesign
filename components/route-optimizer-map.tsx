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

const DEFAULT_CENTER: [number, number] = [-98.5, 39.5] // US center
const DEFAULT_ZOOM = 4
const SINGLE_POINT_ZOOM = 12
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

function FitRouteBounds({
  originCoords,
  destinationCoords,
  routeCoordinates,
}: {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  routeCoordinates: LngLat[]
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

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 48, maxZoom: 13, duration: FLY_DURATION_MS }
    )
  }, [map, isLoaded, originCoords, destinationCoords, routeCoordinates])

  return null
}

export type RouteOptimizerMapProps = {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  routeCoordinates: LngLat[]
  routeLoading?: boolean
  showOptimizingOverlay?: boolean
  fuelStopCoords?: LngLat[]
}

/** MapLibre paint properties need literal colors; CSS variables are not resolved */
const ROUTE_LINE_COLOR = "#2563eb"

export function RouteOptimizerMap({
  originCoords,
  destinationCoords,
  routeCoordinates,
  routeLoading = false,
  showOptimizingOverlay = false,
  fuelStopCoords = [],
}: RouteOptimizerMapProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasRoute = routeCoordinates.length >= 2

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
        className="h-full w-full rounded-none"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        styles={{
          light: "https://tiles.openfreemap.org/styles/bright",
          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        }}
      >
        {originCoords && !destinationCoords && (
          <FitSinglePoint coords={originCoords} />
        )}
        {destinationCoords && !originCoords && (
          <FitSinglePoint coords={destinationCoords} />
        )}
        {originCoords && destinationCoords && (
          <FitRouteBounds
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            routeCoordinates={routeCoordinates.length >= 2 ? routeCoordinates : []}
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
        {hasRoute && (
          <MapRoute
            coordinates={routeCoordinates}
            color={ROUTE_LINE_COLOR}
            width={4}
            opacity={0.9}
          />
        )}
        {routeLoading && !hasRoute && originCoords && destinationCoords && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 pointer-events-none">
            <span className="text-xs text-muted-foreground">Loading route…</span>
          </div>
        )}
        {showOptimizingOverlay && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/70 pointer-events-none">
            <p className="text-sm font-medium text-foreground animate-pulse">Optimizing your trip</p>
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
        <MapControls showZoom showLocate position="bottom-right" />
      </Map>
    </div>
  )
}
