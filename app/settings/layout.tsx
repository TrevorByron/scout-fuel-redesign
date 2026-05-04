import { WorkspaceSettingsProvider } from "@/lib/workspace-settings-context"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceSettingsProvider>{children}</WorkspaceSettingsProvider>
}
