"use client"

import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"
import { TransactionsDefault } from "@/components/transactions-default"
import { TransactionsUber } from "@/components/transactions-uber"

export default function TransactionsPage() {
  const { style } = useStyle()
  if (isUberStyle(style)) return <TransactionsUber />
  return <TransactionsDefault />
}
