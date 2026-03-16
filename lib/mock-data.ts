// FuelCommand mock data - fleet fuel management

export const STATION_BRANDS = [
  "TA/Petro",
  "Pilot Flying J",
  "Love's",
  "Shell",
  "Chevron",
  "Flying J",
  "Kwik Trip",
  "Casey's",
  "Speedway",
  "BP",
] as const

/** Station brands that are in the fleet's preferred network. Used for in-network vs out-of-network reporting. */
export const IN_NETWORK_BRANDS = ["TA/Petro", "Pilot Flying J", "Love's"] as const

/** Out-of-network brands (all others). Used to assign compliance by driver tier. */
const OUT_OF_NETWORK_BRANDS = STATION_BRANDS.filter(
  (b) => !(IN_NETWORK_BRANDS as readonly string[]).includes(b)
) as readonly string[]

const LOCATION_KEY_SEP = "\u001f"

function getLocationKey(stationBrand: string, location: string): string {
  return `${stationBrand}${LOCATION_KEY_SEP}${location}`
}

function isBadStop(t: FuelTransaction): boolean {
  return t.inNetwork === false && (t.betterOption?.potentialSavings ?? 0) > 0
}

/** Ensure at least minLocations distinct (stationBrand, location) pairs have at least minBadStops non-compliant transactions each. */
function ensureMinimumLocationsWithBadStops(
  list: FuelTransaction[],
  minLocations: number,
  minBadStops: number
): void {
  const byKey = new Map<string, FuelTransaction[]>()
  for (const t of list) {
    const key = getLocationKey(t.stationBrand, t.location)
    const arr = byKey.get(key) ?? []
    arr.push(t)
    byKey.set(key, arr)
  }
  let locationsWithEnough = 0
  for (const [, txns] of byKey) {
    const bad = txns.filter(isBadStop)
    if (bad.length >= minBadStops) locationsWithEnough++
  }
  if (locationsWithEnough >= minLocations) return

  const minTotalTxns = 5
  const keysByBadCount = [...byKey.entries()]
    .map(([key, txns]) => ({ key, txns, badCount: txns.filter(isBadStop).length }))
    .filter((x) => x.badCount < minBadStops && x.txns.length >= minTotalTxns)
    .sort((a, b) => b.badCount - a.badCount)

  for (const { txns, badCount } of keysByBadCount) {
    if (locationsWithEnough >= minLocations) break
    const need = minBadStops - badCount
    const inNetworkTxns = txns.filter((t) => t.inNetwork === true)
    if (inNetworkTxns.length < need) continue
    for (let j = 0; j < need; j++) {
      const t = inNetworkTxns[j]
      t.inNetwork = false
      const betterStation = IN_NETWORK_BRANDS[j % IN_NETWORK_BRANDS.length]
      const discount = 0.05 + (j % 4) * 0.008
      const betterPrice = Math.round(t.pricePerGallon * (1 - discount) * 100) / 100
      const potentialSavings = Math.round(t.gallons * (t.pricePerGallon - betterPrice) * 100) / 100
      t.betterOption = {
        stationName: betterStation,
        location: t.location,
        lat: t.lat + 0.05,
        lng: t.lng - 0.03,
        pricePerGallon: betterPrice,
        distanceMiles: 2 + (j % 10),
        potentialSavings: potentialSavings > 0 ? potentialSavings : 15,
      }
    }
    locationsWithEnough++
  }
}

/** Ensure at least one location in the full list has 2+ bad stops and 5+ transactions (needs attention). */
function ensureAtLeastOneLocationNeedsAttention(list: FuelTransaction[]): void {
  const byKey = new Map<string, FuelTransaction[]>()
  for (const t of list) {
    const key = getLocationKey(t.stationBrand, t.location)
    const arr = byKey.get(key) ?? []
    arr.push(t)
    byKey.set(key, arr)
  }
  const minBadStops = 2
  const minTotalTxns = 5
  for (const [, txns] of byKey) {
    if (txns.length >= minTotalTxns && txns.filter(isBadStop).length >= minBadStops) return
  }
  for (const [, txns] of byKey) {
    if (txns.length < minTotalTxns) continue
    const inNetworkTxns = txns.filter((t) => t.inNetwork === true)
    if (inNetworkTxns.length < minBadStops) continue
    for (let j = 0; j < minBadStops; j++) {
      const t = inNetworkTxns[j]
      t.inNetwork = false
      const betterStation = IN_NETWORK_BRANDS[j % IN_NETWORK_BRANDS.length]
      const discount = 0.05 + (j % 4) * 0.008
      const betterPrice = Math.round(t.pricePerGallon * (1 - discount) * 100) / 100
      const potentialSavings = Math.round(t.gallons * (t.pricePerGallon - betterPrice) * 100) / 100
      t.betterOption = {
        stationName: betterStation,
        location: t.location,
        lat: t.lat + 0.05,
        lng: t.lng - 0.03,
        pricePerGallon: betterPrice,
        distanceMiles: 2 + (j % 10),
        potentialSavings: potentialSavings > 0 ? potentialSavings : 15,
      }
    }
    return
  }
}

/** Ensure at least one location has 2+ bad stops on refDate so "today", "this week", and "this month" always show at least one location needing attention. */
function ensureAtLeastOneLocationNeedsAttentionOnDay(
  list: FuelTransaction[],
  refDate: Date
): void {
  const dayStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime()
  const dayEnd = dayStart + 86400000 - 1
  const onDay = (t: FuelTransaction) => {
    const tms = new Date(t.dateTime).getTime()
    return tms >= dayStart && tms <= dayEnd
  }
  const dayTxns = list.filter(onDay)
  const byKey = new Map<string, FuelTransaction[]>()
  for (const t of dayTxns) {
    const key = getLocationKey(t.stationBrand, t.location)
    const arr = byKey.get(key) ?? []
    arr.push(t)
    byKey.set(key, arr)
  }
  const minBadStops = 2
  const minTotalTxns = 5
  for (const [, txns] of byKey) {
    if (txns.length >= minTotalTxns && txns.filter(isBadStop).length >= minBadStops) return
  }
  const need = minBadStops
  for (const [, txns] of byKey) {
    if (txns.length < minTotalTxns) continue
    const inNetworkTxns = txns.filter((t) => t.inNetwork === true)
    if (inNetworkTxns.length < need) continue
    for (let j = 0; j < need; j++) {
      const t = inNetworkTxns[j]
      t.inNetwork = false
      const betterStation = IN_NETWORK_BRANDS[j % IN_NETWORK_BRANDS.length]
      const discount = 0.05 + (j % 4) * 0.008
      const betterPrice = Math.round(t.pricePerGallon * (1 - discount) * 100) / 100
      const potentialSavings = Math.round(t.gallons * (t.pricePerGallon - betterPrice) * 100) / 100
      t.betterOption = {
        stationName: betterStation,
        location: t.location,
        lat: t.lat + 0.05,
        lng: t.lng - 0.03,
        pricePerGallon: betterPrice,
        distanceMiles: 2 + (j % 10),
        potentialSavings: potentialSavings > 0 ? potentialSavings : 15,
      }
    }
    return
  }
}

export type InNetworkBrand = (typeof IN_NETWORK_BRANDS)[number]

export const TRUCK_STATUSES = [
  "On Route",
  "Refueling",
  "Idle",
  "Low Fuel",
  "Off Route",
] as const

export type TruckStatus = (typeof TRUCK_STATUSES)[number]

export interface Truck {
  id: string
  driverName: string
  driverId: string
  fuelLevel: number
  nextStop: string
  status: TruckStatus
  lat: number
  lng: number
  avgMpg: number
}

/** Recommended in-network station when the driver fueled out of network. */
export interface BetterOption {
  stationName: string
  location: string
  lat: number
  lng: number
  pricePerGallon: number
  distanceMiles: number
  potentialSavings: number
}

export type FuelType = "Diesel" | "Reefer" | "DEF"

export interface FuelTransaction {
  id: string
  dateTime: string
  driverName: string
  truckId: string
  location: string
  stationBrand: string
  fuelType: FuelType
  gallons: number
  pricePerGallon: number
  totalCost: number
  savedAmount: number
  variance: number
  alert?: boolean
  lat: number
  lng: number
  /** True when the purchase was at an in-network station. */
  inNetwork?: boolean
  betterOption?: BetterOption
}

export interface CostOpportunity {
  id: string
  title: string
  estimatedSavings: number
  priority: "high" | "medium" | "low"
}

export interface DriverPerformance {
  rank: number
  driverName: string
  truckId: string
  avgMpg: number
  fuelCostPerMile: number
  idleTimeHours: number
  efficiencyScore: number
}

export interface WeeklyFuelPrice {
  week: string
  price: number
  volume: number
}

export interface AlertItem {
  id: string
  priority: "High" | "Medium" | "Low"
  type: string
  description: string
  savingsOrCost: number
  isSavings: boolean
}

export interface DriverDetail {
  driverId: string
  driverName: string
  truckId: string
  monthlyTrend: { month: string; mpg: number; costPerMile: number }[]
  recentTrips: { date: string; location: string; gallons: number; cost: number }[]
  recommendations: string[]
  badges: string[]
}

export interface PricingSummaryRow {
  date: string
  chain: string
  location: string
  city: string
  state: string
  retailPrice: number
  yourPrice: number
  discount: number
}

/** Fleet has 16 drivers; use first 16 for transactions and trucks. */
const NUM_FLEET_DRIVERS = 16

const DRIVER_NAMES = [
  "Mike Johnson",
  "Sarah Williams",
  "James Davis",
  "Maria Garcia",
  "Robert Martinez",
  "Jennifer Rodriguez",
  "William Brown",
  "Linda Jones",
  "David Miller",
  "Barbara Wilson",
  "Richard Anderson",
  "Susan Thomas",
  "Joseph Taylor",
  "Jessica Moore",
  "Charles Jackson",
  "Karen White",
]

/** All 50 states + DC and major US cities so the map shows nationwide coverage. */
const LOCATIONS = [
  "Phoenix, AZ",
  "Tucson, AZ",
  "Los Angeles, CA",
  "San Diego, CA",
  "San Francisco, CA",
  "San Jose, CA",
  "Denver, CO",
  "Albuquerque, NM",
  "Las Vegas, NV",
  "Reno, NV",
  "Salt Lake City, UT",
  "Seattle, WA",
  "Portland, OR",
  "Boise, ID",
  "Billings, MT",
  "Cheyenne, WY",
  "Dallas, TX",
  "Houston, TX",
  "San Antonio, TX",
  "Austin, TX",
  "El Paso, TX",
  "Fort Worth, TX",
  "Amarillo, TX",
  "Oklahoma City, OK",
  "Tulsa, OK",
  "Kansas City, MO",
  "St. Louis, MO",
  "Wichita, KS",
  "Omaha, NE",
  "Lincoln, NE",
  "Des Moines, IA",
  "Sioux Falls, SD",
  "Fargo, ND",
  "Minneapolis, MN",
  "Chicago, IL",
  "Indianapolis, IN",
  "Milwaukee, WI",
  "Detroit, MI",
  "Cleveland, OH",
  "Columbus, OH",
  "Cincinnati, OH",
  "Louisville, KY",
  "Nashville, TN",
  "Memphis, TN",
  "Birmingham, AL",
  "Jackson, MS",
  "Little Rock, AR",
  "New Orleans, LA",
  "Baton Rouge, LA",
  "Atlanta, GA",
  "Charlotte, NC",
  "Raleigh, NC",
  "Charleston, SC",
  "Columbia, SC",
  "Jacksonville, FL",
  "Miami, FL",
  "Orlando, FL",
  "Tampa, FL",
  "Savannah, GA",
  "Richmond, VA",
  "Norfolk, VA",
  "Washington, DC",
  "Baltimore, MD",
  "Wilmington, DE",
  "Philadelphia, PA",
  "Pittsburgh, PA",
  "Newark, NJ",
  "New York, NY",
  "Buffalo, NY",
  "Albany, NY",
  "Hartford, CT",
  "Boston, MA",
  "Providence, RI",
  "Manchester, NH",
  "Burlington, VT",
  "Portland, ME",
  "Charleston, WV",
]

const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Phoenix, AZ": { lat: 33.4484, lng: -112.074 },
  "Tucson, AZ": { lat: 32.2226, lng: -110.9747 },
  "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
  "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194 },
  "San Jose, CA": { lat: 37.3382, lng: -121.8863 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Albuquerque, NM": { lat: 35.0844, lng: -106.6504 },
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
  "Reno, NV": { lat: 39.5296, lng: -119.8138 },
  "Salt Lake City, UT": { lat: 40.7608, lng: -111.891 },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Portland, OR": { lat: 45.5152, lng: -122.6784 },
  "Boise, ID": { lat: 43.615, lng: -116.2023 },
  "Billings, MT": { lat: 45.7833, lng: -108.5007 },
  "Cheyenne, WY": { lat: 41.14, lng: -104.8202 },
  "Dallas, TX": { lat: 32.7767, lng: -96.797 },
  "Houston, TX": { lat: 29.7604, lng: -95.3698 },
  "San Antonio, TX": { lat: 29.4241, lng: -98.4936 },
  "Austin, TX": { lat: 30.2672, lng: -97.7431 },
  "El Paso, TX": { lat: 31.7619, lng: -106.485 },
  "Fort Worth, TX": { lat: 32.7555, lng: -97.3308 },
  "Amarillo, TX": { lat: 35.222, lng: -101.8313 },
  "Oklahoma City, OK": { lat: 35.4676, lng: -97.5164 },
  "Tulsa, OK": { lat: 36.1539, lng: -95.9928 },
  "Kansas City, MO": { lat: 39.0997, lng: -94.5786 },
  "St. Louis, MO": { lat: 38.627, lng: -90.1994 },
  "Wichita, KS": { lat: 37.6872, lng: -97.3301 },
  "Omaha, NE": { lat: 41.2565, lng: -95.9345 },
  "Lincoln, NE": { lat: 40.8258, lng: -96.6852 },
  "Des Moines, IA": { lat: 41.5868, lng: -93.625 },
  "Sioux Falls, SD": { lat: 43.5446, lng: -96.7313 },
  "Fargo, ND": { lat: 46.8772, lng: -96.7898 },
  "Minneapolis, MN": { lat: 44.9778, lng: -93.265 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581 },
  "Milwaukee, WI": { lat: 43.0389, lng: -87.9065 },
  "Detroit, MI": { lat: 42.3314, lng: -83.0458 },
  "Cleveland, OH": { lat: 41.4993, lng: -81.6944 },
  "Columbus, OH": { lat: 39.9612, lng: -82.9988 },
  "Cincinnati, OH": { lat: 39.1031, lng: -84.512 },
  "Louisville, KY": { lat: 38.2527, lng: -85.7585 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
  "Memphis, TN": { lat: 35.1495, lng: -90.049 },
  "Birmingham, AL": { lat: 33.5207, lng: -86.8025 },
  "Jackson, MS": { lat: 32.2988, lng: -90.1848 },
  "Little Rock, AR": { lat: 34.7465, lng: -92.2896 },
  "New Orleans, LA": { lat: 29.9511, lng: -90.0715 },
  "Baton Rouge, LA": { lat: 30.4515, lng: -91.1871 },
  "Atlanta, GA": { lat: 33.749, lng: -84.388 },
  "Charlotte, NC": { lat: 35.2271, lng: -80.8431 },
  "Raleigh, NC": { lat: 35.7796, lng: -78.6382 },
  "Charleston, SC": { lat: 32.7765, lng: -79.9311 },
  "Columbia, SC": { lat: 34.0007, lng: -81.0348 },
  "Jacksonville, FL": { lat: 30.3322, lng: -81.6557 },
  "Miami, FL": { lat: 25.7617, lng: -80.1918 },
  "Orlando, FL": { lat: 28.5383, lng: -81.3792 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
  "Savannah, GA": { lat: 32.0809, lng: -81.0912 },
  "Richmond, VA": { lat: 37.5407, lng: -77.436 },
  "Norfolk, VA": { lat: 36.8508, lng: -76.2859 },
  "Washington, DC": { lat: 38.9072, lng: -77.0369 },
  "Baltimore, MD": { lat: 39.2904, lng: -76.6122 },
  "Wilmington, DE": { lat: 39.7391, lng: -75.5398 },
  "Philadelphia, PA": { lat: 39.9526, lng: -75.1652 },
  "Pittsburgh, PA": { lat: 40.4406, lng: -79.9959 },
  "Newark, NJ": { lat: 40.7357, lng: -74.1724 },
  "New York, NY": { lat: 40.7128, lng: -74.006 },
  "Buffalo, NY": { lat: 42.8864, lng: -78.8784 },
  "Albany, NY": { lat: 42.6526, lng: -73.7562 },
  "Hartford, CT": { lat: 41.7658, lng: -72.6734 },
  "Boston, MA": { lat: 42.3601, lng: -71.0589 },
  "Providence, RI": { lat: 41.824, lng: -71.4128 },
  "Manchester, NH": { lat: 42.9956, lng: -71.4548 },
  "Burlington, VT": { lat: 44.4759, lng: -73.2121 },
  "Portland, ME": { lat: 43.6591, lng: -70.2568 },
  "Charleston, WV": { lat: 38.3498, lng: -81.6326 },
}

const LOCATION_COORDS_LIST = LOCATIONS.map((name) => LOCATION_COORDINATES[name]!)

export const trucks: Truck[] = Array.from({ length: NUM_FLEET_DRIVERS }, (_, i) => {
  const statuses: TruckStatus[] = [
    "On Route",
    "On Route",
    "On Route",
    "Refueling",
    "Idle",
    "Low Fuel",
    "Off Route",
  ]
  // Place trucks near real cities with random offset so they look scattered on routes
  const base = LOCATION_COORDS_LIST[i % LOCATION_COORDS_LIST.length]
  const latOffset = (Math.random() - 0.5) * 0.8
  const lngOffset = (Math.random() - 0.5) * 0.8
  return {
    id: `T${String(i + 1).padStart(3, "0")}`,
    driverName: DRIVER_NAMES[i % DRIVER_NAMES.length],
    driverId: `D${String(i + 1).padStart(3, "0")}`,
    fuelLevel: Math.round(Math.random() * 60 + 15),
    nextStop: ["TA Phoenix", "Pilot Albuquerque", "Love's Dallas", "Shell Denver", "Flying J OKC"][
      i % 5
    ],
    status: statuses[i % statuses.length],
    lat: Math.round((base.lat + latOffset) * 10000) / 10000,
    lng: Math.round((base.lng + lngOffset) * 10000) / 10000,
    avgMpg: 6.2 + Math.random() * 1.4,
  }
})

/** Driver (fuel card holder); independent of truck assignment. */
export interface Driver {
  driverId: string
  driverName: string
}

/** All drivers in the fleet; use for independent driver/truck selection. */
export const drivers: Driver[] = trucks.map((t) => ({
  driverId: t.driverId,
  driverName: t.driverName,
}))

const FUEL_TYPE_SEQUENCE: FuelType[] = [
  "Diesel", "Diesel", "Diesel", "Diesel", "Diesel",
  "Diesel", "Diesel", "Reefer", "Reefer", "DEF",
]
const FUEL_TYPES: FuelType[] = ["Diesel", "Reefer", "DEF"]

/** Average transactions per driver per day. */
const TRANSACTIONS_PER_DRIVER_PER_DAY = 3

/**
 * Compliance by driver: a few fully compliant, most high, five needing attention.
 * driverIndex 0–2: 100% in-network (fully compliant)
 * driverIndex 3–10: ~88% in-network (good)
 * driverIndex 11–15: ~18% in-network (needing attention — below 60%)
 */
function getComplianceTier(driverIndex: number): { inNetworkPct: number; alwaysInNetwork: boolean } {
  if (driverIndex <= 2) return { inNetworkPct: 100, alwaysInNetwork: true }
  if (driverIndex <= 10) return { inNetworkPct: 88, alwaysInNetwork: false }
  return { inNetworkPct: 18, alwaysInNetwork: false }
}

/**
 * Target in-network % by location index so that for any date range the map shows
 * all three colors: red (<50%), yellow (50–89%), green (≥90%).
 * Uses index % 3 to scale to any number of locations: ~1/3 each band.
 */
function getLocationComplianceTarget(locationIndex: number): number {
  const band = locationIndex % 3
  if (band === 0) return 25
  if (band === 1) return 65
  return 95
}

/**
 * Deterministic offset (lat, lng) per (stationBrand, location) so each location has distinct
 * coordinates. Spreads points along N/S or E/W corridors (major highways). Large spread so
 * dots stay visible at continental zoom and don't overlap.
 */
function getLocationCoordOffset(stationBrand: string, location: string): { lat: number; lng: number } {
  const key = `${stationBrand}|${location}`
  let h = 0
  for (let j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) >>> 0
  const h2 = (h * 17) >>> 0
  const alongNS = (h % 2) === 0
  const along = (h % 100) / 100
  const across = (h2 % 100) / 100
  if (alongNS) {
    return {
      lat: along * 0.8 - 0.4,
      lng: across * 0.2 - 0.1,
    }
  }
  return {
    lat: across * 0.2 - 0.1,
    lng: along * 1.0 - 0.5,
  }
}

/**
 * In-memory cache of transactions by date (YYYY-MM-DD). Ensures we always have
 * transactions for "today" when the app is used on any calendar day, without
 * rebuilding on every request.
 */
const transactionsByDateCache = new Map<string, FuelTransaction[]>()

/**
 * Build fuel transactions from the given date going back 365 days.
 * Fleet has 16 drivers; each driver has 3 transactions per day.
 * @param asOfDate - "Today" for the range; defaults to current date so every login sees data for that day.
 */
function buildFuelTransactions(asOfDate: Date): FuelTransaction[] {
  const now = asOfDate
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const list: FuelTransaction[] = []
  let i = 0
  for (let daysAgo = 0; daysAgo <= 365; daysAgo++) {
    const date = new Date(anchor)
    date.setDate(date.getDate() - daysAgo)
    if (date.getTime() > now.getTime()) continue
    for (let driverIndex = 0; driverIndex < NUM_FLEET_DRIVERS; driverIndex++) {
      for (let k = 0; k < TRANSACTIONS_PER_DRIVER_PER_DAY; k++) {
      /** On the build date (today), pin the first 5 transactions to the same location so at least one location has 5+ txns and can be given 2+ bad stops for "needs attention". */
      const isFirstFiveOfToday = daysAgo === 0 && driverIndex * TRANSACTIONS_PER_DRIVER_PER_DAY + k < 5
      const locationIndex = isFirstFiveOfToday ? 0 : i % LOCATIONS.length
      const location = LOCATIONS[locationIndex]
      const coords = LOCATION_COORDINATES[location] ?? { lat: 35 + (i % 10) * 0.5, lng: -100 - (i % 10) * 0.5 }
      const fuelType = k < FUEL_TYPES.length ? FUEL_TYPES[k] : FUEL_TYPE_SEQUENCE[i % 10]
      const gallons = Math.round((80 + (i % 121)) * 10) / 10
      const pricePerGallon = Math.round((380 + (i % 100)) * 100) / 10000
      const totalCost = Math.round(gallons * pricePerGallon * 100) / 100
      const savingsPerGallon =
        fuelType === "Diesel" ? 0.12 + (i % 5) * 0.01
        : fuelType === "Reefer" ? 0.14 + (i % 5) * 0.01
        : 0.08 + (i % 4) * 0.01
      const savedAmount = Math.round(gallons * savingsPerGallon * 100) / 100
      const optimalPrice = pricePerGallon * 0.97
      /** One in four transactions has no overpaid amount so some drivers show $0 missed savings. */
      const noOverpaid = i % 4 === 0
      const variance = noOverpaid
        ? 0
        : Math.round((optimalPrice - pricePerGallon) * gallons * 100) / 100
      const alert = variance < -15

      const txnDate = new Date(date)
      txnDate.setHours(6 + ((i + k) % 14), ((i + k) % 4) * 15, 0, 0)

      /** Location-based compliance band so any date range shows red/yellow/green on the map; roll keeps it deterministic. For "today" seed location, force out-of-network so one key has 5+ txns. */
      const locationTargetPct = getLocationComplianceTarget(locationIndex)
      const roll = (i * 13 + daysAgo * 17 + k * 7) % 100
      const inNetwork = isFirstFiveOfToday ? false : roll < locationTargetPct
      const stationBrand = inNetwork
        ? IN_NETWORK_BRANDS[(i + daysAgo + k) % IN_NETWORK_BRANDS.length]
        : OUT_OF_NETWORK_BRANDS[isFirstFiveOfToday ? 0 : (i + daysAgo * 3 + k) % OUT_OF_NETWORK_BRANDS.length]
      const offset = getLocationCoordOffset(stationBrand, location)
      const lat = coords.lat + offset.lat
      const lng = coords.lng + offset.lng
      const hasBetterOption = !noOverpaid && !inNetwork
      const betterOptionStation = IN_NETWORK_BRANDS[i % IN_NETWORK_BRANDS.length]
      const differentStation = betterOptionStation !== stationBrand
      const baseSavings = hasBetterOption && differentStation ? 8 + (i % 38) : 0
      const complianceMultiplier = inNetwork ? 0 : 1
      const potentialSavings = Math.round(baseSavings * complianceMultiplier)
      const discount = 0.05 + (i % 4) * 0.008
      const betterPrice = hasBetterOption
        ? Math.round((pricePerGallon * (1 - discount)) * 100) / 100
        : pricePerGallon
      const distanceMiles = hasBetterOption ? 2 + (i % 12) : 0
      const betterLat = lat + (i % 3) * 0.08 - 0.08
      const betterLng = lng + (i % 2) * 0.1 - 0.05

      const txn: FuelTransaction = {
        id: `txn-${i + 1}`,
        dateTime: txnDate.toISOString(),
        driverName: DRIVER_NAMES[driverIndex],
        truckId: `T${String(driverIndex + 1).padStart(3, "0")}`,
        location,
        stationBrand,
        fuelType,
        gallons,
        pricePerGallon,
        totalCost,
        savedAmount,
        variance,
        alert,
        lat,
        lng,
        inNetwork,
      }
      if (hasBetterOption && differentStation && potentialSavings > 0) {
        txn.betterOption = {
          stationName: betterOptionStation,
          location,
          lat: betterLat,
          lng: betterLng,
          pricePerGallon: betterPrice,
          distanceMiles,
          potentialSavings,
        }
      }
      list.push(txn)
      i++
      }
    }
  }
  ensureMinimumLocationsWithBadStops(list, 11, 5)
  ensureAtLeastOneLocationNeedsAttention(list)
  ensureAtLeastOneLocationNeedsAttentionOnDay(list, anchor)
  return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
}

/**
 * Returns fuel transactions from the given date back 365 days. Cached by date so
 * every request on the same calendar day shares one build. Use the default (no arg)
 * so that whenever someone logs in — including on a future calendar day — there are
 * always transactions for that day.
 */
export function getFuelTransactions(asOfDate?: Date): FuelTransaction[] {
  const date = asOfDate ?? new Date()
  const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10)
  let list = transactionsByDateCache.get(key)
  if (!list) {
    list = buildFuelTransactions(date)
    transactionsByDateCache.set(key, list)
  }
  return list
}

/** @deprecated Use getFuelTransactions() so data always includes the current day. */
export const fuelTransactions: FuelTransaction[] = getFuelTransactions()

/** Transactions in the current trip window for T001, T002, T003 at seed trip stop locations. Merge with getFuelTransactions() on Trips page so "matching refuels" show. */
export function getSeedTripTransactions(): FuelTransaction[] {
  const base = new Date()
  const locations: Array<{ truckId: string; location: string; lat: number; lng: number; stationBrand: string; daysOffset: number; gallons: number; totalCost: number }> = [
    { truckId: "T001", location: "Phoenix, AZ", lat: 33.4484, lng: -112.074, stationBrand: "Pilot Flying J", daysOffset: -2, gallons: 120, totalCost: 446.4 },
    { truckId: "T001", location: "Albuquerque, NM", lat: 35.0844, lng: -106.6504, stationBrand: "Love's", daysOffset: -1, gallons: 95, totalCost: 349.6 },
    { truckId: "T002", location: "Denver, CO", lat: 39.7392, lng: -104.9903, stationBrand: "Pilot Flying J", daysOffset: -3, gallons: 115, totalCost: 434.7 },
    { truckId: "T002", location: "Oklahoma City, OK", lat: 35.4676, lng: -97.5164, stationBrand: "Love's", daysOffset: -1, gallons: 98, totalCost: 357.7 },
    { truckId: "T003", location: "El Paso, TX", lat: 31.7619, lng: -106.485, stationBrand: "Pilot Flying J", daysOffset: -2, gallons: 118, totalCost: 435.42 },
    { truckId: "T003", location: "Tucson, AZ", lat: 32.2226, lng: -110.9747, stationBrand: "Love's", daysOffset: -1, gallons: 92, totalCost: 344.08 },
  ]
  return locations.map((loc, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + loc.daysOffset)
    d.setHours(8 + (i % 6), 30, 0, 0)
    const driverName = loc.truckId === "T001" ? "Mike Johnson" : loc.truckId === "T002" ? "Sarah Williams" : "James Davis"
    return {
      id: `txn-seed-${i + 1}`,
      dateTime: d.toISOString(),
      driverName,
      truckId: loc.truckId,
      location: loc.location,
      stationBrand: loc.stationBrand,
      fuelType: "Diesel" as FuelType,
      gallons: loc.gallons,
      pricePerGallon: Math.round((loc.totalCost / loc.gallons) * 100) / 100,
      totalCost: loc.totalCost,
      savedAmount: Math.round(loc.totalCost * 0.05 * 100) / 100,
      variance: 0,
      alert: false,
      lat: loc.lat,
      lng: loc.lng,
      inNetwork: true,
    }
  })
}

export const costOpportunities: CostOpportunity[] = [
  {
    id: "1",
    title: "Route T012–T018: Use Pilot I-40 instead of Love's. Same route, $0.12/gal less.",
    estimatedSavings: 1840,
    priority: "high",
  },
  {
    id: "2",
    title: "Driver 23: Idle time 2.2 hrs/day. Target <1 hr. Estimated waste: $420/mo.",
    estimatedSavings: 420,
    priority: "high",
  },
  {
    id: "3",
    title: "Pre-buy California loads: 15 loads next week. Refuel in AZ/NV before crossing.",
    estimatedSavings: 2100,
    priority: "high",
  },
  {
    id: "4",
    title: "Vendor B fleet card proposal: 2% rebate vs current. Annual impact.",
    estimatedSavings: 41200,
    priority: "medium",
  },
  {
    id: "5",
    title: "Trucks T033–T038: Shift to TA/Petro preferred. Current compliance 62%.",
    estimatedSavings: 890,
    priority: "medium",
  },
]

export const weeklyFuelPrices: WeeklyFuelPrice[] = [
  { week: "Week 1", price: 3.85, volume: 12500 },
  { week: "Week 2", price: 3.92, volume: 13200 },
  { week: "Week 3", price: 3.78, volume: 12800 },
  { week: "Week 4", price: 3.88, volume: 14100 },
  { week: "Week 5", price: 3.95, volume: 13800 },
  { week: "Week 6", price: 3.82, volume: 12900 },
]

export interface FuelPricePoint {
  date: string
  label: string
  price: number | null
  forecast: number | null
  forecastLow: number | null
  forecastHigh: number | null
}

function generateFuelPriceHistory(): FuelPricePoint[] {
  // 60 weekly historical prices (oldest → newest, ending week of Mar 2 2026)
  const HIST: number[] = [
    3.58, 3.62, 3.65, 3.61, 3.63, 3.66, 3.70, 3.74, 3.71, 3.68, 3.72, 3.75,
    3.78, 3.82, 3.85, 3.88, 3.85, 3.82, 3.80, 3.83, 3.85, 3.88, 3.90, 3.92, 3.89,
    3.86, 3.83, 3.80, 3.82, 3.85, 3.88, 3.86, 3.84, 3.80, 3.77, 3.74, 3.76, 3.79,
    3.77, 3.74, 3.71, 3.68, 3.65, 3.62, 3.63, 3.66, 3.70, 3.73, 3.71, 3.68, 3.72,
    3.75, 3.78, 3.81, 3.79, 3.77, 3.78, 3.80, 3.82, 3.85,
  ]
  // 8 forecast values for weeks of Mar 9 → Apr 27 2026
  const FC:     number[] = [3.87, 3.84, 3.82, 3.80, 3.78, 3.81, 3.83, 3.85]
  const FC_LOW: number[] = [3.79, 3.76, 3.74, 3.72, 3.70, 3.73, 3.75, 3.76]
  const FC_HI:  number[] = [3.95, 3.92, 3.90, 3.88, 3.86, 3.89, 3.91, 3.94]

  const fmtLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10)

  // Anchor: last historical week starts Monday March 2, 2026
  const ANCHOR = new Date(2026, 2, 2)
  const N = HIST.length // 60
  const result: FuelPricePoint[] = []

  // Historical (oldest first)
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(ANCHOR)
    d.setDate(d.getDate() - i * 7)
    result.push({
      date: fmtDate(d),
      label: fmtLabel(d),
      price: HIST[N - 1 - i],
      forecast: null,
      forecastLow: null,
      forecastHigh: null,
    })
  }

  // Connect forecast to last actual point (shared boundary)
  const lastIdx = N - 1
  result[lastIdx].forecast = HIST[N - 1]
  result[lastIdx].forecastLow = HIST[N - 1]
  result[lastIdx].forecastHigh = HIST[N - 1]

  // Future forecast weeks (Mar 9 → Apr 27)
  for (let i = 0; i < FC.length; i++) {
    const d = new Date(ANCHOR)
    d.setDate(d.getDate() + (i + 1) * 7)
    result.push({
      date: fmtDate(d),
      label: fmtLabel(d),
      price: null,
      forecast: FC[i],
      forecastLow: FC_LOW[i],
      forecastHigh: FC_HI[i],
    })
  }

  return result
}

export const fuelPriceHistory = generateFuelPriceHistory()

export const driverLeaderboard: DriverPerformance[] = [
  {
    rank: 1,
    driverName: "Mike Johnson",
    truckId: "T001",
    avgMpg: 7.2,
    fuelCostPerMile: 1.18,
    idleTimeHours: 0.8,
    efficiencyScore: 96,
  },
  {
    rank: 2,
    driverName: "Sarah Williams",
    truckId: "T002",
    avgMpg: 7.1,
    fuelCostPerMile: 1.21,
    idleTimeHours: 0.9,
    efficiencyScore: 94,
  },
  {
    rank: 3,
    driverName: "James Davis",
    truckId: "T003",
    avgMpg: 7.0,
    fuelCostPerMile: 1.23,
    idleTimeHours: 1.0,
    efficiencyScore: 91,
  },
  {
    rank: 4,
    driverName: "Maria Garcia",
    truckId: "T004",
    avgMpg: 6.9,
    fuelCostPerMile: 1.25,
    idleTimeHours: 1.1,
    efficiencyScore: 88,
  },
  {
    rank: 5,
    driverName: "Robert Martinez",
    truckId: "T005",
    avgMpg: 6.8,
    fuelCostPerMile: 1.27,
    idleTimeHours: 1.2,
    efficiencyScore: 85,
  },
]

export const dashboardKpis = {
  costPerMile: 1.23,
  costPerMileTrend: -2.3,
  monthlySpend: 387450,
  budget: 396500,
  fleetAvgMpg: 6.8,
  mpgYoYImprovement: 4.7,
  activeAlerts: 7,
}

export const alertsList: AlertItem[] = [
  {
    id: "1",
    priority: "High",
    type: "Non-preferred station",
    description: "Driver 31 consistently refueling at non-preferred stations.",
    savingsOrCost: 340,
    isSavings: true,
  },
  {
    id: "2",
    priority: "High",
    type: "Maintenance",
    description: "Truck 17 MPG decreased 12% - maintenance required.",
    savingsOrCost: 0,
    isSavings: false,
  },
  {
    id: "3",
    priority: "Medium",
    type: "Route optimization",
    description: "15 loads next week through California - optimize pre-CA refueling.",
    savingsOrCost: 1840,
    isSavings: true,
  },
  {
    id: "4",
    priority: "Medium",
    type: "Vendor",
    description: "Vendor B proposal review - potential annual savings.",
    savingsOrCost: 41200,
    isSavings: true,
  },
  {
    id: "5",
    priority: "Low",
    type: "Idle time",
    description: "Fleet average idle time up 8% this week.",
    savingsOrCost: 1200,
    isSavings: true,
  },
]

/** Mock data for FleetScoreCard: week label, target, and 3-month compliance trend. */
export const fleetScoreCardMock = {
  weekDate: "Oct 21",
  previousGrade: "C",
  targetGrade: "B+",
  targetDate: "Nov 1",
  trendData: [
    { month: "Aug", value: 58 },
    { month: "Sep", value: 62 },
    { month: "Oct", value: 67 },
  ] as { month: string; value: number }[],
}

export const driverDetails: Record<string, DriverDetail> = {
  D001: {
    driverId: "D001",
    driverName: "Mike Johnson",
    truckId: "T001",
    monthlyTrend: [
      { month: "Jul", mpg: 6.9, costPerMile: 1.25 },
      { month: "Aug", mpg: 7.0, costPerMile: 1.23 },
      { month: "Sep", mpg: 7.1, costPerMile: 1.21 },
      { month: "Oct", mpg: 7.2, costPerMile: 1.18 },
    ],
    recentTrips: [
      { date: "2024-10-12", location: "Phoenix, AZ", gallons: 120, cost: 456 },
      { date: "2024-10-10", location: "Albuquerque, NM", gallons: 95, cost: 361 },
      { date: "2024-10-08", location: "Dallas, TX", gallons: 110, cost: 418 },
    ],
    recommendations: ["Maintain current idle discipline.", "Consider Pilot I-40 for next CA run."],
    badges: ["Top MPG Oct", "Zero Overspend", "30-day Safe"],
  },
  D002: {
    driverId: "D002",
    driverName: "Sarah Williams",
    truckId: "T002",
    monthlyTrend: [
      { month: "Jul", mpg: 6.8, costPerMile: 1.27 },
      { month: "Aug", mpg: 7.0, costPerMile: 1.24 },
      { month: "Sep", mpg: 7.1, costPerMile: 1.22 },
      { month: "Oct", mpg: 7.1, costPerMile: 1.21 },
    ],
    recentTrips: [
      { date: "2024-10-11", location: "Denver, CO", gallons: 105, cost: 399 },
      { date: "2024-10-09", location: "Oklahoma City, OK", gallons: 88, cost: 334 },
    ],
    recommendations: ["Idle time slightly above target; review break habits."],
    badges: ["Efficiency Star", "Preferred Network 100%"],
  },
  D003: {
    driverId: "D003",
    driverName: "James Davis",
    truckId: "T003",
    monthlyTrend: [
      { month: "Jul", mpg: 6.7, costPerMile: 1.28 },
      { month: "Aug", mpg: 6.9, costPerMile: 1.26 },
      { month: "Sep", mpg: 7.0, costPerMile: 1.24 },
      { month: "Oct", mpg: 7.0, costPerMile: 1.23 },
    ],
    recentTrips: [
      { date: "2024-10-13", location: "Las Vegas, NV", gallons: 115, cost: 437 },
      { date: "2024-10-10", location: "Salt Lake City, UT", gallons: 98, cost: 372 },
    ],
    recommendations: ["One overspend in Sep at non-preferred station; reinforce network list."],
    badges: ["On-Time Delivery", "Cost Saver"],
  },
  D004: {
    driverId: "D004",
    driverName: "Maria Garcia",
    truckId: "T004",
    monthlyTrend: [
      { month: "Jul", mpg: 6.6, costPerMile: 1.30 },
      { month: "Aug", mpg: 6.8, costPerMile: 1.27 },
      { month: "Sep", mpg: 6.9, costPerMile: 1.26 },
      { month: "Oct", mpg: 6.9, costPerMile: 1.25 },
    ],
    recentTrips: [
      { date: "2024-10-12", location: "Kansas City, MO", gallons: 102, cost: 388 },
      { date: "2024-10-09", location: "St. Louis, MO", gallons: 92, cost: 349 },
    ],
    recommendations: ["Idle time trending up; schedule coaching session."],
    badges: ["Rising Star"],
  },
  D005: {
    driverId: "D005",
    driverName: "Robert Martinez",
    truckId: "T005",
    monthlyTrend: [
      { month: "Jul", mpg: 6.5, costPerMile: 1.32 },
      { month: "Aug", mpg: 6.7, costPerMile: 1.29 },
      { month: "Sep", mpg: 6.8, costPerMile: 1.28 },
      { month: "Oct", mpg: 6.8, costPerMile: 1.27 },
    ],
    recentTrips: [
      { date: "2024-10-11", location: "Chicago, IL", gallons: 108, cost: 410 },
      { date: "2024-10-08", location: "Indianapolis, IN", gallons: 85, cost: 323 },
    ],
    recommendations: ["Focus on cruise control usage on highways.", "Review refuel timing to avoid premium stations."],
    badges: ["Improving MPG"],
  },
}

// Budget/forecast mock
export const budgetVsActual = [
  { period: "Jan", budget: 380000, actual: 372100 },
  { period: "Feb", budget: 385000, actual: 381200 },
  { period: "Mar", budget: 390000, actual: 388400 },
  { period: "Apr", budget: 392000, actual: 395100 },
  { period: "May", budget: 394000, actual: 389200 },
  { period: "Jun", budget: 396000, actual: 391800 },
  { period: "Jul", budget: 396500, actual: 387450 },
]

export const forecastData = {
  predictedNextMonth: 382000,
  confidenceLow: 368000,
  confidenceHigh: 396000,
  factors: [
    "Diesel futures down 3% vs last month",
    "Planned mileage +2% for holiday season",
    "2 trucks in shop first week",
  ],
}

// Route optimizer mock results
export const mockRouteStops = [
  {
    station: "Pilot Flying J",
    location: "Amarillo, TX",
    pricePerGallon: 3.72,
    refuelGallons: 120,
    distanceFromPrev: 287,
    eta: "14:30",
    fuelPct: 85,
  },
  {
    station: "Love's",
    location: "Albuquerque, NM",
    pricePerGallon: 3.68,
    refuelGallons: 95,
    distanceFromPrev: 294,
    eta: "22:15",
    fuelPct: 78,
  },
  {
    station: "TA/Petro",
    location: "Flagstaff, AZ",
    pricePerGallon: 3.85,
    refuelGallons: 110,
    distanceFromPrev: 330,
    eta: "06:00",
    fuelPct: 82,
  },
]
export const mockRouteSummary = { totalCost: 1428, savingsVsAlternate: 187 }

const PRICING_SUMMARY_CHAINS = ["Other", "TA/Petro", "7 Fleet", "QT"] as const
const PRICING_SUMMARY_LOCATIONS = [
  "Sun Stop #612",
  "Diamond Store 21",
  "TA Express",
  "Cowboys #3672",
  "Pilot #889",
  "Love's #445",
  "Flying J #102",
  "Shell #301",
  "QuickStop #12",
  "Mapco #88",
]
const PRICING_SUMMARY_CITIES_AL = [
  "Andalusia",
  "Atmore",
  "Birmingham",
  "Boaz",
  "Brewton",
  "Brundidge",
  "Calera",
  "Centre",
  "Childersburg",
  "Cottondale",
  "Decatur",
  "Dothan",
  "Enterprise",
  "Eufaula",
  "Gadsden",
  "Huntsville",
  "Mobile",
  "Montgomery",
  "Opelika",
  "Oxford",
]
const PRICING_SUMMARY_CITIES_GA = ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah"]
const PRICING_SUMMARY_CITIES_TN = ["Nashville", "Memphis", "Knoxville", "Chattanooga"]

function buildPricingSummaryRows(): PricingSummaryRow[] {
  const rows: PricingSummaryRow[] = []
  const citiesByState: Record<string, string[]> = {
    AL: PRICING_SUMMARY_CITIES_AL,
    GA: PRICING_SUMMARY_CITIES_GA,
    TN: PRICING_SUMMARY_CITIES_TN,
  }
  const states = ["AL", "AL", "AL", "GA", "TN"] as const
  const dates = ["2026-03-10", "2026-03-09", "2026-03-08", "2026-03-07", "2026-03-06"]
  let idx = 0
  for (const date of dates) {
    for (let i = 0; i < 32; i++) {
      const state = states[idx % states.length]
      const cities = citiesByState[state] ?? PRICING_SUMMARY_CITIES_AL
      const city = cities[idx % cities.length]
      const chain = PRICING_SUMMARY_CHAINS[idx % PRICING_SUMMARY_CHAINS.length]
      const location = PRICING_SUMMARY_LOCATIONS[idx % PRICING_SUMMARY_LOCATIONS.length]
      const retailPrice = Math.round((3.5 + Math.random() * 1.8) * 1000) / 1000
      const discount = Math.round((0.02 + Math.random() * 0.15) * 1000) / 1000
      const yourPrice = Math.round((retailPrice - discount) * 1000) / 1000
      rows.push({
        date,
        chain,
        location,
        city,
        state,
        retailPrice,
        yourPrice,
        discount,
      })
      idx++
    }
  }
  return rows
}

export const pricingSummaryRows = buildPricingSummaryRows()
