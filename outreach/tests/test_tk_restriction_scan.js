#!/usr/bin/env node
// test_tk_restriction_scan.js -- node regression tests for tk-engage.js.
// Runs the driver's pure functions against stub DOM documents and synthetic
// like-probe evidence. Exit 0 all pass, exit 1 any failure.
//
// Regression case 1 (the 2026-09-15 incident): a video caption containing
// "you need to slow down and guide it" inside the article MUST NOT trip
// restriction detection. Regression case 2: a real platform feedback surface
// outside the article ("You're liking too fast" toast) MUST trip it, and the
// matched phrase must be recorded.
const assert = require('assert');
const { scanRestrictionChrome, classifyLikeAttempt } = require('/home/hatch/workspace/pig-fb/tk-engage.js');

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok   ${name}`);
  else { console.log(`FAIL ${name}${extra ? ' ' + extra : ''}`); failures++; }
}

// ---------- stub document ----------
function makeDoc(children, articleEl) {
  return {
    querySelector: sel => (sel === 'article' ? articleEl : null),
    body: { children },
  };
}
function el(text, kids) {
  kids = kids || [];
  return {
    innerText: text,
    children: kids,
    contains(x) { return kids.includes(x) || kids.some(k => k.contains(x)); },
  };
}

function runScan(children, articleEl) {
  global.document = makeDoc(children, articleEl);
  return scanRestrictionChrome();
}

// 1. caption false positive: BAD phrase inside the article is ignored
{
  const caption = el('you need to slow down and guide it. The AI answers better when you steer.');
  const articleEl = el('', [caption]);
  const nav = el('For You\nFollowing\nUpload');
  const r = runScan([nav, articleEl], articleEl);
  check('caption-slowdown-no-match', r.matched === false, JSON.stringify(r.hits));
}

// 2. caption with several BAD phrases inside article: still ignored
{
  const caption = el('something went wrong? try again later. slow down. captcha brain.');
  const articleEl = el('', [caption]);
  const r = runScan([articleEl], articleEl);
  check('caption-multi-phrase-no-match', r.matched === false, JSON.stringify(r.hits));
}

// 3. real restriction: toast outside the article matches, phrase recorded
{
  const articleEl = el('', [el('funny cat video caption')]);
  const toast = el("You're liking too fast. Try again later.");
  const r = runScan([articleEl, toast], articleEl);
  check('toast-matches', r.matched === true);
  check('toast-phrase-recorded', r.hits.some(h => h.phrase === "you're liking too fast"),
    JSON.stringify(r.hits));
  check('toast-snippet-recorded', r.hits.every(h => h.snippet && h.snippet.length > 0));
}

// 4. real restriction: dialog with "action blocked" matches
{
  const articleEl = el('', [el('caption text')]);
  const dialog = el('Action blocked. Your account has been flagged.');
  const r = runScan([articleEl, dialog], articleEl);
  check('dialog-matches', r.matched === true);
  check('dialog-phrase', r.hits.some(h => h.phrase === 'action blocked'));
}

// 5. clean page: no false positive from ordinary chrome text
{
  const articleEl = el('', [el('a normal tech video caption')]);
  const nav = el('For You Following LIVE Upload Inbox');
  const r = runScan([nav, articleEl], articleEl);
  check('clean-page-no-match', r.matched === false, JSON.stringify(r.hits));
}

// ---------- classifyLikeAttempt matrix ----------
// 6. already liked
{
  const c = classifyLikeAttempt({ stage: 'already', pressed_before: 'true' });
  check('classify-already', c.ok === true && c.fail_class === 'ALREADY_LIKED');
}

// 7. selector absent from DOM
{
  const c = classifyLikeAttempt({ stage: 'not_found', icons_total: 0, icons_hidden: 0 });
  check('classify-absent', c.ok === false && c.fail_class === 'SELECTOR_NOT_FOUND_ABSENT');
}

// 8. selector present but hidden (degraded UI, distinct from layout change)
{
  const c = classifyLikeAttempt({ stage: 'not_found', icons_total: 3, icons_hidden: 3 });
  check('classify-hidden', c.ok === false && c.fail_class === 'SELECTOR_NOT_FOUND_HIDDEN'
    && /degraded UI/.test(c.note));
}

// 9. flipped fast -> LIKE_APPLIED
{
  const c = classifyLikeAttempt({
    stage: 'clicked', pressed_before: 'false',
    polls: [{ at_ms: 2000, present: true, pressed: 'true' }],
    restriction_scan: { matched: false, hits: [] }, like_count_changed: true,
  });
  check('classify-applied', c.ok === true && c.fail_class === 'LIKE_APPLIED');
}

// 10. flipped late -> LIKE_APPLIED_LATE (distinguishes delayed propagation)
{
  const c = classifyLikeAttempt({
    stage: 'clicked', pressed_before: 'false',
    polls: [{ at_ms: 2000, present: true, pressed: 'false' }, { at_ms: 5000, present: true, pressed: 'true' }],
    restriction_scan: { matched: false, hits: [] }, like_count_changed: false,
  });
  check('classify-late', c.ok === true && c.fail_class === 'LIKE_APPLIED_LATE' && /delayed/.test(c.note));
}

// 11. restriction surface matched -> RESTRICTED (platform signal, not throttle folklore)
{
  const c = classifyLikeAttempt({
    stage: 'clicked', pressed_before: 'false',
    polls: [{ at_ms: 2000, present: true, pressed: 'false' }],
    restriction_scan: { matched: true, hits: [{ phrase: "you're liking too fast", snippet: '...' }] },
    like_count_changed: false,
  });
  check('classify-restricted', c.ok === false && c.fail_class === 'NO_STATE_CHANGE_RESTRICTED'
    && /platform restriction signal/.test(c.note));
}

// 12. control remounted after click -> rerender race, distinct from throttle
{
  const c = classifyLikeAttempt({
    stage: 'clicked', pressed_before: 'false',
    polls: [{ at_ms: 2000, present: false, remounted_candidate: true, pressed: null }],
    restriction_scan: { matched: false, hits: [] }, like_count_changed: false,
  });
  check('classify-remount', c.ok === false && c.fail_class === 'NO_STATE_CHANGE_REMOUNT');
}

// 13. plain no-state-change: stable control, no signal -> UNKNOWN (not "throttle")
{
  const c = classifyLikeAttempt({
    stage: 'clicked', pressed_before: 'false',
    polls: [
      { at_ms: 2000, present: true, pressed: 'false' },
      { at_ms: 5000, present: true, pressed: 'false' },
      { at_ms: 10000, present: true, pressed: 'false' },
    ],
    restriction_scan: { matched: false, hits: [] }, like_count_changed: false,
  });
  check('classify-unknown', c.ok === false && c.fail_class === 'NO_STATE_CHANGE_UNKNOWN'
    && /cause unknown/.test(c.note) && !/throttl/i.test(c.note));
}

// 14. missing evidence object -> fail closed, explicit
{
  const c = classifyLikeAttempt(null);
  check('classify-missing', c.ok === false && c.fail_class === 'EVIDENCE_MISSING');
}

if (failures) { console.log(`\n${failures} FAILURES`); process.exit(1); }
console.log('\nall pass');
