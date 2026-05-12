"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Upload, Zap } from "lucide-react"
import { getFuelTransactions } from "@/lib/mock-data"
import { getAllLocationKeys } from "@/lib/location-utils"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerPeriod,
  DealAnalyzerResults,
  DealFuelNetwork,
  DealPricingTier,
} from "@/lib/deal-analyzer-types"
import {
  buildLocationComparisonRows,
  computeDealAnalysis,
  filterTransactionsByDealTiers,
  filterTransactionsInRange,
  aggregateBaselineForDealTiers,
  NETWORK_LABELS,
  resolvePeriodRange,
  summarizePeriod,
} from "@/lib/deal-analyzer-engine"
import {
  defaultDealAnalyzerForm,
  defaultPricingTier,
  migrateDealConfigToCurrentShape,
  normalizeDefRebateModeOnLoad,
} from "@/lib/deal-analyzer-migration"
import { DealAnalyzerTierFields } from "@/components/deal-analyzer/deal-analyzer-tier-fields"
import {
  deleteDealAnalysis,
  getSavedDealAnalysis,
  saveDealAnalysis,
} from "@/lib/deal-analyzer-storage"
import { DealAnalyzerResultsView } from "@/components/deal-analyzer/deal-analyzer-results-view"
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
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon } from "@hugeicons/core-free-icons"
import { DateRangePresetTabs } from "@/components/date-range-preset-tabs"
import { cn } from "@/lib/utils"

function normalizeDealAnalyzerPeriod(p: unknown): DealAnalyzerPeriod {
  if (p === "6months") return "year"
  if (p === "30" || p === "90" || p === "quarter" || p === "year") return p
  return "90"
}

const DEAL_ANALYZER_PERIOD_PRESETS: {
  value: DealAnalyzerPeriod
  label: string
}[] = [
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "quarter", label: "Last Quarter" },
  { value: "year", label: "Last Year" },
]

/** Viewport height below header — same contract as `MapSheetLayout` aside shell. */
const DEAL_ANALYZER_SHELL_STYLE: React.CSSProperties = {
  height: "100%",
  maxHeight: "calc(100dvh - var(--header-height, 3rem))",
}

function normalizeLoadedDealConfig(c: DealAnalyzerFormInput): DealAnalyzerFormInput {
  return normalizeDefRebateModeOnLoad(migrateDealConfigToCurrentShape(c))
}

function defaultForm(): DealAnalyzerFormInput {
  return defaultDealAnalyzerForm()
}

export function DealAnalyzerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const savedId = searchParams.get("saved")

  const anchorRef = React.useRef<Date>(new Date())
  const allTransactions = React.useMemo(
    () => getFuelTransactions(anchorRef.current),
    []
  )

  const locationSelectOptions = React.useMemo(() => getAllLocationKeys(), [])

  const [form, setForm] = React.useState<DealAnalyzerFormInput>(defaultForm)
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<DealAnalyzerPeriod>("90")
  const [lockedPeriod, setLockedPeriod] =
    React.useState<DealAnalyzerPeriod | null>(null)

  const [results, setResults] = React.useState<DealAnalyzerResults | null>(null)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [showResults, setShowResults] = React.useState(false)
  const [lastCalculatedFormSignature, setLastCalculatedFormSignature] =
    React.useState<string | null>(null)

  const [deleteSavedOpen, setDeleteSavedOpen] = React.useState(false)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState("")

  const resultsRef = React.useRef<HTMLDivElement>(null)
  const tierCardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [enteringTierIndex, setEnteringTierIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!savedId) return
    const entry = getSavedDealAnalysis(savedId)
    if (!entry) return
    const normalizedForm = normalizeLoadedDealConfig(entry.dealConfig)
    setForm(normalizedForm)
    setResults(entry.results)
    const period = normalizeDealAnalyzerPeriod(entry.periodUsed)
    setLockedPeriod(period)
    setSelectedPeriod(period)
    setShowResults(true)
    setAnalysisError(null)
    setLastCalculatedFormSignature(JSON.stringify(normalizedForm))
  }, [savedId])

  const currentFormSignature = React.useMemo(() => JSON.stringify(form), [form])

  React.useLayoutEffect(() => {
    if (enteringTierIndex === null) return
    const idx = enteringTierIndex
    const el = tierCardRefs.current[idx]
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (el) {
      el.scrollIntoView({
        block: "nearest",
        behavior: prefersReduced ? "auto" : "smooth",
      })
    }

    const clearMs = prefersReduced ? 0 : 320
    const t = window.setTimeout(() => {
      setEnteringTierIndex(null)
    }, clearMs)

    return () => window.clearTimeout(t)
  }, [enteringTierIndex])

  const periodSnapshots = React.useMemo(() => {
    const anchor = anchorRef.current
    return DEAL_ANALYZER_PERIOD_PRESETS.map((p) => ({
      id: p.value,
      label: p.label,
      stats: summarizePeriod(allTransactions, p.value, form.tiers, anchor),
    }))
  }, [allTransactions, form.tiers])

  const selectedPeriodSnapshot = React.useMemo(
    () => periodSnapshots.find((s) => s.id === selectedPeriod),
    [periodSnapshots, selectedPeriod]
  )

  const analysisTransactionSlice = React.useMemo(() => {
    if (!results || !lockedPeriod) return []
    const range = resolvePeriodRange(lockedPeriod, anchorRef.current)
    const inRange = filterTransactionsInRange(allTransactions, range)
    return filterTransactionsByDealTiers(inRange, form.tiers)
  }, [allTransactions, results, lockedPeriod, form.tiers])

  const locationComparisonRows = React.useMemo(() => {
    if (!results || analysisTransactionSlice.length === 0) return []
    return buildLocationComparisonRows(
      analysisTransactionSlice,
      form,
      results
    )
  }, [analysisTransactionSlice, form, results])

  const tiersComplete =
    form.tiers.length > 0 &&
    form.tiers.every((tier) => {
      if (tier.locationCoverage === "") return false
      if (tier.programType === "") return false
      if (tier.programType === "discount" || tier.programType === "rebate") {
        if (tier.discountStructure === "") return false
      }
      if (tier.programType === "def_rebate") {
        if (
          tier.defRebatePricingMode !== "flat" &&
          tier.defRebatePricingMode !== "retail_minus"
        ) {
          return false
        }
      }
      return true
    })

  const canCalculate = form.network !== "" && tiersComplete
  const hasUncalculatedChanges =
    lastCalculatedFormSignature === null ||
    lastCalculatedFormSignature !== currentFormSignature

  const runAnalysis = React.useCallback(
    (periodOverride?: DealAnalyzerPeriod) => {
      const period = periodOverride ?? selectedPeriod
      setAnalysisError(null)
      const anchor = anchorRef.current
      const range = resolvePeriodRange(period, anchor)
      const slice = filterTransactionsInRange(allTransactions, range)
      const baseline = aggregateBaselineForDealTiers(slice, form.tiers)

      if (baseline.transactions === 0) {
        setResults(null)
        setShowResults(false)
        setAnalysisError(
          "No purchases in this period match your tier program types. Pick another window or adjust tiers."
        )
        return
      }

      const computed = computeDealAnalysis({
        form,
        baseline,
        filteredTxnsForOptimization: slice,
      })

      if (!computed) {
        setResults(null)
        setShowResults(false)
        setAnalysisError("Could not compute this scenario. Check inputs.")
        return
      }

      setResults(computed)
      setLockedPeriod(period)
      setShowResults(true)
      setLastCalculatedFormSignature(currentFormSignature)

      if (periodOverride === undefined) {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: prefersReduced ? "auto" : "smooth",
            block: "start",
          })
        })
      }
    },
    [allTransactions, currentFormSignature, form, selectedPeriod]
  )

  const handleDeleteSaved = () => {
    if (!savedId) return
    deleteDealAnalysis(savedId)
    setDeleteSavedOpen(false)
    router.push("/deal-analyzer")
  }

  const handleSaveDeal = () => {
    if (!results || !lockedPeriod) return
    const name = saveName.trim() || "Untitled analysis"
    saveDealAnalysis({
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString(),
      dealConfig: { ...form, dealName: name },
      periodUsed: lockedPeriod,
      results,
    })
    setForm((f) => ({ ...f, dealName: name }))
    setSaveOpen(false)
    setSaveName("")
  }

  function updateForm<K extends keyof DealAnalyzerFormInput>(
    key: K,
    value: DealAnalyzerFormInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function patchTier(index: number, patch: Partial<DealPricingTier>) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  function addTier() {
    if (enteringTierIndex !== null) return
    let newIndex = -1
    setForm((f) => {
      newIndex = f.tiers.length
      return { ...f, tiers: [...f.tiers, defaultPricingTier()] }
    })
    if (newIndex >= 0) setEnteringTierIndex(newIndex)
  }

  function removeTier(index: number) {
    setEnteringTierIndex(null)
    setForm((f) => ({
      ...f,
      tiers: f.tiers.filter((_, i) => i !== index),
    }))
  }

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-visible px-4 py-4",
          "md:min-h-0 md:flex-row md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
        )}
        style={DEAL_ANALYZER_SHELL_STYLE}
      >
        <aside
          className={cn(
            "flex min-h-0 min-w-0 w-full flex-col",
            "md:max-w-xl md:min-h-0 md:h-full md:min-w-[23.75rem] md:w-[43%] md:shrink-0 md:self-stretch md:p-4"
          )}
          aria-label="Deal details"
        >
          <Card className="gap-0 py-0 flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:max-h-none">
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col rounded-lg",
                "md:overflow-hidden"
              )}
            >
              <header className="shrink-0 border-b border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <HugeiconsIcon
                      icon={BalanceScaleIcon}
                      strokeWidth={2}
                      className="mt-1 size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                        Deal details
                      </h2>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Type as you hear the proposal.
                      </p>
                    </div>
                  </div>
                </div>
              </header>
              <div
                role="region"
                aria-label="Deal configuration"
                className={cn(
                  "flex flex-col overflow-visible",
                  "md:min-h-0 md:flex-1 md:basis-0 md:overflow-y-auto md:overscroll-y-contain md:[-webkit-overflow-scrolling:touch]"
                )}
              >
                <div className="flex flex-col gap-4 p-4 pb-8">
              <div className="flex shrink-0 flex-col gap-2">
                <Field>
                  <FieldLabel htmlFor="deal-network">
                    Which fuel network?
                  </FieldLabel>
                  <Select
                    value={form.network || undefined}
                    onValueChange={(v) =>
                      updateForm("network", v as DealFuelNetwork)
                    }
                  >
                    <SelectTrigger
                      id="deal-network"
                      className="min-h-11 w-full sm:min-h-9"
                    >
                      <SelectValue placeholder="Select network">
                        {(v) =>
                          v && NETWORK_LABELS[v as DealFuelNetwork]
                            ? NETWORK_LABELS[v as DealFuelNetwork]
                            : "Select network"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loves">Love&apos;s</SelectItem>
                      <SelectItem value="pilot-flying-j">Pilot Flying J</SelectItem>
                      <SelectItem value="ta-petro">TA/Petro</SelectItem>
                      <SelectItem value="shell">Shell</SelectItem>
                      <SelectItem value="chevron">Chevron</SelectItem>
                      <SelectItem value="ambest">Ambest</SelectItem>
                      <SelectItem value="roadranger">RoadRanger</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Separator className="bg-border/70" aria-hidden />

              <div className="flex flex-col gap-3">
                {form.tiers.map((tier, i) => {
                  const motionOk =
                    typeof window === "undefined" ||
                    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  const isEntering = enteringTierIndex === i && motionOk
                  return (
                    <div
                      key={`tier-${i}`}
                      ref={(el) => {
                        tierCardRefs.current[i] = el
                      }}
                      className={cn(
                        isEntering &&
                          "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                      )}
                    >
                      <DealAnalyzerTierFields
                        tierIndex={i}
                        tier={tier}
                        showTierChrome={form.tiers.length > 1}
                        locationOptions={locationSelectOptions}
                        onPatch={(p) => patchTier(i, p)}
                        onRemove={form.tiers.length > 1 ? () => removeTier(i) : undefined}
                        canRemove={form.tiers.length > 1}
                      />
                    </div>
                  )
                })}
                <Separator className="bg-border/70" aria-hidden />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  disabled={enteringTierIndex !== null}
                  onClick={addTier}
                >
                  {form.tiers.length > 1 ? "Add deal tier" : "Add another coverage rule"}
                </Button>
              </div>

                </div>
              </div>
              <footer
                className={cn(
                  "shrink-0 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm",
                  "max-md:sticky max-md:bottom-0 max-md:z-10",
                  "md:relative md:z-auto md:bg-background/20 md:pb-4"
                )}
              >
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="min-h-11 w-full gap-2 sm:min-h-10"
                    disabled={!canCalculate || !hasUncalculatedChanges}
                    onClick={() => runAnalysis()}
                  >
                    <Zap className="size-4" aria-hidden />
                    Calculate Deal
                  </Button>
                  {analysisError ? (
                    <p
                      className="text-center text-destructive text-sm"
                      role="alert"
                    >
                      {analysisError}
                    </p>
                  ) : null}
                </div>
              </footer>
            </div>
          </Card>
        </aside>

        <div
          ref={resultsRef}
          className={cn(
            "flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4",
            "md:min-h-0 md:h-full md:overflow-y-auto md:overscroll-y-contain md:[-webkit-overflow-scrolling:touch] md:p-4 md:pb-8"
          )}
        >
          {showResults ? (
            <section className="flex flex-col gap-3 overflow-visible border-b border-border pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                    Comparison range
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Compare deal to your past transactions.
                  </p>
                </div>
                {savedId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="min-h-11 shrink-0 sm:min-h-9"
                    onClick={() => setDeleteSavedOpen(true)}
                  >
                    Delete saved
                  </Button>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 shrink-0 gap-2 sm:min-h-9"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Upload className="size-4" aria-hidden />
                      Upload Transactions
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 shrink-0 sm:min-h-9"
                      disabled={!results || !lockedPeriod}
                      onClick={() => {
                        setSaveName("")
                        setSaveOpen(true)
                      }}
                    >
                      Save deal
                    </Button>
                  </div>
                )}
              </div>
              <DateRangePresetTabs
                variant="inline"
                presets={DEAL_ANALYZER_PERIOD_PRESETS}
                value={selectedPeriod}
                onValueChange={(v) => {
                  const next = v as DealAnalyzerPeriod
                  setSelectedPeriod(next)
                  runAnalysis(next)
                }}
              />
              {selectedPeriodSnapshot ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {selectedPeriodSnapshot.stats.transactions.toLocaleString()} trans ·{" "}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(selectedPeriodSnapshot.stats.totalSpend)}{" "}
                  spend
                </p>
              ) : null}
            </section>
          ) : null}
          <DealAnalyzerResultsView
            results={results}
            form={form}
            networkKey={form.network}
            locationComparisonRows={locationComparisonRows}
            analysisTransactionSlice={analysisTransactionSlice}
          />
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent fullViewportMobile showCloseButton className="gap-0">
          <DialogHeader>
            <DialogTitle>Save deal</DialogTitle>
            <DialogDescription>
              Stored on this device only (browser local storage).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Label htmlFor="save-deal-name">Deal name</Label>
            <Input
              id="save-deal-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name this analysis"
              className="min-h-11"
            />
          </div>
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveDeal}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent fullViewportMobile showCloseButton className="gap-0">
          <DialogHeader>
            <DialogTitle>Upload transactions</DialogTitle>
            <DialogDescription>
              Custom CSV uploads will replace the preset historical range for
              this comparison when enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                CSV requirements
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Include transaction date, station, gallons, price, spend, and
                fuel type so the analyzer can build a custom comparison
                baseline.
              </p>
            </div>
            <Button type="button" variant="outline" disabled className="min-h-11">
              Choose CSV
            </Button>
          </div>
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteSavedOpen} onOpenChange={setDeleteSavedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from this device only. You cannot undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={handleDeleteSaved}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
