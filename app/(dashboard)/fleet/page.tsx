"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { FleetDefault } from "@/components/fleet-default"
import { FleetUber } from "@/components/fleet-uber"

export default function FleetPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <FleetUber />
  return <FleetDefault />
}
