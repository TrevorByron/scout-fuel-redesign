"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, LineChart, Plus, Upload, Zap } from "lucide-react"
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { getFuelTransactions } from "@/lib/mock-data"
import { getAllLocationKeys, getStateCodeFromLocationKey, normalizeStateCode } from "@/lib/location-utils"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerPeriod,
  DealAnalyzerResults,
  DealBrand,
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
  defaultBrand,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  BalanceScaleIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
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

function normalizeLoadedDealConfig(c: DealAnalyzerFormInput): DealAnalyzerFormInput {
  return normalizeDefRebateModeOnLoad(migrateDealConfigToCurrentShape(c))
}

function defaultForm(): DealAnalyzerFormInput {
  return defaultDealAnalyzerForm()
}

/**
 * One-line "Coverage, Pricing" recap of a tier, shown in the collapsed
 * accordion header so the user can scan their tier stack without expanding
 * each card. Both halves degrade independently when values are missing.
 */
function summarizeTier(tier: DealPricingTier): string {
  const parts: string[] = []

  if (tier.locationCoverage === "all_locations" || tier.locationCoverage === "") {
    parts.push("All states")
  } else if (tier.locationCoverage === "specific_states") {
    const first = tier.selectedStates[0]
      ? normalizeStateCode(tier.selectedStates[0])
      : ""
    const extra =
      tier.selectedStates.length > 1
        ? ` (+${tier.selectedStates.length - 1} more)`
        : ""
    parts.push(first ? `${first} (statewide)${extra}` : "Statewide")
  } else if (tier.locationCoverage === "specific_sites") {
    const k = tier.selectedLocationKeys[0]
    if (k) {
      const st = getStateCodeFromLocationKey(k)
      const catalog = getAllLocationKeys()
      const label = catalog.find((o) => o.key === k)?.display ?? "Location"
      const extra =
        tier.selectedLocationKeys.length > 1
          ? ` (+${tier.selectedLocationKeys.length - 1} more)`
          : ""
      parts.push(st ? `${st} · ${label}${extra}` : `${label}${extra}`)
    } else {
      parts.push("Specific location")
    }
  }

  if (tier.programType === "discount" || tier.programType === "rebate") {
    const isRebate = tier.programType === "rebate"
    const struct = tier.discountStructure
    if (struct === "retail_minus") {
      const cpg = Number.parseFloat(tier.discountAmountCentsPerGal || "0")
      const dollars = (cpg / 100).toFixed(2)
      parts.push(
        isRebate ? `$${dollars}/gal rebate` : `Retail minus $${dollars}/gal`
      )
    } else if (struct === "cost_plus") {
      const amt = Number.parseFloat(tier.costPlusAmountPerGal || "0").toFixed(2)
      parts.push(
        isRebate
          ? `Rack plus $${amt}/gal rebate`
          : `Rack price plus $${amt}/gal`
      )
    } else if (struct === "best_of") {
      parts.push(isRebate ? "Best of retail/cost rebate" : "Best of retail/cost")
    } else {
      parts.push(isRebate ? "Rebate" : "Discount")
    }
  } else if (tier.programType === "def_rebate") {
    const mode = tier.defRebatePricingMode
    const cpg = Number.parseFloat(tier.defRebateAmountCentsPerGal || "0")
    const dollars = (cpg / 100).toFixed(2)
    if (mode === "flat") {
      parts.push(`DEF rebate $${dollars}/gal`)
    } else if (mode === "retail_minus") {
      parts.push(`DEF retail minus $${dollars}/gal`)
    } else {
      parts.push("DEF rebate")
    }
  }

  return parts.length > 0 ? parts.join(", ") : "Not configured"
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
  const [addBrandOpen, setAddBrandOpen] = React.useState(false)
  const [pendingBrandNetwork, setPendingBrandNetwork] = React.useState<DealFuelNetwork | ("")>("")

  const resultsRef = React.useRef<HTMLDivElement>(null)
  const dealConfigScrollRef = React.useRef<HTMLDivElement>(null)
  const tierCardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [enteringTierIndex, setEnteringTierIndex] = React.useState<number | null>(null)
  const [tierAnimEpoch, setTierAnimEpoch] = React.useState(0)
  // Stable per-tier UI IDs (not persisted) so we can drive the accordion by ID
  // rather than index. New tiers always get a fresh ID so removing+re-adding
  // doesn't accidentally reuse an old expanded state.
  const tierIdCounterRef = React.useRef(0)
  const mintTierId = React.useCallback(() => {
    tierIdCounterRef.current += 1
    return `tier-${tierIdCounterRef.current}`
  }, [])
  // One string[] per brand; each string is a stable tier ID for accordion keying.
  const [brandTierIds, setBrandTierIds] = React.useState<string[][]>(() => {
    tierIdCounterRef.current += 1
    return [[`tier-${tierIdCounterRef.current}`]]
  })
  const [activeBrandIndex, setActiveBrandIndex] = React.useState(0)
  const [expandedTierIds, setExpandedTierIds] = React.useState<string[]>([])
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
    const freshBrandTierIds = normalizedForm.brands.map((b) =>
      b.tiers.map(() => mintTierId())
    )
    setBrandTierIds(freshBrandTierIds)
    setActiveBrandIndex(0)
    // Default: first tier expanded when there are multiple tiers in the first brand.
    const firstIds = freshBrandTierIds[0] ?? []
    setExpandedTierIds(firstIds.length > 1 ? [firstIds[0]] : [])
    setResults(entry.results)
    const period = normalizeDealAnalyzerPeriod(entry.periodUsed)
    setLockedPeriod(period)
    setSelectedPeriod(period)
    setShowResults(true)
    setAnalysisError(null)
    setLastCalculatedFormSignature(JSON.stringify(normalizedForm))
  }, [savedId, mintTierId])

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
    const activeTierCount = form.brands[activeBrandIndex]?.tiers.length ?? 0
    tierCardRefs.current.splice(activeTierCount)
  }, [form.brands, activeBrandIndex])

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

  const allTiers = React.useMemo(
    () => form.brands.flatMap((b) => b.tiers),
    [form.brands]
  )

  const periodSnapshots = React.useMemo(() => {
    const anchor = anchorRef.current
    return DEAL_ANALYZER_PERIOD_PRESETS.map((p) => ({
      id: p.value,
      label: p.label,
      stats: summarizePeriod(allTransactions, p.value, allTiers, anchor),
    }))
  }, [allTransactions, allTiers])

  const selectedPeriodSnapshot = React.useMemo(
    () => periodSnapshots.find((s) => s.id === selectedPeriod),
    [periodSnapshots, selectedPeriod]
  )

  const analysisTransactionSlice = React.useMemo(() => {
    if (!results || !lockedPeriod) return []
    const range = resolvePeriodRange(lockedPeriod, anchorRef.current)
    const inRange = filterTransactionsInRange(allTransactions, range)
    return filterTransactionsByDealTiers(inRange, allTiers)
  }, [allTransactions, results, lockedPeriod, allTiers])

  const locationComparisonRows = React.useMemo(() => {
    if (!results || analysisTransactionSlice.length === 0) return []
    return buildLocationComparisonRows(
      analysisTransactionSlice,
      form,
      results
    )
  }, [analysisTransactionSlice, form, results])

  const canCalculate =
    form.brands.length > 0 &&
    form.brands.every((brand) => {
      if (brand.network === "") return false
      if (brand.tiers.length === 0) return false
      return brand.tiers.every((tier) => {
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
    })
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
      const currentAllTiers = form.brands.flatMap((b) => b.tiers)
      const baseline = aggregateBaselineForDealTiers(slice, currentAllTiers)

      if (baseline.transactions === 0) {
        setResults(null)
        setShowResults(false)
        setMobileDealStep("details")
        setAnalysisError(
          "No purchases in this period match your rule program types. Pick another window or adjust rules."
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

  function patchBrand(brandIndex: number, patch: Partial<DealBrand>) {
    setForm((f) => ({
      ...f,
      brands: f.brands.map((b, i) => (i === brandIndex ? { ...b, ...patch } : b)),
    }))
  }

  function patchTier(brandIndex: number, tierIndex: number, patch: Partial<DealPricingTier>) {
    setForm((f) => ({
      ...f,
      brands: f.brands.map((b, bi) =>
        bi === brandIndex
          ? { ...b, tiers: b.tiers.map((t, ti) => (ti === tierIndex ? { ...t, ...patch } : t)) }
          : b
      ),
    }))
  }

  function addTier() {
    if (enteringTierIndex !== null) return
    const bi = activeBrandIndex
    let newIndex = -1
    setForm((f) => {
      newIndex = f.brands[bi]?.tiers.length ?? 0
      return {
        ...f,
        brands: f.brands.map((b, i) =>
          i === bi ? { ...b, tiers: [...b.tiers, defaultPricingTier()] } : b
        ),
      }
    })
    const newTierId = mintTierId()
    setBrandTierIds((ids) =>
      ids.map((tierIds, i) => (i === bi ? [...tierIds, newTierId] : tierIds))
    )
    setExpandedTierIds([newTierId])
    if (newIndex >= 0) {
      setTierAnimEpoch((e) => e + 1)
      setEnteringTierIndex(newIndex)
    }
  }

  function removeTier(tierIndex: number) {
    setEnteringTierIndex(null)
    const bi = activeBrandIndex
    const currentTierIds = brandTierIds[bi] ?? []
    const removedId = currentTierIds[tierIndex]
    const remainingIds = currentTierIds.filter((_, i) => i !== tierIndex)
    setForm((f) => ({
      ...f,
      brands: f.brands.map((b, i) =>
        i === bi ? { ...b, tiers: b.tiers.filter((_, ti) => ti !== tierIndex) } : b
      ),
    }))
    setBrandTierIds((ids) =>
      ids.map((tierIds, i) => (i === bi ? tierIds.filter((_, ti) => ti !== tierIndex) : tierIds))
    )
    setExpandedTierIds((open) => {
      const filtered = removedId ? open.filter((id) => id !== removedId) : open
      if (filtered.length === 0 && remainingIds.length > 1) {
        return [remainingIds[0]]
      }
      return filtered
    })
  }

  function addBrand(network: DealFuelNetwork | "") {
    const newIndex = form.brands.length
    setForm((f) => ({ ...f, brands: [...f.brands, { ...defaultBrand(), network }] }))
    const newTierId = mintTierId()
    setBrandTierIds((ids) => [...ids, [newTierId]])
    setActiveBrandIndex(newIndex)
    setExpandedTierIds([])
    setEnteringTierIndex(null)
  }

  function removeBrand(brandIndex: number) {
    if (form.brands.length <= 1) return
    setForm((f) => ({ ...f, brands: f.brands.filter((_, i) => i !== brandIndex) }))
    setBrandTierIds((ids) => ids.filter((_, i) => i !== brandIndex))
    const newActive = brandIndex >= form.brands.length - 1 ? brandIndex - 1 : brandIndex
    setActiveBrandIndex(newActive)
    setExpandedTierIds([])
    setEnteringTierIndex(null)
  }

  function handleBrandSwitch(newIndex: number) {
    setActiveBrandIndex(newIndex)
    setEnteringTierIndex(null)
    const newTierIds = brandTierIds[newIndex] ?? []
    setExpandedTierIds(newTierIds.length > 1 ? [newTierIds[0]] : [])
  }

  const showMobileResultsPane = showResults && mobileDealStep === "results"
  /** Compact results: one page scroll under the header (avoid nested max-h + clip). */
  const mobileResultsDocumentScroll = isCompactLayout && showMobileResultsPane

  return (
    <>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-4 overflow-x-hidden px-4 py-4",
          mobileResultsDocumentScroll
            ? "max-lg:h-auto max-lg:min-h-0 max-lg:flex-none"
            : "min-h-0 flex-1",
          "lg:h-full lg:max-h-[calc(100dvh-var(--header-height,3rem))] lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden lg:p-0"
        )}
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
                        Add deal details below
                      </p>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="min-h-9 min-w-9 shrink-0"
                          aria-label="Add another chain"
                          onClick={() => {
                            setPendingBrandNetwork("")
                            setAddBrandOpen(true)
                          }}
                        >
                          <Plus className="size-4" aria-hidden />
                        </Button>
                      }
                    />
                    <TooltipContent side="bottom">Add another chain</TooltipContent>
                  </Tooltip>
                </div>
              </header>

              {form.brands.length > 1 ? (
                <div className="shrink-0 border-b border-border px-4 py-2">
                  <div className="overflow-x-auto">
                    <Tabs
                      value={String(activeBrandIndex)}
                      onValueChange={(v) => handleBrandSwitch(Number(v))}
                    >
                      <TabsList className="h-9">
                        {form.brands.map((brand, i) => (
                          <TabsTrigger key={i} value={String(i)} className="text-xs">
                            {brand.network
                              ? (NETWORK_LABELS[brand.network as DealFuelNetwork] ?? `Chain ${i + 1}`)
                              : `Chain ${i + 1}`}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              ) : null}
              <div
                ref={dealConfigScrollRef}
                role="region"
                aria-label="Deal configuration"
                className="flex min-h-0 min-w-0 flex-1 flex-col basis-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
              >
                <div className="flex flex-col gap-4 p-4 pb-8">
              {(() => {
                const safeBrandIndex = Math.min(activeBrandIndex, form.brands.length - 1)
                const activeBrand = form.brands[safeBrandIndex] ?? form.brands[0]
                const activeTierIds = brandTierIds[safeBrandIndex] ?? []
                const isMultiBrand = form.brands.length > 1
                return (
              <>
              {!isMultiBrand ? (
                <>
                <div className="flex shrink-0 flex-col gap-2">
                  <Field>
                    <FieldLabel htmlFor="deal-chain">
                      Which fuel chain?
                    </FieldLabel>
                    <Select
                      value={activeBrand.network || undefined}
                      onValueChange={(v) =>
                        patchBrand(safeBrandIndex, { network: v as DealFuelNetwork })
                      }
                    >
                      <SelectTrigger
                        id="deal-chain"
                        className="min-h-11 w-full sm:min-h-9"
                      >
                        <SelectValue placeholder="Select chain">
                          {(v) =>
                            v && NETWORK_LABELS[v as DealFuelNetwork]
                              ? NETWORK_LABELS[v as DealFuelNetwork]
                              : "Select chain"}
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
                </>
              ) : null}

              <div className="flex flex-col gap-3">
                {activeBrand.tiers.length > 1 ? (
                  <AccordionPrimitive.Root
                    value={expandedTierIds}
                    onValueChange={(v) => setExpandedTierIds(v as string[])}
                    multiple={false}
                    className="flex flex-col gap-3"
                  >
                    {activeBrand.tiers.map((tier, i) => {
                      const motionOk =
                        typeof window === "undefined" ||
                        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      const isEntering = enteringTierIndex === i && motionOk
                      const tierId = activeTierIds[i] ?? `tier-fallback-${i}`
                      return (
                        <DealAnalyzerTierEnterShell
                          key={tierId}
                          shellRef={(el) => {
                            tierCardRefs.current[i] = el
                          }}
                          isEntering={isEntering}
                          motionOk={motionOk}
                          animEpoch={tierAnimEpoch}
                        >
                          <AccordionPrimitive.Item
                            value={tierId}
                            className="overflow-hidden rounded-lg border border-border bg-muted/20"
                          >
                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <AccordionPrimitive.Header className="flex min-w-0 flex-1">
                                <AccordionPrimitive.Trigger
                                  className="group/tier-trigger flex min-h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                  aria-label={`Toggle Rule ${i + 1} details`}
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <span className="text-sm font-semibold text-foreground">
                                      Rule {i + 1}
                                    </span>
                                    <span className="truncate text-xs leading-snug text-muted-foreground group-aria-expanded/tier-trigger:hidden">
                                      {summarizeTier(tier)}
                                    </span>
                                  </div>
                                  <HugeiconsIcon
                                    icon={ArrowDown01Icon}
                                    strokeWidth={2}
                                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/tier-trigger:rotate-180"
                                    aria-hidden
                                  />
                                </AccordionPrimitive.Trigger>
                              </AccordionPrimitive.Header>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="min-h-11 min-w-11 shrink-0 text-destructive hover:text-destructive"
                                      aria-label="Remove rule"
                                      onClick={() => removeTier(i)}
                                    >
                                      <HugeiconsIcon
                                        icon={Delete02Icon}
                                        strokeWidth={2}
                                        className="size-4"
                                        aria-hidden
                                      />
                                    </Button>
                                  }
                                />
                                <TooltipContent side="bottom">Remove rule</TooltipContent>
                              </Tooltip>
                            </div>
                            <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
                              <div className="h-(--accordion-panel-height) px-3 pb-3 data-ending-style:h-0 data-starting-style:h-0">
                                <DealAnalyzerTierFields
                                  tierIndex={i}
                                  tier={tier}
                                  showTierChrome={false}
                                  fuelNetwork={activeBrand.network}
                                  locationOptions={locationSelectOptions}
                                  onPatch={(p) => patchTier(safeBrandIndex, i, p)}
                                  canRemove={false}
                                />
                              </div>
                            </AccordionPrimitive.Panel>
                          </AccordionPrimitive.Item>
                        </DealAnalyzerTierEnterShell>
                      )
                    })}
                  </AccordionPrimitive.Root>
                ) : (
                  activeBrand.tiers.map((tier, i) => {
                    const motionOk =
                      typeof window === "undefined" ||
                      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    const isEntering = enteringTierIndex === i && motionOk
                    const tierId = activeTierIds[i] ?? `tier-fallback-${i}`
                    return (
                      <DealAnalyzerTierEnterShell
                        key={tierId}
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
                          showTierChrome={false}
                          fuelNetwork={activeBrand.network}
                          locationOptions={locationSelectOptions}
                          onPatch={(p) => patchTier(safeBrandIndex, i, p)}
                          canRemove={false}
                        />
                      </DealAnalyzerTierEnterShell>
                    )
                  })
                )}
                <Separator className="bg-border/70" aria-hidden />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  disabled={enteringTierIndex !== null}
                  onClick={addTier}
                >
                  Add another rule
                </Button>
                {form.brands.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full text-destructive hover:text-destructive"
                    onClick={() => removeBrand(safeBrandIndex)}
                  >
                    Remove{activeBrand.network
                      ? ` ${NETWORK_LABELS[activeBrand.network as DealFuelNetwork] ?? "this chain"}`
                      : " this chain"}
                  </Button>
                ) : null}
              </div>
              </>
                )
              })()}
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
            "flex min-h-0 min-w-0 w-full flex-col gap-4",
            mobileResultsDocumentScroll
              ? "max-lg:flex-none max-lg:overflow-visible"
              : "flex-1",
            "lg:flex-1 lg:min-h-0 lg:h-full lg:overflow-y-auto lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch] lg:p-4 lg:pb-8",
            (!showResults || mobileDealStep === "details") && "max-lg:hidden",
            showMobileResultsPane &&
              !mobileResultsDocumentScroll &&
              "max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:[-webkit-overflow-scrolling:touch]"
          )}
        >
          {showResults ? (
            <section className="flex min-w-0 shrink-0 flex-col gap-3 overflow-x-hidden border-b border-border pb-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-1.5 sm:gap-2">
                  {showMobileResultsPane ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="lg:hidden size-9 max-sm:size-11 min-h-9 max-sm:min-h-11 shrink-0 self-start"
                            aria-label="Back to deal details"
                            onClick={() => setMobileDealStep("details")}
                          >
                            <ChevronLeft className="size-5 shrink-0" aria-hidden />
                          </Button>
                        }
                      />
                      <TooltipContent side="bottom">Back to deal details</TooltipContent>
                    </Tooltip>
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
                    className="h-9 min-h-9 max-sm:h-11 max-sm:min-h-11 shrink-0"
                    onClick={() => setDeleteSavedOpen(true)}
                  >
                    Delete
                  </Button>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="size-9 max-sm:size-11 min-h-9 max-sm:min-h-11 shrink-0"
                            aria-label="Upload transactions"
                            onClick={() => setUploadOpen(true)}
                          >
                            <Upload className="size-4" aria-hidden />
                          </Button>
                        }
                      />
                      <TooltipContent side="bottom">Upload transactions</TooltipContent>
                    </Tooltip>
                    <Button
                      type="button"
                      className="h-9 min-h-9 max-sm:h-11 max-sm:min-h-11 shrink-0"
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
            networkKey={form.brands.find((b) => b.network !== "")?.network ?? ""}
            locationComparisonRows={locationComparisonRows}
            analysisTransactionSlice={analysisTransactionSlice}
            className={
              mobileResultsDocumentScroll ? "max-lg:flex-none" : undefined
            }
          />
        </div>
      </div>

      <Dialog
        open={addBrandOpen}
        onOpenChange={(open) => {
          setAddBrandOpen(open)
          if (!open) setPendingBrandNetwork("")
        }}
      >
        <DialogContent fullViewportMobile showCloseButton className="gap-0">
          <DialogHeader>
            <DialogTitle>Add another chain</DialogTitle>
            <DialogDescription>
              Choose the fuel chain for this set of rules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            {(() => {
              const committedNetworks = new Set(
                form.brands.map((b) => b.network).filter(Boolean)
              )
              return (
                <Select
                  value={pendingBrandNetwork || undefined}
                  onValueChange={(v) => setPendingBrandNetwork(v as DealFuelNetwork)}
                >
                  <SelectTrigger className="min-h-11 w-full sm:min-h-9">
                    <SelectValue placeholder="Select chain">
                      {(v) =>
                        v && NETWORK_LABELS[v as DealFuelNetwork]
                          ? NETWORK_LABELS[v as DealFuelNetwork]
                          : "Select chain"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loves" disabled={committedNetworks.has("loves")}>Love&apos;s</SelectItem>
                    <SelectItem value="pilot-flying-j" disabled={committedNetworks.has("pilot-flying-j")}>Pilot Flying J</SelectItem>
                    <SelectItem value="ta-petro" disabled={committedNetworks.has("ta-petro")}>TA/Petro</SelectItem>
                    <SelectItem value="shell" disabled={committedNetworks.has("shell")}>Shell</SelectItem>
                    <SelectItem value="chevron" disabled={committedNetworks.has("chevron")}>Chevron</SelectItem>
                    <SelectItem value="ambest" disabled={committedNetworks.has("ambest")}>Ambest</SelectItem>
                    <SelectItem value="roadranger" disabled={committedNetworks.has("roadranger")}>RoadRanger</SelectItem>
                    <SelectItem value="other" disabled={committedNetworks.has("other")}>Other</SelectItem>
                  </SelectContent>
                </Select>
              )
            })()}
          </div>
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddBrandOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pendingBrandNetwork === ""}
              onClick={() => {
                addBrand(pendingBrandNetwork)
                setAddBrandOpen(false)
                setPendingBrandNetwork("")
              }}
            >
              Add chain
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
