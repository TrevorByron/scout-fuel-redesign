"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { LocationsDefault } from "@/components/locations-default"
import { LocationsUber } from "@/components/locations-uber"

export default function LocationInsightsPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <LocationsUber />
  return <LocationsDefault />
}
