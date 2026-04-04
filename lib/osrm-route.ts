/**
 * OSRM public routing API (same host as Route Optimizer).
 * https://project-osrm.org/docs/v5.24.0/api/#route-service
 *
 * Use `overview=simplified` by default: full geometry is huge over the wire and on the
 * public demo server; simplified keeps map fidelity while cutting latency and JSON parse cost.
 */

import type { LngLat } from "@/lib/trips"

export const OSRM_PUBLIC_ROUTING_BASE = "https://router.project-osrm.org"

export type OsrmDrivingRouteUrlOptions = {
  /** Default false; alternatives roughly multiply server work on crowded public OSRM. */
  alternatives?: boolean
  /** `simplified` is the default and is much faster than `full` for long routes. */
  overview?: "full" | "simplified"
}

export type OsrmRouteOption = {
  /** GeoJSON coordinates [lng, lat][] */
  coordinates: LngLat[]
  /** seconds */
  duration: number
  /** meters */
  distance: number
}

export type OsrmRouteResponse = {
  routes: OsrmRouteOption[]
}

export function buildOsrmDrivingRouteUrl(
  origin: LngLat,
  dest: LngLat,
  options?: OsrmDrivingRouteUrlOptions
): string {
  const alternatives = options?.alternatives ?? false
  const overview = options?.overview ?? "simplified"
  const params = new URLSearchParams({
    overview,
    geometries: "geojson",
  })
  if (alternatives) {
    params.set("alternatives", "true")
  }
  return `${OSRM_PUBLIC_ROUTING_BASE}/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?${params}`
}

function parseOsrmJson(data: unknown): OsrmRouteOption[] {
  if (!data || typeof data !== "object") return []
  const routes = (data as { routes?: unknown }).routes
  if (!Array.isArray(routes)) return []

  const out: OsrmRouteOption[] = []
  for (const r of routes) {
    if (!r || typeof r !== "object") continue
    const geom = (r as { geometry?: { coordinates?: unknown } }).geometry
    const coords = geom?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) continue
    const lngLats: LngLat[] = []
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) continue
      const lng = Number(c[0])
      const lat = Number(c[1])
      if (Number.isFinite(lng) && Number.isFinite(lat)) lngLats.push([lng, lat])
    }
    if (lngLats.length < 2) continue
    const duration = Number((r as { duration?: unknown }).duration)
    const distance = Number((r as { distance?: unknown }).distance)
    out.push({
      coordinates: lngLats,
      duration: Number.isFinite(duration) ? duration : 0,
      distance: Number.isFinite(distance) ? distance : 0,
    })
  }
  return out
}

export type FetchOsrmDrivingRoutesOptions = OsrmDrivingRouteUrlOptions & {
  signal?: AbortSignal
}

/**
 * Fetch driving routes between two points. Prefer `alternatives: false` on the public demo
 * unless you truly need multiple geometries (each alternative is extra server work).
 */
function buildOsrmClientProxyUrl(
  origin: LngLat,
  dest: LngLat,
  options?: OsrmDrivingRouteUrlOptions
): string {
  const alternatives = options?.alternatives ?? false
  const overview = options?.overview ?? "simplified"
  const qs = new URLSearchParams({
    originLng: String(origin[0]),
    originLat: String(origin[1]),
    destLng: String(dest[0]),
    destLat: String(dest[1]),
    alternatives: String(alternatives),
    overview,
  })
  return `/api/osrm?${qs}`
}

/**
 * In the browser, route through `/api/osrm` so requests are same-origin (fewer blocks
 * than calling the public OSRM host directly). On the server, call OSRM directly.
 */
export async function fetchOsrmDrivingRoutes(
  origin: LngLat,
  dest: LngLat,
  options?: FetchOsrmDrivingRoutesOptions
): Promise<OsrmRouteOption[]> {
  const url =
    typeof window !== "undefined"
      ? buildOsrmClientProxyUrl(origin, dest, {
          alternatives: options?.alternatives ?? false,
          overview: options?.overview ?? "simplified",
        })
      : buildOsrmDrivingRouteUrl(origin, dest, {
          alternatives: options?.alternatives ?? false,
          overview: options?.overview ?? "simplified",
        })
  const res = await fetch(url, { signal: options?.signal })
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[fetchOsrmDrivingRoutes] non-OK response",
        res.status,
        res.statusText
      )
    }
    return []
  }
  const data: unknown = await res.json()
  return parseOsrmJson(data)
}
