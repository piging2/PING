/**
 * P-20260923-003: atomic tenant-scoped task claim tests.
 * Core property: EXACTLY ONE winner per (tenant_id, key); losers attach.
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/__tests__/claim.test.ts
 */
import { describe, expect, test } from '@jest/globals';
import {
  CLAIM_SCHEMA_SQL,
  CLAIM_SQL,
  ClaimRequest,
  MemoryClaimStore,
  interpretClaimRows,
  isClaimable,
  validateClaimRequest,
} from '../claim/claim';

const NOW = 1_700_000_000_000;

function req(holder: string, overrides: Partial<ClaimRequest> = {}): ClaimRequest {
  return {
    tenant_id: 'tenant::a',
    key: 'task-1',
    holder,
    fencingToken: `tok-${holder}`,
    ttlSeconds: 60,
    ...overrides,
  };
}

describe('exactly-1-winner (the core property)', () => {
  test('50 concurrent claimants produce exactly one winner', () => {
    const store = new MemoryClaimStore();
    const results = Array.from({ length: 50 }, (_, i) => store.claim(req(`worker-${i}`), NOW));
    const winners = results.filter((r) => r.won);
    expect(winners).toHaveLength(1);
  });

  test('losers attach to the winner: all report the winner holder', () => {
    const store = new MemoryClaimStore();
    const results = Array.from({ length: 25 }, (_, i) => store.claim(req(`worker-${i}`), NOW));
    const winner = results.find((r) => r.won);
    expect(winner).toBeDefined();
    for (const r of results) {
      expect(r.holder).toBe(winner!.holder);
      expect(r.fencingToken).toBe(winner!.fencingToken);
    }
  });

  test('live lease is not re-claimable even by the same holder; renewal is the lease path', () => {
    const store = new MemoryClaimStore();
    const first = store.claim(req('w0'), NOW);
    expect(first.won).toBe(true);
    // Same holder while live: not claimable (only absent-or-expired is).
    // Extending a live lease is 004's renew, not a re-claim.
    const again = store.claim(req('w0'), NOW + 1000);
    expect(again.won).toBe(false);
    expect(again.holder).toBe('w0');
    const afterExpiry = store.claim(req('w0'), NOW + 61_000);
    expect(afterExpiry.won).toBe(true);
  });
});

describe('expiry and stealing', () => {
  test('expired claim is re-claimable by a new holder (with rotated token)', () => {
    const store = new MemoryClaimStore();
    store.claim(req('w0'), NOW);
    const r = store.claim(req('w1', { fencingToken: 'tok-new' }), NOW + 61_000);
    expect(r.won).toBe(true);
    expect(r.holder).toBe('w1');
    expect(r.fencingToken).toBe('tok-new');
    expect(store.peek('tenant::a', 'task-1')!.holder).toBe('w1');
  });

  test('live claim cannot be stolen', () => {
    const store = new MemoryClaimStore();
    store.claim(req('w0'), NOW);
    const r = store.claim(req('w1'), NOW + 59_999);
    expect(r.won).toBe(false);
    expect(r.holder).toBe('w0');
    expect(store.peek('tenant::a', 'task-1')!.holder).toBe('w0');
  });

  test('expiry boundary: lease_until == now is claimable', () => {
    const store = new MemoryClaimStore();
    store.claim(req('w0', { ttlSeconds: 60 }), NOW);
    const r = store.claim(req('w1'), NOW + 60_000);
    expect(r.won).toBe(true);
  });
});

describe('tenant and key isolation', () => {
  test('same key in different tenants: independent winners', () => {
    const store = new MemoryClaimStore();
    const a = store.claim(req('w0', { tenant_id: 'tenant::a' }), NOW);
    const b = store.claim(req('w1', { tenant_id: 'tenant::b' }), NOW);
    expect(a.won).toBe(true);
    expect(b.won).toBe(true);
  });

  test('different keys are independent', () => {
    const store = new MemoryClaimStore();
    const a = store.claim(req('w0', { key: 'k1' }), NOW);
    const b = store.claim(req('w0', { key: 'k2' }), NOW);
    expect(a.won).toBe(true);
    expect(b.won).toBe(true);
  });
});

describe('isClaimable', () => {
  test('absent row is claimable; live row is not; expired row is', () => {
    expect(isClaimable(null, NOW)).toBe(true);
    expect(isClaimable({ tenant_id: 't', key: 'k', holder: 'h', fencingToken: 'x', leaseUntilMs: NOW + 1 }, NOW)).toBe(false);
    expect(isClaimable({ tenant_id: 't', key: 'k', holder: 'h', fencingToken: 'x', leaseUntilMs: NOW }, NOW)).toBe(true);
    expect(isClaimable({ tenant_id: 't', key: 'k', holder: 'h', fencingToken: 'x', leaseUntilMs: NOW - 1 }, NOW)).toBe(true);
  });
});

describe('validateClaimRequest (fail-closed)', () => {
  test('rejects empty identity fields and non-positive ttl', () => {
    expect(() => validateClaimRequest(req('w0', { holder: '' }))).toThrow();
    expect(() => validateClaimRequest(req('w0', { tenant_id: '' }))).toThrow();
    expect(() => validateClaimRequest(req('w0', { key: '' }))).toThrow();
    expect(() => validateClaimRequest(req('w0', { fencingToken: '' }))).toThrow();
    expect(() => validateClaimRequest(req('w0', { ttlSeconds: 0 }))).toThrow();
    expect(() => validateClaimRequest(req('w0', { ttlSeconds: -5 }))).toThrow();
  });
});

describe('CLAIM_SQL contract', () => {
  test('single statement with the required clauses', () => {
    expect(CLAIM_SQL).toContain('FOR UPDATE');
    expect(CLAIM_SQL).toContain('ORDER BY tenant_id, key');
    expect(CLAIM_SQL).toContain('ON CONFLICT (tenant_id, key) DO UPDATE');
    expect(CLAIM_SQL).toContain('WHERE tenanos_task_claims.lease_until <= NOW()');
    expect(CLAIM_SQL).toContain('TRUE AS won');
    expect(CLAIM_SQL).toContain('FALSE AS won');
  });

  test('schema keys on (tenant_id, key)', () => {
    expect(CLAIM_SCHEMA_SQL).toContain('PRIMARY KEY (tenant_id, key)');
    expect(CLAIM_SCHEMA_SQL).toContain('fencing_token');
  });
});

describe('interpretClaimRows', () => {
  test('maps a winner row', () => {
    const r = interpretClaimRows([
      { holder: 'w0', fencing_token: 'tok-w0', lease_until: new Date(NOW + 60_000), won: true },
    ]);
    expect(r).toEqual({ won: true, holder: 'w0', fencingToken: 'tok-w0', leaseUntilMs: NOW + 60_000 });
  });

  test('maps a loser (attach-to-winner) row', () => {
    const r = interpretClaimRows([
      { holder: 'w0', fencing_token: 'tok-w0', lease_until: NOW + 60_000, won: false },
    ]);
    expect(r.won).toBe(false);
    expect(r.holder).toBe('w0');
  });

  test('zero or two rows fail closed (impossible states)', () => {
    expect(() => interpretClaimRows([])).toThrow();
    expect(() =>
      interpretClaimRows([
        { holder: 'a', fencing_token: 'x', lease_until: NOW, won: true },
        { holder: 'b', fencing_token: 'y', lease_until: NOW, won: false },
      ]),
    ).toThrow();
  });
});
