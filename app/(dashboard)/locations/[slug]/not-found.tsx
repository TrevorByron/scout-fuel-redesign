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

export default function LocationNotFound() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/locations" />}>
              Location insights
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Location not found</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Location not found
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            The location you&apos;re looking for doesn&apos;t exist or has no transactions in the dataset.
          </p>
        </div>
        <Link
          href="/locations"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Back to Location insights
        </Link>
      </div>
    </div>
  )
}
