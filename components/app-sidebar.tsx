"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useAppSettings } from "@/components/app-settings-provider"
import { NavMain } from "@/components/nav-main"
import { PilotRebateSidebarProgress } from "@/components/pilot-rebate-sidebar-progress"
import { NavUser } from "@/components/nav-user"
import { OrgSwitcher } from "@/components/org-switcher"
import { useWorkspaceSettings } from "@/lib/workspace-settings-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Location01Icon,
  MapsSquare01Icon,
  ReceiptDollarIcon,
  UserGroupIcon,
  Route01Icon,
  TruckDeliveryIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

type NavMainItem = {
  title: string
  url: string
  icon: React.ReactNode
  items?: { title: string; url: string }[]
}

const data = {
  user: {
    name: "Trevor Borden",
    email: "admin@scoutfuel.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Dashboard", url: "/", icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} /> },
    { title: "Optimizer", url: "/route-optimizer", icon: <HugeiconsIcon icon={Route01Icon} strokeWidth={2} /> },
    { title: "Trips", url: "/trips", icon: <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} /> },
    { title: "Driver Insights", url: "/drivers", icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} /> },
    { title: "Location Insights", url: "/locations", icon: <HugeiconsIcon icon={Location01Icon} strokeWidth={2} /> },
    { title: "Fuel Data", url: "/transactions", icon: <HugeiconsIcon icon={ReceiptDollarIcon} strokeWidth={2} /> },
    { title: "Fuel Finder", url: "/fuel-finder", icon: <HugeiconsIcon icon={Search01Icon} strokeWidth={2} /> },
    { title: "Live Fleet Map", url: "/fleet", icon: <HugeiconsIcon icon={MapsSquare01Icon} strokeWidth={2} /> },
  ] as NavMainItem[],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setSettingsOpen } = useAppSettings()
  const { organizations, activeOrgId, setActiveOrgId } = useWorkspaceSettings()
  const navMainWithActive = React.useMemo(
    () =>
      data.navMain.map((item) => {
        const isActive =
          item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)
        const itemsWithActive =
          item.items?.map((sub) => ({
            ...sub,
            isActive: pathname === sub.url,
          }))
        return {
          ...item,
          isActive,
          items: itemsWithActive ?? item.items,
        }
      }),
    [pathname]
  )
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher
          organizations={organizations}
          activeOrgId={activeOrgId}
          onActiveOrgChange={setActiveOrgId}
          onWorkspaceSettings={() => setSettingsOpen(true)}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <PilotRebateSidebarProgress />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
