const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224', { timeout: 15000 });
  await browser.close();
  console.log('CHROME_CLOSED');
})().catch(e => { console.error('CLOSE_FAIL', e.message); process.exit(1); });
