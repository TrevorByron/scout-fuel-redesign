"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type DateRange } from "react-day-picker"
import dynamic from "next/dynamic"
import {
  getLocationListStats,
  locationToSlug,
  type DateRange as LocationDateRange,
} from "@/lib/location-utils"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowDown, ArrowUp } from "lucide-react"

const LocationInsightsMap = dynamic(
  () =>
    import("@/components/location-insights-map").then((m) => ({
      default: m.LocationInsightsMap,
    })),
  { ssr: false }
)

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

function getTodayRange(): DateRange {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return { from: startOfToday, to: startOfToday }
}

function getThisWeekRange(): DateRange {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - to.getDay())
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

function complianceScoreColorClass(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-500"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-500"
  return "text-red-600 dark:text-red-500"
}

function complianceScoreBgClass(pct: number): string {
  if (pct >= 90) return "bg-green-600 dark:bg-green-500"
  if (pct >= 50) return "bg-yellow-600 dark:bg-yellow-500"
  return "bg-red-600 dark:bg-red-500"
}

type LocationListSortColumn = "name" | "totalGallons" | "transactions" | "missedSavings" | "pct" | "avgPerBadStop"
type NeedsAttentionFilter = "all" | "yes" | "no"
type CardFilter = "all" | "fully_compliant" | "needs_attention" | "overpaid"

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
  "avgPerBadStop-desc": "Avg per bad stop (high first)",
  "avgPerBadStop-asc": "Avg per bad stop (low first)",
}

export default function LocationInsightsPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )
  const [sort, setSort] = React.useState<{
    column: LocationListSortColumn
    direction: "asc" | "desc"
  }>({ column: "missedSavings", direction: "desc" })
  const [locationNameFilter, setLocationNameFilter] = React.useState("")
  const [needsAttentionFilter, setNeedsAttentionFilter] = React.useState<NeedsAttentionFilter>("all")
  const [cardFilter, setCardFilter] = React.useState<CardFilter>("all")

  const dateFrom = dateRange?.from
  const dateTo = dateRange?.to ?? dateRange?.from

  const locationListStats = React.useMemo(
    () => getLocationListStats(dateRange as LocationDateRange | undefined),
    [dateRange]
  )

  const summaryStats = React.useMemo(() => {
    const total = locationListStats.length
    if (total === 0) {
      return {
        fleetAvgScore: 0,
        trendPts: 0,
        locationsNeedingAttention: 0,
        totalOverpaid: 0,
        badStopsCount: 0,
        fullyCompliantCount: 0,
      }
    }
    const totalTxns = locationListStats.reduce((s, l) => s + l.transactionCount, 0)
    const inNetworkTxns = locationListStats.reduce(
      (s, l) => s + Math.round((l.compliancePct / 100) * l.transactionCount),
      0
    )
    const fleetAvgScore = totalTxns > 0 ? Math.round((inNetworkTxns / totalTxns) * 100) : 0
    const totalOverpaid = locationListStats.reduce((s, l) => s + l.missedSavings, 0)
    const badStopsCount = locationListStats.reduce((s, l) => s + l.badStopsCount, 0)
    const locationsNeedingAttention = locationListStats.filter((l) => l.needsAttention).length
    const fullyCompliantCount = locationListStats.filter((l) => l.compliancePct === 100).length
    const prevFrom = dateFrom && dateTo ? new Date(dateFrom.getTime() - (dateTo.getTime() - dateFrom.getTime() + 86400000)) : null
    const prevTo = dateFrom ? new Date(dateFrom.getTime() - 86400000) : null
    const prevRange = prevFrom && prevTo ? { from: prevFrom, to: prevTo } : null
    const prevStats = prevRange ? getLocationListStats(prevRange) : []
    const prevTotalTxns = prevStats.reduce((s, l) => s + l.transactionCount, 0)
    const prevInNetwork = prevStats.reduce(
      (s, l) => s + Math.round((l.compliancePct / 100) * l.transactionCount),
      0
    )
    const prevScore = prevTotalTxns > 0 ? Math.round((prevInNetwork / prevTotalTxns) * 100) : 0
    const trendPts = fleetAvgScore - prevScore
    return {
      fleetAvgScore,
      trendPts,
      locationsNeedingAttention,
      totalOverpaid,
      badStopsCount,
      fullyCompliantCount,
    }
  }, [locationListStats, dateFrom, dateTo])

  const filteredAndSorted = React.useMemo(() => {
    let list = locationListStats.filter((loc) => {
      if (locationNameFilter.trim()) {
        const q = locationNameFilter.trim().toLowerCase()
        if (!loc.displayName.toLowerCase().includes(q)) return false
      }
      if (needsAttentionFilter === "yes" && !loc.needsAttention) return false
      if (needsAttentionFilter === "no" && loc.needsAttention) return false
      if (cardFilter === "fully_compliant" && loc.compliancePct !== 100) return false
      if (cardFilter === "needs_attention" && !loc.needsAttention) return false
      if (cardFilter === "overpaid" && loc.missedSavings <= 0) return false
      return true
    })
    const { column, direction } = sort
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (column) {
        case "name":
          cmp = a.displayName.localeCompare(b.displayName)
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
          cmp = a.compliancePct - b.compliancePct
          break
        case "avgPerBadStop":
          cmp = a.avgMissedSavingsPerBadStop - b.avgMissedSavingsPerBadStop
          break
      }
      return direction === "asc" ? cmp : -cmp
    })
    return list
  }, [locationListStats, locationNameFilter, needsAttentionFilter, cardFilter, sort])

  const sortSelectValue = `${sort.column}-${sort.direction}`

  const handleSortSelectChange = (value: string | null) => {
    if (value == null) return
    const [column, direction] = value.split("-") as [LocationListSortColumn, "asc" | "desc"]
    if (column && (direction === "asc" || direction === "desc")) {
      setSort({ column, direction })
    }
  }

  const handleSortByColumn = (column: LocationListSortColumn) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  const mapItems = React.useMemo(
    () =>
      filteredAndSorted.map((loc) => ({
        displayName: loc.displayName,
        slug: locationToSlug(loc.displayName),
        lat: loc.lat,
        lng: loc.lng,
        compliancePct: loc.compliancePct,
      })),
    [filteredAndSorted]
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Location Insights</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Each location is a fuel chain at a city (e.g. Love&apos;s Los Angeles, CA). View compliance and missed savings by location.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={
              rangeMatches(dateRange, "today")
                ? "today"
                : rangeMatches(dateRange, "week")
                  ? "week"
                  : rangeMatches(dateRange, "month")
                    ? "month"
                    : "today"
            }
            onValueChange={(v) => {
              if (v === "today") setDateRange(getTodayRange())
              if (v === "week") setDateRange(getThisWeekRange())
              if (v === "month") setDateRange(getThisMonthRange())
            }}
          >
            <TabsList className="h-10 min-h-10 bg-card text-card-foreground">
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
              render={<Button variant="outline" className="hidden h-9 gap-2 text-sm font-normal sm:inline-flex" />}
            >
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setCardFilter("all")}
            className={`block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "all" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "all"}
            aria-label="Show all locations"
          >
            <Card size="sm" className="cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Average Fleet Score</CardTitle>
                <div className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-500">
                  {summaryStats.fleetAvgScore}%
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.trendPts >= 0 ? "↑" : "↓"} {Math.abs(summaryStats.trendPts)} pts vs last period
                </p>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setCardFilter((prev) => (prev === "overpaid" ? "all" : "overpaid"))}
            className={`block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "overpaid" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "overpaid"}
            aria-label="Filter to locations with missed savings"
          >
            <Card size="sm" className="cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Missed Savings</CardTitle>
                <div className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-500">
                  ${summaryStats.totalOverpaid.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Across {summaryStats.badStopsCount} bad stop{summaryStats.badStopsCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setCardFilter((prev) => (prev === "needs_attention" ? "all" : "needs_attention"))}
            className={`block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "needs_attention" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "needs_attention"}
            aria-label="Filter to locations needing attention"
          >
            <Card size="sm" className="cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Locations Needing Attention</CardTitle>
                <div className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-500">
                  {summaryStats.locationsNeedingAttention}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Below 60% compliance</p>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setCardFilter((prev) => (prev === "fully_compliant" ? "all" : "fully_compliant"))}
            className={`block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "fully_compliant" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "fully_compliant"}
            aria-label="Filter to fully compliant locations"
          >
            <Card size="sm" className="cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Fully Compliant</CardTitle>
                <div className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-500">
                  {summaryStats.fullyCompliantCount}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">100% compliant this period</p>
              </CardContent>
            </Card>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="location-name-filter" className="text-xs font-medium text-muted-foreground">
              Filter
            </Label>
            <Input
              id="location-name-filter"
              placeholder="By location"
              value={locationNameFilter}
              onChange={(e) => setLocationNameFilter(e.target.value)}
              className="h-9 w-full"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-start-2 lg:col-start-3 xl:col-start-4">
            <Label className="text-xs font-medium text-muted-foreground">Sort by</Label>
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
                <SelectItem value="avgPerBadStop-desc">{SORT_BY_LABELS["avgPerBadStop-desc"]}</SelectItem>
                <SelectItem value="avgPerBadStop-asc">{SORT_BY_LABELS["avgPerBadStop-asc"]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative h-[40vh] min-h-[320px] w-full overflow-visible rounded-lg border border-border">
          <LocationInsightsMap locations={mapItems} />
        </div>

        <Card className="mt-2">
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Fuel chain locations in the selected date range. Click a location to view details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAndSorted.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No locations match the filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("name")}
                        className="flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Location
                        {sort.column === "name" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("pct")}
                        className="ml-auto flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Compliance
                        {sort.column === "pct" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("totalGallons")}
                        className="ml-auto flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Total Gallons
                        {sort.column === "totalGallons" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("transactions")}
                        className="ml-auto flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Transactions
                        {sort.column === "transactions" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("missedSavings")}
                        className="ml-auto flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Missed Savings
                        {sort.column === "missedSavings" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        onClick={() => handleSortByColumn("avgPerBadStop")}
                        className="ml-auto flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                      >
                        Avg per bad stop
                        {sort.column === "avgPerBadStop" &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ))}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.map((loc) => (
                    <TableRow
                      key={loc.locationKey}
                      className="cursor-pointer"
                      onClick={() => router.push(`/locations/${locationToSlug(loc.displayName)}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/locations/${locationToSlug(loc.displayName)}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {loc.displayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={[
                            "tabular-nums font-medium",
                            complianceScoreColorClass(loc.compliancePct),
                          ].join(" ")}
                        >
                          {loc.compliancePct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {loc.totalGallons.toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {loc.transactionCount.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell
                        className={
                          loc.missedSavings > 0
                            ? "text-right tabular-nums font-medium text-red-600 dark:text-red-500"
                            : "text-right tabular-nums"
                        }
                      >
                        ${loc.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${loc.avgMissedSavingsPerBadStop.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
