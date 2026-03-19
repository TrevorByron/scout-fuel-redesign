"use client"

import { useStyle } from "@/components/style-provider"
import { FleetDefault } from "@/components/fleet-default"
import { FleetUber } from "@/components/fleet-uber"

export default function FleetPage() {
  const { style } = useStyle()
  if (style === "5") return <FleetUber />
  return <FleetDefault />
}
