/**
 * Geocode an address string to [lng, lat] using Nominatim (OpenStreetMap).
 * Use a descriptive User-Agent per Nominatim usage policy.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const USER_AGENT = "Scout Fuel Route Optimizer (https://github.com/shadcn-learning/scout-fuel)"

export type GeocodeResult = { lng: number; lat: number }

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    limit: "1",
  })

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null

  const first = data[0]
  const lon = Number(first?.lon)
  const lat = Number(first?.lat)
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null

  return { lng: lon, lat }
}
