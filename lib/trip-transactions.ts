import type { TripPlan } from "@/lib/trips"
import {
  distanceMiles,
  isTripCompleted,
  minDistanceMilesToRoutePolyline,
  transactionNearTripCorridor,
  TRIP_CORRIDOR_MAX_MILES,
} from "@/lib/trips"
import {
  getFuelTransactions,
  type BetterOption,
  type FuelTransaction,
  type FuelType,
} from "@/lib/mock-data"

const SEED_TRIP_PREFIX = "seed-trip-"

export function isSeedTripId(tripId: string): boolean {
  return tripId.startsWith(SEED_TRIP_PREFIX)
}

function driverNameForTrip(trip: TripPlan): string {
  return (
    trip.driverName ??
    (trip.truckId === "T001"
      ? "Mike Johnson"
      : trip.truckId === "T002"
        ? "Sarah Williams"
        : trip.truckId === "T003"
          ? "James Davis"
          : "Driver")
  )
}

/** Deterministic “missed savings” leg index for non-seed completed trips. */
function badStopIndexForCompletedTrip(trip: TripPlan): number {
  if (trip.stops.length <= 1) return 0
  let h = 2166136261
  for (let i = 0; i < trip.id.length; i++) {
    h ^= trip.id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % trip.stops.length
}

/**
 * Nudge actual purchase slightly toward the saved route polyline so prototype refuels stay on
 * the drawn corridor (avoids “random city” dots when stop labels and polyline diverge).
 */
function nudgeTowardRoutePolyline(
  lat: number,
  lng: number,
  route: [number, number][]
): { lat: number; lng: number } {
  if (route.length < 2) {
    return { lat: lat + 0.02, lng: lng - 0.03 }
  }
  let bestLat = lat
  let bestLng = lng
  let bestD = Infinity
  for (let i = 0; i < route.length - 1; i++) {
    const [lng1, lat1] = route[i]
    const [lng2, lat2] = route[i + 1]
    const dx = lng2 - lng1
    const dy = lat2 - lat1
    const lenSq = dx * dx + dy * dy
    if (lenSq < 1e-18) continue
    let t = ((lng - lng1) * dx + (lat - lat1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const plat = lat1 + t * dy
    const plng = lng1 + t * dx
    const d = distanceMiles(lat, lng, plat, plng)
    if (d < bestD) {
      bestD = d
      bestLat = plat
      bestLng = plng
    }
  }
  const towardLat = bestLat + (lat - bestLat) * 0.35
  const towardLng = bestLng + (lng - bestLng) * 0.35
  const onRoute = minDistanceMilesToRoutePolyline(towardLat, towardLng, route) <= 18
  return onRoute ? { lat: towardLat, lng: towardLng } : { lat: lat + 0.015, lng: lng - 0.02 }
}

/** One transaction per planned fuel stop; dates spread inside the trip window. */
function buildPrototypeStopRefuels(
  trip: TripPlan,
  badStopIndex: number,
  idPrefix: "seed" | "done"
): FuelTransaction[] {
  if (trip.stops.length === 0) return []

  const startMs = new Date(trip.tripStart).getTime()
  const endMs = new Date(trip.tripEnd).getTime()
  const span = Math.max(endMs - startMs, 86_400_000)
  const driverName = driverNameForTrip(trip)
  const route = trip.routeCoordinates

  return trip.stops.map((stop, i) => {
    const frac = (i + 1) / (trip.stops.length + 1)
    const dateTime = new Date(startMs + span * frac).toISOString()
    const gallons = stop.refuelGallons
    const isBad = i === badStopIndex

    let lat = stop.lat
    let lng = stop.lng
    let stationBrand = stop.station
    let location = stop.location
    let pricePerGallon = stop.pricePerGallon
    let inNetwork = true
    let betterOption: BetterOption | undefined

    if (isBad) {
      stationBrand = "Shell"
      lat = stop.lat + 0.04
      lng = stop.lng - 0.06
      const nudged = nudgeTowardRoutePolyline(lat, lng, route)
      lat = nudged.lat
      lng = nudged.lng
      pricePerGallon = Math.round((stop.pricePerGallon + 0.28) * 100) / 100
      inNetwork = false
      const optPrice = Math.round((stop.pricePerGallon - 0.12) * 100) / 100
      const optLat = stop.lat
      const optLng = stop.lng
      const distMi = Math.round(distanceMiles(lat, lng, optLat, optLng) * 10) / 10
      const potentialSavings = Math.round(gallons * (pricePerGallon - optPrice) * 100) / 100
      betterOption = {
        stationName: stop.station,
        location: stop.location,
        lat: optLat,
        lng: optLng,
        pricePerGallon: optPrice,
        distanceMiles: distMi,
        potentialSavings: Math.max(0, potentialSavings),
      }
    }

    const totalCost = Math.round(gallons * pricePerGallon * 100) / 100
    const pumpFeePerGallon = Math.round((35 + (i * 7) % 45) * 100) / 100000

    const row: FuelTransaction = {
      id: `txn-${idPrefix}-${trip.id}-${i + 1}`,
      dateTime,
      driverName,
      truckId: trip.truckId,
      location,
      stationBrand,
      fuelType: "Diesel" as FuelType,
      gallons,
      pricePerGallon,
      pumpFeePerGallon,
      totalCost,
      savedAmount: Math.round(totalCost * 0.04 * 100) / 100,
      variance: isBad ? -12 : 0,
      alert: isBad,
      lat,
      lng,
      inNetwork,
      betterOption,
    }
    return row
  })
}

function buildSeedTransactionsForTrip(trip: TripPlan): FuelTransaction[] {
  const badStopIndexByTripId: Record<string, number> = {
    "seed-trip-1": 2,
    "seed-trip-2": 1,
    "seed-trip-3": 2,
  }
  const badStopIndex = badStopIndexByTripId[trip.id] ?? Math.max(0, trip.stops.length - 1)
  return buildPrototypeStopRefuels(trip, badStopIndex, "seed")
}

/** Prototype refuels for any completed user trip: one actual fill per planned stop on corridor. */
function buildCompletedTripSyntheticTransactions(trip: TripPlan): FuelTransaction[] {
  return buildPrototypeStopRefuels(trip, badStopIndexForCompletedTrip(trip), "done")
}

/**
 * Transactions scoped for trip progress: seed trips use exactly one refuel per planned
 * stop; **completed** non-seed trips use the same prototype so the Trips UI always has
 * actuals to compare; in-progress/upcoming trips use corridor-filtered fleet data.
 */
export function getTransactionsForTripPlan(trip: TripPlan): FuelTransaction[] {
  if (isSeedTripId(trip.id)) {
    return buildSeedTransactionsForTrip(trip)
  }

  if (isTripCompleted(trip)) {
    return buildCompletedTripSyntheticTransactions(trip)
  }

  const all = getFuelTransactions()
  const start = new Date(trip.tripStart).getTime()
  const end = new Date(trip.tripEnd).getTime()

  return all.filter((t) => {
    const tTime = new Date(t.dateTime).getTime()
    if (t.truckId !== trip.truckId || tTime < start || tTime > end) return false
    return transactionNearTripCorridor(t.lat, t.lng, trip, TRIP_CORRIDOR_MAX_MILES)
  })
}
