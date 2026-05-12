"use client"

import * as React from "react"

export type DealAnalyzerHeaderStep = "details" | "results"

export type DealAnalyzerHeaderNavPayload = {
  compact: boolean
  showResults: boolean
  step: DealAnalyzerHeaderStep
  setStep: (step: DealAnalyzerHeaderStep) => void
}

type DealAnalyzerHeaderNavContextValue = {
  payload: DealAnalyzerHeaderNavPayload | null
  setPayload: (payload: DealAnalyzerHeaderNavPayload | null) => void
}

const DealAnalyzerHeaderNavContext =
  React.createContext<DealAnalyzerHeaderNavContextValue | null>(null)

export function DealAnalyzerHeaderNavProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [payload, setPayload] = React.useState<DealAnalyzerHeaderNavPayload | null>(null)
  const value = React.useMemo(
    () => ({ payload, setPayload }),
    [payload]
  )
  return (
    <DealAnalyzerHeaderNavContext.Provider value={value}>
      {children}
    </DealAnalyzerHeaderNavContext.Provider>
  )
}

export function useDealAnalyzerHeaderNavPayload(): DealAnalyzerHeaderNavPayload | null {
  return React.useContext(DealAnalyzerHeaderNavContext)?.payload ?? null
}

export function useDealAnalyzerHeaderNavSetter() {
  const ctx = React.useContext(DealAnalyzerHeaderNavContext)
  return ctx?.setPayload
}
