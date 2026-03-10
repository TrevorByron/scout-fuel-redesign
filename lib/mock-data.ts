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
  "Thomas Harris",
  "Nancy Martin",
  "Daniel Thompson",
  "Betty Garcia",
  "Matthew Martinez",
  "Margaret Robinson",
  "Anthony Clark",
  "Dorothy Lewis",
  "Mark Lee",
  "Sandra Walker",
  "Donald Hall",
  "Ashley Allen",
  "Paul Young",
  "Kimberly King",
  "Steven Wright",
  "Donna Scott",
  "Edward Green",
  "Carol Adams",
  "Brian Baker",
  "Michelle Nelson",
  "George Carter",
  "Emily Mitchell",
  "Kenneth Perez",
  "Helen Roberts",
  "Joshua Turner",
  "Deborah Phillips",
  "Kevin Campbell",
  "Laura Parker",
  "Jason Evans",
]

const LOCATIONS = [
  "Phoenix, AZ",
  "Albuquerque, NM",
  "Dallas, TX",
  "Denver, CO",
  "Oklahoma City, OK",
  "Amarillo, TX",
  "El Paso, TX",
  "Tucson, AZ",
  "Las Vegas, NV",
  "Salt Lake City, UT",
  "Kansas City, MO",
  "St. Louis, MO",
  "Chicago, IL",
  "Indianapolis, IN",
  "Nashville, TN",
]

const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Phoenix, AZ": { lat: 33.4484, lng: -112.074 },
  "Albuquerque, NM": { lat: 35.0844, lng: -106.6504 },
  "Dallas, TX": { lat: 32.7767, lng: -96.797 },
  "Denver, CO": { lat: 39.7392, lng: -104.9903 },
  "Oklahoma City, OK": { lat: 35.4676, lng: -97.5164 },
  "Amarillo, TX": { lat: 35.222, lng: -101.8313 },
  "El Paso, TX": { lat: 31.7619, lng: -106.485 },
  "Tucson, AZ": { lat: 32.2226, lng: -110.9747 },
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
  "Salt Lake City, UT": { lat: 40.7608, lng: -111.891 },
  "Kansas City, MO": { lat: 39.0997, lng: -94.5786 },
  "St. Louis, MO": { lat: 38.627, lng: -90.1994 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581 },
  "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
}

const LOCATION_COORDS_LIST = LOCATIONS.map((name) => LOCATION_COORDINATES[name]!)

export const trucks: Truck[] = Array.from({ length: 45 }, (_, i) => {
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

const FUEL_TYPE_SEQUENCE: FuelType[] = [
  "Diesel", "Diesel", "Diesel", "Diesel", "Diesel",
  "Diesel", "Diesel", "Reefer", "Reefer", "DEF",
]

export const fuelTransactions: FuelTransaction[] = Array.from({ length: 110 }, (_, i) => {
  const location = LOCATIONS[i % LOCATIONS.length]
  const coords = LOCATION_COORDINATES[location] ?? { lat: 35 + (i % 10) * 0.5, lng: -100 - (i % 10) * 0.5 }
  const fuelType = FUEL_TYPE_SEQUENCE[i % 10]
  const gallons = Math.round((80 + Math.random() * 120) * 10) / 10
  const pricePerGallon = Math.round((320 + Math.random() * 130) / 100) / 100
  const totalCost = Math.round(gallons * pricePerGallon * 100) / 100
  // Saved amount reflects fleet card discount vs retail: Diesel ~6%, Reefer ~8%, DEF ~3%
  const discountPct =
    fuelType === "Diesel" ? 0.04 + (i % 5) * 0.008
    : fuelType === "Reefer" ? 0.05 + (i % 5) * 0.01
    : 0.02 + (i % 4) * 0.005
  const savedAmount = Math.round(totalCost * discountPct * 100) / 100
  const optimalPrice = pricePerGallon * 0.97
  const variance = Math.round((optimalPrice - pricePerGallon) * gallons * 100) / 100
  const alert = variance < -15
  // Spread transactions over the last 3 months (0 to 90 days ago) for chart/filtering
  const anchor = new Date(2026, 2, 6) // March 6, 2026 — match TODAY_DATE in spending chart
  const daysAgo = i === 0 ? 0 : Math.floor((i / 109) * 90)
  const date = new Date(anchor)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(6 + (i % 14), (i % 4) * 15, 0, 0)

  // Guarantee many "needs attention" examples: out-of-network purchases with a recommended in-network option
  const stationBrand = STATION_BRANDS[i % STATION_BRANDS.length]
  const inNetwork = (IN_NETWORK_BRANDS as readonly string[]).includes(stationBrand)
  const hasBetterOption = i < 45 && !inNetwork
  const betterOptionStation = IN_NETWORK_BRANDS[i % IN_NETWORK_BRANDS.length]
  const differentStation = betterOptionStation !== stationBrand
  // Deterministic savings > $1 so "needs attention" is always shown for these
  const potentialSavings = hasBetterOption && differentStation ? 5 + (i % 25) : 0
  const discount = 0.05 + (i % 4) * 0.008
  const betterPrice = hasBetterOption
    ? Math.round((pricePerGallon * (1 - discount)) * 100) / 100
    : pricePerGallon
  const distanceMiles = hasBetterOption ? 2 + (i % 12) : 0
  const betterLat = coords.lat + (i % 3) * 0.08 - 0.08
  const betterLng = coords.lng + (i % 2) * 0.1 - 0.05

  const txn: FuelTransaction = {
    id: `txn-${i + 1}`,
    dateTime: date.toISOString(),
    driverName: DRIVER_NAMES[i % 45],
    truckId: `T${String((i % 45) + 1).padStart(3, "0")}`,
    location,
    stationBrand,
    fuelType,
    gallons,
    pricePerGallon,
    totalCost,
    savedAmount,
    variance,
    alert,
    lat: coords.lat,
    lng: coords.lng,
    inNetwork,
  }
  if (hasBetterOption && differentStation && potentialSavings > 0) {
    txn.betterOption = {
      stationName: betterOptionStation,
      location: `${location} (nearby)`,
      lat: betterLat,
      lng: betterLng,
      pricePerGallon: betterPrice,
      distanceMiles,
      potentialSavings,
    }
  }
  return txn
}).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())

/** Transactions in the current trip window for T001, T002, T003 at seed trip stop locations. Merge with fuelTransactions on Trips page so "matching refuels" show. */
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
