/**
 * lease tests. Real timers: TTLs are short (hundreds of ms) but the sleeps
 * are real sleeps, and expiry is evaluated against the real clock.
 */
import { LeaseManager, LeaseActiveError, LeaseNotHeldError } from '../src/lease';

jest.setTimeout(30000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('lease', () => {
  test('acquire blocks a second holder while active', () => {
    const lm = new LeaseManager();
    const l1 = lm.acquire('unit-1', 'worker-a', 5000);
    expect(l1.holder).toBe('worker-a');
    expect(() => lm.acquire('unit-1', 'worker-b', 5000)).toThrow(LeaseActiveError);
  });

  test('renew extends a live lease; renew of an expired lease fails', async () => {
    const lm = new LeaseManager();
    const l1 = lm.acquire('unit-1', 'worker-a', 300);
    const r1 = lm.renew('unit-1', 'worker-a', 5000);
    expect(r1.expiresAt).toBeGreaterThan(l1.expiresAt);

    const l2 = lm.acquire('unit-2', 'worker-a', 150);
    await sleep(250); // real expiry
    expect(lm.isExpired(lm.get('unit-2')!)).toBe(true);
    expect(() => lm.renew('unit-2', 'worker-a', 5000)).toThrow(LeaseNotHeldError);
    expect(l2.holder).toBe('worker-a');
  });

  test('reclaim before expiry throws LeaseActiveError; after expiry it succeeds and records the preemption', async () => {
    const lm = new LeaseManager();
    lm.acquire('unit-1', 'worker-a', 5000);
    const early = (() => {
      try {
        lm.reclaim('unit-1', 'worker-b');
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(early).toBeInstanceOf(LeaseActiveError);
    expect((early as LeaseActiveError).holder).toBe('worker-a');

    lm.acquire('unit-2', 'worker-a', 200);
    await sleep(300); // real expiry
    const { lease, preempted } = lm.reclaim('unit-2', 'worker-b');
    expect(preempted).not.toBeNull();
    expect(preempted!.previousHolder).toBe('worker-a');
    expect(preempted!.reclaimedBy).toBe('worker-b');
    expect(lease.version).toBeGreaterThan(1);

    // The displaced worker can discover it was preempted.
    const found = lm.preemptionsFor('worker-a');
    expect(found).toHaveLength(1);
    expect(found[0].unitId).toBe('unit-2');

    // The new holder acquires a real TTL next; reclaim alone grants no time.
    expect(lease.expiresAt).toBe(lease.acquiredAt);
    const fresh = lm.acquire('unit-2', 'worker-b', 5000);
    expect(fresh.holder).toBe('worker-b');
  });

  test('acquire after expiry works and bumps the version', async () => {
    const lm = new LeaseManager();
    const l1 = lm.acquire('unit-1', 'worker-a', 150);
    await sleep(250);
    const l2 = lm.acquire('unit-1', 'worker-b', 5000);
    expect(l2.holder).toBe('worker-b');
    expect(l2.version).toBe(l1.version + 1);
  });

  test('release by a non-holder is refused', () => {
    const lm = new LeaseManager();
    lm.acquire('unit-1', 'worker-a', 5000);
    expect(() => lm.release('unit-1', 'worker-b')).toThrow(LeaseNotHeldError);
    lm.release('unit-1', 'worker-a');
    expect(lm.get('unit-1')).toBeNull();
  });
});
