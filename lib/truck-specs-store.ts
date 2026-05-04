"use client"

import type { Truck } from "@/lib/mock-data"

export type TruckSpecRow = {
  truckNumber: string
  fuelCapacityGal: string
}

export type TruckSpecsState = Record<string, TruckSpecRow>

const TRUCK_SPECS_STORAGE_KEY = "scoutfuel:truck-specs"

/** Believable diesel tank sizes (gal) for Class 8–style equipment; cycled by row index. */
const CAPACITY_PRESETS_GAL = [
  450, 400, 500, 350, 425, 300, 475, 380, 420, 440, 360, 390, 410, 430, 460, 320,
]

function isTruckSpecRow(value: unknown): value is TruckSpecRow {
  if (!value || typeof value !== "object") return false
  const r = value as Record<string, unknown>
  return typeof r.truckNumber === "string" && typeof r.fuelCapacityGal === "string"
}

function isTruckSpecsState(value: unknown): value is TruckSpecsState {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  for (const v of Object.values(o)) {
    if (!isTruckSpecRow(v)) return false
  }
  return true
}

export function defaultTruckSpecs(): TruckSpecsState {
  return {}
}

/** Merge persisted rows with defaults for every truck in the fleet (sorted by id for stable presets). */
export function mergeTruckSpecsWithDefaults(
  trucks: Truck[],
  stored: TruckSpecsState
): TruckSpecsState {
  const sorted = [...trucks].sort((a, b) => a.id.localeCompare(b.id))
  const out: TruckSpecsState = {}
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!
    const s = stored[t.id]
    const defaultGal = String(CAPACITY_PRESETS_GAL[i % CAPACITY_PRESETS_GAL.length])
    const cap =
      typeof s?.fuelCapacityGal === "string" && /^\d+$/.test(s.fuelCapacityGal)
        ? s.fuelCapacityGal
        : defaultGal
    const num =
      typeof s?.truckNumber === "string" && s.truckNumber.trim().length > 0
        ? s.truckNumber.trim()
        : t.id
    out[t.id] = { truckNumber: num, fuelCapacityGal: cap }
  }
  return out
}

export function loadTruckSpecs(trucks: Truck[]): TruckSpecsState {
  const empty: TruckSpecsState = {}
  if (typeof window === "undefined") {
    return mergeTruckSpecsWithDefaults(trucks, empty)
  }
  const raw = window.localStorage.getItem(TRUCK_SPECS_STORAGE_KEY)
  if (!raw) {
    return mergeTruckSpecsWithDefaults(trucks, empty)
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isTruckSpecsState(parsed)) {
      return mergeTruckSpecsWithDefaults(trucks, empty)
    }
    return mergeTruckSpecsWithDefaults(trucks, parsed)
  } catch {
    return mergeTruckSpecsWithDefaults(trucks, empty)
  }
}

export function saveTruckSpecs(data: TruckSpecsState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TRUCK_SPECS_STORAGE_KEY, JSON.stringify(data))
}

/** Default gallons for a truck id (stable vs sorted fleet order). */
export function defaultFuelCapacityGalForTruck(trucks: Truck[], truckId: string): string {
  const sorted = [...trucks].sort((a, b) => a.id.localeCompare(b.id))
  const i = sorted.findIndex((t) => t.id === truckId)
  const idx = i >= 0 ? i : 0
  return String(CAPACITY_PRESETS_GAL[idx % CAPACITY_PRESETS_GAL.length])
}
