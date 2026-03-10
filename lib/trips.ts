// Trip plan types and client-side persistence for Route Optimizer / Trips

export type LngLat = [number, number]

export interface TripPlanStop {
  station: string
  location: string
  pricePerGallon: number
  refuelGallons: number
  distanceFromPrev: number
  eta: string
  fuelPct: number
  lat: number
  lng: number
}

export interface TripPlanSummary {
  totalCost: number
  savingsVsAlternate: number
}

export interface TripPlan {
  id: string
  name?: string
  origin: string
  destination: string
  waypoints: string[]
  tripStart: string // ISO date
  tripEnd: string // ISO date
  truckId: string
  stops: TripPlanStop[]
  summary: TripPlanSummary
  routeCoordinates: LngLat[]
  createdAt: string // ISO
}

const STORAGE_KEY = "scout-fuel-trip-plans"
export { STORAGE_KEY as TRIPS_STORAGE_KEY }

export function loadFromStorage(key: string = STORAGE_KEY): TripPlan[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TripPlan[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Returns 3 in-progress trip plans for initial Trips page. Stops use coordinates that align with seed fuel transactions. */
export function getSeedTripPlans(): TripPlan[] {
  const now = new Date()
  const tripStart = new Date(now)
  tripStart.setDate(tripStart.getDate() - 5)
  const tripEnd = new Date(now)
  tripEnd.setDate(tripEnd.getDate() + 5)
  const startStr = tripStart.toISOString()
  const endStr = tripEnd.toISOString()
  const createdAt = new Date().toISOString()
  const seedIds = ["seed-trip-1", "seed-trip-2", "seed-trip-3"]

  return [
    {
      id: seedIds[0],
      name: "Phoenix → Dallas",
      origin: "Phoenix, AZ",
      destination: "Dallas, TX",
      waypoints: [],
      tripStart: startStr,
      tripEnd: endStr,
      truckId: "T001",
      stops: [
        { station: "Pilot Flying J", location: "Phoenix, AZ", pricePerGallon: 3.72, refuelGallons: 120, distanceFromPrev: 0, eta: "08:00", fuelPct: 85, lat: 33.4484, lng: -112.074 },
        { station: "Love's", location: "Albuquerque, NM", pricePerGallon: 3.68, refuelGallons: 95, distanceFromPrev: 465, eta: "14:30", fuelPct: 78, lat: 35.0844, lng: -106.6504 },
        { station: "TA/Petro", location: "Dallas, TX", pricePerGallon: 3.85, refuelGallons: 110, distanceFromPrev: 640, eta: "22:00", fuelPct: 82, lat: 32.7767, lng: -96.797 },
      ],
      summary: { totalCost: 1240, savingsVsAlternate: 156 },
      routeCoordinates: [[-112.074, 33.4484], [-106.6504, 35.0844], [-96.797, 32.7767]],
      createdAt,
    },
    {
      id: seedIds[1],
      name: "Denver → Amarillo",
      origin: "Denver, CO",
      destination: "Amarillo, TX",
      waypoints: [],
      tripStart: startStr,
      tripEnd: endStr,
      truckId: "T002",
      stops: [
        { station: "Pilot Flying J", location: "Denver, CO", pricePerGallon: 3.78, refuelGallons: 115, distanceFromPrev: 0, eta: "07:00", fuelPct: 88, lat: 39.7392, lng: -104.9903 },
        { station: "Love's", location: "Oklahoma City, OK", pricePerGallon: 3.65, refuelGallons: 98, distanceFromPrev: 540, eta: "16:00", fuelPct: 75, lat: 35.4676, lng: -97.5164 },
        { station: "TA/Petro", location: "Amarillo, TX", pricePerGallon: 3.71, refuelGallons: 105, distanceFromPrev: 260, eta: "21:30", fuelPct: 80, lat: 35.222, lng: -101.8313 },
      ],
      summary: { totalCost: 1180, savingsVsAlternate: 142 },
      routeCoordinates: [[-104.9903, 39.7392], [-97.5164, 35.4676], [-101.8313, 35.222]],
      createdAt,
    },
    {
      id: seedIds[2],
      name: "El Paso → Las Vegas",
      origin: "El Paso, TX",
      destination: "Las Vegas, NV",
      waypoints: [],
      tripStart: startStr,
      tripEnd: endStr,
      truckId: "T003",
      stops: [
        { station: "Pilot Flying J", location: "El Paso, TX", pricePerGallon: 3.69, refuelGallons: 118, distanceFromPrev: 0, eta: "06:30", fuelPct: 86, lat: 31.7619, lng: -106.485 },
        { station: "Love's", location: "Tucson, AZ", pricePerGallon: 3.74, refuelGallons: 92, distanceFromPrev: 420, eta: "13:00", fuelPct: 77, lat: 32.2226, lng: -110.9747 },
        { station: "TA/Petro", location: "Las Vegas, NV", pricePerGallon: 3.89, refuelGallons: 108, distanceFromPrev: 480, eta: "20:00", fuelPct: 81, lat: 36.1699, lng: -115.1398 },
      ],
      summary: { totalCost: 1310, savingsVsAlternate: 198 },
      routeCoordinates: [[-106.485, 31.7619], [-110.9747, 32.2226], [-115.1398, 36.1699]],
      createdAt,
    },
  ]
}

export function saveToStorage(plans: TripPlan[], key: string = STORAGE_KEY) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(plans))
  } catch {
    // ignore
  }
}

export interface TripsContextValue {
  tripPlans: TripPlan[]
  addTripPlan: (plan: Omit<TripPlan, "id" | "createdAt">) => TripPlan
  updateTripPlan: (id: string, updates: Partial<TripPlan>) => void
  removeTripPlan: (id: string) => void
  getTripPlan: (id: string) => TripPlan | undefined
}

export function createTripsStore(): TripsContextValue {
  let plans = loadFromStorage(STORAGE_KEY)

  return {
    get tripPlans() {
      return plans
    },
    addTripPlan(plan) {
      const full: TripPlan = {
        ...plan,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      plans = [...plans, full]
      saveToStorage(plans, STORAGE_KEY)
      return full
    },
    updateTripPlan(id, updates) {
      plans = plans.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )
      saveToStorage(plans, STORAGE_KEY)
    },
    removeTripPlan(id) {
      plans = plans.filter((p) => p.id !== id)
      saveToStorage(plans, STORAGE_KEY)
    },
    getTripPlan(id) {
      return plans.find((p) => p.id === id)
    },
  }
}

// In-memory store for SSR / initial load; replaced by context in client
let defaultStore: TripsContextValue | null = null

export function getDefaultTripsStore(): TripsContextValue {
  if (!defaultStore) {
    defaultStore = createTripsStore()
  }
  return defaultStore
}

const MILES_PER_DEGREE_APPROX = 69
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * MILES_PER_DEGREE_APPROX
  const dLng = (lng2 - lng1) * MILES_PER_DEGREE_APPROX * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

const STOP_MATCH_MILES = 25

export interface StopProgress {
  stopIndex: number
  stop: TripPlanStop
  status: "completed" | "off_route" | "pending"
  transaction?: { dateTime: string; stationBrand: string; location: string; gallons: number; totalCost: number }
}

export interface TripProgressResult {
  stopProgress: StopProgress[]
  followedCount: number
  totalStops: number
  offRouteTransactions: Array<{ dateTime: string; stationBrand: string; location: string }>
}

export function computeTripProgress(
  trip: TripPlan,
  transactions: Array<{ dateTime: string; truckId: string; lat: number; lng: number; stationBrand: string; location: string; gallons: number; totalCost: number; id?: string }>
): TripProgressResult {
  const start = new Date(trip.tripStart).getTime()
  const end = new Date(trip.tripEnd).getTime()
  const forTruck = transactions.filter((t) => {
    const tTime = new Date(t.dateTime).getTime()
    return t.truckId === trip.truckId && tTime >= start && tTime <= end
  })

  const usedTxnIds = new Set<string>()
  const stopProgress: StopProgress[] = trip.stops.map((stop, i) => {
    let best: (typeof forTruck)[number] | undefined
    let bestDist = STOP_MATCH_MILES + 1
    for (const t of forTruck) {
      const tid = t.id ?? t.dateTime
      if (usedTxnIds.has(tid)) continue
      const d = distanceMiles(stop.lat, stop.lng, t.lat, t.lng)
      const sameStation = t.stationBrand.toLowerCase().includes(stop.station.toLowerCase()) || stop.station.toLowerCase().includes(t.stationBrand.toLowerCase())
      if (d < bestDist || (sameStation && d < STOP_MATCH_MILES * 2)) {
        bestDist = d
        best = t
      }
    }
    if (best && bestDist <= STOP_MATCH_MILES) {
      usedTxnIds.add(best.id ?? best.dateTime)
      return {
        stopIndex: i,
        stop,
        status: "completed" as const,
        transaction: { dateTime: best.dateTime, stationBrand: best.stationBrand, location: best.location, gallons: best.gallons, totalCost: best.totalCost },
      }
    }
    return { stopIndex: i, stop, status: "pending" as const }
  })

  const followedCount = stopProgress.filter((s) => s.status === "completed").length
  const offRouteTransactions = forTruck.filter((t) => {
    const key = t.id ?? t.dateTime
    if (usedTxnIds.has(key)) return false
    const nearAny = trip.stops.some((s) => distanceMiles(s.lat, s.lng, t.lat, t.lng) <= STOP_MATCH_MILES)
    return !nearAny
  }).map((t) => ({ dateTime: t.dateTime, stationBrand: t.stationBrand, location: t.location }))

  return { stopProgress, followedCount, totalStops: trip.stops.length, offRouteTransactions }
}
