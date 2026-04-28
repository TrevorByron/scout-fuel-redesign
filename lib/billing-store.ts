"use client"

export type BillingPayment = {
  cardholderName: string
  cardNumber: string
  expiry: string
  cvv: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
}

const BILLING_STORAGE_KEY = "scoutfuel:billing"

function isBillingPayment(value: unknown): value is BillingPayment {
  if (!value || typeof value !== "object") return false
  const c = value as Record<string, unknown>
  return (
    typeof c.cardholderName === "string" &&
    typeof c.cardNumber === "string" &&
    typeof c.expiry === "string" &&
    typeof c.cvv === "string" &&
    typeof c.addressLine1 === "string" &&
    typeof c.addressLine2 === "string" &&
    typeof c.city === "string" &&
    typeof c.region === "string" &&
    typeof c.postalCode === "string" &&
    typeof c.country === "string"
  )
}

export function defaultBilling(): BillingPayment {
  return {
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "US",
  }
}

export function loadBilling(fallback: BillingPayment): BillingPayment {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(BILLING_STORAGE_KEY)
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isBillingPayment(parsed)) return fallback
    return parsed
  } catch {
    return fallback
  }
}

export function saveBilling(data: BillingPayment): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(data))
}
