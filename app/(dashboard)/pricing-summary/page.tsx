"use client"

import * as React from "react"
import { format } from "date-fns"
import { pricingSummaryRows } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const DEFAULT_DATE = new Date(2026, 2, 10) // 2026-03-10

const states = [...new Set(pricingSummaryRows.map((r) => r.state))].sort()
const allCities = [...new Set(pricingSummaryRows.map((r) => r.city))].sort()

function formatPrice(value: number): string {
  return `$${value.toFixed(3)}`
}

function dateToKey(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

export default function PricingSummaryPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => DEFAULT_DATE
  )
  const [stateFilter, setStateFilter] = React.useState<string>("all")
  const [cityFilter, setCityFilter] = React.useState<string>("all")
  const [dateOpen, setDateOpen] = React.useState(false)

  const citiesForState = React.useMemo(() => {
    if (stateFilter === "all") return allCities
    const cities = pricingSummaryRows
      .filter((r) => r.state === stateFilter)
      .map((r) => r.city)
    return [...new Set(cities)].sort()
  }, [stateFilter])

  const filteredRows = React.useMemo(() => {
    return pricingSummaryRows.filter((row) => {
      if (selectedDate && row.date !== dateToKey(selectedDate)) return false
      if (stateFilter !== "all" && row.state !== stateFilter) return false
      if (cityFilter !== "all" && row.city !== cityFilter) return false
      return true
    })
  }, [selectedDate, stateFilter, cityFilter])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Pricing Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            View retail and discounted fuel prices by location
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="default"
                    className="min-w-[140px] justify-start text-xs font-normal"
                  >
                    <HugeiconsIcon
                      icon={Calendar01Icon}
                      strokeWidth={1.5}
                      className="mr-2 size-4 shrink-0 text-muted-foreground"
                    />
                    {selectedDate
                      ? format(selectedDate, "MM/dd/yyyy")
                      : "Pick date"}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select
              value={stateFilter}
              onValueChange={(v) => {
                setStateFilter(v ?? "all")
                setCityFilter("all")
              }}
            >
              <SelectTrigger className="h-7 w-[130px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Select value={cityFilter} onValueChange={(v) => setCityFilter(v ?? "all")}>
              <SelectTrigger className="h-7 w-[140px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {citiesForState.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="mx-4 lg:mx-6 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col min-h-0">
          <div className="overflow-auto max-h-[min(60vh,32rem)]">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card border-b shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableHead>Date</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Retail price</TableHead>
                  <TableHead className="text-right">Your price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No pricing data for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, i) => (
                    <TableRow
                      key={`${row.date}-${row.location}-${row.city}-${i}`}
                      className={cn(i % 2 === 1 && "bg-muted/50")}
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(row.date), "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell>{row.chain}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell>{row.state}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPrice(row.retailPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPrice(row.yourPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatPrice(row.discount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
