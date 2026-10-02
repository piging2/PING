/**
 * Fail-before tests: EventRepository acceptance gate (2026-09-19).
 *
 * Ratified target: EventRepository -> PROJECTION/ADAPTER. Its independent
 * write path must gain a fail-closed code gate: new writes must reference
 * an already-accepted canonical event (proof of prior UER acceptance), or
 * fail closed with a typed error. Historical rows are preserved; no
 * deletion, no migration, no ID rewrites.
 *
 * DEM-REPO-1/3/4 are fail-before: they FAIL on the pre-gate code and PASS
 * after. DEM-REPO-2/5 are mechanism-preservation pins: they pass before
 * and after.
 *
 * Run: node runtime/kernel/test_event_repository_gate_2026-09-19.js (from worktree root)
 */

const assert = require('assert');
const { EventRepository } = require('./event_repository');

class MockPool {
  constructor(acceptedIds) {
    this.accepted = new Set(acceptedIds || []);
    this.inserts = [];
  }
  async query(sql, params = []) {
    if (sql.includes('FROM ping_events')) {
      const id = params[0];
      return { rows: this.accepted.has(id) ? [{ accepted: 1 }] : [] };
    }
    if (sql.includes('FROM repository_events WHERE object_id')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO repository_events')) {
      this.inserts.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
    return { rows: [] };
  }
}

function baseEvent(overrides) {
  return Object.assign({
    event_id: 'evt_test_1',
    object_id: 'obj-1',
    event_type: 'test.event',
    aggregate_type: 'test',
    sequence: 1,
    payload: { a: 1 },
    timestamp: Date.now(),
    authority: 'test',
    authority_version: '1.0.0',
    RuntimeID: 'test-runtime/1',
    CanonicalEventHash: 'abc123',
  }, overrides);
}

let passed = 0, failed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; failures.push(name + ': ' + e.message); console.log('  FAIL ' + name + ': ' + e.message); }
}

async function main() {
  console.log('=== EventRepository acceptance gate (fail-before) ===');

  await t('DEM-REPO-1 write without canonical reference fails closed', async () => {
    const repo = new EventRepository(new MockPool([]));
    let err = null;
    try {
      await repo.appendEvent(baseEvent({ correlation_id: 'mem-1' }), {});
    } catch (e) { err = e; }
    assert.ok(err, 'expected a typed error, got silent success');
    assert.strictEqual(err.code, 'EVENT_REPOSITORY_UNANCHORED_WRITE',
      'typed error code, got ' + (err && err.code));
  });

  await t('DEM-REPO-2 write referencing an accepted canonical event succeeds', async () => {
    const pool = new MockPool(['event_abc123']);
    const repo = new EventRepository(pool);
    await repo.appendEvent(baseEvent({ event_id: 'event_abc123', correlation_id: 'event_abc123' }), {});
    assert.strictEqual(pool.inserts.length, 1, 'row written to repository_events');
  });

  await t('DEM-REPO-3 write with unaccepted canonical_event_id fails closed', async () => {
    const repo = new EventRepository(new MockPool(['event_abc123']));
    let err = null;
    try {
      await repo.appendEvent(baseEvent({ canonical_event_id: 'event_missing' }), {});
    } catch (e) { err = e; }
    assert.ok(err, 'expected a typed error, got silent success');
    assert.strictEqual(err.code, 'EVENT_REPOSITORY_UNANCHORED_WRITE',
      'typed error code, got ' + (err && err.code));
  });

  await t('DEM-REPO-4 typed error names the acceptance requirement', async () => {
    const repo = new EventRepository(new MockPool([]));
    let err = null;
    try { await repo.appendEvent(baseEvent(), {}); } catch (e) { err = e; }
    assert.ok(err && /already-accepted canonical event|ping_events/.test(err.message),
      'error must name the acceptance requirement');
  });

  await t('DEM-REPO-5 options.canonicalEventId proof carrier accepted', async () => {
    const pool = new MockPool(['event_abc123']);
    const repo = new EventRepository(pool);
    await repo.appendEvent(baseEvent({ event_id: 'evt_test_1' }), { canonicalEventId: 'event_abc123' });
    assert.strictEqual(pool.inserts.length, 1, 'row written when proof is carried in options');
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) { console.log('FAILURES: ' + failures.join(' | ')); process.exit(1); }
}

main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
