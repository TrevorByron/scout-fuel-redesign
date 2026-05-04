"use client"

import Image from "next/image"
import Link from "next/link"

import { WORKSPACE_BRAND_LOGO_SRC } from "@/lib/workspace-brand"
import { cn } from "@/lib/utils"

export function AuthSplitLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid min-h-svh lg:grid-cols-2", className)}>
      <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src={WORKSPACE_BRAND_LOGO_SRC}
              alt="Scout Fuel"
              width={139}
              height={79}
              className="h-auto w-[100px]"
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-[360px]">{children}</div>
        </div>
      </div>
      <div
        className="relative hidden bg-muted bg-cover bg-center bg-no-repeat lg:block"
        style={{
          backgroundImage: "url(/login-bg.png)",
        }}
      />
    </div>
  )
}
