# Client Work Summary Skill — Setup

## Installation

This skill lives in the project at:

```
.agents/skills/client-summary/
├── SKILL.md
├── scripts/
│   ├── screenshot.js
│   └── publish-to-notion.js
└── references/
    └── best-practices.md
```

## Dependencies

### For screenshots (required)

Puppeteer is listed as a project devDependency. If needed:

```bash
npm install puppeteer
```

Puppeteer downloads Chromium automatically. If you're on a headless server, you may also need:

```bash
# Ubuntu/Debian
sudo apt-get install -y libgbm-dev libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgtk-3-0

# macOS — no extra steps needed
```

### For Notion publishing (optional)

No extra npm packages needed — uses Node's built-in `https` module.

**Get a Notion API key:**
1. Go to https://www.notion.so/my-integrations
2. Create a new integration with "Insert content" capability
3. Copy the API key
4. Share your target Notion page with the integration

**Set the key in your environment:**

```bash
# Add to your .env or shell profile
export NOTION_API_KEY="secret_xxxxxxxxxxxx"
```

## Screenshots and Notion

**Where to save screenshots:** Always use `--output "./public/client-summary-screenshots"`. That way:

- The Next.js app serves them at `/client-summary-screenshots/` when running locally and when deployed.
- After deploy, each image has a public URL: `https://YOUR_DEPLOY_URL/client-summary-screenshots/filename.png`.
- Notion can display images only from public URLs. When updating a Notion page (e.g. via Notion MCP), use those URLs in image blocks so the screenshots show inline. If the app isn’t deployed yet, the links will work after the next deploy.

**Script note:** The screenshot script uses `sleep(ms)` for delays (Puppeteer’s `waitForTimeout` is deprecated). Don’t change it back to `waitForTimeout`.

## Quick test

```bash
# Start your dev server, then:
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000" \
  --output "./public/client-summary-screenshots"

# Check public/client-summary-screenshots/ for the result
```

## Notion page ID

To find your Notion page ID:
1. Open the target page in Notion
2. Click Share → Copy link
3. The ID is the 32-character string at the end of the URL:
   `https://notion.so/My-Page-**abc123def456...**`

## Scout Fuel — Work Completed Summary

For this project, the **Work Completed Summary** Notion page can be updated directly (e.g. via Notion MCP). Page ID:

```bash
NOTION_PARENT_PAGE_ID="31eda057146d8050922dfa356210cb09"
```

When appending a summary and screenshots to that page, use the **deployed app URL** for images (e.g. `https://scout-fuel-redesign.vercel.app/client-summary-screenshots/...`) so the screenshots display in Notion.

**Document order:** Put the **most recent summary at the top** of the page so the latest work is seen first; older summaries stay below.

**Component screenshots:** For each major feature (e.g. org switcher, login form), capture a small screenshot of just that component using the script’s `--selector` and `--prefix` (see SKILL.md Step 2). Embed those images next to the corresponding feature in the summary so the document shows exactly what was built.
