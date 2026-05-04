import { NextResponse } from "next/server"

import { buildTeamInviteEmailHtml } from "@/lib/email/team-invite-html"
import { getPublicAppUrl } from "@/lib/invite-app-url"
import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles"

export const dynamic = "force-dynamic"

function isTeamRole(v: string): v is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(v)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roleRaw = searchParams.get("role")?.trim() || "Dispatcher"
  const role = isTeamRole(roleRaw) ? roleRaw : "Dispatcher"
  const note = searchParams.get("note") ?? ""
  const orgDisplayName = searchParams.get("orgDisplayName")?.trim() || undefined
  const recipientEmail =
    searchParams.get("recipientEmail")?.trim() || "teammate@example.com"
  const inviterName =
    searchParams.get("inviterName")?.trim().slice(0, 120) || "Your teammate"
  const inviterEmail =
    searchParams.get("inviterEmail")?.trim().slice(0, 160) || undefined

  const appUrl = getPublicAppUrl()
  const html = buildTeamInviteEmailHtml({
    appUrl,
    joinToken: "preview",
    recipientEmail,
    roleLabel: role,
    personalNote: note.slice(0, 500),
    orgDisplayName,
    inviterName,
    inviterEmail,
    isPreview: true,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
