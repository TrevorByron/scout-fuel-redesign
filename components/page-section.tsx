"use client"

import { cn } from "@/lib/utils"

const PageSection = ({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) => (
  <section
    className={cn("flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0", className)}
    {...props}
  >
    {children}
  </section>
)

const PageSectionHeader = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-row items-center justify-between gap-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const PageSectionTitle = ({
  className,
  ...props
}: React.ComponentProps<"h2">) => (
  <h2 className={cn("text-sm font-medium", className)} {...props} />
)

const PageSectionDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => (
  <p className={cn("text-xs text-muted-foreground", className)} {...props} />
)

export { PageSection, PageSectionHeader, PageSectionTitle, PageSectionDescription }
