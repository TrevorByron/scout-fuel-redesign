#!/usr/bin/env node
/**
 * publish-to-notion.js — Publish a client work summary to Notion
 *
 * Usage:
 *   node publish-to-notion.js \
 *     --title "Login Redesign — Client Summary" \
 *     --markdown "./client-summary.md" \
 *     --screenshots "./client-screenshots" \
 *     --parent-page-id "YOUR_PAGE_ID"
 *
 * Environment variables required:
 *   NOTION_API_KEY          Your Notion integration token
 *
 * Options:
 *   --title             Title for the new Notion page (required)
 *   --markdown          Path to the markdown file to publish (required)
 *   --screenshots       Directory containing screenshots to embed (optional)
 *   --parent-page-id    Notion page ID to create the summary under (required)
 *   --icon              Emoji to use as page icon (default: 📋)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name, def = null) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : def;
}

const title        = getArg('title');
const markdownPath = getArg('markdown');
const screenshotsDir = getArg('screenshots');
const parentPageId = getArg('parent-page-id');
const icon         = getArg('icon', '📋');
const apiKey       = process.env.NOTION_API_KEY;

if (!apiKey)       { console.error('❌  NOTION_API_KEY environment variable not set'); process.exit(1); }
if (!title)        { console.error('❌  --title is required'); process.exit(1); }
if (!markdownPath) { console.error('❌  --markdown is required'); process.exit(1); }
if (!parentPageId) { console.error('❌  --parent-page-id is required'); process.exit(1); }

// ─── Notion API helper ────────────────────────────────────────────────────────

async function notionRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json.object === 'error') reject(new Error(`Notion API: ${json.message}`));
          else resolve(json);
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Markdown → Notion blocks ─────────────────────────────────────────────────

function textToRichText(text) {
  // Handle bold (**text**) and inline code (`code`)
  const parts = [];
  const regex = /(\*\*(.*?)\*\*|`(.*?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: { content: text.slice(lastIndex, match.index) } });
    }
    if (match[2] !== undefined) {
      parts.push({ type: 'text', text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[3] !== undefined) {
      parts.push({ type: 'text', text: { content: match[3] }, annotations: { code: true } });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: { content: text.slice(lastIndex) } });
  }

  return parts.length ? parts : [{ type: 'text', text: { content: text } }];
}

function markdownToBlocks(md) {
  const lines  = md.split('\n');
  const blocks = [];
  let inCode   = false;
  let codeLang = '';
  let codeLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fences
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            language: codeLang || 'plain text',
            rich_text: [{ type: 'text', text: { content: codeLines.join('\n') } }],
          },
        });
        inCode = false;
        codeLines = [];
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: textToRichText(line.slice(4)) } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: textToRichText(line.slice(3)) } });
    } else if (line.startsWith('# ')) {
      // Skip — used as the page title
    }
    // Divider
    else if (line.match(/^---+$/)) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    }
    // Bullet list
    else if (line.match(/^[-*] /)) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: textToRichText(line.slice(2)) },
      });
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: textToRichText(line.replace(/^\d+\. /, '')) },
      });
    }
    // Checkbox
    else if (line.match(/^- \[[ x]\] /)) {
      const checked = line.includes('[x]');
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: { rich_text: textToRichText(line.replace(/^- \[[ x]\] /, '')), checked },
      });
    }
    // Image markdown: ![alt](path)
    else if (line.match(/^!\[.*?\]\(.*?\)/)) {
      const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
      if (match) {
        blocks.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: { url: match[2] },
            caption: match[1] ? [{ type: 'text', text: { content: match[1] } }] : [],
          },
        });
      }
    }
    // Italic caption lines (lines starting with *)
    else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line.slice(1, -1) }, annotations: { italic: true, color: 'gray' } }],
        },
      });
    }
    // Regular paragraph (skip empty lines)
    else if (line.trim()) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: textToRichText(line) },
      });
    }
  }

  return blocks;
}

// ─── Screenshot blocks ────────────────────────────────────────────────────────

function buildScreenshotBlocks(screenshotsDir) {
  if (!screenshotsDir || !fs.existsSync(screenshotsDir)) return [];

  const images = fs.readdirSync(screenshotsDir)
    .filter(f => f.match(/\.(png|jpg|jpeg|gif|webp)$/i))
    .sort();

  if (images.length === 0) return [];

  const blocks = [
    { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📸 Screenshots' } }] } },
  ];

  // Note: Notion API doesn't support binary upload directly — we use callout with file path info
  for (const img of images) {
    const name = img.replace(/[_-]/g, ' ').replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🖼️' },
        rich_text: [
          { type: 'text', text: { content: `${name} — ` } },
          { type: 'text', text: { content: path.join(screenshotsDir, img) }, annotations: { code: true } },
        ],
        color: 'gray_background',
      },
    });
  }

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: 'ℹ️' },
      rich_text: [{
        type: 'text',
        text: { content: 'Screenshots saved locally. To embed them, upload each file to Notion and replace these callouts with image blocks.' },
      }],
      color: 'blue_background',
    },
  });

  return blocks;
}

// ─── Chunk blocks (Notion limit: 100 per request) ────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n📤  Publishing to Notion`);
  console.log(`    Title:   ${title}`);
  console.log(`    Parent:  ${parentPageId}\n`);

  const markdown = fs.readFileSync(markdownPath, 'utf-8');
  const contentBlocks   = markdownToBlocks(markdown);
  const screenshotBlocks = buildScreenshotBlocks(screenshotsDir);
  const allBlocks = [...contentBlocks, ...screenshotBlocks];

  // Create page with first batch of blocks
  const firstChunk = allBlocks.slice(0, 100);
  const page = await notionRequest('POST', 'pages', {
    parent: { type: 'page_id', page_id: parentPageId },
    icon:   { type: 'emoji', emoji: icon },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: firstChunk,
  });

  console.log(`✅  Page created: ${page.url}`);

  // Append remaining blocks in chunks
  const remaining = allBlocks.slice(100);
  const chunks    = chunkArray(remaining, 100);

  for (const chunk of chunks) {
    await notionRequest('PATCH', `blocks/${page.id}/children`, { children: chunk });
    await new Promise(r => setTimeout(r, 300)); // rate limit padding
  }

  console.log(`\n🎉  Published successfully!`);
  console.log(`🔗  ${page.url}\n`);

  return page.url;
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
