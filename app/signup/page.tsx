"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { AuthSplitLayout } from "@/components/auth-split-layout"
import { LoginSplashScreen } from "@/components/login-splash-screen"
import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  const [showSplash, setShowSplash] = useState(false)
  const router = useRouter()

  if (showSplash) {
    return <LoginSplashScreen onComplete={() => router.push("/")} />
  }

  return (
    <AuthSplitLayout>
      <SignupForm onSubmit={() => setShowSplash(true)} />
    </AuthSplitLayout>
  )
}
