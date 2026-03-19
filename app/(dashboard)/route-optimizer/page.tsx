"use client"

import { useStyle } from "@/components/style-provider"
import { RouteOptimizerDefault } from "@/components/route-optimizer-default"
import { RouteOptimizerUber } from "@/components/route-optimizer-uber"

export default function RouteOptimizerPage() {
  const { style } = useStyle()
  if (style === "5") return <RouteOptimizerUber />
  return <RouteOptimizerDefault />
}
