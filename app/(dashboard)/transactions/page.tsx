"use client"

import * as React from "react"
import { fuelTransactions, STATION_BRANDS } from "@/lib/mock-data"
import type { FuelTransaction } from "@/lib/mock-data"
import { FuelTransactionTable, getEfficiencyStatus } from "@/components/fuel-transaction-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

const driverNames = [...new Set(fuelTransactions.map((t) => t.driverName))].sort()

export default function TransactionsPage() {
  const [driverFilter, setDriverFilter] = React.useState<string>("all")
  const [stationFilter, setStationFilter] = React.useState<string>("all")
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
  }, [driverFilter, stationFilter, alertsOnly, efficiencyFilter, networkFilter, dateFrom, dateTo])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Fuel Transactions</h2>
        <p className="text-xs text-muted-foreground">
          Filter and review recent fuel transactions
        </p>
      </div>

      {/* Filters */}
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle className="text-xs">Filters</CardTitle>
          <CardDescription>Narrow by date, driver, station, network, or alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mx-4 md:col-span-2 lg:mx-6">
        <CardContent className="p-0">
          <FuelTransactionTable transactions={filtered} maxRows={50} />
        </CardContent>
      </Card>
    </div>
  )
}
