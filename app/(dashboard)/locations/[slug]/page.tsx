"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { type DateRange } from "react-day-picker"
import { getFuelTransactions } from "@/lib/mock-data"
import type { FuelTransaction } from "@/lib/mock-data"
import { driverNameToSlug } from "@/lib/driver-utils"
import {
  getLocationBySlug,
  getLocationKey,
  getLocationKeyFromDisplay,
  getLocationSummaryStats,
  getDriversAtLocation,
  getRepresentativeBetterOption,
  type DateRange as LocationDateRange,
} from "@/lib/location-utils"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

const LocationDetailMap = dynamic(
  () =>
    import("@/components/location-detail-map").then((m) => ({
      default: m.LocationDetailMap,
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

function transactionMatchesLocation(t: FuelTransaction, locationKey: string): boolean {
  return getLocationKey(t.stationBrand, t.location) === locationKey
}

export default function LocationDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const displayName = getLocationBySlug(slug)
  const locationKey = displayName ? getLocationKeyFromDisplay(displayName) : null

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getThisWeekRange()
  )

  if (!displayName || !locationKey) {
    notFound()
  }

  const effectiveDateRange = dateRange ?? getThisWeekRange()
  const previousPeriodRange = React.useMemo((): DateRange => {
    if (!effectiveDateRange?.from) return getLastWeekRange()
    const from = effectiveDateRange.from
    const to = effectiveDateRange.to ?? effectiveDateRange.from
    const periodMs = to.getTime() - from.getTime() + 86400000
    return {
      from: new Date(from.getTime() - periodMs),
      to: new Date(from.getTime() - 86400000),
    }
  }, [effectiveDateRange])

  const summaryStats = getLocationSummaryStats(
    locationKey,
    effectiveDateRange as LocationDateRange,
    previousPeriodRange as LocationDateRange
  )
  const locationTransactions = React.useMemo(
    () =>
      getFuelTransactions().filter((t) => transactionMatchesLocation(t, locationKey)),
    [locationKey]
  )

  const dateFilteredTransactions = React.useMemo(
    () => locationTransactions.filter((t) => isInDateRange(t, dateRange)),
    [locationTransactions, dateRange]
  )

  const driversAtLocation = React.useMemo(
    () => getDriversAtLocation(locationKey, effectiveDateRange as LocationDateRange),
    [locationKey, effectiveDateRange]
  )

  const representativeBetterOption = React.useMemo(
    () => getRepresentativeBetterOption(dateFilteredTransactions),
    [dateFilteredTransactions]
  )

  const representativeComparison = React.useMemo(() => {
    if (!representativeBetterOption) return null
    const key = (opt: { stationName: string; location: string }) =>
      `${opt.stationName}\u001f${opt.location}`
    const targetKey = key(representativeBetterOption)
    const t = dateFilteredTransactions.find(
      (t) => t.betterOption && key(t.betterOption) === targetKey
    )
    if (!t?.betterOption) return null
    const opt = t.betterOption
    const optimizedTotal = Math.round(t.gallons * opt.pricePerGallon * 100) / 100
    return {
      actualChain: t.stationBrand,
      actualLocation: t.location,
      actualCpg: t.pricePerGallon,
      actualTotal: t.totalCost,
      optimizedChain: opt.stationName,
      optimizedLocation: opt.location,
      optimizedCpg: opt.pricePerGallon,
      optimizedTotal,
      savings: opt.potentialSavings,
      distanceMiles: opt.distanceMiles,
    }
  }, [representativeBetterOption, dateFilteredTransactions])

  const locationCenter = React.useMemo(() => {
    const first = dateFilteredTransactions[0]
    return first
      ? { lat: first.lat, lng: first.lng }
      : locationTransactions[0]
        ? { lat: locationTransactions[0].lat, lng: locationTransactions[0].lng }
        : { lat: 0, lng: 0 }
  }, [dateFilteredTransactions, locationTransactions])

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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/locations" />}>
              Location insights
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card variant="flat" className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
            <p className="text-muted-foreground text-sm">Fuel chain location</p>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs">Drivers who shopped here</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {driversAtLocation.length}
              </p>
              <p className="text-muted-foreground text-xs">
                in the selected date range
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Overpaid</p>
              <p
                className={[
                  "text-2xl font-bold tabular-nums",
                  summaryStats.overpaidThisPeriod === 0
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500",
                ].join(" ")}
              >
                $
                {summaryStats.overpaidThisPeriod.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {summaryStats.nonCompliantStopsThisPeriod} non-compliant stops
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                Avg missed savings per bad stop
              </p>
              <p
                className={[
                  "text-2xl font-bold tabular-nums",
                  summaryStats.avgMissedSavingsPerBadStop === 0
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500",
                ].join(" ")}
              >
                $
                {summaryStats.avgMissedSavingsPerBadStop.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                When drivers used this location out-of-network
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avg CPG paid</p>
              <p className="text-2xl font-bold tabular-nums">
                ${summaryStats.avgCpgPaid.toFixed(2)}
              </p>
              <p className="text-muted-foreground text-xs">
                Total gallons: {summaryStats.totalGallons.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                ({summaryStats.fuelTypeLabel})
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Transactions &amp; fill-up locations
        </h2>
        <div className="flex items-center gap-2">
          <Tabs
            value={activePreset ?? "custom"}
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
                  variant={activePreset === null ? "default" : "outline"}
                  className="hidden h-9 gap-2 text-sm font-normal sm:inline-flex"
                />
              }
            >
              <HugeiconsIcon
                icon={Calendar01Icon}
                strokeWidth={1.5}
                className={cn("size-4", activePreset === null ? "text-primary-foreground" : "text-muted-foreground")}
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

      <div className="relative h-[50vh] min-h-[400px] w-full overflow-visible rounded-lg border border-border">
        <LocationDetailMap
          locationDisplayName={displayName}
          locationLat={locationCenter.lat}
          locationLng={locationCenter.lng}
          avgMissedSavingsPerBadStop={summaryStats.avgMissedSavingsPerBadStop}
          representativeBetterOption={representativeBetterOption}
          comparison={representativeComparison}
        />
      </div>

      <Card variant="flat">
        <CardHeader>
          <CardTitle>Drivers using this location</CardTitle>
          <CardDescription>
            Drivers who filled up at this location in the selected date range.
            Use this to see who to coach when a location is losing money.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {driversAtLocation.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <p className="font-medium text-foreground">No drivers at this location</p>
              <p className="text-sm text-muted-foreground">
                Change the date range to see drivers.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Fill-ups</TableHead>
                  <TableHead className="text-right">Missed savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driversAtLocation.map((d) => (
                  <TableRow key={d.driverName}>
                    <TableCell>
                      <Link
                        href={`/drivers/${driverNameToSlug(d.driverName)}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {d.driverName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.transactionCount}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${d.missedSavings > 0 ? "text-red-600 dark:text-red-500 font-medium" : ""}`}
                    >
                      ${d.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card variant="flat">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            All transactions at this location in the selected date range. Click
            a row to highlight it on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FuelTransactionTable
            transactions={dateFilteredTransactions}
            maxRows={100}
            hideDriverColumn={false}
            emptyTitle="No transactions in this range"
            emptyDescription="Change the date range to see transactions."
            groupByStation={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
