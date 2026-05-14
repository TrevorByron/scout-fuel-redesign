"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { FuelTransaction } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const FuelTransactionTable = dynamic(
  () =>
    import("@/components/fuel-transaction-table").then((m) => ({
      default: m.FuelTransactionTable,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
        Loading table…
      </div>
    ),
  }
)

const DriverInsightsMap = dynamic(
  () =>
    import("@/components/driver-insights-map").then((m) => ({
      default: m.DriverInsightsMap,
    })),
  { ssr: false }
)

export type DriverFillUpsBlockProps = {
  transactions: FuelTransaction[]
  /** Extra classes on the map container (border, height). */
  mapContainerClassName?: string
  /** Classes on the transactions card root. */
  tableCardClassName?: string
  tableTitle?: string
  tableDescription?: React.ReactNode
  maxRows?: number
}

/**
 * Map + transactions table with row ↔ map selection. Used on driver profile and My Dashboard.
 */
export function DriverFillUpsBlock({
  transactions,
  mapContainerClassName,
  tableCardClassName,
  tableTitle = "Transactions",
  tableDescription = "Click a row to highlight it on the map.",
  maxRows = 100,
}: DriverFillUpsBlockProps) {
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null)

  const handleSelectTransaction = React.useCallback((t: FuelTransaction | null) => {
    setSelectedTransactionId(t?.id ?? null)
  }, [])

  return (
    <>
      <div
        className={cn(
          "relative h-[50vh] min-h-[400px] w-full overflow-visible rounded-lg border border-border",
          mapContainerClassName
        )}
      >
        <DriverInsightsMap
          transactions={transactions}
          selectedTransactionId={selectedTransactionId}
          onSelectTransaction={handleSelectTransaction}
        />
      </div>
      <Card className={tableCardClassName}>
        <CardHeader>
          <CardTitle>{tableTitle}</CardTitle>
          <CardDescription>{tableDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <FuelTransactionTable
            transactions={transactions}
            maxRows={maxRows}
            hideDriverColumn
            emptyTitle="No transactions in this range"
            emptyDescription="Change the date range to see transactions."
            groupByStation={false}
            selectedTransactionId={selectedTransactionId}
            onSelectTransaction={handleSelectTransaction}
          />
        </CardContent>
      </Card>
    </>
  )
}
