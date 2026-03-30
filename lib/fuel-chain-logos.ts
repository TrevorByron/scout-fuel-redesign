/**
 * Maps chain / brand names to logos in `public/logos/fuel/`.
 * Add files there and extend this map as you get more assets.
 */
export function getFuelChainLogoSrc(chain: string): string | null {
  const n = chain.toLowerCase().trim()

  if (n.includes("love")) return "/logos/fuel/loves.png"
  if (n.includes("pilot")) return "/logos/fuel/pilot.webp"
  if (n.includes("shell")) return "/logos/fuel/shell.png"
  if (n.includes("maverik")) return "/logos/fuel/maverik.jpg"
  if (
    n.includes("ta/") ||
    n.includes("ta ") ||
    n.startsWith("ta") ||
    n.includes("petro") ||
    n.includes("travel")
  ) {
    return "/logos/fuel/ta.svg"
  }
  if (n.includes("qt") || n.includes("quik")) return "/logos/fuel/qt.jpg"

  return null
}
