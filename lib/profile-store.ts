"use client"

export type UserProfile = {
  name: string
  email: string
  phone: string
  title: string
  avatar: string
}

const PROFILE_STORAGE_KEY = "scoutfuel:user-profile"

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.phone === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.avatar === "string"
  )
}

export function loadProfile(defaultProfile: UserProfile): UserProfile {
  if (typeof window === "undefined") return defaultProfile
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) return defaultProfile
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isUserProfile(parsed)) return defaultProfile
    return parsed
  } catch {
    return defaultProfile
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}
