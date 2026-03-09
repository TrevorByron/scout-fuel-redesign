---
name: client-work-summary
description: >
  Generate a polished, professional client-facing work summary document after completing a development task or feature.
  Use this skill when the user requests a summary (e.g. end of day, "summarize for client", "create a client summary").
  Do NOT run summaries automatically on every commit or push — the user runs the summary when they want it. When writing
  the summary, use git log, recent commits, and pushed changes as primary context for what was built or changed.
  Triggers: "summarize the work", "create a client summary", "document what I built", "write up what we did", "make a
  release note", "capture this for the client", "create a summary of this feature", or any request for screenshots +
  written summary. Output: Notion document (or markdown) with executive summary, value/impact, best practices, and
  embedded screenshots. Screenshots must be saved to public/client-summary-screenshots/ and referenced via the deployed
  app URL so they display in Notion (see skill docs).
---

# Client Work Summary Skill

Produces a professional, visually clear "what we built and why it matters" document — suitable for clients, stakeholders, or personal records. Think of it as a polished release note meets a design rationale.

**When to run:** The user runs the summary when they want it (e.g. end of day). Do **not** run it automatically on every commit or push. When writing the summary, use **git log, recent commits, and pushed changes** as the main source for what was built or changed.

---

## Overview of the output

The finished document includes:

1. **Document order** — **Most recent summary at the top.** When appending to an existing Notion page (e.g. Work Completed Summary), add the new summary at the **top** of the page content so the latest work is seen first; push older summaries down below.
2. **Executive Summary** — plain-language description of what was built/changed
3. **What's New** — bullet breakdown of specific changes or features, with **a small screenshot next to (or inline with) each major feature** when possible (see “Component screenshots” below)
4. **Value & Impact** — why this matters to the end user or business
5. **Best Practices Analysis** — how the work follows industry standards (UX, performance, accessibility, etc.)
6. **Screenshots** — full-page screens plus **component-level screenshots** (zoomed-in on specific UI: org switcher, login form, a card, etc.) so it’s clear what each feature looks like
7. **Next Steps** (optional) — what could come next

---

## Step-by-step workflow

### Step 1 — Gather context

**Use git as the source of truth for what was done.** Run `git log` (e.g. since last summary or last 1–2 days), inspect recent commits and pushed changes, and use that to determine what was built or changed. Then ask or infer only what’s missing.

1. **What was built or changed?** Prefer inferring from git history and conversation; ask only if unclear.
2. **Who is the audience?** Client-facing (polished, non-technical) or internal (can include more technical detail)?
3. **What files or code were touched?** Use git diff / commit messages to list; this informs which screens to capture.
4. **Notion integration?** Does the user have a Notion page to update (e.g. via Notion MCP or API)? If not, output markdown.
5. **Screenshot targets?** Which app routes to capture? Default: main app routes (e.g. `/`, `/login`, `/dashboard`, key feature routes).

Summaries are **not** triggered by commits or pushes — the user runs the summary (e.g. end of day). When they do, use commits and pushes as the main reference for content.

---

### Step 2 — Capture screenshots

Use the screenshot script bundled with this skill. **Always write screenshots to `public/client-summary-screenshots/`** so that when the app is deployed, they are served at `https://DEPLOY_URL/client-summary-screenshots/filename.png` and can be embedded in Notion.

**Full-page screenshots** (key routes):

```bash
# Dev server must be running first (e.g. npm run dev)
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000,http://localhost:3000/login,http://localhost:3000/fleet,..." \
  --output "./public/client-summary-screenshots" \
  --width 1440 \
  --height 900 \
  --delay 2000
```

**Component / feature screenshots** (zoomed-in on a specific UI element) — so each feature in the summary has a small screenshot next to it. Use `--selector` to capture only that element, and `--prefix` so filenames are clear (e.g. `org-switcher_localhost_3000.png`):

```bash
# Example: org switcher (sidebar header) on dashboard
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000" \
  --output "./public/client-summary-screenshots" \
  --selector "[data-sidebar=\"header\"]" \
  --prefix "org-switcher_" \
  --delay 1500

# Example: login form only
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000/login" \
  --output "./public/client-summary-screenshots" \
  --selector "form" \
  --prefix "login-form_" \
  --delay 1500
```

- **Output directory:** Use `--output "./public/client-summary-screenshots"` so the deployed app serves the images. Notion can then display them via URLs (see Step 5).
- **Script note:** The script uses a `sleep(ms)` helper for delays (Puppeteer’s `waitForTimeout` was removed in newer versions). Do not reintroduce `waitForTimeout`.
- **Before/after:** Use `--prefix before_` or `--prefix after_` and run twice if needed.
- **Ordering:** When updating Notion, place the **newest summary at the top** of the page and push older summaries down.

See `scripts/screenshot.js` for full options (auth, mobile viewport, selector, full-page, clip, etc.).

---

### Step 3 — Analyze the work

After gathering context and screenshots, produce an intelligent analysis. For each major change:

- **Describe what changed** in plain language
- **Explain the user-facing benefit** (faster? clearer? more accessible?)
- **Map it to a best practice** (use the reference guide at `references/best-practices.md` for common categories)
- **Note any measurable improvements** if available (load time, click depth, error rate, etc.)

When analyzing best practices, be specific. Don't say "follows UX best practices." Say: "The new login form uses a single-column layout which reduces cognitive load and follows Nielsen's principle of minimalist design."

---

### Step 4 — Write the summary document

Use the template structure below. Adapt tone based on audience:
- **Client-facing**: warm, confident, benefit-focused. Avoid technical jargon.
- **Internal**: can include implementation notes, tradeoffs, technical decisions.

#### Document template

**Ordering:** Put the **most recent summary at the top** of the page. When appending to an existing Notion “Work Completed Summary” page, insert the new summary **above** the previous content so the latest work is first.

```
# [Project Name] — Work Summary
**Date:** [today's date]
**Prepared by:** [developer name, if known]
**For:** [client name, if known]

---

## What We Built
[1–2 paragraph plain-English summary of the work]

---

## What's New
[For each change, pair the description with a small screenshot of that feature when possible.]

- **[Feature 1]** — [Description].  
  ![Feature 1](https://DEPLOY_URL/client-summary-screenshots/feature1_localhost_3000.png)
- **[Feature 2]** — [Description].  
  ![Feature 2](https://DEPLOY_URL/client-summary-screenshots/feature2_localhost_3000_login.png)
- [Change 3 with brief description]

---

## Why It Matters
...

---

## How It Follows Best Practices
...

---

## Screenshots
[Full-page and key routes; use image URLs from the deployed app.]

![Login](https://DEPLOY_URL/client-summary-screenshots/localhost_3000_login.png)
![Dashboard](https://DEPLOY_URL/client-summary-screenshots/localhost_3000.png)

---

## Next Steps (optional)
...
```

**Component screenshots:** When summarizing a specific component (e.g. organization switcher, login form, splash screen), capture a screenshot of **just that element** using the script’s `--selector` (and optional `--prefix`). Embed that image next to the bullet or paragraph that describes the feature so the reader sees exactly what was built.

---

### Step 5 — Publish to Notion

**How screenshots work in Notion:** Notion only displays images that have a **public URL**. It does not upload local files via the API. So:

1. **Save screenshots to** `public/client-summary-screenshots/` (Step 2). After the app is deployed, each image is available at `https://DEPLOY_URL/client-summary-screenshots/filename.png`.
2. **When updating Notion**, use those URLs in image blocks. For example with the Notion MCP `notion-update-page`: add content with Notion-flavored Markdown image syntax: `![Caption](https://DEPLOY_URL/client-summary-screenshots/localhost_3000_login.png)`. Replace `DEPLOY_URL` with the real deployed app URL (e.g. `https://scout-fuel-redesign.vercel.app`).
3. If the app is **not deployed yet**, either (a) add the image URLs anyway so they appear after the next deploy, or (b) tell the user to drag-drop the PNGs from `public/client-summary-screenshots/` into the Notion page.

**Option A — Update an existing page (e.g. Work Completed Summary) via Notion MCP:**  
Fetch the page, then use `notion-update-page` with `update_content` or `replace_content`. **Put the newest summary at the top** of the page content (so the latest work appears first and older summaries move down). Include full-page screenshots and **component-level screenshots** next to each major feature where possible. Use the deployed-app image URLs for all images.

**Option B — Create a new child page via script:**  
Requires `NOTION_API_KEY` and `NOTION_PARENT_PAGE_ID`.

```bash
node .agents/skills/client-summary/scripts/publish-to-notion.js \
  --title "Work Summary — [date]" \
  --markdown "./client-summary-[date].md" \
  --screenshots "./public/client-summary-screenshots" \
  --parent-page-id "$NOTION_PARENT_PAGE_ID"
```

The script creates a new child page and converts markdown to Notion blocks. It does not upload image binaries; it adds callouts with local paths. For inline images on the page, use the MCP and the deployed image URLs as in Option A.

---

## Output checklist

Before delivering the summary, verify:

- [ ] **Newest summary at top** — When appending to an existing page, the latest summary is inserted at the top; older content remains below.
- [ ] **Component screenshots** — Where applicable, a small screenshot of the specific feature (org switcher, login form, etc.) is included next to that feature in the summary.
- [ ] Context taken from git log / recent commits and pushes (not assumed from memory)
- [ ] Summary written in audience-appropriate tone
- [ ] "Why it matters" section focuses on benefits, not implementation
- [ ] At least one best practice per major feature area called out with specifics
- [ ] Screenshots saved to `public/client-summary-screenshots/` and referenced via deployed app URL in Notion (so they display)
- [ ] If Notion: page updated or created; image URLs use `https://DEPLOY_URL/client-summary-screenshots/...`
- [ ] If markdown: file saved to `./client-summary-[date].md`

---

## Tips for great summaries

- Lead with value, not effort. "Users can now reset their password in 30 seconds" is better than "We rewrote the password reset flow."
- Use "you" and "your users" when writing for clients.
- Screenshots should show the final happy path — not error states, unless the error handling IS the feature.
- If the client is non-technical, remove all code references from the final document.
- For internal summaries, a "Technical Notes" section at the bottom is appropriate.

---

## Reference files

- `references/best-practices.md` — Indexed catalog of UX, accessibility, performance, and security best practices to cite
- `scripts/screenshot.js` — Puppeteer-based screenshot capture script
- `scripts/publish-to-notion.js` — Notion API publisher
