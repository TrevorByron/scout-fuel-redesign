"use client"

import * as React from "react"
import { RouteOptimizerPageContent } from "@/components/route-optimizer-page-content"

export function RouteOptimizerUber() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <RouteOptimizerPageContent />
    </React.Suspense>
  )
}
