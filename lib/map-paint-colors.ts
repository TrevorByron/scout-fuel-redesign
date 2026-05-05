/**
 * MapLibre / canvas paint often cannot resolve `var(--token)`.
 * Keep these aligned with semantic colors in `app/globals.css`
 * (`--success`, `--warning`, `--destructive`, `--primary`, `--muted-foreground`).
 * When tokens change, update this file and `docs/design-system.md` if needed.
 */
export const mapPaint = {
  success: "#429f85",
  warning: "#eab308",
  destructive: "#ef4444",
  routeSelected: "#2563eb",
  routeAlt: "#94a3b8",
  connector: "#6366f1",
  /** Deal analyzer: modeled proposed stop is cheaper than baseline at this city */
  proposedBetter: "#3d8a72",
  /** Deal analyzer: modeled proposed stop is more expensive than baseline at this city */
  proposedWorse: "#c05252",
  /** Deal analyzer: baseline / current fuel stops (aligned with `routeAlt`) */
  laneBaseline: "#94a3b8",
} as const
