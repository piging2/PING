/**
 * invalidation.test.ts — P-20260923-009.
 *
 * Proves the bitemporal supersession properties:
 *  1. contradiction resolution sets old.invalid_at = new.valid_at,
 *     old.expired_at = now, with bidirectional supersede links;
 *  2. the old record is NEVER deleted (store only grows);
 *  3. asOf reads show the old fact before supersession, the new fact after;
 *  4. cross-tenant invalidation is rejected fail-closed;
 *  5. unconfirmed (heuristic-only) detections cannot invalidate;
 *  6. double-supersession is rejected.
 */

import {
  applyInvalidation,
  asOf,
  currentFacts,
  selectCandidates,
  Contradiction,
  Detector,
  MemoryFact,
} from '../invalidation';

function fact(partial: Partial<MemoryFact> & { id: string; tenant: string }): MemoryFact {
  return {
    content: 'content',
    valid_at: '2026-01-01T00:00:00.000Z',
    invalid_at: null,
    expired_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const NOW = '2026-09-24T12:00:00.000Z';

function contradiction(overrides?: Partial<Contradiction>): Contradiction {
  return {
    oldFactId: 'fact-1',
    newFact: {
      id: 'fact-2',
      tenant: 'tenant::hpp',
      content: 'new content',
      valid_at: '2026-09-24T12:00:00.000Z',
    },
    reason: 'detector: content contradicts fact-1',
    confirmed: true,
    ...overrides,
  };
}

test('supersession: timestamp surgery, bidirectional links, nothing deleted', () => {
  const store: MemoryFact[] = [fact({ id: 'fact-1', tenant: 'tenant::hpp', content: 'old content' })];

  const r = applyInvalidation(store, contradiction(), NOW);
  expect(r.ok).toBe(true);
  if (!r.ok) {
    throw new Error('expected ok');
  }

  // The surgery: invalid_at = new.valid_at, expired_at = now.
  expect(r.oldFact.invalid_at).toBe('2026-09-24T12:00:00.000Z');
  expect(r.oldFact.expired_at).toBe(NOW);
  expect(r.oldFact.superseded_by).toBe('fact-2');
  expect(r.newFact.supersedes).toBe('fact-1');
  expect(r.newFact.invalid_at).toBeNull();
  expect(r.newFact.expired_at).toBeNull();

  // NEVER DELETE: the store grew by exactly one; the old record is intact.
  expect(store).toHaveLength(2);
  expect(store.find((f) => f.id === 'fact-1')?.content).toBe('old content');
});

test('asOf: old fact visible before supersession, new fact visible after', () => {
  const store: MemoryFact[] = [fact({ id: 'fact-1', tenant: 'tenant::hpp', content: 'old' })];
  applyInvalidation(store, contradiction(), NOW);

  const before = asOf(store, 'tenant::hpp', '2026-06-01T00:00:00.000Z');
  expect(before.map((f) => f.id)).toEqual(['fact-1']);

  const after = asOf(store, 'tenant::hpp', '2026-09-25T00:00:00.000Z');
  expect(after.map((f) => f.id)).toEqual(['fact-2']);

  expect(currentFacts(store, 'tenant::hpp').map((f) => f.id)).toEqual(['fact-2']);
});

test('cross-tenant invalidation is rejected fail-closed; store untouched', () => {
  const store: MemoryFact[] = [fact({ id: 'fact-1', tenant: 'tenant::hpp' })];
  const cross = contradiction({
    newFact: {
      id: 'fact-2',
      tenant: 'tenant::other',
      content: 'new content',
      valid_at: '2026-09-24T12:00:00.000Z',
    },
  });
  const r = applyInvalidation(store, cross, NOW);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error).toBe('TENANT_MISMATCH');
  }
  expect(store).toHaveLength(1);
  expect(store[0].invalid_at).toBeNull();
});

test('detection/invalidation separation: unconfirmed candidates cannot invalidate', () => {
  const store: MemoryFact[] = [fact({ id: 'fact-1', tenant: 'tenant::hpp' })];

  // The heuristic detector proposes; nothing is confirmed yet.
  const detector: Detector = (facts, tenant) =>
    selectCandidates(facts, tenant, (f) => f.invalid_at === null).map((f) => ({
      oldFactId: f.id,
      newFact: { id: 'fact-9', tenant, content: 'maybe newer', valid_at: NOW },
      reason: 'heuristic: similar content',
      confirmed: false,
    }));
  const candidates = detector(store, 'tenant::hpp');
  expect(candidates).toHaveLength(1);

  const r = applyInvalidation(store, candidates[0], NOW);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error).toBe('UNCONFIRMED');
  }
  // A wrong detection corrupted nothing.
  expect(store).toHaveLength(1);
  expect(store[0].invalid_at).toBeNull();
});

test('already-superseded facts cannot be superseded again; backdated valid_at rejected', () => {
  const store: MemoryFact[] = [fact({ id: 'fact-1', tenant: 'tenant::hpp' })];
  expect(applyInvalidation(store, contradiction(), NOW).ok).toBe(true);

  const again = applyInvalidation(
    store,
    contradiction({ newFact: { id: 'fact-3', tenant: 'tenant::hpp', content: 'x', valid_at: NOW } }),
    NOW,
  );
  expect(again.ok).toBe(false);
  if (!again.ok) {
    expect(again.error).toBe('ALREADY_SUPERSEDED');
  }

  const backdated = applyInvalidation(
    [fact({ id: 'fact-1', tenant: 'tenant::hpp', valid_at: '2026-09-24T12:00:00.000Z' })],
    contradiction({
      newFact: {
        id: 'fact-2',
        tenant: 'tenant::hpp',
        content: 'x',
        valid_at: '2026-01-01T00:00:00.000Z',
      },
    }),
    NOW,
  );
  expect(backdated.ok).toBe(false);
  if (!backdated.ok) {
    expect(backdated.error).toBe('NON_MONOTONIC_VALID_TIME');
  }
});

test('tenant scoping: selectCandidates and asOf never cross tenants', () => {
  const store: MemoryFact[] = [
    fact({ id: 'a1', tenant: 'tenant::a' }),
    fact({ id: 'b1', tenant: 'tenant::b' }),
  ];
  expect(selectCandidates(store, 'tenant::a', () => true).map((f) => f.id)).toEqual(['a1']);
  expect(asOf(store, 'tenant::b', NOW).map((f) => f.id)).toEqual(['b1']);
});
