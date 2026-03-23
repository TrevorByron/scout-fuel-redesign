"use client"

import * as React from "react"
import { getFuelTransactions } from "@/lib/mock-data"
import { getPilotRebateSummary } from "@/lib/rebate"
import { PilotRebateCard } from "@/components/pilot-rebate-card"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarMenuButton } from "@/components/ui/sidebar"
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
          <SidebarMenuButton
            className={cn(
              "h-auto min-h-[44px] w-full cursor-pointer flex-col items-stretch gap-1.5 py-2",
              "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            )}
            aria-label="Pilot rebate progress — click for details"
          />
        }
      >
        <span className="font-medium">Pilot rebate</span>
        {hasNextTier ? (
          <>
            <Progress
              value={progressPctToNextTier}
              className="h-2 bg-emerald-100/80 dark:bg-emerald-900/30"
            />
            <span
              className={cn(
                "text-[length:var(--text-2xs)] text-sidebar-foreground/70",
                "group-hover/menu-button:text-sidebar-accent-foreground/80",
                "group-data-open/menu-button:text-sidebar-accent-foreground/80"
              )}
            >
              {currentMonth.gallons.toLocaleString("en-US", { maximumFractionDigits: 0 })} gal · {daysLeftInMonth}d left
            </span>
          </>
        ) : (
          <span
            className={cn(
              "text-[length:var(--text-2xs)] text-sidebar-foreground/70",
              "group-hover/menu-button:text-sidebar-accent-foreground/80",
              "group-data-open/menu-button:text-sidebar-accent-foreground/80"
            )}
          >
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
