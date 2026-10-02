/**
 * Atomic tenant-scoped task claim with attach-to-winner — TenantOS execution
 * substrate (swarm-14, P-20260923-003; Hatchet pattern).
 *
 * SINGLE ownership point for the claim election mechanism: exactly one
 * claimant wins a (tenant_id, key); losers attach to the winner (they learn
 * the winner's holder instead of failing blind).
 *
 * Binding seams (do not duplicate; see STATE.json):
 *   - P-20260923-092 (swarm-01) owns tenant-context propagation
 *     (src/tenanos/tenant/). Claims are tenant-scoped (tenant_id is in the
 *     PK and every predicate); this module consumes tenant identity, it does
 *     not redefine it.
 *   - P-20260923-013 (swarm-14) owns recovery: the recoverer enqueues a
 *     redrive as a new Run; THIS module elects the runner ("Lane 2 claim
 *     elects runner").
 *   - P-20260923-006 (swarm-14) owns the overdue predicate, wired into
 *     status-read and claim paths; it consumes claim state, not the
 *     mechanism.
 *   - P-20260923-106 (gateway, R-13) owns the legacy JS MissionScheduler
 *     claim path in /home/nolan/ping. Different repo, different layer; not
 *     a competing authority.
 *
 * Contract: single-statement claim. The row is locked (ORDER BY
 * (tenant_id, key) FOR UPDATE — the deadlock-avoidance order for multi-key
 * batches, which callers must issue in that order); a row is claimable iff
 * absent or expired; ON CONFLICT DO UPDATE fires only when claimable;
 * the statement returns won + holder (+ fencing token, + lease).
 */

export interface ClaimRequest {
  tenant_id: string;
  /** Task key, unique within the tenant (e.g. queue item id). */
  key: string;
  /** This claimant's holder label (worker/scheduler identity). */
  holder: string;
  /** Caller-minted fencing token bound to this claim. */
  fencingToken: string;
  /** Lease duration in seconds. Must be > 0. */
  ttlSeconds: number;
}

export interface ClaimRow {
  tenant_id: string;
  key: string;
  holder: string;
  fencingToken: string;
  leaseUntilMs: number;
}

export interface ClaimResult {
  /** True iff this claimant won the claim (inserted or re-claimed expired). */
  won: boolean;
  /** Winner's holder. Losers attach to the winner via this value. */
  holder: string;
  fencingToken: string;
  leaseUntilMs: number;
}

export const CLAIM_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS tenanos_task_claims (
  tenant_id     TEXT NOT NULL,
  key           TEXT NOT NULL,
  holder        TEXT NOT NULL,
  fencing_token TEXT NOT NULL,
  lease_until   TIMESTAMPTZ NOT NULL,
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_ttc_lease ON tenanos_task_claims(lease_until);`;

/**
 * Single-statement claim.
 *
 * Params: $1 tenant_id, $2 key, $3 holder, $4 fencing_token, $5 ttl_seconds.
 *
 * The `locked` CTE takes the row lock in (tenant_id, key) order (deadlock
 * avoidance for batch claimants). The `upserted` CTE inserts, or updates
 * only when the existing lease has expired (WHERE lease_until <= NOW()).
 * Winners come back with won=TRUE; losers fall through to the second leg
 * and receive the live winner's holder/fencing_token with won=FALSE
 * (attach-to-winner).
 */
export const CLAIM_SQL = `WITH locked AS (
  SELECT tenant_id, key, holder, fencing_token, lease_until
  FROM tenanos_task_claims
  WHERE tenant_id = $1 AND key = $2
  ORDER BY tenant_id, key
  FOR UPDATE
),
upserted AS (
  INSERT INTO tenanos_task_claims (tenant_id, key, holder, fencing_token, lease_until, claimed_at)
  VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5), NOW())
  ON CONFLICT (tenant_id, key) DO UPDATE SET
    holder = EXCLUDED.holder,
    fencing_token = EXCLUDED.fencing_token,
    lease_until = EXCLUDED.lease_until,
    claimed_at = NOW()
  WHERE tenanos_task_claims.lease_until <= NOW()
  RETURNING holder, fencing_token, lease_until
)
SELECT holder, fencing_token, lease_until, TRUE AS won FROM upserted
UNION ALL
SELECT l.holder, l.fencing_token, l.lease_until, FALSE AS won FROM locked l
WHERE NOT EXISTS (SELECT 1 FROM upserted)`;

/** Claimable iff the row is absent or its lease has expired (boundary: <= now). */
export function isClaimable(row: ClaimRow | null, nowMs: number): boolean {
  if (row === null) return true;
  return row.leaseUntilMs <= nowMs;
}

function requireNonEmpty(name: string, value: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`claim: ${name} required`);
  }
}

/** Fail-closed request validation. */
export function validateClaimRequest(req: ClaimRequest): ClaimRequest {
  requireNonEmpty('tenant_id', req.tenant_id);
  requireNonEmpty('key', req.key);
  requireNonEmpty('holder', req.holder);
  requireNonEmpty('fencingToken', req.fencingToken);
  if (typeof req.ttlSeconds !== 'number' || !(req.ttlSeconds > 0)) {
    throw new Error('claim: ttlSeconds must be > 0');
  }
  return req;
}

interface ClaimSqlRow {
  holder: string;
  fencing_token: string;
  lease_until: Date | string | number;
  won: boolean;
}

function leaseToMs(v: Date | string | number): number {
  if (typeof v === 'number') return v;
  const ms = new Date(v).getTime();
  if (Number.isNaN(ms)) throw new Error('interpretClaimRows: unparsable lease_until');
  return ms;
}

/**
 * Map the CLAIM_SQL result rows to a ClaimResult. Exactly one row is
 * expected (the UNION ALL legs are mutually exclusive); zero rows is an
 * impossible state and fails closed.
 */
export function interpretClaimRows(rows: ClaimSqlRow[]): ClaimResult {
  if (rows.length !== 1) {
    throw new Error(`interpretClaimRows: expected exactly 1 row, got ${rows.length}`);
  }
  const r = rows[0];
  requireNonEmpty('holder', r.holder);
  requireNonEmpty('fencing_token', r.fencing_token);
  return {
    won: r.won === true,
    holder: r.holder,
    fencingToken: r.fencing_token,
    leaseUntilMs: leaseToMs(r.lease_until),
  };
}

/**
 * In-memory claim store executing the same atomic decision semantics as
 * CLAIM_SQL (single-threaded: each claim() call is atomic). For tests and
 * for consumers without a database; the SQL text is the production enforcer.
 */
export class MemoryClaimStore {
  private readonly rows = new Map<string, ClaimRow>();

  private static mapKey(tenant_id: string, key: string): string {
    return `${tenant_id}\n${key}`;
  }

  claim(req: ClaimRequest, nowMs: number): ClaimResult {
    validateClaimRequest(req);
    const mk = MemoryClaimStore.mapKey(req.tenant_id, req.key);
    const row = this.rows.get(mk) ?? null;
    if (isClaimable(row, nowMs)) {
      const next: ClaimRow = {
        tenant_id: req.tenant_id,
        key: req.key,
        holder: req.holder,
        fencingToken: req.fencingToken,
        leaseUntilMs: nowMs + req.ttlSeconds * 1000,
      };
      this.rows.set(mk, next);
      return { won: true, holder: next.holder, fencingToken: next.fencingToken, leaseUntilMs: next.leaseUntilMs };
    }
    // Attach-to-winner: the loser learns the live winner's holder.
    const live = row as ClaimRow;
    return { won: false, holder: live.holder, fencingToken: live.fencingToken, leaseUntilMs: live.leaseUntilMs };
  }

  /** Test/introspection only: read the stored row, if any. */
  peek(tenant_id: string, key: string): ClaimRow | null {
    return this.rows.get(MemoryClaimStore.mapKey(tenant_id, key)) ?? null;
  }
}
