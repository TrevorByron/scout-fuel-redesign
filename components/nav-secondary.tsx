"use client"

import * as React from "react"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TeamSettingsDialog } from "@/components/team-settings-dialog"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

export function NavSecondary({
  items,
  footer,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
    }[]
  }[]
  footer?: React.ReactNode
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false)

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) =>
            item.items?.length ? (
              <Collapsible
                key={item.title}
                defaultOpen={item.isActive}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <CollapsibleTrigger
                  render={<SidebarMenuButton tooltip={item.title} isActive={item.isActive} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const isTeamItem = subItem.url === "/settings/team"
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={isTeamItem ? teamDialogOpen : subItem.isActive}
                            onClick={
                              isTeamItem
                                ? (event) => {
                                    event.preventDefault()
                                    setTeamDialogOpen(true)
                                  }
                                : undefined
                            }
                            render={
                              isTeamItem ? <button type="button" /> : <Link href={subItem.url} />
                            }
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  render={<Link href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
          {footer}
        </SidebarMenu>
      </SidebarGroup>
      <TeamSettingsDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} />
    </>
  )
}
