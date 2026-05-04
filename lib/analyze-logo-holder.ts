import type { LogoHolderBackground } from "@/lib/workspace-settings-store"

const MAX_SAMPLE = 64
const ALPHA_FLOOR = 16
const LUMINANCE_THRESHOLD = 128

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Samples a rasterized image (data URL) and returns which holder background contrasts best:
 * dark artwork → "light" holder; light artwork → "dark" holder.
 * On failure, returns "light" (safe for predominantly dark logos).
 */
export function analyzeDataUrlForLogoHolder(dataUrl: string): Promise<LogoHolderBackground> {
  if (typeof window === "undefined" || !dataUrl.trim()) {
    return Promise.resolve("light")
  }

  return new Promise((resolve) => {
    const img = new Image()
    const done = (holder: LogoHolderBackground) => resolve(holder)

    img.onerror = () => done("light")
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) {
          done("light")
          return
        }

        const scale = Math.min(1, MAX_SAMPLE / Math.max(w, h))
        const cw = Math.max(1, Math.round(w * scale))
        const ch = Math.max(1, Math.round(h * scale))

        const canvas = document.createElement("canvas")
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          done("light")
          return
        }

        ctx.drawImage(img, 0, 0, cw, ch)
        const { data } = ctx.getImageData(0, 0, cw, ch)

        let sum = 0
        let n = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] ?? 0
          if (a < ALPHA_FLOOR) continue
          sum += relativeLuminance(data[i]!, data[i + 1]!, data[i + 2]!)
          n += 1
        }

        if (n === 0) {
          done("light")
          return
        }

        const mean = sum / n
        done(mean < LUMINANCE_THRESHOLD ? "light" : "dark")
      } catch {
        done("light")
      }
    }

    img.src = dataUrl
  })
}
