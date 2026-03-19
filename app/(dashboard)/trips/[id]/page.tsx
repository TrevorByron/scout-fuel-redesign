"use client"

import { useStyle } from "@/components/style-provider"
import { TripDetailDefault } from "@/components/trip-detail-default"
import { TripDetailUber } from "@/components/trip-detail-uber"

export default function TripDetailPage() {
  const { style } = useStyle()
  if (style === "5") return <TripDetailUber />
  return <TripDetailDefault />
}
