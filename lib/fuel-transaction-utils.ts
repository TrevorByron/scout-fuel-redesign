import type { FuelTransaction } from "@/lib/mock-data"

const SAVINGS_THRESHOLD = 1

export function getEfficiencyStatus(
  t: FuelTransaction
): "efficient" | "needs_attention" {
  const hasMeaningfulBetterOption =
    t.betterOption != null &&
    t.betterOption.potentialSavings > SAVINGS_THRESHOLD
  const outOfNetworkWithRecommendation =
    !t.inNetwork && hasMeaningfulBetterOption
  if (t.alert || outOfNetworkWithRecommendation) return "needs_attention"
  return "efficient"
}
