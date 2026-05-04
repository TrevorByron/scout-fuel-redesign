"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
/** Same legal-style demo copy as Settings → Terms. */
export function TermsOfServiceDemoPageHeader() {
  return (
    <div className="mb-4 shrink-0 space-y-1">
      <h2 className="text-lg font-semibold text-foreground">Terms and Conditions</h2>
      <p className="text-sm text-muted-foreground">
        Use this sample for demos and app store review, and replace it with your legal agreements
        before launch.
      </p>
    </div>
  )
}

export function TermsOfServiceDemoCard() {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
      <div className="space-y-1 pb-2">
        <h3 className="text-base font-medium text-foreground">Scout Fuel — terms of use (demo)</h3>
        <p className="text-muted-foreground text-xs">
          Last updated: May 4, 2026 · Sample copy only, not legal advice.
        </p>
      </div>
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">1. Agreement</h3>
          <p className="text-muted-foreground">
            By accessing or using Scout Fuel (“the Service”), you agree to these Terms and Conditions.
            If you do not agree, do not use the Service. This is a demonstration build; features, data,
            and availability may change without notice.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">2. License to use</h3>
          <p className="text-muted-foreground">
            Subject to these terms, we grant you a limited, non-exclusive, non-transferable license to
            use the Service for your internal fleet and fuel management purposes during the term of your
            subscription or trial, as applicable.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">3. Demo data</h3>
          <p className="text-muted-foreground">
            Sample drivers, trips, stations, and savings shown in the app are illustrative only. They do
            not represent real individuals or transactions and must not be relied upon for business,
            compliance, or investment decisions.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">4. Disclaimers</h3>
          <p className="text-muted-foreground">
            The Service is provided “as is” without warranties of any kind, whether express or implied,
            including merchantability, fitness for a particular purpose, and non-infringement. We do
            not warrant uninterrupted or error-free operation.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">5. Limitation of liability</h3>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Scout Fuel and its affiliates will not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of
            profits, data, or goodwill, arising from your use of the Service.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">6. Changes</h3>
          <p className="text-muted-foreground">
            We may update these terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the revised terms. A notice will be shown in-app when material
            changes apply.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">7. Contact</h3>
          <p className="text-muted-foreground">
            Questions about these terms: legal@example.com (placeholder — replace with your support or
            legal contact before release).
          </p>
        </section>
      </div>
    </div>
  )
}

export function TermsOfServiceDemoPage() {
  return (
    <>
      <TermsOfServiceDemoPageHeader />
      <TermsOfServiceDemoCard />
    </>
  )
}

type TermsOfServiceDemoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsOfServiceDemoDialog({ open, onOpenChange }: TermsOfServiceDemoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col overflow-hidden p-0 sm:max-w-[800px]">
        <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-6">
          <DialogTitle className="text-base">Terms and Conditions</DialogTitle>
          <DialogDescription>
            Use this sample for demos and app store review, and replace it with your legal agreements
            before launch.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto min-h-0 w-full max-w-[800px] flex-1 overflow-y-auto p-4 sm:px-6">
          <TermsOfServiceDemoCard />
        </div>
      </DialogContent>
    </Dialog>
  )
}
