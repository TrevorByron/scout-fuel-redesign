/** Shared team role literals (server-safe; no React). */
export const TEAM_ROLES = ["Admin", "Dispatcher", "Driver"] as const

export type TeamRole = (typeof TEAM_ROLES)[number]
