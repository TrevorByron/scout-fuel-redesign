"use client"

import * as React from "react"

const MOBILE_MAX_PX = 767

function subscribe(callback: () => void) {
  const mqNarrow = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`)
  const mqCoarse = window.matchMedia("(pointer: coarse)")
  const onChange = () => {
    callback()
  }
  mqNarrow.addEventListener("change", onChange)
  mqCoarse.addEventListener("change", onChange)
  return () => {
    mqNarrow.removeEventListener("change", onChange)
    mqCoarse.removeEventListener("change", onChange)
  }
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches ||
    window.matchMedia("(pointer: coarse)").matches
  )
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * True when the map+sheet layout should use mobile touch behavior: narrow
 * viewport and/or coarse pointer (phones, many tablets, touch laptops).
 * Prefer this over useIsMobile alone for programmatic sheet scroll on iOS.
 */
export function useTouchSheetScrollEnabled(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
