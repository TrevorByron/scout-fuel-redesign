"use client"

import * as React from "react"

import {
  AppSettingsDialog,
  type AppSettingsSection,
} from "@/components/app-settings-dialog"
import type { DriverContactFocusTarget } from "@/components/drivers-settings-panel"
import { useSidebar } from "@/components/ui/sidebar"

type AppSettingsContextValue = {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  /** Opens workspace settings; pass `section` to land on Drivers, Team, etc. */
  openWorkspaceSettings: (
    section?: AppSettingsSection,
    options?: { driverContact?: DriverContactFocusTarget }
  ) => void
}

const AppSettingsContext = React.createContext<AppSettingsContextValue | null>(null)

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = React.useState<
    AppSettingsSection | undefined
  >(undefined)
  const [driversContactFocus, setDriversContactFocus] =
    React.useState<DriverContactFocusTarget | null>(null)
  const { isMobile, setOpenMobile } = useSidebar()

  const openWorkspaceSettings = React.useCallback(
    (section?: AppSettingsSection, options?: { driverContact?: DriverContactFocusTarget }) => {
      setSettingsInitialSection(section)
      setDriversContactFocus(options?.driverContact ?? null)
      setSettingsOpen(true)
    },
    []
  )

  const handleSettingsOpenChange = React.useCallback((next: boolean) => {
    setSettingsOpen(next)
    if (!next) setDriversContactFocus(null)
  }, [])

  const handleConsumedInitialSection = React.useCallback(() => {
    setSettingsInitialSection(undefined)
  }, [])

  const clearDriversContactFocus = React.useCallback(() => {
    setDriversContactFocus(null)
  }, [])

  React.useEffect(() => {
    if (!settingsOpen || !isMobile) return
    setOpenMobile(false)
  }, [settingsOpen, isMobile, setOpenMobile])

  return (
    <AppSettingsContext.Provider
      value={{ settingsOpen, setSettingsOpen, openWorkspaceSettings }}
    >
      {children}
      <AppSettingsDialog
        open={settingsOpen}
        onOpenChange={handleSettingsOpenChange}
        initialSection={settingsInitialSection}
        onConsumedInitialSection={handleConsumedInitialSection}
        driversContactFocus={driversContactFocus}
        onDriversContactFocusConsumed={clearDriversContactFocus}
      />
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
