"use client"

import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TEAM_ROLES, type TeamRole, TeamRoleLabel } from "@/components/team-role"
import { inviteEmailPreviewShellStyle } from "@/lib/email/team-invite-html"
import { useOptionalWorkspaceSettings } from "@/lib/workspace-settings-context"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Delete02Icon,
  Key01Icon,
  MoreVerticalCircle01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"

type MemberStatus = "pending" | "active"

type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  status: MemberStatus
  invitedAt: string
  /** Included in the invitation email for pending invites. */
  inviteNote?: string
}

const inviteSchema = z.object({
  role: z.enum(TEAM_ROLES),
  note: z.string().max(500, "Note must be 500 characters or less"),
})

type ApiInviteResult = { email: string; ok: boolean; error?: string; jti?: string }

// TODO: Replace with the authenticated user once auth lands. Mirrors the mock
// in `components/app-sidebar.tsx` so preview and outgoing emails can show
// who sent the invitation.
const CURRENT_USER = {
  name: "Trevor Borden",
  email: "admin@scoutfuel.com",
} as const

/** Commas, semicolons, newlines, or whitespace (e.g. space) between addresses. */
const INVITE_EMAIL_SPLIT = /[,\n;\s]+/g

function parseEmailList(value: string): string[] {
  return value
    .split(INVITE_EMAIL_SPLIT)
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

/** Split on delimiters and peel complete segments into tags; remainder stays as draft. */
function peelInviteEmailInput(
  raw: string,
  existing: string[],
  options: { memberEmailsLower: Set<string> }
): { nextTags: string[]; draft: string; error?: string } {
  let rest = raw
  const lowerExisting = new Set(existing.map((e) => e.toLowerCase()))
  const nextTags = [...existing]

  while (true) {
    const idx = rest.search(/[,;\s]/)
    if (idx === -1) {
      return { nextTags, draft: rest, error: undefined }
    }
    const seg = rest.slice(0, idx).trim()
    rest = rest.slice(idx + 1)
    if (!seg) continue

    const resolved = resolveEmailSegment(seg)
    const parsed = z.string().email().safeParse(resolved)
    if (!parsed.success) {
      return { nextTags: existing, draft: raw, error: `Invalid email: ${seg}` }
    }
    const email = parsed.data.toLowerCase()
    if (lowerExisting.has(email)) {
      return { nextTags: existing, draft: raw, error: `Already added: ${email}` }
    }
    if (options.memberEmailsLower.has(email)) {
      return {
        nextTags: existing,
        draft: raw,
        error: `Already on team: ${email}`,
      }
    }
    nextTags.push(email)
    lowerExisting.add(email)
  }
}

function tryCommitInviteDraft(
  draft: string,
  existing: string[],
  options: { memberEmailsLower: Set<string> }
): { nextTags: string[]; draft: string; error?: string } {
  const seg = draft.trim()
  if (!seg) {
    return { nextTags: existing, draft: "", error: undefined }
  }
  const resolved = resolveEmailSegment(seg)
  const parsed = z.string().email().safeParse(resolved)
  if (!parsed.success) {
    return { nextTags: existing, draft, error: `Invalid email: ${seg}` }
  }
  const email = parsed.data.toLowerCase()
  if (existing.some((e) => e.toLowerCase() === email)) {
    return { nextTags: existing, draft, error: `Already added: ${email}` }
  }
  if (options.memberEmailsLower.has(email)) {
    return { nextTags: existing, draft, error: `Already on team: ${email}` }
  }
  return { nextTags: [...existing, email], draft: "", error: undefined }
}

export type TeamSettingsPanelProps = {
  className?: string
  /** When used in settings shell, reset tab when section becomes visible (e.g. dialog). */
  visible?: boolean
}

export function TeamSettingsPanel({ className, visible }: TeamSettingsPanelProps) {
  const workspace = useOptionalWorkspaceSettings()
  const [activeTab, setActiveTab] = React.useState("invite")
  const [inviteEmailTags, setInviteEmailTags] = React.useState<string[]>([])
  const [inviteEmailDraft, setInviteEmailDraft] = React.useState("")
  const inviteEmailsInputRef = React.useRef<HTMLInputElement>(null)
  const [inviteRole, setInviteRole] = React.useState<TeamRole>("Dispatcher")
  const [inviteNote, setInviteNote] = React.useState("")
  const [invitePreviewOpen, setInvitePreviewOpen] = React.useState(false)
  const [inviteSending, setInviteSending] = React.useState(false)
  const [resendLoadingId, setResendLoadingId] = React.useState<string | null>(null)
  /** Validation for the email list field only (highlights that input). */
  const [inviteError, setInviteError] = React.useState<string | undefined>(undefined)
  /** Send/API/config errors — shown in an alert, not as invalid email/message fields. */
  const [inviteApiError, setInviteApiError] = React.useState<string | undefined>(undefined)

  const invitePreviewSrc = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set("role", inviteRole)
    const note = inviteNote.trim()
    if (note) params.set("note", note.slice(0, 500))
    const org = workspace?.activeOrg?.name?.trim()
    if (org) params.set("orgDisplayName", org)
    params.set("inviterName", CURRENT_USER.name)
    params.set("inviterEmail", CURRENT_USER.email)
    return `/api/invites/preview?${params.toString()}`
  }, [inviteRole, inviteNote, workspace?.activeOrg?.name])

  const [removeCandidate, setRemoveCandidate] = React.useState<TeamMember | null>(null)

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

  const memberEmailsLower = React.useMemo(
    () => new Set(members.map((m) => m.email.toLowerCase())),
    [members]
  )

  const prevVisibleRef = React.useRef(visible)
  React.useEffect(() => {
    if (visible === undefined) return
    if (visible && !prevVisibleRef.current) {
      setActiveTab("invite")
    }
    prevVisibleRef.current = visible
  }, [visible])

  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteApiError(undefined)
    const parsed = inviteSchema.safeParse({
      role: inviteRole,
      note: inviteNote,
    })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const path0 = issue?.path[0]
      const msg = issue?.message ?? "Invalid input"
      if (path0 === "note") {
        setInviteApiError(msg)
      } else {
        setInviteError(msg)
      }
      return
    }

    const inviteBatch = [
      ...inviteEmailTags,
      ...parseEmailList(inviteEmailDraft).map(resolveEmailSegment),
    ].filter(Boolean)

    if (inviteBatch.length === 0) {
      setInviteError("Add at least one email address")
      return
    }

    for (const email of inviteBatch) {
      const result = z.string().email().safeParse(email)
      if (!result.success) {
        setInviteError(`Invalid email: ${email}`)
        toast.error("Enter a valid email for each address")
        return
      }
    }

    const normalizedBatch = inviteBatch.map((email) => email.toLowerCase())
    const duplicateInBatch = normalizedBatch.find(
      (email, index) => normalizedBatch.indexOf(email) !== index
    )
    if (duplicateInBatch) {
      setInviteError(`Duplicate email in list: ${duplicateInBatch}`)
      toast.error("Each email can only appear once")
      return
    }

    const duplicateExisting = normalizedBatch.find((email) =>
      members.some((member) => member.email.toLowerCase() === email)
    )
    if (duplicateExisting) {
      setInviteError(`Already on team: ${duplicateExisting}`)
      toast.error("One or more people are already on the team")
      return
    }

    const noteTrimmed = parsed.data.note.trim()
    setInviteSending(true)
    setInviteError(undefined)

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: normalizedBatch,
          role: parsed.data.role,
          note: noteTrimmed,
          orgDisplayName: workspace?.activeOrg?.name,
          inviterName: CURRENT_USER.name,
          inviterEmail: CURRENT_USER.email,
        }),
      })

      const data: { error?: string; results?: ApiInviteResult[] } = await res
        .json()
        .catch(() => ({}))

      if (res.status === 503 || res.status === 400) {
        const msg =
          typeof data.error === "string" ? data.error : "Could not send invites"
        setInviteApiError(msg)
        toast.error(msg)
        return
      }

      if (res.status !== 200 && res.status !== 207) {
        setInviteApiError("Couldn't send invites. Try again.")
        toast.error("Couldn't send invites. Try again.")
        return
      }

      const results = Array.isArray(data.results) ? data.results : []
      const failed = results.filter((r) => !r.ok)
      const succeeded = results.filter((r) => r.ok)

      if (succeeded.length > 0) {
        setMembers((current) => [
          ...succeeded.map((r) => ({
            id: `tm_${crypto.randomUUID()}`,
            name: "Pending user",
            email: r.email,
            role: parsed.data.role,
            status: "pending" as const,
            invitedAt: new Date().toISOString(),
            ...(noteTrimmed ? { inviteNote: noteTrimmed } : {}),
          })),
          ...current,
        ])
      }

      if (failed.length > 0) {
        setInviteEmailTags(failed.map((f) => f.email.toLowerCase()))
        setInviteEmailDraft("")
        setInviteApiError(
          failed.map((f) => `${f.email}: ${f.error ?? "Failed"}`).join(" · ")
        )
        toast.error(
          succeeded.length > 0
            ? `Some invites failed (${failed.length})`
            : "Invites could not be sent"
        )
      }

      if (failed.length === 0 && succeeded.length > 0) {
        setInviteEmailTags([])
        setInviteEmailDraft("")
        setInviteRole("Dispatcher")
        setInviteNote("")
        setInviteError(undefined)
        setInviteApiError(undefined)
        toast.success(
          succeeded.length === 1
            ? noteTrimmed
              ? "Invite sent with your note"
              : "Invite sent"
            : noteTrimmed
              ? `Invites sent (${succeeded.length}) with your note`
              : `Invites sent (${succeeded.length})`
        )
      }

      if (failed.length === 0 && succeeded.length === 0 && normalizedBatch.length > 0) {
        setInviteApiError("No response from email service")
        toast.error("No response from email service")
      }
    } catch {
      setInviteApiError("Couldn't connect. Try again.")
      toast.error("Couldn't connect. Try again.")
    } finally {
      setInviteSending(false)
    }
  }

  function handleRoleChange(memberId: string, role: TeamRole) {
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, role } : member))
    )
    toast.success("Changes saved")
  }

  async function handleResendInvite(memberId: string) {
    const member = members.find((m) => m.id === memberId)
    if (!member || member.status !== "pending") return

    setResendLoadingId(memberId)
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [member.email.toLowerCase()],
          role: member.role,
          note: member.inviteNote?.trim() ?? "",
          orgDisplayName: workspace?.activeOrg?.name,
          inviterName: CURRENT_USER.name,
          inviterEmail: CURRENT_USER.email,
        }),
      })
      const data: { error?: string; results?: ApiInviteResult[] } = await res
        .json()
        .catch(() => ({}))

      if (res.status === 503 || res.status === 400) {
        toast.error(typeof data.error === "string" ? data.error : "Couldn't resend invite. Try again.")
        return
      }

      const results = Array.isArray(data.results) ? data.results : []
      const ok = results[0]?.ok === true
      if (!ok) {
        toast.error(results[0]?.error ?? "Couldn't resend invite. Try again.")
        return
      }

      setMembers((current) =>
        current.map((m) =>
          m.id === memberId ? { ...m, invitedAt: new Date().toISOString() } : m
        )
      )
      toast.success("Invite sent")
    } catch {
      toast.error("Couldn't connect. Try again.")
    } finally {
      setResendLoadingId(null)
    }
  }

  function requestRemoveMember(member: TeamMember) {
    // Defer so the menu fully closes before the alert opens (focus management).
    window.setTimeout(() => setRemoveCandidate(member), 0)
  }

  function handleInviteEmailsChange(raw: string) {
    const { nextTags, draft, error } = peelInviteEmailInput(raw, inviteEmailTags, {
      memberEmailsLower,
    })
    setInviteEmailTags(nextTags)
    setInviteEmailDraft(draft)
    if (error) setInviteError(error)
    else if (inviteError) setInviteError(undefined)
    if (inviteApiError) setInviteApiError(undefined)
  }

  function handleInviteEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key === "Enter") {
      e.preventDefault()
      return
    }
    if (e.key === "Backspace" && inviteEmailDraft === "" && inviteEmailTags.length > 0) {
      e.preventDefault()
      setInviteEmailTags((t) => t.slice(0, -1))
      if (inviteError) setInviteError(undefined)
    }
  }

  function handleInviteEmailsBlur() {
    const d = inviteEmailDraft.trim()
    if (!d) return
    const resolved = resolveEmailSegment(d)
    if (!z.string().email().safeParse(resolved).success) return
    const { nextTags, draft, error } = tryCommitInviteDraft(
      inviteEmailDraft,
      inviteEmailTags,
      { memberEmailsLower }
    )
    if (error) {
      setInviteError(error)
      return
    }
    setInviteEmailTags(nextTags)
    setInviteEmailDraft(draft)
    if (inviteError) setInviteError(undefined)
  }

  function removeInviteEmailTag(index: number) {
    setInviteEmailTags((tags) => tags.filter((_, i) => i !== index))
    if (inviteError) setInviteError(undefined)
  }

  function confirmRemoveMember() {
    if (!removeCandidate) return
    const id = removeCandidate.id
    const wasPending = removeCandidate.status === "pending"
    setMembers((current) => current.filter((member) => member.id !== id))
    setRemoveCandidate(null)
    toast.success(wasPending ? "Invite cancelled" : "Team member removed")
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3 p-4", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
        <TabsList className="mb-3 grid h-auto w-full grid-cols-2">
          <TabsTrigger value="invite">Invite Team Members</TabsTrigger>
          <TabsTrigger value="manage">Manage Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="flex flex-col gap-3">
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={UserAdd01Icon}
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <h3 className="text-sm font-medium text-foreground">Invite Team Members</h3>
            </div>
            <p className="text-muted-foreground text-xs">
              Invite people and choose a permission role.
            </p>
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => void handleInviteSubmit(e)}
          >
                <FieldGroup>
                  <Field data-invalid={!!inviteError}>
                    <FieldLabel htmlFor="invite-emails">Email addresses</FieldLabel>
                    <div
                      className={cn(
                        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-input/20 px-2 py-1.5 transition-colors",
                        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
                        inviteError &&
                          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                      )}
                      onPointerDown={(e) => {
                        const el = e.target as HTMLElement
                        if (el.closest("button")) return
                        if (el === inviteEmailsInputRef.current) return
                        inviteEmailsInputRef.current?.focus()
                      }}
                    >
                      {inviteEmailTags.map((email, index) => (
                        <span
                          key={`${email}-${index}`}
                          className="inline-flex h-8 max-w-full shrink-0 items-center gap-0.5 rounded-full border border-border bg-muted/50 pl-2.5 text-xs text-foreground"
                        >
                          <span className="min-w-0 truncate leading-none">{email}</span>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                                  aria-label={`Remove ${email}`}
                                  onClick={() => removeInviteEmailTag(index)}
                                >
                                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
                                </Button>
                              }
                            />
                            <TooltipContent side="top">Remove email</TooltipContent>
                          </Tooltip>
                        </span>
                      ))}
                      <Input
                        ref={inviteEmailsInputRef}
                        id="invite-emails"
                        autoComplete="off"
                        placeholder={
                          inviteEmailTags.length > 0
                            ? "Add another…"
                            : "e.g. alex@gmail.com sam@gmail.com"
                        }
                        value={inviteEmailDraft}
                        onChange={(e) => handleInviteEmailsChange(e.target.value)}
                        onKeyDown={handleInviteEmailKeyDown}
                        onBlur={handleInviteEmailsBlur}
                        aria-invalid={!!inviteError}
                        className="h-7 min-h-7 min-w-[10rem] flex-1 border-0 bg-transparent px-0 py-1 text-sm shadow-none outline-none focus-visible:ring-0"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="invite-role">
                      <HugeiconsIcon
                        icon={Key01Icon}
                        className="size-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                        aria-hidden
                      />
                      Permission role
                    </FieldLabel>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole((v ?? "Dispatcher") as TeamRole)}
                    >
                      <SelectTrigger id="invite-role" className="min-h-11 w-full">
                        <SelectValue placeholder="Permission role">
                          <TeamRoleLabel role={inviteRole} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {TEAM_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              <TeamRoleLabel role={role} />
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="invite-message">Message</FieldLabel>
                    <Textarea
                      id="invite-message"
                      value={inviteNote}
                      onChange={(e) => {
                        setInviteNote(e.target.value)
                        if (inviteError) setInviteError(undefined)
                        if (inviteApiError) setInviteApiError(undefined)
                      }}
                      placeholder="Add a note to your invite..."
                      rows={3}
                      maxLength={500}
                      className="min-h-[4.5rem] resize-y text-xs/relaxed"
                    />
                  </Field>
                </FieldGroup>

                {inviteApiError ? (
                  <Alert>
                    <AlertTitle>Could not send email</AlertTitle>
                    <AlertDescription className="text-pretty text-muted-foreground">
                      {inviteApiError}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {inviteError ? <FieldError>{inviteError}</FieldError> : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    type="submit"
                    className="min-h-11 w-full sm:w-fit"
                    disabled={
                      (inviteEmailTags.length === 0 && !inviteEmailDraft.trim()) ||
                      inviteSending
                    }
                  >
                    {inviteSending ? "Sending…" : "Send Invite"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full sm:w-fit"
                    onClick={() => setInvitePreviewOpen(true)}
                  >
                    Preview Email
                  </Button>
                </div>
          </form>
        </TabsContent>

        <TabsContent value="manage" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Manage Team Members</h3>
              <p className="text-muted-foreground text-xs">
                Review invites and update permissions.
              </p>
            </div>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-0 min-w-11 p-2 text-right">
                  <span className="sr-only">Row actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className="group">
                  <TableCell>
                    <div className="flex min-w-[220px] flex-col gap-1">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground">{member.email}</span>
                      {member.status === "pending" && member.inviteNote ? (
                        <p
                          className="text-muted-foreground line-clamp-2 max-w-[min(100%,20rem)] text-[length:var(--text-2xs)]"
                          title={member.inviteNote}
                        >
                          {member.inviteNote}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.status === "pending" ? (
                      <div className="relative inline-flex w-fit items-center has-[button:focus-visible]:[&_.pending-invite-badge]:opacity-0">
                        <Badge
                          variant="outline"
                          className="pending-invite-badge text-muted-foreground border-dashed transition-opacity [@media(hover:hover)]:group-hover:pointer-events-none [@media(hover:hover)]:group-hover:opacity-0 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0"
                        >
                          Pending Invite
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={resendLoadingId === member.id}
                          className="absolute top-1/2 left-0 z-10 min-h-11 w-max max-w-[min(16rem,calc(100vw-3rem))] -translate-y-1/2 bg-background px-2 text-center text-xs whitespace-normal opacity-0 shadow-sm transition-opacity pointer-events-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                          onClick={() => void handleResendInvite(member.id)}
                        >
                          {resendLoadingId === member.id ? "Sending…" : "Send Invite Again"}
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) => {
                        if (!v) return
                        handleRoleChange(member.id, v as TeamRole)
                      }}
                    >
                      <SelectTrigger className="min-h-11 min-w-[13rem] max-w-full">
                        <SelectValue>
                          <TeamRoleLabel role={member.role} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {TEAM_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              <TeamRoleLabel role={role} />
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2 text-right align-middle">
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="min-h-11 min-w-11 text-muted-foreground shrink-0"
                                  aria-label={`More actions for ${member.name}`}
                                />
                              }
                            >
                              <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
                            </DropdownMenuTrigger>
                          }
                        />
                        <TooltipContent side="left">More actions</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" side="bottom" className="w-44">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => requestRemoveMember(member)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                          <span>
                            {member.status === "pending"
                              ? "Cancel Invite"
                              : "Remove From Team"}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={invitePreviewOpen} onOpenChange={setInvitePreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(100vw-1rem,48rem)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-border border-b px-4 py-3">
            <DialogTitle>Invite Email Preview</DialogTitle>
            <DialogDescription>
              Preview only. The email people receive includes a working join link.
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Invite Email Preview"
            className="min-h-[min(78vh,560px)] w-full border-0"
            style={inviteEmailPreviewShellStyle}
            src={invitePreviewOpen ? invitePreviewSrc : "about:blank"}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveCandidate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeCandidate?.status === "pending"
                ? "Cancel Invite?"
                : removeCandidate
                  ? `Remove "${removeCandidate.name}"?`
                  : "Remove Member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeCandidate?.status === "pending" ? (
                <>
                  This cancels the pending invite for{" "}
                  <span className="text-foreground font-medium">{removeCandidate.email}</span>. They
                  cannot join using the current link.
                </>
              ) : removeCandidate ? (
                <>
                  <span className="text-foreground font-medium">{removeCandidate.name}</span> (
                  {removeCandidate.email}) will lose access to this workspace. You can invite them
                  again later if needed.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={confirmRemoveMember}
            >
              {removeCandidate?.status === "pending" ? "Cancel Invite" : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
