"use client"

import { useStyle } from "@/components/style-provider"
import { PricingSummaryDefault } from "@/components/pricing-summary-default"
import { PricingSummaryUber } from "@/components/pricing-summary-uber"

export default function PricingSummaryPage() {
  const { style } = useStyle()
  if (style === "5") return <PricingSummaryUber />
  return <PricingSummaryDefault />
}
