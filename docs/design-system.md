# ScoutFuel design system

All global styling is in **[`app/globals.css`](../app/globals.css)**: shadcn semantic variables, `@theme inline` (Tailwind v4), and glass layout (sidebar, cards, form controls) in one place.

## Token layers

1. **Primitives** — Brand anchors in `:root` at the top of `globals.css` (e.g. `--glass-brand-h`, `--shadow-tint`). Adjust these to shift hue or shadow character.
2. **Semantics** — The shadcn contract: `--background`, `--foreground`, `--primary`, `--muted`, `--destructive`, `--chart-1` … `--chart-5`, `--success`, `--warning`, sidebar tokens, `--radius`, `--shadow-*`. Components and Tailwind utilities should **only** depend on these names (or their Tailwind aliases below).
3. **Glass overrides** — Further down the same file: layout and slot rules (e.g. `[data-slot="card"]`, sidebar wrapper) that compose surfaces using `color-mix`, blur, and semantic variables.

## Semantic colors → Tailwind

| CSS variable | Tailwind examples | Use |
|--------------|-------------------|-----|
| `--background` | `bg-background` | Page / shell surface |
| `--foreground` | `text-foreground` | Primary text |
| `--muted` | `bg-muted`, `text-muted` | Muted surfaces |
| `--muted-foreground` | `text-muted-foreground` | Secondary text |
| `--primary` | `bg-primary`, `text-primary` | Actions, links, emphasis |
| `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `--secondary` | `bg-secondary` | Secondary surfaces |
| `--accent` | `bg-accent` | Hover / subtle highlight |
| `--destructive` | `bg-destructive`, `text-destructive` | Errors, destructive actions |
| `--border` | `border-border` | Default borders |
| `--input` | `border-input` | Inputs |
| `--ring` | `ring-ring` | Focus rings |
| `--card` | `bg-card` | Cards |
| `--app-settings-main` | `bg-app-settings-main` | App settings dialog main content (aligned with card in light; lighter panel in dark) |
| `--app-settings-main-foreground` | `text-app-settings-main-foreground` | Text on app settings main content |
| `--success` | `text-success`, `bg-success/10` | Positive / savings / on-track |
| `--warning` | `text-warning`, `bg-warning/10` | Attention, caution |
| `--chart-1` … `--chart-5` | `fill-chart-1` (charts), or `var(--chart-2)` in inline SVG | Data series |

Sidebar-specific tokens (`--sidebar-*`) map to `--color-sidebar-*` utilities as needed.

## Do and don’t

**Do**

- Use semantic utilities: `bg-background`, `text-muted-foreground`, `text-warning`, `bg-success/10`, `border-destructive/30`.
- For charts and maps, prefer `var(--chart-n)` or theme-mapped colors already on the container.
- When you need a **new** color meaning, add a semantic variable in `app/globals.css` (light `:root` and dark `:root.dark`), wire it in `@theme inline` below, and document it here.

**Don’t**

- Use raw hex or `rgb()` in TSX for product UI.
- Use default Tailwind palette names (`amber-*`, `emerald-*`, `slate-*`, …) for meanings that already have semantics (`warning`, `success`, `muted`, etc.).
- Introduce one-off arbitrary colors (`bg-[#22c55e]`, `text-[#...]`) in feature components.

## Where to edit

| Goal | File |
|------|------|
| Segmented **Tabs** (default variant: pill on track; dark contrast) | `components/ui/tabs.tsx`; optional `bg-card` list + `:root.dark …` in `app/globals.css` for primary active pills |
| Brand hue, shadow tint, light/dark semantics, glass layout | `app/globals.css` (theme block, then `@theme inline`, then `@layer base`) |
| Tailwind theme mapping (new semantic → utility) | `app/globals.css` (`@theme inline`) |
| Global base rules (typography ratio, charts, map popups) | `app/globals.css` (`@layer base` and mobile `@media` at the end) |
| Dark mode class | `next-themes` on `<html>` — selectors use `:root.dark` |

## Mobile

Typography and weight scaling for small viewports are in `app/globals.css` (`@media (max-width: 767px)`). Follow [.cursor/rules/mobile-phone.mdc](../.cursor/rules/mobile-phone.mdc): touch targets ≥44px, single-column layouts, base styles target phone width.

## Multi-brand (future)

The app currently ships a single Glass theme on `:root`. To add another brand later, reintroduce a data attribute or class on `html` and scope token overrides under that selector; update this doc when you do.

## Map-only literals

MapLibre paint properties do not resolve CSS variables. Shared fallbacks that should stay visually aligned with `--success`, `--warning`, and `--destructive` live in [`lib/map-paint-colors.ts`](../lib/map-paint-colors.ts). Prefer `mapPaint.*` imports over inline hex in components.

## Optional: Figma / Style Dictionary

A JSON token pipeline and CI sync are not required for day-to-day work in this repo. If design delivers tokens from Figma, consider Style Dictionary or Tokens Studio export → CSS variables, then merge into the same three-layer structure above.
