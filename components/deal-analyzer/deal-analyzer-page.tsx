"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, LineChart, Upload, Zap } from "lucide-react"
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
import { useDealAnalyzerHeaderNavSetter } from "@/components/deal-analyzer/deal-analyzer-header-nav"
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
import { useDealAnalyzerCompactLayout } from "@/hooks/use-deal-analyzer-compact-layout"
import { cn } from "@/lib/utils"

type MobileDealStep = "details" | "results"

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

/** Wraps each tier so enter animation can replay after remove/add (CSS won't re-fire otherwise). */
function DealAnalyzerTierEnterShell({
  children,
  shellRef,
  isEntering,
  motionOk,
  animEpoch,
}: {
  children: React.ReactNode
  shellRef: (el: HTMLDivElement | null) => void
  isEntering: boolean
  motionOk: boolean
  animEpoch: number
}) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)

  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el
      shellRef(el)
    },
    [shellRef]
  )

  React.useLayoutEffect(() => {
    if (!isEntering || !motionOk) return
    const el = innerRef.current
    if (!el) return
    el.classList.remove(
      "animate-in",
      "fade-in-0",
      "slide-in-from-bottom-4",
      "duration-300"
    )
    void el.getBoundingClientRect()
    el.classList.add(
      "animate-in",
      "fade-in-0",
      "slide-in-from-bottom-4",
      "duration-300"
    )
  }, [isEntering, motionOk, animEpoch])

  return (
    <div
      ref={setRefs}
      className={cn(
        isEntering &&
          motionOk &&
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
      )}
    >
      {children}
    </div>
  )
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
  const isCompactLayout = useDealAnalyzerCompactLayout()

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
  const dealConfigScrollRef = React.useRef<HTMLDivElement>(null)
  const tierCardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [enteringTierIndex, setEnteringTierIndex] = React.useState<number | null>(null)
  const [tierAnimEpoch, setTierAnimEpoch] = React.useState(0)
  const [mobileDealStep, setMobileDealStep] =
    React.useState<MobileDealStep>("details")
  const prevIsMobileRef = React.useRef<boolean | undefined>(undefined)
  const setHeaderNav = useDealAnalyzerHeaderNavSetter()

  React.useLayoutEffect(() => {
    if (!setHeaderNav) return
    setHeaderNav({
      compact: isCompactLayout,
      showResults,
      step: mobileDealStep,
      setStep: setMobileDealStep,
    })
    return () => {
      setHeaderNav(null)
    }
  }, [setHeaderNav, isCompactLayout, showResults, mobileDealStep])

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

  React.useEffect(() => {
    if (!savedId || !isCompactLayout) return
    setMobileDealStep("results")
  }, [savedId, isCompactLayout])

  React.useEffect(() => {
    const prev = prevIsMobileRef.current
    prevIsMobileRef.current = isCompactLayout
    if (prev === undefined) return
    // Crossing from wide to compact: keep results step if we have a run, else details.
    if (isCompactLayout && prev === false) {
      setMobileDealStep(showResults ? "results" : "details")
    }
  }, [isCompactLayout, showResults])

  const currentFormSignature = React.useMemo(() => JSON.stringify(form), [form])

  React.useLayoutEffect(() => {
    tierCardRefs.current.splice(form.tiers.length)
  }, [form.tiers.length])

  React.useLayoutEffect(() => {
    if (enteringTierIndex === null) return
    const idx = enteringTierIndex
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth"

    const scrollNewTierIntoConfigRegion = () => {
      const el = tierCardRefs.current[idx]
      const region = dealConfigScrollRef.current
      if (!el) return
      if (region && region.contains(el)) {
        const rr = region.getBoundingClientRect()
        const er = el.getBoundingClientRect()
        const offset = er.top - rr.top - 12
        region.scrollTo({
          top: region.scrollTop + offset,
          behavior,
        })
        return
      }
      el.scrollIntoView({ block: "start", behavior })
    }

    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(scrollNewTierIntoConfigRegion)
    })

    const clearMs = prefersReduced ? 0 : 320
    const t = window.setTimeout(() => {
      setEnteringTierIndex(null)
    }, clearMs)

    return () => {
      cancelAnimationFrame(outerRaf)
      cancelAnimationFrame(innerRaf)
      window.clearTimeout(t)
    }
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

  const showResultsCta =
    canCalculate && showResults && !hasUncalculatedChanges

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
        setMobileDealStep("details")
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
        setMobileDealStep("details")
        setAnalysisError("Could not compute this scenario. Check inputs.")
        return
      }

      setResults(computed)
      setLockedPeriod(period)
      setShowResults(true)
      setLastCalculatedFormSignature(currentFormSignature)
      if (isCompactLayout) {
        setMobileDealStep("results")
      }

      if (periodOverride === undefined && !isCompactLayout) {
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
    [allTransactions, currentFormSignature, form, isCompactLayout, selectedPeriod]
  )

  const goToResultsPane = React.useCallback(() => {
    if (isCompactLayout) {
      setMobileDealStep("results")
      return
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      })
    })
  }, [isCompactLayout])

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
    if (newIndex >= 0) {
      setTierAnimEpoch((e) => e + 1)
      setEnteringTierIndex(newIndex)
    }
  }

  function removeTier(index: number) {
    setEnteringTierIndex(null)
    setForm((f) => ({
      ...f,
      tiers: f.tiers.filter((_, i) => i !== index),
    }))
  }

  const showMobileResultsPane = showResults && mobileDealStep === "results"

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-visible px-4 py-4",
          "lg:min-h-0 lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden lg:p-0"
        )}
        style={DEAL_ANALYZER_SHELL_STYLE}
      >
        <aside
          className={cn(
            "flex min-h-0 min-w-0 w-full flex-col",
            "max-lg:min-h-0 max-lg:flex-1",
            "lg:max-w-xl lg:min-h-0 lg:h-full lg:min-w-[23.75rem] lg:w-[43%] lg:shrink-0 lg:self-stretch lg:p-4",
            showMobileResultsPane && "max-lg:hidden"
          )}
          aria-label="Deal details"
        >
          <Card className="gap-0 py-0 flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full lg:max-h-none lg:min-h-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg">
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
                      <h2 className="text-lg font-semibold tracking-tight lg:text-xl">
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
                ref={dealConfigScrollRef}
                role="region"
                aria-label="Deal configuration"
                className="flex min-h-0 min-w-0 flex-1 flex-col basis-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
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
                    <DealAnalyzerTierEnterShell
                      key={`tier-${i}`}
                      shellRef={(el) => {
                        tierCardRefs.current[i] = el
                      }}
                      isEntering={isEntering}
                      motionOk={motionOk}
                      animEpoch={tierAnimEpoch}
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
                    </DealAnalyzerTierEnterShell>
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
                  {form.tiers.length > 1 ? "Add deal tier" : "Add another rule"}
                </Button>
              </div>

                </div>
              </div>
              <footer
                className={cn(
                  "shrink-0 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm",
                  "max-lg:sticky max-lg:bottom-0 max-lg:z-10",
                  "lg:relative lg:z-auto lg:bg-background/20 lg:pb-4"
                )}
              >
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="min-h-11 w-full gap-2 sm:min-h-10"
                    disabled={
                      showResultsCta ? false : !canCalculate || !hasUncalculatedChanges
                    }
                    aria-label={
                      showResultsCta
                        ? "Show analysis results"
                        : "Calculate deal from your inputs"
                    }
                    onClick={() => {
                      if (showResultsCta) {
                        goToResultsPane()
                      } else {
                        runAnalysis()
                      }
                    }}
                  >
                    {showResultsCta ? (
                      <LineChart className="size-4" aria-hidden />
                    ) : (
                      <Zap className="size-4" aria-hidden />
                    )}
                    {showResultsCta ? "Show results" : "Calculate Deal"}
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
            "lg:min-h-0 lg:h-full lg:overflow-y-auto lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch] lg:p-4 lg:pb-8",
            (!showResults || mobileDealStep === "details") && "max-lg:hidden",
            showMobileResultsPane &&
              "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:[-webkit-overflow-scrolling:touch]"
          )}
        >
          {showResults ? (
            <section className="flex flex-col gap-3 overflow-visible border-b border-border pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-1.5 sm:gap-2">
                  {showMobileResultsPane ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="lg:hidden min-h-11 min-w-11 shrink-0 self-start sm:min-h-9 sm:min-w-9"
                      aria-label="Back to deal details"
                      onClick={() => setMobileDealStep("details")}
                    >
                      <ChevronLeft className="size-5 shrink-0" aria-hidden />
                    </Button>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight lg:text-xl">
                      Comparison range
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      Compare deal to your past transactions.
                    </p>
                  </div>
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
                      size="icon-sm"
                      className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
                      aria-label="Upload transactions"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Upload className="size-4" aria-hidden />
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
