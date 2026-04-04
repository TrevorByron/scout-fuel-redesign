import type { PricingSummaryRow } from "@/lib/mock-data"
import type { LngLat } from "@/lib/trips"

export type RoutePricingStop = {
  id: string
  lat: number
  lng: number
  yourPrice: number
  /** Short label for map / a11y */
  label: string
  isSynthetic: boolean
  /** Bold title in station list */
  stationName?: string
  /** Secondary line: street / city */
  addressLine?: string
  /** Miles from route start along path (approx.) */
  milesFromRouteStart?: number
  /** Miles from area-search center (when using buildAreaPricingStops) */
  milesFromSearchCenter?: number
  /** Brand / chain for initials logo */
  chain?: string
  /** Retail for savings badge; defaults derived in UI if missing */
  retailPrice?: number
}

const EARTH_RADIUS_M = 6_371_000

/** ~45 km between synthetic sample points along the polyline */
const SYNTHETIC_STEP_METERS = 45_000

/** Mock rows within this distance of the route polyline are merged in */
const MOCK_NEAR_ROUTE_METERS = 20 * 1609.344

/**
 * OSRM returns full-resolution polylines (often thousands of vertices). Proximity checks
 * are O(rows × segments); cap vertices used only for distance math (display still uses full geometry).
 */
const ROUTE_QUERY_MAX_VERTICES = 400

/** Drop duplicate pins within this radius (keep lower price) */
const DEDUPE_METERS = 400

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r1 = (lat1 * Math.PI) / 180
  const r2 = (lat2 * Math.PI) / 180
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(r1) * Math.cos(r2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Distance from geographic point to segment ab (WGS84 approximate for short segments) */
function distancePointToSegmentMeters(
  lat: number,
  lng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  // Project to meters locally around midpoint for stability
  const midLat = (aLat + bLat) / 2
  const cosLat = Math.cos((midLat * Math.PI) / 180)
  const ax = aLng * cosLat * Math.PI * EARTH_RADIUS_M / 180
  const ay = aLat * Math.PI * EARTH_RADIUS_M / 180
  const bx = bLng * cosLat * Math.PI * EARTH_RADIUS_M / 180
  const by = bLat * Math.PI * EARTH_RADIUS_M / 180
  const px = lng * cosLat * Math.PI * EARTH_RADIUS_M / 180
  const py = lat * Math.PI * EARTH_RADIUS_M / 180

  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-6) return haversineMeters(lat, lng, aLat, aLng)

  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  const cLng = cx / ((cosLat * Math.PI * EARTH_RADIUS_M) / 180 || 1)
  const cLat = cy / ((Math.PI * EARTH_RADIUS_M) / 180)
  return haversineMeters(lat, lng, cLat, cLng)
}

export function distancePointToPolylineMeters(
  lat: number,
  lng: number,
  polyline: LngLat[]
): number {
  if (polyline.length < 2) return Infinity
  let min = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const [lngA, latA] = polyline[i]
    const [lngB, latB] = polyline[i + 1]
    const d = distancePointToSegmentMeters(lat, lng, latA, lngA, latB, lngB)
    if (d < min) min = d
  }
  return min
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic price in a plausible retail band */
function syntheticYourPrice(seed: string): number {
  const h = hashSeed(seed)
  const frac = (h % 10_000) / 10_000
  const price = 3.25 + frac * 1.85
  return Math.round(price * 1000) / 1000
}

const SYNTHETIC_CHAINS = [
  "TA/Petro",
  "Pilot",
  "Love's",
  "Shell",
  "QT",
  "Maverik",
  "7 Fleet",
] as const

const SYNTHETIC_STREETS = [
  "N. Motel Blvd",
  "Interstate Frontage Rd",
  "County Rd 412",
  "Main St",
  "US-54 E",
  "Circle Dr",
] as const

const SYNTHETIC_CITIES = [
  "Las Cruces",
  "Amarillo",
  "Tucumcari",
  "Shreveport",
  "Jackson",
  "Birmingham",
] as const

function syntheticRetailPrice(seed: string, yourPrice: number): number {
  const bump = (5 + (hashSeed(`${seed}|ret`) % 28)) / 100
  return Math.round((yourPrice + bump) * 1000) / 1000
}

function projectTOnSegment(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
  lat: number,
  lng: number
): number {
  const midLat = (latA + latB) / 2
  const cosLat = Math.cos((midLat * Math.PI) / 180)
  const ax = lngA * cosLat
  const ay = latA
  const bx = lngB * cosLat
  const by = latB
  const px = lng * cosLat
  const py = lat
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-12) return 0
  return Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
}

/** Arc length from first polyline point to closest point on path to (lat,lng). */
export function metersFromPolylineStartToNearestPoint(
  polyline: LngLat[],
  lat: number,
  lng: number
): number {
  if (polyline.length < 2) return 0
  let bestDist = Infinity
  let bestMetersFromStart = 0
  let cum = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    const [lngA, latA] = polyline[i]
    const [lngB, latB] = polyline[i + 1]
    const segLen = Math.max(haversineMeters(latA, lngA, latB, lngB), 1e-6)
    const t = projectTOnSegment(latA, lngA, latB, lngB, lat, lng)
    const plat = latA + (latB - latA) * t
    const plng = lngA + (lngB - lngA) * t
    const d = haversineMeters(lat, lng, plat, plng)
    if (d < bestDist) {
      bestDist = d
      bestMetersFromStart = cum + t * segLen
    }
    cum += segLen
  }
  return bestMetersFromStart
}

/**
 * Walk polyline by arc length; emit one synthetic stop every SYNTHETIC_STEP_METERS.
 */
function sampleSyntheticAlongPolyline(
  polyline: LngLat[],
  routeKey: string
): RoutePricingStop[] {
  if (polyline.length < 2) return []

  const stops: RoutePricingStop[] = []
  let cum = 0
  let nextEmitAt = SYNTHETIC_STEP_METERS
  let synthIndex = 0

  for (let i = 0; i < polyline.length - 1; i++) {
    const [lngA, latA] = polyline[i]
    const [lngB, latB] = polyline[i + 1]
    const segLen = Math.max(haversineMeters(latA, lngA, latB, lngB), 1)

    while (nextEmitAt <= cum + segLen + 1e-6) {
      const d = nextEmitAt - cum
      const t = d / segLen
      const lat = latA + (latB - latA) * t
      const lng = lngA + (lngB - lngA) * t
      const seed = `${routeKey}|syn|${synthIndex}|${i}`
      const yourPrice = syntheticYourPrice(seed)
      const chain = SYNTHETIC_CHAINS[hashSeed(seed) % SYNTHETIC_CHAINS.length]
      const city = SYNTHETIC_CITIES[hashSeed(`${seed}|city`) % SYNTHETIC_CITIES.length]
      const street = SYNTHETIC_STREETS[hashSeed(`${seed}|st`) % SYNTHETIC_STREETS.length]
      const streetNum = 200 + (hashSeed(`${seed}|num`) % 800)
      const milesFromRouteStart = (cum + d) / 1609.344
      const retailPrice = syntheticRetailPrice(seed, yourPrice)
      const brandShort = chain.split("/")[0]?.trim() ?? chain
      stops.push({
        id: `syn-${routeKey}-${synthIndex}`,
        lat,
        lng,
        yourPrice,
        label: `${chain} · ${city}`,
        isSynthetic: true,
        stationName: `${brandShort} ${city}`,
        addressLine: `${streetNum} ${street}`,
        milesFromRouteStart,
        chain,
        retailPrice,
      })
      synthIndex += 1
      nextEmitAt += SYNTHETIC_STEP_METERS
    }
    cum += segLen
  }

  return stops
}

/** Uniform index sampling; keeps endpoints. Safe for “near route” checks at ~20+ mi. */
function decimatePolylineUniform(polyline: LngLat[], maxPoints: number): LngLat[] {
  if (polyline.length <= maxPoints) return polyline
  if (maxPoints < 2) return polyline.slice(0, Math.min(2, polyline.length))
  const n = polyline.length
  const out: LngLat[] = []
  const span = maxPoints - 1
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / span) * (n - 1))
    out.push(polyline[idx]!)
  }
  const deduped: LngLat[] = [out[0]!]
  for (let i = 1; i < out.length; i++) {
    const cur = out[i]!
    const prev = deduped[deduped.length - 1]!
    if (cur[0] !== prev[0] || cur[1] !== prev[1]) deduped.push(cur)
  }
  return deduped.length >= 2 ? deduped : polyline.slice(0, 2)
}

type LatLngBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number }

/** Axis-aligned bounds of all vertices, expanded by `padMeters` (cheap prefilter before polyline distance). */
function polylineVertexBoundsPadded(polyline: LngLat[], padMeters: number): LatLngBounds | null {
  if (polyline.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const c of polyline) {
    const [lng, lat] = c
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  const midLat = (minLat + maxLat) / 2
  const cosLat = Math.cos((midLat * Math.PI) / 180)
  const padLat = padMeters / 111_320
  const padLng = padMeters / (111_320 * Math.max(0.2, cosLat))
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  }
}

function pointInBounds(lat: number, lng: number, b: LatLngBounds): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng
}

function mergeNearbyStops(stops: RoutePricingStop[]): RoutePricingStop[] {
  const sorted = [...stops].sort((a, b) => a.yourPrice - b.yourPrice)
  const kept: RoutePricingStop[] = []
  for (const s of sorted) {
    const clash = kept.some(
      (k) => haversineMeters(s.lat, s.lng, k.lat, k.lng) < DEDUPE_METERS
    )
    if (!clash) kept.push(s)
  }
  return kept
}

export type BuildRouteStopsOptions = {
  polyline: LngLat[]
  /** Distinguish synthetic seeds when switching routes */
  routeKey: string
  mockRows: PricingSummaryRow[]
  /** If set, only include mock rows matching this ISO date (yyyy-mm-dd) */
  dateFilter?: string | null
}

/**
 * Synthetic stops along the polyline + mock pricing rows near the route, deduped by proximity (cheapest kept).
 */
export function buildRoutePricingStops(options: BuildRouteStopsOptions): RoutePricingStop[] {
  const { polyline, routeKey, mockRows, dateFilter } = options
  if (polyline.length < 2) return []

  const synthetic = sampleSyntheticAlongPolyline(polyline, routeKey)

  const queryPolyline =
    polyline.length > ROUTE_QUERY_MAX_VERTICES
      ? decimatePolylineUniform(polyline, ROUTE_QUERY_MAX_VERTICES)
      : polyline

  const nearBounds = polylineVertexBoundsPadded(polyline, MOCK_NEAR_ROUTE_METERS)

  const mockNear = mockRows
    .filter((row) => (dateFilter ? row.date === dateFilter : true))
    .filter((row) => {
      if (nearBounds && !pointInBounds(row.lat, row.lng, nearBounds)) return false
      return (
        distancePointToPolylineMeters(row.lat, row.lng, queryPolyline) <= MOCK_NEAR_ROUTE_METERS
      )
    })
    .map((row, i) => {
      const label = `${row.chain} · ${row.location}`
      const milesFromRouteStart =
        metersFromPolylineStartToNearestPoint(queryPolyline, row.lat, row.lng) / 1609.344
      return {
        id: `mock-${row.date}-${row.city}-${row.state}-${i}`,
        lat: row.lat,
        lng: row.lng,
        yourPrice: row.yourPrice,
        label,
        isSynthetic: false,
        stationName: `${row.chain} ${row.city}`,
        addressLine: `${row.location} · ${row.city}, ${row.state}`,
        milesFromRouteStart,
        chain: row.chain,
        retailPrice: row.retailPrice,
      } satisfies RoutePricingStop
    })

  return mergeNearbyStops([...synthetic, ...mockNear])
}

export type BuildAreaStopsOptions = {
  center: LngLat
  radiusMeters: number
  mockRows: PricingSummaryRow[]
  /** Distinguish synthetic seeds when center/radius changes */
  searchKey: string
  /** If set, only include mock rows matching this ISO date (yyyy-mm-dd) */
  dateFilter?: string | null
}

/**
 * Grid sample inside a geodesic disk + mock rows within radius, deduped by proximity (cheapest kept).
 */
function sampleSyntheticInDisk(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  searchKey: string
): RoutePricingStop[] {
  const mPerDegLat = 111_320
  const cosLat = Math.cos((centerLat * Math.PI) / 180)
  const mPerDegLng = 111_320 * Math.max(0.2, cosLat)
  const gridStep = Math.min(SYNTHETIC_STEP_METERS, Math.max(2_500, radiusMeters / 4))
  const n = Math.ceil(radiusMeters / gridStep) + 1
  const stops: RoutePricingStop[] = []
  let synthIndex = 0

  for (let di = -n; di <= n; di++) {
    for (let dj = -n; dj <= n; dj++) {
      const lat = centerLat + (di * gridStep) / mPerDegLat
      const lng = centerLng + (dj * gridStep) / mPerDegLng
      const dM = haversineMeters(centerLat, centerLng, lat, lng)
      if (dM > radiusMeters) continue

      const seed = `${searchKey}|disk|${di}|${dj}`
      const yourPrice = syntheticYourPrice(seed)
      const chain = SYNTHETIC_CHAINS[hashSeed(seed) % SYNTHETIC_CHAINS.length]
      const city = SYNTHETIC_CITIES[hashSeed(`${seed}|city`) % SYNTHETIC_CITIES.length]
      const street = SYNTHETIC_STREETS[hashSeed(`${seed}|st`) % SYNTHETIC_STREETS.length]
      const streetNum = 200 + (hashSeed(`${seed}|num`) % 800)
      const milesFromSearchCenter = dM / 1609.344
      const retailPrice = syntheticRetailPrice(seed, yourPrice)
      const brandShort = chain.split("/")[0]?.trim() ?? chain
      stops.push({
        id: `syn-area-${searchKey}-${synthIndex}`,
        lat,
        lng,
        yourPrice,
        label: `${chain} · ${city}`,
        isSynthetic: true,
        stationName: `${brandShort} ${city}`,
        addressLine: `${streetNum} ${street}`,
        milesFromSearchCenter,
        chain,
        retailPrice,
      })
      synthIndex += 1
    }
  }

  return stops
}

export function buildAreaPricingStops(options: BuildAreaStopsOptions): RoutePricingStop[] {
  const { center, radiusMeters, mockRows, dateFilter, searchKey } = options
  const [centerLng, centerLat] = center

  const synthetic = sampleSyntheticInDisk(centerLat, centerLng, radiusMeters, searchKey)

  const mockNear = mockRows
    .filter((row) => (dateFilter ? row.date === dateFilter : true))
    .filter(
      (row) => haversineMeters(centerLat, centerLng, row.lat, row.lng) <= radiusMeters
    )
    .map((row, i) => {
      const dM = haversineMeters(centerLat, centerLng, row.lat, row.lng)
      const milesFromSearchCenter = dM / 1609.344
      const label = `${row.chain} · ${row.location}`
      return {
        id: `mock-area-${row.date}-${row.city}-${row.state}-${i}`,
        lat: row.lat,
        lng: row.lng,
        yourPrice: row.yourPrice,
        label,
        isSynthetic: false,
        stationName: `${row.chain} ${row.city}`,
        addressLine: `${row.location} · ${row.city}, ${row.state}`,
        milesFromSearchCenter,
        chain: row.chain,
        retailPrice: row.retailPrice,
      } satisfies RoutePricingStop
    })

  return mergeNearbyStops([...synthetic, ...mockNear])
}

/** Cheapest first, then closer to search center */
export function sortAreaStopsForDisplay(stops: RoutePricingStop[]): RoutePricingStop[] {
  return [...stops].sort((a, b) => {
    const p = a.yourPrice - b.yourPrice
    if (p !== 0) return p
    const da = a.milesFromSearchCenter ?? 0
    const db = b.milesFromSearchCenter ?? 0
    return da - db
  })
}

export function lowestPrice(stops: RoutePricingStop[]): number | null {
  if (stops.length === 0) return null
  return Math.min(...stops.map((s) => s.yourPrice))
}
