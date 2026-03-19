"use client"

import * as React from "react"
import { getFuelTransactions } from "@/lib/mock-data"
import { getPilotRebateSummary } from "@/lib/rebate"
import { PilotRebateCard } from "@/components/pilot-rebate-card"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function PilotRebateSidebarProgress() {
  const pilotRebateSummary = React.useMemo(
    () => getPilotRebateSummary(getFuelTransactions(), new Date()),
    []
  )

  const { currentMonth, nextTier, daysLeftInMonth, progressPctToNextTier } =
    pilotRebateSummary
  const hasNextTier = !!nextTier

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full min-h-[44px] cursor-pointer flex-col gap-1.5 rounded-[calc(var(--radius-sm)+2px)] p-2 text-left text-xs",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            )}
            aria-label="Pilot rebate progress — click for details"
          />
        }
      >
        <span className="font-medium text-sidebar-foreground">Pilot rebate</span>
        {hasNextTier ? (
          <>
            <Progress
              value={progressPctToNextTier}
              className="h-2 bg-emerald-100/80 dark:bg-emerald-900/30"
            />
            <span className="text-[length:var(--text-2xs)] text-sidebar-foreground/70">
              {currentMonth.gallons.toLocaleString("en-US", { maximumFractionDigits: 0 })} gal · {daysLeftInMonth}d left
            </span>
          </>
        ) : (
          <span className="text-[length:var(--text-2xs)] text-sidebar-foreground/70">
            On track · {daysLeftInMonth}d left
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-[min(90vw,22rem)] p-2"
      >
        <PilotRebateCard summary={pilotRebateSummary} className="border-0 shadow-none" />
      </PopoverContent>
    </Popover>
  )
}
