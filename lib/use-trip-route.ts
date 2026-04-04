"use client"

import * as React from "react"
import { fetchDrivingRoutes } from "@/lib/osrm-route"
import type { TripPlan } from "@/lib/trips"

type LngLat = [number, number]

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
    let active = true
    const controller = new AbortController()
    const timeoutMs = 30_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    setRouteLoading(true)
    fetchDrivingRoutes(origin, destination, { signal: controller.signal })
      .then((routes) => {
        if (!active) return
        const first = routes[0]
        if (first?.coordinates && first.coordinates.length >= 2) {
          setFetchedRoute(first.coordinates)
          return
        }
        setFetchedRoute(coords)
      })
      .catch(() => {
        if (active) setFetchedRoute(coords)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (active) setRouteLoading(false)
      })

    return () => {
      active = false
      controller.abort()
      clearTimeout(timeoutId)
      setRouteLoading(false)
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
