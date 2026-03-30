"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { LocationDetailDefault } from "@/components/location-detail-default"
import { LocationDetailUber } from "@/components/location-detail-uber"

export default function LocationDetailPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <LocationDetailUber />
  return <LocationDetailDefault />
}
