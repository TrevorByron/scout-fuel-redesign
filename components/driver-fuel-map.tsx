"use client"

import * as React from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import type { FuelTransaction } from "@/lib/mock-data"
import "leaflet/dist/leaflet.css"

export function DriverFuelMap({ transactions }: { transactions: FuelTransaction[] }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
    // Fix default marker icons in Next.js/bundled env
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    })
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        Loading map…
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        No fuel-ups in this range
      </div>
    )
  }

  const allLats = transactions.flatMap((t) => (t.betterOption ? [t.lat, t.betterOption.lat] : [t.lat]))
  const allLngs = transactions.flatMap((t) => (t.betterOption ? [t.lng, t.betterOption.lng] : [t.lng]))
  const centerLat = allLats.reduce((a, b) => a + b, 0) / allLats.length
  const centerLng = allLngs.reduce((a, b) => a + b, 0) / allLngs.length
  const center: [number, number] = [centerLat, centerLng]

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="h-[300px] w-full rounded-lg border"
      style={{ minHeight: 300 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {transactions.map((t) => (
        <React.Fragment key={t.id}>
          <Marker position={[t.lat, t.lng]}>
            <Popup>
              <div className="text-xs">
                <div className="font-medium">{new Date(t.dateTime).toLocaleDateString()}</div>
                <div>{t.location} · {t.stationBrand}</div>
                <div>You paid ${t.totalCost.toFixed(2)} (${t.pricePerGallon.toFixed(2)}/gal)</div>
                {t.betterOption ? (
                  <div className="mt-1 text-destructive">
                    Could have saved ${t.betterOption.potentialSavings.toFixed(2)} at {t.betterOption.stationName}
                  </div>
                ) : (
                  <div className="mt-1 text-[var(--success)]">Best buy</div>
                )}
              </div>
            </Popup>
          </Marker>
          {t.betterOption && (
            <Marker position={[t.betterOption.lat, t.betterOption.lng]}>
              <Popup>
                <div className="text-xs">
                  <div className="font-medium text-[var(--success)]">Better option</div>
                  <div>{t.betterOption.stationName}</div>
                  <div>${t.betterOption.pricePerGallon.toFixed(2)}/gal · {t.betterOption.distanceMiles} mi away</div>
                  <div>Could have saved ${t.betterOption.potentialSavings.toFixed(2)}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </React.Fragment>
      ))}
    </MapContainer>
  )
}
