"use client"

import { useStyle } from "@/components/style-provider"
import { DashboardDefault } from "@/components/dashboard-default"
import { DashboardUber } from "@/components/dashboard-uber"

export default function DashboardPage() {
  const { style } = useStyle()
  if (style === "5") return <DashboardUber />
  return <DashboardDefault />
}
