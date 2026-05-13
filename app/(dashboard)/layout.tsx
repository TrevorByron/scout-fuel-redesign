import { AppSidebar } from "@/components/app-sidebar"
import { AppSettingsProvider } from "@/components/app-settings-provider"
import { DealAnalyzerHeaderNavProvider } from "@/components/deal-analyzer/deal-analyzer-header-nav"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TripsProvider } from "@/lib/trips-context"
import { TeamMembersProvider } from "@/components/team-members-context"
import { WorkspaceSettingsProvider } from "@/lib/workspace-settings-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TripsProvider>
      <WorkspaceSettingsProvider>
        <TeamMembersProvider>
          <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSettingsProvider>
            <DealAnalyzerHeaderNavProvider>
              <AppSidebar variant="inset" />
              <SidebarInset>
                <SiteHeader />
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </DealAnalyzerHeaderNavProvider>
          </AppSettingsProvider>
          </SidebarProvider>
        </TeamMembersProvider>
      </WorkspaceSettingsProvider>
    </TripsProvider>
  )
}
