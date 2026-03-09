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

## Quick test

```bash
# Start your dev server, then:
node .agents/skills/client-summary/scripts/screenshot.js \
  --urls "http://localhost:3000" \
  --output "./test-screenshots"

# Check ./test-screenshots/ for the result
```

## Notion page ID

To find your Notion page ID:
1. Open the target page in Notion
2. Click Share → Copy link
3. The ID is the 32-character string at the end of the URL:
   `https://notion.so/My-Page-**abc123def456...**`

## Scout Fuel — Work Completed Summary

For this project, client summaries can be published as **child pages** under the Work Completed Summary page. Set:

```bash
export NOTION_PARENT_PAGE_ID="31eda057146d8050922dfa356210cb09"
```

Then each summary created with the skill will appear under that page in Notion.
