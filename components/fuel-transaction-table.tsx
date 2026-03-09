"use client"

import * as React from "react"
import type { FuelTransaction, BetterOption } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Map, MapMarker, MarkerContent, MarkerLabel, MapRoute, useMap } from "@/components/ui/map"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const SAVINGS_THRESHOLD = 1

export function getEfficiencyStatus(t: FuelTransaction): "efficient" | "needs_attention" {
  const hasMeaningfulBetterOption =
    t.betterOption != null && t.betterOption.potentialSavings > SAVINGS_THRESHOLD
  const outOfNetworkWithRecommendation = !t.inNetwork && hasMeaningfulBetterOption
  if (t.alert || outOfNetworkWithRecommendation) return "needs_attention"
  return "efficient"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function FitTwoPoints({
  lat1, lng1, lat2, lng2,
}: { lat1: number; lng1: number; lat2: number; lng2: number }) {
  const { map, isLoaded } = useMap()
  React.useEffect(() => {
    if (!isLoaded || !map) return
    map.resize()
    const minLng = Math.min(lng1, lng2)
    const maxLng = Math.max(lng1, lng2)
    const minLat = Math.min(lat1, lat2)
    const maxLat = Math.max(lat1, lat2)
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 48, maxZoom: 13, duration: 0 }
    )
  }, [map, isLoaded, lat1, lng1, lat2, lng2])
  return null
}

function BetterOptionDetails({
  option,
  transaction,
}: {
  option: BetterOption
  transaction: Pick<FuelTransaction, "lat" | "lng" | "stationBrand" | "location">
}) {
  const [mounted, setMounted] = React.useState(false)
  const [routeCoords, setRouteCoords] = React.useState<[number, number][]>([
    [transaction.lng, transaction.lat],
    [option.lng, option.lat],
  ])
  const [routeLoading, setRouteLoading] = React.useState(true)

  React.useEffect(() => { setMounted(true) }, [])

  React.useEffect(() => {
    setRouteLoading(true)
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${transaction.lng},${transaction.lat};${option.lng},${option.lat}?overview=full&geometries=geojson`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]) {
          setRouteCoords(data.routes[0].geometry.coordinates)
        }
      })
      .catch(() => { /* keep straight-line fallback */ })
      .finally(() => setRouteLoading(false))
  }, [transaction.lng, transaction.lat, option.lng, option.lat])

  const midLng = (transaction.lng + option.lng) / 2
  const midLat = (transaction.lat + option.lat) / 2

  return (
    <div className="flex flex-col min-w-[380px] text-xs">
      <div className="relative h-[240px] w-full overflow-hidden rounded-t-md border-b border-border">
        {mounted ? (
          <Map className="h-full w-full" center={[midLng, midLat]} zoom={10}>
            <FitTwoPoints
              lat1={transaction.lat}
              lng1={transaction.lng}
              lat2={option.lat}
              lng2={option.lng}
            />
            <MapRoute
              coordinates={routeCoords}
              color="#6366f1"
              width={3}
              opacity={0.85}
            />
            <MapMarker longitude={transaction.lng} latitude={transaction.lat}>
              <MarkerContent>
                <div className="size-4 rounded-full bg-destructive ring-2 ring-background shadow-md" />
              </MarkerContent>
              <MarkerLabel position="bottom">
                <span className="rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-medium shadow-sm">
                  {transaction.stationBrand}
                </span>
              </MarkerLabel>
            </MapMarker>
            <MapMarker longitude={option.lng} latitude={option.lat}>
              <MarkerContent>
                <div
                  className="size-4 rounded-full ring-2 ring-background shadow-md"
                  style={{ backgroundColor: "var(--chart-2)" }}
                />
              </MarkerContent>
              <MarkerLabel position="bottom">
                <span className="rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-medium shadow-sm">
                  {option.stationName}
                </span>
              </MarkerLabel>
            </MapMarker>
          </Map>
        ) : (
          <div className="h-full animate-pulse bg-muted/30" />
        )}
        {mounted && routeLoading && (
          <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
            <div className="rounded bg-background/70 p-1">
              <svg className="size-3.5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 px-3 pb-1.5 pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-destructive" />
          Filled up (out of network)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
          In-network option
        </span>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="text-[10px] font-medium text-muted-foreground">Recommended in-network option</div>
        <div className="font-medium text-foreground">{option.stationName}</div>
        <div className="text-muted-foreground">{option.location}</div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price/gal</span>
          <span>${option.pricePerGallon.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Distance</span>
          <span>{option.distanceMiles} mi</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1 font-medium text-chart-2">
          <span>Savings at in-network station</span>
          <span>${option.potentialSavings.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export function FuelTransactionTable({
  transactions,
  maxRows = 50,
}: {
  transactions: FuelTransaction[]
  maxRows?: number
}) {
  const rows = transactions.slice(0, maxRows)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date/Time</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Truck</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Station</TableHead>
          <TableHead className="text-right">Gallons</TableHead>
          <TableHead className="text-right">Price/Gal</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Network</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const status = getEfficiencyStatus(t)
          const hasBetterOption = status === "needs_attention" && !!t.betterOption
          return (
            <TableRow
              key={t.id}
              className={cn(status === "needs_attention" && "bg-destructive/10")}
            >
              <TableCell className="whitespace-nowrap">{formatDate(t.dateTime)}</TableCell>
              <TableCell>{t.driverName}</TableCell>
              <TableCell>{t.truckId}</TableCell>
              <TableCell>{t.location}</TableCell>
              <TableCell>{t.stationBrand}</TableCell>
              <TableCell className="text-right">{t.gallons}</TableCell>
              <TableCell className="text-right">${t.pricePerGallon.toFixed(2)}</TableCell>
              <TableCell className="text-right">${t.totalCost.toFixed(2)}</TableCell>
              <TableCell>
                {t.inNetwork ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-chart-2/30 bg-chart-2/10 text-chart-2 text-[0.625rem]"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3" />
                    In Network
                  </Badge>
                ) : hasBetterOption ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="cursor-pointer border-0 bg-transparent p-0 outline-none [&>span]:cursor-pointer">
                      <Badge
                        variant="destructive"
                        className="cursor-pointer gap-1 text-[0.625rem]"
                        title="Recommended in-network option available"
                      >
                        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3" />
                        Out of Network
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="bottom" className="w-auto p-0">
                      <BetterOptionDetails option={t.betterOption!} transaction={t} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[0.625rem] border-muted-foreground/20 bg-muted text-muted-foreground"
                  >
                    Out of Network
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {hasBetterOption ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="cursor-pointer border-0 bg-transparent p-0 outline-none [&>span]:cursor-pointer">
                      <Badge
                        variant="secondary"
                        className="cursor-pointer font-mono tabular-nums text-[0.625rem] border-destructive/30 bg-destructive/10 text-destructive"
                      >
                        {t.variance >= 0 ? "+" : ""}${t.variance.toFixed(2)}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" className="w-auto p-0">
                      <BetterOptionDetails option={t.betterOption!} transaction={t} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono tabular-nums text-[0.625rem]",
                      status === "needs_attention"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-muted-foreground/20 bg-muted text-muted-foreground"
                    )}
                  >
                    {t.variance >= 0 ? "+" : ""}${t.variance.toFixed(2)}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {t.alert ? (
                  <Badge variant="destructive" className="text-[0.625rem]">
                    Overspend
                  </Badge>
                ) : null}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
