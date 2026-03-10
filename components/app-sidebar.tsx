"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { OrgSwitcher } from "@/components/org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  MapsSquare01Icon,
  ReceiptDollarIcon,
  UserGroupIcon,
  Route01Icon,
  TruckDeliveryIcon,
  ChartRingIcon,
  SentIcon,
} from "@hugeicons/core-free-icons"

type NavMainItem = {
  title: string
  url: string
  icon: React.ReactNode
  items?: { title: string; url: string }[]
}

const data = {
  user: {
    name: "Fleet Manager",
    email: "admin@scoutfuel.com",
    avatar: "/avatars/shadcn.jpg",
  },
  organizations: [
    {
      name: "Frontier Trucking",
      logo: (
        <img
          src="/logos/frontier-trucking.png"
          alt=""
          className="size-full object-contain"
        />
      ),
      subtitle: "Fuel Management",
      logoBackground: "dark" as const,
    },
    {
      name: "Brink Truck Lines",
      logo: (
        <img
          src="/logos/brink-truck-lines.png"
          alt=""
          className="size-full object-contain"
        />
      ),
      subtitle: "Fuel Management",
      logoBackground: "light" as const,
    },
    {
      name: "JFW Trucking",
      logo: (
        <img
          src="/logos/jfw-trucking.png"
          alt=""
          className="size-full object-contain"
        />
      ),
      subtitle: "Fuel Management",
      logoBackground: "light" as const,
    },
  ],
  navMain: [
    { title: "Dashboard", url: "/", icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} /> },
    { title: "Optimizer", url: "/route-optimizer", icon: <HugeiconsIcon icon={Route01Icon} strokeWidth={2} /> },
    { title: "Trips", url: "/trips", icon: <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} /> },
    { title: "Live Fleet Map", url: "/fleet", icon: <HugeiconsIcon icon={MapsSquare01Icon} strokeWidth={2} /> },
    { title: "Fuel Transactions", url: "/transactions", icon: <HugeiconsIcon icon={ReceiptDollarIcon} strokeWidth={2} /> },
    { title: "Pricing Summary", url: "/pricing-summary", icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} /> },
    { title: "Driver Insights", url: "/drivers", icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} /> },
  ] as NavMainItem[],
  navSecondary: [
    { title: "Support", url: "#", icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} /> },
    { title: "Feedback", url: "#", icon: <HugeiconsIcon icon={SentIcon} strokeWidth={2} /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
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
        <OrgSwitcher organizations={data.organizations} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
