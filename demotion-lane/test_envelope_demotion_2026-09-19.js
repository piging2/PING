/**
 * Fail-before tests: CanonicalEventEnvelope demotion (2026-09-19).
 *
 * Ratified target: CanonicalEventEnvelope -> ingress/envelope producer.
 * It must LOSE: independent UUIDv5 identity minting, MAX(sequence)+1
 * ordering as a canonical ordering claim, and unconditional 'ok'
 * acceptance. It KEEPS: envelope construction, ingress shaping, validation,
 * and the canonical_events ingress-surface writes.
 *
 * DEM-ENV-1/2/3/6 are fail-before: they FAIL on the pre-demotion code and
 * PASS after. DEM-ENV-4/5/7 are mechanism-preservation pins: they pass
 * before and after.
 *
 * Run: node gateway/test_envelope_demotion_2026-09-19.js (from worktree root)
 */

const assert = require('assert');
const { CanonicalEventEnvelope } = require('./canonical_event_envelope');
const timeMod = require('../ping-runtime/authorities/constitutional_time_authority.js');

const FIXED_TS = '2026-09-19T12:00:00.000Z';
timeMod.constitutionalTimeAuthority.nowAsISOString = () => FIXED_TS;

class MockStorage {
  constructor(opts = {}) {
    this.queries = [];
    this.conflictOnInsert = !!opts.conflictOnInsert;
  }
  async query(sql, params = []) {
    this.queries.push({ sql, params });
    if (sql.includes('SELECT COALESCE(MAX(sequence)')) {
      return { rows: [{ next_seq: 1 }] };
    }
    if (sql.includes('INSERT INTO canonical_events')) {
      if (this.conflictOnInsert) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [{ event_id: params[0] }] };
    }
    return { rows: [] };
  }
}

const CMD = { tenantId: 'acme', eventType: 'E', source: 's', actor: 'a', payload: {} };

let passed = 0, failed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; failures.push(name + ': ' + e.message); console.log('  FAIL ' + name + ': ' + e.message); }
}

async function main() {
  console.log('=== CanonicalEventEnvelope demotion (fail-before) ===');

  await t('DEM-ENV-1 emitted receipt id is not the deterministic UUIDv5', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage());
    const r = await envelope.executeEmitEvent(CMD);
    const legacy = envelope.generateEventId('acme', 'E', FIXED_TS, 1);
    assert.notStrictEqual(r.event_id, legacy,
      'receipt id must not equal the legacy deterministic UUIDv5 identity');
  });

  await t('DEM-ENV-2 receipt explicitly declares non-acceptance', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage());
    const r = await envelope.executeEmitEvent(CMD);
    assert.strictEqual(r.accepted, false,
      'receipt must carry accepted=false: acceptance belongs to the UER');
  });

  await t('DEM-ENV-3 receipt-order conflict fails closed, never silent ok', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage({ conflictOnInsert: true }));
    let err = null;
    try { await envelope.executeEmitEvent(CMD); } catch (e) { err = e; }
    assert.ok(err, 'expected a typed error, got silent success');
    assert.strictEqual(err.code, 'INGRESS_RECEIPT_CONFLICT',
      'typed error code, got ' + (err && err.code));
  });

  await t('DEM-ENV-4 receipt is still persisted to canonical_events (mechanism preserved)', async () => {
    const storage = new MockStorage();
    const envelope = new CanonicalEventEnvelope(storage);
    const r = await envelope.executeEmitEvent(CMD);
    const ins = storage.queries.find(q => q.sql.includes('INSERT INTO canonical_events'));
    assert.ok(ins, 'INSERT INTO canonical_events issued');
    assert.strictEqual(ins.params[3], 'acme');
    assert.strictEqual(r.processed, false);
    assert.strictEqual(r.tenant_id, 'acme');
    assert.deepStrictEqual(r.payload, {});
  });

  await t('DEM-ENV-5 invalid input still rejected by validation', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage());
    let err = null;
    try { await envelope.executeEmitEvent({ tenantId: 'acme' }); } catch (e) { err = e; }
    assert.ok(err, 'expected a validation error');
  });

  await t('DEM-ENV-6 contract no longer claims canonical identity/ordering/acceptance', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage());
    const c = envelope.publishContract();
    assert.ok(!c.guarantees.includes('deterministic_id'),
      'must not guarantee deterministic_id');
    assert.ok(c.guarantees.includes('tenant_isolated'),
      'tenant isolation guarantee preserved');
    assert.ok(Array.isArray(c.invariants) && c.invariants.some(i => /not a canonical event/i.test(i)),
      'invariants must state the receipt is not a canonical event identity');
  });

  await t('DEM-ENV-7 legacy generateEventId helper preserved and deterministic', async () => {
    const envelope = new CanonicalEventEnvelope(new MockStorage());
    const a = envelope.generateEventId('t', 'e', FIXED_TS, 1);
    const b = envelope.generateEventId('t', 'e', FIXED_TS, 1);
    assert.strictEqual(a, b, 'legacy helper stays deterministic for archaeology');
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) { console.log('FAILURES: ' + failures.join(' | ')); process.exit(1); }
}

main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
