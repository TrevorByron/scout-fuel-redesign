/** Canonical app origin for invite links and email assets (no trailing slash). */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`
  return "http://localhost:3000"
}

/**
 * Same as {@link getPublicAppUrl} but prefers the URL of the request that triggered
 * the handler when `NEXT_PUBLIC_APP_URL` is unset — matches the browser’s deployment
 * (Vercel preview URL, custom domain, etc.) so invite HTML assets and links resolve correctly.
 */
export function getPublicAppUrlForRequest(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  try {
    return new URL(request.url).origin
  } catch {
    return getPublicAppUrl()
  }
}
