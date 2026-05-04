"use client"

import * as React from "react"
import { getFuelTransactions } from "@/lib/mock-data"
import { getCarrierRebateOverview } from "@/lib/rebate"
import { PilotRebateCard } from "@/components/pilot-rebate-card"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function formatUsd0(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

export function PilotRebateSidebarProgress() {
  const overview = React.useMemo(
    () => getCarrierRebateOverview(getFuelTransactions(), new Date()),
    []
  )

  const { totalMtdRebateDollars, programs, primaryProgramId } = overview
  const primary =
    primaryProgramId != null
      ? programs.find((p) => p.programId === primaryProgramId)
      : programs[0]
  const daysLeft = primary?.daysLeftInMonth ?? 0
  const showProgressBar = !!primary?.nextTier

  const programCount = programs.length
  const sublineParts = [
    `${formatUsd0(totalMtdRebateDollars)} MTD`,
    `${daysLeft}d left`,
    programCount > 1 ? `${programCount} programs` : null,
  ].filter(Boolean)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <SidebarMenuButton
            className="h-auto min-h-[44px] w-full cursor-pointer flex-col items-stretch gap-1.5 py-2"
            aria-label="Rebate summary — month-to-date totals, programs, and tier details"
          />
        }
      >
        <span className="font-medium">Rebates</span>
        {showProgressBar && primary ? (
          <>
            <Progress
              value={primary.progressPctToNextTier}
              data-rebate-progress=""
              className="h-2 bg-success/20 dark:bg-success/25"
            />
            <span className="text-[length:var(--text-2xs)] text-sidebar-foreground/75">
              {sublineParts.join(" · ")}
            </span>
          </>
        ) : (
          <span className="text-[length:var(--text-2xs)] text-sidebar-foreground/75">
            {sublineParts.join(" · ")}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className={cn("w-[min(90vw,22rem)] gap-0 overflow-visible p-0")}
      >
        <div
          className="max-h-[min(70vh,32rem)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-2"
        >
          <PilotRebateCard overview={overview} className="border-0 shadow-none" />
        </div>
      </PopoverContent>
    </Popover>
  )
}
