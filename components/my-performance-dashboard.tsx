"use client"

import { DashboardDefault } from "@/components/dashboard-default"
import { MY_PERFORMANCE_DRIVER_NAME } from "@/lib/my-performance-driver"

export function MyPerformanceDashboard() {
  return (
    <DashboardDefault variant="myPerformance" driverName={MY_PERFORMANCE_DRIVER_NAME} />
  )
}
