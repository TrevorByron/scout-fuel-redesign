"use client"

import * as React from "react"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapRoute,
  useMap,
} from "@/components/ui/map"
import {
  ActualVsOptimizedCard,
  transactionToComparison,
  type LocationComparison,
} from "@/components/actual-vs-optimized-card"
import {
  getRepresentativeBetterOption,
  getLocationKey,
} from "@/lib/location-utils"
import type { FuelTransaction } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { MAP_US_CENTER, MAP_US_ZOOM } from "@/lib/map-us-defaults"
import { fetchDrivingRoutes, pickDrivingRoutePolyline } from "@/lib/osrm-route"
import { ChevronLeft } from "lucide-react"
import { mapPaint } from "@/lib/map-paint-colors"

export type FuelDataMapItem = {
  displayName: string
  slug: string
  locationKey: string
  lat: number
  lng: number
  efficiencyPct: number
  missedSavings: number
}

function efficiencyToColor(pct: number, missedSavings: number): string {
  if (pct < 50 && missedSavings > 0) return mapPaint.destructive
  if (pct < 90) return mapPaint.warning
  return mapPaint.success
}

function locationsToGeoJSON(locations: FuelDataMapItem[]) {
  return {
    type: "FeatureCollection" as const,
    features: locations.map((loc) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [loc.lng, loc.lat] as [number, number],
      },
      properties: {
        slug: loc.slug,
        displayName: loc.displayName,
        locationKey: loc.locationKey,
        efficiencyPct: loc.efficiencyPct,
        color: efficiencyToColor(loc.efficiencyPct, loc.missedSavings),
      },
    })),
  }
}

function FitBounds({ locations }: { locations: { lat: number; lng: number }[] }) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map || locations.length === 0) return
    const lngs = locations.map((l) => l.lng)
    const lats = locations.map((l) => l.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 48, maxZoom: 12 }
    )
  }, [map, isLoaded, locations])

  return null
}

function FitToSelected({
  lat,
  lng,
  betterOption,
}: {
  lat: number
  lng: number
  betterOption: { lat: number; lng: number } | null
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    const lngs = betterOption ? [lng, betterOption.lng] : [lng]
    const lats = betterOption ? [lat, betterOption.lat] : [lat]
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
  }, [map, isLoaded, lat, lng, betterOption])

  return null
}

type FuelDataMapProps = {
  locations: FuelDataMapItem[]
  transactions: FuelTransaction[]
}

export function FuelDataMap({ locations, transactions }: FuelDataMapProps) {
  const [mounted, setMounted] = React.useState(false)
  const [selectedLocationKey, setSelectedLocationKey] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const selectedLocation = React.useMemo(
    () =>
      selectedLocationKey
        ? locations.find((l) => l.locationKey === selectedLocationKey)
        : null,
    [locations, selectedLocationKey]
  )

  const selectedTxns = React.useMemo(() => {
    if (!selectedLocationKey) return []
    return transactions.filter(
      (t) => getLocationKey(t.stationBrand, t.location) === selectedLocationKey
    )
  }, [transactions, selectedLocationKey])

  const representativeBetterOption = React.useMemo(
    () => getRepresentativeBetterOption(selectedTxns),
    [selectedTxns]
  )

  const representativeTransaction = React.useMemo(() => {
    const withOpt = selectedTxns.filter((t) => t.betterOption != null)
    if (withOpt.length === 0) return null
    const opt = representativeBetterOption
    if (!opt) return null
    const match = withOpt.find(
      (t) =>
        t.betterOption!.stationName === opt.stationName &&
        t.betterOption!.location === opt.location
    )
    return match ?? withOpt[0]
  }, [selectedTxns, representativeBetterOption])

  const comparison: LocationComparison | null = React.useMemo(
    () =>
      representativeTransaction
        ? transactionToComparison(representativeTransaction)
        : null,
    [representativeTransaction]
  )

  const geoData = React.useMemo(
    () => locationsToGeoJSON(locations),
    [locations]
  )

  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<
        GeoJSON.Point,
        {
          slug?: string
          displayName?: string
          locationKey?: string
          efficiencyPct?: number
        }
      >,
      _coordinates: [number, number]
    ) => {
      const key = feature.properties?.locationKey
      if (key) setSelectedLocationKey(key)
    },
    []
  )

  const handleBack = React.useCallback(() => {
    setSelectedLocationKey(null)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground text-xs">
        Loading map…
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground text-xs">
        No locations in range
      </div>
    )
  }

  if (selectedLocation) {
    return (
      <FocusedMapView
        locationDisplayName={selectedLocation.displayName}
        locationLat={selectedLocation.lat}
        locationLng={selectedLocation.lng}
        representativeTransaction={representativeTransaction}
        representativeBetterOption={representativeBetterOption}
        comparison={comparison}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={MAP_US_CENTER}
        zoom={MAP_US_ZOOM}
        popupPortalToBody
      >
        <FitBounds locations={locations} />
        <MapControls showCompass showZoom position="top-right" />
        <MapClusterLayer
          data={geoData}
          cluster={false}
          pointColorProperty="color"
          onPointClick={handlePointClick}
        />
      </Map>
    </div>
  )
}

function FocusedMapView({
  locationDisplayName,
  locationLat,
  locationLng,
  representativeTransaction,
  representativeBetterOption,
  comparison,
  onBack,
}: {
  locationDisplayName: string
  locationLat: number
  locationLng: number
  representativeTransaction: FuelTransaction | null
  representativeBetterOption: {
    stationName: string
    location: string
    lat: number
    lng: number
  } | null
  comparison: LocationComparison | null
  onBack: () => void
}) {
  const actualLat = representativeTransaction?.lat ?? locationLat
  const actualLng = representativeTransaction?.lng ?? locationLng
  const [mounted, setMounted] = React.useState(false)
  const [routeCoords, setRouteCoords] = React.useState<
    [number, number][] | null
  >(null)

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
      [actualLng, actualLat],
      [representativeBetterOption.lng, representativeBetterOption.lat],
    ])
    fetchDrivingRoutes(
      [actualLng, actualLat],
      [representativeBetterOption.lng, representativeBetterOption.lat],
      { signal: ac.signal }
    )
      .then((routes) => {
        const poly = pickDrivingRoutePolyline(routes)
        if (poly) setRouteCoords(poly as [number, number][])
      })
      .catch(() => {})
    return () => ac.abort()
  }, [
    actualLng,
    actualLat,
    representativeBetterOption?.lng,
    representativeBetterOption?.lat,
    representativeBetterOption,
  ])

  if (!mounted) return null

  const locationLabel =
    representativeBetterOption
      ? `${locationDisplayName} — actual`
      : locationDisplayName

  return (
    <div className="relative h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={MAP_US_CENTER}
        zoom={MAP_US_ZOOM}
      >
        <FitToSelected
          lat={actualLat}
          lng={actualLng}
          betterOption={representativeBetterOption}
        />
        <MapControls showCompass showZoom position="top-right" />

        {representativeBetterOption &&
          routeCoords &&
          routeCoords.length >= 2 && (
            <MapRoute
              coordinates={routeCoords}
              color="#6366f1"
              width={3}
              opacity={0.85}
            />
          )}

        <MapMarker longitude={actualLng} latitude={actualLat}>
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

      <Button
        variant="secondary"
        size="sm"
        className="absolute top-2 left-2 z-10 gap-1.5 shadow-md"
        onClick={onBack}
      >
        <ChevronLeft className="size-4" />
        Show all locations
      </Button>

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
