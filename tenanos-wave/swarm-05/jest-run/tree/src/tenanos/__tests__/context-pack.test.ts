/**
 * context-pack.test.ts — tests for the minimal context pack assembler.
 *
 * Guards the converged-pipeline contract at the RETRIEVAL -> CONTEXT PACK
 * boundary (swarm-05, CONVERGED-PIPELINE.md):
 *  - I3: rank_score / score never reach the worker; confidence never
 *        fabricated; verified is a strict boolean from the evidence trace.
 *  - I5: cross-namespace items are dropped, never passed through.
 *  - Determinism: same input -> same pack_id; the ID carries no timestamp.
 *  - Budgets: maxItems / maxCharsPerItem honored; truncation is flagged.
 *
 * Run from the wave repo root:
 *   npx jest --config src/tenanos/jest.config.cjs
 */
import {
  assembleContextPack,
  packIdFor,
  CONTEXT_PACK_SCHEMA_VERSION,
  DEFAULT_MAX_ITEMS,
  type RetrievalItem,
} from '../memory/context-pack';

const TENANT = 'tenant::hpp';
const OTHER = 'tenant::other';

function rankedItem(overrides: Partial<RetrievalItem> = {}): RetrievalItem {
  return {
    id: 'node-1',
    text: 'the shop closes at 6pm on Sundays',
    status: 'approved',
    confidence: 1.0,
    confidence_provenance: 'human-approval',
    evidence: ['evt-1'],
    verified: true,
    namespace: TENANT,
    rank_score: 0.97,
    score: 0.83,
    approved: true,
    ...overrides,
  };
}

describe('I3: rank-derived fields die at the pack boundary', () => {
  test('rank_score and score never appear in pack items', () => {
    const pack = assembleContextPack([rankedItem()], { tenant: TENANT });
    expect(pack.item_count).toBe(1);
    const item = pack.items[0] as unknown as Record<string, unknown>;
    expect(item).not.toHaveProperty('rank_score');
    expect(item).not.toHaveProperty('score');
    expect(item).not.toHaveProperty('approved');
    expect(Object.keys(item).sort()).toEqual(
      ['confidence', 'confidence_provenance', 'evidence', 'status', 'text', 'truncated', 'verified'].sort()
    );
  });

  test('status, confidence, provenance, evidence, verified pass through', () => {
    const pack = assembleContextPack([rankedItem()], { tenant: TENANT });
    const item = pack.items[0];
    expect(item.status).toBe('approved');
    expect(item.confidence).toBe(1.0);
    expect(item.confidence_provenance).toBe('human-approval');
    expect(item.evidence).toEqual(['evt-1']);
    expect(item.verified).toBe(true);
  });

  test('null confidence is never fabricated', () => {
    const pack = assembleContextPack([rankedItem({ confidence: null })], { tenant: TENANT });
    expect(pack.items[0].confidence).toBeNull();
  });

  test('verified is a strict boolean from the evidence trace, never inferred', () => {
    const truthy = assembleContextPack([rankedItem({ verified: 1 as unknown as boolean })], {
      tenant: TENANT,
    });
    expect(truthy.items[0].verified).toBe(false);
    const missing = assembleContextPack([rankedItem({ verified: undefined })], {
      tenant: TENANT,
    });
    expect(missing.items[0].verified).toBe(false);
  });
});

describe('I5: tenant boundary', () => {
  test('cross-namespace items are dropped and counted', () => {
    const pack = assembleContextPack(
      [rankedItem(), rankedItem({ id: 'node-2', namespace: OTHER }), rankedItem({ id: 'node-3', namespace: null })],
      { tenant: TENANT }
    );
    expect(pack.item_count).toBe(1);
    expect(pack.dropped_cross_namespace).toBe(2);
  });

  test('missing tenant option fails closed', () => {
    expect(() => assembleContextPack([rankedItem()], { tenant: '' })).toThrow(/tenant is required/);
  });
});

describe('determinism and budgets', () => {
  test('same input yields the same pack_id; id carries no timestamp', () => {
    const a = assembleContextPack([rankedItem()], { tenant: TENANT });
    const b = assembleContextPack([rankedItem()], { tenant: TENANT });
    expect(a.pack_id).toBe(b.pack_id);
    expect(a.pack_id).toMatch(/^pack:[0-9a-f]{16}$/);
    expect(a.pack_id).not.toContain(a.created_at);
  });

  test('pack_id changes when the payload changes', () => {
    const a = assembleContextPack([rankedItem()], { tenant: TENANT });
    const b = assembleContextPack([rankedItem({ text: 'different text' })], { tenant: TENANT });
    expect(a.pack_id).not.toBe(b.pack_id);
    expect(packIdFor(TENANT, a.items)).toBe(a.pack_id);
  });

  test('maxItems budget honored; input order preserved', () => {
    const items = [0, 1, 2, 3, 4].map((i) => rankedItem({ id: `n${i}`, text: `t${i}` }));
    const pack = assembleContextPack(items, { tenant: TENANT, maxItems: 3 });
    expect(pack.item_count).toBe(3);
    expect(pack.items.map((it) => it.text)).toEqual(['t0', 't1', 't2']);
    expect(pack.budgets.maxItems).toBe(3);
  });

  test('long text is truncated and flagged', () => {
    const pack = assembleContextPack([rankedItem({ text: 'abcdefghij' })], {
      tenant: TENANT,
      maxCharsPerItem: 5,
    });
    expect(pack.items[0].text).toBe('abcde');
    expect(pack.items[0].truncated).toBe(true);
    const short = assembleContextPack([rankedItem({ text: 'abc' })], {
      tenant: TENANT,
      maxCharsPerItem: 5,
    });
    expect(short.items[0].truncated).toBe(false);
  });

  test('assembler is pure: input is not mutated', () => {
    const input = [rankedItem({ text: 'x'.repeat(5000) })];
    const snapshot = JSON.stringify(input);
    assembleContextPack(input, { tenant: TENANT, maxItems: 1, maxCharsPerItem: 10 });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test('pack carries schema version and defaults', () => {
    const pack = assembleContextPack([], { tenant: TENANT });
    expect(pack.schema_version).toBe(CONTEXT_PACK_SCHEMA_VERSION);
    expect(pack.tenant).toBe(TENANT);
    expect(pack.budgets).toEqual({ maxItems: DEFAULT_MAX_ITEMS, maxCharsPerItem: 2000 });
  });
});
