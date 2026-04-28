"use client"

import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"
import { CreditCard, Download, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type { BillingPayment } from "@/lib/billing-store"
import { saveBilling } from "@/lib/billing-store"

const billingSchema = z.object({
  cardholderName: z.string().min(1, "Enter cardholder name"),
  cardNumber: z
    .string()
    .regex(/^\d+$/, "Use digits only")
    .refine((s) => s.length >= 13 && s.length <= 19, "Enter between 13 and 19 digits"),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY"),
  cvv: z.string().regex(/^\d{3,4}$/, "Enter 3 or 4 digits"),
  addressLine1: z.string().min(1, "Enter street address"),
  addressLine2: z.string(),
  city: z.string().min(1, "Enter city"),
  region: z.string().min(1, "Enter state or region"),
  postalCode: z.string().min(1, "Enter postal code"),
  country: z.string().min(1, "Choose country"),
})

type BillingErrors = Partial<Record<keyof BillingPayment, string>>

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
] as const

const MOCK_INVOICES = [
  { id: "INV-001", label: "INV-001", dateLine: "Mar 1, 2024", amount: "$29.00", status: "Paid" as const },
  { id: "INV-002", label: "INV-002", dateLine: "Feb 1, 2024", amount: "$29.00", status: "Paid" as const },
  { id: "INV-003", label: "INV-003", dateLine: "Jan 1, 2024", amount: "$29.00", status: "Paid" as const },
]

function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function paymentMethodSummary(cardNumberDigits: string): string {
  if (cardNumberDigits.length < 4) return "No payment method on file"
  const last4 = cardNumberDigits.slice(-4)
  return `Visa ending in ${last4}`
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  billing: BillingPayment
  onBillingSave: (next: BillingPayment) => void
}

export function BillingSettingsDialog({ open, onOpenChange, billing, onBillingSave }: Props) {
  const [values, setValues] = React.useState<BillingPayment>(billing)
  const [errors, setErrors] = React.useState<BillingErrors>({})
  const [paymentExpanded, setPaymentExpanded] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("payment")

  React.useEffect(() => {
    if (!open) return
    setValues(billing)
    setErrors({})
  }, [open, billing])

  const prevOpenRef = React.useRef(open)
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      setPaymentExpanded(false)
      setActiveTab("payment")
    }
    prevOpenRef.current = open
  }, [open])

  const cardDigits = values.cardNumber.replace(/\D/g, "")

  const isDirty = React.useMemo(() => {
    const keys: (keyof BillingPayment)[] = [
      "cardholderName",
      "cardNumber",
      "expiry",
      "cvv",
      "addressLine1",
      "addressLine2",
      "city",
      "region",
      "postalCode",
      "country",
    ]
    return keys.some((k) => values[k] !== billing[k])
  }, [values, billing])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = billingSchema.safeParse(values)
    if (!parsed.success) {
      const next: BillingErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === "string" && key in values) {
          next[key as keyof BillingPayment] = issue.message
        }
      }
      setErrors(next)
      toast.error("Fix the highlighted fields")
      setPaymentExpanded(true)
      return
    }
    setErrors({})
    saveBilling(parsed.data)
    onBillingSave(parsed.data)
    toast.success("Billing information saved")
    setPaymentExpanded(false)
  }

  function handleInvoiceDownload(id: string) {
    toast.message(`Download started for ${id} (demo)`)
  }

  function handleDownloadAll() {
    toast.message("Downloading all invoices (demo)")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 sm:max-w-xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle>Billing</DialogTitle>
          <DialogDescription>
            Manage payment method and view invoices. Card details are stored locally for demo purposes
            only.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="mt-2 max-h-[min(58vh,520px)] overflow-y-auto px-3 pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="payment">Payment method</TabsTrigger>
                <TabsTrigger value="history">Billing History</TabsTrigger>
              </TabsList>

              <TabsContent value="payment" className="flex flex-col gap-3">
              <Card variant="flat">
                <CardHeader>
                  <CardTitle>Payment method</CardTitle>
                  {!paymentExpanded ? (
                    <CardDescription>
                      Summary of your saved card. Use Update Payment Method to edit details.
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                        <CreditCard className="size-5 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="text-xs text-muted-foreground">{paymentMethodSummary(cardDigits)}</p>
                    </div>
                    {!paymentExpanded ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full shrink-0 sm:w-auto"
                        onClick={() => setPaymentExpanded(true)}
                      >
                        Update Payment Method
                      </Button>
                    ) : null}
                  </div>

                  {paymentExpanded ? (
                    <>
                      <Separator />
                      <Field data-invalid={!!errors.cardholderName}>
                        <FieldLabel htmlFor="billing-cardholder">Name on card</FieldLabel>
                        <Input
                          id="billing-cardholder"
                          autoComplete="cc-name"
                          className="min-h-11"
                          value={values.cardholderName}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, cardholderName: e.target.value }))
                            if (errors.cardholderName) {
                              setErrors((prev) => ({ ...prev, cardholderName: undefined }))
                            }
                          }}
                          aria-invalid={!!errors.cardholderName}
                        />
                        {errors.cardholderName ? (
                          <FieldError>{errors.cardholderName}</FieldError>
                        ) : null}
                      </Field>
                      <Field data-invalid={!!errors.cardNumber}>
                        <FieldLabel htmlFor="billing-card-number">Card number</FieldLabel>
                        <Input
                          id="billing-card-number"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="4242424242424242"
                          className="min-h-11"
                          value={values.cardNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 19)
                            setValues((v) => ({ ...v, cardNumber: digits }))
                            if (errors.cardNumber) {
                              setErrors((prev) => ({ ...prev, cardNumber: undefined }))
                            }
                          }}
                          aria-invalid={!!errors.cardNumber}
                        />
                        {errors.cardNumber ? <FieldError>{errors.cardNumber}</FieldError> : null}
                      </Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field data-invalid={!!errors.expiry}>
                          <FieldLabel htmlFor="billing-expiry">Expiry</FieldLabel>
                          <Input
                            id="billing-expiry"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/YY"
                            className="min-h-11"
                            value={values.expiry}
                            onChange={(e) => {
                              const next = formatExpiryInput(e.target.value)
                              setValues((v) => ({ ...v, expiry: next }))
                              if (errors.expiry) {
                                setErrors((prev) => ({ ...prev, expiry: undefined }))
                              }
                            }}
                            aria-invalid={!!errors.expiry}
                          />
                          {errors.expiry ? <FieldError>{errors.expiry}</FieldError> : null}
                        </Field>
                        <Field data-invalid={!!errors.cvv}>
                          <FieldLabel htmlFor="billing-cvv">CVV</FieldLabel>
                          <Input
                            id="billing-cvv"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            type="password"
                            placeholder="123"
                            className="min-h-11"
                            value={values.cvv}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
                              setValues((v) => ({ ...v, cvv: digits }))
                              if (errors.cvv) {
                                setErrors((prev) => ({ ...prev, cvv: undefined }))
                              }
                            }}
                            aria-invalid={!!errors.cvv}
                          />
                          {errors.cvv ? <FieldError>{errors.cvv}</FieldError> : null}
                        </Field>
                      </div>

                      <Separator />

                      <div className="space-y-1 pb-1">
                        <FieldTitle>Billing address</FieldTitle>
                        <FieldDescription>
                          Used for invoices and tax where applicable.
                        </FieldDescription>
                      </div>
                      <Field data-invalid={!!errors.country}>
                        <FieldLabel htmlFor="billing-country">Country</FieldLabel>
                        <Select
                          value={values.country}
                          onValueChange={(v) => {
                            setValues((prev) => ({ ...prev, country: v ?? prev.country }))
                            if (errors.country) {
                              setErrors((prev) => ({ ...prev, country: undefined }))
                            }
                          }}
                        >
                          <SelectTrigger id="billing-country" className="min-h-11 w-full">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent align="start">
                            <SelectGroup>
                              {countryOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {errors.country ? <FieldError>{errors.country}</FieldError> : null}
                      </Field>
                      <Field data-invalid={!!errors.addressLine1}>
                        <FieldLabel htmlFor="billing-line1">Address line 1</FieldLabel>
                        <Input
                          id="billing-line1"
                          autoComplete="street-address"
                          className="min-h-11"
                          value={values.addressLine1}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, addressLine1: e.target.value }))
                            if (errors.addressLine1) {
                              setErrors((prev) => ({ ...prev, addressLine1: undefined }))
                            }
                          }}
                          aria-invalid={!!errors.addressLine1}
                        />
                        {errors.addressLine1 ? (
                          <FieldError>{errors.addressLine1}</FieldError>
                        ) : null}
                      </Field>
                      <Field data-invalid={!!errors.addressLine2}>
                        <FieldLabel htmlFor="billing-line2">Address line 2 (optional)</FieldLabel>
                        <Input
                          id="billing-line2"
                          autoComplete="address-line2"
                          className="min-h-11"
                          value={values.addressLine2}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, addressLine2: e.target.value }))
                            if (errors.addressLine2) {
                              setErrors((prev) => ({ ...prev, addressLine2: undefined }))
                            }
                          }}
                          aria-invalid={!!errors.addressLine2}
                        />
                        {errors.addressLine2 ? (
                          <FieldError>{errors.addressLine2}</FieldError>
                        ) : null}
                      </Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field data-invalid={!!errors.city}>
                          <FieldLabel htmlFor="billing-city">City</FieldLabel>
                          <Input
                            id="billing-city"
                            autoComplete="address-level2"
                            className="min-h-11"
                            value={values.city}
                            onChange={(e) => {
                              setValues((v) => ({ ...v, city: e.target.value }))
                              if (errors.city) {
                                setErrors((prev) => ({ ...prev, city: undefined }))
                              }
                            }}
                            aria-invalid={!!errors.city}
                          />
                          {errors.city ? <FieldError>{errors.city}</FieldError> : null}
                        </Field>
                        <Field data-invalid={!!errors.region}>
                          <FieldLabel htmlFor="billing-region">State / region</FieldLabel>
                          <Input
                            id="billing-region"
                            autoComplete="address-level1"
                            className="min-h-11"
                            value={values.region}
                            onChange={(e) => {
                              setValues((v) => ({ ...v, region: e.target.value }))
                              if (errors.region) {
                                setErrors((prev) => ({ ...prev, region: undefined }))
                              }
                            }}
                            aria-invalid={!!errors.region}
                          />
                          {errors.region ? <FieldError>{errors.region}</FieldError> : null}
                        </Field>
                      </div>
                      <Field data-invalid={!!errors.postalCode}>
                        <FieldLabel htmlFor="billing-postal">Postal code</FieldLabel>
                        <Input
                          id="billing-postal"
                          autoComplete="postal-code"
                          className="min-h-11"
                          value={values.postalCode}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, postalCode: e.target.value }))
                            if (errors.postalCode) {
                              setErrors((prev) => ({ ...prev, postalCode: undefined }))
                            }
                          }}
                          aria-invalid={!!errors.postalCode}
                        />
                        {errors.postalCode ? (
                          <FieldError>{errors.postalCode}</FieldError>
                        ) : null}
                      </Field>
                    </>
                  ) : null}

                  {paymentExpanded ? (
                    <Button type="submit" className="min-h-11 w-full" disabled={!isDirty}>
                      Save changes
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
              </TabsContent>

              <TabsContent value="history" className="flex flex-col gap-3">
              <Card variant="flat">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                  <CardTitle>Billing History</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 gap-2"
                    onClick={handleDownloadAll}
                  >
                    <Download className="size-4 shrink-0" aria-hidden />
                    Download All
                  </Button>
                </CardHeader>
                <CardContent className="px-0 pb-0 pt-0">
                  <ul className="divide-y divide-border">
                    {MOCK_INVOICES.map((inv) => (
                      <li key={inv.id}>
                        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                              <FileText className="size-5 text-muted-foreground" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight">{inv.label}</p>
                              <p className="text-xs text-muted-foreground">{inv.dateLine}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            <Badge variant="outline" className="font-normal">
                              {inv.status}
                            </Badge>
                            <span className="min-w-[4rem] text-right text-sm font-semibold tabular-nums">
                              {inv.amount}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              className="size-11 shrink-0 rounded-md"
                              aria-label={`Download ${inv.label}`}
                              onClick={() => handleInvoiceDownload(inv.id)}
                            >
                              <Download className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
