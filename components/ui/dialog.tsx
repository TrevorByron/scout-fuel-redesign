"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      // Nested dialogs (e.g. preview inside workspace settings) skip the backdrop by default;
      // forceRender restores the viewport scrim for stacked modals.
      forceRender
      className={cn(
        "fixed inset-0 z-[100] bg-black/80 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 sm:bg-black/35",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  fullViewportMobile = false,
  closeButtonClassName,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /** Below `sm`, drop outer padding and fill the viewport (stacked “page” layout). */
  fullViewportMobile?: boolean
  /** Merged onto the built-in close control (e.g. mobile `top` to align with a tall header). */
  closeButtonClassName?: string
}) {
  const closeButton = showCloseButton ? (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={
        <Button
          variant="ghost"
          className={cn(
            "pointer-events-auto absolute top-4 right-4 z-[110] shrink-0",
            "max-sm:size-11 max-sm:rounded-lg max-sm:[&_svg:not([class*='size-'])]:size-4",
            closeButtonClassName
          )}
          size="icon-sm"
        />
      }
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  ) : null

  return (
    <DialogPortal>
      <DialogOverlay
        className={cn(fullViewportMobile && "max-sm:bg-background")}
      />
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[100] flex min-h-0 items-center justify-center p-3 sm:p-4",
          fullViewportMobile && "max-sm:p-0 max-sm:items-stretch max-sm:justify-stretch"
        )}
      >
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "pointer-events-auto relative z-[100] flex min-h-0 w-[calc(100%-1rem)] max-w-lg min-w-0 flex-col rounded-lg border bg-background shadow-lg outline-none",
            "max-h-[min(94vh,calc(100dvh-2rem))]",
            fullViewportMobile &&
              "max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:min-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:shadow-none",
            className
          )}
          {...props}
        >
          {children}
          {closeButton}
        </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "mb-4 flex flex-col gap-1.5 px-4 pb-1 pt-4",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
