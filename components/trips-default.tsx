"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { useTrips } from "@/lib/trips-context"
import type { TripPlan } from "@/lib/trips"
import { trucks } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronRight } from "lucide-react"

function getTripStatus(trip: TripPlan): "upcoming" | "in_progress" | "completed" {
  const now = Date.now()
  const start = new Date(trip.tripStart).getTime()
  const end = new Date(trip.tripEnd).getTime()
  if (now < start) return "upcoming"
  if (now > end) return "completed"
  return "in_progress"
}

export function TripsDefault() {
  const { tripPlans } = useTrips()
  const [driverFilter, setDriverFilter] = React.useState<string>("all")

  const driverOptions = React.useMemo(() => {
    const truckIds = [...new Set(tripPlans.map((t) => t.truckId))].sort()
    return truckIds.map((id) => {
      const truck = trucks.find((t) => t.id === id)
      return { value: id, label: truck ? `${truck.driverName} · ${id}` : id }
    })
  }, [tripPlans])

  const filteredTrips = React.useMemo(() => {
    if (driverFilter === "all") return tripPlans
    return tripPlans.filter((t) => t.truckId === driverFilter)
  }, [tripPlans, driverFilter])

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6 overflow-x-visible">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Trips</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Trip plans from the Optimizer. Select one to track progress.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="trips-driver-filter" className="text-xs font-medium text-muted-foreground">
            Driver
          </label>
          <Select value={driverFilter} onValueChange={(v) => setDriverFilter(v ?? "all")}>
            <SelectTrigger id="trips-driver-filter" className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              {driverOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-0 flex-1">
          {tripPlans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No trip plans yet</p>
              <p className="mt-1">
                Create one in the Optimizer and save it to see it here.
              </p>
              <Link
                href="/route-optimizer"
                className="inline-flex h-6 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted hover:text-foreground mt-3"
              >
                Open Optimizer
              </Link>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No trips for this driver</p>
              <p className="mt-1">Change the driver filter or create trips in the Optimizer.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredTrips.map((trip) => {
                const status = getTripStatus(trip)
                return (
                  <li key={trip.id}>
                    <Link
                      href={`/trips/${trip.id}`}
                      data-slot="card"
                      className="w-full text-left rounded-lg border border-border p-3 transition-colors flex items-center gap-3 bg-card text-card-foreground shadow-sm hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {trip.name ?? `${trip.origin} → ${trip.destination}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(trip.tripStart), "MMM d, yyyy")} – {format(new Date(trip.tripEnd), "MMM d, yyyy")} · {trip.truckId}
                        </p>
                        <Badge
                          variant={status === "completed" ? "default" : status === "in_progress" ? "default" : "outline"}
                          className="mt-1.5 text-[length:var(--text-2xs)]"
                        >
                          {status === "upcoming" && "Upcoming"}
                          {status === "in_progress" && "In progress"}
                          {status === "completed" && "Completed"}
                        </Badge>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
