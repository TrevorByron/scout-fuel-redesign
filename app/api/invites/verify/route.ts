import { NextResponse } from "next/server"

import { verifyInviteToken } from "@/lib/invite-token"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")?.trim()
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const result = verifyInviteToken(token)
  if (!result.ok) {
    const status =
      result.reason === "expired" ? 410 : result.reason === "malformed" ? 400 : 401
    return NextResponse.json({ error: "Invalid or expired invite", reason: result.reason }, { status })
  }

  const { email, role, note, orgDisplayName } = result.payload
  return NextResponse.json({
    email,
    role,
    note: note || undefined,
    orgDisplayName: orgDisplayName || undefined,
  })
}
