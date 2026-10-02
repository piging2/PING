/**
 * Rate-limit lease manager.
 *
 * The lease is the primitive every connector currently hand-rolls: a bounded,
 * exactly-one-claimant claim on a capability for a TTL. Claimants that die
 * holding a lease cannot wedge the capability: expiry reaps the lease, and
 * the receipt log (not the lease manager) owns the UNKNOWN-vs-FAILED
 * distinction.
 *
 * Invariants:
 * - At most one ACTIVE (unexpired) lease per (capability, scope).
 * - claim() returns null when a live lease exists; it never queues, never
 *   blocks, never retries. Callers fail closed or try another strategy.
 * - Expired leases are reaped lazily on claim/release and via reap().
 * - Lease tokens are unforgeable within a manager instance (monotonic seq).
 */

import { Lease } from "./types";

export class LeaseManager {
  private leases = new Map<string, Lease>();
  private seq = 0;
  /** Test seam: override the clock. */
  now: () => number = () => Date.now();

  private key(capability: string, scope: string): string {
    return `${capability}::${scope}`;
  }

  /**
   * Attempt to claim a lease. Returns the lease, or null if the capability
   * is currently leased in this scope. Never throws for contention.
   */
  claim(capability: string, holder: string, ttlMs: number, scope = "default"): Lease | null {
    if (ttlMs <= 0) throw new Error("ttlMs must be positive");
    const k = this.key(capability, scope);
    const existing = this.leases.get(k);
    if (existing && existing.expiresAt > this.now()) {
      return null;
    }
    const t = this.now();
    const lease: Lease = {
      token: `lease-${capability}-${scope}-${this.seq++}`,
      capability,
      holder,
      claimedAt: t,
      expiresAt: t + ttlMs,
    };
    this.leases.set(k, lease);
    return lease;
  }

  /** Release a lease by token. Unknown/expired tokens are a silent no-op. */
  release(token: string): boolean {
    for (const [k, lease] of this.leases) {
      if (lease.token === token) {
        this.leases.delete(k);
        return true;
      }
    }
    return false;
  }

  /** The active lease for a capability/scope, or null. Reaps expired first. */
  active(capability: string, scope = "default"): Lease | null {
    const k = this.key(capability, scope);
    const lease = this.leases.get(k);
    if (!lease) return null;
    if (lease.expiresAt <= this.now()) {
      this.leases.delete(k);
      return null;
    }
    return lease;
  }

  /** Reap all expired leases. Returns the count reaped. */
  reap(): number {
    const t = this.now();
    let n = 0;
    for (const [k, lease] of this.leases) {
      if (lease.expiresAt <= t) {
        this.leases.delete(k);
        n++;
      }
    }
    return n;
  }

  /** For tests: how many leases are currently tracked (incl. expired). */
  tracked(): number {
    return this.leases.size;
  }
}
