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
import type { FuelTransaction } from "@/lib/mock-data"
import {
  ActualVsOptimizedCard,
  transactionToComparison,
} from "@/components/actual-vs-optimized-card"
import { cn } from "@/lib/utils"

function getWaste(t: FuelTransaction): number {
  return t.betterOption?.potentialSavings ?? 0
}

function getMarkerColor(t: FuelTransaction): string {
  const waste = getWaste(t)
  // MapLibre paint doesn't resolve CSS variables; use hex so unclustered points show green/red
  if (waste <= 0) return "#22c55e" // green (success)
  return "#ef4444" // red (destructive)
}

function transactionsToGeoJSON(transactions: FuelTransaction[]) {
  return {
    type: "FeatureCollection" as const,
    features: transactions.map((t) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [t.lng, t.lat] as [number, number],
      },
      properties: {
        id: t.id,
        color: getMarkerColor(t),
      },
    })),
  }
}

function FitBoundsAll({ transactions }: { transactions: FuelTransaction[] }) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map || transactions.length === 0) return

    const lngs = transactions.flatMap((t) =>
      t.betterOption ? [t.lng, t.betterOption.lng] : [t.lng]
    )
    const lats = transactions.flatMap((t) =>
      t.betterOption ? [t.lat, t.betterOption.lat] : [t.lat]
    )
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
  }, [map, isLoaded, transactions])

  return null
}

function FitBoundsFocused({
  transaction,
}: {
  transaction: FuelTransaction
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return

    const opt = transaction.betterOption
    const lngs = opt ? [transaction.lng, opt.lng] : [transaction.lng]
    const lats = opt ? [transaction.lat, opt.lat] : [transaction.lat]
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
  }, [map, isLoaded, transaction])

  return null
}

/** When focused, clicking the map background (no feature under cursor) clears selection. */
function MapClickDeselect({
  isFocused,
  onDeselect,
}: {
  isFocused: boolean
  onDeselect: () => void
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map || !isFocused) return

    const handleClick = (e: { point: { x: number; y: number } }) => {
      const features = map.queryRenderedFeatures(e.point)
      if (features.length === 0) onDeselect()
    }

    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [map, isLoaded, isFocused, onDeselect])

  return null
}

type DriverInsightsMapProps = {
  transactions: FuelTransaction[]
  selectedTransactionId: string | null
  onSelectTransaction: (t: FuelTransaction | null) => void
}

export function DriverInsightsMap({
  transactions,
  selectedTransactionId,
  onSelectTransaction,
}: DriverInsightsMapProps) {
  const [mounted, setMounted] = React.useState(false)
  const [popupTransaction, setPopupTransaction] =
    React.useState<FuelTransaction | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (selectedTransactionId == null) {
      setPopupTransaction(null)
      return
    }
    const t = transactions.find((x) => x.id === selectedTransactionId)
    setPopupTransaction(t ?? null)
  }, [selectedTransactionId, transactions])

  const isFocused = popupTransaction != null

  const geoData = React.useMemo(
    () =>
      transactionsToGeoJSON(
        isFocused && popupTransaction
          ? [popupTransaction]
          : transactions
      ),
    [transactions, isFocused, popupTransaction]
  )

  const [routeCoords, setRouteCoords] = React.useState<
    [number, number][] | null
  >(null)

  React.useEffect(() => {
    if (!popupTransaction?.betterOption) {
      setRouteCoords(null)
      return
    }
    const opt = popupTransaction.betterOption
    const ac = new AbortController()
    setRouteCoords([
      [popupTransaction.lng, popupTransaction.lat],
      [opt.lng, opt.lat],
    ])
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${popupTransaction.lng},${popupTransaction.lat};${opt.lng},${opt.lat}?overview=full&geometries=geojson`,
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
          Math.abs(first[0] - popupTransaction.lng) < tol &&
          Math.abs(first[1] - popupTransaction.lat) < tol
        const nearEnd =
          Math.abs(last[0] - opt.lng) < tol &&
          Math.abs(last[1] - opt.lat) < tol
        if (nearStart && nearEnd) setRouteCoords(coords)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [
    popupTransaction?.id,
    popupTransaction?.lng,
    popupTransaction?.lat,
    popupTransaction?.betterOption,
  ])

  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, { id: string; color: string }>,
      _coordinates: [number, number]
    ) => {
      const id = feature.properties?.id
      if (!id) return
      if (id === selectedTransactionId) {
        onSelectTransaction(null)
        return
      }
      const t = transactions.find((x) => x.id === id)
      if (t) {
        onSelectTransaction(t)
        setPopupTransaction(t)
      }
    },
    [transactions, selectedTransactionId, onSelectTransaction]
  )

  const handleDeselect = React.useCallback(() => {
    onSelectTransaction(null)
  }, [onSelectTransaction])

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground text-xs">
        Loading map…
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground text-xs">
        No transactions in range
      </div>
    )
  }

  const centerLng =
    transactions.reduce((a, t) => a + t.lng, 0) / transactions.length
  const centerLat =
    transactions.reduce((a, t) => a + t.lat, 0) / transactions.length

  return (
    <div className="relative h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={[centerLng, centerLat]}
        zoom={6}
        popupPortalToBody
      >
        {isFocused && popupTransaction ? (
          <FitBoundsFocused transaction={popupTransaction} />
        ) : (
          <FitBoundsAll transactions={transactions} />
        )}
        <MapControls showCompass showZoom position="top-right" />
        {!isFocused && (
          <MapClusterLayer
            data={geoData}
            cluster={false}
            pointColorProperty="color"
            onPointClick={handlePointClick}
          />
        )}
        {isFocused && popupTransaction && (
          <>
            <MapClickDeselect isFocused onDeselect={handleDeselect} />
            {popupTransaction.betterOption && routeCoords && routeCoords.length >= 2 && (
              <MapRoute
                coordinates={routeCoords}
                color="#6366f1"
                width={3}
                opacity={0.85}
              />
            )}
            <MapMarker
              longitude={popupTransaction.lng}
              latitude={popupTransaction.lat}
              onClick={() => handleDeselect()}
            >
              <MarkerContent>
                <div
                  className={cn(
                    "size-4 rounded-full ring-2 ring-background shadow-md",
                    getWaste(popupTransaction) > 0 ? "bg-destructive" : "bg-[#22c55e]"
                  )}
                />
              </MarkerContent>
              <MarkerLabel position="bottom">
                <span className="rounded bg-background/90 px-1.5 py-0.5 text-[var(--text-2xs)] font-medium shadow-sm border border-border">
                  {popupTransaction.stationBrand} · {popupTransaction.location}
                </span>
              </MarkerLabel>
            </MapMarker>
            {popupTransaction.betterOption && (
              <MapMarker
                longitude={popupTransaction.betterOption.lng}
                latitude={popupTransaction.betterOption.lat}
              >
                <MarkerContent>
                  <div
                    className="size-4 rounded-full ring-2 ring-background shadow-md"
                    style={{ backgroundColor: "var(--chart-2)" }}
                  />
                </MarkerContent>
                <MarkerLabel position="bottom">
                  <span className="rounded bg-background/90 px-1.5 py-0.5 text-[var(--text-2xs)] font-medium shadow-sm border border-border">
                    {popupTransaction.betterOption.stationName} — better option
                  </span>
                </MarkerLabel>
              </MapMarker>
            )}
          </>
        )}
      </Map>
      {isFocused && popupTransaction &&
        (popupTransaction.betterOption ? (
          <ActualVsOptimizedCard
            variant="comparison"
            comparison={transactionToComparison(popupTransaction)!}
            position="bottom-left"
          />
        ) : (
          <ActualVsOptimizedCard
            variant="optimal"
            transaction={popupTransaction}
            position="bottom-left"
          />
        ))}
    </div>
  )
}
