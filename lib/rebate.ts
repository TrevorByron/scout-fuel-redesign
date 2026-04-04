import { type FuelTransaction, type FuelType } from "@/lib/mock-data"

export const PILOT_REBATE_BRANDS = ["Pilot Flying J", "Pilot", "Flying J"] as const

export function isPilotTransaction(t: FuelTransaction): boolean {
  return PILOT_REBATE_BRANDS.some((brand) => t.stationBrand.toLowerCase().includes(brand.toLowerCase()))
}

export interface RebateTier {
  label: string
  minSpendDollars: number
  maxSpendDollars: number
  /** Fraction of eligible spend returned at base rate before per-fuel multipliers. */
  rebateRateOnSpend: number
}

/** Monthly Pilot tier ladder (weighted eligible spend). */
export const REBATE_TIERS: RebateTier[] = [
  { label: "Tier 1", minSpendDollars: 0, maxSpendDollars: 550_000, rebateRateOnSpend: 0.0055 },
  { label: "Tier 2", minSpendDollars: 550_000, maxSpendDollars: 1_300_000, rebateRateOnSpend: 0.011 },
  { label: "Tier 3", minSpendDollars: 1_300_000, maxSpendDollars: Number.POSITIVE_INFINITY, rebateRateOnSpend: 0.019 },
]

/** Smaller Love's network program — different thresholds (mock). */
const LOVES_REBATE_TIERS: RebateTier[] = [
  { label: "Base", minSpendDollars: 0, maxSpendDollars: 120_000, rebateRateOnSpend: 0.004 },
  { label: "Plus", minSpendDollars: 120_000, maxSpendDollars: Number.POSITIVE_INFINITY, rebateRateOnSpend: 0.0075 },
]

export interface FuelRebateRule {
  /** Weight toward tier ladder (0 = excluded from tier placement). */
  tierWeight: number
  /** Multiplier on tier base rebate rate for this fuel. */
  rebateRateMultiplier: number
}

export interface RebateProgramDefinition {
  id: string
  shortLabel: string
  eligibilityHint: string
  stationBrandMatchers: readonly string[]
  tierLadder: RebateTier[]
  fuelRules: Record<FuelType, FuelRebateRule>
}

const DEFAULT_UNIFORM_RULES: Record<FuelType, FuelRebateRule> = {
  Diesel: { tierWeight: 1, rebateRateMultiplier: 1 },
  Reefer: { tierWeight: 1, rebateRateMultiplier: 1 },
  DEF: { tierWeight: 1, rebateRateMultiplier: 1 },
}

export const REBATE_PROGRAMS: RebateProgramDefinition[] = [
  {
    id: "pilot",
    shortLabel: "Pilot",
    eligibilityHint: "Pilot Flying J network; DEF earns at half the posted tier rate.",
    stationBrandMatchers: PILOT_REBATE_BRANDS,
    tierLadder: REBATE_TIERS,
    fuelRules: {
      ...DEFAULT_UNIFORM_RULES,
      DEF: { tierWeight: 1, rebateRateMultiplier: 0.5 },
    },
  },
  {
    id: "loves",
    shortLabel: "Love's",
    eligibilityHint: "Love's Travel Stops; DEF purchases excluded from tier and rebate.",
    stationBrandMatchers: ["Love's", "Loves"],
    tierLadder: LOVES_REBATE_TIERS,
    fuelRules: {
      Diesel: { tierWeight: 1, rebateRateMultiplier: 1 },
      Reefer: { tierWeight: 1, rebateRateMultiplier: 0.75 },
      DEF: { tierWeight: 0, rebateRateMultiplier: 0 },
    },
  },
]

export interface RebateFuelBreakdown {
  fuelType: FuelType
  eligibleSpendDollars: number
  rebateDollars: number
  rebateRateMultiplier: number
  tierWeight: number
}

export interface RebateMonthSlice {
  monthLabel: string
  /** Raw spend at program-eligible locations (all products). */
  spendDollars: number
  /** Weighted dollars that determine tier (same units as tier ladder). */
  tierWeightedSpendDollars: number
  tier: RebateTier
  rebateDollars: number
}

export interface RebateProgramSummary {
  programId: string
  shortLabel: string
  eligibilityHint: string
  previousMonth: RebateMonthSlice
  currentMonth: RebateMonthSlice
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
  byFuel: RebateFuelBreakdown[]
  /** Show accordion when rules vary by fuel or any fuel has zero rebate but non-zero spend. */
  showFuelBreakdown: boolean
}

export interface CarrierRebateOverview {
  programs: RebateProgramSummary[]
  totalMtdRebateDollars: number
  totalPreviousMonthRebateDollars: number
  /** Program whose tier progress bar to show in the sidebar (closest to next tier unlock). */
  primaryProgramId: string | null
}

/** @deprecated Use RebateProgramSummary with programId pilot — kept for narrow typings. */
export type PilotRebateSummary = RebateProgramSummary

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function isWithin(dateTime: string, start: Date, end: Date): boolean {
  const t = new Date(dateTime).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

export function isProgramTransaction(t: FuelTransaction, def: RebateProgramDefinition): boolean {
  const b = t.stationBrand.toLowerCase().replace(/['']/g, "")
  return def.stationBrandMatchers.some((m) => b.includes(m.toLowerCase().replace(/['']/g, "")))
}

export function getTierForSpend(spendDollars: number, ladder: RebateTier[]): RebateTier {
  return (
    ladder.find((tier) => spendDollars >= tier.minSpendDollars && spendDollars < tier.maxSpendDollars) ??
    ladder[ladder.length - 1]!
  )
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long" })
}

function fuelRulesAreUniform(def: RebateProgramDefinition): boolean {
  const d = def.fuelRules.Diesel
  return (
    def.fuelRules.Reefer.tierWeight === d.tierWeight &&
    def.fuelRules.Reefer.rebateRateMultiplier === d.rebateRateMultiplier &&
    def.fuelRules.DEF.tierWeight === d.tierWeight &&
    def.fuelRules.DEF.rebateRateMultiplier === d.rebateRateMultiplier
  )
}

function computeProgramMonth(
  def: RebateProgramDefinition,
  txns: FuelTransaction[],
  start: Date,
  end: Date
): {
  slice: RebateMonthSlice
  byFuel: RebateFuelBreakdown[]
  nextTierInput: {
    tierWeightedSpend: number
    tier: RebateTier
    rawSpend: number
  }
  showFuelBreakdown: boolean
} {
  const monthTxns = txns.filter((t) => isProgramTransaction(t, def) && isWithin(t.dateTime, start, end))

  const tierWeightedSpend = monthTxns.reduce(
    (s, t) => s + t.totalCost * def.fuelRules[t.fuelType].tierWeight,
    0
  )
  const rawSpend = monthTxns.reduce((s, t) => s + t.totalCost, 0)
  const tier = getTierForSpend(tierWeightedSpend, def.tierLadder)

  const byFuelMap = new Map<FuelType, { spend: number; rebate: number }>()
  for (const t of monthTxns) {
    const rule = def.fuelRules[t.fuelType]
    const rebatePortion = t.totalCost * tier.rebateRateOnSpend * rule.rebateRateMultiplier
    const cur = byFuelMap.get(t.fuelType) ?? { spend: 0, rebate: 0 }
    cur.spend += t.totalCost
    cur.rebate += rebatePortion
    byFuelMap.set(t.fuelType, cur)
  }

  const fuelOrder: FuelType[] = ["Diesel", "Reefer", "DEF"]
  const byFuel: RebateFuelBreakdown[] = fuelOrder
    .filter((ft) => byFuelMap.has(ft))
    .map((fuelType) => {
      const agg = byFuelMap.get(fuelType)!
      const rule = def.fuelRules[fuelType]
      return {
        fuelType,
        eligibleSpendDollars: agg.spend,
        rebateDollars: Math.round(agg.rebate),
        rebateRateMultiplier: rule.rebateRateMultiplier,
        tierWeight: rule.tierWeight,
      }
    })

  const rebateTotal = Math.round(
    monthTxns.reduce(
      (s, t) => s + t.totalCost * tier.rebateRateOnSpend * def.fuelRules[t.fuelType].rebateRateMultiplier,
      0
    )
  )

  const showFuelBreakdown =
    !fuelRulesAreUniform(def) ||
    byFuel.some((b) => b.rebateRateMultiplier !== def.fuelRules.Diesel.rebateRateMultiplier) ||
    byFuel.some((b) => b.tierWeight === 0 && b.eligibleSpendDollars > 0)

  return {
    slice: {
      monthLabel: formatMonthLabel(start),
      spendDollars: rawSpend,
      tierWeightedSpendDollars: tierWeightedSpend,
      tier,
      rebateDollars: rebateTotal,
    },
    byFuel,
    nextTierInput: { tierWeightedSpend, tier, rawSpend },
    showFuelBreakdown,
  }
}

function computeProgramSummary(
  def: RebateProgramDefinition,
  allTransactions: FuelTransaction[],
  asOfDate: Date
): RebateProgramSummary {
  const { start: currentStart, end: currentEnd } = getMonthRange(asOfDate)
  const prevMonthDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 15)
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthDate)

  const current = computeProgramMonth(def, allTransactions, currentStart, currentEnd)
  const prev = computeProgramMonth(def, allTransactions, prevStart, prevEnd)

  const daysInMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0).getDate()
  const todayDay = asOfDate.getDate()
  const daysLeftInMonth = Math.max(0, daysInMonth - todayDay)
  const resetMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 1)
  const resetDateLabel = resetMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const ladder = def.tierLadder
  const currentTier = current.nextTierInput.tier
  const tierWeightedCurrent = current.nextTierInput.tierWeightedSpend

  const idx = ladder.findIndex((t) => t.label === currentTier.label)
  const nextTier = idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : undefined

  let nextTierDetails: RebateProgramSummary["nextTier"] | undefined
  let progressPctToNextTier = 100
  let projectedSpendDollars = tierWeightedCurrent
  let shortfallSpendDollars = 0

  if (nextTier) {
    const unlockSpendDollars = nextTier.minSpendDollars
    const spendToNextTierDollars = Math.max(0, unlockSpendDollars - tierWeightedCurrent)

    const perDay = todayDay > 0 ? tierWeightedCurrent / todayDay : 0
    projectedSpendDollars = perDay > 0 ? perDay * daysInMonth : tierWeightedCurrent
    shortfallSpendDollars = Math.max(0, unlockSpendDollars - projectedSpendDollars)

    const currentAtUnlock = unlockSpendDollars * currentTier.rebateRateOnSpend
    const nextAtUnlock = unlockSpendDollars * nextTier.rebateRateOnSpend
    const additionalDollarsAtNextRate = Math.round(nextAtUnlock - currentAtUnlock)

    const denom = unlockSpendDollars > 0 ? unlockSpendDollars : 1
    progressPctToNextTier = Math.max(0, Math.min(100, (tierWeightedCurrent / denom) * 100))

    nextTierDetails = {
      tier: nextTier,
      unlockSpendDollars,
      spendToNextTierDollars,
      additionalDollarsAtNextRate,
    }
  }

  return {
    programId: def.id,
    shortLabel: def.shortLabel,
    eligibilityHint: def.eligibilityHint,
    previousMonth: prev.slice,
    currentMonth: current.slice,
    nextTier: nextTierDetails,
    daysLeftInMonth,
    resetDateLabel,
    progressPctToNextTier,
    projectedSpendDollars,
    shortfallSpendDollars,
    byFuel: current.byFuel,
    showFuelBreakdown: current.showFuelBreakdown,
  }
}

export function getCarrierRebateOverview(
  allTransactions: FuelTransaction[],
  asOfDate: Date
): CarrierRebateOverview {
  const programs = REBATE_PROGRAMS.map((def) => computeProgramSummary(def, allTransactions, asOfDate))

  const totalMtdRebateDollars = programs.reduce((s, p) => s + p.currentMonth.rebateDollars, 0)
  const totalPreviousMonthRebateDollars = programs.reduce((s, p) => s + p.previousMonth.rebateDollars, 0)

  let primaryProgramId: string | null = null
  let bestScore = -1
  for (const p of programs) {
    if (!p.nextTier) continue
    const unlock = p.nextTier.unlockSpendDollars
    if (unlock <= 0) continue
    const progress = p.progressPctToNextTier / 100
    const score = progress
    if (score > bestScore) {
      bestScore = score
      primaryProgramId = p.programId
    }
  }
  if (primaryProgramId === null && programs.length > 0) {
    primaryProgramId = programs[0]!.programId
  }

  return {
    programs,
    totalMtdRebateDollars,
    totalPreviousMonthRebateDollars,
    primaryProgramId,
  }
}

export function getPilotRebateSummary(
  allTransactions: FuelTransaction[],
  asOfDate: Date
): RebateProgramSummary {
  const overview = getCarrierRebateOverview(allTransactions, asOfDate)
  const pilot = overview.programs.find((p) => p.programId === "pilot")
  if (!pilot) {
    throw new Error("Pilot rebate program missing from registry")
  }
  return pilot
}
