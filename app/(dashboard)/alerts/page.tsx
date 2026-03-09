"use client"

import { alertsList } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  LicenseMaintenanceIcon,
  Route01Icon,
  ReceiptDollarIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const iconMap: Record<string, typeof ReceiptDollarIcon> = {
  "Non-preferred station": ReceiptDollarIcon,
  Maintenance: LicenseMaintenanceIcon,
  "Route optimization": Route01Icon,
  Vendor: ReceiptDollarIcon,
  "Idle time": Clock01Icon,
}

export default function AlertsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Alerts & Recommendations</h2>
        <p className="text-sm text-muted-foreground">
          Actionable items and estimated impact
        </p>
      </div>

      <div className="space-y-4 px-4 lg:px-6">
        {alertsList.map((alert) => {
          const Icon = iconMap[alert.type] ?? AlertCircleIcon
          const variant =
            alert.priority === "High"
              ? "destructive"
              : alert.priority === "Medium"
                ? "default"
                : "secondary"
          return (
            <Alert
              key={alert.id}
              variant={alert.priority === "High" ? "destructive" : "default"}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <HugeiconsIcon icon={Icon} className="size-5 shrink-0" strokeWidth={2} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTitle className="mb-0">{alert.type}</AlertTitle>
                    <Badge variant={variant}>{alert.priority}</Badge>
                  </div>
                  <AlertDescription>{alert.description}</AlertDescription>
                  {alert.savingsOrCost > 0 && (
                    <p
                      className={cn(
                        "text-sm font-medium",
                        alert.isSavings ? "text-[var(--success)]" : "text-destructive"
                      )}
                    >
                      {alert.isSavings
                        ? `Potential savings: $${alert.savingsOrCost.toLocaleString()}`
                        : `Cost: $${alert.savingsOrCost.toLocaleString()}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="outline">
                  Dismiss
                </Button>
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
              </div>
            </Alert>
          )
        })}
      </div>
    </div>
  )
}
