"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Zap } from "lucide-react"
import { getFuelTransactions } from "@/lib/mock-data"
import type {
  DealAnalyzerFormInput,
  DealAnalyzerPeriod,
  DealAnalyzerResults,
  DealDiscountStructure,
  DefRebatePricingMode,
  DealFuelNetwork,
  DealProgramType,
  DealStateRestriction,
} from "@/lib/deal-analyzer-types"
import {
  buildLocationComparisonRows,
  computeDealAnalysis,
  filterTransactionsByDealProgram,
  filterTransactionsInRange,
  aggregateBaseline,
  NETWORK_LABELS,
  resolvePeriodRange,
  summarizePeriod,
} from "@/lib/deal-analyzer-engine"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { BalanceScaleIcon } from "@hugeicons/core-free-icons"
import { DateRangePresetTabs } from "@/components/date-range-preset-tabs"
import { cn } from "@/lib/utils"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const

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

function RadioChoiceCard({
  id,
  value,
  selected,
  layout = "stack",
  children,
}: {
  id: string
  value: string
  selected: boolean
  layout?: "inline" | "stack"
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer rounded-lg border border-input px-3 py-3 transition-colors hover:bg-muted/40",
        selected && "border-primary bg-accent",
        layout === "inline" ? "items-center" : ""
      )}
    >
      <div
        className={cn(
          "flex w-full gap-3",
          layout === "inline" ? "items-center" : "items-start"
        )}
      >
        <RadioGroupItem
          value={value}
          id={id}
          className={cn(layout === "stack" && "mt-0.5")}
        />
        <div
          className={cn(
            "min-w-0 flex-1",
            layout === "stack" && "flex flex-col gap-0.5"
          )}
        >
          {children}
        </div>
      </div>
    </label>
  )
}

/** Viewport height below header — same contract as `MapSheetLayout` aside shell. */
const DEAL_ANALYZER_SHELL_STYLE: React.CSSProperties = {
  height: "100%",
  maxHeight: "calc(100dvh - var(--header-height, 3rem))",
}

/** Align fieldset legends with `FieldLabel` / base `Label` typography. */
const DEAL_FORM_LEGEND_CLASS =
  "mb-0 flex w-fit items-center gap-2 text-foreground leading-snug select-none"

/** Older saved runs omitted `defRebatePricingMode`; keep them on the flat path. */
function normalizeLoadedDealConfig(c: DealAnalyzerFormInput): DealAnalyzerFormInput {
  const next = { ...c }
  if (
    next.programType === "def_rebate" &&
    next.defRebatePricingMode !== "flat" &&
    next.defRebatePricingMode !== "retail_minus"
  ) {
    next.defRebatePricingMode = "flat"
  }
  return next
}

function defaultForm(): DealAnalyzerFormInput {
  return {
    dealName: "",
    network: "",
    programType: "",
    discountStructure: "",
    discountAmountCentsPerGal: "",
    costPlusAmountPerGal: "",
    rebateAmountCentsPerGal: "",
    defRebateAmountCentsPerGal: "",
    defRebatePricingMode: "",
    stateRestriction: "",
    selectedStates: [],
  }
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

  const [form, setForm] = React.useState<DealAnalyzerFormInput>(defaultForm)
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<DealAnalyzerPeriod>("90")
  const [lockedPeriod, setLockedPeriod] =
    React.useState<DealAnalyzerPeriod | null>(null)

  const [results, setResults] = React.useState<DealAnalyzerResults | null>(null)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [showResults, setShowResults] = React.useState(false)

  const [deleteSavedOpen, setDeleteSavedOpen] = React.useState(false)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState("")

  const resultsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!savedId) return
    const entry = getSavedDealAnalysis(savedId)
    if (!entry) return
    setForm(normalizeLoadedDealConfig(entry.dealConfig))
    setResults(entry.results)
    const period = normalizeDealAnalyzerPeriod(entry.periodUsed)
    setLockedPeriod(period)
    setSelectedPeriod(period)
    setShowResults(true)
    setAnalysisError(null)
  }, [savedId])

  const periodSnapshots = React.useMemo(() => {
    const anchor = anchorRef.current
    return DEAL_ANALYZER_PERIOD_PRESETS.map((p) => ({
      id: p.value,
      label: p.label,
      stats: summarizePeriod(
        allTransactions,
        p.value,
        form.programType,
        anchor
      ),
    }))
  }, [allTransactions, form.programType])

  const selectedPeriodSnapshot = React.useMemo(
    () => periodSnapshots.find((s) => s.id === selectedPeriod),
    [periodSnapshots, selectedPeriod]
  )

  const analysisTransactionSlice = React.useMemo(() => {
    if (!results || !lockedPeriod) return []
    const range = resolvePeriodRange(lockedPeriod, anchorRef.current)
    const inRange = filterTransactionsInRange(allTransactions, range)
    return filterTransactionsByDealProgram(inRange, form.programType)
  }, [allTransactions, results, lockedPeriod, form.programType])

  const locationComparisonRows = React.useMemo(() => {
    if (!results || analysisTransactionSlice.length === 0) return []
    return buildLocationComparisonRows(
      analysisTransactionSlice,
      form,
      results
    )
  }, [analysisTransactionSlice, form, results])

  const canCalculate =
    form.network !== "" &&
    form.programType !== "" &&
    form.stateRestriction !== "" &&
    (form.programType === "discount" || form.programType === "rebate"
      ? form.discountStructure !== ""
      : true) &&
    (form.programType === "def_rebate"
      ? form.defRebatePricingMode === "flat" ||
        form.defRebatePricingMode === "retail_minus"
      : true)

  const strategyProgram =
    form.programType === "discount" || form.programType === "rebate"
  const rebateLike = form.programType === "rebate"
  const defRebateModeSelected =
    form.defRebatePricingMode === "flat" ||
    form.defRebatePricingMode === "retail_minus"
      ? form.defRebatePricingMode
      : ""

  const runAnalysis = React.useCallback(
    (periodOverride?: DealAnalyzerPeriod) => {
      const period = periodOverride ?? selectedPeriod
      setAnalysisError(null)
      const anchor = anchorRef.current
      const range = resolvePeriodRange(period, anchor)
      const slice = filterTransactionsInRange(allTransactions, range)
      const baseline = aggregateBaseline(slice, form.programType)

      if (baseline.transactions === 0) {
        setResults(null)
        setShowResults(false)
        setAnalysisError(
          form.programType === "def_rebate"
            ? "No DEF purchases in this period. Pick another window or program type."
            : "No fuel purchases in this period. Pick another time window."
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
    [allTransactions, form, selectedPeriod]
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

  function toggleState(st: string, checked: boolean) {
    setForm((f) => {
      const next = new Set(f.selectedStates)
      if (checked) next.add(st)
      else next.delete(st)
      return { ...f, selectedStates: [...next].sort() }
    })
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

              <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
                  Program type
                </FieldLegend>
                <RadioGroup
                  value={form.programType}
                  onValueChange={(v) =>
                    updateForm("programType", v as DealProgramType)
                  }
                  aria-label="Program type"
                  className="grid w-full grid-cols-1 gap-2"
                >
                  <RadioChoiceCard
                    id="deal-prog-discount"
                    value="discount"
                    selected={form.programType === "discount"}
                  >
                    <span className="font-medium">Discount</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      ¢/gal off
                    </span>
                  </RadioChoiceCard>
                  <RadioChoiceCard
                    id="deal-prog-rebate"
                    value="rebate"
                    selected={form.programType === "rebate"}
                  >
                    <span className="font-medium">Rebate</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      Paid later
                    </span>
                  </RadioChoiceCard>
                  <RadioChoiceCard
                    id="deal-prog-def"
                    value="def_rebate"
                    selected={form.programType === "def_rebate"}
                  >
                    <span className="font-medium">DEF rebate</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      DEF only
                    </span>
                  </RadioChoiceCard>
                </RadioGroup>
              </fieldset>

              {strategyProgram ? (
                <>
                  <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                    <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
                      Strategy
                    </FieldLegend>
                    <RadioGroup
                      value={form.discountStructure}
                      onValueChange={(v) =>
                        updateForm("discountStructure", v as DealDiscountStructure)
                      }
                      aria-label="Pricing strategy"
                      className="grid w-full grid-cols-1 gap-2"
                    >
                      <RadioChoiceCard
                        id="deal-better-retail"
                        value="retail_minus"
                        selected={form.discountStructure === "retail_minus"}
                        layout="inline"
                      >
                        <span className="font-medium">Retail minus</span>
                      </RadioChoiceCard>
                      <RadioChoiceCard
                        id="deal-better-cost"
                        value="cost_plus"
                        selected={form.discountStructure === "cost_plus"}
                        layout="inline"
                      >
                        <span className="font-medium">Cost plus</span>
                      </RadioChoiceCard>
                      <RadioChoiceCard
                        id="deal-better-best"
                        value="best_of"
                        selected={form.discountStructure === "best_of"}
                        layout="stack"
                      >
                        <span className="font-medium">Best of</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          Retail &amp; cost
                        </span>
                      </RadioChoiceCard>
                    </RadioGroup>
                  </fieldset>
                  {form.discountStructure === "retail_minus" ? (
                    <div className="space-y-2">
                      <Label htmlFor="discount-amt">
                        {rebateLike
                          ? "Rebate amount (¢ per gallon)"
                          : "Discount amount (¢ per gallon)"}
                      </Label>
                      <Input
                        id="discount-amt"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="min-h-11"
                        value={form.discountAmountCentsPerGal}
                        onChange={(e) =>
                          updateForm("discountAmountCentsPerGal", e.target.value)
                        }
                      />
                      <p className="text-muted-foreground text-xs">
                        {rebateLike ? (
                          <>
                            Rebate paid: $
                            {(Number.parseFloat(form.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                            /gal
                          </>
                        ) : (
                          <>
                            Retail price minus $
                            {(Number.parseFloat(form.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                            /gal
                          </>
                        )}
                      </p>
                    </div>
                  ) : form.discountStructure === "cost_plus" ? (
                    <div className="space-y-2">
                      <Label htmlFor="cost-plus">Cost plus amount ($ per gallon)</Label>
                      <Input
                        id="cost-plus"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="min-h-11"
                        value={form.costPlusAmountPerGal}
                        onChange={(e) =>
                          updateForm("costPlusAmountPerGal", e.target.value)
                        }
                      />
                      <p className="text-muted-foreground text-xs">
                        Rack price plus $
                        {Number.parseFloat(form.costPlusAmountPerGal || "0").toFixed(2)}
                        /gal
                      </p>
                    </div>
                  ) : form.discountStructure === "best_of" ? (
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="discount-amt-best">
                          {rebateLike
                            ? "Rebate amount (¢ per gallon)"
                            : "Discount amount (¢ per gallon)"}
                        </Label>
                        <Input
                          id="discount-amt-best"
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="min-h-11"
                          value={form.discountAmountCentsPerGal}
                          onChange={(e) =>
                            updateForm("discountAmountCentsPerGal", e.target.value)
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          {rebateLike ? (
                            <>
                              Rebate paid: $
                              {(Number.parseFloat(form.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                              /gal
                            </>
                          ) : (
                            <>
                              Retail price minus $
                              {(Number.parseFloat(form.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                              /gal
                            </>
                          )}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost-plus-best">Cost plus amount ($ per gallon)</Label>
                        <Input
                          id="cost-plus-best"
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="min-h-11"
                          value={form.costPlusAmountPerGal}
                          onChange={(e) =>
                            updateForm("costPlusAmountPerGal", e.target.value)
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          Rack price plus $
                          {Number.parseFloat(form.costPlusAmountPerGal || "0").toFixed(2)}
                          /gal
                        </p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Analysis uses whichever structure yields the better price for your baseline
                        average.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}

              {form.programType === "def_rebate" ? (
                <>
                  <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                    <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
                      DEF rebate structure
                    </FieldLegend>
                    <RadioGroup
                      value={defRebateModeSelected}
                      onValueChange={(v) =>
                        updateForm("defRebatePricingMode", v as DefRebatePricingMode)
                      }
                      aria-label="DEF rebate structure"
                      className="grid w-full grid-cols-1 gap-2"
                    >
                      <RadioChoiceCard
                        id="deal-def-flat"
                        value="flat"
                        selected={defRebateModeSelected === "flat"}
                        layout="inline"
                      >
                        <span className="font-medium">Flat rebate</span>
                      </RadioChoiceCard>
                      <RadioChoiceCard
                        id="deal-def-retail-minus"
                        value="retail_minus"
                        selected={defRebateModeSelected === "retail_minus"}
                        layout="inline"
                      >
                        <span className="font-medium">Retail minus</span>
                      </RadioChoiceCard>
                    </RadioGroup>
                  </fieldset>
                  {defRebateModeSelected !== "" ? (
                    <div className="space-y-2">
                      <Label htmlFor="def-rebate">
                        {defRebateModeSelected === "retail_minus"
                          ? "Retail minus (¢ per gallon)"
                          : "DEF rebate amount (¢ per gallon)"}
                      </Label>
                      <Input
                        id="def-rebate"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="min-h-11"
                        value={form.defRebateAmountCentsPerGal}
                        onChange={(e) =>
                          updateForm("defRebateAmountCentsPerGal", e.target.value)
                        }
                      />
                      <p className="text-muted-foreground text-xs">
                        {defRebateModeSelected === "retail_minus" ? (
                          <>
                            DEF pump retail minus $
                            {(Number.parseFloat(form.defRebateAmountCentsPerGal || "0") / 100).toFixed(2)}
                            /gal
                          </>
                        ) : (
                          <>
                            DEF rebate: $
                            {(Number.parseFloat(form.defRebateAmountCentsPerGal || "0") / 100).toFixed(2)}
                            /gal
                          </>
                        )}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}

              <Separator className="bg-border/70" aria-hidden />

              <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
                <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
                  State coverage
                </FieldLegend>
                <RadioGroup
                  value={form.stateRestriction}
                  onValueChange={(v) =>
                    updateForm("stateRestriction", v as DealStateRestriction)
                  }
                  aria-label="State coverage"
                  className="grid w-full grid-cols-1 gap-2"
                >
                  <RadioChoiceCard
                    id="deal-states-all"
                    value="all"
                    selected={form.stateRestriction === "all"}
                    layout="inline"
                  >
                    <span className="font-medium">All states</span>
                  </RadioChoiceCard>
                  <RadioChoiceCard
                    id="deal-states-specific"
                    value="specific"
                    selected={form.stateRestriction === "specific"}
                    layout="inline"
                  >
                    <span className="font-medium">Specific states</span>
                  </RadioChoiceCard>
                </RadioGroup>

                {form.stateRestriction === "specific" ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      {form.selectedStates.length} states selected
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
                      <div className="grid grid-cols-2 gap-2">
                        {US_STATES.map((code) => (
                          <label
                            key={code}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={form.selectedStates.includes(code)}
                              onCheckedChange={(c) =>
                                toggleState(code, c === true)
                              }
                            />
                            <span>{code}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </fieldset>

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
                    disabled={!canCalculate}
                    onClick={() => runAnalysis()}
                  >
                    <Zap className="size-4" aria-hidden />
                    Calculate impact
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
