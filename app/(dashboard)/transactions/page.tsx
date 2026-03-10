"use client"

import * as React from "react"
import { fuelTransactions, STATION_BRANDS } from "@/lib/mock-data"
import type { FuelTransaction } from "@/lib/mock-data"
import { FuelTransactionTable, getEfficiencyStatus } from "@/components/fuel-transaction-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Label as RechartsLabel } from "recharts"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type EfficiencyFilter = "all" | "efficient" | "needs_attention"
type NetworkFilter = "all" | "in_network" | "out_of_network"

const spendingChartConfig = {
  gallons: { label: "Gallons", color: "var(--chart-1)" },
  gallonsChart: { label: "Gallons", color: "var(--chart-1)" },
  inNetworkGallonsChart: { label: "In network", color: "var(--chart-1)" },
  outOfNetworkGallonsChart: { label: "Out of network", color: "var(--chart-2)" },
} satisfies ChartConfig

const CHAIN_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function brandKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function buildGallonsByChainData() {
  const map = new Map<string, number>()
  for (const t of fuelTransactions) {
    map.set(t.stationBrand, (map.get(t.stationBrand) ?? 0) + t.gallons)
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 5)
  const otherGallons = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
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

function buildGallonsByStateData(): { state: string; gallons: number }[] {
  const map = new Map<string, number>()
  for (const t of fuelTransactions) {
    const state = t.location.includes(", ") ? t.location.split(", ")[1] ?? t.location : t.location
    map.set(state, (map.get(state) ?? 0) + t.gallons)
  }
  return [...map.entries()]
    .map(([state, gallons]) => ({ state, gallons: Math.round(gallons) }))
    .sort((a, b) => b.gallons - a.gallons)
}

const chainChartData = buildGallonsByChainData()
const stateChartData = buildGallonsByStateData()
const stateChartConfig = {
  gallons: { label: "Gallons", color: "var(--chart-1)" },
} satisfies ChartConfig

type SpendingRange = "1W" | "1M" | "6M" | "1Y" | "YTD"

interface SpendingPoint {
  date: string
  label: string
  cost: number
  gallons: number
  /** Scaled gallons for chart (realistic fleet volume). */
  gallonsChart: number
  /** Scaled in-network gallons (stacked segment). */
  inNetworkGallonsChart: number
  /** Scaled out-of-network gallons (stacked segment). */
  outOfNetworkGallonsChart: number
}

/** Scale factor so chart shows realistic fleet volumes (thousands of gal/month). */
const GALLONS_DISPLAY_SCALE = 28

const TODAY_DATE = "2026-03-06"

/** Monday of the week containing d (ISO date string YYYY-MM-DD). */
function getWeekStart(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const offset = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - offset)
  return date.toISOString().slice(0, 10)
}

function getSpendingData(
  transactions: FuelTransaction[],
  range: SpendingRange
): SpendingPoint[] {
  const today = new Date(TODAY_DATE)

  if (range === "1W") {
    const byDay = new Map<
      string,
      { cost: number; gallons: number; inNetworkGallons: number; outOfNetworkGallons: number }
    >()
    for (const t of transactions) {
      const dateStr = t.dateTime.slice(0, 10)
      const cur = byDay.get(dateStr) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      cur.cost += t.totalCost
      cur.gallons += t.gallons
      if (t.inNetwork) {
        cur.inNetworkGallons += t.gallons
      } else {
        cur.outOfNetworkGallons += t.gallons
      }
      byDay.set(dateStr, cur)
    }
    const result: SpendingPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const cur = byDay.get(dateStr) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      const inChart = Math.round(cur.inNetworkGallons * GALLONS_DISPLAY_SCALE)
      const outChart = Math.round(cur.outOfNetworkGallons * GALLONS_DISPLAY_SCALE)
      result.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cost: Math.round(cur.cost * 100) / 100,
        gallons: Math.round(cur.gallons * 10) / 10,
        gallonsChart: inChart + outChart,
        inNetworkGallonsChart: inChart,
        outOfNetworkGallonsChart: outChart,
      })
    }
    return result
  }

  if (range === "1M") {
    const byWeek = new Map<
      string,
      { cost: number; gallons: number; inNetworkGallons: number; outOfNetworkGallons: number }
    >()
    for (const t of transactions) {
      const weekStart = getWeekStart(new Date(t.dateTime.slice(0, 10)))
      const cur = byWeek.get(weekStart) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      cur.cost += t.totalCost
      cur.gallons += t.gallons
      if (t.inNetwork) {
        cur.inNetworkGallons += t.gallons
      } else {
        cur.outOfNetworkGallons += t.gallons
      }
      byWeek.set(weekStart, cur)
    }
    const result: SpendingPoint[] = []
    const thisWeekStart = getWeekStart(today)
    for (let i = 4; i >= 1; i--) {
      const d = new Date(thisWeekStart)
      d.setDate(d.getDate() - i * 7)
      const weekStr = d.toISOString().slice(0, 10)
      const cur = byWeek.get(weekStr) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      const inChart = Math.round(cur.inNetworkGallons * GALLONS_DISPLAY_SCALE)
      const outChart = Math.round(cur.outOfNetworkGallons * GALLONS_DISPLAY_SCALE)
      result.push({
        date: weekStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cost: Math.round(cur.cost * 100) / 100,
        gallons: Math.round(cur.gallons * 10) / 10,
        gallonsChart: inChart + outChart,
        inNetworkGallonsChart: inChart,
        outOfNetworkGallonsChart: outChart,
      })
    }
    return result
  }

  const byMonth = new Map<
    string,
    { cost: number; gallons: number; inNetworkGallons: number; outOfNetworkGallons: number }
  >()
  for (const t of transactions) {
    const monthKey = t.dateTime.slice(0, 7)
    const cur = byMonth.get(monthKey) ?? {
      cost: 0,
      gallons: 0,
      inNetworkGallons: 0,
      outOfNetworkGallons: 0,
    }
    cur.cost += t.totalCost
    cur.gallons += t.gallons
    if (t.inNetwork) {
      cur.inNetworkGallons += t.gallons
    } else {
      cur.outOfNetworkGallons += t.gallons
    }
    byMonth.set(monthKey, cur)
  }

  if (range === "6M") {
    const result: SpendingPoint[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = d.toISOString().slice(0, 7)
      const cur = byMonth.get(monthKey) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      const inChart = Math.round(cur.inNetworkGallons * GALLONS_DISPLAY_SCALE)
      const outChart = Math.round(cur.outOfNetworkGallons * GALLONS_DISPLAY_SCALE)
      result.push({
        date: monthKey,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        cost: Math.round(cur.cost * 100) / 100,
        gallons: Math.round(cur.gallons * 10) / 10,
        gallonsChart: inChart + outChart,
        inNetworkGallonsChart: inChart,
        outOfNetworkGallonsChart: outChart,
      })
    }
    return result
  }

  if (range === "1Y") {
    const result: SpendingPoint[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = d.toISOString().slice(0, 7)
      const cur = byMonth.get(monthKey) ?? {
        cost: 0,
        gallons: 0,
        inNetworkGallons: 0,
        outOfNetworkGallons: 0,
      }
      const inChart = Math.round(cur.inNetworkGallons * GALLONS_DISPLAY_SCALE)
      const outChart = Math.round(cur.outOfNetworkGallons * GALLONS_DISPLAY_SCALE)
      result.push({
        date: monthKey,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        cost: Math.round(cur.cost * 100) / 100,
        gallons: Math.round(cur.gallons * 10) / 10,
        gallonsChart: inChart + outChart,
        inNetworkGallonsChart: inChart,
        outOfNetworkGallonsChart: outChart,
      })
    }
    return result
  }

  // YTD: Jan through current month
  const result: SpendingPoint[] = []
  for (let m = 0; m <= today.getMonth(); m++) {
    const d = new Date(today.getFullYear(), m, 1)
    const monthKey = d.toISOString().slice(0, 7)
    const cur = byMonth.get(monthKey) ?? {
      cost: 0,
      gallons: 0,
      inNetworkGallons: 0,
      outOfNetworkGallons: 0,
    }
    const inChart = Math.round(cur.inNetworkGallons * GALLONS_DISPLAY_SCALE)
    const outChart = Math.round(cur.outOfNetworkGallons * GALLONS_DISPLAY_SCALE)
    result.push({
      date: monthKey,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      cost: Math.round(cur.cost * 100) / 100,
      gallons: Math.round(cur.gallons * 10) / 10,
      gallonsChart: inChart + outChart,
      inNetworkGallonsChart: inChart,
      outOfNetworkGallonsChart: outChart,
    })
  }
  return result
}

function SpendingTrendsCard() {
  const [range, setRange] = React.useState<SpendingRange>("1Y")
  const data = React.useMemo(
    () => getSpendingData(fuelTransactions, range),
    [range]
  )

  return (
    <Card className="@container/card md:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Gallons purchased</CardTitle>
            <CardDescription>
              {range === "1W" && "Gallons per day, last 7 days"}
              {range === "1M" && "Gallons per week, last month"}
              {range === "6M" && "Gallons per month, last 6 months"}
              {range === "1Y" && "Gallons per month, last 12 months"}
              {range === "YTD" && "Gallons per month, Jan–current"}
            </CardDescription>
          </div>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[range]}
            onValueChange={(v) => {
              if (v[0]) setRange(v[0] as SpendingRange)
            }}
          >
            {(["1W", "1M", "6M", "1Y", "YTD"] as SpendingRange[]).map((r) => (
              <ToggleGroupItem key={r} value={r}>
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-2 pb-4 sm:px-6">
        <ChartContainer
          config={spendingChartConfig}
          className="min-h-0 flex-1 w-full aspect-[2/1] @sm:aspect-[3/1] @lg:aspect-[4/1]"
        >
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={data.length > 6 ? -35 : 0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toLocaleString()}k` : String(v)
              }
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as SpendingPoint | undefined
                    if (!p) return ""
                    const total = p.inNetworkGallonsChart + p.outOfNetworkGallonsChart
                    return `${p.label} · Total: ${total.toLocaleString("en-US")} gal`
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="inNetworkGallonsChart"
              name="inNetworkGallonsChart"
              stackId="gallons"
              fill="var(--chart-1)"
              radius={[0, 0, 0, 4]}
            />
            <Bar
              dataKey="outOfNetworkGallonsChart"
              name="outOfNetworkGallonsChart"
              stackId="gallons"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const driverNames = [...new Set(fuelTransactions.map((t) => t.driverName))].sort()
const stateList = [
  ...new Set(
    fuelTransactions.map((t) =>
      t.location.includes(", ") ? (t.location.split(", ")[1] ?? t.location) : t.location
    )
  ),
].sort()

export default function TransactionsPage() {
  const [driverFilter, setDriverFilter] = React.useState<string>("all")
  const [stationFilter, setStationFilter] = React.useState<string>("all")
  const [stateFilter, setStateFilter] = React.useState<string>("all")
  const [alertsOnly, setAlertsOnly] = React.useState(false)
  const [efficiencyFilter, setEfficiencyFilter] = React.useState<EfficiencyFilter>("all")
  const [networkFilter, setNetworkFilter] = React.useState<NetworkFilter>("all")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const filtered = React.useMemo(() => {
    return fuelTransactions.filter((t) => {
      if (alertsOnly && !t.alert) return false
      if (driverFilter !== "all" && t.driverName !== driverFilter) return false
      if (stationFilter !== "all" && t.stationBrand !== stationFilter) return false
      if (stateFilter !== "all") {
        const state = t.location.includes(", ") ? (t.location.split(", ")[1] ?? t.location) : t.location
        if (state !== stateFilter) return false
      }
      if (efficiencyFilter !== "all") {
        const status = getEfficiencyStatus(t)
        if (efficiencyFilter === "efficient" && status !== "efficient") return false
        if (efficiencyFilter === "needs_attention" && status !== "needs_attention") return false
      }
      if (networkFilter !== "all") {
        if (networkFilter === "in_network" && !t.inNetwork) return false
        if (networkFilter === "out_of_network" && t.inNetwork) return false
      }
      const tDate = new Date(t.dateTime).getTime()
      if (dateFrom && tDate < new Date(dateFrom).getTime()) return false
      if (dateTo && tDate > new Date(dateTo).getTime() + 86400000) return false
      return true
    })
  }, [driverFilter, stationFilter, stateFilter, alertsOnly, efficiencyFilter, networkFilter, dateFrom, dateTo])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Fuel Transactions</h2>
        <p className="text-xs text-muted-foreground">
          Filter and review recent fuel transactions
        </p>
      </div>

      <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6">
        <SpendingTrendsCard />

        {/* Gallons by chain — pie chart */}
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Gallons by chain</CardTitle>
            <CardDescription>Total gallons purchased per station brand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ChartContainer
                config={chainChartData.config}
                className="mx-auto aspect-square h-[200px] shrink-0"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" formatter={(v) => v.toLocaleString("en-US")} />}
                  />
                  <Pie
                    data={chainChartData.data}
                    dataKey="gallons"
                    nameKey="label"
                    innerRadius={56}
                    strokeWidth={2}
                  >
                    {chainChartData.data.map((entry, i) => (
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
                                {chainChartData.total.toLocaleString("en-US")}
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
              <div className="flex flex-1 flex-col gap-1.5 text-sm min-w-0">
                {chainChartData.data.map((item) => {
                  const pct = ((item.gallons / chainChartData.total) * 100).toFixed(1)
                  return (
                    <div key={item.brand} className="flex items-center gap-2 min-w-0">
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: item.fill }}
                      />
                      <span className="truncate text-muted-foreground text-xs">{item.label}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{pct}%</span>
                        <span className="tabular-nums font-medium text-xs w-14 text-right">
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

        {/* Gallons by state — horizontal bar chart */}
        <Card className="@container/card flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle>Gallons by state</CardTitle>
            <CardDescription>Total gallons purchased per state</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto max-h-[min(50vh,420px)]">
              <ChartContainer
                config={stateChartConfig}
                className="w-full"
                style={{ minHeight: Math.max(280, stateChartData.length * 32) }}
              >
                <BarChart
                  data={stateChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  barCategoryGap={4}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={6} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString()}k` : String(v))} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => value != null ? value.toLocaleString("en-US") : ""}
                        nameKey="state"
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload as { state: string; gallons: number } | undefined
                          return p ? `${p.state} · ${p.gallons.toLocaleString("en-US")} gal` : ""
                        }}
                      />
                    }
                  />
                  <Bar dataKey="gallons" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined filters + table */}
      <Card className="mx-4 md:col-span-2 lg:mx-6">
        <CardHeader className="border-b">
          <CardTitle className="text-xs">Filters</CardTitle>
          <CardDescription>Narrow by date, driver, station, state, network, or alerts</CardDescription>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Date from</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-w-0"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Date to</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-w-0"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Driver</Label>
              <Select value={driverFilter} onValueChange={(v) => setDriverFilter(v ?? "all")}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All drivers</SelectItem>
                  {driverNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Station brand</Label>
              <Select value={stationFilter} onValueChange={(v) => setStationFilter(v ?? "all")}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stations</SelectItem>
                  {STATION_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">State</Label>
              <Select value={stateFilter} onValueChange={(v) => setStateFilter(v ?? "all")}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {stateList.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Network</Label>
              <Select value={networkFilter} onValueChange={(v) => setNetworkFilter((v ?? "all") as NetworkFilter)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in_network">In network</SelectItem>
                  <SelectItem value="out_of_network">Out of network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Efficiency</Label>
              <Select
                value={efficiencyFilter}
                onValueChange={(v) => setEfficiencyFilter((v ?? "all") as EfficiencyFilter)}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="efficient">Efficient only</SelectItem>
                  <SelectItem value="needs_attention">Needs attention only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label className="text-xs">Alerts</Label>
              <div className="flex h-7 items-center">
                <Checkbox
                  id="alerts"
                  checked={alertsOnly}
                  onCheckedChange={(c) => setAlertsOnly(!!c)}
                />
                <Label htmlFor="alerts" className="cursor-pointer pl-2 text-xs">
                  Show only alerts
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <FuelTransactionTable
            transactions={filtered}
            maxRows={50}
            emptyDescription="No transactions match your filters. Try a broader date range or different filters."
          />
        </CardContent>
      </Card>
    </div>
  )
}
