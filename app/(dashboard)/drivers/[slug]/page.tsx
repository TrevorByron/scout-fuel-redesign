"use client"

import { useStyle } from "@/components/style-provider"
import { DriverDetailDefault } from "@/components/driver-detail-default"
import { DriverDetailUber } from "@/components/driver-detail-uber"

export default function DriverDetailPage() {
  const { style } = useStyle()
  if (style === "5") return <DriverDetailUber />
  return <DriverDetailDefault />
}
