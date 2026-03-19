"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LoginForm } from "@/components/login-form"
import { LoginSplashScreen } from "@/components/login-splash-screen"
import { ScoutIcon } from "@/components/scout-icon"
import { useStyle } from "@/components/style-provider"

export default function LoginPage() {
  const { style } = useStyle()
  const [showSplash, setShowSplash] = useState(false)
  const router = useRouter()

  if (showSplash) {
    return <LoginSplashScreen onComplete={() => router.push("/")} />
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            {style === "2" || style === "4" || style === "5" ? (
              <Image
                src="/full-logo.svg"
                alt="Scout Fuel"
                width={139}
                height={79}
                className="h-auto w-[100px]"
              />
            ) : (
              <>
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ScoutIcon className="size-4" />
                </div>
                Scout Fuel
              </>
            )}
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-[360px]">
            <LoginForm onSubmit={() => setShowSplash(true)} />
          </div>
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
