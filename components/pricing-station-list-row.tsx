"use client"

import Image from "next/image"
import type { RoutePricingStop } from "@/lib/along-route-stops"
import { getFuelChainLogoSrc } from "@/lib/fuel-chain-logos"
import { cn } from "@/lib/utils"

function chainInitials(chain: string): string {
  const cleaned = chain.replace(/[^a-zA-Z0-9\s]/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase().slice(0, 2)
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return chain.slice(0, 2).toUpperCase() || "SF"
}

export type PricingStationListRowProps = {
  stop: RoutePricingStop
  isBestPrice: boolean
}

const LOGO_BOX = "size-11 shrink-0 overflow-hidden rounded-md border border-border bg-card sm:size-10"

export function PricingStationListRow({ stop, isBestPrice }: PricingStationListRowProps) {
  const title = stop.stationName ?? stop.label
  const chain = stop.chain ?? stop.label.split("·")[0]?.trim() ?? "Fuel"
  const logoSrc = getFuelChainLogoSrc(chain)
  const miles =
    stop.milesFromSearchCenter != null
      ? `${stop.milesFromSearchCenter.toFixed(1)} mi from search`
      : stop.milesFromRouteStart != null
        ? `${stop.milesFromRouteStart.toFixed(1)} mi`
        : null
  const address = stop.addressLine ?? stop.label
  const metaLine = [miles, address].filter(Boolean).join(" · ")

  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-border py-3.5 pl-0 pr-0 last:border-0 last:pb-0 first:pt-3.5",
        isBestPrice && "bg-muted/30 -mx-2 px-2 rounded-md"
      )}
    >
      {logoSrc ? (
        <div className={cn(LOGO_BOX, "relative flex items-center justify-center bg-background p-1")} aria-hidden>
          <Image
            src={logoSrc}
            alt=""
            width={40}
            height={40}
            className="max-h-full max-w-full object-contain"
            unoptimized={logoSrc.endsWith(".svg")}
          />
        </div>
      ) : (
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-[10px] font-bold leading-tight text-foreground sm:size-10 sm:text-[10px]"
          aria-hidden
        >
          {chainInitials(chain)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">{metaLine}</p>
      </div>
      <div className="flex shrink-0 items-center text-right">
        <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
          ${stop.yourPrice.toFixed(2)}
        </p>
      </div>
    </li>
  )
}
