"use client"

import { z } from "zod"

import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles"

const TEAM_STORAGE_KEY = "scoutfuel:team-members"

export type MemberStatus = "pending" | "active"

export type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  status: MemberStatus
  invitedAt: string
  /** Included in the invitation email for pending invites. */
  inviteNote?: string
  /**
   * When role is Driver or Dispatcher and status is active, grants Fuel Finder (pricing) access.
   * Ignored for Admin. Default false when absent.
   */
  fuelFinderAccess?: boolean
}

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(TEAM_ROLES),
  status: z.enum(["pending", "active"]),
  invitedAt: z.string(),
  inviteNote: z.string().optional(),
  fuelFinderAccess: z.boolean().optional(),
})

const teamMembersFileSchema = z.object({
  members: z.array(teamMemberSchema),
})

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm_1",
    name: "Fleet Admin",
    email: "admin@scoutfuel.com",
    role: "Admin",
    status: "active",
    invitedAt: "2026-04-22T10:00:00.000Z",
  },
  {
    id: "tm_2",
    name: "Dispatch Lead",
    email: "dispatch@scoutfuel.com",
    role: "Dispatcher",
    status: "active",
    invitedAt: "2026-04-23T10:00:00.000Z",
    fuelFinderAccess: true,
  },
  {
    id: "tm_3",
    name: "Pending User",
    email: "newdriver@scoutfuel.com",
    role: "Driver",
    status: "pending",
    invitedAt: "2026-04-28T10:00:00.000Z",
  },
  {
    id: "tm_4",
    name: "Road Driver",
    email: "driver@scoutfuel.com",
    role: "Driver",
    status: "active",
    invitedAt: "2026-04-29T10:00:00.000Z",
    fuelFinderAccess: false,
  },
  {
    id: "tm_5",
    name: "Regional Driver",
    email: "pricing-driver@scoutfuel.com",
    role: "Driver",
    status: "active",
    invitedAt: "2026-04-29T11:00:00.000Z",
    fuelFinderAccess: true,
  },
]

function isTeamMemberArray(value: unknown): value is TeamMember[] {
  const parsed = z.array(teamMemberSchema).safeParse(value)
  return parsed.success
}

export function loadTeamMembers(fallback: TeamMember[]): TeamMember[] {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(TEAM_STORAGE_KEY)
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    const wrapped = teamMembersFileSchema.safeParse(parsed)
    if (wrapped.success && isTeamMemberArray(wrapped.data.members)) {
      return wrapped.data.members
    }
    if (isTeamMemberArray(parsed)) {
      return parsed
    }
    return fallback
  } catch {
    return fallback
  }
}

export function saveTeamMembers(members: TeamMember[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify({ members }))
}
