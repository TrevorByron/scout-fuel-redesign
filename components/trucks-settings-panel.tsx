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
  defaultTruckSpecRowForTruck,
  defaultTruckSpecs,
  loadTruckSpecs,
  normalizeMpgString,
  saveTruckSpecs,
  type TruckSpecRow,
  type TruckSpecsState,
} from "@/lib/truck-specs-store"
import { trucks, type Truck } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const MAX_CAPACITY_DIGITS = 4

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_CAPACITY_DIGITS)
}

/** Allow up to two decimal places while typing (e.g. 6.25). */
function mpgDraftFilter(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "")
  const dot = cleaned.indexOf(".")
  if (dot === -1) return cleaned.slice(0, 2)
  const intPart = cleaned.slice(0, dot).replace(/\D/g, "").slice(0, 2)
  const frac = cleaned.slice(dot + 1).replace(/\D/g, "").slice(0, 2)
  if (frac.length > 0) return `${intPart}.${frac}`
  return intPart + "."
}

function fullRow(prev: TruckSpecsState, truck: Truck): TruckSpecRow {
  return prev[truck.id] ?? defaultTruckSpecRowForTruck(trucks, truck)
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

  function patchSpec(truck: Truck, patch: Partial<TruckSpecRow>) {
    setSpecs((prev) => {
      const base = fullRow(prev, truck)
      const row: TruckSpecRow = { ...base, ...patch }
      const next = { ...prev, [truck.id]: row }
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
                <TableHead className="min-w-[5rem] whitespace-nowrap">Asset ID</TableHead>
                <TableHead className="min-w-[8rem]">Make</TableHead>
                <TableHead className="min-w-[8rem]">Model</TableHead>
                <TableHead className="min-w-[8rem]">Truck Number</TableHead>
                <TableHead className="min-w-[7rem] whitespace-nowrap">Capacity (gal)</TableHead>
                <TableHead className="min-w-[5rem] whitespace-nowrap">MPG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const row = fullRow(specs, t)
                const defaults = defaultTruckSpecRowForTruck(trucks, t)
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{t.id}</TableCell>
                    <TableCell className="min-h-11 max-w-[12rem] p-2 align-middle font-medium text-foreground">
                      {row.make}
                    </TableCell>
                    <TableCell className="min-h-11 max-w-[12rem] p-2 align-middle font-medium text-foreground">
                      {row.model}
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        aria-label={`Truck number for ${t.id}`}
                        className="min-h-11 h-auto min-w-0"
                        maxLength={32}
                        value={row.truckNumber}
                        onChange={(e) =>
                          setSpecs((prev) => ({
                            ...prev,
                            [t.id]: { ...fullRow(prev, t), truckNumber: e.target.value },
                          }))
                        }
                        onBlur={(e) =>
                          patchSpec(t, {
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
                            [t.id]: { ...fullRow(prev, t), fuelCapacityGal: gal },
                          }))
                        }}
                        onBlur={(e) => {
                          const gal = digitsOnly(e.currentTarget.value)
                          patchSpec(t, {
                            fuelCapacityGal:
                              gal.length > 0 ? gal : defaultFuelCapacityGalForTruck(trucks, t.id),
                          })
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        aria-label={`MPG for ${t.id}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className="min-h-11 h-auto min-w-0 tabular-nums"
                        value={row.mpg}
                        onChange={(e) => {
                          const mpg = mpgDraftFilter(e.target.value)
                          setSpecs((prev) => ({
                            ...prev,
                            [t.id]: { ...fullRow(prev, t), mpg },
                          }))
                        }}
                        onBlur={(e) => {
                          const raw = e.currentTarget.value.trim()
                          patchSpec(t, {
                            mpg:
                              raw.length === 0
                                ? defaults.mpg
                                : normalizeMpgString(raw, defaults.mpg),
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
