/** Deal Analyzer domain types (pure data; no React). */

export type DealAnalyzerPeriod = "30" | "90" | "quarter" | "year"

export type DealProgramType = "discount" | "rebate" | "def_rebate"

/** How DEF rebate ¢/gal is interpreted in copy and breakdown labels. */
export type DefRebatePricingMode = "flat" | "retail_minus"

export type DealDiscountStructure = "retail_minus" | "cost_plus" | "best_of"

/**
 * Where a tier applies geographically (single choice per tier).
 */
export type DealLocationCoverage =
  | "all_locations"
  | "specific_states"
  | "specific_sites"

/** Values match Select items / coverage map keys after normalization. */
export type DealFuelNetwork =
  | "loves"
  | "pilot-flying-j"
  | "ta-petro"
  | "shell"
  | "chevron"
  | "ambest"
  | "roadranger"
  | "other"

/** One geographic + pricing slice of a multi-tier chain offer (no network — uses parent brand's `network`). */
export interface DealPricingTier {
  /** Per tier: discount, rebate, or DEF-only rebate. */
  programType: DealProgramType | ""
  /** When `programType === "def_rebate"`, how ¢/gal is interpreted. */
  defRebatePricingMode?: DefRebatePricingMode | ""
  discountStructure: DealDiscountStructure | ""
  discountAmountCentsPerGal: string
  costPlusAmountPerGal: string
  rebateAmountCentsPerGal: string
  defRebateAmountCentsPerGal: string
  locationCoverage: DealLocationCoverage | ""
  selectedStates: string[]
  selectedLocationKeys: string[]
}

/** One brand/network entry in a multi-brand deal, with its own ordered tiers. */
export interface DealBrand {
  network: DealFuelNetwork | ""
  /** Ordered tiers; most specific matching coverage wins per transaction. */
  tiers: DealPricingTier[]
}

export interface DealAnalyzerFormInput {
  dealName: string
  /** One or more brands, each with their own network and tiers. */
  brands: DealBrand[]
}

export interface DealBaselineStats {
  transactions: number
  totalSpend: number
  totalGallons: number
  avgPricePerGallon: number
  uniqueTrucks: number
}

/** Per-tier resolution stats for blended analyses. */
export interface DealTierResolutionBreakdown {
  tierIndex: number
  transactionCount: number
  /** Share of baseline spend from transactions assigned to this tier (0–1). */
  spendShare: number
}

export interface DealProposedStats {
  totalSpend: number
  savings: number
  savingsPercent: number
  coverage: number
  matched: number
  noCoverage: number
  avgPricePerGallon: number
  discountLabel: string
  /** Present when multiple tiers or useful for single-tier parity. */
  tierBreakdown?: DealTierResolutionBreakdown[]
}

export interface DealOptimizedStats {
  totalSpend: number
  /** vs baseline spend; omitted on older saved runs (derived in UI). */
  totalSavingsVsBaseline?: number
  /** Effective $/gal at baseline gallons; omitted on older saved runs (derived in UI). */
  avgPricePerGallon?: number
  additionalSavings: number
  opportunities: number
  avgDetourMiles: number
}

export interface DealVerdict {
  title: string
  subtitle: string
  tier: "excellent" | "good" | "marginal" | "bad"
}

export type DealInsightType =
  | "state_restriction"
  | "site_restriction"
  | "coverage_gap"
  | "strong_coverage"
  | "optimization"

export interface DealInsight {
  type: DealInsightType
}

export interface DealAnalyzerResults {
  baseline: DealBaselineStats
  proposed: DealProposedStats
  optimized: DealOptimizedStats | null
  verdict: DealVerdict
  insights: DealInsight[]
}

/** One column card in the location comparison grid (current / match / optimized). */
export interface DealLocationMetricCard {
  /** Primary label (e.g. station brand). */
  title: string
  /** Secondary line (e.g. brand + city). */
  subtitle: string
  /** Current-data only: total gallons at this location. */
  totalGallons?: number
  /** Effective $/gal (total spend / gallons). Null when unknown. */
  netCpg: number | null
  distanceMiles: number | null
  /** Typical discount vs pump, $/gal (derived). */
  avgDiscountPerGal: number | null
  /** When the cell has no modeled data. */
  emptyReason?: string
}

/** One row = one distinct chain + city from the filtered transaction slice. */
export interface DealLocationComparisonRow {
  locationKey: string
  stationBrand: string
  location: string
  current: DealLocationMetricCard
  match: DealLocationMetricCard & { hasData: boolean }
  optimized: DealLocationMetricCard | null
}

export interface SavedDealAnalysis {
  id: string
  name: string
  date: string
  dealConfig: DealAnalyzerFormInput
  periodUsed: DealAnalyzerPeriod
  results: DealAnalyzerResults
}
