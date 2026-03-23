"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Map,
  MapClusterLayer,
  MapControls,
  useMap,
} from "@/components/ui/map"

export type LocationMapItem = {
  displayName: string
  slug: string
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

/** Red only when efficiency is low and there is a better option (missed savings). */
function efficiencyToColor(pct: number, missedSavings: number): string {
  if (pct < 50 && missedSavings > 0) return EFFICIENCY_COLORS.red
  if (pct < 90) return EFFICIENCY_COLORS.yellow
  return EFFICIENCY_COLORS.green
}

function locationsToGeoJSON(locations: LocationMapItem[]) {
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
        efficiencyPct: loc.efficiencyPct,
        color: efficiencyToColor(loc.efficiencyPct, loc.missedSavings),
      },
    })),
  }
}

function FitBounds({ locations }: { locations: LocationMapItem[] }) {
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

type LocationInsightsMapProps = {
  locations: LocationMapItem[]
}

export function LocationInsightsMap({ locations }: LocationInsightsMapProps) {
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const geoData = React.useMemo(
    () => locationsToGeoJSON(locations),
    [locations]
  )

  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<
        GeoJSON.Point,
        { slug?: string; displayName?: string; efficiencyPct?: number }
      >,
      _coordinates: [number, number]
    ) => {
      const slug = feature.properties?.slug
      if (slug) router.push(`/locations/${slug}`)
    },
    [router]
  )

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
