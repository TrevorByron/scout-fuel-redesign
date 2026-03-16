import { type FuelTransaction } from "@/lib/mock-data"

export const PILOT_REBATE_BRANDS = ["Pilot Flying J", "Pilot", "Flying J"] as const

export function isPilotTransaction(t: FuelTransaction): boolean {
  return PILOT_REBATE_BRANDS.some((brand) => t.stationBrand.toLowerCase().includes(brand.toLowerCase()))
}

export interface RebateTier {
  label: string
  minGallons: number
  maxGallons: number
  ratePerGallon: number
}

export const REBATE_TIERS: RebateTier[] = [
  { label: "Tier 1", minGallons: 0, maxGallons: 150_000, ratePerGallon: 0.02 },
  { label: "Tier 2", minGallons: 150_000, maxGallons: 350_000, ratePerGallon: 0.04 },
  { label: "Tier 3", minGallons: 350_000, maxGallons: Number.POSITIVE_INFINITY, ratePerGallon: 0.07 },
]

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function isWithin(dateTime: string, start: Date, end: Date): boolean {
  const t = new Date(dateTime).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function sumPilotGallons(txns: FuelTransaction[], start: Date, end: Date): number {
  return txns.reduce((sum, t) => {
    if (!isPilotTransaction(t)) return sum
    if (!isWithin(t.dateTime, start, end)) return sum
    return sum + t.gallons
  }, 0)
}

function getTierForGallons(gallons: number): RebateTier {
  return (
    REBATE_TIERS.find((tier) => gallons >= tier.minGallons && gallons < tier.maxGallons) ??
    REBATE_TIERS[REBATE_TIERS.length - 1]!
  )
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long" })
}

export interface PilotRebateSummary {
  previousMonth: {
    monthLabel: string
    gallons: number
    tier: RebateTier
    rebateDollars: number
  }
  currentMonth: {
    monthLabel: string
    gallons: number
    tier: RebateTier
    rebateDollars: number
  }
  nextTier?: {
    tier: RebateTier
    unlockGallons: number
    gallonsToNextTier: number
    additionalDollarsAtNextRate: number
  }
  daysLeftInMonth: number
  resetDateLabel: string
  progressPctToNextTier: number
  projectedGallons: number
  shortfallGallons: number
}

export function getPilotRebateSummary(
  allTransactions: FuelTransaction[],
  asOfDate: Date
): PilotRebateSummary {
  const { start: currentStart, end: currentEnd } = getMonthRange(asOfDate)
  const prevMonthDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 15)
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthDate)

  const currentGallons = sumPilotGallons(allTransactions, currentStart, currentEnd)
  const prevGallons = sumPilotGallons(allTransactions, prevStart, prevEnd)

  const currentTier = getTierForGallons(currentGallons)
  const prevTier = getTierForGallons(prevGallons)

  const currentRebate = Math.round(currentGallons * currentTier.ratePerGallon)
  const prevRebate = Math.round(prevGallons * prevTier.ratePerGallon)

  const daysInMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0).getDate()
  const todayDay = asOfDate.getDate()
  const daysLeftInMonth = Math.max(0, daysInMonth - todayDay)
  const resetMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 1)
  const resetDateLabel = resetMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const hasNextTierIndex = REBATE_TIERS.findIndex((t) => t.label === currentTier.label)
  const nextTier = hasNextTierIndex >= 0 && hasNextTierIndex < REBATE_TIERS.length - 1
    ? REBATE_TIERS[hasNextTierIndex + 1]
    : undefined

  let nextTierDetails: PilotRebateSummary["nextTier"] | undefined
  let progressPctToNextTier = 100
  let projectedGallons = currentGallons
  let shortfallGallons = 0

  if (nextTier) {
    const unlockGallons = nextTier.minGallons
    const gallonsToNextTier = Math.max(0, unlockGallons - currentGallons)

    const perDay = todayDay > 0 ? currentGallons / todayDay : 0
    projectedGallons = perDay > 0 ? perDay * daysInMonth : currentGallons
    shortfallGallons = Math.max(0, unlockGallons - projectedGallons)

    const currentAtUnlock = unlockGallons * currentTier.ratePerGallon
    const nextAtUnlock = unlockGallons * nextTier.ratePerGallon
    const additionalDollarsAtNextRate = Math.round(nextAtUnlock - currentAtUnlock)

    const denom = unlockGallons > 0 ? unlockGallons : 1
    progressPctToNextTier = Math.max(0, Math.min(100, (currentGallons / denom) * 100))

    nextTierDetails = {
      tier: nextTier,
      unlockGallons,
      gallonsToNextTier,
      additionalDollarsAtNextRate,
    }
  }

  return {
    previousMonth: {
      monthLabel: formatMonthLabel(prevStart),
      gallons: prevGallons,
      tier: prevTier,
      rebateDollars: prevRebate,
    },
    currentMonth: {
      monthLabel: formatMonthLabel(currentStart),
      gallons: currentGallons,
      tier: currentTier,
      rebateDollars: currentRebate,
    },
    nextTier: nextTierDetails,
    daysLeftInMonth,
    resetDateLabel,
    progressPctToNextTier,
    projectedGallons,
    shortfallGallons,
  }
}

