"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { AlertCircle, ArrowRight, CheckCircle2, XCircle } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon, Delete02Icon, MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons"

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

/** Background-only tier tint for rows inside a bordered list (no outer cell border). */
function verdictTierRowBgClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "bg-[var(--success)]/5"
    case "marginal":
      return "bg-[var(--warning)]/10"
    case "bad":
      return "bg-destructive/10"
    default:
      return "bg-muted/20"
  }
}

function verdictTierListAccentClass(tier: VerdictTier): string {
  switch (tier) {
    case "excellent":
    case "good":
      return "border-l-[var(--success)]"
    case "marginal":
      return "border-l-[var(--warning)]"
    case "bad":
      return "border-l-destructive"
    default:
      return "border-l-border"
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
      {saved.length === 0 ? (
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
                Capture deal details and compare them to your historic transaction
                data and get instant analysis.
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
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
            <div className="min-w-0 max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Fuel Deal Analyzer
              </h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Evaluate fuel proposals in real-time. Open a saved analysis or start
                a new one.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/deal-analyzer/analyze"
                className={cn(
                  buttonVariants({
                    variant: "default",
                    size: "default",
                    className:
                      "min-h-11 gap-2 [&_svg:not([class*='size-'])]:size-4",
                  })
                )}
              >
                Analyze Deal
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-4 lg:px-6">
            <Card className="flex flex-col shadow-sm">
              <CardHeader className="gap-1 pb-4 text-left">
                <CardTitle className="text-base">Saved analyses</CardTitle>
                <CardDescription>Review previous evaluations on this device.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {saved.map((item) => {
                    const tier = item.results?.verdict?.tier ?? "good"
                    const hasResults = Boolean(item.results?.verdict && item.results?.proposed)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex min-h-11 items-center gap-1 pr-1 transition-colors sm:pr-2",
                          hasResults
                            ? cn(
                                "border-l-[3px]",
                                verdictTierRowBgClass(tier),
                                verdictTierListAccentClass(tier),
                                "hover:brightness-[0.99]"
                              )
                            : "border-l-[3px] border-l-transparent hover:bg-muted/40"
                        )}
                      >
                        <Link
                          href={`/deal-analyzer/analyze?saved=${encodeURIComponent(item.id)}`}
                          className={cn(
                            "flex min-w-0 flex-1 gap-3 px-3 py-3 text-left",
                            hasResults
                              ? "items-start"
                              : "min-h-11 flex-col items-start justify-center gap-0.5"
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
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-lg"
                                      className="min-h-11 min-w-11 shrink-0 text-muted-foreground"
                                      aria-label={`More actions for ${item.name}`}
                                    />
                                  }
                                >
                                  <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
                                </DropdownMenuTrigger>
                              }
                            />
                            <TooltipContent side="left">More actions</TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent align="end" side="bottom" className="w-44">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
