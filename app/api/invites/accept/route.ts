import { NextResponse } from "next/server"

import { postInvitesAcceptBodySchema } from "@/lib/invite-request-schemas"
import { usernameFromDisplayName } from "@/lib/username-from-display-name"
import { verifyInviteToken } from "@/lib/invite-token"
import { PROTOTYPE_PROFILE_STORAGE_KEY } from "@/lib/prototype-profile"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = postInvitesAcceptBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    )
  }

  const data = parsed.data
  const invite = verifyInviteToken(data.token)
  if (!invite.ok) {
    return NextResponse.json(
      { error: "Invalid or expired invite", reason: invite.reason },
      { status: invite.reason === "expired" ? 410 : 401 }
    )
  }

  const displayName = data.displayName.trim()

  return NextResponse.json({
    ok: true,
    profile: {
      email: invite.payload.email,
      displayName,
      username: usernameFromDisplayName(displayName),
      role: invite.payload.role,
      ...(data.phone ? { phone: data.phone } : {}),
      /** Hint for client localStorage (server does not persist passwords). */
      localStorageKey: PROTOTYPE_PROFILE_STORAGE_KEY,
    },
  })
}
