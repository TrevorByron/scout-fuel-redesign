"use client"

import { cn } from "@/lib/utils"

/**
 * Flat container for grouped content (e.g. charts). Uses border + bg, no shadow.
 * Uber-style: single surface with internal dividers.
 */
const FlatPanel = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col rounded-lg border border-border bg-card overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const FlatPanelSection = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col gap-3 px-4 py-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const FlatPanelSectionHeader = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-0.5", className)} {...props}>
    {children}
  </div>
)

const FlatPanelSectionTitle = ({
  className,
  ...props
}: React.ComponentProps<"h3">) => (
  <h3 className={cn("text-sm font-medium", className)} {...props} />
)

const FlatPanelSectionDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => (
  <p className={cn("text-xs text-muted-foreground", className)} {...props} />
)

export {
  FlatPanel,
  FlatPanelSection,
  FlatPanelSectionHeader,
  FlatPanelSectionTitle,
  FlatPanelSectionDescription,
}
