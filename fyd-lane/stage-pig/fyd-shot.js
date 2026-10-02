/**
 * FYD H0-1 proof screenshots. Usage:
 *   node /tmp/fyd-shot.js <site-slug> <output-png>
 * e.g. node /tmp/fyd-shot.js happy-place /tmp/after-hp.png
 * Runs headless Chromium against the local dev server (port 3100).
 */
const { chromium } = require("playwright");

(async () => {
  const slug = process.argv[2];
  const out = process.argv[3];
  if (!slug || !out) {
    console.error("usage: node fyd-shot.js <site-slug> <output-png>");
    process.exit(2);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await page.goto(`http://localhost:3100/sites/${slug}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    // Let any client-side hydration settle, then shoot the viewport.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out, fullPage: false });
    console.log("shot", out);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("SHOT-FAILED", e.message);
  process.exit(1);
});
