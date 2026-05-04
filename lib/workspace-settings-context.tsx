"use client"

import * as React from "react"

import type { Org } from "@/components/org-switcher"
import {
  defaultWorkspaceSettings,
  loadWorkspaceSettings,
  saveWorkspaceSettings,
  type WorkspaceSettingsState,
} from "@/lib/workspace-settings-store"
import { analyzeDataUrlForLogoHolder } from "@/lib/analyze-logo-holder"
import { WORKSPACE_BRAND_LOGO_SRC } from "@/lib/workspace-brand"
import type { LogoHolderBackground } from "@/lib/workspace-settings-store"
import { WORKSPACE_SEEDS } from "@/lib/workspace-seeds"

type WorkspaceSettingsContextValue = {
  organizations: Org[]
  activeOrgId: string
  setActiveOrgId: (id: string) => void
  activeOrg: Org | undefined
  /** Raw overrides for forms (e.g. custom logo detection). */
  orgOverrides: Readonly<WorkspaceSettingsState["orgs"]>
  updateOrg: (
    id: string,
    patch: {
      displayName?: string | null
      logoDataUrl?: string | null
      logoHolderBackground?: LogoHolderBackground | null
    }
  ) => void
}

const WorkspaceSettingsContext = React.createContext<WorkspaceSettingsContextValue | null>(
  null
)

function buildOrganizations(state: WorkspaceSettingsState): Org[] {
  return WORKSPACE_SEEDS.map((seed) => {
    const o = state.orgs[seed.id]
    const name =
      o?.displayName !== undefined && o.displayName.trim().length > 0
        ? o.displayName.trim()
        : seed.defaultName
    const uploaded = o?.logoDataUrl?.trim() ?? ""
    const hasUpload = Boolean(uploaded)
    const logoSrc = hasUpload ? uploaded : WORKSPACE_BRAND_LOGO_SRC
    return {
      id: seed.id,
      name,
      subtitle: seed.subtitle,
      logoBackground: hasUpload ? (o?.logoHolderBackground ?? "light") : "light",
      logo: (
        // eslint-disable-next-line @next/next/no-img-element -- static / data URL logos from workspace settings
        <img
          src={logoSrc}
          alt={`${name} logo`}
          className="size-full object-contain"
        />
      ),
    } satisfies Org
  })
}

export function WorkspaceSettingsProvider({ children }: { children: React.ReactNode }) {
  const defaultMemo = React.useMemo(() => defaultWorkspaceSettings(), [])
  const [state, setState] = React.useState<WorkspaceSettingsState>(defaultMemo)

  React.useEffect(() => {
    setState(loadWorkspaceSettings(defaultMemo))
  }, [defaultMemo])

  const holderBackfillInFlight = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    for (const seed of WORKSPACE_SEEDS) {
      const o = state.orgs[seed.id]
      const url = o?.logoDataUrl?.trim()
      if (!url || o?.logoHolderBackground != null) continue
      if (holderBackfillInFlight.current.has(seed.id)) continue
      holderBackfillInFlight.current.add(seed.id)
      void analyzeDataUrlForLogoHolder(url).then((holder) => {
        holderBackfillInFlight.current.delete(seed.id)
        setState((prev) => {
          const cur = prev.orgs[seed.id]
          if (!cur?.logoDataUrl?.trim() || cur.logoHolderBackground != null) return prev
          const nextOrgs = {
            ...prev.orgs,
            [seed.id]: { ...cur, logoHolderBackground: holder },
          }
          const next = { ...prev, orgs: nextOrgs }
          saveWorkspaceSettings(next)
          return next
        })
      })
    }
  }, [state.orgs])

  const organizations = React.useMemo(() => buildOrganizations(state), [state])

  const setActiveOrgId = React.useCallback((id: string) => {
    setState((prev) => {
      const valid = WORKSPACE_SEEDS.some((s) => s.id === id) ? id : prev.activeOrgId
      const next = { ...prev, activeOrgId: valid }
      saveWorkspaceSettings(next)
      return next
    })
  }, [])

  const updateOrg = React.useCallback(
    (
      id: string,
      patch: {
        displayName?: string | null
        logoDataUrl?: string | null
        logoHolderBackground?: LogoHolderBackground | null
      }
    ) => {
      setState((prev) => {
        const nextOrgs = { ...prev.orgs }
        const cur = { ...nextOrgs[id] }

        if ("displayName" in patch) {
          const v = patch.displayName
          if (v === null || v === undefined) {
            delete cur.displayName
          } else {
            const t = v.trim()
            const seed = WORKSPACE_SEEDS.find((s) => s.id === id)
            if (!t || (seed && t === seed.defaultName)) {
              delete cur.displayName
            } else {
              cur.displayName = t
            }
          }
        }

        if ("logoDataUrl" in patch) {
          if (patch.logoDataUrl === null || patch.logoDataUrl === undefined) {
            delete cur.logoDataUrl
            delete cur.logoHolderBackground
          } else {
            cur.logoDataUrl = patch.logoDataUrl
            delete cur.logoHolderBackground
          }
        }

        if ("logoHolderBackground" in patch) {
          const v = patch.logoHolderBackground
          if (v === null || v === undefined) {
            delete cur.logoHolderBackground
          } else {
            cur.logoHolderBackground = v
          }
        }

        if (Object.keys(cur).length === 0) {
          delete nextOrgs[id]
        } else {
          nextOrgs[id] = cur
        }

        const next = { ...prev, orgs: nextOrgs }
        saveWorkspaceSettings(next)
        return next
      })
    },
    []
  )

  const activeOrg = React.useMemo(
    () => organizations.find((o) => o.id === state.activeOrgId),
    [organizations, state.activeOrgId]
  )

  const value = React.useMemo<WorkspaceSettingsContextValue>(
    () => ({
      organizations,
      activeOrgId: state.activeOrgId,
      setActiveOrgId,
      activeOrg,
      orgOverrides: state.orgs,
      updateOrg,
    }),
    [organizations, state.activeOrgId, setActiveOrgId, activeOrg, state.orgs, updateOrg]
  )

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  )
}

export function useWorkspaceSettings(): WorkspaceSettingsContextValue {
  const ctx = React.useContext(WorkspaceSettingsContext)
  if (!ctx) {
    throw new Error("useWorkspaceSettings must be used within WorkspaceSettingsProvider")
  }
  return ctx
}

/** Same as `useWorkspaceSettings` but returns `null` outside the provider (e.g. standalone settings routes). */
export function useOptionalWorkspaceSettings(): WorkspaceSettingsContextValue | null {
  return React.useContext(WorkspaceSettingsContext)
}
