"use client"

import { useStyle } from "@/components/style-provider"
import { LocationDetailDefault } from "@/components/location-detail-default"
import { LocationDetailUber } from "@/components/location-detail-uber"

export default function LocationDetailPage() {
  const { style } = useStyle()
  if (style === "5") return <LocationDetailUber />
  return <LocationDetailDefault />
}
