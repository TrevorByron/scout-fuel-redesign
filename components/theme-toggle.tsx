"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { SunIcon, MoonIcon } from "@hugeicons/core-free-icons"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  function toggle() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="size-8"
        >
          {isDark ? (
            <HugeiconsIcon icon={SunIcon} strokeWidth={2} className="size-4" />
          ) : (
            <HugeiconsIcon icon={MoonIcon} strokeWidth={2} className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "Light mode" : "Dark mode"}
      </TooltipContent>
    </Tooltip>
  )
}
