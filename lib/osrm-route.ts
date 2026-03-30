/**
 * OSRM public routing API (same host as Route Optimizer).
 * https://project-osrm.org/docs/v5.24.0/api/#route-service
 */

import type { LngLat } from "@/lib/trips"

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

function buildOsrmDrivingUrl(origin: LngLat, dest: LngLat, alternatives: boolean): string {
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
  })
  if (alternatives) {
    params.set("alternatives", "true")
  }
  return `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?${params}`
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

/**
 * Fetch driving routes between two points. With alternatives=true, OSRM may return multiple options.
 */
export async function fetchOsrmDrivingRoutes(
  origin: LngLat,
  dest: LngLat,
  options?: { alternatives?: boolean; signal?: AbortSignal }
): Promise<OsrmRouteOption[]> {
  const alternatives = options?.alternatives ?? true
  const url = buildOsrmDrivingUrl(origin, dest, alternatives)
  const res = await fetch(url, { signal: options?.signal })
  if (!res.ok) return []
  const data: unknown = await res.json()
  return parseOsrmJson(data)
}
