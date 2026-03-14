import type { FuelTransaction } from "@/lib/mock-data"
import { fuelTransactions, driverDetails } from "@/lib/mock-data"

/** All unique driver names from transactions (same source as drivers list page). */
const FLEET_DRIVER_NAMES = [...new Set(fuelTransactions.map((t) => t.driverName))].sort()

/** Convert "Karen White" -> "karen-white". */
export function driverNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/** Convert "karen-white" -> "Karen White" or null if no match. */
export function getDriverNameBySlug(slug: string): string | null {
  if (!slug || typeof slug !== "string") return null
  const normalized = slug.trim().toLowerCase().replace(/\s+/g, "-")
  const found = FLEET_DRIVER_NAMES.find(
    (name) => driverNameToSlug(name) === normalized
  )
  return found ?? null
}

/** All fleet driver names (for iteration / slug validation). */
export function getAllDriverNames(): string[] {
  return [...FLEET_DRIVER_NAMES]
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

export interface DriverSummaryStats {
  thisWeekScorePct: number
  lastWeekScorePct: number
  overpaidThisWeek: number
  nonCompliantStopsThisWeek: number
  avgCpgPaid: number
  totalGallons: number
  fuelTypeLabel: string
}

const SCOUT_TARGET_CPG = 3.5

/** Compute summary metrics for the driver for this week vs last week. */
export function getDriverSummaryStats(
  driverName: string,
  thisWeekRange: DateRange,
  lastWeekRange: DateRange
): DriverSummaryStats {
  const allForDriver = fuelTransactions.filter((t) => t.driverName === driverName)
  const thisWeek = allForDriver.filter((t) => isInDateRange(t, thisWeekRange))
  const lastWeek = allForDriver.filter((t) => isInDateRange(t, lastWeekRange))

  const thisWeekInNetwork = thisWeek.filter((t) => t.inNetwork).length
  const thisWeekScorePct =
    thisWeek.length > 0
      ? Math.round((thisWeekInNetwork / thisWeek.length) * 100)
      : 0

  const lastWeekInNetwork = lastWeek.filter((t) => t.inNetwork).length
  const lastWeekScorePct =
    lastWeek.length > 0
      ? Math.round((lastWeekInNetwork / lastWeek.length) * 100)
      : 0

  const nonCompliantStopsThisWeek = thisWeek.filter((t) => !t.inNetwork).length
  const overpaidThisWeek = Math.round(
    thisWeek
      .filter((t) => !t.inNetwork)
      .reduce((s, t) => s + getOverpaidAmount(t), 0)
  )

  const totalCost = thisWeek.reduce((s, t) => s + t.totalCost, 0)
  const totalGallons = thisWeek.reduce((s, t) => s + t.gallons, 0)
  const avgCpgPaid =
    totalGallons > 0 ? Math.round((totalCost / totalGallons) * 100) / 100 : 0

  const fuelTypes = [...new Set(thisWeek.map((t) => t.fuelType))].filter(
    (f) => f !== "DEF"
  )
  const fuelTypeLabel =
    fuelTypes.length === 0
      ? "—"
      : fuelTypes.sort().join(" + ")

  return {
    thisWeekScorePct,
    lastWeekScorePct,
    overpaidThisWeek,
    nonCompliantStopsThisWeek,
    avgCpgPaid,
    totalGallons: Math.round(totalGallons * 10) / 10,
    fuelTypeLabel,
  }
}

export const SCOUT_TARGET_CPG_VALUE = SCOUT_TARGET_CPG

export interface DriverProfile {
  /** Display label for vehicle/unit (e.g. "Unit 13"). */
  unit: string
  /** Last 4 digits of the driver's fuel card (for display as ·· 1234). */
  fuelCardLast4: string
  corridor: string
  status: string
  badges: string[]
}

/** Deterministic 4-digit string from driver name (for mock fuel card last 4). */
function getFuelCardLast4(driverName: string): string {
  let n = 0
  for (let i = 0; i < driverName.length; i++) {
    n = (n * 31 + driverName.charCodeAt(i)) >>> 0
  }
  return String((n % 10000) + 10000).slice(-4)
}

/** Mock profile (unit, fuelCardLast4, corridor, status, badges) for summary block. Uses truckId as unit; corridor/status/badges from driverDetails when present else derived/placeholder. */
export function getDriverProfile(driverName: string): DriverProfile {
  const firstTxn = fuelTransactions.find((t) => t.driverName === driverName)
  const truckId = firstTxn?.truckId ?? "—"
  const unit = truckId !== "—" ? `Unit ${truckId.replace(/^T0?/, "")}` : "—"
  const fuelCardLast4 = getFuelCardLast4(driverName)

  const byId = Object.entries(driverDetails).find(
    ([_, d]) => d.driverName === driverName
  )
  const detail = byId?.[1]

  const corridor =
    (detail?.recentTrips?.length ?? 0) > 0
      ? "CA / NV corridor"
      : "CA / NV corridor" // placeholder for all drivers
  const status = "Active"

  const badges: string[] =
    detail?.badges ?? []
  if (badges.length === 0) {
    const allForDriver = fuelTransactions.filter(
      (t) => t.driverName === driverName
    )
    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    const thisWeekEnd = new Date()
    const thisWeek = allForDriver.filter((t) => {
      const d = new Date(t.dateTime).getTime()
      return d >= thisWeekStart.getTime() && d <= thisWeekEnd.getTime()
    })
    const inNetworkThisWeek = thisWeek.filter((t) => t.inNetwork).length
    const pct =
      thisWeek.length > 0
        ? (inNetworkThisWeek / thisWeek.length) * 100
        : 100
    if (pct < 60 && thisWeek.length >= 3) {
      badges.push("3 consecutive non-compliant weeks")
      badges.push("Worst CA corridor offender")
    }
  }

  return { unit, fuelCardLast4, corridor, status, badges }
}

export interface DriverComplianceTrendPoint {
  weekLabel: string
  scorePct: number
}

/** Compliance score by calendar week (Sun–Sat) for the last N weeks (oldest first, for chart). */
export function getDriverComplianceTrend(
  driverName: string,
  numberOfWeeks = 12
): DriverComplianceTrendPoint[] {
  const driverTxns = fuelTransactions.filter((t) => t.driverName === driverName)
  const result: DriverComplianceTrendPoint[] = []
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

    const inWeek = driverTxns.filter((t) => {
      const tDate = new Date(t.dateTime).getTime()
      return tDate >= weekStart.getTime() && tDate <= weekEnd.getTime()
    })
    const inNetwork = inWeek.filter((t) => t.inNetwork).length
    const scorePct =
      inWeek.length > 0 ? Math.round((inNetwork / inWeek.length) * 100) : 0
    const weekLabel = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    result.push({ weekLabel, scorePct })
  }

  return result
}

/** Threshold below which a driver is "needing attention" (same as Driver Insights page). */
export const NEEDS_ATTENTION_COMPLIANCE_THRESHOLD = 60

export interface DriverNeedingAttention {
  driverName: string
  missedSavings: number
  badStops: number
  compliancePct: number
}

/**
 * Drivers with compliance below 60% in the given period (same definition as Driver Insights).
 * Sorted by missed savings desc. Use for dashboard card and any "drivers needing attention" count.
 */
export function getDriversNeedingAttention(
  transactions: FuelTransaction[],
  range: DateRange
): DriverNeedingAttention[] {
  const inRange = transactions.filter((t) => isInDateRange(t, range))
  const byDriver = new Map<
    string,
    { txns: FuelTransaction[]; inNetwork: number; missedSavings: number; badStops: number }
  >()
  for (const t of inRange) {
    const existing = byDriver.get(t.driverName)
    const overpaid = getOverpaidAmount(t)
    const isBad = overpaid > 0
    if (existing) {
      existing.txns.push(t)
      if (t.inNetwork) existing.inNetwork += 1
      existing.missedSavings += overpaid
      if (isBad) existing.badStops += 1
    } else {
      byDriver.set(t.driverName, {
        txns: [t],
        inNetwork: t.inNetwork ? 1 : 0,
        missedSavings: overpaid,
        badStops: isBad ? 1 : 0,
      })
    }
  }
  const list: DriverNeedingAttention[] = []
  for (const [driverName, data] of byDriver.entries()) {
    const compliancePct =
      data.txns.length > 0
        ? Math.round((data.inNetwork / data.txns.length) * 100)
        : 100
    if (compliancePct < NEEDS_ATTENTION_COMPLIANCE_THRESHOLD) {
      list.push({
        driverName,
        missedSavings: Math.round(data.missedSavings),
        badStops: data.badStops,
        compliancePct,
      })
    }
  }
  return list.sort((a, b) => b.missedSavings - a.missedSavings)
}
