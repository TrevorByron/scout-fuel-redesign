"use client";

import { useStyle } from "@/components/style-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "1" as const, label: "Style 1", swatchVar: "var(--swatch-1)" },
  { id: "2" as const, label: "Style 2", swatchVar: "var(--swatch-2)" },
  { id: "3" as const, label: "Style 3", swatchVar: "var(--swatch-3)" },
  { id: "4" as const, label: "Style 4 (WIP)", swatchVar: "var(--swatch-4)" },
  { id: "5" as const, label: "Uber", swatchVar: "var(--swatch-5)" },
] as const;

export function StyleSwitcher() {
  const { style, setStyle } = useStyle();

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[min(100vw-1rem,28rem)] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80"
      role="group"
      aria-label="Style template"
    >
      {STYLES.map(({ id, label, swatchVar }) => (
        <Button
          key={id}
          variant={style === id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setStyle(id)}
          className={cn(
            "gap-1.5 font-medium",
            style === id && "ring-1 ring-ring/50"
          )}
          aria-pressed={style === id}
          aria-label={`Switch to ${label}`}
        >
          <span
            className="size-3 shrink-0 rounded-sm border border-border/80"
            style={{ backgroundColor: swatchVar }}
            aria-hidden
          />
          {label}
        </Button>
      ))}
    </div>
  );
}
