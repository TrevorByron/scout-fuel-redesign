import type { FuelTransaction, BetterOption } from "@/lib/mock-data"
import { getFuelTransactions } from "@/lib/mock-data"

const LOCATION_KEY_SEP = "\u001f"

/** Display name for a location: fuel chain at city (e.g. "Love's Las Vegas, NV"). */
export function getLocationDisplayName(stationBrand: string, city: string): string {
  return `${stationBrand} ${city}`
}

/** Stable internal key for a location (stationBrand + city). */
export function getLocationKey(stationBrand: string, city: string): string {
  return `${stationBrand}${LOCATION_KEY_SEP}${city}`
}

/** Parse location key into [stationBrand, city]. */
function parseLocationKey(key: string): [string, string] | null {
  const i = key.indexOf(LOCATION_KEY_SEP)
  if (i < 0) return null
  return [key.slice(0, i), key.slice(i + 1)]
}

/** Parse "City, ST" from transaction location string. */
export function getCityStateFromLocation(location: string): { city: string; state: string } {
  const comma = location.indexOf(", ")
  const city = comma >= 0 ? location.slice(0, comma).trim() : location
  const state = comma >= 0 ? location.slice(comma + 2).trim() : ""
  return { city, state }
}

/** All unique locations (chain + city) from transactions, sorted by display name. */
const ALL_LOCATION_KEYS = (() => {
  const set = new Set<string>()
  for (const t of getFuelTransactions()) {
    set.add(getLocationKey(t.stationBrand, t.location))
  }
  return [...set]
    .map((k) => {
      const p = parseLocationKey(k)
      return p ? { key: k, display: getLocationDisplayName(p[0], p[1]) } : null
    })
    .filter((x): x is { key: string; display: string } => x != null)
    .sort((a, b) => a.display.localeCompare(b.display))
})()

/** Convert "Love's Las Vegas, NV" -> "loves-las-vegas-nv". */
export function locationToSlug(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/,\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/** Convert slug to display name (chain + city) or null if no match. */
export function getLocationBySlug(slug: string): string | null {
  if (!slug || typeof slug !== "string") return null
  const normalized = locationToSlug(slug) || slug.trim().toLowerCase()
  const found = ALL_LOCATION_KEYS.find(
    (loc) => locationToSlug(loc.display) === normalized
  )
  return found?.display ?? null
}

/** Get location key from display name (e.g. "Love's Las Vegas, NV"). */
export function getLocationKeyFromDisplay(displayName: string): string | null {
  const found = ALL_LOCATION_KEYS.find((loc) => loc.display === displayName)
  return found?.key ?? null
}

/** All location keys with display names (for iteration). */
export function getAllLocationKeys(): { key: string; display: string }[] {
  return [...ALL_LOCATION_KEYS]
}

export type DateRange = { from: Date; to?: Date }

function isInDateRange(t: FuelTransaction, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  const tDate = new Date(t.dateTime).getTime()
  if (tDate < range.from.getTime()) return false
  const toEnd = range.to
    ? range.to.getTime() + 86400000
    : range.from.getTime() + 86400000
  if (tDate > toEnd) return false
  return true
}

function getOverpaidAmount(t: FuelTransaction): number {
  if (
    t.betterOption?.potentialSavings != null &&
    t.betterOption.potentialSavings > 0
  ) {
    return t.betterOption.potentialSavings
  }
  if (t.variance < 0) return Math.abs(t.variance)
  return 0
}

/** Match transaction to location by key (stationBrand + city). */
function transactionMatchesLocation(t: FuelTransaction, locationKey: string): boolean {
  return getLocationKey(t.stationBrand, t.location) === locationKey
}

export interface LocationListStats {
  locationKey: string
  displayName: string
  totalGallons: number
  transactionCount: number
  efficiencyPct: number
  missedSavings: number
  /** Number of fill-ups outside optimized locations (bad stops) at this location. */
  badStopsCount: number
  /** Average missed savings per fill-up outside optimized locations (bad stops only). */
  avgMissedSavingsPerBadStop: number
  needsAttention: boolean
  lat: number
  lng: number
}

/** Aggregation logic shared by getLocationListStats and getLocationListStatsFromTransactions. */
function aggregateLocationStats(
  transactions: FuelTransaction[]
): LocationListStats[] {
  const byLocation = new Map<
    string,
    {
      displayName: string
      txns: FuelTransaction[]
      lat: number
      lng: number
    }
  >()

  for (const t of transactions) {
    const key = getLocationKey(t.stationBrand, t.location)
    const display = getLocationDisplayName(t.stationBrand, t.location)
    const existing = byLocation.get(key)
    if (existing) {
      existing.txns.push(t)
    } else {
      byLocation.set(key, {
        displayName: display,
        txns: [t],
        lat: t.lat,
        lng: t.lng,
      })
    }
  }

  const result: LocationListStats[] = []
  for (const [locationKey, data] of byLocation.entries()) {
    const txns = data.txns
    const totalGallons = txns.reduce((s, t) => s + t.gallons, 0)
    const inNetworkCount = txns.filter((t) => t.inNetwork).length
    const efficiencyPct =
      txns.length > 0 ? Math.round((inNetworkCount / txns.length) * 100) : 0
    const badStops = txns.filter((t) => !t.inNetwork && getOverpaidAmount(t) > 0)
    const badStopsCount = badStops.length
    const missedSavings = Math.round(
      badStops.reduce((s, t) => s + getOverpaidAmount(t), 0)
    )
    const avgMissedSavingsPerBadStop =
      badStopsCount > 0 ? Math.round(missedSavings / badStopsCount) : 0
    // Needs attention when drivers regularly use this location when not optimized (2+ bad stops) and there is enough volume (5+ transactions).
    const needsAttention = badStopsCount >= 2 && txns.length >= 5

    result.push({
      locationKey,
      displayName: data.displayName,
      totalGallons: Math.round(totalGallons * 10) / 10,
      transactionCount: txns.length,
      efficiencyPct,
      missedSavings,
      badStopsCount,
      avgMissedSavingsPerBadStop,
      needsAttention,
      lat: data.lat,
      lng: data.lng,
    })
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** List stats per location for the given date range. */
export function getLocationListStats(
  range: DateRange | undefined
): LocationListStats[] {
  const inRange = range
    ? getFuelTransactions().filter((t) => isInDateRange(t, range))
    : getFuelTransactions()
  return aggregateLocationStats(inRange)
}

/** List stats per location from a pre-filtered transaction list. Use when filters (driver, station, etc.) are applied elsewhere. */
export function getLocationListStatsFromTransactions(
  transactions: FuelTransaction[]
): LocationListStats[] {
  return aggregateLocationStats(transactions)
}

export interface LocationSummaryStats {
  thisPeriodScorePct: number
  lastPeriodScorePct: number
  overpaidThisPeriod: number
  outOfNetworkStopsThisPeriod: number
  avgCpgPaid: number
  totalGallons: number
  fuelTypeLabel: string
  /** Average missed savings per fill-up outside optimized locations this period. */
  avgMissedSavingsPerBadStop: number
}

/** Summary stats for a single location (this period vs previous period). */
export function getLocationSummaryStats(
  locationKey: string,
  thisPeriodRange: DateRange,
  lastPeriodRange: DateRange
): LocationSummaryStats {
  const allAtLocation = getFuelTransactions().filter((t) =>
    transactionMatchesLocation(t, locationKey)
  )
  const thisPeriod = allAtLocation.filter((t) => isInDateRange(t, thisPeriodRange))
  const lastPeriod = allAtLocation.filter((t) => isInDateRange(t, lastPeriodRange))

  const thisInNetwork = thisPeriod.filter((t) => t.inNetwork).length
  const thisPeriodScorePct =
    thisPeriod.length > 0
      ? Math.round((thisInNetwork / thisPeriod.length) * 100)
      : 0

  const lastInNetwork = lastPeriod.filter((t) => t.inNetwork).length
  const lastPeriodScorePct =
    lastPeriod.length > 0
      ? Math.round((lastInNetwork / lastPeriod.length) * 100)
      : 0

  const badStopsThisPeriod = thisPeriod.filter(
    (t) => !t.inNetwork && getOverpaidAmount(t) > 0
  )
  const overpaidThisPeriod = Math.round(
    thisPeriod
      .filter((t) => !t.inNetwork)
      .reduce((s, t) => s + getOverpaidAmount(t), 0)
  )
  const avgMissedSavingsPerBadStop =
    badStopsThisPeriod.length > 0
      ? Math.round(overpaidThisPeriod / badStopsThisPeriod.length)
      : 0

  const totalCost = thisPeriod.reduce((s, t) => s + t.totalCost, 0)
  const totalGallons = thisPeriod.reduce((s, t) => s + t.gallons, 0)
  const avgCpgPaid =
    totalGallons > 0 ? Math.round((totalCost / totalGallons) * 100) / 100 : 0

  const fuelTypes = [...new Set(thisPeriod.map((t) => t.fuelType))].filter(
    (f) => f !== "DEF"
  )
  const fuelTypeLabel =
    fuelTypes.length === 0 ? "—" : fuelTypes.sort().join(" + ")

  return {
    thisPeriodScorePct,
    lastPeriodScorePct,
    overpaidThisPeriod,
    outOfNetworkStopsThisPeriod: badStopsThisPeriod.length,
    avgCpgPaid,
    totalGallons: Math.round(totalGallons * 10) / 10,
    fuelTypeLabel,
    avgMissedSavingsPerBadStop,
  }
}

export interface DriverAtLocation {
  driverName: string
  transactionCount: number
  missedSavings: number
  efficiencyPct: number
}

/** Drivers who used this location in the range, with stats. Sorted by missed savings desc. */
export function getDriversAtLocation(
  locationKey: string,
  range: DateRange
): DriverAtLocation[] {
  const inRange = getFuelTransactions().filter(
    (t) => isInDateRange(t, range) && transactionMatchesLocation(t, locationKey)
  )

  const byDriver = new Map<
    string,
    { inNetwork: number; missedSavings: number; count: number }
  >()
  for (const t of inRange) {
    const existing = byDriver.get(t.driverName)
    const overpaid = getOverpaidAmount(t)
    if (existing) {
      existing.count += 1
      if (t.inNetwork) existing.inNetwork += 1
      existing.missedSavings += overpaid
    } else {
      byDriver.set(t.driverName, {
        count: 1,
        inNetwork: t.inNetwork ? 1 : 0,
        missedSavings: overpaid,
      })
    }
  }

  const list: DriverAtLocation[] = []
  for (const [driverName, data] of byDriver.entries()) {
    const efficiencyPct =
      data.count > 0 ? Math.round((data.inNetwork / data.count) * 100) : 0
    list.push({
      driverName,
      transactionCount: data.count,
      missedSavings: Math.round(data.missedSavings),
      efficiencyPct,
    })
  }
  return list.sort((a, b) => b.missedSavings - a.missedSavings)
}

export interface LocationEfficiencyTrendPoint {
  weekLabel: string
  scorePct: number
}

/** Efficiency score by week for this location (last N weeks). */
export function getLocationEfficiencyTrend(
  locationKey: string,
  numberOfWeeks = 8
): LocationEfficiencyTrendPoint[] {
  const atLocation = getFuelTransactions().filter((t) =>
    transactionMatchesLocation(t, locationKey)
  )
  const result: LocationEfficiencyTrendPoint[] = []
  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  for (let i = numberOfWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisWeekStart)
    weekStart.setDate(thisWeekStart.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    if (i === 0) {
      weekEnd.setTime(now.getTime())
    } else {
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
    }

    const inWeek = atLocation.filter((t) => {
      const tDate = new Date(t.dateTime).getTime()
      return tDate >= weekStart.getTime() && tDate <= weekEnd.getTime()
    })
    const inNetwork = inWeek.filter((t) => t.inNetwork).length
    const scorePct =
      inWeek.length > 0 ? Math.round((inNetwork / inWeek.length) * 100) : 0
    result.push({
      weekLabel: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      scorePct,
    })
  }
  return result
}

/** Representative better option for a set of transactions: the in-network option that appears most often. */
export function getRepresentativeBetterOption(
  transactions: FuelTransaction[]
): Pick<BetterOption, "stationName" | "location" | "lat" | "lng"> | null {
  const withOption = transactions.filter((t) => t.betterOption != null)
  if (withOption.length === 0) return null
  const key = (opt: NonNullable<FuelTransaction["betterOption"]>) =>
    `${opt.stationName}\u001f${opt.location}`
  const count = new Map<string, { option: NonNullable<FuelTransaction["betterOption"]>; n: number }>()
  for (const t of withOption) {
    const opt = t.betterOption!
    const k = key(opt)
    const existing = count.get(k)
    if (existing) {
      existing.n += 1
    } else {
      count.set(k, { option: opt, n: 1 })
    }
  }
  let best: { option: NonNullable<FuelTransaction["betterOption"]>; n: number } | null = null
  for (const v of count.values()) {
    if (!best || v.n > best.n) best = v
  }
  if (!best) return null
  const { stationName, location, lat, lng } = best.option
  return { stationName, location, lat, lng }
}
