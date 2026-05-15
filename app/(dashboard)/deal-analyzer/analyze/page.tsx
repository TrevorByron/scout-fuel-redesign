import { Suspense } from "react"
import { DealAnalyzerPage } from "@/components/deal-analyzer/deal-analyzer-page"

export default function DealAnalyzerAnalyzePage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">
            Loading…
          </div>
        }
      >
        <DealAnalyzerPage />
      </Suspense>
    </div>
  )
}
