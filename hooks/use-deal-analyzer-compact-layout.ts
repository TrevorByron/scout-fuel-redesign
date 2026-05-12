import * as React from "react"

/** Matches Tailwind `lg` — stacked deal analyzer below this width (tablet & phone). */
export const DEAL_ANALYZER_LAYOUT_MIN_PX = 1024

const compactMediaQuery = `(max-width: ${DEAL_ANALYZER_LAYOUT_MIN_PX - 1}px)`

function subscribeCompact(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }
  const mql = window.matchMedia(compactMediaQuery)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshotCompact(): boolean {
  if (typeof window === "undefined") return true
  return window.matchMedia(compactMediaQuery).matches
}

/** Prefer stacked / step UX (matches `max-lg:` in deal analyzer styles). */
function getServerSnapshotCompact(): boolean {
  return true
}

export function useDealAnalyzerCompactLayout() {
  return React.useSyncExternalStore(
    subscribeCompact,
    getSnapshotCompact,
    getServerSnapshotCompact
  )
}
