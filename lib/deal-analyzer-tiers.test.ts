import { describe, expect, it } from "vitest"
import {
  resolveTierForTransaction,
  fractionalDiscountFromTier,
  computeDealAnalysis,
} from "@/lib/deal-analyzer-engine"
import { getFuelTransactionLocationKey } from "@/lib/mock-data"
import type { DealAnalyzerFormInput, DealPricingTier } from "@/lib/deal-analyzer-types"
import type { FuelTransaction } from "@/lib/mock-data"
import {
  defaultPricingTier,
  migrateDealConfigToCurrentShape,
} from "@/lib/deal-analyzer-migration"

function txn(over: Partial<FuelTransaction>): FuelTransaction {
  return {
    id: "t1",
    dateTime: new Date().toISOString(),
    driverName: "Test",
    truckId: "T001",
    location: "Amarillo, TX",
    stationBrand: "BP",
    fuelType: "Diesel",
    gallons: 10,
    pricePerGallon: 3.5,
    pumpFeePerGallon: 0,
    totalCost: 35,
    savedAmount: 0,
    variance: 0,
    lat: 0,
    lng: 0,
    inNetwork: true,
    ...over,
  }
}

function tier(
  coverage: DealPricingTier["locationCoverage"],
  opts: Partial<DealPricingTier> = {}
): DealPricingTier {
  return {
    ...defaultPricingTier(),
    programType: "discount",
    discountStructure: "retail_minus",
    discountAmountCentsPerGal: "10",
    locationCoverage: coverage,
    selectedStates: opts.selectedStates ?? [],
    selectedLocationKeys: opts.selectedLocationKeys ?? [],
    ...opts,
  }
}

describe("resolveTierForTransaction", () => {
  it("prefers specific_sites over specific_states and all_locations", () => {
    const t = txn({ stationBrand: "Love's", location: "Las Vegas, NV" })
    const siteKey = getFuelTransactionLocationKey("Love's", "Las Vegas, NV")
    const tiers = [
      tier("all_locations", { discountAmountCentsPerGal: "5" }),
      tier("specific_states", { selectedStates: ["NV"] }),
      tier("specific_sites", { selectedLocationKeys: [siteKey] }),
    ]
    const resolved = resolveTierForTransaction(t, tiers)
    expect(resolved).toBe(tiers[2])
  })

  it("uses first matching tier at same specificity (array order)", () => {
    const t = txn({ stationBrand: "BP", location: "Amarillo, TX" })
    const key = getFuelTransactionLocationKey("BP", "Amarillo, TX")
    const tiers = [
      tier("specific_sites", {
        discountAmountCentsPerGal: "5",
        selectedLocationKeys: [key],
      }),
      tier("specific_sites", {
        discountAmountCentsPerGal: "25",
        selectedLocationKeys: [key],
      }),
    ]
    const resolved = resolveTierForTransaction(t, tiers)
    expect(resolved).toBe(tiers[0])
  })

  it("falls back to all_locations when no site/state match", () => {
    const t = txn({ stationBrand: "BP", location: "Portland, OR" })
    const tiers = [
      tier("all_locations"),
      tier("specific_states", { selectedStates: ["TX"] }),
    ]
    const resolved = resolveTierForTransaction(t, tiers)
    expect(resolved).toBe(tiers[0])
  })
})

describe("fractionalDiscountFromTier", () => {
  it("computes retail minus fraction", () => {
    const t = tier("all_locations", {
      discountStructure: "retail_minus",
      discountAmountCentsPerGal: "100",
    })
    const f = fractionalDiscountFromTier(t, "discount", "", 4)
    expect(f).toBeCloseTo(0.25, 5)
  })
})

describe("computeDealAnalysis (blended)", () => {
  it("applies the more specific tier discount for a matching state", () => {
    const tx = txn({ location: "Dallas, TX", totalCost: 100, gallons: 20 })
    const form: DealAnalyzerFormInput = {
      dealName: "",
      brands: [{
        network: "loves",
        tiers: [
          tier("all_locations", { discountAmountCentsPerGal: "0" }),
          tier("specific_states", {
            selectedStates: ["TX"],
            discountAmountCentsPerGal: "100",
          }),
        ],
      }],
    }
    const baseline = {
      transactions: 1,
      totalSpend: 100,
      totalGallons: 20,
      avgPricePerGallon: 5,
      uniqueTrucks: 1,
    }
    const res = computeDealAnalysis({
      form,
      baseline,
      filteredTxnsForOptimization: [tx],
    })
    expect(res).not.toBeNull()
    expect(res!.proposed.totalSpend).toBeLessThan(100)
    expect(res!.proposed.tierBreakdown?.[1]?.transactionCount).toBe(1)
  })
})

describe("migrateDealConfigToCurrentShape", () => {
  it("maps legacy flat fields into a single tier", () => {
    const migrated = migrateDealConfigToCurrentShape({
      dealName: "Test",
      network: "loves",
      programType: "discount",
      discountStructure: "retail_minus",
      discountAmountCentsPerGal: "12",
      costPlusAmountPerGal: "",
      rebateAmountCentsPerGal: "",
      defRebateAmountCentsPerGal: "",
      locationCoverage: "specific_states",
      selectedStates: ["TX"],
      selectedLocationKeys: [],
    } as unknown as DealAnalyzerFormInput)
    expect(migrated.brands).toHaveLength(1)
    expect(migrated.brands[0].network).toBe("loves")
    expect(migrated.brands[0].tiers).toHaveLength(1)
    expect(migrated.brands[0].tiers[0].locationCoverage).toBe("specific_states")
    expect(migrated.brands[0].tiers[0].selectedStates).toEqual(["TX"])
    expect(migrated.brands[0].tiers[0].discountAmountCentsPerGal).toBe("12")
    expect(migrated.brands[0].tiers[0].programType).toBe("discount")
  })
})
