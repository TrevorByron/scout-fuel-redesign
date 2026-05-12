import { toast } from "sonner"
import { driverDisplayName, loadDriverContacts } from "@/lib/driver-contact-store"
import { drivers } from "@/lib/mock-data"
import type { TripPlan } from "@/lib/trips"

export type UpdateTripPlanFn = (
  id: string,
  updates: Partial<TripPlan>
) => void

export interface SendTripToDriverOptions {
  /** Overrides default “Trip sent to …” success copy (e.g. after save from Optimizer). */
  successMessage?: string
}

/**
 * Records that the trip was sent to the driver and shows confirmation.
 * Returns false if no driver is assigned (shows error toast).
 */
export function sendTripToDriver(
  trip: TripPlan,
  updateTripPlan: UpdateTripPlanFn,
  options?: SendTripToDriverOptions
): boolean {
  if (!trip.driverId?.trim()) {
    toast.error("Select a driver first.")
    return false
  }
  updateTripPlan(trip.id, {
    lastSentToDriverAt: new Date().toISOString(),
  })
  if (options?.successMessage) {
    toast.success(options.successMessage)
    return true
  }
  const id = trip.driverId?.trim()
  let who: string | undefined
  if (id) {
    const fleet = drivers.find((d) => d.driverId === id)
    if (fleet) {
      const contacts = loadDriverContacts(drivers)
      who = driverDisplayName(fleet.driverName, contacts[id]).trim() || undefined
    }
  }
  who = who ?? trip.driverName?.trim()
  toast.success(who ? `Trip sent to ${who}.` : "Trip sent to driver.")
  return true
}
