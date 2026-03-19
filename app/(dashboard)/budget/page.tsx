"use client"

import { useStyle } from "@/components/style-provider"
import { BudgetDefault } from "@/components/budget-default"
import { BudgetUber } from "@/components/budget-uber"

export default function BudgetPage() {
  const { style } = useStyle()
  if (style === "5") return <BudgetUber />
  return <BudgetDefault />
}
