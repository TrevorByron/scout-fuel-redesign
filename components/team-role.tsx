"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Route01Icon, ShieldIcon, TruckDeliveryIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles"

export { TEAM_ROLES, type TeamRole }

const ROLE_CONFIG: Record<
  TeamRole,
  {
    icon: typeof ShieldIcon
    /** Uses semantic colors from app/globals.css (@theme). */
    containerClassName: string
  }
> = {
  Admin: {
    icon: ShieldIcon,
    containerClassName: "border-primary/35 bg-primary/10 text-primary",
  },
  Dispatcher: {
    icon: Route01Icon,
    containerClassName: "border-chart-2/45 bg-chart-2/10 text-chart-2",
  },
  Driver: {
    icon: TruckDeliveryIcon,
    containerClassName: "border-success/40 bg-success/10 text-success",
  },
}

export function TeamRoleIcon({
  role,
  className,
}: {
  role: TeamRole
  className?: string
}) {
  const cfg = ROLE_CONFIG[role]
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border",
        cfg.containerClassName,
        className
      )}
      aria-hidden
    >
      <HugeiconsIcon icon={cfg.icon} strokeWidth={2} className="size-3.5" />
    </span>
  )
}

export function TeamRoleLabel({
  role,
  className,
}: {
  role: TeamRole
  className?: string
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <TeamRoleIcon role={role} />
      <span className="truncate">{role}</span>
    </span>
  )
}
