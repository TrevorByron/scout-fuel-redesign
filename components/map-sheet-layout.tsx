"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const shellStyle: React.CSSProperties = {
  height: "100%",
  maxHeight: "calc(100dvh - var(--header-height, 3rem))",
}

const MD_MIN_WIDTH = 768

function subscribeMdUp(callback: () => void) {
  const mq = window.matchMedia(`(min-width: ${MD_MIN_WIDTH}px)`)
  const onChange = () => {
    callback()
  }
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function getMdUpSnapshot(): boolean {
  return window.matchMedia(`(min-width: ${MD_MIN_WIDTH}px)`).matches
}

function getMdUpServerSnapshot(): boolean {
  return false
}

function useMdUp(): boolean {
  return React.useSyncExternalStore(
    subscribeMdUp,
    getMdUpSnapshot,
    getMdUpServerSnapshot
  )
}

export type MapSheetLayoutProps = {
  map: React.ReactNode
  /** e.g. optimizing overlay, floating chip (position absolute). */
  overlay?: React.ReactNode
  ariaLabel: string
  sidebarRef: React.RefObject<HTMLElement | null>
  formContentRef: React.RefObject<HTMLDivElement | null>
  cardClassName?: string
  cardProps?: React.HTMLAttributes<HTMLDivElement>
  /** Sets `data-slot` on the card wrapper (e.g. `"card"`). */
  cardDataSlot?: string
  children: React.ReactNode
}

/** Mobile-branch map: full width of main (edge-to-edge with inset), flush under header; bottom radius only. */
const mapBoxClassName = cn(
  "overflow-hidden bg-muted/15 h-[min(38vh,380px)] min-h-[168px]",
  "mx-0 w-full max-w-none rounded-t-none rounded-b-xl border-b border-border/50 ring-0"
)

/**
 * Shared map + sheet shell for Optimizer, Fuel Finder, Trips.
 *
 * - **Below `md`:** Single scroll column: sticky map (full width, flush under header),
 *   then sheet with negative margin so scrolling pulls the form **up over** the map.
 * - **`md` and up:** Full-bleed map with left column sheet.
 *
 * Layout mode uses `useSyncExternalStore` so only one `map` instance mounts per mode
 * (avoids two MapLibre instances when switching breakpoints).
 */
export function MapSheetLayout({
  map,
  overlay,
  ariaLabel,
  sidebarRef,
  formContentRef,
  cardClassName,
  cardProps,
  cardDataSlot,
  children,
}: MapSheetLayoutProps) {
  const isMdUp = useMdUp()

  const cardInner = (
    <div
      ref={formContentRef}
      data-slot={cardDataSlot}
      {...cardProps}
      className={cn(
        "relative z-10 flex w-full flex-col",
        /* shrink-0 on mobile only — on md+, flex-1 must shrink so inner overflow-y-auto gets a bounded height */
        !isMdUp && "shrink-0",
        isMdUp
          ? "min-h-0 max-h-none flex-1 overflow-hidden"
          : "min-h-[calc(100dvh-var(--header-height,3rem)-13rem)] overflow-visible rounded-t-xl shadow-md",
        cardClassName
      )}
    >
      {children}
    </div>
  )

  if (isMdUp) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden" style={shellStyle}>
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full">{map}</div>
        </div>
        {overlay}
        <aside
          ref={sidebarRef}
          className={cn(
            "pointer-events-auto absolute bottom-0 left-0 right-auto top-0 z-10 flex h-full min-h-0 w-full min-w-0 max-w-xl flex-col overflow-hidden overscroll-y-contain p-4 md:min-w-[23.75rem] md:w-[43%]"
          )}
          aria-label={ariaLabel}
        >
          {cardInner}
        </aside>
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={shellStyle}
    >
      {overlay}
      <aside
        ref={sidebarRef}
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          "pb-0",
          "pointer-events-auto"
        )}
        aria-label={ariaLabel}
      >
        <div className="sticky top-0 z-0 shrink-0 pt-0">
          <div className={mapBoxClassName}>
            <div className="h-full min-h-[140px] w-full">{map}</div>
          </div>
        </div>
        <div className="relative z-10 -mt-7 px-0 pb-0 pt-0">{cardInner}</div>
      </aside>
    </div>
  )
}
