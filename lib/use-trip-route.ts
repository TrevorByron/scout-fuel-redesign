"use client"

import * as React from "react"
import type { TripPlan } from "@/lib/trips"

type LngLat = [number, number]

const OSRM_ROUTE_URL = (origin: LngLat, dest: LngLat) =>
  `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`

/** Minimum number of route points to consider a route "dense" (e.g. from OSRM). Sparse routes (e.g. seed trips with 3 points) draw as straight lines. */
const DENSE_ROUTE_THRESHOLD = 20

export function useTripRoute(selectedTrip: TripPlan | null | undefined) {
  const [fetchedRoute, setFetchedRoute] = React.useState<LngLat[]>([])
  const [routeLoading, setRouteLoading] = React.useState(false)

  React.useEffect(() => {
    if (!selectedTrip || selectedTrip.routeCoordinates.length < 2) {
      setFetchedRoute([])
      setRouteLoading(false)
      return
    }

    const coords = selectedTrip.routeCoordinates
    const origin = coords[0]
    const destination = coords[coords.length - 1]
    if (!origin || !destination) {
      setFetchedRoute([])
      setRouteLoading(false)
      return
    }

    // Use stored route if it's dense (already a proper driving route from OSRM)
    if (coords.length >= DENSE_ROUTE_THRESHOLD) {
      setFetchedRoute([])
      setRouteLoading(false)
      return
    }

    // Fetch OSRM driving route for sparse routes (e.g. seed trips with 3 points)
    const controller = new AbortController()
    const timeoutMs = 60_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    setRouteLoading(true)
    fetch(OSRM_ROUTE_URL(origin, destination), { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.length > 0) {
          const routeCoords = data.routes[0].geometry?.coordinates
          if (Array.isArray(routeCoords) && routeCoords.length >= 2) {
            setFetchedRoute(routeCoords)
            return
          }
        }
        setFetchedRoute(coords)
      })
      .catch(() => setFetchedRoute(coords))
      .finally(() => {
        clearTimeout(timeoutId)
        setRouteLoading(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [selectedTrip?.id, selectedTrip?.routeCoordinates])

  return React.useMemo(() => {
    if (!selectedTrip || selectedTrip.routeCoordinates.length < 2) {
      return {
        originCoords: null as LngLat | null,
        destinationCoords: null as LngLat | null,
        routeCoordinates: [] as LngLat[],
        routeLoading: false,
        fuelStopCoords: [] as LngLat[],
      }
    }

    const coords = selectedTrip.routeCoordinates
    const origin = coords[0] ?? null
    const destination = coords[coords.length - 1] ?? null
    const fuelStopCoords = selectedTrip.stops.map((s) => [s.lng, s.lat] as LngLat)

    // Use fetched OSRM route when we have sparse stored coords; otherwise use stored
    const routeCoordinates =
      fetchedRoute.length >= 2 ? fetchedRoute : coords

    return {
      originCoords: origin,
      destinationCoords: destination,
      routeCoordinates,
      routeLoading,
      fuelStopCoords,
    }
  }, [selectedTrip, fetchedRoute, routeLoading])
}
