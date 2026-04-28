"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TeamSettingsPanel } from "@/components/team-settings-panel"

export function TeamSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle>Team settings</DialogTitle>
          <DialogDescription>
            Invite teammates and manage permissions.
          </DialogDescription>
        </DialogHeader>
        <TeamSettingsPanel className="overflow-y-auto px-3 pb-3 md:px-4 md:pb-4" />
      </DialogContent>
    </Dialog>
  )
}
