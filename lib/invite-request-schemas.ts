import { z } from "zod"

import { TEAM_ROLES } from "@/lib/team-roles"

const teamRoleEnum = z.enum(TEAM_ROLES)

export const postInvitesBodySchema = z.object({
  emails: z
    .array(z.string().trim().email())
    .min(1)
    .max(50)
    .transform((xs) => {
      const seen = new Set<string>()
      const out: string[] = []
      for (const e of xs) {
        const k = e.toLowerCase()
        if (!seen.has(k)) {
          seen.add(k)
          out.push(k)
        }
      }
      return out
    }),
  role: teamRoleEnum,
  note: z.string().max(500).optional().transform((s) => (s ?? "").slice(0, 500)),
  orgDisplayName: z.string().max(120).optional(),
  inviterName: z.string().trim().max(120).optional(),
  inviterEmail: z.string().trim().email().max(160).optional(),
})

export type PostInvitesBody = z.infer<typeof postInvitesBodySchema>

export const postInvitesAcceptBodySchema = z
  .object({
    token: z.string().min(1, "Missing invite token"),
    displayName: z.string().trim().min(1, "Enter your name").max(120),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
    terms: z.boolean(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })
  .refine((d) => d.terms, {
    message: "Accept the terms to continue",
    path: ["terms"],
  })

export type PostInvitesAcceptBody = z.infer<typeof postInvitesAcceptBodySchema>
