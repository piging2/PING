/**
 * lease — TTL leases with safe reclaim on expiry.
 *
 * Rules:
 * - acquire() fails when another holder's lease is still active (typed).
 * - renew() extends only the holder's own live lease.
 * - reclaim() succeeds ONLY when the existing lease is provably expired
 *   (monotonic Date.now() past expiresAt). Reclaiming an active lease
 *   throws LeaseActiveError — never steal live work.
 * - Every reclaim records the preemption (previous holder, when it expired),
 *   so a returning worker can discover it was preempted instead of
 *   double-executing.
 *
 * The clock is injectable for deterministic tests; default is Date.now().
 * This is a test-simulation primitive: production leases need durable
 * backing (the gauntlet owns that); the expiry/reclaim SEMANTICS are what's
 * under test here.
 *
 * Gates failure classes:
 *   FC-20260923-007  lease expires mid-work (reclaim only after provable expiry)
 */

export class LeaseActiveError extends Error {
  readonly unitId: string;
  readonly holder: string;
  readonly expiresAt: number;
  constructor(unitId: string, holder: string, expiresAt: number) {
    super(
      `lease active: unit ${unitId} held by ${holder} until ${new Date(expiresAt).toISOString()}; ` +
        `reclaim refused`,
    );
    this.name = 'LeaseActiveError';
    this.unitId = unitId;
    this.holder = holder;
    this.expiresAt = expiresAt;
  }
}

export class LeaseNotHeldError extends Error {
  constructor(unitId: string, workerId: string, why: string) {
    super(`lease not held: unit ${unitId} worker ${workerId}: ${why}`);
    this.name = 'LeaseNotHeldError';
  }
}

export interface LeaseRecord {
  unitId: string;
  holder: string;
  acquiredAt: number;
  expiresAt: number;
  version: number;
}

export interface PreemptionRecord {
  unitId: string;
  previousHolder: string;
  expiredAt: number;
  reclaimedBy: string;
  reclaimedAt: number;
}

export class LeaseManager {
  private readonly leases = new Map<string, LeaseRecord>();
  private readonly preemptions: PreemptionRecord[] = [];
  private readonly now: () => number;

  constructor(opts: { now?: () => number } = {}) {
    this.now = opts.now ?? Date.now;
  }

  acquire(unitId: string, holder: string, ttlMs: number): LeaseRecord {
    const cur = this.leases.get(unitId);
    if (cur && !this.isExpired(cur)) {
      if (cur.holder === holder) {
        throw new LeaseNotHeldError(unitId, holder, 'already held by you; use renew()');
      }
      throw new LeaseActiveError(unitId, cur.holder, cur.expiresAt);
    }
    const rec: LeaseRecord = {
      unitId,
      holder,
      acquiredAt: this.now(),
      expiresAt: this.now() + ttlMs,
      version: (cur?.version ?? 0) + 1,
    };
    this.leases.set(unitId, rec);
    return { ...rec };
  }

  renew(unitId: string, holder: string, ttlMs: number): LeaseRecord {
    const cur = this.leases.get(unitId);
    if (!cur) throw new LeaseNotHeldError(unitId, holder, 'no lease exists');
    if (cur.holder !== holder) {
      if (!this.isExpired(cur)) throw new LeaseActiveError(unitId, cur.holder, cur.expiresAt);
      throw new LeaseNotHeldError(unitId, holder, `lease expired under ${cur.holder}; use reclaim()`);
    }
    if (this.isExpired(cur)) {
      throw new LeaseNotHeldError(unitId, holder, 'your lease expired; re-acquire or reclaim');
    }
    const rec: LeaseRecord = { ...cur, expiresAt: this.now() + ttlMs, version: cur.version + 1 };
    this.leases.set(unitId, rec);
    return { ...rec };
  }

  /**
   * Take over a unit whose lease provably expired. Active leases are never
   * stolen. The preemption is recorded for the displaced worker to discover.
   */
  reclaim(unitId: string, newHolder: string): { lease: LeaseRecord; preempted: PreemptionRecord | null } {
    const cur = this.leases.get(unitId);
    if (cur && !this.isExpired(cur)) {
      throw new LeaseActiveError(unitId, cur.holder, cur.expiresAt);
    }
    const now = this.now();
    const preempted: PreemptionRecord | null = cur
      ? { unitId, previousHolder: cur.holder, expiredAt: cur.expiresAt, reclaimedBy: newHolder, reclaimedAt: now }
      : null;
    if (preempted) this.preemptions.push(preempted);
    const lease: LeaseRecord = {
      unitId,
      holder: newHolder,
      acquiredAt: now,
      expiresAt: now + 0, // caller must acquire() with a real TTL next; reclaim alone grants no time
      version: (cur?.version ?? 0) + 1,
    };
    this.leases.delete(unitId);
    return { lease: { ...lease }, preempted };
  }

  release(unitId: string, holder: string): void {
    const cur = this.leases.get(unitId);
    if (!cur) return;
    if (cur.holder !== holder) throw new LeaseNotHeldError(unitId, holder, `held by ${cur.holder}`);
    this.leases.delete(unitId);
  }

  isExpired(rec: LeaseRecord): boolean {
    return this.now() >= rec.expiresAt;
  }

  get(unitId: string): LeaseRecord | null {
    const cur = this.leases.get(unitId);
    return cur ? { ...cur } : null;
  }

  /** Preemptions a returning worker can consult to learn it was displaced. */
  preemptionsFor(previousHolder: string): PreemptionRecord[] {
    return this.preemptions.filter((p) => p.previousHolder === previousHolder).map((p) => ({ ...p }));
  }
}
