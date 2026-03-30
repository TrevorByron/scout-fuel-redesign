"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LoginForm } from "@/components/login-form"
import { LoginSplashScreen } from "@/components/login-splash-screen"
export default function LoginPage() {
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
            <Image
              src="/full-logo.svg"
              alt="Scout Fuel"
              width={139}
              height={79}
              className="h-auto w-[100px]"
            />
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
