import type { TeamMember } from "@/lib/team-members-store"
import type { TeamRole } from "@/lib/team-roles"

/** Roles where Fuel Finder is gated by `fuelFinderAccess` (active members only). Admins always have access. */
export function isPricingAccessGatedRole(role: TeamRole): boolean {
  return role === "Driver" || role === "Dispatcher"
}

export function getMemberByEmailLower(
  members: readonly TeamMember[],
  email: string
): TeamMember | undefined {
  const lower = email.trim().toLowerCase()
  if (!lower) return undefined
  return members.find((m) => m.email.toLowerCase() === lower)
}

export function getActiveMemberByEmail(
  members: readonly TeamMember[],
  email: string
): TeamMember | undefined {
  const m = getMemberByEmailLower(members, email)
  if (!m || m.status !== "active") return undefined
  return m
}

/** Whether this roster member may open Fuel Finder (pricing). Admins always; Drivers and Dispatchers need active + flag. */
export function canAccessFuelFinderForMember(member: TeamMember | undefined): boolean {
  if (!member) return false
  if (member.role === "Admin") return true
  if (!isPricingAccessGatedRole(member.role)) return false
  if (member.status !== "active") return false
  return member.fuelFinderAccess === true
}

export function currentUserCanAccessFuelFinder(params: {
  profileEmail: string
  members: readonly TeamMember[]
}): boolean {
  const member = getMemberByEmailLower(params.members, params.profileEmail)
  return canAccessFuelFinderForMember(member)
}

export function isWorkspaceAdminByEmail(
  members: readonly TeamMember[],
  email: string
): boolean {
  const m = getActiveMemberByEmail(members, email)
  return m?.role === "Admin"
}
