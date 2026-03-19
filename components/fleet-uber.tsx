"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { trucks, type Truck } from "@/lib/mock-data"
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

export function FleetUber() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const filtered = filterTrucks(trucks, filter)

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col p-0"
      style={{ height: "100%", maxHeight: "calc(100dvh - var(--header-height, 3rem) - 2rem)" }}
    >
      {/* Full-screen map */}
      <div className="flex h-full min-h-0 flex-1">
        <FleetMap trucks={filtered} />
      </div>

      {/* Floating pill tabs (Uber-style map controls) */}
      <div className="absolute left-4 right-4 top-4 z-10 md:left-6 md:right-auto md:top-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto rounded-lg border border-border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
            <TabsTrigger value="all" className="min-w-0 truncate">
              All
            </TabsTrigger>
            <TabsTrigger value="low_fuel" className="min-w-0 truncate">
              Low Fuel
            </TabsTrigger>
            <TabsTrigger value="idling" className="min-w-0 truncate">
              Idling
            </TabsTrigger>
            <TabsTrigger value="off_route" className="min-w-0 truncate">
              Off Route
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
