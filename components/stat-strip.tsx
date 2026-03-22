"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
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

const tooltipContentClasses =
  "min-w-[8rem] rounded-md bg-foreground px-3 py-1.5 text-xs text-background"

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
  const isMobile = useIsMobile()
  const baseCn = cn(
    statStripItemClasses,
    (onClick || (tooltip && isMobile)) &&
      "cursor-pointer hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-primary data-[active=true]:bg-muted",
    tooltip && isMobile && "min-h-[44px]",
    className
  )
  const useButton = onClick || (tooltip && isMobile)
  const content = useButton ? (
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
    if (isMobile) {
      return (
        <Popover>
          <PopoverTrigger render={content} />
          <PopoverContent
            side="top"
            align="center"
            className={cn("w-fit flex-col gap-0 p-0 ring-0", tooltipContentClasses)}
          >
            {tooltip}
          </PopoverContent>
        </Popover>
      )
    }
    return (
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent side="top" className={tooltipContentClasses}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }
  return content
}

const StatStripLabel = ({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<"span"> & { count?: number }) => (
  <span
    className={cn("text-[length:var(--text-2xs)] font-medium text-muted-foreground", className)}
    {...props}
  >
    {children}
    {count != null && ` (${count})`}
  </span>
)

const StatStripValue = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span className={cn("text-2xl font-semibold tabular-nums", className)} {...props} />
)

export { StatStrip, StatStripItem, StatStripLabel, StatStripValue }
