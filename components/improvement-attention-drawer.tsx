"use client"

import * as React from "react"
import Link from "next/link"
import { driverNameToSlug, type DriverNeedingAttention } from "@/lib/driver-utils"
import { locationToSlug, type LocationListStats } from "@/lib/location-utils"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, InformationCircleIcon, UserGroupIcon, Location01Icon } from "@hugeicons/core-free-icons"
import { useIsMobile } from "@/hooks/use-mobile"

export type ImprovementAttentionSource = "compliance" | "missedSavings"

export interface ImprovementAttentionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drivers: DriverNeedingAttention[]
  locations: LocationListStats[]
  periodLabel: string
  /** Which card opened the drawer. Shows only the relevant metric explanation. */
  source: ImprovementAttentionSource
}

const periodBadgeLabel = (periodLabel: string) =>
  periodLabel === "today" ? "today" : periodLabel === "week" ? "this week" : periodLabel === "month" ? "this month" : "this period"

export function ImprovementAttentionDrawer({
  open,
  onOpenChange,
  drivers,
  locations,
  periodLabel,
  source,
}: ImprovementAttentionDrawerProps) {
  const isMobile = useIsMobile()
  const badgeLabel = periodBadgeLabel(periodLabel)
  const hasDrivers = drivers.length > 0
  const hasLocations = locations.length > 0
  const isEmpty = !hasDrivers && !hasLocations

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="flex min-h-0 flex-col overflow-hidden">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>Drivers and locations that need attention</DrawerTitle>
          <DrawerDescription>
            Focus on these to improve compliance and capture more savings.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {isEmpty ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No drivers or locations need attention in this period.
            </p>
          ) : hasDrivers && hasLocations ? (
            <Tabs defaultValue="drivers" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="drivers" className="flex-1 gap-1.5 text-xs">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                  Drivers ({drivers.length})
                </TabsTrigger>
                <TabsTrigger value="locations" className="flex-1 gap-1.5 text-xs">
                  <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                  Locations ({locations.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="drivers" className="mt-0">
                <div className="divide-y divide-border">
                  {drivers.map((driver, index) => (
                    <Link
                      key={driver.driverName}
                      href={`/drivers/${driverNameToSlug(driver.driverName)}`}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{driver.driverName}</span>
                            {driver.badStops > 0 && (
                              <Badge variant="destructive" className="text-[10px] font-normal">
                                {driver.badStops} bad stop{driver.badStops !== 1 ? "s" : ""} {badgeLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                          -${driver.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                        <span
                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          aria-hidden
                        >
                          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="locations" className="mt-0">
                <div className="divide-y divide-border">
                  {locations.map((loc, index) => (
                    <Link
                      key={loc.locationKey}
                      href={`/locations/${locationToSlug(loc.displayName)}`}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{loc.displayName}</span>
                            {loc.badStopsCount > 0 && (
                              <Badge variant="destructive" className="text-[10px] font-normal">
                                {loc.badStopsCount} bad stop{loc.badStopsCount !== 1 ? "s" : ""} {badgeLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                          -${loc.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                        <span
                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          aria-hidden
                        >
                          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          ) : hasDrivers ? (
            <div className="divide-y divide-border">
              {drivers.map((driver, index) => (
                <Link
                  key={driver.driverName}
                  href={`/drivers/${driverNameToSlug(driver.driverName)}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{driver.driverName}</span>
                        {driver.badStops > 0 && (
                          <Badge variant="destructive" className="text-[10px] font-normal">
                            {driver.badStops} bad stop{driver.badStops !== 1 ? "s" : ""} {badgeLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                      -${driver.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                    <span
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      aria-hidden
                    >
                      <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {locations.map((loc, index) => (
                <Link
                  key={loc.locationKey}
                  href={`/locations/${locationToSlug(loc.displayName)}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="tabular-nums text-muted-foreground w-5 shrink-0">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{loc.displayName}</span>
                        {loc.badStopsCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] font-normal">
                            {loc.badStopsCount} bad stop{loc.badStopsCount !== 1 ? "s" : ""} {badgeLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums font-medium text-red-600 dark:text-red-500">
                      -${loc.missedSavings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                    <span
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      aria-hidden
                    >
                      <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Card size="sm" className="mt-4 shrink-0">
            <CardContent className="flex gap-2 py-3">
              <HugeiconsIcon icon={InformationCircleIcon} className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <div className="min-w-0">
                {source === "compliance" && (
                  <p className="text-muted-foreground text-xs">
                    Compliance is the percentage of fill-ups at optimized locations—places that offer the best price for the route. A higher score means more drivers are fueling where they get the best price.
                  </p>
                )}
                {source === "missedSavings" && (
                  <p className="text-muted-foreground text-xs">
                    Missed savings is the dollar amount overpaid when drivers could have filled up at a cheaper location. It counts only fill-ups where a better-priced option was available on the route.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
