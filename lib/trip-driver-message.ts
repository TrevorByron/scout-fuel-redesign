import { format } from "date-fns"

import type { TripPlan } from "@/lib/trips"

const DATE_RANGE_FMT = "MMM d, yyyy"

function routeTitle(trip: TripPlan): string {
  const named = trip.name?.trim()
  if (named) return named
  return `${trip.origin} → ${trip.destination}`
}

/** Default email subject for sending a trip plan to the driver. */
export function buildDefaultEmailSubject(trip: TripPlan): string {
  return `Trip plan: ${routeTitle(trip)}`
}

/**
 * Plain-text body for SMS or email: route summary, dates, and ordered fuel stops
 * with explicit instruction to stop at each planned stop.
 */
export function buildDefaultDriverTripMessage(trip: TripPlan): string {
  const driver = trip.driverName?.trim() || "there"
  const start = format(new Date(trip.tripStart), DATE_RANGE_FMT)
  const end = format(new Date(trip.tripEnd), DATE_RANGE_FMT)
  const title = routeTitle(trip)

  const stopLines = trip.stops.map((s, i) => {
    const gal = Math.round(s.refuelGallons)
    const price = s.pricePerGallon.toFixed(2)
    return `${i + 1}. ${s.station} — ${s.location} · ETA ${s.eta} — Stop here to refuel (~${gal} gal @ $${price}/gal).`
  })

  const stopsBlock =
    stopLines.length > 0
      ? ["Stops (follow this order — stop at each one to refuel):", "", ...stopLines].join("\n")
      : "No fuel stops are listed on this plan yet."

  return [
    `Hi ${driver},`,
    "",
    "Here is your planned fuel route. Please stop at each listed stop in order to refuel — do not skip stops along the way.",
    "",
    `Route: ${title}`,
    `Trip window: ${start} – ${end}`,
    "",
    stopsBlock,
    "",
    "Drive safely,",
    "Fleet",
  ].join("\n")
}
