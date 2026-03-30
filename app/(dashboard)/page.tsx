"use client"

import { useStyle } from "@/components/style-provider"
import { DashboardDefault } from "@/components/dashboard-default"
import { DashboardUber } from "@/components/dashboard-uber"
import { isUberStyle } from "@/lib/ui-styles"

export default function DashboardPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <DashboardUber />
  return <DashboardDefault />
}
