#!/usr/bin/env node
/**
 * screenshot.js — Capture screenshots for client work summaries
 *
 * Usage:
 *   node screenshot.js --urls "http://localhost:3000/login" --output "./screenshots"
 *
 * Full options:
 *   --urls        Comma-separated list of URLs to capture (required)
 *   --output      Output directory for screenshots (default: ./client-screenshots)
 *   --width       Viewport width in pixels (default: 1440)
 *   --height      Viewport height in pixels (default: 900)
 *   --mobile      Capture at mobile size (375x812, overrides width/height)
 *   --fullpage    Capture full scrollable page, not just viewport (default: true)
 *   --prefix      Filename prefix, e.g. "before_" or "after_" (default: "")
 *   --delay       Milliseconds to wait after page load before screenshotting (default: 1000)
 *   --selector    CSS selector — screenshot only that element (optional)
 *   --auth-url    URL to visit for auth before capturing (optional)
 *   --auth-user   Username/email for auth form (optional)
 *   --auth-pass   Password for auth form (optional)
 *   --cookies     Path to a JSON file with cookies to inject (optional)
 *   --dark        Enable dark mode (prefers-color-scheme: dark)
 *   --clip-x      X offset for manual crop (optional)
 *   --clip-y      Y offset for manual crop (optional)
 *   --clip-w      Width for manual crop (optional)
 *   --clip-h      Height for manual crop (optional)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ─── Argument parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name, defaultValue = null) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] ?? true;
}

const urlsRaw   = getArg('urls');
const outputDir = getArg('output', './client-screenshots');
const width     = parseInt(getArg('width', '1440'), 10);
const height    = parseInt(getArg('height', '900'), 10);
const isMobile  = args.includes('--mobile');
const fullPage  = !args.includes('--no-fullpage');
const prefix    = getArg('prefix', '');
const delay     = parseInt(getArg('delay', '1200'), 10);
const selector  = getArg('selector', null);
const authUrl   = getArg('auth-url', null);
const authUser  = getArg('auth-user', null);
const authPass  = getArg('auth-pass', null);
const cookiesPath = getArg('cookies', null);
const darkMode  = args.includes('--dark');
const clipX     = getArg('clip-x', null);
const clipY     = getArg('clip-y', null);
const clipW     = getArg('clip-w', null);
const clipH     = getArg('clip-h', null);

if (!urlsRaw) {
  console.error('❌  --urls is required. Example: --urls "http://localhost:3000/login"');
  process.exit(1);
}

const urls = urlsRaw.split(',').map(u => u.trim()).filter(Boolean);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(url) {
  return url
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  ensureDir(outputDir);

  console.log(`\n📸  Starting screenshot capture`);
  console.log(`    URLs:    ${urls.length}`);
  console.log(`    Output:  ${path.resolve(outputDir)}`);
  console.log(`    Size:    ${isMobile ? '375×812 (mobile)' : `${width}×${height}`}`);
  console.log(`    Mode:    ${darkMode ? 'dark' : 'light'}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();

  // Viewport
  const viewportConfig = isMobile
    ? { width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 }
    : { width, height, deviceScaleFactor: 1 };
  await page.setViewport(viewportConfig);

  // Dark mode
  if (darkMode) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  }

  // Inject cookies from file
  if (cookiesPath) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
    await page.setCookie(...cookies);
    console.log(`🍪  Injected ${cookies.length} cookies`);
  }

  // Auth flow
  if (authUrl && authUser && authPass) {
    console.log(`🔐  Running auth flow at ${authUrl}`);
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);

    // Try common selectors for email/username and password
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[name="username"]', '#email', '#username'];
    const passSelectors  = ['input[type="password"]', 'input[name="password"]', '#password'];

    for (const sel of emailSelectors) {
      if (await page.$(sel)) { await page.type(sel, authUser, { delay: 40 }); break; }
    }
    for (const sel of passSelectors) {
      if (await page.$(sel)) { await page.type(sel, authPass, { delay: 40 }); break; }
    }

    // Submit
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:contains("Sign in")', 'button:contains("Log in")'];
    for (const sel of submitSelectors) {
      if (await page.$(sel)) { await page.click(sel); break; }
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    console.log(`    ✅ Auth complete\n`);
  }

  // Capture each URL
  const results = [];

  for (const url of urls) {
    const slug = slugify(url);
    const filename = `${prefix}${slug}.png`;
    const filepath = path.join(outputDir, filename);

    console.log(`  → ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(delay);

      let screenshotOptions = { path: filepath };

      if (selector) {
        // Screenshot a specific element
        const el = await page.$(selector);
        if (el) {
          await el.screenshot({ path: filepath });
          console.log(`     📦  Element "${selector}" captured`);
        } else {
          console.warn(`     ⚠️  Selector "${selector}" not found, falling back to full page`);
          screenshotOptions.fullPage = fullPage;
          await page.screenshot(screenshotOptions);
        }
      } else if (clipX !== null && clipW !== null) {
        // Manual clip region
        screenshotOptions.clip = {
          x: parseInt(clipX, 10),
          y: parseInt(clipY ?? '0', 10),
          width: parseInt(clipW, 10),
          height: parseInt(clipH ?? height, 10),
        };
        await page.screenshot(screenshotOptions);
        console.log(`     ✂️  Clipped region captured`);
      } else {
        screenshotOptions.fullPage = fullPage;
        await page.screenshot(screenshotOptions);
        console.log(`     ✅  ${filename}`);
      }

      results.push({ url, filename, filepath, status: 'ok' });
    } catch (err) {
      console.error(`     ❌  Failed: ${err.message}`);
      results.push({ url, filename, filepath, status: 'error', error: err.message });
    }
  }

  await browser.close();

  // Write manifest
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));

  const ok    = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'error').length;

  console.log(`\n✨  Done — ${ok} captured, ${failed} failed`);
  console.log(`📁  Saved to: ${path.resolve(outputDir)}`);
  console.log(`📋  Manifest: ${manifestPath}\n`);

  return results;
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
