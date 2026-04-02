"use client"

import * as React from "react"
import Link from "next/link"
import { Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useStyle } from "@/components/style-provider"
import { isUberStyle } from "@/lib/ui-styles"

export function ForgotPasswordForm({ className }: { className?: string }) {
  const { style } = useStyle()
  const isUber = isUberStyle(style)
  const [email, setEmail] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  if (submitted) {
    return (
      <div className={cn("flex flex-col gap-5", className)}>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1
            className={cn(
              "tracking-tight",
              isUber ? "text-xl font-medium sm:text-2xl" : "text-2xl font-bold"
            )}
          >
            Check your email
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            If an account exists for that address, we sent reset instructions.
          </p>
        </div>
        <Alert>
          <Mail className="size-4" aria-hidden />
          <AlertTitle>Next steps</AlertTitle>
          <AlertDescription>
            Open the message and follow the link to choose a new password. The
            link expires after a short time.
          </AlertDescription>
        </Alert>
        <Button render={<Link href="/login" />} size="lg" className="w-full">
          Back to log in
        </Button>
      </div>
    )
  }

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (!email.trim()) return
        setSubmitted(true)
      }}
    >
      <FieldGroup className="gap-5">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1
            className={cn(
              "tracking-tight",
              isUber ? "text-xl font-medium sm:text-2xl" : "text-2xl font-bold"
            )}
          >
            Forgot password
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email and we&apos;ll send reset instructions
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </Field>
        <FieldDescription className="text-center">
          <Link
            href="/login"
            className={cn(
              "underline underline-offset-4 hover:underline",
              isUber && "text-primary"
            )}
          >
            Back to log in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
