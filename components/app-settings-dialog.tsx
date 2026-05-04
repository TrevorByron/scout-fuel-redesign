"use client"

import * as React from "react"
import {
  Contact,
  CreditCard,
  FileText,
  ImagePlus,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react"

import { BillingSettingsPanel } from "@/components/billing-settings-panel"
import { DriversSettingsPanel } from "@/components/drivers-settings-panel"
import { TrucksSettingsPanel } from "@/components/trucks-settings-panel"
import { orgLogoHolderClassName } from "@/components/org-switcher"
import { TeamSettingsPanel } from "@/components/team-settings-panel"
import { TermsOfServiceDemoPage } from "@/components/terms-of-service-demo"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import {
  defaultBilling,
  loadBilling,
  type BillingPayment,
} from "@/lib/billing-store"
import { analyzeDataUrlForLogoHolder } from "@/lib/analyze-logo-holder"
import { MAX_WORKSPACE_LOGO_BYTES } from "@/lib/workspace-settings-store"
import { useWorkspaceSettings } from "@/lib/workspace-settings-context"

type SettingsSection = "general" | "team" | "drivers" | "trucks" | "billing" | "terms"

type AppSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const defaultBillingMemo = React.useMemo(() => defaultBilling(), [])
  const [billing, setBilling] = React.useState<BillingPayment>(defaultBillingMemo)
  const [section, setSection] = React.useState<SettingsSection>("general")
  const { activeOrgId, activeOrg, orgOverrides, updateOrg } = useWorkspaceSettings()
  const [workspaceNameDraft, setWorkspaceNameDraft] = React.useState("")
  const [logoError, setLogoError] = React.useState<string | undefined>()
  const workspaceLogoInputRef = React.useRef<HTMLInputElement>(null)

  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  React.useEffect(() => {
    if (!open) return
    setBilling(loadBilling(defaultBillingMemo))
  }, [open, defaultBillingMemo])

  React.useEffect(() => {
    if (!open) return
    setSection("general")
  }, [open])

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

  const navButtonClass = narrow ? "w-auto shrink-0" : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-app-settings-dialog
        className="flex h-[min(90vh,920px)] max-h-[94vh] w-[min(94vw,calc(100vw-1rem))] max-w-[min(1400px,94vw)] flex-col overflow-hidden border bg-background p-0 shadow-lg"
      >
        <div className="sr-only">
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>
            Manage company profile, team, billing, drivers, trucks, and terms in one place.
          </DialogDescription>
        </div>
        <SidebarProvider
          className={cn(
            "group/sidebar-wrapper flex h-full min-h-0 flex-1 flex-row items-stretch gap-0",
            narrow && "flex-col"
          )}
        >
          <Sidebar
            collapsible="none"
            className={cn(
              "!w-44 bg-transparent text-sidebar-foreground sm:!w-[min(13rem,24vw)]",
              narrow
                ? "!h-auto !w-full shrink-0 border-b border-sidebar-border"
                : "h-full min-h-0 shrink-0 border-r border-sidebar-border"
            )}
          >
            <SidebarContent className={cn("gap-2", narrow ? "overflow-visible" : undefined)}>
              <SidebarGroup className={narrow ? "px-1 py-0" : "py-1"}>
                <SidebarGroupLabel className="font-medium text-sidebar-foreground/80">
                  Admin
                </SidebarGroupLabel>
                <SidebarMenu className={cn(narrow && "flex-row flex-wrap gap-1")}>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "general"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Company"}
                      onClick={() => setSection("general")}
                      render={<button type="button" />}
                    >
                      <Settings />
                      <span>Company</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "team"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Team"}
                      onClick={() => setSection("team")}
                      render={<button type="button" />}
                    >
                      <Users />
                      <span>Team</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "billing"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Billing"}
                      onClick={() => setSection("billing")}
                      render={<button type="button" />}
                    >
                      <CreditCard />
                      <span>Billing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup className={narrow ? "px-1 py-0" : "py-1"}>
                <SidebarGroupLabel className="font-medium text-sidebar-foreground/80">
                  Fleet
                </SidebarGroupLabel>
                <SidebarMenu className={cn(narrow && "flex-row flex-wrap gap-1")}>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "drivers"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Drivers"}
                      onClick={() => setSection("drivers")}
                      render={<button type="button" />}
                    >
                      <Contact />
                      <span>Drivers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "trucks"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Trucks"}
                      onClick={() => setSection("trucks")}
                      render={<button type="button" />}
                    >
                      <Truck />
                      <span>Trucks</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup className={narrow ? "px-1 py-0" : "py-1"}>
                <SidebarGroupLabel
                  className={cn(
                    "font-medium text-sidebar-foreground/80",
                    "h-auto min-h-8 items-start whitespace-normal py-1.5 leading-snug"
                  )}
                >
                  Terms
                </SidebarGroupLabel>
                <SidebarMenu className={cn(narrow && "flex-row flex-wrap gap-1")}>
                  <SidebarMenuItem className={narrow ? "w-auto" : undefined}>
                    <SidebarMenuButton
                      isActive={section === "terms"}
                      size="lg"
                      className={navButtonClass}
                      tooltip={narrow ? undefined : "Terms"}
                      onClick={() => setSection("terms")}
                      render={<button type="button" />}
                    >
                      <FileText />
                      <span>Terms</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-app-settings-main text-app-settings-main-foreground">
            <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col overflow-hidden">
            {section === "general" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-6">
                <div className="mb-4 shrink-0 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Company</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your workspace name and company logo.
                  </p>
                </div>
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
                <div className="mb-4 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Team</h2>
                  <p className="text-sm text-muted-foreground">
                    Invite people and set their roles.
                  </p>
                </div>
                <TeamSettingsPanel
                  className="min-h-0 shrink-0 gap-3 p-0"
                  visible={open && section === "team"}
                />
              </div>
            ) : null}

            {section === "drivers" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
                <div className="mb-4 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Drivers</h2>
                  <p className="text-sm text-muted-foreground">
                    Add phone numbers and emails for fleet drivers.
                  </p>
                </div>
                <DriversSettingsPanel
                  className="min-h-0 shrink-0 px-0 pb-0 pt-0"
                  visible={open && section === "drivers"}
                />
              </div>
            ) : null}

            {section === "trucks" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
                <div className="mb-4 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Trucks</h2>
                  <p className="text-sm text-muted-foreground">
                    Set truck numbers and fuel capacity in gallons for each unit.
                  </p>
                </div>
                <TrucksSettingsPanel
                  className="min-h-0 shrink-0 px-0 pb-0 pt-0"
                  visible={open && section === "trucks"}
                />
              </div>
            ) : null}

            {section === "billing" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-6">
                <div className="mb-4 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Billing</h2>
                  <p className="text-sm text-muted-foreground">
                    Payment method and invoices. Card details are stored locally for demo only.
                  </p>
                </div>
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
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
