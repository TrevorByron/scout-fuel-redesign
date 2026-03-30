"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { DriversDefault } from "@/components/drivers-default"
import { DriversUber } from "@/components/drivers-uber"

export default function DriversPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <DriversUber />
  return <DriversDefault />
}
