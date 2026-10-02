// Ask Meta AI a research question via the Pig's logged-in Chrome tab. Saves full answer to a file.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const prompt = fs.readFileSync(process.argv[2], 'utf8');
  const outFile = process.argv[3];
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto('https://meta.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Fallback ladder, rung 1: ordered locator chain, most semantic first.
  // The winning locator id is printed (LOCATOR <id>) for drift telemetry;
  // meta-pass.sh logs it into runs.jsonl. Rung order is a static table:
  // no improvisation. Deeper rungs (CDP primitives, keyboard walk, visual,
  // network signals) stay designed-unbuilt until this telemetry justifies them.
  //
  // COMPOSER-FIRST (2026-09-13): getByRole('textbox').first() is ambiguous:
  // meta.ai renders a visible "Conversation title" INPUT before the composer
  // in DOM order, so .first() grabs the title field, typing lands there, and
  // innerText() on an INPUT reads '' forever (every chunk "stalls", run ends
  // NOT-DELIVERED). The composer is the only div[contenteditable="true"],
  // so it leads the ladder now; the generic rungs stay as fallback.
  const LOCATORS = [
    ['composer-contenteditable', () => page.locator('div[contenteditable="true"]').first()],
    ['ax-textbox', () => page.getByRole('textbox').first()],
    ['placeholder', () => page.getByPlaceholder(/ask|message|search/i).first()],
    ['css-contenteditable', () => page.$('div[contenteditable="true"]')],
    ['css-textarea', () => page.$('textarea')],
  ];
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(3000);  // settle: 'load' can fire while React is still hydrating
                      // the composer; typing into a pre-hydration node loses
                      // focus mid-stream when the re-render swaps it.
  let input = null, locatorId = 'none';
  const deadline = Date.now() + 20000;  // wait-for-first-locator replaces the fixed 9s sleep
  while (!input && Date.now() < deadline) {
    for (const [id, find] of LOCATORS) {
      try {
        const h = await find();
        if (h && await h.isVisible().catch(() => false)) { input = h; locatorId = id; break; }
      } catch (e) { /* next rung */ }
    }
    if (!input) await sleep(2000);
  }
  if (!input) { console.error('NO-INPUT'); await page.close(); process.exit(2); }
  console.log('LOCATOR ' + locatorId);
  await input.click();
  // Closed loop: assert focus actually landed. Typing into the void for
  // 9 minutes and polling a dead page was a silent-failure mode; now loud.
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return !!(a && (a.getAttribute('contenteditable') === 'true' || /^(TEXTAREA|INPUT)$/.test(a.tagName)));
  }).catch(() => false);
  if (!focused) { console.error('NOT-FOCUSED locator=' + locatorId); await page.close(); process.exit(2); }
  await sleep(500);
  // Type in chunks with per-chunk delivery verification, measured on the
  // input element itself (not activeElement: a re-render can move focus and
  // make activeElement measure the wrong node). If a chunk stalls, re-focus
  // and re-type it once; never type into the void.
  //
  // STALE-HANDLE GUARD (2026-09-13): meta.ai's React composer re-renders
  // mid-typing and the original element handle detaches. Measuring a detached
  // node returns '' forever, which fakes a stall on every chunk and causes
  // duplicate retypes into the live input. Every measurement and every
  // refocus re-resolves the composer through the locator chain, so the
  // closed loop always measures the live node.
  const resolveInput = async () => {
    for (const [id, find] of LOCATORS) {
      try {
        const h = await find();
        if (h && await h.isVisible().catch(() => false)) return h;
      } catch (e) { /* next rung */ }
    }
    return null;
  };
  // DELIVERY MEASUREMENT (2026-09-13): innerText on the composer DIV is
  // layout-dependent and reads partial/zero mid re-render (meta.ai re-renders
  // the composer as you type), which faked a stall on every chunk. The hidden
  // backing TEXTAREA ("Ask Meta AI...") mirrors the composer exactly and its
  // .value is not layout-dependent, so it is the single source of truth for
  // "how much of the prompt actually arrived". Falls back to the DIV's
  // innerText if the textarea ever disappears.
  const inputText = async () => {
    try {
      const v = await page.evaluate(() => {
        const ta = document.querySelector('textarea[placeholder="Ask Meta AI..."]');
        if (ta && typeof ta.value === 'string' && ta.value.length >= 0) return ta.value;
        const div = document.querySelector('div[contenteditable="true"]');
        return div ? (div.innerText || '') : '';
      }).catch(() => '');
      return v || '';
    } catch (e) { return ''; }
  };
  // PASTE DELIVERY (2026-09-13): per-keystroke typing loses characters when
  // meta.ai re-renders the composer mid-chunk, and re-render timing also
  // corrupts innerText measurement (fake stalls, duplicate retypes, mystery
  // wipes). Clipboard paste delivers the whole prompt atomically as a single
  // input event: verified 600/600 chars with textarea and DIV in agreement.
  // grantPermissions is context-level and harmless to repeat.
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://meta.ai' }).catch(() => {});
  let deliveryFailed = false;
  try {
    const el = await resolveInput();
    if (!el) { console.error('NO-INPUT at delivery'); await page.close(); process.exit(2); }
    await el.click();
    await sleep(500);
    await page.evaluate(t => navigator.clipboard.writeText(t), prompt);
    await sleep(300);
    await page.keyboard.press('ControlOrMeta+v');
    await sleep(1500);  // settle: let React render the pasted content and
                        // the backing textarea mirror sync before measuring
  } catch (e) {
    console.error('PASTE-FAILED ' + String(e.message || e).slice(0, 200));
    deliveryFailed = true;
  }
  // Closed loop: assert the prompt actually arrived (>= 90%).
  // If meta.ai ever makes Enter a newline, the prompt would sit unsent and
  // polling would "happily succeed" at waiting; this fails fast instead.
  const typedLen = (await inputText()).length;
  if (deliveryFailed || typedLen < prompt.length * 0.9) {
    console.error('NOT-DELIVERED typed=' + typedLen + ' expected~' + prompt.length + (deliveryFailed ? ' chunk-retries-exhausted' : ''));
    await page.close(); process.exit(2);
  }
  console.log('DELIVERED chars=' + typedLen);
  await sleep(1500);
  await page.keyboard.press('Enter');
  console.log('PROMPT-SENT, waiting for answer...');
  // Wait until the answer stops growing: stable text for 4x15s polls, max ~9 min.
  // FALSE-SUCCESS GUARD (2026-09-13): the completion gate must measure growth
  // BEYOND the echoed prompt, not total text. main.innerText includes the prompt
  // echo (thousands of chars, stable from the start), so a plain length gate
  // fires after 60s even when Meta AI never streamed an answer. A stalled
  // "Compiling research report" preamble adds only ~200 chars; a real research
  // answer adds far more. Growth under the threshold at max polls, or a stable
  // stall, means the answer is missing/incomplete -> exit 3, raw still saved.
  const promptLen = prompt.length;
  const GROWTH_NEEDED = 600;
  let lastLen = 0, stable = 0, answer = '', completed = false;
  for (let i = 0; i < 36; i++) {
    await sleep(15000);
    try {
      answer = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        return main.innerText || '';
      });
    } catch (e) { continue; }
    if (answer.length <= lastLen + 40) { stable++; } else { stable = 0; }
    lastLen = answer.length;
    if (stable >= 4 && (answer.length - promptLen) > GROWTH_NEEDED) { completed = true; break; }
  }
  // The raw capture is always preserved as evidence, even on failure.
  fs.writeFileSync(outFile, answer);
  if (!completed) {
    console.error('ANSWER_INCOMPLETE chars=' + answer.length + ' growth=' + (answer.length - promptLen));
    await page.close();
    process.exit(3);
  }
  console.log('SAVED chars=' + answer.length);
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
