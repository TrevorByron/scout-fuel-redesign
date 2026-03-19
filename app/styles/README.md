# Style templates

This folder contains the style templates used by the app. Users can switch between them using the floating bar at the bottom of the screen.

## Files

- **style-1.css** – Default theme (blue/violet). Also provides the fallback when no style is selected.
- **style-2.css** – Warm/amber palette.
- **style-3.css** – Teal/green palette.
- **style-4.css** – Glass / gradient variant (WIP).
- **style-5.css** – Uber Base–inspired (primary blue, system/Helvetica stack, Base shadows, square controls).

## Customizing a template

Edit the CSS file for the template you want to change. Only that template is affected; the others stay the same.

Each file defines:

1. **Swatch variable** – `:root { --swatch-N: ... }`  
   Used by the style switcher bar to show a small primary-color square for that style. Keep this in sync with that template’s `--primary` (e.g. copy the same `oklch(...)` value) so the swatch matches the template.

2. **Light theme** – `html[data-style="N"] { ... }`  
   All CSS variables (colors, radius, shadows, etc.) when that style is active in light mode.

3. **Dark theme** – `html[data-style="N"].dark { ... }`  
   The same variables for dark mode when that style is active.

Change any variable (e.g. `--primary`, `--radius`, `--font-sans`) in the block for the template you’re editing. The app uses these variables everywhere, so your changes apply across the dashboard and all pages.

## Adding or renaming templates

To add another style or rename “Style 1/2/3”:

1. Add a new file (e.g. `style-N.css`) with the same structure: `:root { --swatch-N: ... }`, `html[data-style="N"] { ... }`, `html[data-style="N"].dark { ... }`.
2. Import it in `app/globals.css`.
3. Update `components/style-provider.tsx` so `StyleId` and the storage logic allow the new id (e.g. `"4"`).
4. Update `components/style-switcher.tsx` to add a new button and use `var(--swatch-N)` for its swatch.
