"use client"

import { useStyle } from "@/components/style-provider"
import { LocationsDefault } from "@/components/locations-default"
import { LocationsUber } from "@/components/locations-uber"

export default function LocationInsightsPage() {
  const { style } = useStyle()
  if (style === "5") return <LocationsUber />
  return <LocationsDefault />
}
