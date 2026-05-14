"use client"

import * as React from "react"
import Link from "next/link"
import { type DateRange } from "react-day-picker"
import {
  getFuelTransactions,
  fuelPriceHistory,
  type FuelPricePoint,
} from "@/lib/mock-data"
import {
  getThisMonthRange,
  getThisWeekRange,
  getYesterdayRange,
  isExactlyYesterdayRange,
  rangeMatches,
  type PeriodTabValue,
} from "@/lib/date-range-presets"
import {
  buildChainChartData,
  computeDashboardKpis,
  computeFleetScoreProps,
  isTransactionInDateRange,
} from "@/lib/dashboard-metrics"
import { driverNameToSlug, getDriversNeedingAttention } from "@/lib/driver-utils"
import { getLocationListStats, locationToSlug } from "@/lib/location-utils"
import { DateRangePresetTabs, DATE_RANGE_PRESET_BAR_PADDING } from "@/components/date-range-preset-tabs"
import { OptimizationGaugeCard } from "@/components/optimization-gauge-card"
import { ImprovementAttentionDrawer } from "@/components/improvement-attention-drawer"
import { DriverFillUpsBlock } from "@/components/driver-fill-ups-block"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon, Calendar01Icon, ArrowRight01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons"
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
import { MapPin, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useIsMobile } from "@/hooks/use-mobile"

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

const kpiTooltipContentClasses =
  "min-w-[8rem] rounded-md bg-foreground px-3 py-1.5 text-xs text-background"

/** Matches StatStripItem hover (`hover:bg-muted/80`); glass/teal override in app/styles. */
const kpiDashboardCardClassName =
  "w-full min-w-0 cursor-pointer transition-colors hover:bg-muted/80"

/** One grid cell per KPI: Popover.Root has no DOM node; active Popover.Trigger injects FocusGuards as siblings of the button — without a wrapper they become extra grid items and collapse column widths. */
const kpiGridCellClassName = "min-w-0 w-full"

/** Last KPI (Total Savings): full width on 2-col layout; single column in lg 5-up row. */
const kpiGridCellLastClassName = cn(kpiGridCellClassName, "col-span-2 lg:col-span-1")

function KpiBreakdownTooltipCard({
  tooltip,
  ariaLabel,
  children,
}: {
  tooltip: React.ReactNode
  ariaLabel: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const desktopTriggerClass =
    "w-full min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const mobileTriggerClass = cn(
    desktopTriggerClass,
    "flex min-h-[44px] w-full min-w-0 cursor-pointer items-stretch border-0 bg-transparent p-0 text-left"
  )

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <button type="button" className={mobileTriggerClass} aria-label={ariaLabel}>
              {children}
            </button>
          }
        />
        <PopoverContent
          side="top"
          align="center"
          className={cn("w-fit flex-col gap-0 p-0 ring-0", kpiTooltipContentClasses)}
        >
          {tooltip}
        </PopoverContent>
      </Popover>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className={desktopTriggerClass} tabIndex={0} aria-label={ariaLabel}>
            {children}
          </div>
        }
      />
      <TooltipContent side="top" className={kpiTooltipContentClasses}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

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

export type DashboardVariant = "fleet" | "myPerformance"

export type DashboardDefaultProps = {
  variant?: DashboardVariant
  /** Required when variant is myPerformance; must match mock `driverName` on transactions. */
  driverName?: string
}

const STOP_EFFICIENCY_TOOLTIP =
  "Stop efficiency is the percentage of your fill-ups at optimized in-network locations—the best price for your route. A higher score means more of your stops captured the best available price."

export function DashboardDefault({ variant = "fleet", driverName }: DashboardDefaultProps = {}) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )
  /** Track which period tab is selected so clicks update UI immediately; null = derive from dateRange (e.g. after calendar pick). */
  const [, setPeriodTab] = React.useState<PeriodTabValue | null>("week")
  const [missedSavingsDrawerOpen, setMissedSavingsDrawerOpen] = React.useState(false)
  const [attentionTab, setAttentionTab] = React.useState<"drivers" | "locations">("drivers")

  const transactionsForMetrics = React.useMemo(() => {
    const byDate = getFuelTransactions().filter((t) => isTransactionInDateRange(t, dateRange))
    if (variant === "myPerformance" && driverName) {
      return byDate.filter((t) => t.driverName === driverName)
    }
    return byDate
  }, [dateRange, variant, driverName])

  /** Drivers needing attention = below 60% efficiency in period (same definition as Driver Insights). Top 5 by missed savings. */
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

  const gaugeImprovementDrivers = React.useMemo(() => {
    if (variant === "myPerformance" && driverName) {
      return driversInNeedOfAttention.filter((d) => d.driverName === driverName)
    }
    return driversInNeedOfAttention
  }, [variant, driverName, driversInNeedOfAttention])

  const filteredByDateTransactions = transactionsForMetrics

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
    isExactlyYesterdayRange(dateRange)
      ? "yesterday"
      : rangeMatches(dateRange, "week")
        ? "week"
        : rangeMatches(dateRange, "month")
          ? "month"
          : null

  const periodLabel =
    isExactlyYesterdayRange(dateRange)
      ? "yesterday"
      : rangeMatches(dateRange, "week")
        ? "week"
        : rangeMatches(dateRange, "month")
          ? "month"
          : "period"
  const periodBadgeLabel =
    periodLabel === "yesterday"
      ? "yesterday"
      : periodLabel === "week"
        ? "this week"
        : periodLabel === "month"
          ? "this month"
          : "this period"

  const kpis = React.useMemo(
    () => computeDashboardKpis(filteredByDateTransactions),
    [filteredByDateTransactions]
  )

  const chainChartData = React.useMemo(
    () => buildChainChartData(filteredByDateTransactions),
    [filteredByDateTransactions]
  )

  const fleetScoreProps = React.useMemo(
    () =>
      computeFleetScoreProps(filteredByDateTransactions, dateRange, {
        driverName: variant === "myPerformance" ? driverName : undefined,
      }),
    [filteredByDateTransactions, dateRange, variant, driverName]
  )

  const gaugeImprovementLocations =
    variant === "myPerformance" ? ([] as typeof locationsInNeedOfAttention) : locationsInNeedOfAttention

  const viewerFirstName =
    variant === "myPerformance" && driverName
      ? (driverName.split(/\s+/)[0] ?? driverName)
      : "Pete"

  return (
    <div className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6", DATE_RANGE_PRESET_BAR_PADDING)}>
      {/* Greeting + date range filter — eventually tie to actual user name */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {getGreeting()}, {viewerFirstName}
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            {variant === "myPerformance"
              ? "Your fuel spend, stops, and savings for the selected period."
              : "View fleet activity, fuel spend, and price trends at a glance."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePresetTabs
            value={activePreset ?? "custom"}
            onValueChange={(v) => {
              const period = String(v) as PeriodTabValue
              if (period !== "yesterday" && period !== "week" && period !== "month") return
              setPeriodTab(period)
              if (period === "yesterday") setDateRange(getYesterdayRange())
              else if (period === "week") setDateRange(getThisWeekRange())
              else setDateRange(getThisMonthRange())
            }}
          />
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={activePreset === null ? "default" : "outline"}
                  className="inline-flex h-9 gap-2 text-sm font-normal"
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
          value={fleetScoreProps.efficiencyRate}
          trendFromLastMonth={fleetScoreProps.optimizationTrend}
          trendLabel={fleetScoreProps.trendLabel}
          cardTitle={variant === "myPerformance" ? "Stop efficiency" : undefined}
          efficiencyInfoAriaLabel={
            variant === "myPerformance" ? "What is stop efficiency?" : undefined
          }
          efficiencyTooltipText={variant === "myPerformance" ? STOP_EFFICIENCY_TOOLTIP : undefined}
          {...(variant === "myPerformance"
            ? {}
            : {
                improvementData: {
                  drivers: gaugeImprovementDrivers,
                  locations: gaugeImprovementLocations,
                },
                periodLabel,
                hasRoomForImprovement: fleetScoreProps.efficiencyRate < 90,
              })}
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
                <TooltipContent side="top" className="max-w-sm">
                  Missed savings is the dollar amount overpaid when drivers could have filled up at a cheaper location. It counts only fill-ups where a better-priced option was available on the route.
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
                    fleetScoreProps.efficiencyRate >= 90
                      ? "text-center text-3xl font-semibold tabular-nums text-green-600 dark:text-green-500"
                      : fleetScoreProps.efficiencyRate >= 50
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
              {variant === "myPerformance"
                ? `Across ${fleetScoreProps.overpaidFillUpCount} of your fill-up${fleetScoreProps.overpaidFillUpCount === 1 ? "" : "s"}`
                : `Across ${fleetScoreProps.overpaidFillUpCount} fill-up${fleetScoreProps.overpaidFillUpCount === 1 ? "" : "s"} from ${fleetScoreProps.overpaidDriverCount} driver${fleetScoreProps.overpaidDriverCount === 1 ? "" : "s"}`}
            </p>
            {(() => {
              const totalPotential = kpis.totalSavings + fleetScoreProps.missedSavings
              const savingsCapturePct = totalPotential > 0 ? (kpis.totalSavings / totalPotential) * 100 : 0
              if (totalPotential <= 0) return null
              const efficiency = fleetScoreProps.efficiencyRate
              const trackClass =
                efficiency >= 90
                  ? "bg-green-600 dark:bg-green-500"
                  : efficiency >= 50
                    ? "bg-yellow-600 dark:bg-yellow-500"
                    : "bg-red-600 dark:bg-red-500"
              return (
                <div className="space-y-1 pt-2 w-[320px] max-w-full mx-auto shrink-0">
                  <Progress
                    value={efficiency}
                    className={cn(
                      "h-2 w-full overflow-hidden rounded-full [&>div:last-child]:bg-green-600 [&>div:last-child]:dark:bg-green-500 [&>div:last-child]:border-r-2 [&>div:last-child]:border-white",
                      trackClass
                    )}
                    aria-label={`Efficiency ${efficiency}%; $${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} captured, $${fleetScoreProps.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} missed`}
                  />
                  <div className="flex items-center justify-between text-[length:var(--text-2xs)] text-muted-foreground">
                    <span>${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} captured</span>
                    <span>${fleetScoreProps.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })} missed</span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
          {(fleetScoreProps.missedSavings > 0 || fleetScoreProps.overpaidFillUpCount > 0) &&
            (gaugeImprovementDrivers.length > 0 || gaugeImprovementLocations.length > 0) && (
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] w-full"
                onClick={() => setMissedSavingsDrawerOpen(true)}
              >
                How to save more
              </Button>
              <ImprovementAttentionDrawer
                open={missedSavingsDrawerOpen}
                onOpenChange={setMissedSavingsDrawerOpen}
                drivers={gaugeImprovementDrivers}
                locations={gaugeImprovementLocations}
                periodLabel={periodLabel}
                source="missedSavings"
              />
            </CardFooter>
          )}
        </Card>
      </div>

      {/* KPI row: 2 per row on phone; last card full width (col-span-2); 5 cols on lg — hover/tap for Diesel/Reefer/DEF */}
      <div
        data-dashboard-kpi-row
        className="grid grid-cols-2 gap-2 px-4 sm:gap-4 lg:grid-cols-5 lg:px-6"
      >
        <div className={kpiGridCellClassName}>
        <KpiBreakdownTooltipCard
          ariaLabel="Gallons purchased by fuel type: Diesel, Reefer, DEF"
          tooltip={
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.gallonsByType.Diesel },
                { label: "Reefer", value: kpis.gallonsByType.Reefer },
                { label: "DEF", value: kpis.gallonsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-background/80">{label}</span>
                  <span className="tabular-nums font-medium">
                    {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <Card size="sm" className={kpiDashboardCardClassName}>
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Gallons Purchased</CardTitle>
              <div className="text-3xl font-bold tabular-nums">
                {kpis.totalGallons.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </CardHeader>
          </Card>
        </KpiBreakdownTooltipCard>
        </div>

        <div className={kpiGridCellClassName}>
        <KpiBreakdownTooltipCard
          ariaLabel="Average cost per gallon by fuel type: Diesel, Reefer, DEF"
          tooltip={
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.avgCostByType.Diesel },
                { label: "Reefer", value: kpis.avgCostByType.Reefer },
                { label: "DEF", value: kpis.avgCostByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-background/80">{label}</span>
                  <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                </div>
              ))}
            </div>
          }
        >
          <Card size="sm" className={kpiDashboardCardClassName}>
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Cost / Gallon</CardTitle>
              <div className="text-3xl font-bold tabular-nums">${kpis.avgCostAll.toFixed(3)}</div>
            </CardHeader>
          </Card>
        </KpiBreakdownTooltipCard>
        </div>

        <div className={kpiGridCellClassName}>
        <KpiBreakdownTooltipCard
          ariaLabel="Average savings per gallon by fuel type: Diesel, Reefer, DEF"
          tooltip={
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.avgSavingsByType.Diesel },
                { label: "Reefer", value: kpis.avgSavingsByType.Reefer },
                { label: "DEF", value: kpis.avgSavingsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-background/80">{label}</span>
                  <span className="tabular-nums font-medium">${value.toFixed(3)}</span>
                </div>
              ))}
            </div>
          }
        >
          <Card size="sm" className={kpiDashboardCardClassName}>
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Savings / Gallon</CardTitle>
              <div className="text-3xl font-bold tabular-nums">${kpis.avgSavingsAll.toFixed(3)}</div>
            </CardHeader>
          </Card>
        </KpiBreakdownTooltipCard>
        </div>

        <div className={kpiGridCellClassName}>
        <KpiBreakdownTooltipCard
          ariaLabel="Total spent by fuel type: Diesel, Reefer, DEF"
          tooltip={
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.spentByType.Diesel },
                { label: "Reefer", value: kpis.spentByType.Reefer },
                { label: "DEF", value: kpis.spentByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-background/80">{label}</span>
                  <span className="tabular-nums font-medium">
                    ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <Card size="sm" className={kpiDashboardCardClassName}>
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Spent</CardTitle>
              <div className="text-3xl font-bold tabular-nums">
                ${kpis.totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </CardHeader>
          </Card>
        </KpiBreakdownTooltipCard>
        </div>

        <div className={kpiGridCellLastClassName}>
        <KpiBreakdownTooltipCard
          ariaLabel="Total savings by fuel type: Diesel, Reefer, DEF"
          tooltip={
            <div className="flex flex-col gap-0.5 text-xs">
              {[
                { label: "Diesel", value: kpis.savingsByType.Diesel },
                { label: "Reefer", value: kpis.savingsByType.Reefer },
                { label: "DEF", value: kpis.savingsByType.DEF },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-background/80">{label}</span>
                  <span className="tabular-nums font-medium text-green-600 dark:text-green-500">
                    ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <Card
            size="sm"
            className={cn(kpiDashboardCardClassName, "text-center lg:text-start")}
          >
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Savings
              </CardTitle>
              <div className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-500">
                ${kpis.totalSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </CardHeader>
          </Card>
        </KpiBreakdownTooltipCard>
        </div>
      </div>

      {/* Main grid: attention module + gallons — 2 cols at @[66rem]/main (matches Uber layout) */}
      <div
        data-dashboard-main-grid
        className="grid grid-cols-1 gap-4 px-4 lg:px-6 @[66rem]/main:grid-cols-2"
      >
        {variant === "myPerformance" ? (
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          {driverName ? (
            <>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-lg font-semibold tracking-tight">Transactions &amp; fill-up locations</h2>
                <p className="text-muted-foreground text-xs">
                  Same period as the date filters at the top of the page.
                </p>
              </div>
              <DriverFillUpsBlock
                transactions={filteredByDateTransactions}
                tableDescription={
                  <>
                    Your transactions in the selected date range. Click a row to highlight it on the map.
                  </>
                }
              />
            </>
          ) : null}
        </div>
        ) : (
        <Card variant="flat" className="flex min-h-0 min-w-0 flex-col">
          <Tabs
            value={attentionTab}
            onValueChange={(v) => {
              const next = String(v)
              if (next === "drivers" || next === "locations") setAttentionTab(next)
            }}
            className="w-full min-w-0"
          >
            <CardHeader className="mb-4 shrink-0">
              <CardTitle className="mb-2">In need of attention</CardTitle>
              <div className="flex w-full items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="drivers">
                    <Users />
                    Drivers
                  </TabsTrigger>
                  <TabsTrigger value="locations">
                    <MapPin />
                    Locations
                  </TabsTrigger>
                </TabsList>
                <Link
                  href={attentionTab === "drivers" ? "/drivers" : "/locations"}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className:
                      "min-h-11 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:min-h-8",
                  })}
                >
                  View all
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pt-0">
              <TabsContent value="drivers">
                {driversInNeedOfAttention.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    🎉 No drivers in need of attention in this period.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {driversInNeedOfAttention.map((driver, index) => (
                      <Link
                        key={driver.driverName}
                        href={`/drivers/${driverNameToSlug(driver.driverName)}`}
                        className="flex items-center justify-between gap-4 py-3 text-foreground first:pt-0 last:pb-0 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
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
                          <span className="font-medium tabular-nums text-red-600 dark:text-red-500">
                            -${driver.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </span>
                          <span
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning"
                            aria-hidden
                          >
                            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="locations">
                {locationsInNeedOfAttention.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No locations that need attention in this period.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {locationsInNeedOfAttention.map((loc, index) => (
                      <Link
                        key={loc.locationKey}
                        href={`/locations/${locationToSlug(loc.displayName)}`}
                        className="flex items-center justify-between gap-4 py-3 text-foreground first:pt-0 last:pb-0 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
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
                          <span className="font-medium tabular-nums text-red-600 dark:text-red-500">
                            -${loc.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </span>
                          <span
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning"
                            aria-hidden
                          >
                            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        )}

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
    </div>
  )
}
