// ig-observation.test.js -- regression invariant for the P0 false-negative repair.
// Rule under test: a missing /p/ or /reel/ anchor must not by itself create a
// durable business rejection. Weak observation -> candidate stays recoverable,
// no permanent skip entry. A truly empty account classifies as empty only
// after sufficient evidence (CLI-confirmed 0 posts or account gone).
// Run: node ig-observation.test.js   (exit 0 = all pass)
'use strict';
const assert = require('assert');
const discover = require('./ig-observation.js');
const { decide, skipEligible, DISPOSITION } = require('./ig-disposition.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (e) { console.error('FAIL ' + name + ' :: ' + e.message); process.exitCode = 1; }
}

// 1. The DOM gate "no post link found" maps to FOLLOWUP_REQUIRED, never an exclusion.
check('no-post-link maps to FOLLOWUP_REQUIRED', () => {
  assert.strictEqual(discover.reasonToStatus('no post link found'), discover.OBS_STATUS.FOLLOWUP_REQUIRED);
});

check('no-post-link near-miss is not skip-eligible without follow-up', () => {
  const nm = discover.nearMiss('somebiz', 'no post link found', discover.reasonToStatus('no post link found'));
  const d = decide(nm, null); // follow-up could not run
  assert.strictEqual(d.disposition, DISPOSITION.STILL_UNKNOWN);
  assert.strictEqual(skipEligible(d), false);
});

// 2. Weak observation + positive CLI evidence -> recovered candidate, no skip.
check('verified business with fresh posts recovers as candidate', () => {
  const nm = discover.nearMiss('scenicstudiosalons', 'no post link found', discover.OBS_STATUS.FOLLOWUP_REQUIRED);
  const d = decide(nm, {
    profile: { name: 'Luxury Studio Salons', bio: 'Move-In Ready Luxury Studios in Grand Junction, CO',
               account_type: 'creator', country: 'US', post_count: 31, is_private: false },
    newestPost: { url: 'https://www.instagram.com/p/Ddg9J4Jxgow/', created_at: new Date().toISOString() },
    postsFailed: false,
  });
  assert.strictEqual(d.disposition, DISPOSITION.RECOVERED_CANDIDATE);
  assert.strictEqual(skipEligible(d), false);
  assert.ok(d.evidence.newest_post_url.includes('/p/'));
});

// 3. CLI failure on a FOLLOWUP_REQUIRED near-miss -> STILL_UNKNOWN, never skip.
check('CLI failure keeps candidate recoverable', () => {
  const nm = discover.nearMiss('somebiz', 'no post link found', discover.OBS_STATUS.FOLLOWUP_REQUIRED);
  const d = decide(nm, { failed: true, error: 'timeout' });
  assert.strictEqual(d.disposition, DISPOSITION.STILL_UNKNOWN);
  assert.strictEqual(skipEligible(d), false);
});

// 4. Profile/posts API disagreement (metadata says posts, API returns none) -> UNKNOWN.
check('posts API disagreement is not evidence of emptiness', () => {
  const nm = discover.nearMiss('blackrifleslc', 'no post link found', discover.OBS_STATUS.FOLLOWUP_REQUIRED);
  const d = decide(nm, {
    profile: { name: 'x', bio: 'x', account_type: 'personal', country: 'US', post_count: 24, is_private: false },
    newestPost: null, postsFailed: false,
  });
  assert.strictEqual(d.disposition, DISPOSITION.STILL_UNKNOWN);
  assert.strictEqual(skipEligible(d), false);
});

// 5. Truly empty: CLI-confirmed post_count 0 -> CONFIRMED_EMPTY, skip-eligible.
check('CLI-confirmed zero posts classifies as empty', () => {
  const nm = discover.nearMiss('deadacct', 'no posts', discover.OBS_STATUS.OBSERVED_EMPTY);
  const d = decide(nm, {
    profile: { name: 'x', bio: '', account_type: 'personal', country: 'US', post_count: 0, is_private: false },
    newestPost: null, postsFailed: false,
  });
  assert.strictEqual(d.disposition, DISPOSITION.CONFIRMED_EMPTY);
  assert.strictEqual(skipEligible(d), true);
});

// 6. Truly empty: account gone via follow-up -> CONFIRMED_EMPTY.
check('account not found via follow-up classifies as empty', () => {
  const nm = discover.nearMiss('goneacct', 'no post link found', discover.OBS_STATUS.FOLLOWUP_REQUIRED);
  const d = decide(nm, { profile: null, profileNotFound: true, newestPost: null, postsFailed: false });
  assert.strictEqual(d.disposition, DISPOSITION.CONFIRMED_EMPTY);
  assert.strictEqual(skipEligible(d), true);
});

// 7. DOM 0-post observation contradicted by CLI -> not empty, not skipped.
check('DOM 0-post contradicted by CLI stays unknown', () => {
  const nm = discover.nearMiss('weirdacct', 'no posts', discover.OBS_STATUS.OBSERVED_EMPTY);
  const d = decide(nm, {
    profile: { name: 'x', bio: '', account_type: 'business', country: 'US', post_count: 14, is_private: false },
    newestPost: { url: 'https://www.instagram.com/p/abc/', created_at: new Date().toISOString() },
    postsFailed: false,
  });
  assert.strictEqual(d.disposition, DISPOSITION.STILL_UNKNOWN);
  assert.strictEqual(skipEligible(d), false);
});

// 8. Affirmative exclusions keep their skip eligibility, with reason recorded.
for (const r of ['private', 'franchise', 'non-business category', 'location not Western CO', 'stale feed', 'promo/hiring post']) {
  check('observed exclusion stays skip-eligible: ' + r, () => {
    const nm = discover.nearMiss('x', r, discover.reasonToStatus(r === 'stale feed' ? 'stale feed' : r));
    const d = decide(nm, null);
    assert.strictEqual(d.disposition, DISPOSITION.CONFIRMED_EXCLUDE);
    assert.strictEqual(skipEligible(d), true);
  });
}

// 9. Wrong-country confirmation via follow-up -> excluded, not unknown.
check('wrong country via follow-up confirms exclusion', () => {
  const nm = discover.nearMiss('cliftonpizza', 'no post link found', discover.OBS_STATUS.FOLLOWUP_REQUIRED);
  const d = decide(nm, {
    profile: { name: 'Boston Pizza', bio: '', account_type: 'business', country: 'CA', post_count: 719, is_private: false },
    newestPost: { url: 'https://www.instagram.com/p/xyz/', created_at: new Date().toISOString() },
    postsFailed: false,
  });
  assert.strictEqual(d.disposition, DISPOSITION.CONFIRMED_EXCLUDE);
  assert.strictEqual(skipEligible(d), true);
});

// 10. DEPENDENCY_FAILURE never produces a skip entry.
check('dependency failure never skip-eligible', () => {
  const nm = discover.nearMiss('x', 'restriction_pattern', discover.OBS_STATUS.DEPENDENCY_FAILURE);
  const d = decide(nm, null);
  assert.strictEqual(d.disposition, DISPOSITION.STILL_UNKNOWN);
  assert.strictEqual(skipEligible(d), false);
});

console.log(`\n${passed} checks passed`);

// ---------- Positive controls + bounds (Nolan 2026-09-24) ----------
const { gateDisposition } = require('./ig-disposition.js');
const { shouldDefer } = require('./ig-nearmiss-followup.js');

// 17. Controls failed: GENUINE_EMPTY is downgraded, never durable.
let g = gateDisposition(DISPOSITION.CONFIRMED_EMPTY, false, 'CLI post_count 0');
check('controls failed downgrades CONFIRMED_EMPTY to STILL_UNKNOWN', () => g.disposition === DISPOSITION.STILL_UNKNOWN && !skipEligible(g));

// 18. Controls passed: a true empty remains durable.
g = gateDisposition(DISPOSITION.CONFIRMED_EMPTY, true, 'CLI post_count 0');
check('controls passed keeps CONFIRMED_EMPTY durable', () => g.disposition === DISPOSITION.CONFIRMED_EMPTY && skipEligible(g));

// 19. Controls failed: exclusions and recoveries are unaffected.
g = gateDisposition(DISPOSITION.CONFIRMED_EXCLUDE, false, 'country CA');
check('controls failed leaves CONFIRMED_EXCLUDE intact', () => g.disposition === DISPOSITION.CONFIRMED_EXCLUDE && skipEligible(g));
g = gateDisposition(DISPOSITION.RECOVERED_CANDIDATE, false, 'fresh post');
check('controls failed leaves RECOVERED_CANDIDATE intact', () => g.disposition === DISPOSITION.RECOVERED_CANDIDATE && !skipEligible(g));

// 20. Bound: cap or deadline reached defers, never skips.
check('bound hit at cap defers', () => shouldDefer(12, 12, Date.now() + 600000) === true);
check('bound hit at deadline defers', () => shouldDefer(0, 12, Date.now() - 1) === true);
check('below bound does not defer', () => shouldDefer(0, 12, Date.now() + 600000) === false);
