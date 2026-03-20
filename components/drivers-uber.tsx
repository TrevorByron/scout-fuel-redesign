"use client"

import * as React from "react"
import Link from "next/link"
import { type DateRange } from "react-day-picker"
import { getFuelTransactions } from "@/lib/mock-data"
import { driverNameToSlug } from "@/lib/driver-utils"
import type { FuelTransaction } from "@/lib/mock-data"

import { Card, CardContent } from "@/components/ui/card"
import { StatStrip, StatStripItem, StatStripLabel, StatStripValue } from "@/components/stat-strip"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const

function getPresetRange(days: number): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from, to }
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Pick a date range"
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (!range.to) return fmt(range.from)
  return `${fmt(range.from)} – ${fmt(range.to)}`
}

/** True when range is exactly "today" (from and to are the same moment at start of today). Distinguishes Today from This Week on Sunday. */
function isExactlyTodayRange(range: DateRange | undefined): boolean {
  if (!range?.from) return false
  const to = range.to ?? range.from
  return (
    to.getTime() === range.from.getTime() &&
    range.from.toDateString() === new Date().toDateString()
  )
}

function getTodayRange(): DateRange {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return { from: startOfToday, to: startOfToday }
}

function getThisWeekRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { from, to }
}

function getThisMonthRange(): DateRange {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return { from, to }
}

function rangeMatches(range: DateRange | undefined, preset: "today" | "week" | "month"): boolean {
  if (!range?.from) return false
  const fromStr = range.from.toDateString()
  const toStr = (range.to ?? range.from).toDateString()
  if (preset === "today") {
    const todayStr = new Date().toDateString()
    return fromStr === todayStr && toStr === todayStr
  }
  if (preset === "week") {
    const week = getThisWeekRange()
    if (!week.from || !week.to) return false
    return range.from.toDateString() === week.from.toDateString() && (range.to ?? range.from).toDateString() === week.to.toDateString()
  }
  if (preset === "month") {
    const month = getThisMonthRange()
    if (!month.from || !month.to) return false
    return range.from.toDateString() === month.from.toDateString() && (range.to ?? range.from).toDateString() === month.to.toDateString()
  }
  return false
}

/** Amount overpaid: could have gotten same fuel for less. Matches dashboard logic. */
function getOverpaidAmount(t: FuelTransaction): number {
  if (t.betterOption?.potentialSavings != null && t.betterOption.potentialSavings > 0) {
    return t.betterOption.potentialSavings
  }
  if (t.variance < 0) return Math.abs(t.variance)
  return 0
}

function isInDateRange(t: FuelTransaction, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  const tDate = new Date(t.dateTime).getTime()
  if (tDate < range.from.getTime()) return false
  const toEnd = range.to ? range.to.getTime() + 86400000 : range.from.getTime() + 86400000
  if (tDate > toEnd) return false
  return true
}

function getInitials(driverName: string): string {
  const parts = driverName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Color class for compliance/optimization score — matches dashboard Fuel optimization (green 90%+, yellow 50%+, red below). */
function complianceScoreColorClass(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-500"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-500"
  return "text-red-600 dark:text-red-500"
}

/** Background color class for compliance progress bar fill. */
function complianceScoreBgClass(pct: number): string {
  if (pct >= 90) return "bg-green-600 dark:bg-green-500"
  if (pct >= 50) return "bg-yellow-600 dark:bg-yellow-500"
  return "bg-red-600 dark:bg-red-500"
}

/** All unique drivers in the fleet (from transactions; 16 drivers). */
const ALL_FLEET_DRIVERS = [...new Set(getFuelTransactions().map((t) => t.driverName))].sort()

type DriverListSortColumn = "name" | "totalGallons" | "transactions" | "missedSavings" | "pct"
type NeedsAttentionFilter = "all" | "yes" | "no"
/** Active KPI card filter for the driver list below; "all" = no card filter. */
type CardFilter = "all" | "fully_compliant" | "needs_attention" | "overpaid"

/** Human-readable labels for the sort-by dropdown (value -> label). */
const SORT_BY_LABELS: Record<string, string> = {
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  "missedSavings-desc": "Missed savings (high first)",
  "missedSavings-asc": "Missed savings (low first)",
  "totalGallons-desc": "Total gallons (high first)",
  "totalGallons-asc": "Total gallons (low first)",
  "transactions-desc": "Transactions (high first)",
  "transactions-asc": "Transactions (low first)",
  "pct-desc": "Compliance % (high first)",
  "pct-asc": "Compliance % (low first)",
}

export function DriversUber() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )
  const [driverListSort, setDriverListSort] = React.useState<{
    column: DriverListSortColumn
    direction: "asc" | "desc"
  }>({ column: "missedSavings", direction: "desc" })
  const [driverNameFilter, setDriverNameFilter] = React.useState("")
  const [needsAttentionFilter, setNeedsAttentionFilter] = React.useState<NeedsAttentionFilter>("all")
  const [cardFilter, setCardFilter] = React.useState<CardFilter>("all")

  const dateFrom = dateRange?.from
  const dateTo = dateRange?.to ?? dateRange?.from

  const txnsInRange = React.useMemo(
    () => getFuelTransactions().filter((t) => isInDateRange(t, dateRange)),
    [dateRange]
  )

  const summaryStats = React.useMemo(() => {
    const total = txnsInRange.length
    const inNetworkCount = txnsInRange.filter((t) => t.inNetwork).length
    const fleetAvgScore = total > 0 ? Math.round((inNetworkCount / total) * 100) : 0
    const overpaidTxns = txnsInRange.filter((t) => getOverpaidAmount(t) > 0)
    const totalOverpaid = Math.round(overpaidTxns.reduce((s, t) => s + getOverpaidAmount(t), 0))
    const badStopsCount = overpaidTxns.length
    const byDriver = new Map<string, FuelTransaction[]>()
    for (const t of txnsInRange) {
      const list = byDriver.get(t.driverName) ?? []
      list.push(t)
      byDriver.set(t.driverName, list)
    }
    // Use same gallon-based compliance as driverListStats so KPI count matches filtered list
    let driversNeedingAttention = 0
    let fullyCompliantCount = 0
    let overpaidDriversCount = 0
    for (const [, txns] of byDriver.entries()) {
      if (txns.length === 0) continue
      const totalGallons = txns.reduce((s, t) => s + t.gallons, 0)
      const inNetworkGallons = txns.filter((t) => t.inNetwork).reduce((s, t) => s + t.gallons, 0)
      const pct = totalGallons > 0 ? Math.round((inNetworkGallons / totalGallons) * 100) : 0
      if (pct < 60) driversNeedingAttention += 1
      if (pct >= 100) fullyCompliantCount += 1
      const outOfNetworkTxns = txns.filter((t) => !t.inNetwork)
      const rawMissedSavings = outOfNetworkTxns.reduce((s, t) => s + getOverpaidAmount(t), 0)
      if (pct < 100 && rawMissedSavings > 0) overpaidDriversCount += 1
    }
    const prevFrom = dateFrom && dateTo ? new Date(dateFrom.getTime() - (dateTo.getTime() - dateFrom.getTime() + 86400000)) : null
    const prevTo = dateFrom ? new Date(dateFrom.getTime() - 86400000) : null
    const prevRange = prevFrom && prevTo ? { from: prevFrom, to: prevTo } : null
    const prevTxns = prevRange ? getFuelTransactions().filter((t) => isInDateRange(t, prevRange)) : []
    const prevTotal = prevTxns.length
    const prevInNetwork = prevTxns.filter((t) => t.inNetwork).length
    const prevScore = prevTotal > 0 ? Math.round((prevInNetwork / prevTotal) * 100) : 0
    const trendPts = fleetAvgScore - prevScore
    return {
      fleetAvgScore,
      trendPts,
      totalDrivers: byDriver.size,
      driversNeedingAttention,
      overpaidDriversCount,
      totalOverpaid,
      badStopsCount,
      fullyCompliantCount,
    }
  }, [txnsInRange, dateFrom, dateTo])

  const driverListStats = React.useMemo(() => {
    const byDriver = new Map<string, FuelTransaction[]>()
    for (const t of txnsInRange) {
      const list = byDriver.get(t.driverName) ?? []
      list.push(t)
      byDriver.set(t.driverName, list)
    }
    return ALL_FLEET_DRIVERS.map((driverName) => {
      const txns = byDriver.get(driverName) ?? []
      const totalGallons = txns.reduce((s, t) => s + t.gallons, 0)
      const inNetworkGallons = txns.filter((t) => t.inNetwork).reduce((s, t) => s + t.gallons, 0)
      const pct = totalGallons > 0 ? Math.round((inNetworkGallons / totalGallons) * 100) : 0
      // Missed savings = overpaid amount on out-of-network fill-ups only (fully compliant => $0)
      const outOfNetworkTxns = txns.filter((t) => !t.inNetwork)
      const rawMissedSavings = Math.round(outOfNetworkTxns.reduce((s, t) => s + getOverpaidAmount(t), 0))
      const missedSavings = pct >= 100 ? 0 : rawMissedSavings
      const needsAttention = txns.length > 0 && pct < 60
      return {
        driverName,
        totalGallons: Math.round(totalGallons * 10) / 10,
        transactionCount: txns.length,
        missedSavings,
        pct,
        needsAttention,
      }
    })
  }, [txnsInRange])

  const filteredAndSortedDrivers = React.useMemo(() => {
    let list = driverListStats.filter((d) => {
      if (driverNameFilter.trim()) {
        const q = driverNameFilter.trim().toLowerCase()
        if (!d.driverName.toLowerCase().includes(q)) return false
      }
      if (needsAttentionFilter === "yes" && !d.needsAttention) return false
      if (needsAttentionFilter === "no" && d.needsAttention) return false
      if (cardFilter === "fully_compliant" && d.pct !== 100) return false
      if (cardFilter === "needs_attention" && !d.needsAttention) return false
      if (cardFilter === "overpaid" && d.missedSavings <= 0) return false
      return true
    })
    const { column, direction } = driverListSort
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (column) {
        case "name":
          cmp = a.driverName.localeCompare(b.driverName)
          break
        case "totalGallons":
          cmp = a.totalGallons - b.totalGallons
          break
        case "transactions":
          cmp = a.transactionCount - b.transactionCount
          break
        case "missedSavings":
          cmp = a.missedSavings - b.missedSavings
          break
        case "pct":
          cmp = a.pct - b.pct
          break
      }
      return direction === "asc" ? cmp : -cmp
    })
    return list
  }, [driverListStats, driverNameFilter, needsAttentionFilter, cardFilter, driverListSort])

  const sortSelectValue = `${driverListSort.column}-${driverListSort.direction}`

  const handleSortSelectChange = (value: string | null) => {
    if (value == null) return
    const [column, direction] = value.split("-") as [DriverListSortColumn, "asc" | "desc"]
    if (column && (direction === "asc" || direction === "desc")) {
      setDriverListSort({ column, direction })
    }
  }

  const activePreset =
    isExactlyTodayRange(dateRange)
      ? "today"
      : rangeMatches(dateRange, "week")
        ? "week"
        : rangeMatches(dateRange, "month")
          ? "month"
          : null

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      {/* Date range filter — same as dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Driver Insights</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            View driver performance, compliance, and fuel activity by period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={activePreset ?? "custom"}
            onValueChange={(v) => {
              if (v === "today") setDateRange(getTodayRange())
              if (v === "week") setDateRange(getThisWeekRange())
              if (v === "month") setDateRange(getThisMonthRange())
            }}
          >
            <TabsList className="h-10 min-h-10 group-data-horizontal/tabs:h-10 bg-card text-card-foreground">
              <TabsTrigger value="today" className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground">
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground">
                This Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground">
                This Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={activePreset === null ? "default" : "outline"}
                  className="hidden h-9 gap-2 text-sm font-normal sm:inline-flex"
                />
              }
            >
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className={cn("size-4", activePreset === null ? "text-primary-foreground" : "text-muted-foreground")} />
              {formatRangeLabel(dateRange)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex gap-1 border-b px-3 py-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.days}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDateRange(getPresetRange(p.days))}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:gap-6">
          <StatStrip className="grid grid-cols-2 sm:grid-cols-4">
            <StatStripItem
              onClick={() => setCardFilter("all")}
              active={cardFilter === "all"}
              aria-label="Show all drivers"
            >
              <StatStripLabel count={summaryStats.totalDrivers}>All Drivers</StatStripLabel>
              <StatStripValue className="text-amber-600 dark:text-amber-500">
                {summaryStats.fleetAvgScore}%
              </StatStripValue>
            </StatStripItem>
            <StatStripItem
              onClick={() => setCardFilter((prev) => (prev === "overpaid" ? "all" : "overpaid"))}
              active={cardFilter === "overpaid"}
              aria-label="Filter to drivers with missed savings"
            >
              <StatStripLabel count={summaryStats.overpaidDriversCount}>Drivers with missed savings</StatStripLabel>
              <StatStripValue className="text-red-600 dark:text-red-500">
                ${summaryStats.totalOverpaid.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </StatStripValue>
            </StatStripItem>
            <StatStripItem
              onClick={() => setCardFilter((prev) => (prev === "needs_attention" ? "all" : "needs_attention"))}
              active={cardFilter === "needs_attention"}
              aria-label="Filter to drivers needing attention"
            >
              <StatStripLabel count={summaryStats.driversNeedingAttention}>Needing Attention</StatStripLabel>
              <StatStripValue className="text-red-600 dark:text-red-500">
                {summaryStats.driversNeedingAttention}
              </StatStripValue>
            </StatStripItem>
            <StatStripItem
              onClick={() => setCardFilter((prev) => (prev === "fully_compliant" ? "all" : "fully_compliant"))}
              active={cardFilter === "fully_compliant"}
              aria-label="Filter to fully compliant drivers"
            >
              <StatStripLabel count={summaryStats.fullyCompliantCount}>Fully Compliant</StatStripLabel>
              <StatStripValue className="text-green-600 dark:text-green-500">
                {summaryStats.fullyCompliantCount}
              </StatStripValue>
            </StatStripItem>
          </StatStrip>

          {/* Driver list — sort and filter by name (same grid as cards so Filter matches card width) */}
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="driver-name-filter" className="text-xs font-medium text-muted-foreground">
                    Filter
                  </Label>
                  <Input
                    id="driver-name-filter"
                    placeholder="By name"
                    value={driverNameFilter}
                    onChange={(e) => setDriverNameFilter(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-start-2 lg:col-start-3 xl:col-start-4">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Sort by
                  </Label>
                  <Select value={sortSelectValue} onValueChange={handleSortSelectChange}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Sort by">
                        {SORT_BY_LABELS[sortSelectValue] ?? sortSelectValue}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">{SORT_BY_LABELS["name-asc"]}</SelectItem>
                      <SelectItem value="name-desc">{SORT_BY_LABELS["name-desc"]}</SelectItem>
                      <SelectItem value="missedSavings-desc">{SORT_BY_LABELS["missedSavings-desc"]}</SelectItem>
                      <SelectItem value="missedSavings-asc">{SORT_BY_LABELS["missedSavings-asc"]}</SelectItem>
                      <SelectItem value="totalGallons-desc">{SORT_BY_LABELS["totalGallons-desc"]}</SelectItem>
                      <SelectItem value="totalGallons-asc">{SORT_BY_LABELS["totalGallons-asc"]}</SelectItem>
                      <SelectItem value="transactions-desc">{SORT_BY_LABELS["transactions-desc"]}</SelectItem>
                      <SelectItem value="transactions-asc">{SORT_BY_LABELS["transactions-asc"]}</SelectItem>
                      <SelectItem value="pct-desc">{SORT_BY_LABELS["pct-desc"]}</SelectItem>
                      <SelectItem value="pct-asc">{SORT_BY_LABELS["pct-asc"]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                {filteredAndSortedDrivers.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No drivers match the filters.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredAndSortedDrivers.map((d) => (
                      <Link
                        key={d.driverName}
                        href={`/drivers/${driverNameToSlug(d.driverName)}`}
                        className="block rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"
                        aria-label={`View details for ${d.driverName}`}
                      >
                        <Card size="sm" className="overflow-hidden shadow-md ring-1 ring-foreground/10">
                          <CardContent className="flex flex-col gap-3 pt-4">
                            <div className="flex items-center gap-3">
                              <Avatar size="lg" className="size-10 shrink-0">
                                <AvatarFallback className="text-xs font-medium">
                                  {getInitials(d.driverName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 truncate font-semibold text-foreground">
                                {d.driverName}
                              </span>
                            </div>
                            {/* Compliance score — % of purchases optimized; color-coded like dashboard */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Compliance score</span>
                                <span className={["tabular-nums font-semibold", complianceScoreColorClass(d.pct)].join(" ")}>
                                  {d.pct}%
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={["h-full rounded-full transition-[width] duration-300", complianceScoreBgClass(d.pct)].join(" ")}
                                  style={{ width: `${Math.min(100, Math.max(0, d.pct))}%` }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-border pt-2">
                              <span className="text-muted-foreground">Total Gallons</span>
                              <span className="tabular-nums text-right font-medium">
                                {d.totalGallons.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </span>
                              <span className="text-muted-foreground">Transactions</span>
                              <span className="tabular-nums text-right font-medium">
                                {d.transactionCount.toLocaleString("en-US")}
                              </span>
                              <span className="text-muted-foreground">Missed Savings</span>
                              <span className={d.missedSavings > 0 ? "tabular-nums text-right font-medium text-red-600 dark:text-red-500" : "tabular-nums text-right font-medium"}>
                                ${d.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
          </div>

      </div>
    </div>
  )
}
