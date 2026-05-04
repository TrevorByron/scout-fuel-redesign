"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { TripsDefault } from "@/components/trips-default"

function TripsPageContent() {
  const searchParams = useSearchParams()
  const selectedTripId = searchParams.get("id")
  const autoOpenSendDriver = searchParams.get("send") === "1"
  return (
    <TripsDefault
      selectedTripId={selectedTripId}
      autoOpenSendDriver={autoOpenSendDriver}
    />
  )
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <TripsPageContent />
    </Suspense>
  )
}
