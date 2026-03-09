"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type Org = {
  name: string
  /** Logo: use <img src="..." alt="" className="..." /> or an icon. Image will be object-contain by default. */
  logo: React.ReactNode
  /** Optional subtitle, e.g. "Fleet Management" */
  subtitle?: string
  /** Background behind the logo in the switcher. Default "dark". */
  logoBackground?: "light" | "dark"
}

const logoHolderBase =
  "flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-sidebar-border/80 p-[2px] [&>img]:size-full [&>img]:object-contain [&>img]:select-none"

function logoHolderClassName(background: Org["logoBackground"] = "dark"): string {
  return background === "light"
    ? cn(logoHolderBase, "bg-white")
    : cn(logoHolderBase, "bg-black/80")
}

export function OrgSwitcher({
  organizations,
}: {
  organizations: Org[]
}) {
  const { isMobile } = useSidebar()
  const [activeOrg, setActiveOrg] = React.useState(organizations[0])
  if (!activeOrg) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className={cn(
                  "gap-3 rounded-lg transition-colors",
                  "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-open:ring-1 data-open:ring-sidebar-border/80",
                  "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                )}
              />
            }
          >
            <div className={cn(logoHolderClassName(activeOrg.logoBackground), "size-9 rounded-lg")}>
              {activeOrg.logo}
            </div>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">
                {activeOrg.name}
              </span>
              {activeOrg.subtitle ? (
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {activeOrg.subtitle}
                </span>
              ) : null}
            </div>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="ml-auto size-4 shrink-0 opacity-70"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="h-fit max-h-[min(20rem,var(--available-height))] w-auto min-w-[14rem] max-w-[16rem] rounded-lg border-sidebar-border p-1.5 shadow-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup className="flex flex-col gap-0.5">
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Organization
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.name}
                  onClick={() => setActiveOrg(org)}
                  className="gap-3 rounded-md px-2 py-2"
                >
                  <div className={cn(logoHolderClassName(org.logoBackground), "size-7")}>
                    {org.logo}
                  </div>
                  <span className="truncate font-medium">{org.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
