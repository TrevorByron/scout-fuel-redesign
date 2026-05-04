"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  defaultFuelCapacityGalForTruck,
  defaultTruckSpecs,
  loadTruckSpecs,
  saveTruckSpecs,
  type TruckSpecsState,
} from "@/lib/truck-specs-store"
import { trucks } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const MAX_CAPACITY_DIGITS = 4

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_CAPACITY_DIGITS)
}

export type TrucksSettingsPanelProps = {
  className?: string
  visible?: boolean
}

export function TrucksSettingsPanel({ className, visible }: TrucksSettingsPanelProps) {
  const [specs, setSpecs] = React.useState<TruckSpecsState>(() => defaultTruckSpecs())

  const rows = React.useMemo(
    () => [...trucks].sort((a, b) => a.id.localeCompare(b.id)),
    []
  )

  React.useEffect(() => {
    setSpecs(loadTruckSpecs(trucks))
  }, [])

  const prevVisibleRef = React.useRef(visible)
  React.useEffect(() => {
    if (visible === undefined) {
      setSpecs(loadTruckSpecs(trucks))
      return
    }
    if (visible && !prevVisibleRef.current) {
      setSpecs(loadTruckSpecs(trucks))
    }
    prevVisibleRef.current = visible
  }, [visible])

  function patchSpec(truckId: string, patch: Partial<{ truckNumber: string; fuelCapacityGal: string }>) {
    setSpecs((prev) => {
      const row = {
        truckNumber: prev[truckId]?.truckNumber ?? "",
        fuelCapacityGal: prev[truckId]?.fuelCapacityGal ?? "",
        ...patch,
      }
      const next = { ...prev, [truckId]: row }
      saveTruckSpecs(next)
      return next
    })
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col px-3 pb-4 pt-2", className)}>
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[9rem]">Driver</TableHead>
                  <TableHead className="min-w-[5rem] whitespace-nowrap">Asset ID</TableHead>
                  <TableHead className="min-w-[8rem]">Truck Number</TableHead>
                  <TableHead className="min-w-[7rem] whitespace-nowrap">Capacity (gal)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const row = specs[t.id] ?? {
                    truckNumber: t.id,
                    fuelCapacityGal: defaultFuelCapacityGalForTruck(trucks, t.id),
                  }
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.driverName}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{t.id}</TableCell>
                      <TableCell className="p-2 align-middle">
                        <Input
                          aria-label={`Truck number for ${t.id}`}
                          className="min-h-11 h-auto min-w-0"
                          maxLength={32}
                          value={row.truckNumber}
                          onChange={(e) =>
                            setSpecs((prev) => ({
                              ...prev,
                              [t.id]: {
                                truckNumber: e.target.value,
                                fuelCapacityGal: prev[t.id]?.fuelCapacityGal ?? row.fuelCapacityGal,
                              },
                            }))
                          }
                          onBlur={(e) =>
                            patchSpec(t.id, {
                              truckNumber: e.currentTarget.value.trim() || t.id,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="p-2 align-middle">
                        <Input
                          aria-label={`Fuel capacity in gallons for ${t.id}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          className="min-h-11 h-auto min-w-0 tabular-nums"
                          maxLength={MAX_CAPACITY_DIGITS}
                          value={row.fuelCapacityGal}
                          onChange={(e) => {
                            const gal = digitsOnly(e.target.value)
                            setSpecs((prev) => ({
                              ...prev,
                              [t.id]: {
                                truckNumber: prev[t.id]?.truckNumber ?? row.truckNumber,
                                fuelCapacityGal: gal,
                              },
                            }))
                          }}
                          onBlur={(e) => {
                            const gal = digitsOnly(e.currentTarget.value)
                            patchSpec(t.id, {
                              fuelCapacityGal:
                                gal.length > 0
                                  ? gal
                                  : defaultFuelCapacityGalForTruck(trucks, t.id),
                            })
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
        </div>
      </div>
    </div>
  )
}
