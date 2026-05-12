"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  defaultDriverContacts,
  driverDisplayName,
  loadDriverContacts,
  saveDriverContacts,
  type DriverContactRow,
  type DriverContactsState,
} from "@/lib/driver-contact-store"
import { formatDriverFleetCardMasked } from "@/lib/driver-utils"
import { drivers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const MAX_DRIVER_NAME_LEN = 60

/** Deep-link target for focusing a driver phone or email field in this panel. */
export type DriverContactFocusTarget = { driverId: string; field: "phone" | "email" }

export function driverContactInputId(driverId: string, field: "phone" | "email"): string {
  return `driver-contact-${driverId}-${field}`
}

export type DriversSettingsPanelProps = {
  className?: string
  /** When used in settings shell, reload from storage when the section becomes visible. */
  visible?: boolean
  /** When set while visible, scroll to and focus the matching input, then call `onContactFocusConsumed`. */
  contactFocusTarget?: DriverContactFocusTarget | null
  onContactFocusConsumed?: () => void
}

export function DriversSettingsPanel({
  className,
  visible,
  contactFocusTarget,
  onContactFocusConsumed,
}: DriversSettingsPanelProps) {
  const [contacts, setContacts] = React.useState<DriverContactsState>(() =>
    defaultDriverContacts(drivers)
  )

  const fleetDefaults = React.useMemo(() => defaultDriverContacts(drivers), [])

  function contactRow(prev: DriverContactsState, driverId: string): DriverContactRow {
    return prev[driverId] ?? fleetDefaults[driverId]!
  }

  const rows = React.useMemo(
    () => [...drivers].sort((a, b) => a.driverName.localeCompare(b.driverName)),
    []
  )

  React.useEffect(() => {
    setContacts(loadDriverContacts(drivers))
  }, [])

  const prevVisibleRef = React.useRef(visible)
  React.useEffect(() => {
    if (visible === undefined) {
      setContacts(loadDriverContacts(drivers))
      return
    }
    if (visible && !prevVisibleRef.current) {
      setContacts(loadDriverContacts(drivers))
    }
    prevVisibleRef.current = visible
  }, [visible])

  function patchContact(driverId: string, patch: Partial<DriverContactRow>) {
    setContacts((prev) => {
      const base = contactRow(prev, driverId)
      const row: DriverContactRow = { ...base, ...patch }
      const next = { ...prev, [driverId]: row }
      saveDriverContacts(next)
      return next
    })
  }

  const focusKey = contactFocusTarget
    ? `${contactFocusTarget.driverId}-${contactFocusTarget.field}`
    : null

  React.useLayoutEffect(() => {
    if (!contactFocusTarget || !visible || !focusKey) return

    const id = driverContactInputId(contactFocusTarget.driverId, contactFocusTarget.field)
    let cancelled = false
    let attempts = 0
    const maxAttempts = 16

    function tryFocus() {
      if (cancelled) return
      attempts += 1
      const el = document.getElementById(id)
      if (!el || !(el instanceof HTMLElement)) {
        if (attempts >= maxAttempts) {
          onContactFocusConsumed?.()
          return
        }
        requestAnimationFrame(tryFocus)
        return
      }
      el.scrollIntoView({ block: "center", behavior: "auto" })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          el.focus()
          if (el instanceof HTMLInputElement) el.select()
          onContactFocusConsumed?.()
        })
      })
    }

    tryFocus()
    return () => {
      cancelled = true
    }
  }, [contactFocusTarget, visible, focusKey, onContactFocusConsumed])

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col px-3 pb-4 pt-2", className)}>
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[10rem]">Fuel card name</TableHead>
                <TableHead className="min-w-[7rem]">First name</TableHead>
                <TableHead className="min-w-[7rem]">Last name</TableHead>
                <TableHead className="min-w-[6rem] whitespace-nowrap">Fleet card</TableHead>
                <TableHead className="min-w-[10rem]">Phone</TableHead>
                <TableHead className="min-w-[12rem]">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => {
                const row = contactRow(contacts, d.driverId)
                const displayForLabels = driverDisplayName(d.driverName, row)
                return (
                  <TableRow key={d.driverId}>
                    <TableCell className="align-top">
                      <div className="flex min-h-11 flex-col justify-center gap-0.5 py-1.5">
                        <span className="font-medium leading-snug">{d.driverName}</span>
                        <span className="text-xs text-muted-foreground">From fuel card</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        aria-label={`Optional first name for ${displayForLabels}`}
                        className="min-h-11 h-auto min-w-0"
                        placeholder="Optional"
                        maxLength={MAX_DRIVER_NAME_LEN}
                        autoComplete="given-name"
                        value={row.firstName}
                        onChange={(e) =>
                          setContacts((prev) => ({
                            ...prev,
                            [d.driverId]: { ...contactRow(prev, d.driverId), firstName: e.target.value },
                          }))
                        }
                        onBlur={(e) =>
                          patchContact(d.driverId, { firstName: e.currentTarget.value.trim() })
                        }
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        aria-label={`Optional last name for ${displayForLabels}`}
                        className="min-h-11 h-auto min-w-0"
                        placeholder="Optional"
                        maxLength={MAX_DRIVER_NAME_LEN}
                        autoComplete="family-name"
                        value={row.lastName}
                        onChange={(e) =>
                          setContacts((prev) => ({
                            ...prev,
                            [d.driverId]: { ...contactRow(prev, d.driverId), lastName: e.target.value },
                          }))
                        }
                        onBlur={(e) =>
                          patchContact(d.driverId, { lastName: e.currentTarget.value.trim() })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDriverFleetCardMasked(d.driverId)}
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        id={driverContactInputId(d.driverId, "phone")}
                        aria-label={`Phone for ${displayForLabels}`}
                        type="tel"
                        autoComplete="tel"
                        className="min-h-11 h-auto min-w-0"
                        value={row.phone}
                        onChange={(e) =>
                          setContacts((prev) => ({
                            ...prev,
                            [d.driverId]: { ...contactRow(prev, d.driverId), phone: e.target.value },
                          }))
                        }
                        onBlur={(e) =>
                          patchContact(d.driverId, { phone: e.currentTarget.value.trim() })
                        }
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        id={driverContactInputId(d.driverId, "email")}
                        aria-label={`Email for ${displayForLabels}`}
                        type="email"
                        autoComplete="email"
                        className="min-h-11 h-auto min-w-0"
                        value={row.email}
                        onChange={(e) =>
                          setContacts((prev) => ({
                            ...prev,
                            [d.driverId]: { ...contactRow(prev, d.driverId), email: e.target.value },
                          }))
                        }
                        onBlur={(e) =>
                          patchContact(d.driverId, { email: e.currentTarget.value.trim() })
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
