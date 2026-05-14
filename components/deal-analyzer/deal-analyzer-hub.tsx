"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Trash2, XCircle } from "lucide-react"
import { deleteDealAnalysis, listSavedDealAnalyses } from "@/lib/deal-analyzer-storage"
import type { DealVerdict, SavedDealAnalysis } from "@/lib/deal-analyzer-types"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon } from "@hugeicons/core-free-icons"

type VerdictTier = DealVerdict["tier"]

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

/** Matches deal-analyzer-results-view hero shell (list-row variant). */
function verdictTierRowShellClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "border-[var(--success)]/35 bg-[var(--success)]/5"
    case "marginal":
      return "border-[var(--warning)]/40 bg-[var(--warning)]/10"
    case "bad":
      return "border-destructive/35 bg-destructive/10"
    default:
      return "border-border bg-muted/20"
  }
}

function verdictTierIconShellClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "bg-[var(--success)]/15 text-[var(--success)]"
    case "marginal":
      return "bg-[var(--warning)]/15 text-[var(--warning)]"
    case "bad":
      return "bg-destructive/15 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function verdictTierHeadlineClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "text-[var(--success)]"
    case "marginal":
      return "text-[var(--warning)]"
    case "bad":
      return "text-destructive"
    default:
      return "text-foreground"
  }
}

function SavedAnalysisLinkBody({ item }: { item: SavedDealAnalysis }) {
  const results = item.results
  const verdict = results?.verdict
  const proposed = results?.proposed
  const tier = verdict?.tier ?? "good"
  const hasMetrics = Boolean(verdict && proposed && typeof proposed.savings === "number")

  return (
    <>
      {verdict ? (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            verdictTierIconShellClass(tier)
          )}
          aria-hidden
        >
          {tier === "bad" ? (
            <XCircle className="size-5" />
          ) : tier === "marginal" ? (
            <AlertCircle className="size-5" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-foreground text-sm">{item.name}</p>
        {hasMetrics && verdict && proposed ? (
          <>
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {verdict.subtitle}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums tracking-tight",
                  verdictTierHeadlineClass(tier)
                )}
              >
                {proposed.savings >= 0 ? "−" : "+"}
                {fmtUsd(Math.abs(proposed.savings))}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({fmtPct(proposed.savingsPercent)} vs baseline)
              </span>
            </div>
          </>
        ) : null}
        <p className="text-muted-foreground text-xs pt-0.5">
          {format(new Date(item.date), "MMM d, yyyy · h:mm a")}
        </p>
      </div>
    </>
  )
}

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
              Evaluate fuel proposals in real-time.
            </p>
            <p className="text-pretty text-xs text-muted-foreground sm:text-sm">
              Type in the deal details as you hear them, compare them to your
              historic transaction data and get instant analysis.
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
              <ul className="max-h-[min(24rem,55vh)] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2">
                {saved.map((item) => {
                  const tier = item.results?.verdict?.tier ?? "good"
                  const hasResults = Boolean(item.results?.verdict && item.results?.proposed)
                  return (
                    <li key={item.id} className="flex items-stretch gap-0.5">
                      <Link
                      href={`/deal-analyzer/analyze?saved=${encodeURIComponent(item.id)}`}
                      className={cn(
                        "flex min-w-0 flex-1 rounded-md border px-3 py-2.5 text-left transition-colors",
                        hasResults
                          ? cn(
                              "items-start gap-3",
                              verdictTierRowShellClass(tier),
                              "hover:brightness-[0.99]"
                            )
                          : "min-h-11 flex-col gap-0.5 border-transparent hover:bg-muted/80"
                      )}
                    >
                      {hasResults ? (
                        <SavedAnalysisLinkBody item={item} />
                      ) : (
                        <>
                          <span className="truncate font-medium text-foreground text-sm">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(item.date), "MMM d, yyyy · h:mm a")}
                          </span>
                        </>
                      )}
                      </Link>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-lg"
                              className="min-h-11 min-w-11 shrink-0 self-center text-muted-foreground hover:text-destructive"
                              aria-label={`Delete saved analysis, ${item.name}`}
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          }
                        />
                        <TooltipContent side="left">Delete saved analysis</TooltipContent>
                      </Tooltip>
                    </li>
                  )
                })}
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
