/**
 * P-20260923-004: holder+fencing-token CAS lease renewal tests.
 * Core P0 property: renewal extends ONLY for the current holder presenting
 * the current token; anything else => fenced-out (stop, never success).
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/__tests__/leases.test.ts
 */
import { describe, expect, test } from '@jest/globals';
import {
  ACQUIRE_SQL,
  LEASE_SCHEMA_SQL,
  LeaseKind,
  MemoryLeaseStore,
  RELEASE_SQL,
  RENEW_SQL,
  interpretAcquireRows,
  interpretReleaseResult,
  interpretRenewResult,
  isExpired,
  isLeaseKind,
  validateAcquireRequest,
} from '../leases/lease';

const NOW = 1_700_000_000_000;
const T = 'tenant::a';

function acq(holder: string, token: string, kind: LeaseKind = LeaseKind.RUN) {
  return {
    tenant_id: T,
    kind,
    subject_id: 'attempt-1',
    holder,
    fencingToken: token,
    ttlSeconds: 60,
  };
}

describe('P0 renewal: holder+fencing-token CAS', () => {
  test('current holder with current token renews and extends the lease', () => {
    const s = new MemoryLeaseStore();
    const a = s.acquire(acq('w0', 'tok-0'), NOW);
    expect(a.acquired).toBe(true);
    const v = s.renew(T, LeaseKind.RUN, 'attempt-1', 'w0', 'tok-0', 60, NOW + 30_000);
    expect(v).toBe('renewed');
    expect(s.peek(T, LeaseKind.RUN, 'attempt-1')!.expiresAtMs).toBe(NOW + 30_000 + 60_000);
  });

  test('wrong holder => fenced-out (must stop, never success)', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0'), NOW);
    expect(s.renew(T, LeaseKind.RUN, 'attempt-1', 'w1', 'tok-0', 60, NOW + 1000)).toBe('fenced-out');
  });

  test('wrong fencing token => fenced-out', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0'), NOW);
    expect(s.renew(T, LeaseKind.RUN, 'attempt-1', 'w0', 'tok-stale', 60, NOW + 1000)).toBe('fenced-out');
  });

  test('renewing a nonexistent lease => fenced-out (fail closed)', () => {
    const s = new MemoryLeaseStore();
    expect(s.renew(T, LeaseKind.RUN, 'nope', 'w0', 'tok-0', 60, NOW)).toBe('fenced-out');
  });

  test('interpretRenewResult: 1 renewed, 0 fenced-out, >1 impossible throws', () => {
    expect(interpretRenewResult(1)).toBe('renewed');
    expect(interpretRenewResult(0)).toBe('fenced-out');
    expect(() => interpretRenewResult(2)).toThrow();
  });
});


describe('steal on expiry rotates the token; the old holder is fenced out', () => {
  test('expired lease is stealable; old holder renew then fails', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0'), NOW);
    const steal = s.acquire(acq('w1', 'tok-1'), NOW + 61_000);
    expect(steal.acquired).toBe(true);
    expect(steal.holder).toBe('w1');
    expect(steal.fencingToken).toBe('tok-1');
    // The old holder's token no longer matches: fenced out.
    expect(s.renew(T, LeaseKind.RUN, 'attempt-1', 'w0', 'tok-0', 60, NOW + 62_000)).toBe('fenced-out');
    // The new holder renews fine.
    expect(s.renew(T, LeaseKind.RUN, 'attempt-1', 'w1', 'tok-1', 60, NOW + 62_000)).toBe('renewed');
  });

  test('live lease cannot be stolen', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0'), NOW);
    const r = s.acquire(acq('w1', 'tok-1'), NOW + 59_999);
    expect(r.acquired).toBe(false);
    expect(r.holder).toBe('w0');
  });
});

describe('release is holder-guarded', () => {
  test('holder releases; non-holder cannot', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0'), NOW);
    expect(s.release(T, LeaseKind.RUN, 'attempt-1', 'w1', 'tok-0')).toBe('not-holder');
    expect(s.peek(T, LeaseKind.RUN, 'attempt-1')).not.toBeNull();
    expect(s.release(T, LeaseKind.RUN, 'attempt-1', 'w0', 'tok-wrong')).toBe('not-holder');
    expect(s.release(T, LeaseKind.RUN, 'attempt-1', 'w0', 'tok-0')).toBe('released');
    expect(s.peek(T, LeaseKind.RUN, 'attempt-1')).toBeNull();
  });

  test('interpretReleaseResult maps 1/0 and rejects >1', () => {
    expect(interpretReleaseResult(1)).toBe('released');
    expect(interpretReleaseResult(0)).toBe('not-holder');
    expect(() => interpretReleaseResult(3)).toThrow();
  });
});

describe('isolation: tenant, kind, subject', () => {
  test('same subject+kind in different tenants are independent', () => {
    const s = new MemoryLeaseStore();
    expect(s.acquire({ ...acq('w0', 't0'), tenant_id: 'tenant::a' }, NOW).acquired).toBe(true);
    expect(s.acquire({ ...acq('w1', 't1'), tenant_id: 'tenant::b' }, NOW).acquired).toBe(true);
  });

  test('kinds are independent for the same subject', () => {
    const s = new MemoryLeaseStore();
    expect(s.acquire(acq('w0', 't0', LeaseKind.RUN), NOW).acquired).toBe(true);
    expect(s.acquire(acq('w0', 't1', LeaseKind.WORKER), NOW).acquired).toBe(true);
    expect(s.acquire(acq('w0', 't2', LeaseKind.QUEUE), NOW).acquired).toBe(true);
    // Renewing one kind does not touch the others.
    expect(s.renew(T, LeaseKind.WORKER, 'attempt-1', 'w0', 't1', 60, NOW + 1000)).toBe('renewed');
    expect(s.peek(T, LeaseKind.RUN, 'attempt-1')!.expiresAtMs).toBe(NOW + 60_000);
  });

  test('exactly one kind enum: run/worker/queue', () => {
    expect(Object.values(LeaseKind)).toEqual(['run', 'worker', 'queue']);
    expect(isLeaseKind('run')).toBe(true);
    expect(isLeaseKind('mission')).toBe(false);
  });
});

describe('isExpired boundary', () => {
  test('expires_at == now counts as expired', () => {
    const s = new MemoryLeaseStore();
    s.acquire(acq('w0', 'tok-0', LeaseKind.QUEUE), NOW);
    const row = s.peek(T, LeaseKind.QUEUE, 'attempt-1')!;
    expect(isExpired(row, row.expiresAtMs)).toBe(true);
    expect(isExpired(row, row.expiresAtMs - 1)).toBe(false);
  });
});

describe('SQL contracts', () => {
  test('RENEW_SQL predicates on tenant+kind+subject+holder+token (the P0)', () => {
    for (const frag of [
      'UPDATE tenanos_leases',
      'tenant_id = $1',
      'kind = $2',
      'subject_id = $3',
      'holder = $4',
      'fencing_token = $5',
      'make_interval(secs => $6)',
    ]) {
      expect(RENEW_SQL).toContain(frag);
    }
    // Renewal extends the lease; it must not mutate holder or token.
    expect(RENEW_SQL).not.toContain('SET holder');
    expect(RENEW_SQL).not.toContain('SET fencing_token');
  });

  test('ACQUIRE_SQL steals only when expired and rotates holder+token', () => {
    expect(ACQUIRE_SQL).toContain('ON CONFLICT (tenant_id, kind, subject_id) DO UPDATE');
    expect(ACQUIRE_SQL).toContain('WHERE l.expires_at <= NOW()');
    expect(ACQUIRE_SQL).toContain('TRUE AS acquired');
    expect(ACQUIRE_SQL).toContain('FALSE AS acquired');
  });

  test('RELEASE_SQL is holder+token guarded', () => {
    expect(RELEASE_SQL).toContain('DELETE FROM tenanos_leases');
    expect(RELEASE_SQL).toContain('holder = $4');
    expect(RELEASE_SQL).toContain('fencing_token = $5');
  });

  test('schema keys on (tenant_id, kind, subject_id) with kind check', () => {
    expect(LEASE_SCHEMA_SQL).toContain('PRIMARY KEY (tenant_id, kind, subject_id)');
    expect(LEASE_SCHEMA_SQL).toContain("CHECK (kind IN ('run','worker','queue'))");
  });
});

describe('interpretAcquireRows', () => {
  test('maps winner and loser rows', () => {
    const w = interpretAcquireRows([
      { holder: 'w0', fencing_token: 't0', expires_at: NOW + 60_000, acquired: true },
    ]);
    expect(w).toEqual({ acquired: true, holder: 'w0', fencingToken: 't0', expiresAtMs: NOW + 60_000 });
    const l = interpretAcquireRows([
      { holder: 'w0', fencing_token: 't0', expires_at: new Date(NOW + 60_000), acquired: false },
    ]);
    expect(l.acquired).toBe(false);
    expect(l.holder).toBe('w0');
  });

  test('zero/two rows fail closed', () => {
    expect(() => interpretAcquireRows([])).toThrow();
    expect(() =>
      interpretAcquireRows([
        { holder: 'a', fencing_token: 'x', expires_at: NOW, acquired: true },
        { holder: 'b', fencing_token: 'y', expires_at: NOW, acquired: false },
      ]),
    ).toThrow();
  });
});

describe('validateAcquireRequest (fail-closed)', () => {
  test('rejects bad kind, empty fields, non-positive ttl', () => {
    expect(() => validateAcquireRequest({ ...acq('w0', 't0'), kind: 'mission' as LeaseKind })).toThrow();
    expect(() => validateAcquireRequest({ ...acq('w0', 't0'), holder: '' })).toThrow();
    expect(() => validateAcquireRequest({ ...acq('w0', 't0'), ttlSeconds: 0 })).toThrow();
  });
});
