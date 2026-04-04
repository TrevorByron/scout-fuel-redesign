import { describe, expect, it } from "vitest"

import type { FuelTransaction } from "@/lib/mock-data"
import {
  REBATE_PROGRAMS,
  REBATE_TIERS,
  getCarrierRebateOverview,
  getTierForSpend,
  isProgramTransaction,
} from "@/lib/rebate"

function txn(overrides: Partial<FuelTransaction> & Pick<FuelTransaction, "stationBrand" | "fuelType" | "totalCost">): FuelTransaction {
  return {
    id: "id",
    dateTime: "2026-04-10T15:00:00.000Z",
    driverName: "Driver",
    truckId: "T1",
    location: "Somewhere, TX",
    gallons: 1,
    pricePerGallon: 1,
    savedAmount: 0,
    variance: 0,
    lat: 0,
    lng: 0,
    ...overrides,
  }
}

describe("getTierForSpend", () => {
  it("returns tier 1 for spend below first breakpoint", () => {
    const t = getTierForSpend(100_000, REBATE_TIERS)
    expect(t.label).toBe("Tier 1")
  })

  it("returns tier 2 in middle band", () => {
    const t = getTierForSpend(600_000, REBATE_TIERS)
    expect(t.label).toBe("Tier 2")
  })
})

describe("isProgramTransaction", () => {
  const pilot = REBATE_PROGRAMS.find((p) => p.id === "pilot")!
  const loves = REBATE_PROGRAMS.find((p) => p.id === "loves")!

  it("matches Pilot Flying J to pilot program", () => {
    expect(isProgramTransaction(txn({ stationBrand: "Pilot Flying J", fuelType: "Diesel", totalCost: 1 }), pilot)).toBe(
      true
    )
  })

  it("matches Love's to loves program", () => {
    expect(isProgramTransaction(txn({ stationBrand: "Love's", fuelType: "Diesel", totalCost: 1 }), loves)).toBe(true)
  })

  it("does not match Love's to pilot program", () => {
    expect(isProgramTransaction(txn({ stationBrand: "Love's", fuelType: "Diesel", totalCost: 1 }), pilot)).toBe(false)
  })
})

describe("getCarrierRebateOverview", () => {
  const asOf = new Date(2026, 3, 15)

  it("sums multiple programs and applies per-fuel multipliers", () => {
    const dieselPilot = 400_000
    const defPilot = 100_000
    const dieselLoves = 50_000

    const list: FuelTransaction[] = [
      txn({
        id: "p1",
        stationBrand: "Pilot Flying J",
        fuelType: "Diesel",
        totalCost: dieselPilot,
        dateTime: "2026-04-05T12:00:00.000Z",
      }),
      txn({
        id: "p2",
        stationBrand: "Pilot Flying J",
        fuelType: "DEF",
        totalCost: defPilot,
        dateTime: "2026-04-06T12:00:00.000Z",
      }),
      txn({
        id: "l1",
        stationBrand: "Love's",
        fuelType: "Diesel",
        totalCost: dieselLoves,
        dateTime: "2026-04-07T12:00:00.000Z",
      }),
    ]

    const overview = getCarrierRebateOverview(list, asOf)

    expect(overview.programs).toHaveLength(2)

    const pilot = overview.programs.find((p) => p.programId === "pilot")!
    expect(pilot.currentMonth.tierWeightedSpendDollars).toBe(dieselPilot + defPilot)
    const tier1 = getTierForSpend(pilot.currentMonth.tierWeightedSpendDollars, REBATE_TIERS)
    expect(tier1.label).toBe("Tier 1")
    const expectedPilotRebate = Math.round(
      dieselPilot * tier1.rebateRateOnSpend * 1 + defPilot * tier1.rebateRateOnSpend * 0.5
    )
    expect(pilot.currentMonth.rebateDollars).toBe(expectedPilotRebate)

    const loves = overview.programs.find((p) => p.programId === "loves")!
    expect(loves.currentMonth.spendDollars).toBe(dieselLoves)
    expect(loves.showFuelBreakdown).toBe(true)

    expect(overview.totalMtdRebateDollars).toBe(pilot.currentMonth.rebateDollars + loves.currentMonth.rebateDollars)
  })
})
