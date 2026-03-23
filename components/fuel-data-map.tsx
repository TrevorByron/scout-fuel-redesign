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
import { ChevronLeft } from "lucide-react"

export type FuelDataMapItem = {
  displayName: string
  slug: string
  locationKey: string
  lat: number
  lng: number
  efficiencyPct: number
  missedSavings: number
}

const EFFICIENCY_COLORS = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
} as const

function efficiencyToColor(pct: number, missedSavings: number): string {
  if (pct < 50 && missedSavings > 0) return EFFICIENCY_COLORS.red
  if (pct < 90) return EFFICIENCY_COLORS.yellow
  return EFFICIENCY_COLORS.green
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

  const centerLng =
    locations.reduce((a, l) => a + l.lng, 0) / locations.length
  const centerLat =
    locations.reduce((a, l) => a + l.lat, 0) / locations.length

  if (selectedLocation) {
    return (
      <FocusedMapView
        locationDisplayName={selectedLocation.displayName}
        locationLat={selectedLocation.lat}
        locationLng={selectedLocation.lng}
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
        center={[centerLng, centerLat]}
        zoom={7}
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
  representativeBetterOption,
  comparison,
  onBack,
}: {
  locationDisplayName: string
  locationLat: number
  locationLng: number
  representativeBetterOption: {
    stationName: string
    location: string
    lat: number
    lng: number
  } | null
  comparison: LocationComparison | null
  onBack: () => void
}) {
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
      [locationLng, locationLat],
      [representativeBetterOption.lng, representativeBetterOption.lat],
    ])
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${locationLng},${locationLat};${representativeBetterOption.lng},${representativeBetterOption.lat}?overview=full&geometries=geojson`,
      { signal: ac.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        const coords = data.routes?.[0]?.geometry?.coordinates as
          | [number, number][]
          | undefined
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
        if (nearStart && nearEnd) setRouteCoords(coords)
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

  if (!mounted) return null

  const centerLng = representativeBetterOption
    ? (locationLng + representativeBetterOption.lng) / 2
    : locationLng
  const centerLat = representativeBetterOption
    ? (locationLat + representativeBetterOption.lat) / 2
    : locationLat

  const locationLabel =
    representativeBetterOption
      ? `${locationDisplayName} — actual`
      : locationDisplayName

  return (
    <div className="relative h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={[centerLng, centerLat]}
        zoom={12}
      >
        <FitToSelected
          lat={locationLat}
          lng={locationLng}
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
