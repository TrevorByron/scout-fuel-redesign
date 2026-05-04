export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Email-safe literal palette. Mirrors the design tokens in `app/globals.css`
 * (`--primary`, `--foreground`, `--muted`, `--muted-foreground`, `--border`,
 * `--card`, `--background`). Email clients can't resolve `oklch()` or CSS
 * variables, so we keep one set of hex values here — change them when the
 * brand tokens shift. Parallel to `lib/map-paint-colors.ts` for MapLibre.
 */
const EMAIL_BRAND = {
  primary: "#1FA8D6",
  primaryForeground: "#FFFFFF",
  foreground: "#0E1B26",
  mutedForeground: "#5A6B7A",
  border: "#E2E8EE",
  borderSoft: "#EEF2F6",
  surface: "#FFFFFF",
} as const

const FONT_STACK =
  "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"

/**
 * App shell gradient (email-safe rgba/hex). Mirrors the layered radials on
 * `:root [data-slot="sidebar-wrapper"]` in `app/globals.css` — same positions
 * and stacking; colors approximate `--primary` and `--chart-2` … `--chart-5`.
 */
const EMAIL_APP_SHELL_BASE = "#F6F8FA"
const EMAIL_APP_SHELL_IMAGE = [
  "radial-gradient(ellipse 120% 80% at 10% 20%, rgba(31,168,214,0.16) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 100% at 85% 30%, rgba(56,189,248,0.14) 0%, transparent 55%)",
  "radial-gradient(ellipse 80% 70% at 50% 85%, rgba(45,212,191,0.12) 0%, transparent 60%)",
  "radial-gradient(ellipse 70% 90% at 70% 60%, rgba(94,234,212,0.1) 0%, transparent 55%)",
  "radial-gradient(ellipse 100% 60% at 25% 70%, rgba(180,230,90,0.1) 0%, transparent 55%)",
].join(",")

const EMAIL_APP_SHELL_STYLE_ATTR = `background-color:${EMAIL_APP_SHELL_BASE};background-image:${EMAIL_APP_SHELL_IMAGE};background-repeat:no-repeat;background-size:100% 100%;`

/** For the invite preview iframe in the app — same shell as the email body. */
export const inviteEmailPreviewShellStyle = {
  backgroundColor: EMAIL_APP_SHELL_BASE,
  backgroundImage: EMAIL_APP_SHELL_IMAGE,
  backgroundRepeat: "no-repeat" as const,
  backgroundSize: "100% 100%",
}

export type TeamInviteEmailParams = {
  appUrl: string
  /** Signed token for `/join?token=` (ignored when `isPreview`). */
  joinToken: string
  recipientEmail: string
  roleLabel: string
  personalNote: string
  orgDisplayName?: string
  /** Display name of the person sending the invite. */
  inviterName: string
  /** Optional; kept for API compatibility (inviter is named in the body copy). */
  inviterEmail?: string
  /** When true, CTA is non-functional but uses the same primary styling as the live email. */
  isPreview?: boolean
}

export function buildTeamInviteEmailHtml(p: TeamInviteEmailParams): string {
  const logoUrl = `${p.appUrl}/full-logo.svg`
  const joinUrl = p.isPreview
    ? `${p.appUrl.replace(/\/$/, "")}/join`
    : `${p.appUrl.replace(/\/$/, "")}/join?token=${encodeURIComponent(p.joinToken)}`
  const safeNote = escapeHtml(p.personalNote.trim())
  const safeOrg = p.orgDisplayName?.trim() ? escapeHtml(p.orgDisplayName.trim()) : ""
  const safeRole = escapeHtml(p.roleLabel)
  const safeEmail = escapeHtml(p.recipientEmail)
  const inviterDisplay = p.inviterName.trim() || "Your teammate"
  const safeInviterName = escapeHtml(inviterDisplay)
  const strong = `style="color:${EMAIL_BRAND.foreground};font-weight:600;"`
  const invitationLead =
    safeOrg.length > 0
      ? `<strong ${strong}>${safeInviterName}</strong> from <strong ${strong}>${safeOrg}</strong> has invited you to collaborate in <strong ${strong}>Scout Fuel</strong>.`
      : `<strong ${strong}>${safeInviterName}</strong> has invited you to collaborate in <strong ${strong}>Scout Fuel</strong>.`

  const introParaMarginBottom = safeNote.length > 0 ? "14px" : "24px"
  const noteFragment =
    safeNote.length > 0
      ? `<p style="margin:12px 0 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${EMAIL_BRAND.mutedForeground};text-align:left;">&ldquo;${safeNote.replace(/\r?\n/g, "<br/>")}&rdquo;</p>`
      : ""

  const ctaLinkAttrs = `href="${escapeHtml(joinUrl)}" target="_top" rel="noopener noreferrer"`
  const ctaLinkStyle = `display:inline-block;padding:14px 32px;background:${EMAIL_BRAND.primary};color:${EMAIL_BRAND.primaryForeground};text-decoration:none;border-radius:10px;font-family:${FONT_STACK};font-size:16px;font-weight:600;line-height:1.2;`
  const ctaButtonHtml = `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;"><tr><td style="border-radius:10px;background:${EMAIL_BRAND.primary};">
<a ${ctaLinkAttrs} style="${ctaLinkStyle}">Accept invitation</a>
</td></tr></table>`

  const ctaFallbackHtml = `<p style="margin:24px 0 0;font-family:${FONT_STACK};font-size:12px;line-height:1.55;color:${EMAIL_BRAND.mutedForeground};text-align:center;">If the button doesn&apos;t work, copy this link:<br/><a ${ctaLinkAttrs} style="color:${EMAIL_BRAND.primary};word-break:break-all;">${escapeHtml(joinUrl)}</a></p>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>ScoutFuel invitation</title></head>
<body style="margin:0;padding:0;${EMAIL_APP_SHELL_STYLE_ATTR}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${EMAIL_APP_SHELL_STYLE_ATTR}padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${EMAIL_BRAND.surface};border-radius:16px;overflow:hidden;border:1px solid ${EMAIL_BRAND.border};box-shadow:0 1px 2px rgba(14,27,38,0.04);">
<tr><td style="padding:24px 32px;border-bottom:1px solid ${EMAIL_BRAND.borderSoft};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="left" style="vertical-align:middle;">
<img src="${logoUrl}" alt="ScoutFuel" width="120" height="32" style="display:block;height:auto;max-width:120px;"/>
</td>
<td align="right" style="vertical-align:middle;font-family:${FONT_STACK};font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.mutedForeground};font-weight:600;">
Invitation
</td>
</tr>
</table>
</td></tr>

<tr><td style="padding:36px 32px ${safeNote.length > 0 ? "8px" : "12px"};font-family:${FONT_STACK};">
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${EMAIL_BRAND.foreground};font-weight:700;letter-spacing:-0.01em;">You&apos;re invited to join Scout Fuel</h1>
<p style="margin:0 0 ${introParaMarginBottom};font-size:15px;line-height:1.6;color:${EMAIL_BRAND.mutedForeground};">${invitationLead} Accept the invitation below to set up your account and get started.</p>
${noteFragment}
</td></tr>

<tr><td style="padding:${safeNote.length > 0 ? "24px" : "12px"} 32px 28px;text-align:center;">
${ctaButtonHtml}
${ctaFallbackHtml}
</td></tr>

<tr><td style="padding:4px 32px 32px;font-family:${FONT_STACK};font-size:13px;color:${EMAIL_BRAND.mutedForeground};line-height:1.55;text-align:center;">
Sent to <strong style="color:${EMAIL_BRAND.foreground};font-weight:600;">${safeEmail}</strong> &nbsp;·&nbsp; Role <strong style="color:${EMAIL_BRAND.foreground};font-weight:600;">${safeRole}</strong>
</td></tr>

<tr><td style="padding:0 32px;">
<div style="height:1px;background:${EMAIL_BRAND.borderSoft};"></div>
</td></tr>

<tr><td style="padding:28px 32px 32px;font-family:${FONT_STACK};">
<h2 style="margin:0 0 10px;font-size:14px;font-weight:600;color:${EMAIL_BRAND.foreground};">About ScoutFuel</h2>
<p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.mutedForeground};">ScoutFuel helps fleet operators find the cheapest fuel along their routes and surface savings to drivers in real time.</p>
</td></tr>
</table>

<p style="margin:28px 16px 6px;font-family:${FONT_STACK};font-size:12px;color:${EMAIL_BRAND.mutedForeground};text-align:center;">ScoutFuel · Fleet fuel management</p>
<p style="margin:0 16px 8px;font-family:${FONT_STACK};font-size:11px;color:${EMAIL_BRAND.mutedForeground};text-align:center;line-height:1.55;">You received this because <strong style="color:${EMAIL_BRAND.foreground};font-weight:600;">${safeEmail}</strong> was invited to a ScoutFuel workspace. If you weren&apos;t expecting this, you can safely ignore the email.</p>

</td></tr>
</table>
</body>
</html>`
}
