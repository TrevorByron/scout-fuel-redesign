"use client"

import * as React from "react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  useMap,
} from "@/components/ui/map"
import type { Truck } from "@/lib/mock-data"

const STATUS_COLOR_VAR: Record<string, string> = {
  "On Route": "var(--chart-2)",
  Refueling: "var(--primary)",
  Idle: "var(--chart-4)",
  "Low Fuel": "var(--destructive)",
  "Off Route": "var(--muted-foreground)",
}

function getStatusColor(truck: Truck): string {
  return STATUS_COLOR_VAR[truck.status] ?? "var(--muted-foreground)"
}

function FitBounds({ trucks }: { trucks: Truck[] }) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map || trucks.length === 0) return

    const lngs = trucks.map((t) => t.lng)
    const lats = trucks.map((t) => t.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const padding = 40
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: { top: padding, bottom: padding, left: padding, right: padding }, maxZoom: 12 }
    )
  }, [map, isLoaded, trucks])

  return null
}

export function FleetMap({ trucks }: { trucks: Truck[] }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground md:min-h-[60vh]">
        Loading map…
      </div>
    )
  }

  if (trucks.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground md:min-h-[60vh]">
        No trucks to show
      </div>
    )
  }

  const centerLng = trucks.reduce((a, t) => a + t.lng, 0) / trucks.length
  const centerLat = trucks.reduce((a, t) => a + t.lat, 0) / trucks.length

  return (
    <div className="h-full min-h-[50vh] w-full rounded-lg border border-border md:min-h-[60vh]">
      <Map
        className="h-full w-full rounded-lg"
        center={[centerLng, centerLat]}
        zoom={5}
      >
        <FitBounds trucks={trucks} />
        {trucks.map((truck) => (
          <MapMarker
            key={truck.id}
            longitude={truck.lng}
            latitude={truck.lat}
          >
            <MarkerContent>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[var(--text-2xs)] font-bold text-primary-foreground shadow-sm"
                style={{ backgroundColor: getStatusColor(truck) }}
              >
                {truck.id.replace("T", "")}
              </div>
            </MarkerContent>
            <MarkerPopup closeButton>
              <div className="min-w-[160px] text-xs">
                <div className="font-semibold">
                  {truck.id} · {truck.driverName}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Status: {truck.status}
                </div>
                <div>Fuel: {truck.fuelLevel}%</div>
                <div>Next: {truck.nextStop}</div>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
        <MapControls showZoom showLocate position="bottom-right" />
      </Map>
    </div>
  )
}
