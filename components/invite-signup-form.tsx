"use client"

import * as React from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TermsOfServiceDemoDialog } from "@/components/terms-of-service-demo"
import { PROTOTYPE_PROFILE_STORAGE_KEY } from "@/lib/prototype-profile"
import type { TeamRole } from "@/lib/team-roles"
import { usernameFromDisplayName } from "@/lib/username-from-display-name"
import { cn } from "@/lib/utils"

function fullDisplayName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim()
}

const inviteSignupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name").max(60),
    lastName: z.string().trim().min(1, "Enter your last name").max(60),
    phone: z.string().trim().max(30, "Phone number is too long").optional(),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
    terms: z.boolean(),
  })
  .refine((d) => fullDisplayName(d.firstName, d.lastName).length <= 120, {
    message: "Combined name must be 120 characters or less",
    path: ["lastName"],
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })
  .refine((d) => d.terms, {
    message: "Accept the terms to continue",
    path: ["terms"],
  })

type FieldKey =
  | "firstName"
  | "lastName"
  | "phone"
  | "password"
  | "confirm"
  | "terms"
  | "root"

export type InviteSignupFormProps = {
  /** Skip token + API; save profile locally only (for `/join` without `?token=`). */
  demo?: boolean
  /** Required when `demo` is false — signed invite from email. */
  inviteToken?: string
  email: string
  role: TeamRole
  orgDisplayName?: string
  className?: string
  onSuccess: () => void
}

export function InviteSignupForm({
  demo = false,
  inviteToken,
  email: initialEmail,
  role,
  orgDisplayName,
  className,
  onSuccess,
}: InviteSignupFormProps) {
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [terms, setTerms] = React.useState(false)
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [termsDialogOpen, setTermsDialogOpen] = React.useState(false)

  const displayEmail = initialEmail.trim()

  return (
    <>
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={async (e) => {
        e.preventDefault()

        function applyZodIssues(issues: z.core.$ZodIssue[]) {
          const next: Partial<Record<FieldKey, string>> = {}
          for (const issue of issues) {
            const key = issue.path[0]
            if (
              key === "firstName" ||
              key === "lastName" ||
              key === "phone" ||
              key === "password" ||
              key === "confirm" ||
              key === "terms"
            ) {
              next[key] = issue.message
            }
          }
          setErrors(next)
        }

        const parsed = inviteSignupSchema.safeParse({
          firstName,
          lastName,
          phone: phone.trim() === "" ? undefined : phone.trim(),
          password,
          confirm,
          terms,
        })
        if (!parsed.success) {
          applyZodIssues(parsed.error.issues)
          return
        }

        const resolvedDisplayName = fullDisplayName(
          parsed.data.firstName,
          parsed.data.lastName
        )
        const derivedUsername = usernameFromDisplayName(resolvedDisplayName)

        if (demo) {
          setErrors({})
          setSubmitting(true)
          try {
            try {
              localStorage.setItem(
                PROTOTYPE_PROFILE_STORAGE_KEY,
                JSON.stringify({
                  savedAt: new Date().toISOString(),
                  email: displayEmail.toLowerCase(),
                  displayName: resolvedDisplayName,
                  username: derivedUsername,
                  role,
                  ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
                })
              )
            } catch {
              /* ignore quota / private mode */
            }
            onSuccess()
          } finally {
            setSubmitting(false)
          }
          return
        }

        if (!inviteToken) {
          setErrors({ root: "Missing invite token" })
          return
        }

        setErrors({})
        setSubmitting(true)
        try {
          const res = await fetch("/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: inviteToken,
              displayName: resolvedDisplayName,
              password: parsed.data.password,
              confirm: parsed.data.confirm,
              terms: parsed.data.terms,
              ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
            }),
          })
          const data: unknown = await res.json().catch(() => null)
          const body = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
          if (!res.ok) {
            setErrors({
              root:
                typeof body.error === "string"
                  ? body.error
                  : "Could not complete signup. Try again.",
            })
            return
          }
          if (body.ok === true && body.profile && typeof body.profile === "object") {
            const p = body.profile as Record<string, unknown>
            try {
              localStorage.setItem(
                PROTOTYPE_PROFILE_STORAGE_KEY,
                JSON.stringify({
                  savedAt: new Date().toISOString(),
                  email: p.email,
                  displayName: p.displayName,
                  username: p.username,
                  role: p.role,
                  ...(typeof p.phone === "string" && p.phone ? { phone: p.phone } : {}),
                })
              )
            } catch {
              /* ignore quota / private mode */
            }
          }
          onSuccess()
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <FieldGroup className="gap-5">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className={cn("text-2xl font-bold tracking-tight")}>Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {demo ? (
              "Trevor Borden from Frontier Trucking has invited you to collaborate in Scout Fuel. Accept the invitation below to set up your account and get started."
            ) : (
              <>
                You&apos;ve been invited to ScoutFuel
                {orgDisplayName ? (
                  <>
                    {" "}
                    for <span className="text-foreground">{orgDisplayName}</span>
                  </>
                ) : null}
                . Set your profile and password to continue.
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="invite-first-name">First name</FieldLabel>
            <Input
              id="invite-first-name"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }))
              }}
              aria-invalid={!!errors.firstName}
              className="min-h-11 min-w-0"
            />
            {errors.firstName ? <FieldError>{errors.firstName}</FieldError> : null}
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="invite-last-name">Last name</FieldLabel>
            <Input
              id="invite-last-name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }))
              }}
              aria-invalid={!!errors.lastName}
              className="min-h-11 min-w-0"
            />
            {errors.lastName ? <FieldError>{errors.lastName}</FieldError> : null}
          </Field>
        </div>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="invite-phone">Phone number</FieldLabel>
          <Input
            id="invite-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-0100"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
            }}
            aria-invalid={!!errors.phone}
            className="min-h-11"
          />
          {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
        </Field>

        {errors.root ? (
          <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root}
          </div>
        ) : null}

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="invite-password">Password</FieldLabel>
          <FieldDescription>Use at least 8 characters</FieldDescription>
          <Input
            id="invite-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
            }}
            aria-invalid={!!errors.password}
            className="min-h-11"
          />
          {errors.password ? <FieldError>{errors.password}</FieldError> : null}
        </Field>

        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="invite-confirm">Confirm password</FieldLabel>
          <Input
            id="invite-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }))
            }}
            aria-invalid={!!errors.confirm}
            className="min-h-11"
          />
          {errors.confirm ? <FieldError>{errors.confirm}</FieldError> : null}
        </Field>

        <Field
          orientation="horizontal"
          data-invalid={!!errors.terms}
          className="items-start gap-3"
        >
          <Checkbox
            id="invite-terms"
            checked={terms}
            onCheckedChange={(c) => {
              setTerms(!!c)
              if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }))
            }}
            aria-invalid={!!errors.terms}
          />
          <FieldContent className="gap-1">
            <Label htmlFor="invite-terms" className="text-sm font-normal leading-snug">
              I agree to the{" "}
              <button
                type="button"
                className="inline min-h-0 border-0 bg-transparent p-0 text-inherit underline underline-offset-4 hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setTermsDialogOpen(true)
                }}
              >
                Terms of Service
              </button>
            </Label>
            {errors.terms ? <FieldError>{errors.terms}</FieldError> : null}
          </FieldContent>
        </Field>

        <Field>
          <Button type="submit" size="lg" className="min-h-11 w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </Field>

        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-muted dark:*:data-[slot=field-separator-content]:bg-card">
          Or continue with
        </FieldSeparator>
        <Field className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" type="button" size="lg" className="min-h-11 w-full gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="size-4 shrink-0"
                aria-hidden
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </Button>
            <Button variant="outline" type="button" size="lg" className="min-h-11 w-full gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="size-4 shrink-0"
                fill="currentColor"
                aria-hidden
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Sign up with LinkedIn
            </Button>
          </div>
        </Field>
      </FieldGroup>
    </form>
    <TermsOfServiceDemoDialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen} />
    </>
  )
}
