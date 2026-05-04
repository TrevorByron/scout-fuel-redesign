"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react"

import { BillingSettingsPanel } from "@/components/billing-settings-panel"
import {
  DriversSettingsPanel,
  type DriverContactFocusTarget,
} from "@/components/drivers-settings-panel"
import { TrucksSettingsPanel } from "@/components/trucks-settings-panel"
import { orgLogoHolderClassName } from "@/components/org-switcher"
import { TeamSettingsPanel } from "@/components/team-settings-panel"
import { TermsOfServiceDemoPage } from "@/components/terms-of-service-demo"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  SETTINGS_NAV_GROUPS,
  getGroupIdForSection,
  getNavGroup,
  getNavItemForSection,
  type AppSettingsSection,
} from "@/lib/app-settings-nav"
import { cn } from "@/lib/utils"
import {
  defaultBilling,
  loadBilling,
  type BillingPayment,
} from "@/lib/billing-store"
import { analyzeDataUrlForLogoHolder } from "@/lib/analyze-logo-holder"
import { MAX_WORKSPACE_LOGO_BYTES } from "@/lib/workspace-settings-store"
import { useWorkspaceSettings } from "@/lib/workspace-settings-context"

export type { AppSettingsSection } from "@/lib/app-settings-nav"

type SettingsSection = AppSettingsSection

type MobilePhase = "list" | "detail"

type AppSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When the dialog opens, select this section (e.g. Drivers). Cleared via `onConsumedInitialSection`. */
  initialSection?: AppSettingsSection
  onConsumedInitialSection?: () => void
  driversContactFocus?: DriverContactFocusTarget | null
  onDriversContactFocusConsumed?: () => void
}

type SectionBodyOpts = {
  showPageIntro: boolean
}

const NARROW_MQ = "(max-width: 639px)"

function subscribeAppSettingsNarrow(onStoreChange: () => void) {
  const mq = window.matchMedia(NARROW_MQ)
  mq.addEventListener("change", onStoreChange)
  return () => mq.removeEventListener("change", onStoreChange)
}

function getAppSettingsNarrowSnapshot() {
  return window.matchMedia(NARROW_MQ).matches
}

function getAppSettingsNarrowServerSnapshot() {
  return false
}

export function AppSettingsDialog({
  open,
  onOpenChange,
  initialSection,
  onConsumedInitialSection,
  driversContactFocus,
  onDriversContactFocusConsumed,
}: AppSettingsDialogProps) {
  const defaultBillingMemo = React.useMemo(() => defaultBilling(), [])
  const [billing, setBilling] = React.useState<BillingPayment>(defaultBillingMemo)
  const [section, setSection] = React.useState<SettingsSection>("general")
  const { activeOrgId, activeOrg, orgOverrides, updateOrg } = useWorkspaceSettings()
  const [workspaceNameDraft, setWorkspaceNameDraft] = React.useState("")
  const [logoError, setLogoError] = React.useState<string | undefined>()
  const workspaceLogoInputRef = React.useRef<HTMLInputElement>(null)

  const narrow = React.useSyncExternalStore(
    subscribeAppSettingsNarrow,
    getAppSettingsNarrowSnapshot,
    getAppSettingsNarrowServerSnapshot
  )
  const [mobilePhase, setMobilePhase] = React.useState<MobilePhase>("list")
  const mobileTitleRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    if (!open) return
    setBilling(loadBilling(defaultBillingMemo))
  }, [open, defaultBillingMemo])

  React.useEffect(() => {
    if (!open) {
      setMobilePhase("list")
    }
  }, [open])

  React.useEffect(() => {
    if (!narrow) {
      setMobilePhase("list")
    }
  }, [narrow])

  /** Skip mobile header autofocus when opening Drivers via phone/email deep link (so the table input can keep focus). */
  const suppressMobileTitleFocusRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) suppressMobileTitleFocusRef.current = false
  }, [open])

  const wasOpenRef = React.useRef(false)
  React.useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      const nextSection = initialSection ?? "general"
      const mqNarrow =
        typeof window !== "undefined" && window.matchMedia(NARROW_MQ).matches
      setSection(nextSection)
      if (mqNarrow) {
        if (initialSection) {
          setMobilePhase("detail")
        } else {
          setMobilePhase("list")
          setSection("general")
        }
      } else {
        setMobilePhase("list")
      }
      onConsumedInitialSection?.()
    }
    wasOpenRef.current = open
  }, [open, initialSection, onConsumedInitialSection])

  React.useLayoutEffect(() => {
    if (!open || !narrow) return
    if (driversContactFocus) {
      suppressMobileTitleFocusRef.current = true
      return
    }
    if (suppressMobileTitleFocusRef.current) {
      suppressMobileTitleFocusRef.current = false
      return
    }
    requestAnimationFrame(() => {
      mobileTitleRef.current?.focus()
    })
  }, [open, narrow, mobilePhase, driversContactFocus])

  React.useEffect(() => {
    if (!open || !activeOrg) return
    setWorkspaceNameDraft(activeOrg.name.slice(0, 65))
  }, [open, activeOrgId, activeOrg])

  function handleWorkspaceLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (workspaceLogoInputRef.current) {
      workspaceLogoInputRef.current.value = ""
    }
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file")
      return
    }
    if (file.size > MAX_WORKSPACE_LOGO_BYTES) {
      setLogoError(
        `Use an image under ${Math.round(MAX_WORKSPACE_LOGO_BYTES / 1024)} KB so it can be saved in this browser.`
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (!result) {
        setLogoError("Could not read that file. Try another image.")
        return
      }
      updateOrg(activeOrgId, { logoDataUrl: result })
      setLogoError(undefined)
      void analyzeDataUrlForLogoHolder(result).then((holder) => {
        updateOrg(activeOrgId, { logoHolderBackground: holder })
      })
    }
    reader.readAsDataURL(file)
  }

  const previewLogoSrc = orgOverrides[activeOrgId]?.logoDataUrl?.trim() ?? ""
  const previewLogoHolder =
    orgOverrides[activeOrgId]?.logoHolderBackground ?? "light"
  const hasCustomLogo = Boolean(orgOverrides[activeOrgId]?.logoDataUrl?.trim())

  function handleBillingSave(next: BillingPayment) {
    setBilling(next)
  }

  function mobileBack() {
    if (mobilePhase === "detail") {
      setMobilePhase("list")
    }
  }

  function mobileBackAriaLabel(): string {
    if (mobilePhase === "detail") return "Back to workspace settings"
    return "Back"
  }

  function renderSectionBody(opts: SectionBodyOpts) {
    const { showPageIntro } = opts
    return (
      <>
        {section === "general" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-6">
            {showPageIntro ? (
              <div className="mb-4 shrink-0 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Company</h2>
                <p className="text-sm text-muted-foreground">
                  Update your workspace name and company logo.
                </p>
              </div>
            ) : null}
            <div className="flex flex-col gap-4">
              <div className="space-y-4">
                <Field data-invalid={!!logoError}>
                  <FieldLabel htmlFor="settings-workspace-logo">Company logo</FieldLabel>
                  <div className="flex flex-col gap-2">
                    <div className="group relative inline-flex self-center pb-12">
                      <div className="relative shrink-0">
                        {previewLogoSrc ? (
                          <div
                            className={cn(
                              orgLogoHolderClassName(previewLogoHolder),
                              "size-24 rounded-xl sm:size-28"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and local assets; not suitable for next/image without config */}
                            <img
                              src={previewLogoSrc}
                              alt={
                                workspaceNameDraft.trim()
                                  ? `${workspaceNameDraft.trim()} company logo`
                                  : "Company logo"
                              }
                              className="size-full object-contain select-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={cn(
                              "flex aspect-square shrink-0 items-center justify-center overflow-hidden",
                              "size-24 rounded-xl sm:size-28",
                              "border border-dashed border-muted-foreground/40 bg-muted/30 ring-1 ring-border/60",
                              "cursor-pointer outline-none transition-colors hover:bg-muted/45",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            )}
                            aria-label="No company logo — upload an image"
                            onClick={() => workspaceLogoInputRef.current?.click()}
                          >
                            <ImagePlus
                              className="pointer-events-none size-10 text-muted-foreground sm:size-12"
                              strokeWidth={1.25}
                              aria-hidden
                            />
                          </button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "absolute left-1/2 top-full z-10 min-h-11 -translate-x-1/2 -translate-y-1 bg-white transition-opacity duration-150 hover:bg-neutral-100 dark:bg-background dark:hover:bg-muted/80",
                            "opacity-100 pointer-events-auto",
                            "sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto"
                          )}
                          onClick={() => workspaceLogoInputRef.current?.click()}
                        >
                          {hasCustomLogo ? "Replace Logo" : "Upload Logo"}
                        </Button>
                      </div>
                      {hasCustomLogo ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Remove logo"
                          className={cn(
                            "absolute right-0 top-0 z-10 size-10 min-h-10 min-w-10 -translate-y-1/3 translate-x-1/4 rounded-full bg-white p-0 transition-opacity duration-150 hover:bg-neutral-100 dark:bg-background dark:hover:bg-muted/80",
                            "opacity-100 pointer-events-auto",
                            "sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto"
                          )}
                          onClick={() => {
                            updateOrg(activeOrgId, { logoDataUrl: null })
                            setLogoError(undefined)
                          }}
                        >
                          <X className="size-4 shrink-0" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                    <input
                      ref={workspaceLogoInputRef}
                      id="settings-workspace-logo"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleWorkspaceLogoChange}
                    />
                  </div>
                  {logoError ? <FieldError>{logoError}</FieldError> : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-workspace-name">Company name</FieldLabel>
                  <FieldDescription>Up to 65 characters</FieldDescription>
                  <Input
                    id="settings-workspace-name"
                    className="min-h-11"
                    value={workspaceNameDraft}
                    maxLength={65}
                    onChange={(e) => setWorkspaceNameDraft(e.target.value)}
                    onBlur={() => {
                      const next = workspaceNameDraft.slice(0, 65)
                      setWorkspaceNameDraft(next)
                      updateOrg(activeOrgId, { displayName: next })
                    }}
                    autoComplete="organization"
                  />
                </Field>
              </div>
            </div>
          </div>
        ) : null}

        {section === "team" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
            {showPageIntro ? (
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Team</h2>
                <p className="text-sm text-muted-foreground">
                  Invite people and set their roles.
                </p>
              </div>
            ) : null}
            <TeamSettingsPanel
              className="min-h-0 shrink-0 gap-3 p-0"
              visible={open && section === "team"}
            />
          </div>
        ) : null}

        {section === "drivers" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
            {showPageIntro ? (
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Drivers</h2>
                <p className="text-sm text-muted-foreground">
                  Add phone numbers and emails for fleet drivers.
                </p>
              </div>
            ) : null}
            <DriversSettingsPanel
              className="min-h-0 shrink-0 px-0 pb-0 pt-0"
              visible={open && section === "drivers"}
              contactFocusTarget={driversContactFocus}
              onContactFocusConsumed={onDriversContactFocusConsumed}
            />
          </div>
        ) : null}

        {section === "trucks" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
            {showPageIntro ? (
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Trucks</h2>
                <p className="text-sm text-muted-foreground">
                  Set truck numbers and fuel capacity in gallons for each unit.
                </p>
              </div>
            ) : null}
            <TrucksSettingsPanel
              className="min-h-0 shrink-0 px-0 pb-0 pt-0"
              visible={open && section === "trucks"}
            />
          </div>
        ) : null}

        {section === "billing" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
            {showPageIntro ? (
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Billing</h2>
                <p className="text-sm text-muted-foreground">
                  Payment method and invoices. Card details are stored locally for demo only.
                </p>
              </div>
            ) : null}
            <BillingSettingsPanel
              billing={billing}
              onBillingSave={handleBillingSave}
              visible={open && section === "billing"}
              className="min-h-0 shrink-0"
              scrollClassName="mt-0 min-h-0 flex-none overflow-visible px-0 pb-0 pt-0"
            />
          </div>
        ) : null}

        {section === "terms" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-6">
            <TermsOfServiceDemoPage />
          </div>
        ) : null}
      </>
    )
  }

  const mobileListRowClass =
    "flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm ring-1 ring-foreground/10 outline-none transition-[box-shadow,background-color] hover:bg-card/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const dialogShellClass = cn(
    "flex flex-col overflow-hidden border bg-background p-0 shadow-lg",
    narrow
      ? "h-[min(100dvh,100svh)] max-h-[min(100dvh,100svh)] w-[calc(100vw-0.5rem)] max-w-none rounded-xl"
      : "h-[min(90vh,920px)] max-h-[94vh] w-[min(94vw,calc(100vw-1rem))] max-w-[min(1400px,94vw)]"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-app-settings-dialog className={dialogShellClass}>
        <div className="sr-only">
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>
            Manage company profile, team, billing, drivers, trucks, and terms in one place.
          </DialogDescription>
        </div>

        {narrow ? (
          <div
            data-app-settings-mobile-shell
            className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
          >
            {mobilePhase === "list" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border/60 bg-card/45 px-4 pb-3 pt-4 pr-14 backdrop-blur-md">
                  <h2
                    ref={mobileTitleRef}
                    tabIndex={-1}
                    className="text-lg font-semibold text-foreground outline-none"
                  >
                    Workspace settings
                  </h2>
                  <p className="text-sm text-muted-foreground">Choose a setting</p>
                </div>
                <div
                  data-app-settings-mobile-list
                  className="min-h-0 flex-1 overflow-y-auto p-3"
                >
                  <ul className="list-none space-y-2">
                    {SETTINGS_NAV_GROUPS.map((g) => (
                      <React.Fragment key={g.id}>
                        <li className="px-1 pt-2 first:pt-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {g.label}
                          </p>
                        </li>
                        {g.items.map((item) => {
                          const ItemIcon = item.Icon
                          return (
                            <li key={item.section}>
                              <button
                                type="button"
                                className={mobileListRowClass}
                                onClick={() => {
                                  setSection(item.section)
                                  setMobilePhase("detail")
                                }}
                              >
                                <ItemIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="min-w-0 flex-1">{item.label}</span>
                                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                              </button>
                            </li>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {mobilePhase === "detail" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-card/50 px-2 pb-2 pt-2 pr-14 shadow-sm backdrop-blur-md">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 -ml-1 gap-1 px-2 font-normal"
                    onClick={mobileBack}
                    aria-label={mobileBackAriaLabel()}
                  >
                    <ChevronLeft className="size-5 shrink-0" aria-hidden />
                    Back
                  </Button>
                  {(() => {
                    const item = getNavItemForSection(section)
                    const gid = getGroupIdForSection(section)
                    const g = gid ? getNavGroup(gid) : undefined
                    const title = item?.label ?? "Settings"
                    return (
                      <>
                        <h2
                          ref={mobileTitleRef}
                          tabIndex={-1}
                          className="pl-2 text-lg font-semibold text-foreground outline-none"
                        >
                          {title}
                        </h2>
                        {g && item && g.id !== "terms" ? (
                          <Breadcrumb className="pl-2 pt-0.5">
                            <BreadcrumbList className="text-sm">
                              <BreadcrumbItem>
                                <span className="text-muted-foreground">{g.label}</span>
                              </BreadcrumbItem>
                              <BreadcrumbSeparator />
                              <BreadcrumbItem>
                                <BreadcrumbPage className="text-sm font-medium">
                                  {item.label}
                                </BreadcrumbPage>
                              </BreadcrumbItem>
                            </BreadcrumbList>
                          </Breadcrumb>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-app-settings-main text-app-settings-main-foreground">
                  <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col overflow-hidden">
                    {renderSectionBody({ showPageIntro: false })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <SidebarProvider className="group/sidebar-wrapper flex h-full min-h-0 flex-1 flex-row items-stretch gap-0">
            <Sidebar
              collapsible="none"
              className="h-full min-h-0 shrink-0 !w-44 border-r border-sidebar-border bg-transparent text-sidebar-foreground sm:!w-[min(13rem,24vw)]"
            >
              <SidebarContent className="gap-2">
                {SETTINGS_NAV_GROUPS.map((g) => (
                  <SidebarGroup key={g.id} className="py-1">
                    <SidebarGroupLabel
                      className={cn(
                        "font-medium text-sidebar-foreground/80",
                        g.id === "terms" &&
                          "h-auto min-h-8 items-start whitespace-normal py-1.5 leading-snug"
                      )}
                    >
                      {g.label}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                      {g.items.map((item) => {
                        const ItemIcon = item.Icon
                        return (
                          <SidebarMenuItem key={item.section}>
                            <SidebarMenuButton
                              isActive={section === item.section}
                              size="lg"
                              tooltip={item.tooltip}
                              onClick={() => setSection(item.section)}
                              render={<button type="button" />}
                            >
                              <ItemIcon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                ))}
              </SidebarContent>
            </Sidebar>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-app-settings-main text-app-settings-main-foreground">
              <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col overflow-hidden">
                {renderSectionBody({ showPageIntro: true })}
              </div>
            </div>
          </SidebarProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}
