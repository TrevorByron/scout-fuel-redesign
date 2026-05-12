"use client"

import * as React from "react"

import { useAppSettings } from "@/components/app-settings-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { driverDisplayName, loadDriverContacts } from "@/lib/driver-contact-store"
import { drivers } from "@/lib/mock-data"
import {
  buildDefaultDriverTripMessage,
  buildDefaultEmailSubject,
} from "@/lib/trip-driver-message"
import { sendTripToDriver, type UpdateTripPlanFn } from "@/lib/trip-send-to-driver"
import type { TripPlan } from "@/lib/trips"
import { cn } from "@/lib/utils"
import { Mail, MessageSquare, PencilLine } from "lucide-react"

export type SendToDriverChannel = "sms" | "email"

export type SendToDriverDialogProps = {
  trip: TripPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  updateTripPlan: UpdateTripPlanFn
}

export function SendToDriverDialog({
  trip,
  open,
  onOpenChange,
  updateTripPlan,
}: SendToDriverDialogProps) {
  const { openWorkspaceSettings } = useAppSettings()
  const [channel, setChannel] = React.useState<SendToDriverChannel>("sms")
  const [messageBody, setMessageBody] = React.useState("")
  const [emailSubject, setEmailSubject] = React.useState("")
  const [contacts, setContacts] = React.useState(() => loadDriverContacts(drivers))

  const driverId = trip?.driverId?.trim() ?? ""
  const row = driverId ? contacts[driverId] : undefined
  const phone = row?.phone?.trim() ?? ""
  const email = row?.email?.trim() ?? ""

  React.useEffect(() => {
    if (!open) return
    setContacts(loadDriverContacts(drivers))
  }, [open])

  React.useEffect(() => {
    if (!open || !trip) return
    setChannel("sms")
    const assignId = trip.driverId?.trim() ?? ""
    const fleetDriver = assignId ? drivers.find((d) => d.driverId === assignId) : undefined
    const salutation =
      fleetDriver && assignId
        ? driverDisplayName(fleetDriver.driverName, contacts[assignId]).trim()
        : undefined
    setMessageBody(buildDefaultDriverTripMessage(trip, salutation))
    setEmailSubject(buildDefaultEmailSubject(trip))
  }, [open, trip?.id, trip, contacts])

  const destination = channel === "sms" ? phone : email
  const hasDestination = Boolean(destination)
  const subjectOk = channel === "sms" || emailSubject.trim().length > 0
  const canSend =
    Boolean(trip?.driverId?.trim()) && hasDestination && messageBody.trim().length > 0 && subjectOk

  const handleSend = () => {
    if (!trip || !canSend) return
    const assignId = trip.driverId?.trim() ?? ""
    const fleetDriver = assignId ? drivers.find((d) => d.driverId === assignId) : undefined
    const who = fleetDriver
      ? driverDisplayName(fleetDriver.driverName, contacts[assignId]).trim()
      : trip.driverName?.trim()
    const successMessage =
      channel === "sms"
        ? who
          ? `Text sent to ${who}.`
          : "Text sent to driver."
        : who
          ? `Email sent to ${who}.`
          : "Email sent to driver."
    sendTripToDriver(trip, updateTripPlan, { successMessage })
    onOpenChange(false)
  }

  function navigateToDriversContactEditor(field: "phone" | "email") {
    const id = driverId.trim()
    onOpenChange(false)
    // Defer until after the send dialog closes so its focus trap releases; then the driver input can take focus.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (id) {
          openWorkspaceSettings("drivers", { driverContact: { driverId: id, field } })
        } else {
          openWorkspaceSettings("drivers")
        }
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94vh,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4">
          <DialogTitle>Send to driver</DialogTitle>
          <DialogDescription>Preview, edit and send the message.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-4 py-3">
          <Tabs
            value={channel}
            onValueChange={(v) => setChannel(v as SendToDriverChannel)}
            className="gap-3"
          >
            <TabsList className="flex h-auto min-h-11 w-full gap-1 p-1 sm:min-h-9">
              <TabsTrigger value="sms" className="min-h-10 flex-1 sm:min-h-8">
                Text message
              </TabsTrigger>
              <TabsTrigger value="email" className="min-h-10 flex-1 sm:min-h-8">
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="mt-0 flex flex-col gap-3">
              <Field>
                <FieldLabel>Phone number</FieldLabel>
                <button
                  type="button"
                  onClick={() => navigateToDriversContactEditor("phone")}
                  title={
                    phone.trim()
                      ? "Edit phone in Workspace settings"
                      : "Add phone in Workspace settings"
                  }
                  className={cn(
                    "group flex w-full min-h-11 items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-2 text-left transition-colors",
                    "hover:border-ring/50 hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:min-h-9"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-all text-sm text-foreground md:text-xs/relaxed",
                      !phone.trim() && "text-muted-foreground"
                    )}
                  >
                    {phone.trim() ? phone : "Not set"}
                  </span>
                  <PencilLine
                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                  <span className="sr-only">
                    Opens Workspace settings to edit the phone number for this driver.
                  </span>
                </button>
              </Field>
            </TabsContent>

            <TabsContent value="email" className="mt-0 flex flex-col gap-3">
              <Field>
                <FieldLabel>Email address</FieldLabel>
                <button
                  type="button"
                  onClick={() => navigateToDriversContactEditor("email")}
                  title={
                    email.trim()
                      ? "Edit email in Workspace settings"
                      : "Add email in Workspace settings"
                  }
                  className={cn(
                    "group flex w-full min-h-11 items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-2 text-left transition-colors",
                    "hover:border-ring/50 hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:min-h-9"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-all text-sm text-foreground md:text-xs/relaxed",
                      !email.trim() && "text-muted-foreground"
                    )}
                  >
                    {email.trim() ? email : "Not set"}
                  </span>
                  <PencilLine
                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                  <span className="sr-only">
                    Opens Workspace settings to edit the email address for this driver.
                  </span>
                </button>
              </Field>
              <Field>
                <FieldLabel>Subject</FieldLabel>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="min-h-11 sm:min-h-9"
                  autoComplete="off"
                />
              </Field>
            </TabsContent>
          </Tabs>

          <Field>
            <FieldLabel>Message</FieldLabel>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="min-h-[11rem] sm:min-h-40"
              aria-label="Message to send to the driver"
            />
          </Field>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              disabled={!canSend}
              onClick={handleSend}
            >
              {channel === "sms" ? (
                <>
                  <MessageSquare data-icon="inline-start" className="size-3.5" aria-hidden />
                  Send text
                </>
              ) : (
                <>
                  <Mail data-icon="inline-start" className="size-3.5" aria-hidden />
                  Send email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
