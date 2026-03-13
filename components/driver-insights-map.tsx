"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Map,
  MapClusterLayer,
  MapControls,
  useMap,
} from "@/components/ui/map"
import type { FuelTransaction } from "@/lib/mock-data"
import { BetterOptionDetails } from "@/components/fuel-transaction-table"
import { X } from "lucide-react"
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

function FitBounds({ transactions }: { transactions: FuelTransaction[] }) {
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

/** Renders popup content in a portal when a clustered point is clicked. Must be used inside Map. */
function ClusterPointPopup({
  transaction,
  onClose,
}: {
  transaction: FuelTransaction | null
  onClose: () => void
}) {
  const { map, isLoaded } = useMap()
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null)
  const offset = 16

  const updatePosition = React.useCallback(() => {
    if (!map || !transaction) return
    const point = map.project([transaction.lng, transaction.lat])
    const rect = map.getContainer().getBoundingClientRect()
    setPosition({
      x: rect.left + point.x,
      y: rect.top + point.y + offset,
    })
  }, [map, transaction])

  React.useEffect(() => {
    if (!isLoaded || !map || !transaction) {
      setPosition(null)
      return
    }
    updatePosition()
    map.on("move", updatePosition)
    map.on("moveend", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      map.off("move", updatePosition)
      map.off("moveend", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [isLoaded, map, transaction, updatePosition])

  if (!transaction || !position) return null

  const waste = getWaste(transaction)
  const popupContent = (
    <div
      className={cn(
        "relative rounded-md border bg-popover p-3 text-popover-foreground shadow-md text-xs"
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-1 right-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Close popup"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {waste > 0 && transaction.betterOption ? (
        <BetterOptionDetails
          option={transaction.betterOption}
          transaction={transaction}
        />
      ) : (
        <div className="min-w-[200px]">
          <div className="font-medium">
            {new Date(transaction.dateTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="mt-1 text-muted-foreground">
            {transaction.location} · {transaction.stationBrand}
          </div>
          <div className="mt-1">
            {transaction.gallons} gal · $
            {transaction.pricePerGallon.toFixed(2)}/gal · $
            {transaction.totalCost.toFixed(2)}
          </div>
          <div className="mt-1 text-[var(--success)]">Optimal</div>
        </div>
      )}
    </div>
  )

  return createPortal(
    <div
      className="fixed z-[10001]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, 0)",
      }}
    >
      {popupContent}
    </div>,
    document.body
  )
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

  const geoData = React.useMemo(
    () => transactionsToGeoJSON(transactions),
    [transactions]
  )

  const handlePointClick = React.useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, { id: string; color: string }>,
      _coordinates: [number, number]
    ) => {
      const id = feature.properties?.id
      if (!id) return
      const t = transactions.find((x) => x.id === id)
      if (t) {
        onSelectTransaction(t)
        setPopupTransaction(t)
      }
    },
    [transactions, onSelectTransaction]
  )

  const handleClosePopup = React.useCallback(() => {
    setPopupTransaction(null)
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
    <div className="h-full min-h-0 w-full rounded-lg border border-border">
      <Map
        className="h-full w-full min-h-[200px] rounded-lg"
        center={[centerLng, centerLat]}
        zoom={6}
        popupPortalToBody
      >
        <FitBounds transactions={transactions} />
        <MapControls showCompass showZoom position="top-right" />
        <MapClusterLayer
          data={geoData}
          clusterMaxZoom={14}
          clusterRadius={50}
          clusterColors={["#22c55e", "#eab308", "#ef4444"]}
          clusterThresholds={[3, 10]}
          pointColorProperty="color"
          onPointClick={handlePointClick}
        />
        <ClusterPointPopup
          transaction={popupTransaction}
          onClose={handleClosePopup}
        />
      </Map>
    </div>
  )
}
