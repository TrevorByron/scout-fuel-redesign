/**
 * MapLibre / canvas paint often cannot resolve `var(--token)`.
 * Keep these aligned with semantic colors in `app/globals.css`
 * (`--success`, `--warning`, `--destructive`, `--primary`, `--muted-foreground`).
 * When tokens change, update this file and `docs/design-system.md` if needed.
 */
export const mapPaint = {
  success: "#22c55e",
  warning: "#eab308",
  destructive: "#ef4444",
  routeSelected: "#2563eb",
  routeAlt: "#94a3b8",
  connector: "#6366f1",
} as const
