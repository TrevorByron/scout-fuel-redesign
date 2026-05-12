---
name: icon-only-tooltips
description: Ensures every icon-only button in the app is wrapped in a Tooltip so the action is discoverable on hover and focus. Use when writing, editing, or auditing any button that renders only an icon (no visible text), including Button with size="icon*", DropdownMenuTrigger / PopoverTrigger / SidebarTrigger that render an icon-only button, or native <button> with only an <svg> / <HugeiconsIcon> child. Also use when reviewing UI for accessibility, auditing buttons, or adding new icon controls.
---

# Icon-only buttons must have a Tooltip

Every icon-only button (or button-like control) in this codebase must be wrapped in a `Tooltip` from `@/components/ui/tooltip` that names the action. An `aria-label` alone is not enough — sighted users without a screen reader cannot read it, so the action must surface as a visible tooltip on hover and keyboard focus.

This rule is enforced by `.cursor/rules/icon-only-buttons.mdc`.

## What counts as "icon-only"

Treat **any** of the following as icon-only and require a `Tooltip`:

| Pattern | Example |
|---|---|
| `<Button size="icon" \| "icon-sm" \| "icon-xs" \| "icon-lg" />` with no visible text children | `<Button size="icon"><Plus /></Button>` |
| Native `<button>` whose only visual child is an icon | `<button><X className="size-4" /></button>` |
| A `DropdownMenuTrigger`, `PopoverTrigger`, `DialogTrigger`, etc. that renders an icon-only button via `render` | `<DropdownMenuTrigger render={<Button size="icon" />}>` |
| `SidebarTrigger` and any other icon-only primitive composed in product code | `<SidebarTrigger />` (already wrapped centrally) |
| Button with `sr-only` text but no visible label | `<Button><Trash2 /><span className="sr-only">Delete</span></Button>` |

A button is **not** icon-only when it has visible text alongside the icon (e.g. `<Button><Plus /> Add brand</Button>`). Those should not be wrapped in a tooltip.

## Canonical pattern

Use Base UI's `render` prop to merge the trigger onto the button. Reference: `components/theme-toggle.tsx`.

```tsx
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

<Tooltip>
  <TooltipTrigger
    render={
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Upload transactions"
        onClick={handleUpload}
      >
        <Upload className="size-4" aria-hidden />
      </Button>
    }
  />
  <TooltipContent side="bottom">Upload transactions</TooltipContent>
</Tooltip>
```

Key points:

- The `<Button>` (or `<button>`) is passed to `TooltipTrigger` via `render={...}`. **Never** use Radix's `asChild` — this project is on Base UI.
- The button still gets `aria-label` for screen readers.
- `TooltipContent` is short, action-oriented, and matches `aria-label`.
- `TooltipProvider` is already mounted in `app/layout.tsx`. Do not add another.

## When the button also opens a menu, popover, or dialog

Nest the menu/popover/dialog trigger inside the tooltip trigger via `render`. The outer `Tooltip` and `<DropdownMenu>` (or `<Popover>`, `<Dialog>`) sit as siblings; the trigger composition layers them onto a single button.

```tsx
<DropdownMenu>
  <Tooltip>
    <TooltipTrigger
      render={
        <DropdownMenuTrigger
          aria-label={`More actions for ${name}`}
          render={<Button variant="ghost" size="icon" />}
        >
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
      }
    />
    <TooltipContent side="left">More actions</TooltipContent>
  </Tooltip>
  <DropdownMenuContent>{/* items */}</DropdownMenuContent>
</DropdownMenu>
```

The same pattern works for `PopoverTrigger`, `DialogTrigger`, `SelectTrigger`, etc.

## Authoring rules

- **Always set `aria-label`** on the button. Use the same verb phrase as the tooltip text.
- **Tooltip text is concise**: 1–4 words, action-oriented, no trailing punctuation. Examples: "Upload transactions", "Remove invoice", "Open menu", "Close comparison".
- **Describe the action, not the icon**. Say "Delete saved analysis", not "Trash icon".
- **Pick a sensible `side`**:
  - `"bottom"` — top-bar / header controls, large primary controls.
  - `"top"` — footer / pagination controls.
  - `"left"` — trailing actions in a row (e.g. row kebab, dismiss).
  - `"right"` — leading actions (e.g. drag handle on the left of a row).
- **Do not** rely on the HTML `title` attribute — it is inconsistent across browsers, mobile, and screen readers.
- **Do not** wrap buttons that already show a visible text label.
- **Touch targets stay ≥ 44px** (see `.cursor/rules/mobile-phone.mdc`). The tooltip wrapper does not change layout — keep the `min-h-11 min-w-11` (or `size-11`) classes on mobile.

## Auditing existing code

When asked to audit icon-only buttons:

1. Search for `size="icon"`, `size="icon-sm"`, `size="icon-xs"`, `size="icon-lg"` across `components/` and `app/` (skip `components/ui/` primitives unless the primitive is a product-facing icon-only control like `SidebarTrigger`).
2. Search for `aria-label=` on `<button>` and `<Button>` and inspect the children — if there's no visible text, it is icon-only.
3. Search for `sr-only` inside buttons — these are almost always icon-only.
4. For each match: confirm there is an enclosing `<Tooltip>` with a `<TooltipContent>`. If not, wrap it using the canonical pattern.
5. Verify imports include `Tooltip, TooltipContent, TooltipTrigger` from `@/components/ui/tooltip`.
6. Run `ReadLints` on every file you touch.

## Quick verification

After your changes, every icon-only button in product code should match this structure when grepped:

```tsx
<Tooltip>
  <TooltipTrigger render={ <Button ... aria-label="..." /* icon only */ /> } />
  <TooltipContent>Action label</TooltipContent>
</Tooltip>
```
