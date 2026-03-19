"use client"

import { useStyle } from "@/components/style-provider"
import { DriversDefault } from "@/components/drivers-default"
import { DriversUber } from "@/components/drivers-uber"

export default function DriversPage() {
  const { style } = useStyle()
  if (style === "5") return <DriversUber />
  return <DriversDefault />
}
