import type {
  DealAnalyzerFormInput,
  DealBrand,
  DealFuelNetwork,
  DealLocationCoverage,
  DealPricingTier,
  DealProgramType,
  DefRebatePricingMode,
} from "@/lib/deal-analyzer-types"

/** Legacy flat deal config from localStorage before `tiers[]`. */
export type LegacyFlatDealFields = {
  dealName?: string
  network?: DealFuelNetwork | ""
  /** Legacy root field; merged onto tiers when migrating. */
  programType?: DealProgramType | ""
  defRebatePricingMode?: DefRebatePricingMode | ""
  discountStructure?: string
  discountAmountCentsPerGal?: string
  costPlusAmountPerGal?: string
  rebateAmountCentsPerGal?: string
  defRebateAmountCentsPerGal?: string
  locationCoverage?: string
  selectedStates?: string[]
  selectedLocationKeys?: string[]
  tiers?: unknown
  brands?: unknown
  stateRestriction?: string
  locationRestriction?: string
  specificLocationKey?: string
}

export function defaultPricingTier(): DealPricingTier {
  return {
    programType: "",
    defRebatePricingMode: "",
    discountStructure: "",
    discountAmountCentsPerGal: "",
    costPlusAmountPerGal: "",
    rebateAmountCentsPerGal: "",
    defRebateAmountCentsPerGal: "",
    locationCoverage: "",
    selectedStates: [],
    selectedLocationKeys: [],
  }
}

export function defaultBrand(): DealBrand {
  return {
    network: "",
    tiers: [defaultPricingTier()],
  }
}

export function defaultDealAnalyzerForm(): DealAnalyzerFormInput {
  return {
    dealName: "",
    brands: [defaultBrand()],
  }
}

function deriveCoverageFromLegacyFlat(x: LegacyFlatDealFields): {
  locationCoverage: DealLocationCoverage | ""
  selectedStates: string[]
  selectedLocationKeys: string[]
} {
  const cov = x.locationCoverage
  if (
    cov === "all_locations" ||
    cov === "specific_states" ||
    cov === "specific_sites"
  ) {
    return {
      locationCoverage: cov,
      selectedStates: [...(x.selectedStates ?? [])],
      selectedLocationKeys: [...(x.selectedLocationKeys ?? [])],
    }
  }

  const slk = x.selectedLocationKeys
  if (Array.isArray(slk) && slk.length > 0) {
    return {
      locationCoverage: "specific_sites",
      selectedStates: [],
      selectedLocationKeys: slk.map(String),
    }
  }

  const legacyKey =
    typeof x.specificLocationKey === "string" ? x.specificLocationKey : ""
  const lr = x.locationRestriction
  if (lr === "specific" && legacyKey.length > 0) {
    return {
      locationCoverage: "specific_sites",
      selectedStates: [],
      selectedLocationKeys: [legacyKey],
    }
  }

  const sr = x.stateRestriction
  if (sr === "specific") {
    return {
      locationCoverage: "specific_states",
      selectedStates: [...(x.selectedStates ?? [])],
      selectedLocationKeys: [],
    }
  }

  return {
    locationCoverage: "all_locations",
    selectedStates: [],
    selectedLocationKeys: [],
  }
}

function normalizeTierPartial(raw: unknown): DealPricingTier {
  const t = defaultPricingTier()
  if (raw == null || typeof raw !== "object") return t
  const o = raw as Record<string, unknown>
  const pt = o.programType
  if (pt === "discount" || pt === "rebate" || pt === "def_rebate" || pt === "") {
    t.programType = pt as DealPricingTier["programType"]
  }
  const drm = o.defRebatePricingMode
  if (drm === "flat" || drm === "retail_minus" || drm === "") {
    t.defRebatePricingMode = drm as DealPricingTier["defRebatePricingMode"]
  }
  if (
    o.discountStructure === "retail_minus" ||
    o.discountStructure === "cost_plus" ||
    o.discountStructure === "best_of" ||
    o.discountStructure === ""
  ) {
    t.discountStructure = o.discountStructure as DealPricingTier["discountStructure"]
  }
  if (typeof o.discountAmountCentsPerGal === "string")
    t.discountAmountCentsPerGal = o.discountAmountCentsPerGal
  if (typeof o.costPlusAmountPerGal === "string") t.costPlusAmountPerGal = o.costPlusAmountPerGal
  if (typeof o.rebateAmountCentsPerGal === "string") t.rebateAmountCentsPerGal = o.rebateAmountCentsPerGal
  if (typeof o.defRebateAmountCentsPerGal === "string")
    t.defRebateAmountCentsPerGal = o.defRebateAmountCentsPerGal
  const lc = o.locationCoverage
  if (lc === "all_locations" || lc === "specific_states" || lc === "specific_sites")
    t.locationCoverage = lc
  if (Array.isArray(o.selectedStates)) t.selectedStates = o.selectedStates.map(String)
  if (Array.isArray(o.selectedLocationKeys))
    t.selectedLocationKeys = o.selectedLocationKeys.map(String)
  return t
}

function normalizeBrandPartial(raw: unknown): DealBrand {
  const b = defaultBrand()
  if (raw == null || typeof raw !== "object") return b
  const o = raw as Record<string, unknown>
  const net = o.network
  if (
    net === "loves" || net === "pilot-flying-j" || net === "ta-petro" ||
    net === "shell" || net === "chevron" || net === "ambest" ||
    net === "roadranger" || net === "other" || net === ""
  ) {
    b.network = net as DealBrand["network"]
  }
  if (Array.isArray(o.tiers) && o.tiers.length > 0) {
    b.tiers = o.tiers.map((t) => normalizeTierPartial(t))
  }
  return b
}

/**
 * Load any saved or in-memory deal config into the current `brands[]` shape.
 * Handles three historical shapes:
 *   1. New: `{ brands: [{ network, tiers }] }`
 *   2. Old: `{ network, tiers: [...] }` (before multi-brand)
 *   3. Oldest: flat root fields (before tiers array)
 */
export function migrateDealConfigToCurrentShape(
  raw: DealAnalyzerFormInput | LegacyFlatDealFields
): DealAnalyzerFormInput {
  const x = raw as LegacyFlatDealFields
  const name = typeof x.dealName === "string" ? x.dealName : ""

  // Shape 1: already has brands array
  if (Array.isArray(x.brands) && x.brands.length > 0) {
    return {
      dealName: name,
      brands: x.brands.map((b) => normalizeBrandPartial(b)),
    }
  }

  // Shape 2: old single-network root + tiers array
  if (Array.isArray(x.tiers) && x.tiers.length > 0) {
    let tiers = x.tiers.map((tier) => normalizeTierPartial(tier))
    tiers = mergeLegacyRootProgramOntoTiers(tiers, x.programType, x.defRebatePricingMode)
    return {
      dealName: name,
      brands: [{
        network: (x.network ?? "") as DealBrand["network"],
        tiers: tiers.length > 0 ? tiers : [defaultPricingTier()],
      }],
    }
  }

  // Shape 3: oldest flat root fields (no tiers array)
  const cov = deriveCoverageFromLegacyFlat(x)
  const tier: DealPricingTier = {
    ...defaultPricingTier(),
    programType: (x.programType ?? "") as DealPricingTier["programType"],
    defRebatePricingMode: x.defRebatePricingMode,
    discountStructure: (x.discountStructure ?? "") as DealPricingTier["discountStructure"],
    discountAmountCentsPerGal: x.discountAmountCentsPerGal ?? "",
    costPlusAmountPerGal: x.costPlusAmountPerGal ?? "",
    rebateAmountCentsPerGal: x.rebateAmountCentsPerGal ?? "",
    defRebateAmountCentsPerGal: x.defRebateAmountCentsPerGal ?? "",
    ...cov,
  }

  return {
    dealName: name,
    brands: [{
      network: (x.network ?? "") as DealBrand["network"],
      tiers: [tier],
    }],
  }
}

function mergeLegacyRootProgramOntoTiers(
  tiers: DealPricingTier[],
  rootProgram: DealProgramType | "" | undefined,
  rootDefMode: DefRebatePricingMode | "" | undefined
): DealPricingTier[] {
  return tiers.map((tier) => {
    const programType =
      tier.programType !== "" ? tier.programType : (rootProgram ?? "")
    let defRebatePricingMode = tier.defRebatePricingMode
    if (programType === "def_rebate") {
      if (defRebatePricingMode !== "flat" && defRebatePricingMode !== "retail_minus") {
        defRebatePricingMode =
          rootDefMode === "flat" || rootDefMode === "retail_minus" ? rootDefMode : "flat"
      }
    } else if (programType !== "") {
      defRebatePricingMode = ""
    }
    return { ...tier, programType, defRebatePricingMode }
  })
}

export function normalizeDefRebateModeOnLoad(
  form: DealAnalyzerFormInput
): DealAnalyzerFormInput {
  return {
    ...form,
    brands: form.brands.map((brand) => ({
      ...brand,
      tiers: brand.tiers.map((t) => {
        if (
          t.programType === "def_rebate" &&
          t.defRebatePricingMode !== "flat" &&
          t.defRebatePricingMode !== "retail_minus"
        ) {
          return { ...t, defRebatePricingMode: "flat" as const }
        }
        return t
      }),
    })),
  }
}
