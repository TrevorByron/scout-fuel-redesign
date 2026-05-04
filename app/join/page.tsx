"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircleIcon } from "lucide-react"

import { AuthSplitLayout } from "@/components/auth-split-layout"
import { InviteSignupForm } from "@/components/invite-signup-form"
import { LoginSplashScreen } from "@/components/login-splash-screen"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles"

function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value)
}

type InvitePayload = {
  email: string
  role: TeamRole
  orgDisplayName?: string
}

const DEMO_INVITE: InvitePayload = {
  email: "you@example.com",
  role: "Dispatcher",
}

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const demoMode = !token

  const [phase, setPhase] = React.useState<"loading" | "ready" | "invalid" | "splash">(() =>
    demoMode ? "ready" : "loading"
  )
  const [invite, setInvite] = React.useState<InvitePayload | null>(() =>
    demoMode ? DEMO_INVITE : null
  )
  const [invalidReason, setInvalidReason] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (demoMode) {
      setPhase("ready")
      setInvite(DEMO_INVITE)
      return
    }

    let cancelled = false
    setPhase("loading")
    setInvite(null)

    void (async () => {
      try {
        const res = await fetch(
          `/api/invites/verify?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        )
        const data: unknown = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setInvite(null)
          setInvalidReason(
            res.status === 410
              ? "expired"
              : typeof (data as { reason?: string })?.reason === "string"
                ? (data as { reason: string }).reason
                : "invalid"
          )
          setPhase("invalid")
          return
        }
        const body =
          data && typeof data === "object" ? (data as Record<string, unknown>) : null
        const email = body && typeof body.email === "string" ? body.email : ""
        const role = body?.role
        if (!email || !isTeamRole(role) || !body) {
          setPhase("invalid")
          setInvalidReason("invalid")
          return
        }
        setInvite({
          email,
          role: role,
          orgDisplayName:
            typeof body.orgDisplayName === "string" ? body.orgDisplayName : undefined,
        })
        setPhase("ready")
      } catch {
        if (!cancelled) {
          setPhase("invalid")
          setInvalidReason("network")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, demoMode])

  if (phase === "splash") {
    return <LoginSplashScreen onComplete={() => router.push("/")} />
  }

  return (
    <AuthSplitLayout>
      {demoMode ? (
        invite ? (
          <InviteSignupForm
            demo
            email={invite.email}
            role={invite.role}
            orgDisplayName={invite.orgDisplayName}
            onSuccess={() => setPhase("splash")}
          />
        ) : null
      ) : phase === "invalid" ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>This invite link isn&apos;t valid</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              {invalidReason === "expired"
                ? "This invitation has expired. Ask your admin to send a new one."
                : invalidReason === "missing"
                  ? "Open the link from your invitation email, or ask your admin to resend it."
                  : "The link may be incorrect, expired, or already used. You can still sign up or log in below."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "inline-flex min-h-11 w-full items-center justify-center sm:w-auto"
                )}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "inline-flex min-h-11 w-full items-center justify-center sm:w-auto"
                )}
              >
                Sign up
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ) : phase === "loading" ? (
        <p className="text-center text-sm text-muted-foreground">Checking your invitation…</p>
      ) : invite ? (
        <InviteSignupForm
          inviteToken={token}
          email={invite.email}
          role={invite.role}
          orgDisplayName={invite.orgDisplayName}
          onSuccess={() => setPhase("splash")}
        />
      ) : null}
    </AuthSplitLayout>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout>
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        </AuthSplitLayout>
      }
    >
      <JoinContent />
    </Suspense>
  )
}
