import { describe, expect, it } from "vitest"

import { aggregateBaselineForDealTiers } from "@/lib/deal-analyzer-engine"
import type { DealPricingTier } from "@/lib/deal-analyzer-types"
import type { FuelTransaction } from "@/lib/mock-data"
import { defaultPricingTier } from "@/lib/deal-analyzer-migration"

function dieselTier(): DealPricingTier {
  return {
    ...defaultPricingTier(),
    programType: "discount",
    discountStructure: "retail_minus",
    discountAmountCentsPerGal: "10",
    locationCoverage: "all_locations",
    selectedStates: [],
    selectedLocationKeys: [],
  }
}

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
    pumpFeePerGallon: 0.04,
    totalCost: 35,
    savedAmount: 0,
    variance: 0,
    lat: 0,
    lng: 0,
    inNetwork: true,
    ...over,
  }
}

describe("aggregateBaselineForDealTiers weightedPumpFeePerGal", () => {
  it("computes gallon-weighted average pump fee", () => {
    const tiers = [dieselTier()]
    const list: FuelTransaction[] = [
      txn({ id: "a", gallons: 100, pumpFeePerGallon: 0.05, totalCost: 350, pricePerGallon: 3.5 }),
      txn({ id: "b", gallons: 50, pumpFeePerGallon: 0.08, totalCost: 175, pricePerGallon: 3.5 }),
    ]
    const stats = aggregateBaselineForDealTiers(list, tiers)
    // (100*0.05 + 50*0.08) / 150 = 9/150 = 0.06
    expect(stats.weightedPumpFeePerGal).toBeCloseTo(0.06, 4)
  })

  it("returns 0 when no matching transactions", () => {
    const tiers = [dieselTier()]
    const stats = aggregateBaselineForDealTiers([], tiers)
    expect(stats.weightedPumpFeePerGal).toBe(0)
  })
})
