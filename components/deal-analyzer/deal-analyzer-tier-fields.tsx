"use client"

import * as React from "react"
import type {
  DealDiscountStructure,
  DealFuelNetwork,
  DealPricingTier,
  DealProgramType,
  DefRebatePricingMode,
} from "@/lib/deal-analyzer-types"
import { Field, FieldLabel, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  filterLocationKeysByFuelNetwork,
  filterLocationKeysByState,
  getStateCodeFromLocationKey,
  normalizeStateCode,
} from "@/lib/location-utils"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const

/** First dropdown: all states vs one state code. */
const STATE_SELECT_ALL = "__all__"
/** Second dropdown: whole selected state (no specific site). */
const LOCATION_SELECT_STATEWIDE = "__statewide__"

/**
 * Single state code for the tier coverage UI. Legacy multi-state / multi-site uses the first
 * entry until the user edits.
 */
function deriveStateCodeForTierFields(tier: DealPricingTier): string {
  if (tier.locationCoverage === "all_locations") return STATE_SELECT_ALL
  if (tier.locationCoverage === "specific_states") {
    const s = tier.selectedStates[0]
    return s ? normalizeStateCode(s) : STATE_SELECT_ALL
  }
  if (tier.locationCoverage === "specific_sites") {
    const k = tier.selectedLocationKeys[0]
    if (k) {
      const fromKey = getStateCodeFromLocationKey(k)
      if (fromKey) return fromKey
    }
    const s = tier.selectedStates[0]
    return s ? normalizeStateCode(s) : STATE_SELECT_ALL
  }
  return STATE_SELECT_ALL
}

function deriveLocationSelectValue(
  tier: DealPricingTier,
  stateCode: string,
  filtered: { key: string; display: string }[]
): string {
  if (stateCode === STATE_SELECT_ALL) return LOCATION_SELECT_STATEWIDE
  if (tier.locationCoverage === "specific_sites") {
    const k = tier.selectedLocationKeys[0]
    if (k && filtered.some((o) => o.key === k)) return k
  }
  return LOCATION_SELECT_STATEWIDE
}

const DEAL_FORM_LEGEND_CLASS =
  "mb-0 flex w-fit items-center gap-2 text-foreground leading-snug select-none"

/** Strategy row for nested radio groups (no nested interactive controls inside the label). */
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
        "flex min-h-11 cursor-pointer rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/50",
        selected && "border-primary bg-accent shadow-sm",
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

function ProgramTypeCard({
  selected,
  children,
}: {
  selected: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border transition-colors",
        selected ? "border-primary bg-accent" : "hover:bg-muted/40"
      )}
    >
      {children}
    </div>
  )
}

function ProgramTypeSelectRow({
  id,
  value,
  title,
  subtitle,
}: {
  id: string
  value: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-3">
      <RadioGroupItem value={value} id={id} className="mt-0.5 shrink-0" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer space-y-0.5">
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground block text-xs font-normal">
          {subtitle}
        </span>
      </label>
    </div>
  )
}

function DiscountRebateStrategySection({
  tier,
  tierIndex,
  ariaScope,
  rebateLike,
  onPatch,
}: {
  tier: DealPricingTier
  tierIndex: number
  ariaScope: string
  rebateLike: boolean
  onPatch: (patch: Partial<DealPricingTier>) => void
}) {
  const id = (s: string) => `deal-tier-${tierIndex}-${s}`
  return (
    <div className="space-y-3 border-border border-t px-3 pb-3 pt-3">
      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
        <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
          Strategy
        </FieldLegend>
        <RadioGroup
          value={tier.discountStructure}
          onValueChange={(v) =>
            onPatch({ discountStructure: v as DealDiscountStructure })
          }
          aria-label={`${ariaScope} pricing strategy`}
          className="grid w-full grid-cols-1 gap-2 mb-4"
        >
          <RadioChoiceCard
            id={id("str-rm")}
            value="retail_minus"
            selected={tier.discountStructure === "retail_minus"}
            layout="inline"
          >
            <span className="font-medium">Retail minus</span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("str-cp")}
            value="cost_plus"
            selected={tier.discountStructure === "cost_plus"}
            layout="inline"
          >
            <span className="font-medium">Cost plus</span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("str-bo")}
            value="best_of"
            selected={tier.discountStructure === "best_of"}
            layout="stack"
          >
            <span className="font-medium">Best of</span>
            <span className="text-muted-foreground text-xs font-normal">
              Retail &amp; cost
            </span>
          </RadioChoiceCard>
        </RadioGroup>
      </fieldset>
      {tier.discountStructure === "retail_minus" ? (
        <div className="space-y-2">
          <Label htmlFor={id("disc")}>
            {rebateLike
              ? "Rebate amount (¢ per gallon)"
              : "Discount amount (¢ per gallon)"}
          </Label>
          <Input
            id={id("disc")}
            type="number"
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={tier.discountAmountCentsPerGal}
            onChange={(e) =>
              onPatch({ discountAmountCentsPerGal: e.target.value })
            }
          />
          <p className="text-muted-foreground text-xs">
            {rebateLike ? (
              <>
                Rebate paid: $
                {(Number.parseFloat(tier.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                /gal
              </>
            ) : (
              <>
                Retail price minus $
                {(Number.parseFloat(tier.discountAmountCentsPerGal || "0") / 100).toFixed(2)}
                /gal
              </>
            )}
          </p>
        </div>
      ) : tier.discountStructure === "cost_plus" ? (
        <div className="space-y-2">
          <Label htmlFor={id("cp")}>Cost plus amount ($ per gallon)</Label>
          <Input
            id={id("cp")}
            type="number"
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={tier.costPlusAmountPerGal}
            onChange={(e) => onPatch({ costPlusAmountPerGal: e.target.value })}
          />
          <p className="text-muted-foreground text-xs">
            Rack price plus $
            {Number.parseFloat(tier.costPlusAmountPerGal || "0").toFixed(2)}
            /gal
          </p>
        </div>
      ) : tier.discountStructure === "best_of" ? (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor={id("disc-bo")}>
              {rebateLike
                ? "Rebate amount (¢ per gallon)"
                : "Discount amount (¢ per gallon)"}
            </Label>
            <Input
              id={id("disc-bo")}
              type="number"
              step="0.01"
              inputMode="decimal"
              className="min-h-11"
              value={tier.discountAmountCentsPerGal}
              onChange={(e) =>
                onPatch({ discountAmountCentsPerGal: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("cp-bo")}>Cost plus amount ($ per gallon)</Label>
            <Input
              id={id("cp-bo")}
              type="number"
              step="0.01"
              inputMode="decimal"
              className="min-h-11"
              value={tier.costPlusAmountPerGal}
              onChange={(e) =>
                onPatch({ costPlusAmountPerGal: e.target.value })
              }
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Analysis uses whichever structure yields the better price for your baseline
            average.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function DefRebateExpandSection({
  tier,
  tierIndex,
  ariaScope,
  defRebateModeSelected,
  onPatch,
}: {
  tier: DealPricingTier
  tierIndex: number
  ariaScope: string
  defRebateModeSelected: DefRebatePricingMode | ""
  onPatch: (patch: Partial<DealPricingTier>) => void
}) {
  const id = (s: string) => `deal-tier-${tierIndex}-${s}`
  return (
    <div className="space-y-3 border-border border-t px-3 pb-3 pt-3">
      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
        <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
          DEF rebate structure
        </FieldLegend>
        <RadioGroup
          value={defRebateModeSelected}
          onValueChange={(v) =>
            onPatch({ defRebatePricingMode: v as DefRebatePricingMode })
          }
          aria-label={`${ariaScope} DEF rebate structure`}
          className="grid w-full grid-cols-1 gap-2"
        >
          <RadioChoiceCard
            id={id("def-flat")}
            value="flat"
            selected={defRebateModeSelected === "flat"}
            layout="inline"
          >
            <span className="font-medium">Flat rebate</span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("def-retail-minus")}
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
          <Label htmlFor={id("def")}>
            {defRebateModeSelected === "retail_minus"
              ? "Retail minus (¢ per gallon)"
              : "DEF rebate amount (¢ per gallon)"}
          </Label>
          <Input
            id={id("def")}
            type="number"
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={tier.defRebateAmountCentsPerGal}
            onChange={(e) =>
              onPatch({ defRebateAmountCentsPerGal: e.target.value })
            }
          />
          <p className="text-muted-foreground text-xs">
            {defRebateModeSelected === "retail_minus" ? (
              <>
                DEF pump retail minus $
                {(Number.parseFloat(tier.defRebateAmountCentsPerGal || "0") / 100).toFixed(2)}
                /gal
              </>
            ) : (
              <>
                DEF rebate: $
                {(Number.parseFloat(tier.defRebateAmountCentsPerGal || "0") / 100).toFixed(2)}
                /gal
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export interface DealAnalyzerTierFieldsProps {
  tierIndex: number
  tier: DealPricingTier
  /** Card + “Rule N” chrome only when the user has added a second rule. */
  showTierChrome: boolean
  /** Selected fuel chain for this brand; filters “Location in state” to that chain only. */
  fuelNetwork: DealFuelNetwork | ""
  locationOptions: { key: string; display: string }[]
  onPatch: (patch: Partial<DealPricingTier>) => void
  onRemove?: () => void
  canRemove: boolean
}

export function DealAnalyzerTierFields({
  tierIndex,
  tier,
  showTierChrome,
  fuelNetwork,
  locationOptions,
  onPatch,
  onRemove,
  canRemove,
}: DealAnalyzerTierFieldsProps) {
  const id = (s: string) => `deal-tier-${tierIndex}-${s}`
  const ariaScope = showTierChrome ? `Rule ${tierIndex + 1}` : "Deal"
  const defRebateModeSelected =
    tier.defRebatePricingMode === "flat" ||
    tier.defRebatePricingMode === "retail_minus"
      ? tier.defRebatePricingMode
      : ""

  const stateSelectValue = React.useMemo(
    () => deriveStateCodeForTierFields(tier),
    [tier.locationCoverage, tier.selectedStates, tier.selectedLocationKeys]
  )

  const filteredLocationOptions = React.useMemo(() => {
    if (stateSelectValue === STATE_SELECT_ALL) return []
    const inState = filterLocationKeysByState(locationOptions, stateSelectValue)
    return filterLocationKeysByFuelNetwork(inState, fuelNetwork)
  }, [locationOptions, stateSelectValue, fuelNetwork])

  React.useEffect(() => {
    if (stateSelectValue === STATE_SELECT_ALL) return
    if (tier.locationCoverage !== "specific_sites") return
    const k = tier.selectedLocationKeys[0]
    if (!k) return
    if (filteredLocationOptions.some((o) => o.key === k)) return
    const sc = normalizeStateCode(stateSelectValue)
    onPatch({
      locationCoverage: "specific_states",
      selectedStates: [sc],
      selectedLocationKeys: [],
    })
  }, [
    tier.locationCoverage,
    tier.selectedLocationKeys,
    filteredLocationOptions,
    stateSelectValue,
    fuelNetwork,
    onPatch,
  ])

  const locationInnerValue = React.useMemo(
    () =>
      deriveLocationSelectValue(tier, stateSelectValue, filteredLocationOptions),
    [
      tier.locationCoverage,
      tier.selectedLocationKeys,
      stateSelectValue,
      filteredLocationOptions,
    ]
  )

  const secondSelectValue =
    stateSelectValue === STATE_SELECT_ALL ? undefined : locationInnerValue

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        showTierChrome && "rounded-lg border border-border bg-muted/20 p-3"
      )}
    >
      {showTierChrome ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Rule {tierIndex + 1}
          </h3>
          {canRemove && onRemove ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                    aria-label="Remove rule"
                    onClick={onRemove}
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
          ) : null}
        </div>
      ) : null}

      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
        <FieldLegend
          variant="label"
          className={cn(DEAL_FORM_LEGEND_CLASS, "mb-3")}
        >
          Program & pricing
        </FieldLegend>
        <RadioGroup
          value={tier.programType}
          onValueChange={(v) => {
            const next = v as DealProgramType
            onPatch({
              programType: next,
              defRebatePricingMode:
                next === "def_rebate"
                  ? tier.defRebatePricingMode === "flat" ||
                    tier.defRebatePricingMode === "retail_minus"
                    ? tier.defRebatePricingMode
                    : "flat"
                  : "",
            })
          }}
          aria-label={`${ariaScope} program and pricing`}
          className="grid w-full grid-cols-1 gap-2"
        >
          <ProgramTypeCard selected={tier.programType === "discount"}>
            <ProgramTypeSelectRow
              id={id("prog-discount")}
              value="discount"
              title="Discount"
              subtitle="Off invoice"
            />
            {tier.programType === "discount" ? (
              <DiscountRebateStrategySection
                tier={tier}
                tierIndex={tierIndex}
                ariaScope={ariaScope}
                rebateLike={false}
                onPatch={onPatch}
              />
            ) : null}
          </ProgramTypeCard>
          <ProgramTypeCard selected={tier.programType === "rebate"}>
            <ProgramTypeSelectRow
              id={id("prog-rebate")}
              value="rebate"
              title="Rebate"
              subtitle="Paid later"
            />
            {tier.programType === "rebate" ? (
              <DiscountRebateStrategySection
                tier={tier}
                tierIndex={tierIndex}
                ariaScope={ariaScope}
                rebateLike
                onPatch={onPatch}
              />
            ) : null}
          </ProgramTypeCard>
          <ProgramTypeCard selected={tier.programType === "def_rebate"}>
            <ProgramTypeSelectRow
              id={id("prog-def")}
              value="def_rebate"
              title="DEF rebate"
              subtitle="DEF only"
            />
            {tier.programType === "def_rebate" ? (
              <DefRebateExpandSection
                tier={tier}
                tierIndex={tierIndex}
                ariaScope={ariaScope}
                defRebateModeSelected={defRebateModeSelected}
                onPatch={onPatch}
              />
            ) : null}
          </ProgramTypeCard>
        </RadioGroup>
      </fieldset>

      <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
        <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
          Location Coverage
        </FieldLegend>
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor={id("state-coverage")}>Coverage state</FieldLabel>
            <Select
              value={stateSelectValue}
              onValueChange={(v) => {
                if (v == null) return
                if (v === STATE_SELECT_ALL) {
                  onPatch({
                    locationCoverage: "all_locations",
                    selectedStates: [],
                    selectedLocationKeys: [],
                  })
                  return
                }
                onPatch({
                  locationCoverage: "specific_states",
                  selectedStates: [normalizeStateCode(v)],
                  selectedLocationKeys: [],
                })
              }}
            >
              <SelectTrigger
                id={id("state-coverage")}
                className="min-h-11 w-full sm:min-h-9"
                aria-label={`${ariaScope} coverage state`}
              >
                <SelectValue placeholder="Coverage state">
                  {(val) =>
                    val === STATE_SELECT_ALL || !val ? "All states" : String(val)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STATE_SELECT_ALL}>All states</SelectItem>
                {US_STATES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {stateSelectValue !== STATE_SELECT_ALL ? (
            <Field>
              <FieldLabel htmlFor={id("location-in-state")}>Location in state</FieldLabel>
              <Select
                value={secondSelectValue}
                onValueChange={(v) => {
                  if (v == null) return
                  const sc = normalizeStateCode(stateSelectValue)
                  if (v === LOCATION_SELECT_STATEWIDE) {
                    onPatch({
                      locationCoverage: "specific_states",
                      selectedStates: [sc],
                      selectedLocationKeys: [],
                    })
                    return
                  }
                  onPatch({
                    locationCoverage: "specific_sites",
                    selectedStates: [],
                    selectedLocationKeys: [v],
                  })
                }}
              >
                <SelectTrigger
                  id={id("location-in-state")}
                  className="min-h-11 w-full sm:min-h-9"
                  aria-label={`${ariaScope} location in state`}
                >
                  <SelectValue placeholder="Select location (optional)">
                    {(val) => {
                      if (!val || val === LOCATION_SELECT_STATEWIDE) {
                        return `All stops in ${stateSelectValue}`
                      }
                      const row = filteredLocationOptions.find((o) => o.key === val)
                      return row?.display ?? String(val)
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LOCATION_SELECT_STATEWIDE}>
                    All stops in {stateSelectValue}
                  </SelectItem>
                  {filteredLocationOptions.map((loc) => (
                    <SelectItem key={loc.key} value={loc.key}>
                      {loc.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>
      </fieldset>

    </div>
  )
}
