"use client"

import * as React from "react"
import type {
  DealDiscountStructure,
  DealLocationCoverage,
  DealPricingTier,
  DealProgramType,
  DefRebatePricingMode,
} from "@/lib/deal-analyzer-types"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const

const DEAL_FORM_LEGEND_CLASS =
  "mb-0 flex w-fit items-center gap-2 text-foreground leading-snug select-none"

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

export interface DealAnalyzerTierFieldsProps {
  tierIndex: number
  tier: DealPricingTier
  /** Card + “Tier N” chrome only when the user has added a second tier. */
  showTierChrome: boolean
  locationOptions: { key: string; display: string }[]
  onPatch: (patch: Partial<DealPricingTier>) => void
  onRemove?: () => void
  canRemove: boolean
}

export function DealAnalyzerTierFields({
  tierIndex,
  tier,
  showTierChrome,
  locationOptions,
  onPatch,
  onRemove,
  canRemove,
}: DealAnalyzerTierFieldsProps) {
  const id = (s: string) => `deal-tier-${tierIndex}-${s}`
  const ariaScope = showTierChrome ? `Tier ${tierIndex + 1}` : "Deal"
  const programType = tier.programType
  const strategyProgram =
    programType === "discount" || programType === "rebate"
  const rebateLike = programType === "rebate"
  const defRebateModeSelected =
    tier.defRebatePricingMode === "flat" ||
    tier.defRebatePricingMode === "retail_minus"
      ? tier.defRebatePricingMode
      : ""

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
            Tier {tierIndex + 1}
          </h3>
          {canRemove && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              Remove tier
            </Button>
          ) : null}
        </div>
      ) : null}

      <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
        <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
          Location Coverage
        </FieldLegend>
        <RadioGroup
          value={tier.locationCoverage}
          onValueChange={(v) => {
            const next = v as DealLocationCoverage
            onPatch({
              locationCoverage: next,
              selectedStates: next === "specific_states" ? tier.selectedStates : [],
              selectedLocationKeys:
                next === "specific_sites" ? tier.selectedLocationKeys : [],
            })
          }}
          aria-label={`${ariaScope} location coverage`}
          className="grid w-full grid-cols-1 gap-2"
        >
          <RadioChoiceCard
            id={id("cov-all")}
            value="all_locations"
            selected={tier.locationCoverage === "all_locations"}
            layout="inline"
          >
            <span className="font-medium">All States</span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("cov-st")}
            value="specific_states"
            selected={tier.locationCoverage === "specific_states"}
            layout="inline"
          >
            <span className="font-medium">Specific State</span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("cov-site")}
            value="specific_sites"
            selected={tier.locationCoverage === "specific_sites"}
            layout="inline"
          >
            <span className="font-medium">Specific Locations</span>
          </RadioChoiceCard>
        </RadioGroup>

        {tier.locationCoverage === "specific_states" ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {tier.selectedStates.length} states selected
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
              <div className="grid grid-cols-2 gap-2">
                {US_STATES.map((code) => (
                  <label
                    key={code}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={tier.selectedStates.includes(code)}
                      onCheckedChange={(c) => {
                        const next = new Set(tier.selectedStates)
                        if (c === true) next.add(code)
                        else next.delete(code)
                        onPatch({ selectedStates: [...next].sort() })
                      }}
                    />
                    <span>{code}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tier.locationCoverage === "specific_sites" ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {tier.selectedLocationKeys.length} locations selected
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
              <div className="flex flex-col gap-2">
                {locationOptions.map((loc) => (
                  <label
                    key={loc.key}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={tier.selectedLocationKeys.includes(loc.key)}
                      onCheckedChange={(c) => {
                        const next = new Set(tier.selectedLocationKeys)
                        if (c === true) next.add(loc.key)
                        else next.delete(loc.key)
                        onPatch({ selectedLocationKeys: [...next].sort() })
                      }}
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1 break-words leading-snug">
                      {loc.display}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
        <FieldLegend variant="label" className={DEAL_FORM_LEGEND_CLASS}>
          Program type
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
          aria-label={`${ariaScope} program type`}
          className="grid w-full grid-cols-1 gap-2"
        >
          <RadioChoiceCard
            id={id("prog-discount")}
            value="discount"
            selected={tier.programType === "discount"}
          >
            <span className="font-medium">Discount</span>
            <span className="text-muted-foreground text-xs font-normal">
              ¢/gal off
            </span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("prog-rebate")}
            value="rebate"
            selected={tier.programType === "rebate"}
          >
            <span className="font-medium">Rebate</span>
            <span className="text-muted-foreground text-xs font-normal">
              Paid later
            </span>
          </RadioChoiceCard>
          <RadioChoiceCard
            id={id("prog-def")}
            value="def_rebate"
            selected={tier.programType === "def_rebate"}
          >
            <span className="font-medium">DEF rebate</span>
            <span className="text-muted-foreground text-xs font-normal">
              DEF only
            </span>
          </RadioChoiceCard>
        </RadioGroup>
      </fieldset>

      {tier.programType === "def_rebate" ? (
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
      ) : null}

      {strategyProgram ? (
        <>
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
              className="grid w-full grid-cols-1 gap-2"
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
                onChange={(e) =>
                  onPatch({ costPlusAmountPerGal: e.target.value })
                }
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
        </>
      ) : null}

      {programType === "def_rebate" ? (
        defRebateModeSelected !== "" ? (
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
        ) : null
      ) : null}

    </div>
  )
}
