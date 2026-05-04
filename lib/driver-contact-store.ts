"use client"

export type DriverContactRow = {
  phone: string
  email: string
}

export type DriverContactsState = Record<string, DriverContactRow>

/** Minimal shape needed to build defaults and merge stored contacts. */
export type DriverContactFleetSource = readonly { driverId: string; driverName: string }[]

const DRIVER_CONTACTS_STORAGE_KEY = "scoutfuel:driver-contacts"

const MOCK_AREA_CODES = ["555", "214", "312", "617", "404", "303", "512", "713"]

function slugPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function mockEmailForDriver(driverName: string): string {
  const parts = driverName.trim().split(/\s+/).filter(Boolean)
  const first = slugPart(parts[0] ?? "driver")
  const last = slugPart(parts[parts.length - 1] ?? "fleet")
  return `${first}.${last}@demo.scoutfleet.io`
}

function mockPhoneForDriver(driverId: string): string {
  const n = parseInt(driverId.replace(/\D/g, ""), 10) || 1
  const area = MOCK_AREA_CODES[(n - 1) % MOCK_AREA_CODES.length]
  const middle = String(200 + (n % 800)).padStart(3, "0")
  const last = String(1000 + ((n * 17) % 9000)).padStart(4, "0")
  return `+1 (${area}) ${middle}-${last}`
}

function buildMockDriverContactsForFleet(fleet: DriverContactFleetSource): DriverContactsState {
  const out: DriverContactsState = {}
  for (const d of fleet) {
    out[d.driverId] = {
      phone: mockPhoneForDriver(d.driverId),
      email: mockEmailForDriver(d.driverName),
    }
  }
  return out
}

export function mergeDriverContactsWithDefaults(
  fleet: DriverContactFleetSource,
  stored: DriverContactsState
): DriverContactsState {
  const defaults = buildMockDriverContactsForFleet(fleet)
  const out: DriverContactsState = {}
  for (const d of fleet) {
    const row = stored[d.driverId]
    const def = defaults[d.driverId]!
    out[d.driverId] = {
      phone: row !== undefined ? row.phone : def.phone,
      email: row !== undefined ? row.email : def.email,
    }
  }
  return out
}

function isDriverContactRow(value: unknown): value is DriverContactRow {
  if (!value || typeof value !== "object") return false
  const r = value as Record<string, unknown>
  return typeof r.phone === "string" && typeof r.email === "string"
}

function isDriverContactsState(value: unknown): value is DriverContactsState {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  for (const v of Object.values(o)) {
    if (!isDriverContactRow(v)) return false
  }
  return true
}

/** Full mock phone/email for every fleet driver (no localStorage read). */
export function defaultDriverContacts(fleet: DriverContactFleetSource): DriverContactsState {
  return mergeDriverContactsWithDefaults(fleet, {})
}

export function loadDriverContacts(fleet: DriverContactFleetSource): DriverContactsState {
  if (typeof window === "undefined") return defaultDriverContacts(fleet)
  const raw = window.localStorage.getItem(DRIVER_CONTACTS_STORAGE_KEY)
  if (!raw) return defaultDriverContacts(fleet)
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isDriverContactsState(parsed)) return defaultDriverContacts(fleet)
    return mergeDriverContactsWithDefaults(fleet, parsed)
  } catch {
    return defaultDriverContacts(fleet)
  }
}

export function saveDriverContacts(data: DriverContactsState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRIVER_CONTACTS_STORAGE_KEY, JSON.stringify(data))
}
