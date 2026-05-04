"use client"

import * as React from "react"

import { AppSettingsDialog } from "@/components/app-settings-dialog"
import { useSidebar } from "@/components/ui/sidebar"

type AppSettingsContextValue = {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

const AppSettingsContext = React.createContext<AppSettingsContextValue | null>(null)

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const { isMobile, setOpenMobile } = useSidebar()

  React.useEffect(() => {
    if (!settingsOpen || !isMobile) return
    setOpenMobile(false)
  }, [settingsOpen, isMobile, setOpenMobile])

  return (
    <AppSettingsContext.Provider value={{ settingsOpen, setSettingsOpen }}>
      {children}
      <AppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = React.useContext(AppSettingsContext)
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider")
  }
  return ctx
}
