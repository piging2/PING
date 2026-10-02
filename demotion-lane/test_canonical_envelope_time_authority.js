/**
 * Regression test: gateway/canonical_event_envelope.js must source receipt
 * timestamps from the constitutional time authority, not new Date().
 *
 * Prior defect: executeEmitEvent built `timestamp: new Date().toISOString()`
 * — a constitutional time bypass on the canonical event envelope (P001,
 * live-wired into gateway bootstrap). The receipt timestamp feeds receiptId
 * generation, persistence, and metadata — fully replay-visible.
 *
 * Demotion note (2026-09-19): this is the ingress RECEIPT timestamp, not a
 * constitutional acceptance timestamp. Acceptance time belongs to the UER.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  PASS ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}: ${e.message}`); }
}

const file = path.join(__dirname, 'canonical_event_envelope.js');
const source = fs.readFileSync(file, 'utf8');

function main() {
  console.log('=== canonical_event_envelope.js uses constitutional time authority ===');

  test('no new Date() bypass remains', () => {
    assert.strictEqual((source.match(/new Date\(\)/g) || []).length, 0, 'zero `new Date()` call sites');
  });

  test('imports constitutional time authority', () => {
    assert.ok(source.includes("require('../ping-runtime/authorities/constitutional_time_authority.js')"), 'time authority import present');
  });

  test('emit timestamp uses nowAsISOString()', () => {
    assert.ok(source.includes('receiptTimestamp = constitutionalTimeAuthority.nowAsISOString()'), 'receipt timestamp sourced from time authority');
  });

  test('module loads without error', () => {
    delete require.cache[require.resolve('./canonical_event_envelope.js')];
    const mod = require('./canonical_event_envelope.js');
    assert.ok(mod.CanonicalEventEnvelope || mod.canonicalEventEnvelope, 'exports envelope');
  });

  test('nowAsISOString() returns valid ISO timestamp', () => {
    const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority');
    const iso = constitutionalTimeAuthority.nowAsISOString();
    assert.ok(!Number.isNaN(Date.parse(iso)), 'parses as date');
    assert.ok(iso.endsWith('Z'), 'UTC ISO timestamp');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
