"use client"

import * as React from "react"
import Link from "next/link"
import { type DateRange } from "react-day-picker"
import {
  fleetScoreCardMock,
  getFuelTransactions,
  fuelPriceHistory,
  type FuelPricePoint,
  type FuelTransaction,
} from "@/lib/mock-data"
import { getFleetGrade } from "@/lib/fuelScore"
import { driverNameToSlug, getDriversNeedingAttention } from "@/lib/driver-utils"
import { getLocationListStats, locationToSlug } from "@/lib/location-utils"
import { OptimizationGaugeCard } from "@/components/optimization-gauge-card"
import { StatStrip, StatStripItem, StatStripLabel, StatStripValue } from "@/components/stat-strip"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon, Calendar01Icon, ArrowRight01Icon, AlertCircleIcon, UserGroupIcon, Location01Icon } from "@hugeicons/core-free-icons"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { AreaChart, Area, XAxis, CartesianGrid, PieChart, Pie, Label, ReferenceLine } from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const fuelPriceChartConfig = {
  price: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  forecast: {
    label: "Forecast",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type PriceRange = "1W" | "1M" | "1Y" | "YTD" | "All"

const TODAY_DATE = "2026-03-06"

/** Returns time-of-day greeting. Eventually use actual user name. */
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function filterFuelPriceData(data: FuelPricePoint[], range: PriceRange): FuelPricePoint[] {
  if (range === "All") return data
  const today = new Date(TODAY_DATE)
  let cutoff: Date
  if (range === "1W") {
    cutoff = new Date(today)
    cutoff.setDate(today.getDate() - 14)
  } else if (range === "1M") {
    cutoff = new Date(today)
    cutoff.setDate(today.getDate() - 35)
  } else if (range === "1Y") {
    cutoff = new Date(today)
    cutoff.setFullYear(today.getFullYear() - 1)
  } else {
    // YTD
    cutoff = new Date(today.getFullYear(), 0, 1)
  }
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter((d) => d.date >= cutoffStr)
}

function FuelPriceTrendsCard() {
  const [range, setRange] = React.useState<PriceRange>("1Y")

  const filtered = React.useMemo(
    () => filterFuelPriceData(fuelPriceHistory, range),
    [range]
  )

  const todayAnchor = filtered.find((d) => d.price !== null && d.forecast !== null)?.date

  return (
    <Card className="@container/card flex min-h-0 min-w-0 flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Fuel Price Trends</CardTitle>
        <CardDescription>Avg diesel price per gallon</CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[range]}
            onValueChange={(v) => { if (v[0]) setRange(v[0] as PriceRange) }}
          >
            {(["1W", "1M", "1Y", "YTD", "All"] as PriceRange[]).map((r) => (
              <ToggleGroupItem key={r} value={r}>
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-2 pb-4 sm:px-6">
        <div className="flex items-center gap-4 pb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-5 bg-[var(--color-price)]" style={{ "--color-price": "var(--chart-1)" } as React.CSSProperties} />
            Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-px w-5"
              style={{
                background: "repeating-linear-gradient(90deg, var(--chart-2) 0, var(--chart-2) 4px, transparent 4px, transparent 7px)",
              }}
            />
            Forecast
          </span>
        </div>
        <ChartContainer config={fuelPriceChartConfig} className="min-h-0 flex-1 w-full aspect-[2/1] @sm:aspect-[3/1] @lg:aspect-[4/1]">
          <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-forecast)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-forecast)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <span>${Number(value).toFixed(3)}</span>
                  )}
                />
              }
            />
            {todayAnchor && (
              <ReferenceLine
                x={filtered.find((d) => d.date === todayAnchor)?.label}
                stroke="var(--border)"
                strokeDasharray="4 3"
                label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--color-price)"
              fill="url(#fillActual)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeDasharray="5 4"
              fill="url(#fillForecast)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const CHAIN_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]
const TOP_CHAINS = 5

function brandKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function buildChainData(transactions: FuelTransaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    map.set(t.stationBrand, (map.get(t.stationBrand) ?? 0) + t.gallons)
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, TOP_CHAINS)
  const otherGallons = sorted.slice(TOP_CHAINS).reduce((s, [, v]) => s + v, 0)
  const data = [
    ...top.map(([brand, gallons], i) => ({
      brand: brandKey(brand),
      label: brand,
      gallons: Math.round(gallons),
      fill: CHAIN_COLORS[i] ?? CHAIN_COLORS[CHAIN_COLORS.length - 1],
    })),
    ...(otherGallons > 0
      ? [{ brand: "other", label: "Other", gallons: Math.round(otherGallons), fill: "var(--muted-foreground)" }]
      : []),
  ]
  const config: ChartConfig = {
    gallons: { label: "Gallons" },
    ...Object.fromEntries(data.map((d) => [d.brand, { label: d.label, color: d.fill }])),
  }
  return { data, config, total: data.reduce((s, d) => s + d.gallons, 0) }
}

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
    const rangeTo = range.to ?? range.from
    return (
      range.from.toDateString() === week.from.toDateString() &&
      rangeTo.getTime() >= week.from.getTime() &&
      rangeTo.getTime() <= week.to.getTime()
    )
  }
  if (preset === "month") {
    const month = getThisMonthRange()
    if (!month.from || !month.to) return false
    const rangeTo = range.to ?? range.from
    return (
      range.from.toDateString() === month.from.toDateString() &&
      rangeTo.getTime() >= month.from.getTime() &&
      rangeTo.getTime() <= month.to.getTime()
    )
  }
  return false
}

/** Comparison period label and range for trend badges. Reflects the selected date range above. */
function getComparisonPeriod(dateRange: DateRange | undefined): { label: string; range: DateRange } | null {
  if (!dateRange?.from) return null
  const to = dateRange.to ?? dateRange.from
  if (rangeMatches(dateRange, "today")) {
    const yesterday = new Date(to)
    yesterday.setDate(yesterday.getDate() - 1)
    return { label: "yesterday", range: { from: yesterday, to: yesterday } }
  }
  if (rangeMatches(dateRange, "week")) {
    const weekEnd = new Date(to)
    weekEnd.setDate(weekEnd.getDate() + 1)
    const prevWeekEnd = new Date(weekEnd)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
    const prevWeekStart = new Date(prevWeekEnd)
    prevWeekStart.setDate(prevWeekStart.getDate() - 6)
    return { label: "last week", range: { from: prevWeekStart, to: prevWeekEnd } }
  }
  if (rangeMatches(dateRange, "month")) {
    const prevMonthEnd = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 0)
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
    return { label: "last month", range: { from: prevMonthStart, to: prevMonthEnd } }
  }
  const fromMs = dateRange.from.getTime()
  const toMs = to.getTime()
  const spanMs = toMs - fromMs + 86400000
  const prevTo = new Date(fromMs - 86400000)
  const prevFrom = new Date(prevTo.getTime() - spanMs + 86400000)
  return { label: "previous period", range: { from: prevFrom, to: prevTo } }
}

function isInDateRange(t: FuelTransaction, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  const tDate = new Date(t.dateTime).getTime()
  if (tDate < range.from.getTime()) return false
  const toEnd = range.to ? range.to.getTime() + 86400000 : range.from.getTime() + 86400000
  if (tDate > toEnd) return false
  return true
}

/** Amount overpaid: could have gotten same fuel for less. Uses betterOption.potentialSavings when available (better location on route), else |variance|. */
function getOverpaidAmount(t: FuelTransaction): number {
  if (t.betterOption?.potentialSavings != null && t.betterOption.potentialSavings > 0) {
    return t.betterOption.potentialSavings
  }
  if (t.variance < 0) return Math.abs(t.variance)
  return 0
}

type PeriodTabValue = "today" | "week" | "month"

export function DashboardUber() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )
  /** Track which period tab is selected so clicks update UI immediately; null = derive from dateRange (e.g. after calendar pick). */
  const [periodTab, setPeriodTab] = React.useState<PeriodTabValue | null>("week")
  const [attentionTab, setAttentionTab] = React.useState<"drivers" | "locations">("drivers")

  const filteredByDateTransactions = React.useMemo(() => {
    return getFuelTransactions().filter((t) => isInDateRange(t, dateRange))
  }, [dateRange])

  /** Drivers needing attention = below 60% compliance in period (same definition as Driver Insights). Top 5 by missed savings. */
  const driversInNeedOfAttention = React.useMemo(() => {
    const week = getThisWeekRange()
    const range = dateRange?.from
      ? { from: dateRange.from, to: dateRange.to ?? dateRange.from }
      : week
    return getDriversNeedingAttention(getFuelTransactions(), {
      from: range.from ?? week.from!,
      to: range.to ?? range.from ?? week.to,
    }).slice(0, 5)
  }, [dateRange])

  /** Locations that need attention in the selected period. Top 5 by missed savings. */
  const locationsInNeedOfAttention = React.useMemo(() => {
    const week = getThisWeekRange()
    const range = dateRange?.from
      ? { from: dateRange.from, to: dateRange.to ?? dateRange.from }
      : week
    return getLocationListStats({
      from: range.from ?? week.from!,
      to: range.to ?? range.from ?? week.to,
    })
      .filter((loc) => loc.needsAttention)
      .sort((a, b) => b.missedSavings - a.missedSavings)
      .slice(0, 5)
  }, [dateRange])

  const activePreset =
    isExactlyTodayRange(dateRange)
      ? "today"
      : rangeMatches(dateRange, "week")
        ? "week"
        : rangeMatches(dateRange, "month")
          ? "month"
          : null

  const periodLabel =
    isExactlyTodayRange(dateRange) ? "today" : rangeMatches(dateRange, "week") ? "week" : rangeMatches(dateRange, "today") ? "today" : rangeMatches(dateRange, "month") ? "month" : "period"
  const periodBadgeLabel =
    periodLabel === "today" ? "today" : periodLabel === "week" ? "this week" : periodLabel === "month" ? "this month" : "this period"

  const kpis = React.useMemo(() => {
    const byType = (type: "Diesel" | "Reefer" | "DEF") =>
      filteredByDateTransactions.filter((t) => t.fuelType === type)

    const avgCost = (txns: FuelTransaction[]) =>
      txns.length ? txns.reduce((s, t) => s + t.pricePerGallon, 0) / txns.length : 0

    const avgSavingsPerGal = (txns: FuelTransaction[]) =>
      txns.length
        ? txns.reduce((s, t) => s + t.savedAmount / t.gallons, 0) / txns.length
        : 0

    const dieselTxns = byType("Diesel")
    const reeferTxns = byType("Reefer")
    const defTxns = byType("DEF")

    return {
      totalGallons: filteredByDateTransactions.reduce((s, t) => s + t.gallons, 0),
      gallonsByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.gallons, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.gallons, 0),
        DEF: defTxns.reduce((s, t) => s + t.gallons, 0),
      },
      avgCostAll: avgCost(filteredByDateTransactions),
      avgCostByType: {
        Diesel: avgCost(dieselTxns),
        Reefer: avgCost(reeferTxns),
        DEF: avgCost(defTxns),
      },
      avgSavingsAll: avgSavingsPerGal(filteredByDateTransactions),
      avgSavingsByType: {
        Diesel: avgSavingsPerGal(dieselTxns),
        Reefer: avgSavingsPerGal(reeferTxns),
        DEF: avgSavingsPerGal(defTxns),
      },
      totalSavings: filteredByDateTransactions.reduce((s, t) => s + t.savedAmount, 0),
      savingsByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.savedAmount, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.savedAmount, 0),
        DEF: defTxns.reduce((s, t) => s + t.savedAmount, 0),
      },
      totalSpent: filteredByDateTransactions.reduce((s, t) => s + t.totalCost, 0),
      spentByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.totalCost, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.totalCost, 0),
        DEF: defTxns.reduce((s, t) => s + t.totalCost, 0),
      },
    }
  }, [filteredByDateTransactions])

  const chainChartData = React.useMemo(
    () => buildChainData(filteredByDateTransactions),
    [filteredByDateTransactions]
  )

  const fleetScoreProps = React.useMemo(() => {
    const total = filteredByDateTransactions.length
    // Optimization score: TBD formula to include in-network vs out-of-network AND better location on route within tank range
    const inNetworkCount = filteredByDateTransactions.filter((t) => t.inNetwork).length
    const complianceRate =
      total > 0 ? Math.round((inNetworkCount / total) * 100) : 0
    const fullGrade = getFleetGrade(complianceRate)
    const gradeMatch = fullGrade.match(/^([A-F])([+-])?$/)
    const grade = gradeMatch ? gradeMatch[1] : "F"
    const gradeSuffix = gradeMatch?.[2]

    /** Missed savings = overpaid $ on out-of-network fill-ups only (matches Drivers page). High compliance => small missed $ */
    const overpaidTxns = filteredByDateTransactions.filter(
      (t) => !t.inNetwork && getOverpaidAmount(t) > 0
    )
    const rawSum = overpaidTxns.reduce((sum, t) => sum + getOverpaidAmount(t), 0)
    const overpaidFillUpCount = overpaidTxns.length
    const overpaidDriverCount = new Set(overpaidTxns.map((t) => t.driverName)).size
    /** When there are overpaid fill-ups, always show at least $1 so we never show "No missed savings" with "Across N fill-ups". */
    const missedSavings = overpaidFillUpCount > 0 ? Math.max(1, Math.round(rawSum)) : Math.round(rawSum)

    const comparison = getComparisonPeriod(dateRange)
    const prevOverpaid = comparison
      ? Math.round(
          getFuelTransactions()
            .filter((t) => isInDateRange(t, comparison.range))
            .filter((t) => !t.inNetwork && getOverpaidAmount(t) > 0)
            .reduce((sum, t) => sum + getOverpaidAmount(t), 0)
        )
      : 0
    const trendLabel = comparison ? `from ${comparison.label}` : "from last month"
    const missedSavingsTrend = comparison ? missedSavings - prevOverpaid : Math.round(missedSavings * -0.12)

    const prevPeriodTxns = comparison
      ? getFuelTransactions().filter((t) => isInDateRange(t, comparison.range))
      : []
    const prevInNetwork = prevPeriodTxns.filter((t) => t.inNetwork).length
    const prevComplianceRate =
      prevPeriodTxns.length > 0 ? Math.round((prevInNetwork / prevPeriodTxns.length) * 100) : complianceRate
    const optimizationTrend = comparison ? complianceRate - prevComplianceRate : undefined

    const trendData = [...fleetScoreCardMock.trendData]
    if (trendData.length > 0) trendData[trendData.length - 1] = { ...trendData[trendData.length - 1]!, value: complianceRate }

    return {
      grade,
      gradeSuffix,
      weekDate: fleetScoreCardMock.weekDate,
      complianceRate,
      totalTransactions: total,
      previousGrade: fleetScoreCardMock.previousGrade,
      targetGrade: fleetScoreCardMock.targetGrade,
      targetDate: fleetScoreCardMock.targetDate,
      missedSavings,
      overpaidFillUpCount,
      overpaidDriverCount,
      missedSavingsTrend,
      trendLabel,
      optimizationTrend,
      targetCompliancePercent: 80,
      additionalSavingsAtTarget: 8200,
      trendData,
    }
  }, [filteredByDateTransactions, dateRange])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Greeting + date range filter — eventually tie to actual user name */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {getGreeting()}, Pete
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            View fleet activity, fuel spend, and price trends at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={activePreset ?? "custom"}
            onValueChange={(v) => {
              const period = String(v) as PeriodTabValue
              if (period !== "today" && period !== "week" && period !== "month") return
              setPeriodTab(period)
              if (period === "today") setDateRange(getTodayRange())
              else if (period === "week") setDateRange(getThisWeekRange())
              else setDateRange(getThisMonthRange())
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
                    onClick={() => {
                      setPeriodTab(null)
                      setDateRange(getPresetRange(p.days))
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setPeriodTab(null)
                  setDateRange(range)
                }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Optimization gauge + Money on the table */}
      <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:px-6">
        <OptimizationGaugeCard
          size="sm"
          value={fleetScoreProps.complianceRate}
          trendFromLastMonth={fleetScoreProps.optimizationTrend}
          trendLabel={fleetScoreProps.trendLabel}
        />
        <Card size="sm" className="py-2">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base">Missed Savings</CardTitle>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="What is missed savings?"
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" strokeWidth={2} />
                    </button>
                  }
                />
                <TooltipContent side="top">
                  Potential savings with better fill-up choices
                </TooltipContent>
              </Tooltip>
            </div>
            <CardAction>
              <Badge variant="outline" className="gap-1.5 font-medium tabular-nums">
                {fleetScoreProps.missedSavingsTrend === 0
                  ? `No change ${fleetScoreProps.trendLabel}`
                  : `${fleetScoreProps.missedSavingsTrend > 0 ? "+" : "-"}$${Math.abs(fleetScoreProps.missedSavingsTrend).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${fleetScoreProps.trendLabel}`}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-1 pt-0">
            {fleetScoreProps.missedSavings > 0 || fleetScoreProps.overpaidFillUpCount > 0 ? (
              <>
                <p
                  className={
                    fleetScoreProps.complianceRate >= 90
                      ? "text-center text-3xl font-semibold tabular-nums text-green-600 dark:text-green-500"
                      : fleetScoreProps.complianceRate >= 50
                        ? "text-center text-3xl font-semibold tabular-nums text-yellow-600 dark:text-yellow-500"
                        : "text-center text-3xl font-semibold tabular-nums text-red-600 dark:text-red-500"
                  }
                >
                  ${fleetScoreProps.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No missed savings in this period; all fill-ups were at or better than optimal.
              </p>
            )}
            <p className="text-center text-xs font-normal text-muted-foreground">
              Across {fleetScoreProps.overpaidFillUpCount} fill-up{fleetScoreProps.overpaidFillUpCount === 1 ? "" : "s"} from {fleetScoreProps.overpaidDriverCount} driver{fleetScoreProps.overpaidDriverCount === 1 ? "" : "s"}
            </p>
            {(() => {
              const totalPotential = kpis.totalSavings + fleetScoreProps.missedSavings
              const savingsCapturePct = totalPotential > 0 ? (kpis.totalSavings / totalPotential) * 100 : 0
              if (totalPotential <= 0) return null
              const compliance = fleetScoreProps.complianceRate
              const trackClass =
                compliance >= 90
                  ? "bg-green-600 dark:bg-green-500"
                  : compliance >= 50
                    ? "bg-yellow-600 dark:bg-yellow-500"
                    : "bg-red-600 dark:bg-red-500"
              return (
                <div className="space-y-1 pt-2 w-[320px] max-w-full mx-auto shrink-0">
                  <Progress
                    value={compliance}
                    className={cn(
                      "h-2 w-full overflow-hidden rounded-full [&>div:last-child]:bg-green-600 [&>div:last-child]:dark:bg-green-500 [&>div:last-child]:border-r-2 [&>div:last-child]:border-white",
                      trackClass
                    )}
                    aria-label={`Compliance ${compliance}%; $${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} captured, $${fleetScoreProps.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} missed`}
                  />
                  <div className="flex items-center justify-between text-[length:var(--text-2xs)] text-muted-foreground">
                    <span>${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} captured</span>
                    <span>${fleetScoreProps.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} missed</span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Main grid: 2 cols as soon as @container/main has room for two 32.5rem cards (66rem) */}
      <div className="order-2 grid grid-cols-1 gap-4 px-4 lg:px-6 @[66rem]/main:grid-cols-2">
        {/* Drivers + Locations: single module with segmented control (Uber-style) */}
        <Card variant="flat" className="flex min-h-0 min-w-0 flex-col">
          <CardHeader className="flex flex-row items-start justify-between gap-2 shrink-0">
            <Tabs
              value={attentionTab}
              onValueChange={(v) => setAttentionTab(v as "drivers" | "locations")}
              className="w-full"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <TabsList className="h-8">
                  <TabsTrigger value="drivers" className="gap-1.5 text-xs">
                    <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                    Drivers
                  </TabsTrigger>
                  <TabsTrigger value="locations" className="gap-1.5 text-xs">
                    <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                    Locations
                  </TabsTrigger>
                </TabsList>
                <Link
                  href={attentionTab === "drivers" ? "/drivers" : "/locations"}
                  className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5 text-muted-foreground hover:text-foreground text-xs shrink-0" })}
                >
                  View all
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                </Link>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 pt-0">
            {attentionTab === "drivers" ? (
              driversInNeedOfAttention.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  🎉 No drivers in need of attention in this period.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {driversInNeedOfAttention.map((driver, index) => (
                  <Link
                    key={driver.driverName}
                    href={`/drivers/${driverNameToSlug(driver.driverName)}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{driver.driverName}</span>
                          {driver.badStops > 0 && (
                            <Badge variant="destructive" className="text-[10px] font-normal">
                              {driver.badStops} bad stop{driver.badStops !== 1 ? "s" : ""} {periodBadgeLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                        -${driver.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        aria-hidden
                      >
                        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                  ))}
                </div>
              )
            ) : locationsInNeedOfAttention.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No locations that need attention in this period.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {locationsInNeedOfAttention.map((loc, index) => (
                  <Link
                    key={loc.locationKey}
                    href={`/locations/${locationToSlug(loc.displayName)}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{loc.displayName}</span>
                          {loc.badStopsCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] font-normal">
                              {loc.badStopsCount} bad stop{loc.badStopsCount !== 1 ? "s" : ""} {periodBadgeLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                        -${loc.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:bg-amber-400"
                        aria-hidden
                      >
                        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallons by chain */}
        <Card variant="flat" className="flex min-h-0 min-w-0 flex-col">
          <CardHeader>
            <CardTitle>Gallons by Chain</CardTitle>
            <CardDescription>Total gallons purchased per station brand</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <div className="flex min-h-0 flex-col gap-6 sm:flex-row sm:items-center">
              <ChartContainer
                config={chainChartData.config}
                className="mx-auto aspect-square h-[220px] shrink-0"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" />}
                  />
                  <Pie
                    data={chainChartData.data}
                    dataKey="gallons"
                    nameKey="label"
                    innerRadius={68}
                    strokeWidth={2}
                  >
                    <Label
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
                                className="fill-foreground text-xl font-bold"
                              >
                                {chainChartData.total.toLocaleString("en-US")}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 22}
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

              <div className="flex flex-1 flex-col gap-2 text-sm min-w-0">
                {chainChartData.data.map((item) => {
                  const pct = ((item.gallons / chainChartData.total) * 100).toFixed(1)
                  return (
                    <div key={item.brand} className="flex items-center gap-2 min-w-0">
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: item.fill }}
                      />
                      <span className="truncate text-muted-foreground">{item.label}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{pct}%</span>
                        <span className="tabular-nums font-medium text-xs w-16 text-right">
                          {item.gallons.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI strip: flat row, Uber-style — tooltips show Diesel/Reefer/DEF breakdown */}
      <div className="order-1 px-4 lg:px-6">
        <StatStrip className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatStripItem
            tooltip={
              <div className="flex flex-col gap-0.5 text-xs">
                {[
                  { label: "Diesel", value: kpis.gallonsByType.Diesel },
                  { label: "Reefer", value: kpis.gallonsByType.Reefer },
                  { label: "DEF", value: kpis.gallonsByType.DEF },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">
                      {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            }
          >
            <StatStripLabel>Gallons Purchased</StatStripLabel>
            <StatStripValue className="text-xl">{kpis.totalGallons.toLocaleString("en-US", { maximumFractionDigits: 0 })}</StatStripValue>
          </StatStripItem>
          <StatStripItem
            tooltip={
              <div className="flex flex-col gap-0.5 text-xs">
                {[
                  { label: "Diesel", value: kpis.avgCostByType.Diesel },
                  { label: "Reefer", value: kpis.avgCostByType.Reefer },
                  { label: "DEF", value: kpis.avgCostByType.DEF },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            }
          >
            <StatStripLabel>Avg Cost / Gallon</StatStripLabel>
            <StatStripValue className="text-xl">${kpis.avgCostAll.toFixed(3)}</StatStripValue>
          </StatStripItem>
          <StatStripItem
            tooltip={
              <div className="flex flex-col gap-0.5 text-xs">
                {[
                  { label: "Diesel", value: kpis.avgSavingsByType.Diesel },
                  { label: "Reefer", value: kpis.avgSavingsByType.Reefer },
                  { label: "DEF", value: kpis.avgSavingsByType.DEF },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            }
          >
            <StatStripLabel>Avg Savings / Gallon</StatStripLabel>
            <StatStripValue className="text-xl">${kpis.avgSavingsAll.toFixed(3)}</StatStripValue>
          </StatStripItem>
          <StatStripItem
            tooltip={
              <div className="flex flex-col gap-0.5 text-xs">
                {[
                  { label: "Diesel", value: kpis.savingsByType.Diesel },
                  { label: "Reefer", value: kpis.savingsByType.Reefer },
                  { label: "DEF", value: kpis.savingsByType.DEF },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium text-green-600 dark:text-green-500">
                      ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            }
          >
            <StatStripLabel>Total Savings</StatStripLabel>
            <StatStripValue className="text-xl text-green-600 dark:text-green-500">
              ${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </StatStripValue>
          </StatStripItem>
          <StatStripItem
            tooltip={
              <div className="flex flex-col gap-0.5 text-xs">
                {[
                  { label: "Diesel", value: kpis.spentByType.Diesel },
                  { label: "Reefer", value: kpis.spentByType.Reefer },
                  { label: "DEF", value: kpis.spentByType.DEF },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-medium">
                      ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            }
          >
            <StatStripLabel>Total Spent</StatStripLabel>
            <StatStripValue className="text-xl">${kpis.totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}</StatStripValue>
          </StatStripItem>
        </StatStrip>
      </div>

    </div>
  )
}
