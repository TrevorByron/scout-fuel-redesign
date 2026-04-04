"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** Apply to the page root on views that use `DateRangePresetTabs` so content clears the fixed bar on viewports below `md`. */
export const DATE_RANGE_PRESET_BAR_PADDING = "max-md:pb-28"

const MAX_MD_MQ = "(max-width: 767px)"

function subscribeMaxMd(onStoreChange: () => void) {
  const mq = window.matchMedia(MAX_MD_MQ)
  mq.addEventListener("change", onStoreChange)
  return () => mq.removeEventListener("change", onStoreChange)
}

function getMaxMdSnapshot() {
  return window.matchMedia(MAX_MD_MQ).matches
}

function getServerMaxMdSnapshot() {
  return false
}

const triggerClassName =
  "text-sm font-normal px-2 data-[active]:bg-primary data-[active]:text-primary-foreground"

const tabsListDesktopClassName =
  "h-10 min-h-10 group-data-horizontal/tabs:h-10 bg-card text-card-foreground"

const tabsListMobileClassName =
  "h-10 min-h-10 group-data-horizontal/tabs:h-10 w-full max-w-md bg-card text-card-foreground rounded-lg border border-border shadow-[0_-20px_56px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_-20px_56px_-10px_rgba(0,0,0,0.5)]"

export type DateRangePresetTabsProps = {
  value: string
  onValueChange: (value: string) => void
}

export function DateRangePresetTabs({ value, onValueChange }: DateRangePresetTabsProps) {
  const isMaxMd = React.useSyncExternalStore(subscribeMaxMd, getMaxMdSnapshot, getServerMaxMdSnapshot)
  const [mounted, setMounted] = React.useState(false)

  React.useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const strip = (tabsListClassName: string) => (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className={tabsListClassName}>
        <TabsTrigger value="yesterday" className={triggerClassName}>
          Yesterday
        </TabsTrigger>
        <TabsTrigger value="week" className={triggerClassName}>
          This Week
        </TabsTrigger>
        <TabsTrigger value="month" className={triggerClassName}>
          This Month
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )

  const mobileDock = (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center",
        "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      )}
      data-slot="date-range-preset-dock"
    >
      {strip(tabsListMobileClassName)}
    </div>
  )

  return (
    <>
      <div className="hidden md:block">{strip(tabsListDesktopClassName)}</div>
      {mounted && isMaxMd && createPortal(mobileDock, document.body)}
    </>
  )
}
