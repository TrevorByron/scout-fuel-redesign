import { NextResponse } from "next/server"
import { Resend } from "resend"

import { buildTeamInviteEmailHtml } from "@/lib/email/team-invite-html"
import { getPublicAppUrl } from "@/lib/invite-app-url"
import { postInvitesBodySchema } from "@/lib/invite-request-schemas"
import { createInviteToken, verifyInviteToken } from "@/lib/invite-token"

export const dynamic = "force-dynamic"

const DEFAULT_SUBJECT = "You're invited to ScoutFuel"

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim()
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Email is not configured (set RESEND_API_KEY and RESEND_FROM)." },
      { status: 503 }
    )
  }

  if (!process.env.INVITE_TOKEN_SECRET?.trim()) {
    return NextResponse.json(
      { error: "Invite signing is not configured (set INVITE_TOKEN_SECRET)." },
      { status: 503 }
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = postInvitesBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    )
  }

  const body = parsed.data
  const appUrl = getPublicAppUrl()
  const subject = DEFAULT_SUBJECT
  const resend = new Resend(apiKey)

  const results: { email: string; ok: boolean; error?: string; jti?: string }[] = []

  for (const email of body.emails.map((e) => e.toLowerCase())) {
    try {
      const token = createInviteToken({
        email,
        role: body.role,
        note: body.note.trim(),
        orgDisplayName: body.orgDisplayName?.trim() || undefined,
      })
      const verified = verifyInviteToken(token)
      const jti = verified.ok ? verified.payload.jti : undefined

      const html = buildTeamInviteEmailHtml({
        appUrl,
        joinToken: token,
        recipientEmail: email,
        roleLabel: body.role,
        personalNote: body.note,
        orgDisplayName: body.orgDisplayName?.trim() || undefined,
        inviterName: body.inviterName?.trim() || "Your teammate",
        inviterEmail: body.inviterEmail?.trim() || undefined,
      })

      const { error } = await resend.emails.send({
        from,
        to: email,
        subject,
        html,
      })

      if (error) {
        results.push({
          email,
          ok: false,
          error: typeof error.message === "string" ? error.message : "Send failed",
        })
      } else {
        results.push({ email, ok: true, jti })
      }
    } catch (e) {
      results.push({
        email,
        ok: false,
        error: e instanceof Error ? e.message : "Send failed",
      })
    }
  }

  const allOk = results.every((r) => r.ok)
  return NextResponse.json(
    { results, subject },
    { status: allOk ? 200 : 207 }
  )
}
