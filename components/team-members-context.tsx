"use client"

import * as React from "react"

import {
  DEFAULT_TEAM_MEMBERS,
  loadTeamMembers,
  saveTeamMembers,
  type TeamMember,
} from "@/lib/team-members-store"

type TeamMembersContextValue = {
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
}

const TeamMembersContext = React.createContext<TeamMembersContextValue | null>(null)

export function TeamMembersProvider({ children }: { children: React.ReactNode }) {
  const defaultMemo = React.useMemo(() => [...DEFAULT_TEAM_MEMBERS], [])
  const [members, setMembers] = React.useState<TeamMember[]>(defaultMemo)

  React.useEffect(() => {
    setMembers(loadTeamMembers(defaultMemo))
  }, [defaultMemo])

  const setMembersPersist = React.useCallback(
    (action: React.SetStateAction<TeamMember[]>) => {
      setMembers((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        saveTeamMembers(next)
        return next
      })
    },
    []
  )

  const value = React.useMemo<TeamMembersContextValue>(
    () => ({ members, setMembers: setMembersPersist }),
    [members, setMembersPersist]
  )

  return <TeamMembersContext.Provider value={value}>{children}</TeamMembersContext.Provider>
}

export function useTeamMembers(): TeamMembersContextValue {
  const ctx = React.useContext(TeamMembersContext)
  if (!ctx) {
    throw new Error("useTeamMembers must be used within TeamMembersProvider")
  }
  return ctx
}

export function useOptionalTeamMembers(): TeamMembersContextValue | null {
  return React.useContext(TeamMembersContext)
}
