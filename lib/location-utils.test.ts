import { describe, expect, it } from "vitest"
import {
  filterLocationKeysByFuelNetwork,
  filterLocationKeysByState,
  getStateCodeFromLocationKey,
  normalizeStateCode,
  stationBrandMatchesFuelNetwork,
} from "@/lib/location-utils"

const SEP = "\u001f"

describe("normalizeStateCode", () => {
  it("uppercases 2-letter codes", () => {
    expect(normalizeStateCode("tx")).toBe("TX")
    expect(normalizeStateCode(" NV ")).toBe("NV")
  })
})

describe("getStateCodeFromLocationKey", () => {
  it("parses state from stationBrand and City, ST segment", () => {
    const key = `Love's${SEP}Las Vegas, NV`
    expect(getStateCodeFromLocationKey(key)).toBe("NV")
  })

  it("returns null for malformed keys", () => {
    expect(getStateCodeFromLocationKey("no-separator")).toBeNull()
  })
})

describe("filterLocationKeysByState", () => {
  it("keeps only options in the given state", () => {
    const options = [
      { key: `A${SEP}Dallas, TX`, display: "A Dallas, TX" },
      { key: `B${SEP}Portland, OR`, display: "B Portland, OR" },
      { key: `C${SEP}Amarillo, TX`, display: "C Amarillo, TX" },
    ]
    expect(filterLocationKeysByState(options, "TX")).toEqual([
      { key: `A${SEP}Dallas, TX`, display: "A Dallas, TX" },
      { key: `C${SEP}Amarillo, TX`, display: "C Amarillo, TX" },
    ])
  })
})

describe("stationBrandMatchesFuelNetwork / filterLocationKeysByFuelNetwork", () => {
  it("matches Love's to loves network", () => {
    expect(stationBrandMatchesFuelNetwork("Love's", "loves")).toBe(true)
    expect(stationBrandMatchesFuelNetwork("Shell", "loves")).toBe(false)
  })

  it("filters by network after state", () => {
    const options = [
      { key: `Love's${SEP}Birmingham, AL`, display: "Love's Birmingham, AL" },
      { key: `Shell${SEP}Birmingham, AL`, display: "Shell Birmingham, AL" },
      { key: `Love's${SEP}Dallas, TX`, display: "Love's Dallas, TX" },
    ]
    const al = filterLocationKeysByState(options, "AL")
    expect(filterLocationKeysByFuelNetwork(al, "loves")).toEqual([
      { key: `Love's${SEP}Birmingham, AL`, display: "Love's Birmingham, AL" },
    ])
  })

  it("other network passes all options through", () => {
    const one = [{ key: `X${SEP}A, ST`, display: "X A, ST" }]
    expect(filterLocationKeysByFuelNetwork(one, "other")).toEqual(one)
    expect(filterLocationKeysByFuelNetwork(one, "")).toEqual(one)
  })
})
