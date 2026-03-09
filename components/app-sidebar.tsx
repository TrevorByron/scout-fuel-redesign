"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CommandIcon,
  DashboardSquare01Icon,
  MapsSquare01Icon,
  ReceiptDollarIcon,
  UserGroupIcon,
  Route01Icon,
  ChartHistogramIcon,
  AlertCircleIcon,
  ChartRingIcon,
  SentIcon,
  CropIcon,
  PieChartIcon,
  MapsIcon,
} from "@hugeicons/core-free-icons"

const data = {
  user: {
    name: "Fleet Manager",
    email: "admin@scoutfuel.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Scout Fuel",
      logo: <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />,
      plan: "Fleet Management",
    },
  ],
  navMain: [
    { title: "Dashboard", url: "/", icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} /> },
    { title: "Live Fleet Map", url: "/fleet", icon: <HugeiconsIcon icon={MapsSquare01Icon} strokeWidth={2} /> },
    { title: "Fuel Transactions", url: "/transactions", icon: <HugeiconsIcon icon={ReceiptDollarIcon} strokeWidth={2} /> },
    { title: "Driver Performance", url: "/drivers", icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} /> },
    { title: "Route Optimizer", url: "/route-optimizer", icon: <HugeiconsIcon icon={Route01Icon} strokeWidth={2} /> },
    { title: "Budget & Forecasting", url: "/budget", icon: <HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} /> },
    { title: "Alerts & Recommendations", url: "/alerts", icon: <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} /> },
  ],
  navSecondary: [
    { title: "Support", url: "#", icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} /> },
    { title: "Feedback", url: "#", icon: <HugeiconsIcon icon={SentIcon} strokeWidth={2} /> },
  ],
  projects: [
    { name: "Fleet Alpha", url: "#", icon: <HugeiconsIcon icon={CropIcon} strokeWidth={2} /> },
    { name: "Fleet Beta", url: "#", icon: <HugeiconsIcon icon={PieChartIcon} strokeWidth={2} /> },
    { name: "Regional Routes", url: "#", icon: <HugeiconsIcon icon={MapsIcon} strokeWidth={2} /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const navMainWithActive = React.useMemo(
    () =>
      data.navMain.map((item) => ({
        ...item,
        isActive: item.url === "/" ? pathname === "/" : pathname.startsWith(item.url),
      })),
    [pathname]
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
