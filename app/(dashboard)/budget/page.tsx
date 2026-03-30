"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { BudgetDefault } from "@/components/budget-default"
import { BudgetUber } from "@/components/budget-uber"

export default function BudgetPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <BudgetUber />
  return <BudgetDefault />
}
