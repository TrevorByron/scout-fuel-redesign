"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { ArrowRight, FileText, Trash2 } from "lucide-react"
import { deleteDealAnalysis, listSavedDealAnalyses } from "@/lib/deal-analyzer-storage"
import type { SavedDealAnalysis } from "@/lib/deal-analyzer-types"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon } from "@hugeicons/core-free-icons"

export function DealAnalyzerHub() {
  const pathname = usePathname()
  const [saved, setSaved] = React.useState<SavedDealAnalysis[]>([])
  const [deleteTarget, setDeleteTarget] = React.useState<SavedDealAnalysis | null>(null)

  React.useEffect(() => {
    setSaved(listSavedDealAnalyses())
  }, [pathname])

  function confirmDeleteSaved() {
    if (!deleteTarget) return
    deleteDealAnalysis(deleteTarget.id)
    setSaved(listSavedDealAnalyses())
    setDeleteTarget(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl -translate-y-[60px] flex-col justify-center gap-8 px-4 py-8 lg:px-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HugeiconsIcon icon={BalanceScaleIcon} strokeWidth={2} className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Fuel Deal Analyzer
            </h1>
            <p className="text-pretty text-sm text-muted-foreground sm:text-base">
              Evaluate fuel proposals in real-time as they&apos;re pitched to you.
            </p>
            <p className="text-pretty text-xs text-muted-foreground sm:text-sm">
              Type in the deal details as you hear them—get instant analysis.
            </p>
          </div>
          <Link
            href="/deal-analyzer/analyze"
            className={cn(
              buttonVariants({
                variant: "default",
                size: "lg",
                className:
                  "min-h-11 w-full max-w-md gap-2 [&_svg:not([class*='size-'])]:size-4",
              })
            )}
          >
            Analyze Deal
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </header>

        {saved.length > 0 ? (
          <Card className="flex flex-col shadow-md ring-1 ring-foreground/10">
            <CardHeader className="gap-3 items-center justify-items-center text-center">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileText className="size-6" strokeWidth={2} aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Past Analyses</CardTitle>
                <CardDescription>Review previous evaluations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pt-0">
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2">
                {saved.map((item) => (
                  <li key={item.id} className="flex items-center gap-0.5">
                    <Link
                      href={`/deal-analyzer/analyze?saved=${encodeURIComponent(item.id)}`}
                      className="flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/80"
                    >
                      <span className="truncate font-medium text-foreground text-sm">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(item.date), "MMM d, yyyy · h:mm a")}
                      </span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete saved analysis, ${item.name}`}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  &quot;{deleteTarget.name}&quot; will be removed from this device. This cannot be
                  undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={confirmDeleteSaved}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
