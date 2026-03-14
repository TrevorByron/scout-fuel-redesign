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
import { Map as MapView, MapMarker, MarkerContent, MarkerLabel, MapRoute, useMap } from "@/components/ui/map"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getEfficiencyStatus } from "@/lib/fuel-transaction-utils"

/** Group key: Chain + Location (e.g. "Chevron · Oklahoma City, OK") */
function getStationGroupKey(t: FuelTransaction): string {
  return `${t.stationBrand} · ${t.location}`
}

function groupTransactionsByStation(
  transactions: FuelTransaction[]
): { key: string; stationBrand: string; location: string; transactions: FuelTransaction[] }[] {
  const map = new Map<string, FuelTransaction[]>()
  for (const t of transactions) {
    const key = getStationGroupKey(t)
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const first = list[0]
      return {
        key,
        stationBrand: first.stationBrand,
        location: first.location,
        transactions: list.sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        ),
      }
    })
    .sort((a, b) => {
      const gallonsA = a.transactions.reduce((s, t) => s + t.gallons, 0)
      const gallonsB = b.transactions.reduce((s, t) => s + t.gallons, 0)
      return gallonsB - gallonsA
    })
}

export { getEfficiencyStatus }

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

export function BetterOptionDetails({
  option,
  transaction,
}: {
  option: BetterOption
  transaction: Pick<
    FuelTransaction,
    "lat" | "lng" | "stationBrand" | "location" | "dateTime" | "gallons" | "pricePerGallon" | "totalCost" | "savedAmount" | "variance"
  >
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
    const ac = new AbortController()
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${transaction.lng},${transaction.lat};${option.lng},${option.lat}?overview=full&geometries=geojson`,
      { signal: ac.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        const coords = data.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
        if (!coords || coords.length < 2) return
        const first = coords[0]
        const last = coords[coords.length - 1]
        const tol = 2
        const nearStart = Math.abs(first[0] - transaction.lng) < tol && Math.abs(first[1] - transaction.lat) < tol
        const nearEnd = Math.abs(last[0] - option.lng) < tol && Math.abs(last[1] - option.lat) < tol
        if (nearStart && nearEnd) setRouteCoords(coords)
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setRouteLoading(false)
      })
    return () => ac.abort()
  }, [transaction.lng, transaction.lat, option.lng, option.lat])

  const midLng = (transaction.lng + option.lng) / 2
  const midLat = (transaction.lat + option.lat) / 2

  return (
    <div className="flex flex-col min-w-[380px] text-xs">
      <div className="relative h-[240px] w-full overflow-hidden rounded-t-md border-b border-border">
        {mounted ? (
          <MapView
            className="h-full w-full"
            center={[midLng, midLat]}
            zoom={10}
          >
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
                <span className="rounded bg-background/80 px-1.5 py-0.5 text-[var(--text-2xs-sm)] font-medium shadow-sm">
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
                <span className="rounded bg-background/80 px-1.5 py-0.5 text-[var(--text-2xs-sm)] font-medium shadow-sm">
                  {option.stationName}
                </span>
              </MarkerLabel>
            </MapMarker>
          </MapView>
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

      <div className="flex gap-3 px-3 pb-1.5 pt-2 text-[var(--text-2xs)] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-destructive" />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
          Optimized
        </span>
      </div>

      <div className="flex flex-col gap-1.5 border-b border-border border-l-2 border-l-destructive px-3 pb-3 pt-1">
        <div className="text-[var(--text-2xs)] font-medium text-muted-foreground">Actual transaction</div>
        <div className="flex flex-col gap-1 text-[var(--text-2xs)]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Date and time</span>
            <span className="text-foreground">
              {new Date(transaction.dateTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Chain and location</span>
            <span className="text-foreground">{transaction.stationBrand} · {transaction.location}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total gallons</span>
            <span className="text-foreground">{transaction.gallons} gal</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Net CPG</span>
            <span className="text-foreground">${transaction.pricePerGallon.toFixed(2)}/gal</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Average discount</span>
            <span className="text-foreground">
              {transaction.gallons > 0 && transaction.savedAmount > 0
                ? `$${(transaction.savedAmount / transaction.gallons).toFixed(3)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4 font-medium">
            <span className="text-muted-foreground">Total spent</span>
            <span className="text-foreground">${transaction.totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-1.5 border-l-2 px-3 pb-3 pt-3"
        style={{ borderLeftColor: "var(--chart-2)" }}
      >
        <div className="text-[var(--text-2xs)] font-medium text-muted-foreground">Optimized location</div>
        <div className="flex flex-col gap-1 text-[var(--text-2xs)]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Chain and location</span>
            <span className="text-foreground">{option.stationName} · {option.location}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total gallons</span>
            <span className="text-foreground">{transaction.gallons} gal</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Net CPG</span>
            <span className="text-foreground">${option.pricePerGallon.toFixed(2)}/gal</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Average discount</span>
            <span className="text-foreground">
              {transaction.gallons > 0 && option.potentialSavings > 0
                ? `$${(option.potentialSavings / transaction.gallons).toFixed(3)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4 font-medium text-chart-2">
            <span className="text-muted-foreground">Estimated Total Spend</span>
            <span className="text-foreground">${(transaction.gallons * option.pricePerGallon).toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 text-[var(--text-2xs)] font-medium text-chart-2">
          <span>Could have saved</span>
          <span>${option.potentialSavings.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

const TABLE_COLUMN_COUNT = 10

function TransactionRow({
  t,
  leadingCell,
  hideDriverColumn,
  selectedTransactionId,
  onSelectTransaction,
}: {
  t: FuelTransaction
  /** When true, render an empty first cell (for alignment in grouped view). */
  leadingCell?: boolean
  hideDriverColumn?: boolean
  selectedTransactionId?: string | null
  onSelectTransaction?: (t: FuelTransaction | null) => void
}) {
  const status = getEfficiencyStatus(t)
  const hasBetterOption = status === "needs_attention" && !!t.betterOption
  const isSelected = selectedTransactionId != null && selectedTransactionId === t.id
  return (
    <TableRow
      key={t.id}
      className={cn(
        status === "needs_attention" && "bg-destructive/10",
        isSelected && "bg-primary/10 ring-1 ring-primary/30",
        onSelectTransaction && "cursor-pointer"
      )}
      onClick={
        onSelectTransaction
          ? () => onSelectTransaction(isSelected ? null : t)
          : undefined
      }
    >
      {leadingCell ? <TableCell className="w-0" /> : null}
      <TableCell className="whitespace-nowrap">{formatDate(t.dateTime)}</TableCell>
      {!hideDriverColumn ? <TableCell>{t.driverName}</TableCell> : null}
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
            className="gap-1 border-chart-2/30 bg-chart-2/10 text-chart-2 text-[var(--text-2xs)]"
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3" />
            In Network
          </Badge>
        ) : hasBetterOption ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="cursor-pointer border-0 bg-transparent p-0 outline-none [&>span]:cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Badge
                variant="destructive"
                className="cursor-pointer gap-1 text-[var(--text-2xs)]"
                title="Optimized location available"
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
            className="gap-1 text-[var(--text-2xs)] border-muted-foreground/20 bg-muted text-muted-foreground"
          >
            Out of Network
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {hasBetterOption ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="cursor-pointer border-0 bg-transparent p-0 outline-none [&>span]:cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Badge
                variant="secondary"
                className="cursor-pointer font-mono tabular-nums text-[var(--text-2xs)] border-destructive/30 bg-destructive/10 text-destructive"
              >
                ${(t.betterOption?.potentialSavings ?? 0).toFixed(2)}
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
              "font-mono tabular-nums text-[var(--text-2xs)]",
              status === "needs_attention"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-muted-foreground/20 bg-muted text-muted-foreground"
            )}
          >
            {t.variance >= 0 ? "+" : ""}${t.variance.toFixed(2)}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}

export function FuelTransactionTable({
  transactions,
  maxRows = 50,
  emptyTitle = "No transactions yet",
  emptyDescription = "Adjust filters or date range to see transactions.",
  emptyAction,
  groupByStation = true,
  hideDriverColumn = false,
  selectedTransactionId = null,
  onSelectTransaction,
}: {
  transactions: FuelTransaction[]
  maxRows?: number
  emptyTitle?: React.ReactNode
  emptyDescription?: React.ReactNode
  emptyAction?: React.ReactNode
  /** When true, group rows by station (Chain + Location) with expandable detail. */
  groupByStation?: boolean
  /** When true, omit the Driver column (e.g. on a single-driver profile page). */
  hideDriverColumn?: boolean
  /** When set, syncs with map: highlights row and supports row click to select. */
  selectedTransactionId?: string | null
  onSelectTransaction?: (t: FuelTransaction | null) => void
}) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = React.useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const groups = React.useMemo(
    () => (groupByStation ? groupTransactionsByStation(transactions) : null),
    [transactions, groupByStation]
  )

  const rows = transactions.slice(0, maxRows)
  const columnCount = (groupByStation ? 1 : 0) + TABLE_COLUMN_COUNT - (hideDriverColumn ? 1 : 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {groupByStation ? <TableHead className="w-0"></TableHead> : null}
          <TableHead>Date/Time</TableHead>
          {!hideDriverColumn ? <TableHead>Driver</TableHead> : null}
          <TableHead>Truck</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Station</TableHead>
          <TableHead className="text-right">Gallons</TableHead>
          <TableHead className="text-right">Price/Gal</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Network</TableHead>
          <TableHead className="text-right">Missed Savings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupByStation && groups ? (
          groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-1 py-8">
                  <p className="font-medium text-foreground">{emptyTitle}</p>
                  <p className="text-muted-foreground text-sm">{emptyDescription}</p>
                  {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.key)
                const totalGallons = group.transactions.reduce((s, t) => s + t.gallons, 0)
                const totalCost = group.transactions.reduce((s, t) => s + t.totalCost, 0)
                const count = group.transactions.length
                return (
                  <React.Fragment key={group.key}>
                    <TableRow
                      className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-b border-border"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <TableCell className="w-0 py-2 align-middle">
                        <span className="inline-flex size-6 items-center justify-center text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium py-2">
                        {group.stationBrand} · {group.location}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground text-[var(--text-2xs)]">
                        {count} {count === 1 ? "purchase" : "purchases"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-2">
                        {totalGallons.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-2">
                        ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      {!hideDriverColumn ? <TableCell></TableCell> : null}
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {isExpanded
                      ? group.transactions.map((t) => (
                          <TransactionRow
                            key={t.id}
                            t={t}
                            leadingCell
                            hideDriverColumn={hideDriverColumn}
                            selectedTransactionId={selectedTransactionId}
                            onSelectTransaction={onSelectTransaction}
                          />
                        ))
                      : null}
                  </React.Fragment>
                )
              })}
            </>
          )
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="h-32 text-center">
              <div className="flex flex-col items-center justify-center gap-1 py-8">
                <p className="font-medium text-foreground">{emptyTitle}</p>
                <p className="text-muted-foreground text-sm">{emptyDescription}</p>
                {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((t) => (
            <TransactionRow
              key={t.id}
              t={t}
              hideDriverColumn={hideDriverColumn}
              selectedTransactionId={selectedTransactionId}
              onSelectTransaction={onSelectTransaction}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
}
