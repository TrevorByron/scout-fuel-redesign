# Styles

All global styles and the app theme live in **[`app/globals.css`](../globals.css)** (single file: Tailwind import stack, theme primitives, `@theme inline`, glass layout / slot rules, and `@layer base`).

**Guidelines and token tables:** [docs/design-system.md](../docs/design-system.md).

## What’s in `globals.css` (order)

1. **Tailwind** — `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`
2. **Theme** — Primitives (`--glass-brand-h`, etc.), shadcn semantics on `:root` / `:root.dark`, glass sidebar/cards/accordion/form overrides
3. **`@custom-variant` + `@theme inline`** — Map semantic variables to Tailwind utilities
4. **`@layer base`** — Body, sidebar-inset gradient, chart slots, map popups, etc.
5. **Mobile typography** — `--mobile-text-ratio` and related rules under `max-width: 767px`
