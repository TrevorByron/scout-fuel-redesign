import { describe, expect, it } from "vitest"

import {
  canAccessFuelFinderForMember,
  currentUserCanAccessFuelFinder,
  isPricingAccessGatedRole,
} from "@/lib/team-access"
import type { TeamMember } from "@/lib/team-members-store"

function m(partial: Partial<TeamMember> & Pick<TeamMember, "id" | "email" | "role" | "status">): TeamMember {
  return {
    name: "User",
    invitedAt: "",
    ...partial,
  }
}

const baseMembers: TeamMember[] = [
  m({
    id: "1",
    email: "admin@test.com",
    role: "Admin",
    status: "active",
  }),
  m({
    id: "2",
    email: "driver@test.com",
    role: "Driver",
    status: "active",
    fuelFinderAccess: false,
  }),
  m({
    id: "3",
    email: "driver2@test.com",
    role: "Driver",
    status: "active",
    fuelFinderAccess: true,
  }),
  m({
    id: "4",
    email: "dispatch@test.com",
    role: "Dispatcher",
    status: "active",
    fuelFinderAccess: false,
  }),
  m({
    id: "5",
    email: "dispatch2@test.com",
    role: "Dispatcher",
    status: "active",
    fuelFinderAccess: true,
  }),
]

describe("isPricingAccessGatedRole", () => {
  it("is true for Driver and Dispatcher only", () => {
    expect(isPricingAccessGatedRole("Driver")).toBe(true)
    expect(isPricingAccessGatedRole("Dispatcher")).toBe(true)
    expect(isPricingAccessGatedRole("Admin")).toBe(false)
  })
})

describe("canAccessFuelFinderForMember", () => {
  it("allows Admin regardless of fuelFinderAccess", () => {
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "a",
          email: "a@test.com",
          role: "Admin",
          status: "active",
          fuelFinderAccess: false,
        })
      )
    ).toBe(true)
  })

  it("blocks Driver when fuelFinderAccess is false or absent", () => {
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "d",
          email: "d@test.com",
          role: "Driver",
          status: "active",
          fuelFinderAccess: false,
        })
      )
    ).toBe(false)
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "d2",
          email: "d2@test.com",
          role: "Driver",
          status: "active",
        })
      )
    ).toBe(false)
  })

  it("allows Driver when fuelFinderAccess is true", () => {
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "d",
          email: "d@test.com",
          role: "Driver",
          status: "active",
          fuelFinderAccess: true,
        })
      )
    ).toBe(true)
  })

  it("gates Dispatcher the same as Driver", () => {
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "x",
          email: "x@test.com",
          role: "Dispatcher",
          status: "active",
          fuelFinderAccess: false,
        })
      )
    ).toBe(false)
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "y",
          email: "y@test.com",
          role: "Dispatcher",
          status: "active",
          fuelFinderAccess: true,
        })
      )
    ).toBe(true)
  })

  it("blocks pending Driver or Dispatcher even with fuelFinderAccess true", () => {
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "d",
          email: "d@test.com",
          role: "Driver",
          status: "pending",
          fuelFinderAccess: true,
        })
      )
    ).toBe(false)
    expect(
      canAccessFuelFinderForMember(
        m({
          id: "p",
          email: "p@test.com",
          role: "Dispatcher",
          status: "pending",
          fuelFinderAccess: true,
        })
      )
    ).toBe(false)
  })
})

describe("currentUserCanAccessFuelFinder", () => {
  it("differs between drivers on the same roster", () => {
    expect(
      currentUserCanAccessFuelFinder({
        profileEmail: "driver@test.com",
        members: baseMembers,
      })
    ).toBe(false)
    expect(
      currentUserCanAccessFuelFinder({
        profileEmail: "driver2@test.com",
        members: baseMembers,
      })
    ).toBe(true)
  })

  it("differs between dispatchers on the same roster", () => {
    expect(
      currentUserCanAccessFuelFinder({
        profileEmail: "dispatch@test.com",
        members: baseMembers,
      })
    ).toBe(false)
    expect(
      currentUserCanAccessFuelFinder({
        profileEmail: "dispatch2@test.com",
        members: baseMembers,
      })
    ).toBe(true)
  })

  it("returns false when email not on roster", () => {
    expect(
      currentUserCanAccessFuelFinder({
        profileEmail: "nobody@test.com",
        members: baseMembers,
      })
    ).toBe(false)
  })
})
