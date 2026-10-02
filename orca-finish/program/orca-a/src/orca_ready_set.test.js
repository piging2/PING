'use strict';
/**
 * Tests for orca_ready_set.js.
 * Run: node orca_ready_set.test.js
 *
 * Covers the mechanism-map record 3 smallest proof: a diamond A->B, A->C,
 * B->D, C->D where B is not claimable until A is terminal-success — decided
 * by the query, not by coordinator prose. Plus fail-closed degradation:
 * unresolved unknown effects block, failed deps block, cycles and missing
 * deps never become ready and never hang.
 */
const assert = require('assert');
const { readyWorkOrders, isSettled, isClaimable } = require('./orca_ready_set');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + ': ' + (e && e.message)); }
}
const ids = (rows) => rows.map((r) => r.work_order_id).sort();

// Diamond fixture: A -> B, A -> C, B -> D, C -> D
function diamond(stateOverrides = {}) {
  const base = {
    A: { work_order_id: 'A', state: 'AUTHORIZED', depends_on: [] },
    B: { work_order_id: 'B', state: 'AUTHORIZED', depends_on: ['A'] },
    C: { work_order_id: 'C', state: 'AUTHORIZED', depends_on: ['A'] },
    D: { work_order_id: 'D', state: 'AUTHORIZED', depends_on: ['B', 'C'] },
  };
  for (const [k, v] of Object.entries(stateOverrides)) Object.assign(base[k], v);
  return [base.A, base.B, base.C, base.D];
}

test('initially only the root A is ready', () => {
  assert.deepStrictEqual(ids(readyWorkOrders(diamond())), ['A']);
});

test('after A COMPLETED, B and C are ready, D is not', () => {
  const rows = diamond({ A: { state: 'COMPLETED' } });
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['B', 'C']);
});

test('D waits for BOTH B and C (partial completion is not enough)', () => {
  const rows = diamond({ A: { state: 'COMPLETED' }, B: { state: 'COMPLETED' } });
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['C']);
});

test('after B and C COMPLETED, D is ready', () => {
  const rows = diamond({
    A: { state: 'COMPLETED' }, B: { state: 'COMPLETED' }, C: { state: 'COMPLETED' },
  });
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['D']);
});

test('all settled -> empty ready set', () => {
  const rows = diamond({
    A: { state: 'COMPLETED' }, B: { state: 'COMPLETED' },
    C: { state: 'COMPLETED' }, D: { state: 'COMPLETED' },
  });
  assert.deepStrictEqual(readyWorkOrders(rows), []);
});

test('FAILED dependency blocks its dependents (no auto-unblock)', () => {
  const rows = diamond({ A: { state: 'FAILED' } });
  assert.deepStrictEqual(readyWorkOrders(rows), []);
});

test('unresolved OUTCOME_UNKNOWN work order is never ready until reconciled', () => {
  const rows = diamond({ A: { state: 'COMPLETED' } });
  const ready = readyWorkOrders(rows, { blockedWorkOrderIds: ['B'] });
  assert.deepStrictEqual(ids(ready), ['C']);
  // and once reconciled (removed from the blocked set) it becomes ready
  assert.deepStrictEqual(ids(readyWorkOrders(rows, { blockedWorkOrderIds: [] })), ['B', 'C']);
});

test('RUNNING work orders are not re-claimed as ready', () => {
  const rows = diamond({ A: { state: 'COMPLETED' }, B: { state: 'RUNNING' } });
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['C']);
});

test('unknown work-order states are never claimable (fail closed)', () => {
  const rows = [
    { work_order_id: 'P', state: 'PAUSED', depends_on: [] },
    { work_order_id: 'Q', state: '', depends_on: [] },
    { work_order_id: 'R', state: 'AUTHORIZED', depends_on: [] },
  ];
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['R']);
});

test('dependency cycle degrades to never-ready (safe, no hang)', () => {
  const rows = [
    { work_order_id: 'X', state: 'AUTHORIZED', depends_on: ['Y'] },
    { work_order_id: 'Y', state: 'AUTHORIZED', depends_on: ['X'] },
  ];
  assert.deepStrictEqual(readyWorkOrders(rows), []);
});

test('missing dependency row is not treated as success', () => {
  const rows = [{ work_order_id: 'Z', state: 'AUTHORIZED', depends_on: ['GHOST'] }];
  assert.deepStrictEqual(readyWorkOrders(rows), []);
});

test('self-dependency is never ready', () => {
  const rows = [{ work_order_id: 'S', state: 'AUTHORIZED', depends_on: ['S'] }];
  assert.deepStrictEqual(readyWorkOrders(rows), []);
});

test('work order without depends_on is treated as dependency-free', () => {
  const rows = [{ work_order_id: 'L', state: 'AUTHORIZED' }];
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['L']);
});

test('malformed rows are skipped, never crash the query', () => {
  const rows = [null, undefined, { no_id: true }, ...diamond()];
  assert.deepStrictEqual(ids(readyWorkOrders(rows)), ['A']);
});

test('isSettled / isClaimable cover the branch work-order states', () => {
  for (const s of ['COMPLETED', 'FAILED', 'VERIFICATION_FAILED', 'BLOCKED', 'CANCELLED']) {
    assert.ok(isSettled(s), s);
    assert.ok(!isClaimable(s), s + ' not claimable');
  }
  assert.ok(isClaimable('AUTHORIZED'));
  assert.ok(!isSettled('AUTHORIZED'));
  assert.ok(!isClaimable('RUNNING'));
  assert.ok(!isSettled('RUNNING'));
});

test('input order is preserved in the output', () => {
  const rows = [
    { work_order_id: 'C', state: 'AUTHORIZED', depends_on: [] },
    { work_order_id: 'A', state: 'AUTHORIZED', depends_on: [] },
    { work_order_id: 'B', state: 'AUTHORIZED', depends_on: [] },
  ];
  assert.deepStrictEqual(
    readyWorkOrders(rows).map((r) => r.work_order_id), ['C', 'A', 'B']);
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
