"use client"

import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type UserProfile } from "@/lib/profile-store"
import { cn } from "@/lib/utils"

const emailSchema = z.object({
  email: z.string().min(1, "Enter a new email").email("Enter a valid email"),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

const contactSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  phone: z
    .string()
    .refine(
      (value) => value.trim().length === 0 || /^[+\d()\s.-]{7,20}$/.test(value),
      "Enter a valid phone number"
    ),
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile
  onProfileSave: (profile: UserProfile) => void
}

type EmailErrors = {
  email?: string
}

type PasswordErrors = {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

type ContactErrors = {
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
}

export function ProfileSettingsSheet({
  open,
  onOpenChange,
  profile,
  onProfileSave,
}: Props) {
  const initialNameParts = React.useMemo(() => {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean)
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    }
  }, [profile.name])

  const [newEmail, setNewEmail] = React.useState(profile.email)
  const [emailErrors, setEmailErrors] = React.useState<EmailErrors>({})

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordErrors, setPasswordErrors] = React.useState<PasswordErrors>({})

  const [firstName, setFirstName] = React.useState(initialNameParts.firstName)
  const [lastName, setLastName] = React.useState(initialNameParts.lastName)
  const [phone, setPhone] = React.useState(profile.phone)
  const [avatar, setAvatar] = React.useState(profile.avatar)
  const [contactErrors, setContactErrors] = React.useState<ContactErrors>({})
  const [activeTab, setActiveTab] = React.useState("profile")
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const avatarInitials = React.useMemo(() => {
    const fi = firstName.trim()[0]
    const li = lastName.trim()[0]
    if (fi || li) return `${fi ?? ""}${li ?? ""}`
    const local = profile.email.split("@")[0] ?? ""
    if (local.length >= 2) return (local[0] + local[1]).toUpperCase()
    return (local[0] ?? "?").toUpperCase()
  }, [firstName, lastName, profile.email])

  const isEmailDirty =
    newEmail.trim().length > 0 &&
    newEmail.trim().toLowerCase() !== profile.email.trim().toLowerCase()
  const isContactDirty =
    `${firstName.trim()} ${lastName.trim()}`.trim() !== profile.name.trim() ||
    phone.trim() !== profile.phone.trim() ||
    avatar.trim() !== profile.avatar.trim()
  const isPasswordEntered =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0

  React.useEffect(() => {
    if (!open) return
    const parts = profile.name.trim().split(/\s+/).filter(Boolean)
    setNewEmail(profile.email)
    setFirstName(parts[0] ?? "")
    setLastName(parts.slice(1).join(" "))
    setPhone(profile.phone)
    setAvatar(profile.avatar)
    setEmailErrors({})
    setPasswordErrors({})
    setContactErrors({})
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setActiveTab("profile")
  }, [open, profile])

  function handlePasswordSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!parsed.success) {
      const next: PasswordErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (
          key === "currentPassword" ||
          key === "newPassword" ||
          key === "confirmPassword"
        ) {
          next[key] = issue.message
        }
      }
      setPasswordErrors(next)
      return
    }
    setPasswordErrors({})
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    toast.success("Password updated")
  }

  function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const contactParsed = contactSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    })
    if (!contactParsed.success) {
      const next: ContactErrors = {}
      for (const issue of contactParsed.error.issues) {
        const key = issue.path[0]
        if (
          key === "firstName" ||
          key === "lastName" ||
          key === "phone" ||
          key === "avatar"
        ) {
          next[key as keyof ContactErrors] = issue.message
        }
      }
      setContactErrors(next)
      return
    }

    const trimmedEmail = newEmail.trim()
    const emailChanged =
      trimmedEmail.toLowerCase() !== profile.email.trim().toLowerCase()

    if (emailChanged) {
      const emailParsed = emailSchema.safeParse({ email: trimmedEmail })
      if (!emailParsed.success) {
        setEmailErrors({ email: emailParsed.error.issues[0]?.message })
        return
      }
    }

    setContactErrors({})
    setEmailErrors({})
    onProfileSave({
      ...profile,
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone: phone.trim(),
      avatar: avatar.trim(),
      email: trimmedEmail,
    })
    toast.success("Profile updated")
  }

  const isProfileDirty = isContactDirty || isEmailDirty

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setContactErrors((prev) => ({ ...prev, avatar: "Choose an image file" }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      setAvatar(result)
      setContactErrors((prev) => ({ ...prev, avatar: undefined }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 sm:max-w-xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle>Manage profile</DialogTitle>
          <DialogDescription>
            Update your email, password, and contact information.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 overflow-y-auto px-3 pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex flex-col gap-3">
              <Card variant="flat">
                <CardHeader>
                  <CardTitle>Contact information</CardTitle>
                  <CardDescription>
                    Keep your contact details and email up to date.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-3" onSubmit={handleProfileSave}>
                    <FieldGroup>
                      <Field data-invalid={!!contactErrors.avatar}>
                        <FieldLabel htmlFor="profile-avatar-upload">Avatar image</FieldLabel>
                        <div className="flex flex-col gap-2">
                          <div className="group relative inline-flex self-center pb-9">
                            <div className="relative size-24 shrink-0">
                              {avatar ? (
                                <Avatar className="size-24">
                                  <AvatarImage
                                    src={avatar}
                                    alt={`${firstName} ${lastName}`.trim() || "Profile photo"}
                                  />
                                  <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
                                    {avatarInitials}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div
                                  className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium text-muted-foreground select-none"
                                  aria-label={`Avatar initials ${avatarInitials}`}
                                >
                                  {avatarInitials}
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "absolute left-1/2 top-full z-10 min-h-11 -translate-x-1/2 -translate-y-1 bg-white transition-opacity duration-150 hover:bg-neutral-100 dark:bg-background dark:hover:bg-muted/80",
                                  "opacity-100 pointer-events-auto",
                                  "sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto"
                                )}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                {avatar ? "Replace photo" : "Upload image"}
                              </Button>
                            </div>
                            {avatar ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      aria-label="Remove avatar"
                                      className={cn(
                                        "absolute right-0 top-0 z-10 size-10 min-h-10 min-w-10 -translate-y-1/3 translate-x-1/4 rounded-full bg-white p-0 transition-opacity duration-150 hover:bg-neutral-100 dark:bg-background dark:hover:bg-muted/80",
                                        "opacity-100 pointer-events-auto",
                                        "sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto"
                                      )}
                                      onClick={() => {
                                        setAvatar("")
                                        if (contactErrors.avatar) {
                                          setContactErrors((prev) => ({ ...prev, avatar: undefined }))
                                        }
                                      }}
                                    >
                                      <X className="size-4 shrink-0" aria-hidden />
                                    </Button>
                                  }
                                />
                                <TooltipContent side="bottom">Remove avatar</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                          <input
                            ref={fileInputRef}
                            id="profile-avatar-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleAvatarUpload}
                          />
                        </div>
                        {contactErrors.avatar ? <FieldError>{contactErrors.avatar}</FieldError> : null}
                      </Field>
                      <FieldGroup className="grid grid-cols-2 gap-3">
                        <Field data-invalid={!!contactErrors.firstName}>
                          <FieldLabel htmlFor="profile-first-name">First name</FieldLabel>
                          <Input
                            id="profile-first-name"
                            placeholder="Jordan"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value)
                              if (contactErrors.firstName) {
                                setContactErrors((prev) => ({ ...prev, firstName: undefined }))
                              }
                            }}
                            aria-invalid={!!contactErrors.firstName}
                          />
                          {contactErrors.firstName ? (
                            <FieldError>{contactErrors.firstName}</FieldError>
                          ) : null}
                        </Field>
                        <Field data-invalid={!!contactErrors.lastName}>
                          <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
                          <Input
                            id="profile-last-name"
                            placeholder="Lee"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value)
                              if (contactErrors.lastName) {
                                setContactErrors((prev) => ({ ...prev, lastName: undefined }))
                              }
                            }}
                            aria-invalid={!!contactErrors.lastName}
                          />
                          {contactErrors.lastName ? (
                            <FieldError>{contactErrors.lastName}</FieldError>
                          ) : null}
                        </Field>
                      </FieldGroup>
                      <Field data-invalid={!!contactErrors.phone}>
                        <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                        <Input
                          id="profile-phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value)
                            if (contactErrors.phone) {
                              setContactErrors((prev) => ({ ...prev, phone: undefined }))
                            }
                          }}
                          aria-invalid={!!contactErrors.phone}
                        />
                        {contactErrors.phone ? <FieldError>{contactErrors.phone}</FieldError> : null}
                      </Field>
                    </FieldGroup>

                    <FieldGroup className="border-border mt-1 border-t pt-4">
                      <Field>
                        <FieldLabel htmlFor="profile-current-email">Current email</FieldLabel>
                        <Input
                          id="profile-current-email"
                          value={profile.email}
                          disabled
                          aria-disabled
                        />
                      </Field>
                      <Field data-invalid={!!emailErrors.email}>
                        <FieldLabel htmlFor="profile-new-email">New email</FieldLabel>
                        <Input
                          id="profile-new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => {
                            setNewEmail(e.target.value)
                            if (emailErrors.email) setEmailErrors({})
                          }}
                          aria-invalid={!!emailErrors.email}
                        />
                        {emailErrors.email ? <FieldError>{emailErrors.email}</FieldError> : null}
                      </Field>
                    </FieldGroup>

                    <Button type="submit" className="min-h-11 w-full" disabled={!isProfileDirty}>
                      Save profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card variant="flat">
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Set a new password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-3" onSubmit={handlePasswordSave}>
                    <FieldGroup>
                      <Field data-invalid={!!passwordErrors.currentPassword}>
                        <FieldLabel htmlFor="profile-current-password">Current password</FieldLabel>
                        <Input
                          id="profile-current-password"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value)
                            if (passwordErrors.currentPassword) {
                              setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }))
                            }
                          }}
                          aria-invalid={!!passwordErrors.currentPassword}
                        />
                        {passwordErrors.currentPassword ? (
                          <FieldError>{passwordErrors.currentPassword}</FieldError>
                        ) : null}
                      </Field>
                      <Field data-invalid={!!passwordErrors.newPassword}>
                        <FieldLabel htmlFor="profile-new-password">New password</FieldLabel>
                        <Input
                          id="profile-new-password"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value)
                            if (passwordErrors.newPassword) {
                              setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }))
                            }
                          }}
                          aria-invalid={!!passwordErrors.newPassword}
                        />
                        {passwordErrors.newPassword ? (
                          <FieldError>{passwordErrors.newPassword}</FieldError>
                        ) : null}
                      </Field>
                      <Field data-invalid={!!passwordErrors.confirmPassword}>
                        <FieldLabel htmlFor="profile-confirm-password">Confirm new password</FieldLabel>
                        <Input
                          id="profile-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            if (passwordErrors.confirmPassword) {
                              setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                            }
                          }}
                          aria-invalid={!!passwordErrors.confirmPassword}
                        />
                        {passwordErrors.confirmPassword ? (
                          <FieldError>{passwordErrors.confirmPassword}</FieldError>
                        ) : null}
                      </Field>
                    </FieldGroup>
                    <Button type="submit" className="min-h-11 w-full" disabled={!isPasswordEntered}>
                      Save password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
