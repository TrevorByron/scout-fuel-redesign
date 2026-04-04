import { NextResponse } from "next/server"
import {
  buildOsrmDrivingRouteUrl,
  OSRM_UPSTREAM_BASES,
  parseOsrmJson,
} from "@/lib/osrm-route"
import type { LngLat } from "@/lib/trips"

export const dynamic = "force-dynamic"

/** Per-mirror timeout (public OSRM can be slow from serverless). */
const PER_ATTEMPT_MS = 18_000

async function fetchUpstreamOnce(upstream: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PER_ATTEMPT_MS)
  try {
    return await fetch(upstream, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Scout Fuel (https://github.com/shadcn-learning/scout-fuel)",
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Proxies OSRM from the app origin. Tries multiple public mirrors (see OSRM_UPSTREAM_BASES)
 * because router.project-osrm.org often times out from serverless / demo overload.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const originLng = Number(searchParams.get("originLng"))
  const originLat = Number(searchParams.get("originLat"))
  const destLng = Number(searchParams.get("destLng"))
  const destLat = Number(searchParams.get("destLat"))
  const altParam = searchParams.get("alternatives")
  const alternatives = altParam === null ? true : altParam === "true"
  const ovParam = searchParams.get("overview")
  const overview = ovParam === null ? "full" : ovParam === "full" ? "full" : "simplified"

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

  let lastOkBody: string | null = null

  const attempts = await Promise.all(
    OSRM_UPSTREAM_BASES.map(async (baseUrl) => {
      const upstream = buildOsrmDrivingRouteUrl(origin, dest, {
        alternatives,
        overview,
        baseUrl,
      })
      try {
        const res = await fetchUpstreamOnce(upstream)
        const text = await res.text()
        let data: unknown
        try {
          data = JSON.parse(text)
        } catch {
          return { parsedLen: 0, text: null as string | null, resOk: false, status: res.status }
        }
        const parsedLen = parseOsrmJson(data).length
        return {
          parsedLen,
          text,
          resOk: res.ok,
          status: res.status,
        }
      } catch {
        return { parsedLen: 0, text: null, resOk: false, status: 0 }
      }
    })
  )

  for (const a of attempts) {
    if (a.parsedLen > 0 && a.text) {
      return new NextResponse(a.text, {
        status: a.status,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (a.resOk && a.text) {
      lastOkBody = a.text
    }
  }

  if (lastOkBody !== null) {
    return new NextResponse(lastOkBody, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  return NextResponse.json(
    { code: "ProxyError", message: "Routing service unreachable" },
    { status: 502 }
  )
}
