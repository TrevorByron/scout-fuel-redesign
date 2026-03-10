"use client"

import * as React from "react"
import type { TripPlan, TripsContextValue } from "@/lib/trips"
import {
  loadFromStorage,
  saveToStorage,
  TRIPS_STORAGE_KEY,
  getSeedTripPlans,
} from "@/lib/trips"

export const TripsContext = React.createContext<TripsContextValue | null>(null)

export function TripsProvider({ children }: { children: React.ReactNode }) {
  const [tripPlans, setTripPlans] = React.useState<TripPlan[]>([])

  React.useEffect(() => {
    const loaded = loadFromStorage(TRIPS_STORAGE_KEY)
    if (loaded.length === 0) {
      const seed = getSeedTripPlans()
      setTripPlans(seed)
      saveToStorage(seed, TRIPS_STORAGE_KEY)
    } else {
      setTripPlans(loaded)
    }
  }, [])

  const value = React.useMemo<TripsContextValue>(
    () => ({
      tripPlans,
      addTripPlan(plan) {
        const full: TripPlan = {
          ...plan,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        setTripPlans((prev) => {
          const next = [...prev, full]
          saveToStorage(next, TRIPS_STORAGE_KEY)
          return next
        })
        return full
      },
      updateTripPlan(id, updates) {
        setTripPlans((prev) => {
          const next = prev.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
          saveToStorage(next, TRIPS_STORAGE_KEY)
          return next
        })
      },
      removeTripPlan(id) {
        setTripPlans((prev) => {
          const next = prev.filter((p) => p.id !== id)
          saveToStorage(next, TRIPS_STORAGE_KEY)
          return next
        })
      },
      getTripPlan(id) {
        return tripPlans.find((p) => p.id === id)
      },
    }),
    [tripPlans]
  )

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  )
}

export function useTrips(): TripsContextValue {
  const ctx = React.useContext(TripsContext)
  if (!ctx) {
    throw new Error("useTrips must be used within TripsProvider")
  }
  return ctx
}
