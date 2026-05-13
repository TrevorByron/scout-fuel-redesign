"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { PricingSummaryUber } from "@/components/pricing-summary-uber"
import { useTeamMembers } from "@/components/team-members-context"
import { loadProfile, type UserProfile } from "@/lib/profile-store"
import { currentUserCanAccessFuelFinder } from "@/lib/team-access"

const DEFAULT_PROFILE: UserProfile = {
  name: "Trevor Borden",
  email: "admin@scoutfuel.com",
  phone: "",
  title: "",
  avatar: "/avatars/shadcn.jpg",
}

export function FuelFinderPanel() {
  const router = useRouter()
  const { members } = useTeamMembers()
  const [profileEpoch, setProfileEpoch] = React.useState(0)

  React.useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1)
    window.addEventListener("scoutfuel:profile-updated", bump)
    return () => window.removeEventListener("scoutfuel:profile-updated", bump)
  }, [])

  const canAccess = React.useMemo(() => {
    void profileEpoch
    return currentUserCanAccessFuelFinder({
      profileEmail: loadProfile(DEFAULT_PROFILE).email,
      members,
    })
  }, [members, profileEpoch])

  React.useEffect(() => {
    if (!canAccess) {
      router.replace("/")
    }
  }, [canAccess, router])

  if (!canAccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
        You do not have access to Fuel Finder.
      </div>
    )
  }

  return <PricingSummaryUber />
}
