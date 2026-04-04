"use client"

import * as React from "react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapRoute,
  MapControls,
  useMap,
} from "@/components/ui/map"
import {
  ActualVsOptimizedCard,
  type LocationComparison,
} from "@/components/actual-vs-optimized-card"
import { MAP_US_CENTER, MAP_US_ZOOM } from "@/lib/map-us-defaults"
import { fetchDrivingRoutes } from "@/lib/osrm-route"

export type RepresentativeBetterOption = {
  stationName: string
  location: string
  lat: number
  lng: number
}

export type { LocationComparison }

type LocationDetailMapProps = {
  /** This location's display name (chain + city). */
  locationDisplayName: string
  /** Center of the location (e.g. first transaction's coords). */
  locationLat: number
  locationLng: number
  /** Average $ lost per fill-up outside optimized locations at this location. */
  avgMissedSavingsPerBadStop: number
  /** Most frequent better option from transactions, or null. */
  representativeBetterOption: RepresentativeBetterOption | null
  /** Representative actual vs optimized comparison for the overlay, or null. */
  comparison?: LocationComparison | null
}

function FitBounds({
  locationLat,
  locationLng,
  betterOption,
}: {
  locationLat: number
  locationLng: number
  betterOption: RepresentativeBetterOption | null
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    const lngs = betterOption
      ? [locationLng, betterOption.lng]
      : [locationLng]
    const lats = betterOption
      ? [locationLat, betterOption.lat]
      : [locationLat]
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, maxZoom: 12 }
    )
  }, [map, isLoaded, locationLat, locationLng, betterOption])

  return null
}

export function LocationDetailMap({
  locationDisplayName,
  locationLat,
  locationLng,
  avgMissedSavingsPerBadStop,
  representativeBetterOption,
  comparison,
}: LocationDetailMapProps) {
  const [mounted, setMounted] = React.useState(false)
  const [routeCoords, setRouteCoords] = React.useState<[number, number][] | null>(
    null
  )

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!representativeBetterOption) {
      setRouteCoords(null)
      return
    }
    const ac = new AbortController()
    setRouteCoords([
      [locationLng, locationLat],
      [representativeBetterOption.lng, representativeBetterOption.lat],
    ])
    fetchDrivingRoutes(
      [locationLng, locationLat],
      [representativeBetterOption.lng, representativeBetterOption.lat],
      { signal: ac.signal }
    )
      .then((routes) => {
        const coords = routes[0]?.coordinates
        if (!coords || coords.length < 2) return
        const first = coords[0]
        const last = coords[coords.length - 1]
        const tol = 2
        const nearStart =
          Math.abs(first[0] - locationLng) < tol &&
          Math.abs(first[1] - locationLat) < tol
        const nearEnd =
          Math.abs(last[0] - representativeBetterOption.lng) < tol &&
          Math.abs(last[1] - representativeBetterOption.lat) < tol
        if (nearStart && nearEnd) setRouteCoords(coords as [number, number][])
      })
      .catch(() => {})
    return () => ac.abort()
  }, [
    locationLng,
    locationLat,
    representativeBetterOption?.lng,
    representativeBetterOption?.lat,
    representativeBetterOption,
  ])

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground text-xs">
        Loading map…
      </div>
    )
  }

  const locationLabel =
    avgMissedSavingsPerBadStop > 0
      ? `${locationDisplayName} — Avg $${avgMissedSavingsPerBadStop.toLocaleString("en-US", { maximumFractionDigits: 0 })} lost/fill-up`
      : `${locationDisplayName}`

  return (
    <div className="relative h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={MAP_US_CENTER}
        zoom={MAP_US_ZOOM}
      >
        <FitBounds
          locationLat={locationLat}
          locationLng={locationLng}
          betterOption={representativeBetterOption}
        />
        <MapControls showCompass showZoom position="top-right" />

        {representativeBetterOption && routeCoords && routeCoords.length >= 2 && (
          <MapRoute
            coordinates={routeCoords}
            color="#6366f1"
            width={3}
            opacity={0.85}
          />
        )}

        <MapMarker longitude={locationLng} latitude={locationLat}>
          <MarkerContent>
            <div className="size-4 rounded-full bg-destructive ring-2 ring-background shadow-md" />
          </MarkerContent>
          <MarkerLabel position="bottom">
            <span className="rounded bg-background/90 px-1.5 py-0.5 text-[var(--text-2xs)] font-medium shadow-sm border border-border">
              {locationLabel}
            </span>
          </MarkerLabel>
        </MapMarker>

        {representativeBetterOption && (
          <MapMarker
            longitude={representativeBetterOption.lng}
            latitude={representativeBetterOption.lat}
          >
            <MarkerContent>
              <div
                className="size-4 rounded-full ring-2 ring-background shadow-md"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
            </MarkerContent>
            <MarkerLabel position="bottom">
              <span className="rounded bg-background/90 px-1.5 py-0.5 text-[var(--text-2xs)] font-medium shadow-sm border border-border">
                {representativeBetterOption.stationName} — better option
              </span>
            </MarkerLabel>
          </MapMarker>
        )}
      </Map>
      {comparison && (
        <ActualVsOptimizedCard
          variant="comparison"
          comparison={comparison}
          position="bottom"
        />
      )}
    </div>
  )
}
