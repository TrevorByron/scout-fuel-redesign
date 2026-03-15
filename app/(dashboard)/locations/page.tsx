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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, Label as RechartsLabel } from "recharts"

const LOCATION_KEY_SEP = "\u001f"
const CHAIN_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "hsl(var(--muted-foreground))",
]

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

/** Parse "Chain City, ST" → { city, state }. */
function getCityStateFromDisplayName(displayName: string): { city: string; state: string } {
  const i = displayName.indexOf(" ")
  const locationPart = i >= 0 ? displayName.slice(i + 1).trim() : ""
  const comma = locationPart.indexOf(",")
  const city = comma >= 0 ? locationPart.slice(0, comma).trim() : locationPart
  const state = comma >= 0 ? locationPart.slice(comma + 1).trim() : ""
  return { city, state }
}

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
  const [stateFilter, setStateFilter] = React.useState("")
  const [cityFilter, setCityFilter] = React.useState("")
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
        totalGallons: 0,
        locationsNeedingAttention: 0,
        totalOverpaid: 0,
        badStopsCount: 0,
        fullyCompliantCount: 0,
      }
    }
    const totalGallons = locationListStats.reduce((s, l) => s + l.totalGallons, 0)
    const totalOverpaid = locationListStats.reduce((s, l) => s + l.missedSavings, 0)
    const badStopsCount = locationListStats.reduce((s, l) => s + l.badStopsCount, 0)
    const locationsNeedingAttention = locationListStats.filter((l) => l.needsAttention).length
    const fullyCompliantCount = locationListStats.filter((l) => l.compliancePct === 100).length
    return {
      totalGallons,
      locationsNeedingAttention,
      totalOverpaid,
      badStopsCount,
      fullyCompliantCount,
    }
  }, [locationListStats])

  const { uniqueStates, uniqueCities } = React.useMemo(() => {
    const states = new Set<string>()
    const cities = new Set<string>()
    for (const loc of locationListStats) {
      const { city, state } = getCityStateFromDisplayName(loc.displayName)
      if (state) states.add(state)
      if (city) cities.add(city)
    }
    return {
      uniqueStates: [...states].sort(),
      uniqueCities: [...cities].sort(),
    }
  }, [locationListStats])

  const filteredAndSorted = React.useMemo(() => {
    let list = locationListStats.filter((loc) => {
      if (stateFilter) {
        const { state } = getCityStateFromDisplayName(loc.displayName)
        if (state !== stateFilter) return false
      }
      if (cityFilter) {
        const { city } = getCityStateFromDisplayName(loc.displayName)
        if (city !== cityFilter) return false
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
  }, [locationListStats, stateFilter, cityFilter, needsAttentionFilter, cardFilter, sort])

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
        missedSavings: loc.missedSavings,
      })),
    [filteredAndSorted]
  )

  const chainChartData = React.useMemo(() => {
    const byChain = new Map<string, number>()
    for (const loc of locationListStats) {
      const i = loc.locationKey.indexOf(LOCATION_KEY_SEP)
      const brand = i >= 0 ? loc.locationKey.slice(0, i) : loc.displayName
      byChain.set(brand, (byChain.get(brand) ?? 0) + loc.totalGallons)
    }
    const sorted = [...byChain.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 6)
    const otherGallons = sorted.slice(6).reduce((s, [, v]) => s + v, 0)
    const data = [
      ...top.map(([label, gallons], i) => ({
        brand: label.toLowerCase().replace(/[^a-z0-9]/g, ""),
        label,
        gallons: Math.round(gallons * 10) / 10,
        fill: CHAIN_CHART_COLORS[i] ?? CHAIN_CHART_COLORS[CHAIN_CHART_COLORS.length - 1],
      })),
      ...(otherGallons > 0
        ? [
            {
              brand: "other",
              label: "Other",
              gallons: Math.round(otherGallons * 10) / 10,
              fill: CHAIN_CHART_COLORS[CHAIN_CHART_COLORS.length - 1],
            },
          ]
        : []),
    ]
    const config: ChartConfig = {
      gallons: { label: "Gallons" },
      ...Object.fromEntries(data.map((d) => [d.brand, { label: d.label, color: d.fill }])),
    }
    return {
      data,
      config,
      total: data.reduce((s, d) => s + d.gallons, 0),
    }
  }, [locationListStats])

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
              isExactlyTodayRange(dateRange)
                ? "today"
                : rangeMatches(dateRange, "week")
                  ? "week"
                  : rangeMatches(dateRange, "today")
                    ? "today"
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
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setCardFilter("all")}
            className={`min-w-0 block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "all" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "all"}
            aria-label="Show all locations"
          >
            <Card size="sm" className="min-w-0 cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Gallons</CardTitle>
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {summaryStats.totalGallons.toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Purchased this period
                </p>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setCardFilter((prev) => (prev === "overpaid" ? "all" : "overpaid"))}
            className={`min-w-0 block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "overpaid" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "overpaid"}
            aria-label="Filter to locations with missed savings"
          >
            <Card size="sm" className="min-w-0 cursor-pointer">
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
            className={`min-w-0 block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "needs_attention" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "needs_attention"}
            aria-label="Filter to locations needing attention"
          >
            <Card size="sm" className="min-w-0 cursor-pointer">
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
            className={`min-w-0 block w-full text-left rounded-lg transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardFilter === "fully_compliant" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-muted-foreground/20 hover:ring-offset-2 hover:ring-offset-background"}`}
            aria-pressed={cardFilter === "fully_compliant"}
            aria-label="Filter to fully compliant locations"
          >
            <Card size="sm" className="min-w-0 cursor-pointer">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="state-filter" className="text-xs font-medium text-muted-foreground">
              State
            </Label>
            <Select value={stateFilter || "All states"} onValueChange={(v) => setStateFilter(v === "All states" ? "" : (v ?? ""))}>
              <SelectTrigger id="state-filter" className="h-9 w-full">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All states">All states</SelectItem>
                {uniqueStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city-filter" className="text-xs font-medium text-muted-foreground">
              City
            </Label>
            <Select value={cityFilter || "All cities"} onValueChange={(v) => setCityFilter(v === "All cities" ? "" : (v ?? ""))}>
              <SelectTrigger id="city-filter" className="h-9 w-full">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All cities">All cities</SelectItem>
                {uniqueCities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="relative h-[40vh] min-h-[320px] w-full overflow-visible rounded-lg border border-border">
            <LocationInsightsMap locations={mapItems} />
          </div>
          <Card className="flex flex-col min-h-0 lg:min-h-[40vh]">
            <CardHeader className="shrink-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Network chains
              </CardTitle>
              <CardDescription className="sr-only">
                Gallons purchased per station brand in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 flex flex-col gap-4">
              {chainChartData.total === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
                  <p className="font-medium text-foreground">No gallons</p>
                  <p className="text-sm text-muted-foreground">
                    No fuel data in the selected period.
                  </p>
                </div>
              ) : (
                <>
                  <ChartContainer
                    config={chainChartData.config}
                    className="mx-auto aspect-square h-[200px] shrink-0"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            nameKey="label"
                            labelFormatter={(_value, payload) =>
                              payload?.[0]?.payload?.label ?? ""
                            }
                            formatter={(v) => `${Number(v).toLocaleString("en-US")} gal`}
                          />
                        }
                      />
                      <Pie
                        data={chainChartData.data}
                        dataKey="gallons"
                        nameKey="label"
                        innerRadius={56}
                        strokeWidth={2}
                      >
                        {chainChartData.data.map((entry) => (
                          <Cell key={entry.brand} fill={entry.fill} />
                        ))}
                        <RechartsLabel
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-lg font-bold"
                                  >
                                    {chainChartData.total.toLocaleString("en-US", {
                                      maximumFractionDigits: 1,
                                    })}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy ?? 0) + 18}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    gallons
                                  </tspan>
                                </text>
                              )
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {chainChartData.data.map((item) => (
                      <div
                        key={item.brand}
                        className="flex items-center gap-2 min-w-0"
                      >
                        <div
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: item.fill }}
                        />
                        <span className="truncate text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="ml-auto shrink-0 tabular-nums text-foreground">
                          ({item.gallons.toLocaleString("en-US", { maximumFractionDigits: 1 })})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
              <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                <p className="font-medium text-foreground">No locations found</p>
                <p className="text-sm text-muted-foreground">
                  No locations match the filters. Try a broader date range or clear filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setStateFilter("")
                    setCityFilter("")
                    setNeedsAttentionFilter("all")
                    setCardFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </div>
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
