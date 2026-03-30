"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { RouteOptimizerDefault } from "@/components/route-optimizer-default"
import { RouteOptimizerUber } from "@/components/route-optimizer-uber"

export default function RouteOptimizerPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <RouteOptimizerUber />
  return <RouteOptimizerDefault />
}
