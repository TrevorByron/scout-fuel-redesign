/** Derive a login-safe handle from a person's name (prototype / local profile). */
export function usernameFromDisplayName(displayName: string): string {
  let s = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")

  if (!s) s = "member"
  if (s.length > 32) {
    s = s.slice(0, 32).replace(/\.+$/g, "") || "member"
  }
  if (s.length < 3) s = s.padEnd(3, "x")
  if (s.length > 32) s = s.slice(0, 32)
  return s
}
