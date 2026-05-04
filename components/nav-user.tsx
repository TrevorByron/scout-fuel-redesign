"use client"

import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ProfileSettingsSheet } from "@/components/profile-settings-sheet"
import { loadProfile, saveProfile, type UserProfile } from "@/lib/profile-store"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon, LogoutIcon } from "@hugeicons/core-free-icons"
import { CircleUser } from "lucide-react"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()

  const defaultProfile = React.useMemo<UserProfile>(
    () => ({
      name: user.name,
      email: user.email,
      phone: "",
      title: "",
      avatar: user.avatar,
    }),
    [user.avatar, user.email, user.name]
  )
  const [profile, setProfile] = React.useState<UserProfile>(defaultProfile)
  const [profileOpen, setProfileOpen] = React.useState(false)

  React.useEffect(() => {
    setProfile(loadProfile(defaultProfile))
  }, [defaultProfile])

  const initials = React.useMemo(() => {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return "CN"
    const first = parts[0]?.[0] ?? ""
    const second = parts[1]?.[0] ?? ""
    return `${first}${second}`.toUpperCase()
  }, [profile.name])

  function handleProfileSave(nextProfile: UserProfile) {
    setProfile(nextProfile)
    saveProfile(nextProfile)
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
              }
            >
              <Avatar>
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{profile.name}</span>
                <span className="truncate text-xs">{profile.email}</span>
              </div>
              <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{profile.name}</span>
                    <span className="truncate text-xs">{profile.email}</span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <CircleUser />
                  Manage profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ProfileSettingsSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onProfileSave={handleProfileSave}
      />
    </>
  )
}
