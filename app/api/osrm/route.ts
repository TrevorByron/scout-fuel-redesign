import { NextResponse } from "next/server"
import { buildOsrmDrivingRouteUrl } from "@/lib/osrm-route"
import type { LngLat } from "@/lib/trips"

export const dynamic = "force-dynamic"

const UPSTREAM_TIMEOUT_MS = 22_000

async function fetchUpstreamJson(upstream: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    return await fetch(upstream, { signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Proxies OSRM from the app origin so the browser does not call router.project-osrm.org
 * directly (ad blockers, flaky CORS/corp networks, and slow client-side DNS all improve).
 * Retries once on upstream 5xx or network/timeout failure.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const originLng = Number(searchParams.get("originLng"))
  const originLat = Number(searchParams.get("originLat"))
  const destLng = Number(searchParams.get("destLng"))
  const destLat = Number(searchParams.get("destLat"))
  const alternatives = searchParams.get("alternatives") === "true"
  const overview = searchParams.get("overview") === "full" ? "full" : "simplified"

  if (![originLng, originLat, destLng, destLat].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 })
  }
  if (Math.abs(originLat) > 90 || Math.abs(destLat) > 90) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 })
  }
  if (Math.abs(originLng) > 180 || Math.abs(destLng) > 180) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 })
  }

  const origin: LngLat = [originLng, originLat]
  const dest: LngLat = [destLng, destLat]

  const upstream = buildOsrmDrivingRouteUrl(origin, dest, { alternatives, overview })

  const respondWith = (res: Response) =>
    res.text().then(
      (text) =>
        new NextResponse(text, {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        })
    )

  try {
    let res = await fetchUpstreamJson(upstream)
    if (res.status >= 500) {
      await res.text().catch(() => {})
      res = await fetchUpstreamJson(upstream)
    }
    return await respondWith(res)
  } catch {
    try {
      const res = await fetchUpstreamJson(upstream)
      return await respondWith(res)
    } catch {
      return NextResponse.json(
        { code: "ProxyError", message: "Routing service unreachable" },
        { status: 502 }
      )
    }
  }
}
