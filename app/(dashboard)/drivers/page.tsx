"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  driverLeaderboard,
  driverDetails,
  fuelTransactions,
  type DriverPerformance,
  type FuelTransaction,
} from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

const DriverFuelMap = dynamic(() => import("@/components/driver-fuel-map").then((m) => ({ default: m.DriverFuelMap })), {
  ssr: false,
})

const chartConfig = {
  mpg: { label: "MPG", color: "var(--chart-1)" },
  costPerMile: { label: "Cost/Mile", color: "var(--chart-2)" },
} satisfies ChartConfig

type SortKey = keyof DriverPerformance

function efficiencyColor(score: number) {
  if (score >= 90) return "text-chart-2"
  if (score >= 70) return "text-chart-4"
  return "text-destructive"
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function filterTransactionsByDateRange(
  txns: FuelTransaction[],
  driverName: string,
  dateFrom: string,
  dateTo: string
): FuelTransaction[] {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  to.setHours(23, 59, 59, 999)
  return txns.filter((t) => {
    if (t.driverName !== driverName) return false
    const d = new Date(t.dateTime)
    return d >= from && d <= to
  })
}

function DriverDetailModal({
  driverId,
  open,
  onOpenChange,
}: {
  driverId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const defaultRange = getDefaultDateRange()
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from)
  const [dateTo, setDateTo] = React.useState(defaultRange.to)

  const detail = driverId ? driverDetails[driverId] : null
  const fuelUpsInRange = React.useMemo(() => {
    if (!detail) return []
    return filterTransactionsByDateRange(
      fuelTransactions,
      detail.driverName,
      dateFrom,
      dateTo
    )
  }, [detail, dateFrom, dateTo])

  React.useEffect(() => {
    if (open) {
      const { from, to } = getDefaultDateRange()
      setDateFrom(from)
      setDateTo(to)
    }
  }, [open])

  if (!detail) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl px-4 py-4 lg:px-6 lg:py-6">
        <SheetHeader>
          <SheetTitle>{detail.driverName}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {detail.truckId} · Driver ID: {detail.driverId}
          </p>

          <div>
            <h4 className="mb-2 text-sm font-medium">Monthly trend</h4>
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <LineChart data={detail.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="mpg"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="MPG"
                />
                <Line
                  type="monotone"
                  dataKey="costPerMile"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  name="Cost/Mile"
                />
              </LineChart>
            </ChartContainer>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Fuel-ups in range</h4>
            <div className="mb-2 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-[140px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-[140px]"
                />
              </div>
            </div>
            {fuelUpsInRange.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fuel-ups in this date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">Gal</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Best buy?</TableHead>
                      <TableHead>Opportunity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelUpsInRange.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(t.dateTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{t.location}</TableCell>
                        <TableCell className="text-xs">{t.stationBrand}</TableCell>
                        <TableCell className="text-right text-xs">{t.gallons}</TableCell>
                        <TableCell className="text-right text-xs">${t.pricePerGallon.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">${t.totalCost.toFixed(2)}</TableCell>
                        <TableCell>
                          {t.betterOption ? (
                            <span className="text-destructive text-xs font-medium">No</span>
                          ) : (
                            <span className="text-[var(--success)] text-xs font-medium">Yes</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px] text-xs">
                          {t.betterOption ? (
                            <span className="text-destructive">
                              Could have saved ${t.betterOption.potentialSavings.toFixed(2)} at {t.betterOption.stationName} ({t.betterOption.distanceMiles} mi away)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Fuel-up map</h4>
            <DriverFuelMap transactions={fuelUpsInRange} />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Coaching recommendations</h4>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {detail.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Badges</h4>
            <div className="flex flex-wrap gap-1">
              {detail.badges.map((b) => (
                <Badge key={b} variant="secondary">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function DriversPage() {
  const [sortKey, setSortKey] = React.useState<SortKey>("rank")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)

  const sorted = React.useMemo(() => {
    const list = [...driverLeaderboard]
    list.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      return 0
    })
    return list
  }, [sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else setSortKey(key)
  }

  const openDetail = (driverId: string) => {
    setSelectedDriverId(driverId)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Driver Performance</h2>
        <p className="text-sm text-muted-foreground">
          Leaderboard and efficiency scores. Click a row for details.
        </p>
      </div>

      <Card className="mx-4 md:col-span-2 lg:mx-6">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Sort by column header</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("rank")}
                  >
                    Rank
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("driverName")}
                  >
                    Driver
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("truckId")}
                  >
                    Truck
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("avgMpg")}
                  >
                    Avg MPG
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("fuelCostPerMile")}
                  >
                    Cost/Mile
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("idleTimeHours")}
                  >
                    Idle (hrs)
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="hover:underline"
                    onClick={() => handleSort("efficiencyScore")}
                  >
                    Score
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((d) => (
                <TableRow
                  key={d.truckId}
                  className="cursor-pointer"
                  onClick={() => openDetail("D" + d.truckId.slice(1))}
                >
                  <TableCell>{d.rank}</TableCell>
                  <TableCell>{d.driverName}</TableCell>
                  <TableCell>{d.truckId}</TableCell>
                  <TableCell className="text-right">{d.avgMpg.toFixed(1)}</TableCell>
                  <TableCell className="text-right">${d.fuelCostPerMile.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{d.idleTimeHours.toFixed(1)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      efficiencyColor(d.efficiencyScore)
                    )}
                  >
                    {d.efficiencyScore}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverDetailModal
        driverId={selectedDriverId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
