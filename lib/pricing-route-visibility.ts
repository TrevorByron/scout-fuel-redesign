import type { RoutePricingStop } from "@/lib/along-route-stops"

/**
 * How many price markers to show at this zoom / container width.
 * Zoomed out → only the cheapest few; zoomed in → progressively more until all stops.
 * Uses total stop count so each zoom step can reveal more (not stuck on 1–5 plateaus).
 */
export function maxVisiblePriceMarkers(
  zoom: number,
  containerWidthPx: number,
  totalStops: number
): number {
  if (totalStops <= 0) return 0
  if (totalStops === 1) return 1

  const w = containerWidthPx > 0 ? containerWidthPx : 400
  const narrow = w < 420
  const wide = w >= 640

  // t=0 at zoom ~5 (very zoomed out), t=1 at zoom ~11+ (show all)
  const minZ = 4.75
  const maxZ = 10.75
  const t = Math.min(1, Math.max(0, (zoom - minZ) / (maxZ - minZ)))

  let cap = 1 + Math.floor(t * (totalStops - 1))

  if (narrow) {
    cap = Math.max(1, Math.ceil(cap * 0.8))
  } else if (wide) {
    cap = Math.min(totalStops, cap + Math.max(0, Math.ceil((totalStops - cap) * 0.12)))
  }

  return Math.min(totalStops, Math.max(1, cap))
}

/** Cheapest-first; at low zoom only the first N; at high zoom all. */
export function selectVisiblePriceStops(
  stops: RoutePricingStop[],
  zoom: number,
  containerWidthPx: number
): RoutePricingStop[] {
  if (stops.length === 0) return []
  const cap = maxVisiblePriceMarkers(zoom, containerWidthPx, stops.length)
  const sorted = [...stops].sort((a, b) => {
    const p = a.yourPrice - b.yourPrice
    if (p !== 0) return p
    return a.id.localeCompare(b.id)
  })
  if (cap >= sorted.length) return sorted
  return sorted.slice(0, cap)
}
