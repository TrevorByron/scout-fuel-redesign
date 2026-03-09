# Style templates

This folder contains the three style templates used by the app. Users can switch between them using the floating bar at the bottom of the screen (“Style 1”, “Style 2”, “Style 3”).

## Files

- **style-1.css** – Default theme (blue/violet). Also provides the fallback when no style is selected.
- **style-2.css** – Warm/amber palette.
- **style-3.css** – Teal/green palette.

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

To add a fourth style or rename “Style 1/2/3”:

1. Add a new file (e.g. `style-4.css`) with the same structure: `:root { --swatch-4: ... }`, `html[data-style="4"] { ... }`, `html[data-style="4"].dark { ... }`.
2. Import it in `app/globals.css`.
3. Update `components/style-provider.tsx` so `StyleId` and the storage logic allow `"4"`.
4. Update `components/style-switcher.tsx` to add a fourth button and use `var(--swatch-4)` for its swatch.
