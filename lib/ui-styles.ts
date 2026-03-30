/** UI style templates: Teal / Glass / Uber. Persisted under `style-template`; `html[data-style]` uses the slug. */

export type StyleId = "teal" | "glass" | "uber";

export const STORAGE_KEY = "style-template";

export const DEFAULT_STYLE_ID: StyleId = "uber";

export const STYLE_IDS: readonly StyleId[] = ["teal", "glass", "uber"] as const;

export function isUberStyle(style: StyleId): style is "uber" {
  return style === "uber";
}

/** Maps legacy numeric ids and invalid values to current slugs. */
export function migrateStoredStyle(raw: string | null): StyleId {
  if (raw === "teal" || raw === "glass" || raw === "uber") return raw;
  switch (raw) {
    case "2":
      return "teal";
    case "4":
      return "glass";
    case "5":
      return "uber";
    default:
      return DEFAULT_STYLE_ID;
  }
}

export const UI_STYLES: readonly {
  id: StyleId;
  label: string;
  swatchVar: string;
}[] = [
  { id: "teal", label: "Teal", swatchVar: "var(--swatch-teal)" },
  { id: "glass", label: "Glass", swatchVar: "var(--swatch-glass)" },
  { id: "uber", label: "Uber", swatchVar: "var(--swatch-uber)" },
] as const;
