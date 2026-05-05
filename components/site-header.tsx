"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/alerts": "Alerts",
  "/budget": "Budget",
  "/drivers/": "Driver",
  "/drivers": "Driver Insights",
  "/fleet": "Live Fleet Map",
  "/locations/": "Location",
  "/locations": "Locations",
  "/fuel-finder": "Fuel Finder",
  "/route-optimizer": "Optimizer",
  "/transactions": "Fuel Data",
  "/deal-analyzer/analyze": "Analyze deal",
  "/deal-analyzer": "Fuel Deal Analyzer",
  "/trips/": "Trip",
  "/trips": "Trips",
}

function usePageTitle(): string {
  const pathname = usePathname()
  const entries = Object.entries(PAGE_TITLES).sort(
    (a, b) => b[0].length - a[0].length
  )
  for (const [path, title] of entries) {
    if (path === "/" ? pathname === "/" : pathname.startsWith(path)) {
      return title
    }
  }
  return "ScoutFuel"
}

function DealAnalyzerAnalyzeHeaderCrumb() {
  return (
    <>
      <h1 className="sr-only">Analyze deal</h1>
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="gap-1 text-muted-foreground sm:gap-1.5">
          <BreadcrumbItem className="max-sm:max-w-[42vw]">
            <BreadcrumbLink
              render={<Link href="/deal-analyzer" />}
              className="inline-flex min-h-11 max-w-full items-center truncate rounded-md px-1 text-xs font-normal sm:min-h-9 sm:text-sm"
            >
              Fuel Deal Analyzer
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="[&>svg]:size-3.5 [&>svg]:opacity-70">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="inline-flex min-h-11 max-w-full items-center truncate text-xs font-medium text-foreground sm:min-h-9 sm:text-sm">
              Analyze deal
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = usePageTitle()
  const dealAnalyzeCrumb = pathname.startsWith("/deal-analyzer/analyze")

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 shrink-0 data-vertical:self-auto"
        />
        <div className="min-w-0 flex-1">
          {dealAnalyzeCrumb ? (
            <DealAnalyzerAnalyzeHeaderCrumb />
          ) : (
            <h1 className="truncate text-lg font-medium sm:text-base">{title}</h1>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
