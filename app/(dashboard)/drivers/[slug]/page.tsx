"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { type DateRange } from "react-day-picker"
import { fuelTransactions } from "@/lib/mock-data"
import type { FuelTransaction } from "@/lib/mock-data"
import {
  getDriverNameBySlug,
  getDriverSummaryStats,
  getDriverProfile,
  getDriverComplianceTrend,
  type DateRange as DriverDateRange,
} from "@/lib/driver-utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

const FuelTransactionTable = dynamic(
  () =>
    import("@/components/fuel-transaction-table").then((m) => ({
      default: m.FuelTransactionTable,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
        Loading table…
      </div>
    ),
  }
)

const DriverInsightsMap = dynamic(
  () =>
    import("@/components/driver-insights-map").then((m) => ({
      default: m.DriverInsightsMap,
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
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  if (!range.to) return fmt(range.from)
  return `${fmt(range.from)} – ${fmt(range.to)}`
}

function getTodayRange(): DateRange {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
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

function getLastWeekRange(): DateRange {
  const thisWeek = getThisWeekRange()
  const to = new Date(thisWeek.from!)
  to.setDate(to.getDate() - 1)
  const from = new Date(to)
  from.setDate(from.getDate() - 6)
  return { from, to }
}

function rangeMatches(
  range: DateRange | undefined,
  preset: "today" | "week" | "month"
): boolean {
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
    return (
      range.from.toDateString() === week.from.toDateString() &&
      (range.to ?? range.from).toDateString() === week.to.toDateString()
    )
  }
  if (preset === "month") {
    const month = getThisMonthRange()
    if (!month.from || !month.to) return false
    return (
      range.from.toDateString() === month.from.toDateString() &&
      (range.to ?? range.from).toDateString() === month.to.toDateString()
    )
  }
  return false
}

function isInDateRange(
  t: FuelTransaction,
  range: DateRange | undefined
): boolean {
  if (!range?.from) return true
  const tDate = new Date(t.dateTime).getTime()
  if (tDate < range.from.getTime()) return false
  const toEnd = range.to
    ? range.to.getTime() + 86400000
    : range.from.getTime() + 86400000
  if (tDate > toEnd) return false
  return true
}

function getInitials(driverName: string): string {
  const parts = driverName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function complianceScoreColorClass(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-500"
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-500"
  return "text-red-600 dark:text-red-500"
}

/** Bar fill color by compliance %: green 90%+, yellow 50–89%, red below 50%. */
function getComplianceBarFill(scorePct: number): string {
  if (scorePct >= 90) return "#22c55e"
  if (scorePct >= 50) return "#eab308"
  return "var(--destructive)"
}

export default function DriverDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const driverName = getDriverNameBySlug(slug)

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<
    string | null
  >(null)

  if (!driverName) {
    notFound()
  }

  const effectiveDateRange = dateRange ?? getThisWeekRange()
  const previousPeriodRange = React.useMemo((): DateRange => {
    if (!effectiveDateRange?.from) return getLastWeekRange()
    const from = effectiveDateRange.from
    const to = effectiveDateRange.to ?? effectiveDateRange.from
    const periodMs =
      to.getTime() - from.getTime() + 86400000
    return {
      from: new Date(from.getTime() - periodMs),
      to: new Date(from.getTime() - 86400000),
    }
  }, [effectiveDateRange])
  const summaryStats = getDriverSummaryStats(
    driverName,
    effectiveDateRange as DriverDateRange,
    previousPeriodRange as DriverDateRange
  )
  const profile = getDriverProfile(driverName)
  const complianceTrendData = React.useMemo(
    () => getDriverComplianceTrend(driverName, 8),
    [driverName]
  )
  const complianceChartConfig = {
    scorePct: {
      label: "Compliance score",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const driverTransactions = React.useMemo(
    () => fuelTransactions.filter((t) => t.driverName === driverName),
    [driverName]
  )

  const dateFilteredTransactions = React.useMemo(
    () => driverTransactions.filter((t) => isInDateRange(t, dateRange)),
    [driverTransactions, dateRange]
  )

  const handleSelectTransaction = React.useCallback(
    (t: FuelTransaction | null) => {
      setSelectedTransactionId(t?.id ?? null)
    },
    []
  )

  const isThisWeek = rangeMatches(effectiveDateRange, "week")
  const trendLabel =
    summaryStats.thisWeekScorePct >= summaryStats.lastWeekScorePct
      ? `↑ from ${summaryStats.lastWeekScorePct}% ${isThisWeek ? "last week" : "previous period"}`
      : `↓ from ${summaryStats.lastWeekScorePct}% ${isThisWeek ? "last week" : "previous period"}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/drivers" />}>
              Driver insights
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{driverName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Summary block */}
      <Card className="overflow-hidden shadow-md ring-1 ring-foreground/10">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar size="lg" className="size-12 shrink-0">
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(driverName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {driverName}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Card ·· {profile.fuelCardLast4}
                  </p>
                </div>
              </div>
              {profile.badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((b) => {
                    const isWarning =
                      b === "3 consecutive non-compliant weeks" ||
                      b === "Worst CA corridor offender"
                    return (
                      <Badge
                        key={b}
                        variant="secondary"
                        className={
                          isWarning
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:border-green-500/30"
                        }
                      >
                        {b}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs">Compliance score</p>
              <p
                className={[
                  "text-2xl font-bold tabular-nums",
                  complianceScoreColorClass(summaryStats.thisWeekScorePct),
                ].join(" ")}
              >
                {summaryStats.thisWeekScorePct}%
              </p>
              <p className="text-muted-foreground text-xs">{trendLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                Overpaid
              </p>
              <p
                className={[
                  "text-2xl font-bold tabular-nums",
                  summaryStats.overpaidThisWeek === 0
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500",
                ].join(" ")}
              >
                ${summaryStats.overpaidThisWeek.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-muted-foreground text-xs">
                {summaryStats.nonCompliantStopsThisWeek} non-compliant stops
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avg CPG paid</p>
              <p className="text-2xl font-bold tabular-nums">
                ${summaryStats.avgCpgPaid.toFixed(2)}
              </p>
              <p className="text-muted-foreground text-xs">
                Avg cost per gallon
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total gallons</p>
              <p className="text-2xl font-bold tabular-nums">
                {summaryStats.totalGallons.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {summaryStats.fuelTypeLabel}
              </p>
            </div>
          </div>

          {/* Compliance score over time — inline */}
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground text-xs font-medium mb-2">
              Compliance score over time (last 8 weeks)
            </p>
            <ChartContainer
              config={complianceChartConfig}
              className="h-[140px] w-full [&_.recharts-cartesian-axis-tick_text]:text-[10px]"
            >
              <BarChart
                data={complianceTrendData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="2 2" />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  width={24}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v) => `${Number(v).toFixed(0)}%`}
                    />
                  }
                />
                <Bar dataKey="scorePct" name="scorePct" radius={[2, 2, 0, 0]} barSize={20}>
                  {complianceTrendData.map((entry, index) => (
                    <Cell key={index} fill={getComplianceBarFill(entry.scorePct)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Date filter for table and map */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Transactions &amp; fill-up locations
        </h2>
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
              <TabsTrigger
                value="today"
                className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground"
              >
                Today
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground"
              >
                This Week
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground"
              >
                This Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="hidden h-9 gap-2 text-sm font-normal sm:inline-flex"
                />
              }
            >
              <HugeiconsIcon
                icon={Calendar01Icon}
                strokeWidth={1.5}
                className="size-4 text-muted-foreground"
              />
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

      {/* Map */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-visible rounded-lg border border-border">
        <DriverInsightsMap
          transactions={dateFilteredTransactions}
          selectedTransactionId={selectedTransactionId}
          onSelectTransaction={handleSelectTransaction}
        />
      </div>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            All transactions for this driver in the selected date range. Click a
            row to highlight it on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FuelTransactionTable
            transactions={dateFilteredTransactions}
            maxRows={100}
            hideDriverColumn
            emptyTitle="No transactions in this range"
            emptyDescription="Change the date range to see transactions."
            groupByStation={false}
            selectedTransactionId={selectedTransactionId}
            onSelectTransaction={handleSelectTransaction}
          />
        </CardContent>
      </Card>
    </div>
  )
}
