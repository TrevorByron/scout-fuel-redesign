"use client"

import { useStyle } from "@/components/style-provider"
import { TripsDefault } from "@/components/trips-default"
import { TripsUber } from "@/components/trips-uber"

export default function TripsPage() {
  const { style } = useStyle()
  if (style === "5") return <TripsUber />
  return <TripsDefault />
}
