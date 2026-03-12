"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { type DateRange } from "react-day-picker"
import {
  dashboardKpis,
  fuelTransactions,
  fuelPriceHistory,
  type FuelPricePoint,
} from "@/lib/mock-data"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

const FuelTransactionTable = dynamic(
  () =>
    import("@/components/fuel-transaction-table").then((m) => ({
      default: m.FuelTransactionTable,
    })),
  { ssr: false, loading: () => <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">Loading table…</div> }
)
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

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

function buildChainData() {
  const map = new Map<string, number>()
  for (const t of fuelTransactions) {
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

const chainChartData = buildChainData()

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

export default function DashboardPage() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    getPresetRange(30)
  )

  const recentTxns = React.useMemo(() => {
    return fuelTransactions
      .filter((t) => {
        if (t.inNetwork) return false
        const tDate = new Date(t.dateTime).getTime()
        if (dateRange?.from && tDate < dateRange.from.getTime()) return false
        if (dateRange?.to && tDate > dateRange.to.getTime() + 86400000) return false
        return true
      })
      .slice(0, 10)
  }, [dateRange])

  const kpis = React.useMemo(() => {
    const byType = (type: "Diesel" | "Reefer" | "DEF") =>
      fuelTransactions.filter((t) => t.fuelType === type)

    const avgCost = (txns: typeof fuelTransactions) =>
      txns.length ? txns.reduce((s, t) => s + t.pricePerGallon, 0) / txns.length : 0

    const avgSavingsPerGal = (txns: typeof fuelTransactions) =>
      txns.length
        ? txns.reduce((s, t) => s + t.savedAmount / t.gallons, 0) / txns.length
        : 0

    const dieselTxns = byType("Diesel")
    const reeferTxns = byType("Reefer")
    const defTxns = byType("DEF")

    return {
      totalGallons: fuelTransactions.reduce((s, t) => s + t.gallons, 0),
      gallonsByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.gallons, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.gallons, 0),
        DEF: defTxns.reduce((s, t) => s + t.gallons, 0),
      },
      avgCostAll: avgCost(fuelTransactions),
      avgCostByType: {
        Diesel: avgCost(dieselTxns),
        Reefer: avgCost(reeferTxns),
        DEF: avgCost(defTxns),
      },
      avgSavingsAll: avgSavingsPerGal(fuelTransactions),
      avgSavingsByType: {
        Diesel: avgSavingsPerGal(dieselTxns),
        Reefer: avgSavingsPerGal(reeferTxns),
        DEF: avgSavingsPerGal(defTxns),
      },
      totalSavings: fuelTransactions.reduce((s, t) => s + t.savedAmount, 0),
      savingsByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.savedAmount, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.savedAmount, 0),
        DEF: defTxns.reduce((s, t) => s + t.savedAmount, 0),
      },
      totalSpent: fuelTransactions.reduce((s, t) => s + t.totalCost, 0),
      spentByType: {
        Diesel: dieselTxns.reduce((s, t) => s + t.totalCost, 0),
        Reefer: reeferTxns.reduce((s, t) => s + t.totalCost, 0),
        DEF: defTxns.reduce((s, t) => s + t.totalCost, 0),
      },
    }
  }, [])

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
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline" className="h-9 gap-2 text-sm font-normal" />}
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

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-5 lg:px-6">
        {/* Gallons */}
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gallons Purchased</CardTitle>
            <div className="text-2xl font-bold tabular-nums">
              {kpis.totalGallons.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.gallonsByType.Diesel },
                { label: "Reefer", value: kpis.gallonsByType.Reefer },
                { label: "DEF", value: kpis.gallonsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">
                    {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Cost */}
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Cost / Gallon</CardTitle>
            <div className="text-2xl font-bold tabular-nums">
              ${kpis.avgCostAll.toFixed(3)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.avgCostByType.Diesel },
                { label: "Reefer", value: kpis.avgCostByType.Reefer },
                { label: "DEF", value: kpis.avgCostByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Savings */}
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Savings / Gallon</CardTitle>
            <div className="text-2xl font-bold tabular-nums">
              ${kpis.avgSavingsAll.toFixed(3)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.avgSavingsByType.Diesel },
                { label: "Reefer", value: kpis.avgSavingsByType.Reefer },
                { label: "DEF", value: kpis.avgSavingsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Savings</CardTitle>
            <div className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-500">
              ${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.savingsByType.Diesel },
                { label: "Reefer", value: kpis.savingsByType.Reefer },
                { label: "DEF", value: kpis.savingsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium text-green-600 dark:text-green-500">
                    ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Spent</CardTitle>
            <div className="text-2xl font-bold tabular-nums">
              ${kpis.totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.spentByType.Diesel },
                { label: "Reefer", value: kpis.spentByType.Reefer },
                { label: "DEF", value: kpis.spentByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">
                    ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main grid: 2 cols as soon as @container/main has room for two 32.5rem cards (66rem) */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @[66rem]/main:grid-cols-2">
        {/* Gallons by chain */}
        <Card className="flex min-h-0 min-w-0 flex-col">
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
                        <span className="tabular-nums font-medium w-16 text-right">
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

        {/* Fuel price trends */}
        <FuelPriceTrendsCard />

        {/* Transactions that need attention */}
        <Card className="col-span-full @[66rem]/main:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Transactions that need attention</CardTitle>
              <CardDescription>Review recent out-of-network transactions</CardDescription>
            </div>
            <Link
              href="/transactions"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              See all transactions
            </Link>
          </CardHeader>
          <CardContent>
            <FuelTransactionTable
              transactions={recentTxns}
              maxRows={10}
              emptyTitle="No transactions needing attention"
              emptyDescription="All recent transactions are in network or efficient."
              emptyAction={
                <Link
                  href="/transactions"
                  className={buttonVariants({ variant: "link", size: "sm" })}
                >
                  View all transactions
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
