import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DriverNotFound() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/drivers" />}>
              Driver insights
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Driver not found</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Driver not found
        </h1>
        <p className="text-muted-foreground text-sm">
          The driver you’re looking for doesn’t exist or isn’t in the fleet.
        </p>
        <Link
          href="/drivers"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Back to Driver insights
        </Link>
      </div>
    </div>
  )
}
