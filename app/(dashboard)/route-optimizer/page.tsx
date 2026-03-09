"use client"

import * as React from "react"
import { trucks, mockRouteStops, mockRouteSummary } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export default function RouteOptimizerPage() {
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [truckId, setTruckId] = React.useState("")
  const [loadWeight, setLoadWeight] = React.useState("")
  const [calculated, setCalculated] = React.useState(false)

  const handleCalculate = () => {
    if (origin && destination && truckId) setCalculated(true)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Route Optimizer</h2>
        <p className="text-xs text-muted-foreground">
          Plan optimal fuel stops for a trip
        </p>
      </div>

      <div className="grid gap-6 px-4 md:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Route details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel>Origin</FieldLabel>
                  <Input
                    placeholder="City, State or address"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Destination</FieldLabel>
                  <Input
                    placeholder="City, State or address"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Truck</FieldLabel>
                  <Select value={truckId} onValueChange={(v) => setTruckId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select truck" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.slice(0, 20).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.id} · {t.driverName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Load weight (lbs)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    value={loadWeight}
                    onChange={(e) => setLoadWeight(e.target.value)}
                  />
                </Field>
                <Button onClick={handleCalculate} className="w-full">
                  Calculate Route
                </Button>
              </FieldGroup>
          </CardContent>
        </Card>

        {calculated && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommended fuel stops</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRouteStops.map((stop, i) => (
                    <Card key={i} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">{stop.station}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        <p>{stop.location}</p>
                        <p>
                          ${stop.pricePerGallon.toFixed(2)}/gal · {stop.refuelGallons} gal refuel
                        </p>
                        <p>
                          {stop.distanceFromPrev} mi from previous · ETA {stop.eta} · Fuel {stop.fuelPct}%
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Trip summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p>
                  <span className="text-muted-foreground">Total trip cost (est.):</span>{" "}
                  ${mockRouteSummary.totalCost.toLocaleString()}
                </p>
                <p className="text-[var(--success)]">
                  Savings vs alternative routes: ${mockRouteSummary.savingsVsAlternate}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
