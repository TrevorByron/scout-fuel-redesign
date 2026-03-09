"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { trucks, type Truck, TRUCK_STATUSES } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const FleetMap = dynamic(() => import("@/components/fleet-map").then((m) => ({ default: m.FleetMap })), {
  ssr: false,
})

type Filter = "all" | "low_fuel" | "idling" | "off_route"

function filterTrucks(list: Truck[], filter: Filter): Truck[] {
  if (filter === "all") return list
  if (filter === "low_fuel") return list.filter((t) => t.fuelLevel < 25)
  if (filter === "idling") return list.filter((t) => t.status === "Idle")
  if (filter === "off_route") return list.filter((t) => t.status === "Off Route")
  return list
}

function TruckCard({ truck }: { truck: Truck }) {
  const statusVariant =
    truck.status === "Low Fuel"
      ? "destructive"
      : truck.status === "On Route"
        ? "default"
        : truck.status === "Refueling"
          ? "secondary"
          : "outline"
  return (
    <Card className="w-full min-w-0 shrink-0 overflow-hidden gap-1">
      <CardHeader>
        <div className="pb-0 flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="truncate">{truck.id}</CardTitle>
          <Badge variant={statusVariant} className="shrink-0">
            {truck.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="truncate text-muted-foreground">{truck.driverName}</p>
        <div className=" space-y-1">
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="shrink-0">Fuel</span>
            <span className="tabular-nums">{truck.fuelLevel}%</span>
          </div>
          <Progress value={truck.fuelLevel} className="h-1.5" />
        </div>
        <p className="mt-2 truncate text-muted-foreground">
          Next: {truck.nextStop}
        </p>
      </CardContent>
    </Card>
  )
}

export default function FleetPage() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const filtered = filterTrucks(trucks, filter)

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6"
      style={{ height: "100%", maxHeight: "calc(100dvh - var(--header-height, 3rem) - 2rem)" }}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden md:grid-cols-[1fr_320px]">
        <FleetMap trucks={filtered} />

        {/* Sidebar */}
        <div className="flex min-h-0 min-w-0 max-h-full flex-col gap-4 overflow-hidden">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full min-w-0 shrink-0 grid-cols-4">
              <TabsTrigger value="all" className="min-w-0 truncate text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="low_fuel" className="min-w-0 truncate text-xs">
                Low Fuel
              </TabsTrigger>
              <TabsTrigger value="idling" className="min-w-0 truncate text-xs">
                Idling
              </TabsTrigger>
              <TabsTrigger value="off_route" className="min-w-0 truncate text-xs">
                Off Route
              </TabsTrigger>
            </TabsList>
            <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto py-1 px-1">
              {filtered.map((truck) => (
                <TruckCard key={truck.id} truck={truck} />
              ))}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No trucks match this filter.
                </p>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
