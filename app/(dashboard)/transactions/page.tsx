"use client"

import { useStyle } from "@/components/style-provider"
import { TransactionsDefault } from "@/components/transactions-default"
import { TransactionsUber } from "@/components/transactions-uber"

export default function TransactionsPage() {
  const { style } = useStyle()
  if (style === "5") return <TransactionsUber />
  return <TransactionsDefault />
}
