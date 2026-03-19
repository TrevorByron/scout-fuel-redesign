"use client"

import { useStyle } from "@/components/style-provider"
import { AlertsDefault } from "@/components/alerts-default"
import { AlertsUber } from "@/components/alerts-uber"

export default function AlertsPage() {
  const { style } = useStyle()
  if (style === "5") return <AlertsUber />
  return <AlertsDefault />
}
