"use client"

import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TeamRole = "Admin" | "Dispatcher" | "Driver"
type MemberStatus = "pending" | "active"

type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  status: MemberStatus
  invitedAt: string
}

const roleOptions: TeamRole[] = ["Admin", "Dispatcher", "Driver"]

const inviteSchema = z.object({
  role: z.enum(["Admin", "Dispatcher", "Driver"]),
})

function parseEmailList(value: string): string[] {
  return value
    .split(/[,\n;]/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Mock completion (Asana-style): local-only or trailing `@` → `@gmail.com`. */
function suggestGmailCompletion(segment: string): string | null {
  const s = segment.trim()
  if (!s) return null
  if (z.string().email().safeParse(s).success) return null
  if (!s.includes("@")) {
    if (!/^[a-zA-Z0-9._+-]+$/.test(s)) return null
    return `${s}@gmail.com`
  }
  const at = s.indexOf("@")
  const local = s.slice(0, at)
  const afterAt = s.slice(at + 1)
  if (!afterAt && /^[a-zA-Z0-9._+-]+$/.test(local)) {
    return `${local}@gmail.com`
  }
  return null
}

function resolveEmailSegment(segment: string): string {
  const s = segment.trim()
  if (!s) return s
  if (z.string().email().safeParse(s).success) return s
  const suggested = suggestGmailCompletion(s)
  return suggested ?? s
}

export function TeamSettingsPanel({ className }: { className?: string }) {
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([])
  const [inviteInput, setInviteInput] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<TeamRole>("Dispatcher")
  const [inviteError, setInviteError] = React.useState<string | undefined>(undefined)

  const [members, setMembers] = React.useState<TeamMember[]>([
    {
      id: "tm_1",
      name: "Fleet Admin",
      email: "admin@scoutfuel.com",
      role: "Admin",
      status: "active",
      invitedAt: "2026-04-22T10:00:00.000Z",
    },
    {
      id: "tm_2",
      name: "Dispatch Lead",
      email: "dispatch@scoutfuel.com",
      role: "Dispatcher",
      status: "active",
      invitedAt: "2026-04-23T10:00:00.000Z",
    },
    {
      id: "tm_3",
      name: "Pending User",
      email: "newdriver@scoutfuel.com",
      role: "Driver",
      status: "pending",
      invitedAt: "2026-04-28T10:00:00.000Z",
    },
  ])

  function addInviteEmails(rawValue: string) {
    const parsed = parseEmailList(rawValue).map(resolveEmailSegment)
    if (parsed.length === 0) return
    setInviteEmails((current) => {
      const existing = new Set(current.map((email) => email.toLowerCase()))
      const next = [...current]
      for (const email of parsed) {
        if (existing.has(email.toLowerCase())) continue
        next.push(email)
        existing.add(email.toLowerCase())
      }
      return next
    })
  }

  function removeInviteEmail(emailToRemove: string) {
    setInviteEmails((current) =>
      current.filter((email) => email.toLowerCase() !== emailToRemove.toLowerCase())
    )
  }

  const inviteSuggestion = React.useMemo(() => {
    const first = inviteInput.split(/[,\n;]/)[0]?.trim() ?? ""
    if (!first) return null
    const completed = suggestGmailCompletion(first)
    if (!completed) return null
    const lower = completed.toLowerCase()
    const existing = new Set([
      ...inviteEmails.map((e) => e.toLowerCase()),
      ...members.map((m) => m.email.toLowerCase()),
    ])
    if (existing.has(lower)) return null
    return { completed }
  }, [inviteInput, inviteEmails, members])

  function acceptInviteSuggestion() {
    if (!inviteSuggestion) return
    addInviteEmails(inviteSuggestion.completed)
    setInviteInput("")
    setInviteError(undefined)
  }

  function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = inviteSchema.safeParse({
      role: inviteRole,
    })
    if (!parsed.success) {
      setInviteError(parsed.error.issues[0]?.message)
      return
    }

    const inviteBatch = [...inviteEmails]
    if (inviteInput.trim().length > 0) {
      inviteBatch.push(...parseEmailList(inviteInput).map(resolveEmailSegment))
    }

    if (inviteBatch.length === 0) {
      setInviteError("Add at least one email address")
      return
    }

    for (const email of inviteBatch) {
      const result = z.string().email().safeParse(email)
      if (!result.success) {
        setInviteError(`Invalid email: ${email}`)
        toast.error("Fix invalid email addresses")
        return
      }
    }

    const normalizedBatch = inviteBatch.map((email) => email.toLowerCase())
    const duplicateInBatch = normalizedBatch.find(
      (email, index) => normalizedBatch.indexOf(email) !== index
    )
    if (duplicateInBatch) {
      setInviteError(`Duplicate email in list: ${duplicateInBatch}`)
      toast.error("Remove duplicate email addresses")
      return
    }

    const duplicateExisting = normalizedBatch.find((email) =>
      members.some((member) => member.email.toLowerCase() === email)
    )
    if (duplicateExisting) {
      setInviteError(`Already on team: ${duplicateExisting}`)
      toast.error("One or more users already exist")
      return
    }

    setMembers((current) => [
      ...inviteBatch.map((email) => ({
        id: `tm_${crypto.randomUUID()}`,
        name: "Pending user",
        email,
        role: parsed.data.role,
        status: "pending" as const,
        invitedAt: new Date().toISOString(),
      })),
      ...current,
    ])

    setInviteEmails([])
    setInviteInput("")
    setInviteRole("Dispatcher")
    setInviteError(undefined)
    toast.success(
      inviteBatch.length === 1
        ? "Invite sent"
        : `Invites sent (${inviteBatch.length})`
    )
  }

  function handleRoleChange(memberId: string, role: TeamRole) {
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, role } : member))
    )
    toast.success("Permissions updated")
  }

  function handleResendInvite(memberId: string) {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, invitedAt: new Date().toISOString() } : member
      )
    )
    toast.success("Invite sent")
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 md:gap-6 md:p-6", className)}>
      <Card variant="flat">
        <CardHeader>
          <CardTitle>Invite users</CardTitle>
          <CardDescription>
            Invite teammates and assign an initial permission role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleInviteSubmit}>
            <FieldGroup>
              <Field data-invalid={!!inviteError}>
                <FieldLabel htmlFor="invite-emails">Email addresses</FieldLabel>
                <div className="border-input bg-input/20 dark:bg-input/30 flex flex-col overflow-hidden rounded-md border">
                  <div className="flex min-h-28 flex-wrap content-start gap-2 p-2">
                    {inviteEmails.map((email) => (
                      <Badge key={email} variant="outline" className="h-auto gap-1 px-2 py-1 text-xs">
                        <span>{email}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeInviteEmail(email)}
                          aria-label={`Remove ${email}`}
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                    <Input
                      id="invite-emails"
                      autoComplete="off"
                      placeholder={
                        inviteEmails.length === 0 ? "name@gmail.com, name@gmail.com, ..." : "Add more emails"
                      }
                      value={inviteInput}
                      onChange={(e) => {
                        setInviteInput(e.target.value)
                        if (inviteError) setInviteError(undefined)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" && inviteSuggestion) {
                          e.preventDefault()
                          document.getElementById("invite-email-suggestion")?.focus()
                          return
                        }
                        if (
                          e.key === "Enter" ||
                          e.key === "," ||
                          e.key === "Tab" ||
                          e.key === " "
                        ) {
                          if (inviteInput.trim().length > 0) {
                            e.preventDefault()
                            if (inviteSuggestion && e.key === "Enter") {
                              acceptInviteSuggestion()
                            } else {
                              addInviteEmails(inviteInput)
                              setInviteInput("")
                            }
                          }
                        } else if (
                          e.key === "Backspace" &&
                          inviteInput.length === 0 &&
                          inviteEmails.length > 0
                        ) {
                          const last = inviteEmails[inviteEmails.length - 1]
                          if (last) removeInviteEmail(last)
                        }
                      }}
                      onBlur={(e) => {
                        const next = e.relatedTarget as HTMLElement | null
                        if (next?.id === "invite-email-suggestion") return
                        if (inviteInput.trim().length > 0) {
                          addInviteEmails(inviteInput)
                          setInviteInput("")
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text")
                        if (/[,\n;]/.test(pasted)) {
                          e.preventDefault()
                          addInviteEmails(pasted)
                        }
                      }}
                      aria-invalid={!!inviteError}
                      aria-autocomplete="list"
                      aria-expanded={!!inviteSuggestion}
                      aria-controls={inviteSuggestion ? "invite-email-suggestion-list" : undefined}
                      className="h-10 min-w-[220px] flex-1 border-0 bg-transparent p-0 shadow-none ring-0 focus-visible:ring-0"
                    />
                  </div>
                  {inviteSuggestion ? (
                    <div
                      id="invite-email-suggestion-list"
                      role="listbox"
                      className="border-input border-t"
                    >
                      <button
                        id="invite-email-suggestion"
                        type="button"
                        role="option"
                        aria-selected
                        aria-label={`Add ${inviteSuggestion.completed}`}
                        className={cn(
                          "flex min-h-11 w-full items-center px-3 py-2 text-left text-sm font-medium",
                          "text-primary bg-muted/50 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => acceptInviteSuggestion()}
                      >
                        {inviteSuggestion.completed}
                      </button>
                    </div>
                  ) : null}
                </div>
                {inviteError ? <FieldError>{inviteError}</FieldError> : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="invite-role">Permission role</FieldLabel>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole((v ?? "Dispatcher") as TeamRole)}
                >
                  <SelectTrigger id="invite-role" className="min-h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="min-h-11 w-full sm:w-fit"
              disabled={inviteEmails.length === 0}
            >
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card variant="flat">
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Manage invites and update permissions for existing users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex min-w-[220px] flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "pending" ? "outline" : "default"}
                      className={
                        member.status === "pending" ? "text-muted-foreground" : undefined
                      }
                    >
                      {member.status === "pending" ? "Pending invite" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) => {
                        if (!v) return
                        handleRoleChange(member.id, v as TeamRole)
                      }}
                    >
                      <SelectTrigger className="min-h-11 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {member.status === "pending" ? (
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => handleResendInvite(member.id)}
                      >
                        Send invite again
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
