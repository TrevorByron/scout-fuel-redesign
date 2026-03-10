"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { type DateRange } from "react-day-picker"
import {
  fuelTransactions,
  driverLeaderboard,
  STATION_BRANDS,
} from "@/lib/mock-data"
import type { FuelTransaction } from "@/lib/mock-data"
import { FuelTransactionTable } from "@/components/fuel-transaction-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

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
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (!range.to) return fmt(range.from)
  return `${fmt(range.from)} – ${fmt(range.to)}`
}

function getWaste(t: FuelTransaction): number {
  return t.betterOption?.potentialSavings ?? 0
}

const DRIVER_NAMES = [...new Set(driverLeaderboard.map((d) => d.driverName))].sort()

export default function DriversPage() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => getPresetRange(30)
  )
  const [selectedDriverIds, setSelectedDriverIds] = React.useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
  const [wasteThreshold, setWasteThreshold] = React.useState([0])
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null)

  const dateFrom = dateRange?.from
  const dateTo = dateRange?.to ?? dateRange?.from

  const filteredTransactions = React.useMemo(() => {
    return fuelTransactions.filter((t) => {
      const tDate = new Date(t.dateTime).getTime()
      if (dateFrom && tDate < dateFrom.getTime()) return false
      if (dateTo && tDate > dateTo.getTime() + 86400000) return false
      if (selectedDriverIds.length > 0 && !selectedDriverIds.includes(t.driverName)) return false
      if (selectedBrands.length > 0 && !selectedBrands.includes(t.stationBrand)) return false
      const waste = getWaste(t)
      if (waste < (wasteThreshold[0] ?? 0)) return false
      return true
    })
  }, [dateFrom, dateTo, selectedDriverIds, selectedBrands, wasteThreshold])

  const toggleDriver = (name: string) => {
    setSelectedDriverIds((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    )
  }

  const handleSelectTransaction = (t: FuelTransaction | null) => {
    setSelectedTransactionId(t?.id ?? null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      {/* Row 1: Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {/* Row 1: labels (top-aligned) */}
            <Label className="text-xs font-medium text-muted-foreground">
              Date range
            </Label>
            <Label className="text-xs font-medium text-muted-foreground">
              Drivers
            </Label>
            <Label className="text-xs font-medium text-muted-foreground">
              Fuel brand
            </Label>
            <Label className="text-xs font-medium text-muted-foreground">
              Show transactions with waste &gt; ${wasteThreshold[0] ?? 0}
            </Label>

            {/* Row 2: controls (slider centered with buttons) */}
            <div className="flex min-h-9 items-center">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-9 gap-2 text-sm font-normal"
                    >
                      <HugeiconsIcon
                        icon={Calendar01Icon}
                        strokeWidth={1.5}
                        className="size-4 text-muted-foreground"
                      />
                      {formatRangeLabel(dateRange)}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
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

            <div className="flex min-h-9 items-center">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between font-normal"
                    >
                      {selectedDriverIds.length === 0
                        ? "All drivers"
                        : `${selectedDriverIds.length} driver${selectedDriverIds.length === 1 ? "" : "s"}`}
                    </Button>
                  }
                />
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="max-h-[200px] space-y-1 overflow-y-auto">
                    {DRIVER_NAMES.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          id={`driver-${name}`}
                          checked={selectedDriverIds.includes(name)}
                          onCheckedChange={() => toggleDriver(name)}
                        />
                        <Label
                          htmlFor={`driver-${name}`}
                          className="flex-1 cursor-pointer text-xs"
                        >
                          {name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex min-h-9 items-center">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between font-normal"
                    >
                      {selectedBrands.length === 0
                        ? "All brands"
                        : `${selectedBrands.length} brand${selectedBrands.length === 1 ? "" : "s"}`}
                    </Button>
                  }
                />
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="max-h-[200px] space-y-1 overflow-y-auto">
                    {STATION_BRANDS.map((brand) => (
                      <div
                        key={brand}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={
                            selectedBrands.length === 0 ||
                            selectedBrands.includes(brand)
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBrands((p) =>
                                p.length === 0 ? [] : [...p, brand]
                              )
                            } else {
                              setSelectedBrands((p) =>
                                p.length === 0
                                  ? STATION_BRANDS.filter((b) => b !== brand)
                                  : p.filter((b) => b !== brand)
                              )
                            }
                          }}
                        />
                        <Label
                          htmlFor={`brand-${brand}`}
                          className="flex-1 cursor-pointer text-xs"
                        >
                          {brand}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex min-h-9 w-full items-center">
              <Slider
                min={0}
                max={100}
                step={5}
                value={wasteThreshold}
                onValueChange={(v) =>
                  setWasteThreshold(Array.isArray(v) ? [...v] : [v])
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Map — overflow-visible so popup can extend below map */}
      <div className="drivers-map-wrapper relative h-[50vh] min-h-[400px] w-full overflow-visible rounded-lg border border-border">
        <DriverInsightsMap
          transactions={filteredTransactions}
          selectedTransactionId={selectedTransactionId}
          onSelectTransaction={handleSelectTransaction}
        />
        <div className="absolute left-2 top-2 flex gap-1">
          <Button variant="ghost" size="sm">
            Heat Map
          </Button>
          <Button variant="ghost" size="sm">
            Route Trails
          </Button>
          <Button variant="ghost" size="sm">
            Opportunity Zones
          </Button>
        </div>
      </div>

      {/* Row 3: Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            View the same filtered data in table form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FuelTransactionTable
            transactions={filteredTransactions}
            maxRows={50}
            emptyDescription="Change date range or filters to see transactions for the selected drivers."
          />
        </CardContent>
      </Card>
    </div>
  )
}
