"use client"

import * as React from "react"
import { geocodeAddress } from "@/lib/geocode"
import type { LngLat } from "@/lib/trips"

export function useDebouncedGeocode(
  address: string,
  debounceMs: number
): {
  coords: LngLat | null
  loading: boolean
  error: boolean
} {
  const [coords, setCoords] = React.useState<LngLat | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    const trimmed = address.trim()
    if (!trimmed) {
      setCoords(null)
      setLoading(false)
      setError(false)
      return
    }

    const timer = setTimeout(() => {
      setLoading(true)
      setError(false)
      geocodeAddress(trimmed)
        .then((result) => {
          if (result) setCoords([result.lng, result.lat])
          else {
            setCoords(null)
            setError(true)
          }
        })
        .catch(() => {
          setCoords(null)
          setError(true)
        })
        .finally(() => setLoading(false))
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [address, debounceMs])

  return { coords, loading, error }
}
