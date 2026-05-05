import type { SavedDealAnalysis } from "@/lib/deal-analyzer-types"

const STORAGE_KEY = "scoutfuel-deal-analyses-v1"

function readAll(): SavedDealAnalysis[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is SavedDealAnalysis =>
        x != null &&
        typeof x === "object" &&
        typeof (x as SavedDealAnalysis).id === "string" &&
        typeof (x as SavedDealAnalysis).name === "string"
    )
  } catch {
    return []
  }
}

function writeAll(list: SavedDealAnalysis[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
}

export function listSavedDealAnalyses(): SavedDealAnalysis[] {
  return readAll().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export function getSavedDealAnalysis(id: string): SavedDealAnalysis | null {
  const found = readAll().find((x) => x.id === id)
  return found ?? null
}

export function saveDealAnalysis(entry: SavedDealAnalysis): void {
  const list = readAll().filter((x) => x.id !== entry.id)
  list.unshift(entry)
  writeAll(list)
}

export function deleteDealAnalysis(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id))
}
