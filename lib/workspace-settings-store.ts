"use client"

import { WORKSPACE_SEEDS } from "@/lib/workspace-seeds"

export type LogoHolderBackground = "light" | "dark"

export type OrgBrandingOverride = {
  displayName?: string
  logoDataUrl?: string
  /** Holder tile for custom logo (from luminance analysis). */
  logoHolderBackground?: LogoHolderBackground
}

export type WorkspaceSettingsState = {
  activeOrgId: string
  orgs: Record<string, OrgBrandingOverride>
}

const WORKSPACE_STORAGE_KEY = "scoutfuel:workspace-settings"

/** Reject uploads larger than this to reduce localStorage pressure. */
export const MAX_WORKSPACE_LOGO_BYTES = 400 * 1024

function isOrgBrandingOverride(value: unknown): value is OrgBrandingOverride {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  if (o.displayName !== undefined && typeof o.displayName !== "string") return false
  if (o.logoDataUrl !== undefined && typeof o.logoDataUrl !== "string") return false
  if (o.logoHolderBackground !== undefined) {
    if (o.logoHolderBackground !== "light" && o.logoHolderBackground !== "dark") {
      return false
    }
  }
  return true
}

function isWorkspaceSettingsState(value: unknown): value is WorkspaceSettingsState {
  if (!value || typeof value !== "object") return false
  const s = value as Record<string, unknown>
  if (typeof s.activeOrgId !== "string") return false
  if (!s.orgs || typeof s.orgs !== "object") return false
  const orgs = s.orgs as Record<string, unknown>
  for (const v of Object.values(orgs)) {
    if (!isOrgBrandingOverride(v)) return false
  }
  return true
}

export function defaultWorkspaceSettings(): WorkspaceSettingsState {
  return {
    activeOrgId: WORKSPACE_SEEDS[0]!.id,
    orgs: {},
  }
}

function normalizeActiveOrgId(activeOrgId: string): string {
  const valid = WORKSPACE_SEEDS.some((s) => s.id === activeOrgId)
  return valid ? activeOrgId : WORKSPACE_SEEDS[0]!.id
}

export function loadWorkspaceSettings(
  fallback: WorkspaceSettingsState
): WorkspaceSettingsState {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isWorkspaceSettingsState(parsed)) return fallback
    return {
      activeOrgId: normalizeActiveOrgId(parsed.activeOrgId),
      orgs: parsed.orgs,
    }
  } catch {
    return fallback
  }
}

export function saveWorkspaceSettings(data: WorkspaceSettingsState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      activeOrgId: normalizeActiveOrgId(data.activeOrgId),
      orgs: data.orgs,
    })
  )
}
