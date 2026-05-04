"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BillingSettingsPanel } from "@/components/billing-settings-panel"
import type { BillingPayment } from "@/lib/billing-store"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  billing: BillingPayment
  onBillingSave: (next: BillingPayment) => void
}

export function BillingSettingsDialog({ open, onOpenChange, billing, onBillingSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-app-settings-dialog
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[800px]"
      >
        <DialogHeader className="border-b px-4 pb-3 pt-4 sm:px-6">
          <DialogTitle>Billing</DialogTitle>
          <DialogDescription>
            Manage payment method and view invoices. Card details are stored locally for demo purposes
            only.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col">
          <BillingSettingsPanel
            billing={billing}
            onBillingSave={onBillingSave}
            visible={open}
            className="flex min-h-0 flex-1 flex-col"
            scrollClassName="max-h-[min(58vh,520px)]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
