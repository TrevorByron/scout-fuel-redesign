"use client"

import * as React from "react"
import Image from "next/image"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const SPLASH_DURATION_MS = 5000
const FADE_OUT_MS = 700
const STEP_REVEAL_MS = Math.floor(SPLASH_DURATION_MS / 3)
const PROGRESS_INTERVAL_MS = 50
const PROGRESS_STEP = (100 * PROGRESS_INTERVAL_MS) / SPLASH_DURATION_MS

const LOADING_STEPS = [
  "Loading all fuel transactions...",
  "Building your dashboard...",
  "Gathering insights...",
]

export function LoginSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isExiting, setIsExiting] = React.useState(false)
  const completed = React.useRef(false)

  React.useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((n) => (n + 1) % LOADING_STEPS.length)
    }, STEP_REVEAL_MS)

    return () => clearInterval(stepInterval)
  }, [])

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + PROGRESS_STEP)
        return next
      })
    }, PROGRESS_INTERVAL_MS)

    const doneTimeout = setTimeout(() => {
      if (completed.current) return
      completed.current = true
      clearInterval(interval)
      setProgress(100)
      setIsExiting(true)
    }, SPLASH_DURATION_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(doneTimeout)
    }
  }, [])

  React.useEffect(() => {
    if (!isExiting) return
    const navigateTimeout = setTimeout(() => {
      onComplete()
    }, FADE_OUT_MS)
    return () => clearTimeout(navigateTimeout)
  }, [isExiting, onComplete])

  return (
    <div
      className={cn(
        "flex min-h-svh w-full flex-col items-center justify-center gap-8 bg-background p-6 animate-in fade-in-0 duration-700 transition-opacity duration-700 ease-out",
        isExiting && "opacity-0"
      )}
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/full-logo.svg"
          alt="Scout Fuel"
          width={139}
          height={79}
          className="h-auto w-[100px]"
        />
        <div className="space-y-2">
          <p className="text-base font-semibold tracking-tight">
            Opening your account
          </p>
          <div className="w-full min-w-xs max-w-xs space-y-2">
        <Progress value={progress} className="h-2 [&>div:last-child]:transition-[width] [&>div:last-child]:duration-700 [&>div:last-child]:ease-out" />
      </div>
          <div className="flex min-h-[2rem] items-center justify-center pt-2 text-sm text-muted-foreground">
            <p
              key={LOADING_STEPS[currentStep]}
              className="animate-in fade-in-0 duration-1000"
            >
              {LOADING_STEPS[currentStep]}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
