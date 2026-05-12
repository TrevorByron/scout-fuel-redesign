"use client"

import type { Truck } from "@/lib/mock-data"

export type TruckSpecRow = {
  truckNumber: string
  fuelCapacityGal: string
  make: string
  model: string
  /** Miles per gallon, e.g. "6.8" */
  mpg: string
}

export type TruckSpecsState = Record<string, TruckSpecRow>

const TRUCK_SPECS_STORAGE_KEY = "scoutfuel:truck-specs"

/** Believable diesel tank sizes (gal) for Class 8–style equipment; cycled by row index. */
const CAPACITY_PRESETS_GAL = [
  450, 400, 500, 350, 425, 300, 475, 380, 420, 440, 360, 390, 410, 430, 460, 320,
]

const MAKE_MODEL_PRESETS: ReadonlyArray<{ make: string; model: string }> = [
  { make: "Freightliner", model: "Cascadia" },
  { make: "Peterbilt", model: "579" },
  { make: "Kenworth", model: "T680" },
  { make: "Volvo", model: "VNL 860" },
  { make: "International", model: "LT Series" },
  { make: "Mack", model: "Anthem" },
  { make: "Western Star", model: "49X" },
  { make: "Freightliner", model: "M2 112" },
  { make: "Peterbilt", model: "389" },
  { make: "Kenworth", model: "W990" },
  { make: "Volvo", model: "VNR" },
  { make: "International", model: "RH Series" },
  { make: "Mack", model: "Granite" },
  { make: "Freightliner", model: "108SD" },
  { make: "Western Star", model: "5700XE" },
  { make: "Kenworth", model: "T880" },
]

const MPG_MIN = 4
const MPG_MAX = 25

/** Persisted rows may omit make/model/mpg (older clients). */
function isTruckSpecRow(value: unknown): value is TruckSpecRow {
  if (!value || typeof value !== "object") return false
  const r = value as Record<string, unknown>
  return typeof r.truckNumber === "string" && typeof r.fuelCapacityGal === "string"
}

function truckSortedIndex(trucks: Truck[], truckId: string): number {
  const sorted = [...trucks].sort((a, b) => a.id.localeCompare(b.id))
  const i = sorted.findIndex((t) => t.id === truckId)
  return i >= 0 ? i : 0
}

export function defaultMakeModelForTruck(trucks: Truck[], truckId: string): { make: string; model: string } {
  const i = truckSortedIndex(trucks, truckId)
  return MAKE_MODEL_PRESETS[i % MAKE_MODEL_PRESETS.length]!
}

export function defaultMpgStringForTruck(truck: Truck): string {
  return truck.avgMpg.toFixed(1)
}

export function defaultTruckSpecRowForTruck(trucks: Truck[], truck: Truck): TruckSpecRow {
  const mm = defaultMakeModelForTruck(trucks, truck.id)
  return {
    truckNumber: truck.id,
    fuelCapacityGal: defaultFuelCapacityGalForTruck(trucks, truck.id),
    make: mm.make,
    model: mm.model,
    mpg: defaultMpgStringForTruck(truck),
  }
}

/** Normalize user-entered MPG on blur. */
export function normalizeMpgString(raw: string, fallback: string): string {
  const n = Number.parseFloat(raw.trim())
  if (!Number.isFinite(n)) return fallback
  const clamped = Math.min(MPG_MAX, Math.max(MPG_MIN, n))
  return clamped.toFixed(1)
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
    const preset = MAKE_MODEL_PRESETS[i % MAKE_MODEL_PRESETS.length]!
    const make =
      typeof s?.make === "string" && s.make.trim().length > 0 ? s.make.trim() : preset.make
    const model =
      typeof s?.model === "string" && s.model.trim().length > 0 ? s.model.trim() : preset.model
    const defaultMpg = defaultMpgStringForTruck(t)
    const mpgRaw = typeof s?.mpg === "string" ? s.mpg.trim() : ""
    const mpg =
      mpgRaw.length > 0 && Number.isFinite(Number.parseFloat(mpgRaw))
        ? normalizeMpgString(mpgRaw, defaultMpg)
        : defaultMpg
    out[t.id] = { truckNumber: num, fuelCapacityGal: cap, make, model, mpg }
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
