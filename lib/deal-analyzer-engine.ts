import {
  getFuelTransactionLocationKey,
  type FuelTransaction,
} from "@/lib/mock-data"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerPeriod,
  DealAnalyzerResults,
  DealBaselineStats,
  DealLocationComparisonRow,
  DealFuelNetwork,
  DealInsight,
  DealInsightType,
  DealLocationMetricCard,
  DealProgramType,
  DealVerdict,
} from "@/lib/deal-analyzer-types"

/** Base coverage rates before state restriction adjustment (spec). */
export const NETWORK_COVERAGE: Record<DealFuelNetwork, number> = {
  loves: 0.87,
  "pilot-flying-j": 0.92,
  "ta-petro": 0.84,
  shell: 0.78,
  chevron: 0.71,
  ambest: 0.68,
  roadranger: 0.73,
  other: 0.8,
}

export const NETWORK_LABELS: Record<DealFuelNetwork, string> = {
  loves: "Love's",
  "pilot-flying-j": "Pilot Flying J",
  "ta-petro": "TA/Petro",
  shell: "Shell",
  chevron: "Chevron",
  ambest: "Ambest",
  roadranger: "RoadRanger",
  other: "Other",
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/** Previous calendar quarter (not trailing 90 days). */
export function resolvePreviousQuarterRange(anchor: Date): { from: Date; to: Date } {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const currentQ = Math.floor(m / 3)
  let year = y
  let startMonth: number
  if (currentQ === 0) {
    year = y - 1
    startMonth = 9
  } else {
    startMonth = (currentQ - 1) * 3
  }
  const from = startOfDay(new Date(year, startMonth, 1))
  const endMonth = startMonth + 2
  const to = endOfDay(new Date(year, endMonth + 1, 0))
  return { from, to }
}

export function resolvePeriodRange(
  period: DealAnalyzerPeriod,
  anchor: Date = new Date()
): { from: Date; to: Date } {
  const end = endOfDay(anchor)
  if (period === "quarter") {
    return resolvePreviousQuarterRange(anchor)
  }
  const days = period === "30" ? 30 : period === "90" ? 90 : 365
  const from = startOfDay(new Date(anchor))
  from.setDate(from.getDate() - (days - 1))
  return { from, to: end }
}

export function filterTransactionsInRange(
  txns: FuelTransaction[],
  range: { from: Date; to: Date }
): FuelTransaction[] {
  const lo = range.from.getTime()
  const hi = range.to.getTime()
  return txns.filter((t) => {
    const x = new Date(t.dateTime).getTime()
    return x >= lo && x <= hi
  })
}

export function filterTransactionsByDealProgram(
  txns: FuelTransaction[],
  programType: DealProgramType | ""
): FuelTransaction[] {
  if (programType === "") return []
  if (programType === "def_rebate") {
    return txns.filter((t) => t.fuelType === "DEF")
  }
  return txns
}

export function aggregateBaseline(
  txns: FuelTransaction[],
  programType: DealProgramType | ""
): DealBaselineStats {
  const list = filterTransactionsByDealProgram(txns, programType)
  let totalSpend = 0
  let totalGallons = 0
  const trucks = new Set<string>()
  for (const t of list) {
    totalSpend += t.totalCost
    totalGallons += t.gallons
    trucks.add(t.truckId)
  }
  const transactions = list.length
  const avgPricePerGallon =
    totalGallons > 0 ? Math.round((totalSpend / totalGallons) * 10000) / 10000 : 0
  return {
    transactions,
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalGallons: Math.round(totalGallons * 100) / 100,
    avgPricePerGallon,
    uniqueTrucks: trucks.size,
  }
}

function parseAmount(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Retail-minus cents/gal: primary field or legacy rebate-only saves. */
function retailMinusCentsFromForm(form: DealAnalyzerFormInput): number {
  let cents = parseAmount(form.discountAmountCentsPerGal)
  if (form.programType === "rebate" && cents <= 0) {
    cents = parseAmount(form.rebateAmountCentsPerGal)
  }
  return cents
}

/** Fractional price reduction (0–1 scale) before coverage weighting. */
function fractionalDiscountFromForm(
  form: DealAnalyzerFormInput,
  baselineAvgPrice: number
): number {
  if (baselineAvgPrice <= 0) return 0
  if (form.programType === "discount" || form.programType === "rebate") {
    if (form.discountStructure === "") return 0
    if (form.discountStructure === "retail_minus") {
      const cents = retailMinusCentsFromForm(form)
      return cents / 100 / baselineAvgPrice
    }
    if (form.discountStructure === "cost_plus") {
      const dollarsPlus = parseAmount(form.costPlusAmountPerGal)
      return dollarsPlus / baselineAvgPrice
    }
    if (form.discountStructure === "best_of") {
      const cents = retailMinusCentsFromForm(form)
      const dollarsPlus = parseAmount(form.costPlusAmountPerGal)
      const retailFrac = cents / 100 / baselineAvgPrice
      const costFrac = dollarsPlus / baselineAvgPrice
      return Math.max(retailFrac, costFrac)
    }
    return 0
  }
  if (form.programType !== "def_rebate") return 0
  const mode = form.defRebatePricingMode
  if (mode !== "flat" && mode !== "retail_minus") return 0
  const cents = parseAmount(form.defRebateAmountCentsPerGal)
  return cents / 100 / baselineAvgPrice
}

function discountDisplayLabel(form: DealAnalyzerFormInput): string {
  if (form.programType === "discount" || form.programType === "rebate") {
    const isRebate = form.programType === "rebate"
    const lead = isRebate ? "Rebate (paid later): " : ""
    if (form.discountStructure === "retail_minus") {
      const cents = retailMinusCentsFromForm(form)
      return `${lead}Retail minus $${(cents / 100).toFixed(2)}/gal`
    }
    if (form.discountStructure === "cost_plus") {
      const d = parseAmount(form.costPlusAmountPerGal)
      return `${lead}Cost plus $${d.toFixed(2)}/gal`
    }
    if (form.discountStructure === "best_of") {
      const cents = retailMinusCentsFromForm(form)
      const d = parseAmount(form.costPlusAmountPerGal)
      return `${lead}Best of retail minus $${(cents / 100).toFixed(2)}/gal vs cost plus $${d.toFixed(2)}/gal`
    }
    return ""
  }
  if (form.programType === "def_rebate") {
    const cents = parseAmount(form.defRebateAmountCentsPerGal)
    const mode = form.defRebatePricingMode
    if (mode !== "flat" && mode !== "retail_minus") return ""
    if (mode === "retail_minus") {
      return `DEF retail minus $${(cents / 100).toFixed(2)}/gal`
    }
    return `DEF rebate $${(cents / 100).toFixed(2)}/gal`
  }
  return ""
}

function adjustedCoverage(
  baseCoverage: number,
  form: DealAnalyzerFormInput
): number {
  let c = baseCoverage
  if (form.stateRestriction === "specific" && form.selectedStates.length > 0) {
    const penalty = (50 - form.selectedStates.length) / 50
    c *= 1 - penalty * 0.3
  }
  return Math.max(0, Math.min(1, c))
}

function verdictFromSavingsPercent(pct: number): DealVerdict {
  if (pct > 15) {
    return {
      tier: "excellent",
      title: "Excellent deal",
      subtitle: "Well above typical fleet discount impact on this period.",
    }
  }
  if (pct > 5) {
    return {
      tier: "good",
      title: "Good deal",
      subtitle: "Solid savings versus your current baseline for this window.",
    }
  }
  if (pct >= 0) {
    return {
      tier: "marginal",
      title: "Marginal savings",
      subtitle: "Positive but modest — confirm terms and coverage.",
    }
  }
  return {
    tier: "bad",
    title: "Not a good deal",
    subtitle: "Projected spend meets or exceeds baseline for this scenario.",
  }
}

function optimizationStatsFromTransactions(txns: FuelTransaction[]): {
  opportunities: number
  avgDetourMiles: number
} {
  const withBetter = txns.filter((t) => t.betterOption && t.betterOption.potentialSavings > 0)
  if (withBetter.length === 0) {
    return { opportunities: 0, avgDetourMiles: 0 }
  }
  const sumDist = withBetter.reduce((s, t) => s + (t.betterOption?.distanceMiles ?? 0), 0)
  return {
    opportunities: withBetter.length,
    avgDetourMiles: Math.round((sumDist / withBetter.length) * 10) / 10,
  }
}

export function buildInsights(params: {
  form: DealAnalyzerFormInput
  coverage: number
  savings: number
  additionalSavings: number
}): DealInsight[] {
  const list: DealInsight[] = []
  const types = new Set<DealInsightType>()
  if (
    params.form.stateRestriction === "specific" &&
    params.form.selectedStates.length > 0
  ) {
    types.add("state_restriction")
  }
  if (params.coverage < 0.85) {
    types.add("coverage_gap")
  } else {
    types.add("strong_coverage")
  }
  if (params.savings > 0 && params.additionalSavings > 5000) {
    types.add("optimization")
  }
  const order: DealInsightType[] = [
    "state_restriction",
    "coverage_gap",
    "strong_coverage",
    "optimization",
  ]
  for (const type of order) {
    if (types.has(type)) list.push({ type })
  }
  return list
}

export function computeDealAnalysis(params: {
  form: DealAnalyzerFormInput
  baseline: DealBaselineStats
  filteredTxnsForOptimization: FuelTransaction[]
}): DealAnalyzerResults | null {
  const { form, baseline } = params
  if (
    !form.network ||
    form.programType === "" ||
    form.stateRestriction === "" ||
    baseline.transactions === 0 ||
    baseline.totalSpend <= 0
  ) {
    return null
  }
  if (
    (form.programType === "discount" || form.programType === "rebate") &&
    form.discountStructure === ""
  ) {
    return null
  }
  if (
    form.programType === "def_rebate" &&
    form.defRebatePricingMode !== "flat" &&
    form.defRebatePricingMode !== "retail_minus"
  ) {
    return null
  }

  const network = form.network as DealFuelNetwork
  const baseCov = NETWORK_COVERAGE[network] ?? NETWORK_COVERAGE.other
  const coverage = adjustedCoverage(baseCov, form)
  const discountFrac = fractionalDiscountFromForm(form, baseline.avgPricePerGallon)
  const effectiveDiscount = discountFrac * coverage

  const projectedSpend =
    Math.round(baseline.totalSpend * (1 - effectiveDiscount) * 100) / 100
  const savings = Math.round((baseline.totalSpend - projectedSpend) * 100) / 100
  const savingsPercent =
    baseline.totalSpend > 0
      ? Math.round((savings / baseline.totalSpend) * 1000) / 10
      : 0

  const matched = Math.min(
    baseline.transactions,
    Math.round(coverage * baseline.transactions)
  )
  const noCoverage = baseline.transactions - matched

  const proposedAvg =
    baseline.totalGallons > 0
      ? Math.round((projectedSpend / baseline.totalGallons) * 10000) / 10000
      : 0

  const verdict = verdictFromSavingsPercent(savingsPercent)

  const additionalSavingsRaw = Math.abs(savings) * 0.35
  const additionalSavings = Math.round(additionalSavingsRaw * 100) / 100
  const showOptimized = savings > 0 && additionalSavings > 100

  const optTx = optimizationStatsFromTransactions(
    filterTransactionsByDealProgram(params.filteredTxnsForOptimization, form.programType)
  )

  let optimized: DealAnalyzerResults["optimized"] = null
  if (showOptimized) {
    const optimizedSpend =
      Math.round((projectedSpend - additionalSavings) * 100) / 100
    const totalSavingsVsBaseline =
      Math.round((baseline.totalSpend - optimizedSpend) * 100) / 100
    const optimizedAvgPpg =
      baseline.totalGallons > 0
        ? Math.round((optimizedSpend / baseline.totalGallons) * 10000) / 10000
        : 0
    optimized = {
      totalSpend: optimizedSpend,
      totalSavingsVsBaseline,
      avgPricePerGallon: optimizedAvgPpg,
      additionalSavings,
      opportunities:
        optTx.opportunities > 0
          ? optTx.opportunities
          : Math.max(1, Math.round(matched * 0.28)),
      avgDetourMiles:
        optTx.avgDetourMiles > 0 ? optTx.avgDetourMiles : 11,
    }
  }

  const insights = buildInsights({
    form,
    coverage,
    savings,
    additionalSavings,
  })

  return {
    baseline,
    proposed: {
      totalSpend: projectedSpend,
      savings,
      savingsPercent,
      coverage,
      matched,
      noCoverage,
      avgPricePerGallon: proposedAvg,
      discountLabel: discountDisplayLabel(form),
    },
    optimized,
    verdict,
    insights,
  }
}

function roundMoney4(n: number): number {
  return Math.round(n * 10000) / 10000
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Transaction with the largest gallons among those that have a modeled `betterOption`.
 * Matches how we pick `betterOption` lat/lng for map pins so they align with row aggregates.
 */
export function representativeTxnWithBetterOption(
  txs: FuelTransaction[]
): FuelTransaction | null {
  let bestTxn: FuelTransaction | null = null
  let maxGal = -1
  for (const t of txs) {
    if (!t.betterOption) continue
    if (t.gallons > maxGal) {
      maxGal = t.gallons
      bestTxn = t
    }
  }
  return bestTxn
}

/**
 * One row per distinct chain + city in the slice, sorted by total gallons descending.
 * Match column uses real `betterOption` aggregates; optimized scales $/gal by fleet proposed→optimized ratio.
 */
export function buildLocationComparisonRows(
  slice: FuelTransaction[],
  _form: DealAnalyzerFormInput,
  results: DealAnalyzerResults
): DealLocationComparisonRow[] {
  const proposedAvg = results.proposed.avgPricePerGallon
  const optimizedAvg = results.optimized?.avgPricePerGallon
  const optRatio =
    optimizedAvg != null && proposedAvg > 0 ? optimizedAvg / proposedAvg : null
  const hasOptimizedColumn = results.optimized != null && optRatio != null

  const groups = new Map<string, FuelTransaction[]>()
  for (const t of slice) {
    const k = getFuelTransactionLocationKey(t.stationBrand, t.location)
    const arr = groups.get(k)
    if (arr) arr.push(t)
    else groups.set(k, [t])
  }

  const rows: DealLocationComparisonRow[] = []

  for (const [locationKey, txs] of groups) {
    const first = txs[0]
    let totalGallons = 0
    let totalSpend = 0
    let weightedSaved = 0
    for (const t of txs) {
      totalGallons += t.gallons
      totalSpend += t.totalCost
      weightedSaved += t.savedAmount * t.gallons
    }
    const netCpgCurrent =
      totalGallons > 0 ? roundMoney4(totalSpend / totalGallons) : null
    const avgDiscCurrent =
      totalGallons > 0 ? roundMoney4(weightedSaved / totalGallons) : null

    const current: DealLocationMetricCard = {
      title: first.stationBrand,
      subtitle: `${first.stationBrand}, ${first.location}`,
      totalGallons: roundMoney2(totalGallons),
      netCpg: netCpgCurrent,
      distanceMiles: 0,
      avgDiscountPerGal: avgDiscCurrent,
    }

    let boGallons = 0
    let boPriceW = 0
    let boDistW = 0
    for (const t of txs) {
      const bo = t.betterOption
      if (!bo) continue
      const g = t.gallons
      boGallons += g
      boPriceW += bo.pricePerGallon * g
      boDistW += bo.distanceMiles * g
    }

    const bestTxn = representativeTxnWithBetterOption(txs)

    let match: DealLocationComparisonRow["match"]
    if (boGallons <= 0 || !bestTxn?.betterOption) {
      match = {
        hasData: false,
        title: "",
        subtitle: "",
        netCpg: null,
        distanceMiles: null,
        avgDiscountPerGal: null,
        emptyReason: "No alternate modeled for these stops.",
      }
    } else {
      const bo = bestTxn.betterOption
      const netCpgMatch = roundMoney4(boPriceW / boGallons)
      const distMatch = Math.round((boDistW / boGallons) * 10) / 10
      const avgDiscMatch =
        netCpgCurrent != null
          ? roundMoney4(Math.max(0, netCpgCurrent - netCpgMatch))
          : null
      match = {
        hasData: true,
        title: bo.stationName,
        subtitle: `${bo.stationName}, ${bo.location}`,
        netCpg: netCpgMatch,
        distanceMiles: distMatch,
        avgDiscountPerGal: avgDiscMatch,
      }
    }

    let optimized: DealLocationMetricCard | null = null
    if (hasOptimizedColumn && netCpgCurrent != null && optRatio != null) {
      const opt = results.optimized!
      const baseCpg =
        match.hasData && match.netCpg != null ? match.netCpg : netCpgCurrent
      const netCpgOpt = roundMoney4(baseCpg * optRatio)
      const matchDist = match.distanceMiles ?? 0
      const distOpt =
        Math.round(Math.max(matchDist, opt.avgDetourMiles) * 10) / 10
      const avgDiscOpt = roundMoney4(Math.max(0, netCpgCurrent - netCpgOpt))
      optimized = {
        title: match.hasData ? match.title : first.stationBrand,
        subtitle: match.hasData
          ? match.subtitle
          : `${first.stationBrand}, ${first.location}`,
        netCpg: netCpgOpt,
        distanceMiles: distOpt,
        avgDiscountPerGal: avgDiscOpt,
      }
    }

    rows.push({
      locationKey,
      stationBrand: first.stationBrand,
      location: first.location,
      current,
      match,
      optimized,
    })
  }

  rows.sort(
    (a, b) => (b.current.totalGallons ?? 0) - (a.current.totalGallons ?? 0)
  )
  return rows
}

/** Period summary for refinement cards (live counts). */
export function summarizePeriod(
  txns: FuelTransaction[],
  period: DealAnalyzerPeriod,
  programType: DealProgramType | "",
  anchor: Date = new Date()
): DealBaselineStats {
  const range = resolvePeriodRange(period, anchor)
  const slice = filterTransactionsInRange(txns, range)
  return aggregateBaseline(slice, programType)
}
