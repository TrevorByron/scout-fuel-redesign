"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const StatStrip = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    role="group"
    className={cn(
      "flex overflow-x-auto gap-px bg-muted/50 rounded-md border border-border",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const statStripItemClasses =
  "flex min-w-0 flex-1 flex-col gap-0.5 border-b-2 border-transparent px-3 py-2.5 text-left transition-colors"

const StatStripItem = ({
  className,
  children,
  onClick,
  active,
  tooltip,
  ...props
}: React.ComponentProps<"div"> & {
  onClick?: () => void
  active?: boolean
  tooltip?: React.ReactNode
}) => {
  const baseCn = cn(
    statStripItemClasses,
    onClick &&
      "cursor-pointer hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-primary data-[active=true]:bg-muted",
    className
  )
  const content = onClick ? (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={baseCn}
      {...(props as React.ComponentProps<"button">)}
    >
      {children}
    </button>
  ) : (
    <div data-active={active} className={baseCn} {...props}>
      {children}
    </div>
  )
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent side="top" className="min-w-[8rem]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }
  return content
}

const StatStripLabel = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    className={cn("text-[length:var(--text-2xs)] font-medium text-muted-foreground", className)}
    {...props}
  />
)

const StatStripValue = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span className={cn("text-sm font-medium tabular-nums", className)} {...props} />
)

export { StatStrip, StatStripItem, StatStripLabel, StatStripValue }
