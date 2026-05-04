import type { LucideIcon } from "lucide-react"
import {
  Contact,
  CreditCard,
  FileText,
  Settings,
  Truck,
  Users,
} from "lucide-react"

export type AppSettingsSection =
  | "general"
  | "team"
  | "drivers"
  | "trucks"
  | "billing"
  | "terms"

export type SettingsGroupId = "admin" | "fleet" | "terms"

export type SettingsNavItem = {
  section: AppSettingsSection
  label: string
  tooltip: string
  Icon: LucideIcon
}

export type SettingsNavGroup = {
  id: SettingsGroupId
  label: string
  items: SettingsNavItem[]
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "admin",
    label: "Admin",
    items: [
      { section: "general", label: "Company", tooltip: "Company", Icon: Settings },
      { section: "team", label: "Team", tooltip: "Team", Icon: Users },
      { section: "billing", label: "Billing", tooltip: "Billing", Icon: CreditCard },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    items: [
      { section: "drivers", label: "Drivers", tooltip: "Drivers", Icon: Contact },
      { section: "trucks", label: "Trucks", tooltip: "Trucks", Icon: Truck },
    ],
  },
  {
    id: "terms",
    label: "Terms",
    items: [{ section: "terms", label: "Terms", tooltip: "Terms", Icon: FileText }],
  },
]

export function getNavGroup(id: SettingsGroupId): SettingsNavGroup | undefined {
  return SETTINGS_NAV_GROUPS.find((g) => g.id === id)
}

export function getGroupIdForSection(section: AppSettingsSection): SettingsGroupId | undefined {
  for (const g of SETTINGS_NAV_GROUPS) {
    if (g.items.some((i) => i.section === section)) return g.id
  }
  return undefined
}

export function getNavItemForSection(section: AppSettingsSection): SettingsNavItem | undefined {
  for (const g of SETTINGS_NAV_GROUPS) {
    const item = g.items.find((i) => i.section === section)
    if (item) return item
  }
  return undefined
}
