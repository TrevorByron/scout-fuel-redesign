import { TeamMembersProvider } from "@/components/team-members-context"
import { WorkspaceSettingsProvider } from "@/lib/workspace-settings-context"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceSettingsProvider>
      <TeamMembersProvider>{children}</TeamMembersProvider>
    </WorkspaceSettingsProvider>
  )
}
