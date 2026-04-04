/**
 * Driving routes via OSRM, proxied through `GET /api/osrm` (same-origin; avoids CORS on public OSRM).
 * Query semantics: `overview=full`, `geometries=geojson`, `alternatives` capped (default 3).
 * Prototype only — not a production SLA.
 */

import type { LngLat } from "@/lib/trips"

export const OSRM_PUBLIC_ROUTING_BASE = "https://router.project-osrm.org"

/** FOSSGIS + demo; used only by the API route upstream loop. */
export const OSRM_UPSTREAM_BASES: readonly string[] = [
  "https://routing.openstreetmap.de/routed-car",
  OSRM_PUBLIC_ROUTING_BASE,
]

export type OsrmDrivingRouteUrlOptions = {
  alternatives?: boolean
  /** When alternatives is true, OSRM max alternative count (default 3). */
  maxAlternatives?: number
  overview?: "full" | "simplified"
  baseUrl?: string
}

/** Same shape as the OsrmRouteExample reference: geometry + duration + distance. */
export type RouteData = {
  coordinates: LngLat[]
  duration: number
  distance: number
}

/** @deprecated Use RouteData */
export type OsrmRouteOption = RouteData

export type OsrmRouteResponse = {
  routes: RouteData[]
}

export function buildOsrmDrivingRouteUrl(
  origin: LngLat,
  dest: LngLat,
  options?: OsrmDrivingRouteUrlOptions
): string {
  const alternatives = options?.alternatives ?? true
  const overview = options?.overview ?? "full"
  const base = options?.baseUrl ?? OSRM_PUBLIC_ROUTING_BASE
  const params = new URLSearchParams({
    overview,
    geometries: "geojson",
  })
  if (alternatives) {
    const n = options?.maxAlternatives ?? 3
    params.set("alternatives", String(Math.max(1, Math.min(10, n))))
  }
  return `${base}/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?${params}`
}

export function parseOsrmJson(data: unknown): RouteData[] {
  if (!data || typeof data !== "object") return []
  const code = (data as { code?: unknown }).code
  if (code !== undefined && code !== "Ok") return []
  const routes = (data as { routes?: unknown }).routes
  if (!Array.isArray(routes)) return []

  const out: RouteData[] = []
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
 * Map-ready polyline from OSRM `fetchDrivingRoutes` / `parseOsrmJson` output.
 * Picks the fastest route by duration and returns its coordinates (no endpoint filtering — OSRM
 * already snapped origin→destination for the request).
 */
export function pickDrivingRoutePolyline(routes: RouteData[]): LngLat[] | null {
  if (routes.length === 0) return null
  const sorted = [...routes].sort((a, b) => a.duration - b.duration)
  const coords = sorted[0]?.coordinates
  if (!coords || coords.length < 2) return null
  return coords
}

export type FetchDrivingRoutesOptions = {
  signal?: AbortSignal
  /** Default true (reference). */
  alternatives?: boolean
  /** Default full (reference). */
  overview?: "full" | "simplified"
}

function buildApiOsrmUrl(
  origin: LngLat,
  dest: LngLat,
  opts: { alternatives: boolean; overview: "full" | "simplified" }
): string {
  const qs = new URLSearchParams({
    originLng: String(origin[0]),
    originLat: String(origin[1]),
    destLng: String(dest[0]),
    destLat: String(dest[1]),
    alternatives: String(opts.alternatives),
    overview: opts.overview,
  })
  return `/api/osrm?${qs}`
}

async function fetchDrivingRoutesDirect(
  origin: LngLat,
  dest: LngLat,
  options?: FetchDrivingRoutesOptions
): Promise<RouteData[]> {
  if (typeof window === "undefined") return []
  if (options?.signal?.aborted) return []
  const alternatives = options?.alternatives ?? true
  const overview = options?.overview ?? "full"
  for (const baseUrl of OSRM_UPSTREAM_BASES) {
    try {
      const directUrl = buildOsrmDrivingRouteUrl(origin, dest, {
        alternatives,
        overview,
        baseUrl,
      })
      const res = await fetch(directUrl, {
        signal: options?.signal,
        cache: "no-store",
        mode: "cors",
      })
      if (!res.ok) continue
      const data: unknown = await res.json()
      const parsed = parseOsrmJson(data)
      if (parsed.length > 0) return parsed
    } catch {
      continue
    }
  }
  return []
}

/**
 * Same-origin proxy first; if empty or network failure, tries public OSRM mirrors from the
 * browser (CORS) so routes may still load when the proxy is slow or upstream times out.
 */
export async function fetchDrivingRoutes(
  origin: LngLat,
  dest: LngLat,
  options?: FetchDrivingRoutesOptions
): Promise<RouteData[]> {
  const alternatives = options?.alternatives ?? true
  const overview = options?.overview ?? "full"
  const url = buildApiOsrmUrl(origin, dest, { alternatives, overview })
  try {
    const res = await fetch(url, {
      signal: options?.signal,
      cache: "no-store",
    })
    if (res.ok) {
      const data: unknown = await res.json()
      const parsed = parseOsrmJson(data)
      if (parsed.length > 0) return parsed
    }
  } catch {
    /* fall through to direct */
  }
  return fetchDrivingRoutesDirect(origin, dest, options)
}

/** @deprecated Use fetchDrivingRoutes */
export const fetchOsrmDrivingRoutes = fetchDrivingRoutes
