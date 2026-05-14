"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useAppSettings } from "@/components/app-settings-provider"
import { NavMain } from "@/components/nav-main"
import { PilotRebateSidebarProgress } from "@/components/pilot-rebate-sidebar-progress"
import { NavUser } from "@/components/nav-user"
import { OrgSwitcher } from "@/components/org-switcher"
import { useTeamMembers } from "@/components/team-members-context"
import { loadProfile, type UserProfile } from "@/lib/profile-store"
import { currentUserCanAccessFuelFinder } from "@/lib/team-access"
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
  BalanceScaleIcon,
  DashboardSquare01Icon,
  Location01Icon,
  ReceiptDollarIcon,
  UserGroupIcon,
  UserIcon,
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
    { title: "Feet Performance", url: "/", icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} /> },
    { title: "My Performance", url: "/my-performance", icon: <HugeiconsIcon icon={UserIcon} strokeWidth={2} /> },
    { title: "Optimizer", url: "/route-optimizer", icon: <HugeiconsIcon icon={Route01Icon} strokeWidth={2} /> },
    { title: "Trips", url: "/trips", icon: <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} /> },
    { title: "Driver Insights", url: "/drivers", icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} /> },
    { title: "Location Insights", url: "/locations", icon: <HugeiconsIcon icon={Location01Icon} strokeWidth={2} /> },
    { title: "Fuel Data", url: "/transactions", icon: <HugeiconsIcon icon={ReceiptDollarIcon} strokeWidth={2} /> },
    { title: "Fuel Finder", url: "/fuel-finder", icon: <HugeiconsIcon icon={Search01Icon} strokeWidth={2} /> },
    { title: "Deal Analyzer", url: "/deal-analyzer", icon: <HugeiconsIcon icon={BalanceScaleIcon} strokeWidth={2} /> },
  ] as NavMainItem[],
}

const defaultProfileForNav: UserProfile = {
  name: data.user.name,
  email: data.user.email,
  phone: "",
  title: "",
  avatar: data.user.avatar,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setSettingsOpen } = useAppSettings()
  const { organizations, activeOrgId, setActiveOrgId } = useWorkspaceSettings()
  const { members } = useTeamMembers()
  const [profileEpoch, setProfileEpoch] = React.useState(0)

  React.useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1)
    window.addEventListener("focus", bump)
    window.addEventListener("scoutfuel:profile-updated", bump)
    return () => {
      window.removeEventListener("focus", bump)
      window.removeEventListener("scoutfuel:profile-updated", bump)
    }
  }, [])

  const navMainWithActive = React.useMemo(
    () => {
      void profileEpoch
      const email = loadProfile(defaultProfileForNav).email
      const canFuelFinder = currentUserCanAccessFuelFinder({
        profileEmail: email,
        members,
      })
      return data.navMain
        .filter((item) => (item.url === "/fuel-finder" ? canFuelFinder : true))
        .map((item) => {
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
        })
    },
    [pathname, members, profileEpoch]
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
