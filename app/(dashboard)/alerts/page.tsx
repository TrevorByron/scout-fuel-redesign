"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { AlertsDefault } from "@/components/alerts-default"
import { AlertsUber } from "@/components/alerts-uber"

export default function AlertsPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <AlertsUber />
  return <AlertsDefault />
}
