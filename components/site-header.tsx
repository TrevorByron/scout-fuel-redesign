"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/fleet": "Live Fleet Map",
  "/transactions": "Fuel Transactions",
  "/pricing-summary": "Pricing Summary",
  "/drivers": "Driver Insights",
  "/route-optimizer": "Optimizer",
  "/trips": "Trips",
}

function usePageTitle(): string {
  const pathname = usePathname()
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path === "/" ? pathname === "/" : pathname.startsWith(path)) {
      return title
    }
  }
  return "FuelCommand"
}

export function SiteHeader() {
  const title = usePageTitle()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
