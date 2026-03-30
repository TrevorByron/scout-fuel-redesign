"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { DriverDetailDefault } from "@/components/driver-detail-default"
import { DriverDetailUber } from "@/components/driver-detail-uber"

export default function DriverDetailPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <DriverDetailUber />
  return <DriverDetailDefault />
}
