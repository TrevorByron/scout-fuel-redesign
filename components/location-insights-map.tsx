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
  compliancePct: number
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
        compliancePct: loc.compliancePct,
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

  const pointColorStep = React.useMemo(
    () => ({
      property: "compliancePct" as const,
      defaultColor: "#ef4444",
      stops: [
        [50, "#eab308"],
        [90, "#22c55e"],
      ] as [number, string][],
    }),
    []
  )

  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<
        GeoJSON.Point,
        { slug?: string; displayName?: string; compliancePct?: number }
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
        zoom={5}
        popupPortalToBody
      >
        <FitBounds locations={locations} />
        <MapControls showCompass showZoom position="top-right" />
        <MapClusterLayer
          data={geoData}
          cluster={false}
          pointColorStep={pointColorStep}
          onPointClick={handlePointClick}
        />
      </Map>
    </div>
  )
}
