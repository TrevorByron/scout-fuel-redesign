# Style templates

This folder contains the three UI style templates (Teal, Glass, Uber). Users switch them from the sidebar **UI Style** control.

## Files

- **style-teal.css** – Blue/cyan gradient palette (chunky controls, KPI card tint).
- **style-glass.css** – Glass / frosted card variant on top of the same palette family.
- **style-uber.css** – Uber Base–inspired (primary blue, system/Helvetica stack, Base shadows, square controls). Also drives the parallel “Uber” React layouts when active.
- **style-uber-font-override.css** – System font stack override for Uber (imported from `app/layout.tsx`).

## Customizing a template

Edit the CSS file for the template you want to change. Only that template is affected.

Each file defines:

1. **Swatch variable** – `:root { --swatch-teal | --swatch-glass | --swatch-uber: ... }`  
   Used by the style switcher. Keep in sync with that template’s `--primary`.

2. **Light theme** – `html[data-style="teal" | "glass" | "uber"] { ... }`

3. **Dark theme** – `html[data-style="..."].dark { ... }`

## Adding or changing templates

1. Add or edit a file with the same structure; use a new `html[data-style="slug"]` if adding.
2. Import order in `app/globals.css` matters (Uber last for overrides).
3. Extend `StyleId`, `UI_STYLES`, and migration in [`lib/ui-styles.ts`](../../lib/ui-styles.ts); keep [`components/style-provider.tsx`](../../components/style-provider.tsx) and the inline script in [`app/layout.tsx`](../../app/layout.tsx) in sync.
