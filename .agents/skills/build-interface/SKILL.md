---
name: build-interface
description: Implements interfaces and features using Coss UI components with correct APIs, composition patterns, and naming conventions. Use when writing component code, using the render prop, composing dialogs, selects, menus, accordions, toasts, forms, or any Coss UI particle. Covers the render prop, Base UI primitives, component naming, sizing, stacking context, and all component-level patterns. Includes the full particle catalog and layout template catalog.
---

# Build Interface

Follow these rules when writing Coss UI component code. For page-level layout, visual hierarchy, and design alignment, see the [design-guide skill](../design-guide/SKILL.md). For full component examples, read [coss-ui-best-practices.md](../../../product-architecture/coss-ui-best-practices.md).

## Foundation

Coss UI is built on **Base UI** (not Radix UI) and styled with **Tailwind CSS v4**. Components are copy-paste — you own the source and can modify freely.

### Three-Layer Architecture

| Layer | Purpose | Example |
|---|---|---|
| **Primitives** | Unstyled, accessible Base UI building blocks | `Dialog.Root`, `Toggle.Root` |
| **Particles** | Pre-assembled, styled components | `Button`, `Card`, `Frame`, `Sheet` |
| **Atoms** | API-integrated particles | Auth flows, scheduling |

Use primitives for full control, particles for standard patterns, atoms for API connections.

## Available Particles

The particle catalog lives in `design-studio/app/doc/registry.tsx` with 72 examples across 42 categories. Browse the particles page at `design-studio/app/doc/particles/page.tsx`. Each entry has a live preview and copy-pasteable code.

When choosing a component, use these category guidelines:

| Category | When to use |
|---|---|
| **Accordion** | Reveal content progressively — FAQs, settings groups, long content |
| **Alert** | Persistent contextual messages users must read and act on (not transient — use Toast) |
| **AlertDialog** | Gate destructive/irreversible actions behind explicit confirmation |
| **Avatar** | Represent users or entities; always include AvatarFallback |
| **Badge** | Label status, categories, or counts — use semantic variants for meaning |
| **Breadcrumb** | Show location in hierarchy; place above page header |
| **Button** | Default for primary, outline for secondary, ghost for tertiary |
| **Calendar** | Date selection; pair with Popover for inline date pickers |
| **Card** | Standalone content blocks with metadata and actions |
| **Checkbox / CheckboxGroup** | Binary or multi-select choices in forms |
| **Collapsible** | Show/hide supplementary content inline; prefer Accordion for structured lists |
| **Dialog** | Focused data entry forms and multi-step flows (dismissible) |
| **Empty** | Zero-data placeholder with icon, title, description, and optional action |
| **Field / Fieldset** | Wrap every form control; group related fields semantically |
| **Frame** | Primary section container for settings, config panels, grouped content |
| **Group** | Join related controls into a single row (always use GroupSeparator) |
| **Input / InputGroup** | Text input; combine with addons for URLs, currency, contextual prefixes |
| **Kbd** | Display keyboard shortcuts; use KbdGroup for multi-key combos |
| **Label** | Associate text with a control; prefer FieldLabel inside Field |
| **Menu** | Action lists and contextual options; import from `@/components/ui/menu` |
| **Meter** | Measured value within a known range (not for progress) |
| **NumberField** | Numeric input with increment/decrement controls |
| **Pagination** | Navigate large datasets; place below data with `mt-8` |
| **Popover** | Small contextual controls anchored to a trigger (not for hover text) |
| **PreviewCard** | Content preview on hover/focus (user profiles, link previews) |
| **Progress** | Determinate operations with a completion state |
| **RadioGroup** | Single-select from a small set; use Select for 5+ options |
| **ScrollArea** | Constrain content with custom scrollbars |
| **Select** | Choose one option from a list (5+ options); wrap in Field |
| **Separator** | Divide content in flat layouts between distinct groups |
| **Sheet** | Side panel overlay for detail views, filters, secondary workflows |
| **Skeleton** | Loading placeholder matching real content dimensions |
| **Slider** | Select from a continuous range; pair with a visible value label |
| **Spinner** | Indeterminate loading indicator; use Skeleton for content placeholders |
| **Switch** | Toggle boolean settings with immediate effect |
| **Table** | Structured tabular data; right-align numerics, pair with Pagination |
| **Tabs** | Switch between 2–5 related views in the same space |
| **Textarea** | Multi-line text input for long-form content |
| **Toast** | Transient notifications via `toastManager.add()` (not for persistent messages) |
| **Toggle / ToggleGroup** | On/off toggle buttons; use for formatting, view switching, toolbars |
| **Toolbar** | Accessible grouped controls with arrow-key navigation |
| **Tooltip** | Brief text on hover/focus for icon-only buttons and truncated labels |

For full code examples of any particle, read the `code` field of the matching entry in `design-studio/app/doc/registry.tsx`.

## Layout Templates

9 full-page layout templates with design annotations are available at `design-studio/app/templates/`. Browse the catalog at `design-studio/app/doc/templates/page.tsx`.

| Template | Slug | Use |
|---|---|---|
| **Multi-Column Expandable** | `multi-column-expandable` | 3-panel layout with collapsible panels and preset modes (NotebookLM-style) |
| **Sidebar + Detail** | `sidebar-detail` | Collapsible sidebar with grouped nav and main content; icon-only collapse |
| **Master-Detail** | `master-detail` | List/detail split with selection, collapsible list, mobile stack (email, tasks, CRM) |
| **Marketing Page** | `marketing-page` | Scrolling landing page with sticky nav, hero, features grid, stats, CTA |
| **Dashboard Grid** | `dashboard-grid` | Grid dashboard with KPI cards, chart, activity feed, data table |
| **Workspace** | `workspace` | IDE-style layout: activity bar, explorer, editor tabs, bottom panel, status bar |
| **Command Center** | `command-center` | Icon rail with centered, input-first workspace; minimal persistent nav |
| **Masonry Gallery** | `masonry-gallery` | Pinterest-style masonry with category filtering, hover actions, CSS columns |
| **Image Generator** | `image-generator` | Sidebar + gallery with sticky bottom prompt bar for AI generation |

Each template page at `design-studio/app/templates/<slug>/page.tsx` includes `DesignNotes` explaining the architectural decisions. Read the source for full implementation patterns.

## The `render` Prop

The most important pattern. Base UI uses `render` instead of Radix's `asChild`.

Children text goes on the **outer** component, not the inner:

```tsx
<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>

<Button render={<Link href="/login" />}>Login</Button>

<Badge render={<Link href="/new" />}>New</Badge>
```

**Never use `asChild`:**

```tsx
// WRONG (Radix pattern)
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// CORRECT (Coss UI)
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

## Naming Conventions

Use the preferred names in new code:

| Preferred | Legacy Alias | Notes |
|---|---|---|
| `*Popup` | `*Content` | `DialogPopup`, `SheetPopup`, `PopoverPopup`, `TooltipPopup` |
| `*Panel` | `*Content` | `AccordionPanel`, `CollapsiblePanel`, `TabsPanel`, `CardPanel` |
| `TabsTab` | `TabsTrigger` | Tab trigger button |
| `Toggle` (in group) | `ToggleGroupItem` | Individual toggle |
| `Radio` | `RadioGroupItem` | Individual radio |
| `Menu*` | `DropdownMenu*` | Full menu system |
| `MenuPopup` | `DropdownMenuContent` | Menu container |
| `MenuGroupLabel` | `DropdownMenuLabel` | Group label |

## Component Patterns

### Dialog / AlertDialog / Sheet

All modals follow one structure:

```tsx
<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
  <DialogPopup>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogPanel>{/* Scrollable content */}</DialogPanel>
    <DialogFooter>
      <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
      <DialogClose render={<Button />}>Confirm</DialogClose>
    </DialogFooter>
  </DialogPopup>
</Dialog>
```

- `DialogPanel` / `SheetPanel` wraps scrollable content between Header and Footer
- `DialogPopup` handles portal, backdrop, and viewport automatically
- `DialogFooter` variants: `"default"` (border/bg) or `"bare"`
- `showCloseButton` on `DialogPopup` controls the X button (default: `true`)
- `bottomStickOnMobile` sticks to bottom on mobile (default: `true`)

### Accordion

```tsx
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Title</AccordionTrigger>
    <AccordionPanel>Content</AccordionPanel>
  </AccordionItem>
</Accordion>
```

- `multiple` prop (boolean), not `type="single"` / `type="multiple"`
- `defaultValue` is always an array
- Collapsibility is default behavior (no `collapsible` prop)

### Select

```tsx
const items = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
]

<Select items={items} defaultValue={null}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectPopup>
    <SelectGroup>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectGroup>
  </SelectPopup>
</Select>
```

- Always pass `items` to `Select` for SSR and mount performance
- Placeholder: `defaultValue={null}` or include `{ label: "Select...", value: null }` in items
- Use `SelectPopup` (preferred) over `SelectContent`

### Menu

```tsx
<Menu>
  <MenuTrigger render={<Button />}>Actions</MenuTrigger>
  <MenuPopup>
    <MenuGroup>
      <MenuGroupLabel>Account</MenuGroupLabel>
      <MenuItem onClick={() => {}}>Profile</MenuItem>
    </MenuGroup>
    <MenuSeparator />
    <MenuItem variant="destructive">Sign Out</MenuItem>
  </MenuPopup>
</Menu>
```

- Import from `@/components/ui/menu` (preferred) or `@/components/ui/dropdown-menu`
- Use `onClick`, not Radix's `onSelect`
- `MenuItem` supports `variant="destructive"` and `inset`
- `MenuCheckboxItem` supports `variant="switch"`

### Toast

```tsx
<ToastProvider>
  <main>{children}</main>
</ToastProvider>

const id = toastManager.add({
  title: "Saved",
  description: "Your changes have been saved.",
  type: "success",
  actionProps: { children: "Undo", onClick: () => toastManager.close(id) },
})
```

- `ToastProvider` wrapper, not a `<Toaster />` component
- Types: `"error"` | `"info"` | `"loading"` | `"success"` | `"warning"`
- Position: `<ToastProvider position="bottom-right">`

### Form Fields

```tsx
<Field>
  <FieldLabel>Email</FieldLabel>
  <Input type="email" placeholder="name@example.com" />
  <FieldDescription>Help text.</FieldDescription>
  <FieldError />
</Field>
```

- Wrap every control in `Field` for label association and validation
- Group with `Fieldset` + `FieldsetLegend`
- Use `Form` for validation and submission

### Input Group

```tsx
<InputGroup>
  <InputGroupAddon>
    <InputGroupText>https://</InputGroupText>
  </InputGroupAddon>
  <InputGroupInput placeholder="example.com" />
</InputGroup>
```

- Use `Button` directly inside `InputGroupAddon` (no `InputGroupButton`)
- Disable on `InputGroupInput` / `InputGroupTextarea`, not the group

### Frame

```tsx
<Frame>
  <FrameHeader>
    <FrameTitle>Section</FrameTitle>
    <FrameDescription>Description</FrameDescription>
  </FrameHeader>
  <FramePanel>{/* Panel content */}</FramePanel>
  <FramePanel>{/* Multiple panels stack */}</FramePanel>
</Frame>
```

### Group (Button Group)

```tsx
<Group>
  <Button variant="outline">Left</Button>
  <GroupSeparator />
  <Button variant="outline">Right</Button>
</Group>
```

- `GroupSeparator` is **always required** between controls
- Supports `orientation="horizontal"` (default) and `"vertical"`

## Sizing System

Components are more compact than shadcn/ui defaults:

| shadcn Size | shadcn Height | Coss UI Equivalent | Coss Height |
|---|---|---|---|
| `sm` | 32px | `default` | 32px |
| `default` | 36px | `lg` | 36px |

Applies to: `Button`, `Input`, `Select`, `Textarea`, `Toggle`, `ToggleGroup`.

Additional sizes: `xs`, `xl`, and icon sizes (`icon-xs`, `icon-sm`, `icon`, `icon-lg`, `icon-xl`).

## Icons in Buttons

```tsx
<Button>
  <PlusIcon data-icon="inline-start" />
  Add item
</Button>
```

Use `data-icon="inline-start"` for proper spacing. Icon-only buttons need `<span className="sr-only">Label</span>`.

## Destructive Actions

Two-tier pattern:

```tsx
<Button variant="destructive-outline">Delete</Button>   {/* Trigger */}
<Button variant="destructive">Confirm Delete</Button>    {/* Confirmation */}
```

## Stacking Context (Required)

Base UI portals require root isolation:

```tsx
<body className="relative">
  <div className="isolate relative flex min-h-svh flex-col">
    {children}
  </div>
</body>
```

Without this, portaled components (Dialog, Popover, Select, Tooltip) render behind page content.

## Primitive Re-exports

Every styled component re-exports its Base UI primitive:

```tsx
import { Slider, SliderValue, SliderPrimitive } from "@/components/ui/slider"
```

- Use styled components when defaults work
- Use `*Primitive` for custom compositions
- Import utilities from `@coss/ui/base-ui/*`: `useRender`, `mergeProps`, `DirectionProvider`, `CSPProvider`

## Empty and Loading States

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <SearchIcon className="size-6" />
    </EmptyMedia>
    <EmptyTitle>No results found</EmptyTitle>
    <EmptyDescription>Try adjusting your search.</EmptyDescription>
  </EmptyHeader>
</Empty>

<Skeleton className="h-4 w-3/4" />
```

Match `Skeleton` dimensions to the real content they replace.

## Reference

For full component examples and patterns, read:
- [coss-ui-best-practices.md](../../../product-architecture/coss-ui-best-practices.md)

For page layout, visual hierarchy, spacing, and design alignment, see:
- [design-guide skill](../design-guide/SKILL.md)
- [design-guide.md](../../../product-architecture/design-guide.md)
