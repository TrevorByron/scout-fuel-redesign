import { type FuelTransaction } from "@/lib/mock-data"

export const PILOT_REBATE_BRANDS = ["Pilot Flying J", "Pilot", "Flying J"] as const

export function isPilotTransaction(t: FuelTransaction): boolean {
  return PILOT_REBATE_BRANDS.some((brand) => t.stationBrand.toLowerCase().includes(brand.toLowerCase()))
}

export interface RebateTier {
  label: string
  minSpendDollars: number
  maxSpendDollars: number
  /** Fraction of eligible Pilot spend returned as rebate (e.g. 0.0055 = 0.55%). */
  rebateRateOnSpend: number
}

/** Monthly Pilot spend thresholds for tier placement; rebate is a percentage of month-to-date Pilot spend. */
export const REBATE_TIERS: RebateTier[] = [
  { label: "Tier 1", minSpendDollars: 0, maxSpendDollars: 550_000, rebateRateOnSpend: 0.0055 },
  { label: "Tier 2", minSpendDollars: 550_000, maxSpendDollars: 1_300_000, rebateRateOnSpend: 0.011 },
  { label: "Tier 3", minSpendDollars: 1_300_000, maxSpendDollars: Number.POSITIVE_INFINITY, rebateRateOnSpend: 0.019 },
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

function sumPilotSpendDollars(txns: FuelTransaction[], start: Date, end: Date): number {
  return txns.reduce((sum, t) => {
    if (!isPilotTransaction(t)) return sum
    if (!isWithin(t.dateTime, start, end)) return sum
    return sum + t.totalCost
  }, 0)
}

function getTierForSpend(spendDollars: number): RebateTier {
  return (
    REBATE_TIERS.find((tier) => spendDollars >= tier.minSpendDollars && spendDollars < tier.maxSpendDollars) ??
    REBATE_TIERS[REBATE_TIERS.length - 1]!
  )
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long" })
}

export interface PilotRebateSummary {
  previousMonth: {
    monthLabel: string
    spendDollars: number
    tier: RebateTier
    rebateDollars: number
  }
  currentMonth: {
    monthLabel: string
    spendDollars: number
    tier: RebateTier
    rebateDollars: number
  }
  nextTier?: {
    tier: RebateTier
    unlockSpendDollars: number
    spendToNextTierDollars: number
    additionalDollarsAtNextRate: number
  }
  daysLeftInMonth: number
  resetDateLabel: string
  progressPctToNextTier: number
  projectedSpendDollars: number
  shortfallSpendDollars: number
}

export function getPilotRebateSummary(
  allTransactions: FuelTransaction[],
  asOfDate: Date
): PilotRebateSummary {
  const { start: currentStart, end: currentEnd } = getMonthRange(asOfDate)
  const prevMonthDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 15)
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthDate)

  const currentSpend = sumPilotSpendDollars(allTransactions, currentStart, currentEnd)
  const prevSpend = sumPilotSpendDollars(allTransactions, prevStart, prevEnd)

  const currentTier = getTierForSpend(currentSpend)
  const prevTier = getTierForSpend(prevSpend)

  const currentRebate = Math.round(currentSpend * currentTier.rebateRateOnSpend)
  const prevRebate = Math.round(prevSpend * prevTier.rebateRateOnSpend)

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
  let projectedSpendDollars = currentSpend
  let shortfallSpendDollars = 0

  if (nextTier) {
    const unlockSpendDollars = nextTier.minSpendDollars
    const spendToNextTierDollars = Math.max(0, unlockSpendDollars - currentSpend)

    const perDay = todayDay > 0 ? currentSpend / todayDay : 0
    projectedSpendDollars = perDay > 0 ? perDay * daysInMonth : currentSpend
    shortfallSpendDollars = Math.max(0, unlockSpendDollars - projectedSpendDollars)

    const currentAtUnlock = unlockSpendDollars * currentTier.rebateRateOnSpend
    const nextAtUnlock = unlockSpendDollars * nextTier.rebateRateOnSpend
    const additionalDollarsAtNextRate = Math.round(nextAtUnlock - currentAtUnlock)

    const denom = unlockSpendDollars > 0 ? unlockSpendDollars : 1
    progressPctToNextTier = Math.max(0, Math.min(100, (currentSpend / denom) * 100))

    nextTierDetails = {
      tier: nextTier,
      unlockSpendDollars,
      spendToNextTierDollars,
      additionalDollarsAtNextRate,
    }
  }

  return {
    previousMonth: {
      monthLabel: formatMonthLabel(prevStart),
      spendDollars: prevSpend,
      tier: prevTier,
      rebateDollars: prevRebate,
    },
    currentMonth: {
      monthLabel: formatMonthLabel(currentStart),
      spendDollars: currentSpend,
      tier: currentTier,
      rebateDollars: currentRebate,
    },
    nextTier: nextTierDetails,
    daysLeftInMonth,
    resetDateLabel,
    progressPctToNextTier,
    projectedSpendDollars,
    shortfallSpendDollars,
  }
}
