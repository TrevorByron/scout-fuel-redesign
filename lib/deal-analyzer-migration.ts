import type {
  DealAnalyzerFormInput,
  DealLocationCoverage,
  DealPricingTier,
  DealProgramType,
  DefRebatePricingMode,
} from "@/lib/deal-analyzer-types"

/** Legacy flat deal config from localStorage before `tiers[]`. */
export type LegacyFlatDealFields = {
  dealName?: string
  network?: DealAnalyzerFormInput["network"]
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

export function defaultDealAnalyzerForm(): DealAnalyzerFormInput {
  return {
    dealName: "",
    network: "",
    tiers: [defaultPricingTier()],
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

/**
 * Load any saved or in-memory deal config into the current `tiers[]` shape.
 */
export function migrateDealConfigToCurrentShape(
  raw: DealAnalyzerFormInput | LegacyFlatDealFields
): DealAnalyzerFormInput {
  const x = raw as LegacyFlatDealFields

  if (Array.isArray(x.tiers) && x.tiers.length > 0) {
    let tiers = x.tiers.map((tier) => normalizeTierPartial(tier))
    tiers = mergeLegacyRootProgramOntoTiers(tiers, x.programType, x.defRebatePricingMode)
    return {
      dealName: typeof x.dealName === "string" ? x.dealName : "",
      network: (x.network ?? "") as DealAnalyzerFormInput["network"],
      tiers: tiers.length > 0 ? tiers : [defaultPricingTier()],
    }
  }

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
    dealName: typeof x.dealName === "string" ? x.dealName : "",
    network: (x.network ?? "") as DealAnalyzerFormInput["network"],
    tiers: [tier],
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
    tiers: form.tiers.map((t) => {
      if (
        t.programType === "def_rebate" &&
        t.defRebatePricingMode !== "flat" &&
        t.defRebatePricingMode !== "retail_minus"
      ) {
        return { ...t, defRebatePricingMode: "flat" as const }
      }
      return t
    }),
  }
}
