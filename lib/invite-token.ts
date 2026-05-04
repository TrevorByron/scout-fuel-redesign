import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles"

export type InviteTokenPayload = {
  email: string
  role: TeamRole
  /** Personal note from inviter (may be empty). */
  note: string
  /** Optional fleet/org label for the email body. */
  orgDisplayName?: string
  /** Unix timestamp (ms) when the token expires. */
  exp: number
  jti: string
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4 || 4)
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad % 4)
  return Buffer.from(b64, "base64")
}

function getSecret(): string {
  const s = process.env.INVITE_TOKEN_SECRET?.trim()
  if (!s) {
    throw new Error("INVITE_TOKEN_SECRET is not set")
  }
  return s
}

function signPayloadJson(json: string): string {
  return base64UrlEncode(createHmac("sha256", getSecret()).update(json).digest())
}

export function createInviteToken(payload: Omit<InviteTokenPayload, "exp" | "jti">): string {
  const expMs =
    Date.now() +
    (Number(process.env.INVITE_TOKEN_EXPIRY_DAYS) || 7) * 24 * 60 * 60 * 1000
  const full: InviteTokenPayload = {
    ...payload,
    exp: expMs,
    jti: randomUUID(),
  }
  const json = JSON.stringify(full)
  const body = base64UrlEncode(Buffer.from(json, "utf8"))
  const sig = signPayloadJson(json)
  return `${body}.${sig}`
}

function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value)
}

export type VerifyInviteTokenResult =
  | { ok: true; payload: InviteTokenPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "invalid_payload" }

export function verifyInviteToken(token: string): VerifyInviteTokenResult {
  const parts = token.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" }
  }
  const [bodyB64, sigB64] = parts
  let json: string
  try {
    json = base64UrlDecode(bodyB64).toString("utf8")
  } catch {
    return { ok: false, reason: "malformed" }
  }
  let expectedSig: string
  try {
    expectedSig = signPayloadJson(json)
  } catch {
    return { ok: false, reason: "invalid_payload" }
  }
  try {
    const a = Buffer.from(sigB64)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" }
    }
  } catch {
    return { ok: false, reason: "bad_signature" }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: "invalid_payload" }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "invalid_payload" }
  }
  const o = parsed as Record<string, unknown>
  if (typeof o.email !== "string" || !o.email.trim()) {
    return { ok: false, reason: "invalid_payload" }
  }
  if (!isTeamRole(o.role)) {
    return { ok: false, reason: "invalid_payload" }
  }
  if (typeof o.exp !== "number" || !Number.isFinite(o.exp)) {
    return { ok: false, reason: "invalid_payload" }
  }
  if (typeof o.jti !== "string" || !o.jti) {
    return { ok: false, reason: "invalid_payload" }
  }
  const note = typeof o.note === "string" ? o.note : ""
  const orgDisplayName =
    typeof o.orgDisplayName === "string" && o.orgDisplayName.trim()
      ? o.orgDisplayName.trim()
      : undefined

  if (Date.now() > o.exp) {
    return { ok: false, reason: "expired" }
  }

  return {
    ok: true,
    payload: {
      email: o.email.trim().toLowerCase(),
      role: o.role,
      note,
      orgDisplayName,
      exp: o.exp,
      jti: o.jti,
    },
  }
}
