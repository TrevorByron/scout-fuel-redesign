import type { DateRange } from "react-day-picker"
import type { ChartConfig } from "@/components/ui/chart"
import { getComparisonPeriod } from "@/lib/date-range-presets"
import { getFleetGrade } from "@/lib/fuelScore"
import { fleetScoreCardMock, getFuelTransactions, type FuelTransaction } from "@/lib/mock-data"

const CHAIN_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const
const TOP_CHAINS = 5

function brandKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function isTransactionInDateRange(t: FuelTransaction, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  const tDate = new Date(t.dateTime).getTime()
  if (tDate < range.from.getTime()) return false
  const toEnd = range.to ? range.to.getTime() + 86400000 : range.from.getTime() + 86400000
  if (tDate > toEnd) return false
  return true
}

/** Amount overpaid: could have gotten same fuel for less. Uses betterOption.potentialSavings when available, else |variance|. */
export function getOverpaidAmount(t: FuelTransaction): number {
  if (t.betterOption?.potentialSavings != null && t.betterOption.potentialSavings > 0) {
    return t.betterOption.potentialSavings
  }
  if (t.variance < 0) return Math.abs(t.variance)
  return 0
}

export function buildChainChartData(transactions: FuelTransaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    map.set(t.stationBrand, (map.get(t.stationBrand) ?? 0) + t.gallons)
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, TOP_CHAINS)
  const otherGallons = sorted.slice(TOP_CHAINS).reduce((s, [, v]) => s + v, 0)
  const data = [
    ...top.map(([brand, gallons], i) => ({
      brand: brandKey(brand),
      label: brand,
      gallons: Math.round(gallons),
      fill: CHAIN_COLORS[i] ?? CHAIN_COLORS[CHAIN_COLORS.length - 1],
    })),
    ...(otherGallons > 0
      ? [{ brand: "other", label: "Other", gallons: Math.round(otherGallons), fill: "var(--muted-foreground)" }]
      : []),
  ]
  const config: ChartConfig = {
    gallons: { label: "Gallons" },
    ...Object.fromEntries(data.map((d) => [d.brand, { label: d.label, color: d.fill }])),
  }
  return { data, config, total: data.reduce((s, d) => s + d.gallons, 0) }
}

export type DashboardKpis = {
  totalGallons: number
  gallonsByType: { Diesel: number; Reefer: number; DEF: number }
  avgCostAll: number
  avgCostByType: { Diesel: number; Reefer: number; DEF: number }
  avgSavingsAll: number
  avgSavingsByType: { Diesel: number; Reefer: number; DEF: number }
  totalSavings: number
  savingsByType: { Diesel: number; Reefer: number; DEF: number }
  totalSpent: number
  spentByType: { Diesel: number; Reefer: number; DEF: number }
}

export function computeDashboardKpis(filteredByDateTransactions: FuelTransaction[]): DashboardKpis {
  const byType = (type: "Diesel" | "Reefer" | "DEF") =>
    filteredByDateTransactions.filter((t) => t.fuelType === type)

  const avgCost = (txns: FuelTransaction[]) =>
    txns.length ? txns.reduce((s, t) => s + t.pricePerGallon, 0) / txns.length : 0

  const avgSavingsPerGal = (txns: FuelTransaction[]) =>
    txns.length ? txns.reduce((s, t) => s + t.savedAmount / t.gallons, 0) / txns.length : 0

  const dieselTxns = byType("Diesel")
  const reeferTxns = byType("Reefer")
  const defTxns = byType("DEF")

  return {
    totalGallons: filteredByDateTransactions.reduce((s, t) => s + t.gallons, 0),
    gallonsByType: {
      Diesel: dieselTxns.reduce((s, t) => s + t.gallons, 0),
      Reefer: reeferTxns.reduce((s, t) => s + t.gallons, 0),
      DEF: defTxns.reduce((s, t) => s + t.gallons, 0),
    },
    avgCostAll: avgCost(filteredByDateTransactions),
    avgCostByType: {
      Diesel: avgCost(dieselTxns),
      Reefer: avgCost(reeferTxns),
      DEF: avgCost(defTxns),
    },
    avgSavingsAll: avgSavingsPerGal(filteredByDateTransactions),
    avgSavingsByType: {
      Diesel: avgSavingsPerGal(dieselTxns),
      Reefer: avgSavingsPerGal(reeferTxns),
      DEF: avgSavingsPerGal(defTxns),
    },
    totalSavings: filteredByDateTransactions.reduce((s, t) => s + t.savedAmount, 0),
    savingsByType: {
      Diesel: dieselTxns.reduce((s, t) => s + t.savedAmount, 0),
      Reefer: reeferTxns.reduce((s, t) => s + t.savedAmount, 0),
      DEF: defTxns.reduce((s, t) => s + t.savedAmount, 0),
    },
    totalSpent: filteredByDateTransactions.reduce((s, t) => s + t.totalCost, 0),
    spentByType: {
      Diesel: dieselTxns.reduce((s, t) => s + t.totalCost, 0),
      Reefer: reeferTxns.reduce((s, t) => s + t.totalCost, 0),
      DEF: defTxns.reduce((s, t) => s + t.totalCost, 0),
    },
  }
}

export type FleetScoreComputed = {
  grade: string
  gradeSuffix: string | undefined
  weekDate: string
  efficiencyRate: number
  totalTransactions: number
  previousGrade: string
  targetGrade: string
  targetDate: string
  missedSavings: number
  overpaidFillUpCount: number
  overpaidDriverCount: number
  missedSavingsTrend: number
  trendLabel: string
  optimizationTrend: number | undefined
  targetEfficiencyPercent: number
  additionalSavingsAtTarget: number
  trendData: { month: string; value: number }[]
}

function filterByDriver(transactions: FuelTransaction[], driverName?: string) {
  if (!driverName) return transactions
  return transactions.filter((t) => t.driverName === driverName)
}

export function computeFleetScoreProps(
  filteredByDateTransactions: FuelTransaction[],
  dateRange: DateRange | undefined,
  options?: { driverName?: string }
): FleetScoreComputed {
  const { driverName } = options ?? {}
  const all = getFuelTransactions()

  const total = filteredByDateTransactions.length
  const inNetworkCount = filteredByDateTransactions.filter((t) => t.inNetwork).length
  const efficiencyRate = total > 0 ? Math.round((inNetworkCount / total) * 100) : 0
  const fullGrade = getFleetGrade(efficiencyRate)
  const gradeMatch = fullGrade.match(/^([A-F])([+-])?$/)
  const grade = gradeMatch ? gradeMatch[1]! : "F"
  const gradeSuffix = gradeMatch?.[2]

  const overpaidTxns = filteredByDateTransactions.filter(
    (t) => !t.inNetwork && getOverpaidAmount(t) > 0
  )
  const rawSum = overpaidTxns.reduce((sum, t) => sum + getOverpaidAmount(t), 0)
  const overpaidFillUpCount = overpaidTxns.length
  const overpaidDriverCount = new Set(overpaidTxns.map((t) => t.driverName)).size
  const missedSavings = overpaidFillUpCount > 0 ? Math.max(1, Math.round(rawSum)) : Math.round(rawSum)

  const comparison = getComparisonPeriod(dateRange)
  const prevOverpaid = comparison
    ? Math.round(
        filterByDriver(
          all.filter((t) => isTransactionInDateRange(t, comparison.range)),
          driverName
        )
          .filter((t) => !t.inNetwork && getOverpaidAmount(t) > 0)
          .reduce((sum, t) => sum + getOverpaidAmount(t), 0)
      )
    : 0
  const trendLabel = comparison ? `from ${comparison.label}` : "from last month"
  const missedSavingsTrend = comparison ? missedSavings - prevOverpaid : Math.round(missedSavings * -0.12)

  const prevPeriodTxns = comparison
    ? filterByDriver(all.filter((t) => isTransactionInDateRange(t, comparison.range)), driverName)
    : []
  const prevInNetwork = prevPeriodTxns.filter((t) => t.inNetwork).length
  const prevEfficiencyRate =
    prevPeriodTxns.length > 0 ? Math.round((prevInNetwork / prevPeriodTxns.length) * 100) : efficiencyRate
  const optimizationTrend = comparison ? efficiencyRate - prevEfficiencyRate : undefined

  const trendData = [...fleetScoreCardMock.trendData]
  if (trendData.length > 0) {
    trendData[trendData.length - 1] = {
      ...trendData[trendData.length - 1]!,
      value: efficiencyRate,
    }
  }

  return {
    grade,
    gradeSuffix,
    weekDate: fleetScoreCardMock.weekDate,
    efficiencyRate,
    totalTransactions: total,
    previousGrade: fleetScoreCardMock.previousGrade,
    targetGrade: fleetScoreCardMock.targetGrade,
    targetDate: fleetScoreCardMock.targetDate,
    missedSavings,
    overpaidFillUpCount,
    overpaidDriverCount,
    missedSavingsTrend,
    trendLabel,
    optimizationTrend,
    targetEfficiencyPercent: 80,
    additionalSavingsAtTarget: 8200,
    trendData,
  }
}

export type DashboardBadStopRow = {
  id: string
  whereStopped: string
  shouldHaveStopped: string
  missedDollars: number
  dateTime: string
}

function formatShouldHaveStopped(t: FuelTransaction): string {
  const bo = t.betterOption
  if (!bo) return "—"
  const miles =
    bo.distanceMiles != null && Number.isFinite(bo.distanceMiles)
      ? ` · ${Math.round(bo.distanceMiles)} mi away`
      : ""
  return `${bo.stationName} — ${bo.location}${miles}`
}

/** Costly stops for “In need of attention” (driver view): overpaid with a modeled alternative only, worst first. */
export function getBadStopRows(transactions: FuelTransaction[], limit = 20): DashboardBadStopRow[] {
  return [...transactions]
    .filter((t) => t.betterOption != null && getOverpaidAmount(t) > 0)
    .sort((a, b) => getOverpaidAmount(b) - getOverpaidAmount(a))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      whereStopped: `${t.stationBrand} · ${t.location}`,
      shouldHaveStopped: formatShouldHaveStopped(t),
      missedDollars: Math.round(getOverpaidAmount(t)),
      dateTime: t.dateTime,
    }))
}
