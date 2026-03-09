---
name: client-work-summary
description: >
  Generate a polished, professional client-facing work summary document after completing a development task or feature.
  Use this skill whenever the user has finished building, redesigning, or shipping something and wants to document it —
  whether for a client report, a personal record, or a project handoff. Triggers include phrases like "summarize the work",
  "create a client summary", "document what I built", "write up what we did", "make a release note", "capture this for
  the client", "create a summary of this feature", or any request to communicate completed work in a clear, professional
  format. Always use this skill when the user wants screenshots included alongside a written summary.
  The output is a Notion document (or markdown fallback) with: an executive summary, a value/impact section that explains
  WHY the work matters, a best practices analysis, and embedded screenshots of the finished work.
---

# Client Work Summary Skill

Produces a professional, visually clear "what we built and why it matters" document — suitable for clients, stakeholders, or personal records. Think of it as a polished release note meets a design rationale.

---

## Overview of the output

The finished document includes:

1. **Executive Summary** — plain-language description of what was built/changed
2. **What's New** — bullet breakdown of specific changes or features
3. **Value & Impact** — why this matters to the end user or business
4. **Best Practices Analysis** — how the work follows industry standards (UX, performance, accessibility, etc.)
5. **Screenshots** — visual proof of the finished work, with captions
6. **Next Steps** (optional) — what could come next

---

## Step-by-step workflow

### Step 1 — Gather context

Ask the user (or infer from conversation) the following. Do NOT proceed until you have answers to 1–3.

1. **What was built or changed?** (e.g., "redesigned the login flow", "added a dashboard", "fixed the checkout bug")
2. **Who is the audience?** Client-facing (polished, non-technical) or internal (can include more technical detail)?
3. **What files or code were touched?** (so you can generate intelligent screenshots)
4. **Notion integration?** Do they have a Notion API key + target page ID? (If not, output markdown instead.)
5. **Screenshot targets?** Which URLs or local dev server paths should be captured?

If the user just says "summarize what we did" after a coding session, scan the recent conversation for context clues about what was built before asking.

---

### Step 2 — Capture screenshots

Use the screenshot script bundled with this skill.

```bash
# Install dependencies (first time only)
node -e "require('puppeteer')" 2>/dev/null || npm install puppeteer --save-dev

# Run the screenshot script
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000/login,http://localhost:3000/dashboard" \
  --output "./client-summary-screenshots" \
  --width 1440 \
  --height 900
```

**Important:** The dev server must be running before capturing. Remind the user to start it if needed.

If the user's project uses a different port, adjust `--urls` accordingly.

For capturing **before/after**: take screenshots before applying changes and save them separately, then capture again after. Use `--prefix before_` and `--prefix after_` flags.

See `scripts/screenshot.js` for full options including: auth flows, mobile viewports, full-page vs viewport-only, and element-specific cropping.

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
- [Change 1 with brief description]
- [Change 2 with brief description]
- [Change 3 with brief description]

---

## Why It Matters
[2–3 paragraphs explaining value to the end user and/or business.
Focus on outcomes, not implementation. E.g. "Users can now complete
login in under 10 seconds with fewer errors, reducing support tickets
and improving conversion."]

---

## How It Follows Best Practices
[One paragraph per major practice area that applies. See references/best-practices.md]

### Accessibility
...

### Performance
...

### UX / Usability
...

### Security (if relevant)
...

---

## Screenshots
[Embed each screenshot with a descriptive caption]

![Login screen — new design](./screenshots/login_after.png)
*The redesigned login screen uses clear visual hierarchy and prominent CTAs.*

---

## Next Steps (optional)
- [Suggested follow-on work]
- [Known limitations or future improvements]
```

---

### Step 5 — Publish to Notion (optional)

If the user has Notion credentials, use the Notion API to create the document.

**Requirements:**
- `NOTION_API_KEY` environment variable set
- `NOTION_PARENT_PAGE_ID` — the page under which the summary will be created

```bash
node .agents/skills/client-summary/scripts/publish-to-notion.js \
  --title "Login Redesign — Client Summary" \
  --markdown "./client-summary.md" \
  --screenshots "./client-summary-screenshots" \
  --parent-page-id "$NOTION_PARENT_PAGE_ID"
```

The script will:
1. Create a new child page under the parent
2. Convert the markdown to Notion blocks
3. Upload screenshots as image blocks via Notion's file API
4. Return the URL of the new page

If Notion credentials are missing, output a clean `.md` file instead and let the user know they can paste it into Notion manually or enable the integration.

---

## Output checklist

Before delivering the summary, verify:

- [ ] Summary written in audience-appropriate tone
- [ ] "Why it matters" section focuses on benefits, not implementation
- [ ] At least one best practice per major feature area called out with specifics
- [ ] Screenshots captured and referenced correctly
- [ ] If Notion: page created and URL returned to user
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
