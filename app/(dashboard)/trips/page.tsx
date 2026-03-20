"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useStyle } from "@/components/style-provider"
import { TripsDefault } from "@/components/trips-default"
import { TripsUber } from "@/components/trips-uber"

function TripsPageContent() {
  const searchParams = useSearchParams()
  const { style } = useStyle()
  const selectedTripId = searchParams.get("id")
  if (style === "5") return <TripsUber selectedTripId={selectedTripId} />
  return <TripsDefault selectedTripId={selectedTripId} />
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
