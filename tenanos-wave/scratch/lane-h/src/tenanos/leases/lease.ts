/**
 * P0 holder+fencing-token CAS lease renewal — TenantOS execution substrate
 * (swarm-14, P-20260923-004; Hatchet LeaseManager pattern).
 *
 * SINGLE ownership point for tenant-scoped HOLDER-EXCLUSION leases:
 * acquire / renew / release / steal-on-expiry over lease kinds
 * run | worker | queue. The renewal UPDATE predicates on
 * (tenant_id, kind, subject_id, holder, fencing_token); zero matched rows
 * means the caller is fenced out and must STOP — never treat as success.
 *
 * Binding seams (do not duplicate; see STATE.json):
 *   - P-20260923-103 (swarm-02) owns per-attempt WRITE fencing: the
 *     fenced-write contract on tenanos_run_attempts (conditional UPDATE
 *     carrying fencing_token; token rotation on supersede; zombie-write
 *     discipline). That is write discipline. THIS module is holder exclusion
 *     over time (who may extend a lease). Different mechanisms; 103's
 *     lease_until column is a zombie-detection signal with no renewal
 *     semantics, this module supplies the renewal path.
 *   - Run-kind leases bind their subject_id to tenanos_run_attempts
 *     .attempt_id (103's identity). No parallel run identity is introduced.
 *   - P-20260923-106/107/108 (gateway repo, /home/nolan/ping) own the legacy
 *     mission-lease P0s on ping_missions (holder-bound renewLease R-12,
 *     abort-on-steal R-13, fencing_token column R-14). Mission granularity,
 *     no tenant column. This module is the substrate counterpart:
 *     tenant-scoped run/worker/queue granularity, new store. Same safety
 *     property, different layer — convergence, not duplication.
 */

export const LeaseKind = Object.freeze({
  RUN: 'run',
  WORKER: 'worker',
  QUEUE: 'queue',
} as const);
export type LeaseKind = (typeof LeaseKind)[keyof typeof LeaseKind];

export interface LeaseRow {
  tenant_id: string;
  kind: LeaseKind;
  /** Lease subject: run-kind => tenanos_run_attempts.attempt_id. */
  subject_id: string;
  holder: string;
  fencingToken: string;
  expiresAtMs: number;
  acquiredAtMs: number;
}

export interface AcquireRequest {
  tenant_id: string;
  kind: LeaseKind;
  subject_id: string;
  holder: string;
  /** Caller-minted fencing token; rotated on every steal. */
  fencingToken: string;
  ttlSeconds: number;
}

export interface AcquireResult {
  acquired: boolean;
  holder: string;
  fencingToken: string;
  expiresAtMs: number;
}

export type RenewVerdict = 'renewed' | 'fenced-out';
export type ReleaseVerdict = 'released' | 'not-holder';

export const LEASE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS tenanos_leases (
  tenant_id     TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('run','worker','queue')),
  subject_id    TEXT NOT NULL,
  holder        TEXT NOT NULL,
  fencing_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, kind, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_tl_expiry ON tenanos_leases(expires_at);`;

/**
 * P0 renewal: holder+fencing-token CAS. Extends the lease ONLY if the
 * caller is the current holder presenting the current token.
 *
 * Params: $1 tenant_id, $2 kind, $3 subject_id, $4 holder, $5 fencing_token,
 * $6 ttl_seconds.
 *
 * rowCount 1 => renewed. rowCount 0 => fenced out: the lease was stolen,
 * expired, or never existed — the caller MUST stop working the subject.
 */
export const RENEW_SQL = `UPDATE tenanos_leases
SET expires_at = NOW() + make_interval(secs => $6)
WHERE tenant_id = $1
  AND kind = $2
  AND subject_id = $3
  AND holder = $4
  AND fencing_token = $5`;

/**
 * Acquire (or steal-if-expired) in a single statement. Stealing rotates the
 * fencing token: the old holder's subsequent renew matches zero rows.
 *
 * Params: $1 tenant_id, $2 kind, $3 subject_id, $4 holder, $5 fencing_token,
 * $6 ttl_seconds.
 */
export const ACQUIRE_SQL = `WITH upserted AS (
  INSERT INTO tenanos_leases AS l
    (tenant_id, kind, subject_id, holder, fencing_token, expires_at, acquired_at)
  VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(secs => $6), NOW())
  ON CONFLICT (tenant_id, kind, subject_id) DO UPDATE SET
    holder = EXCLUDED.holder,
    fencing_token = EXCLUDED.fencing_token,
    expires_at = EXCLUDED.expires_at,
    acquired_at = NOW()
  WHERE l.expires_at <= NOW()
  RETURNING holder, fencing_token, expires_at
)
SELECT holder, fencing_token, expires_at, TRUE AS acquired FROM upserted
UNION ALL
SELECT holder, fencing_token, expires_at, FALSE AS acquired FROM tenanos_leases
WHERE tenant_id = $1 AND kind = $2 AND subject_id = $3
  AND NOT EXISTS (SELECT 1 FROM upserted)`;

/**
 * Release. Guarded by holder+fencing_token: a non-holder can never release
 * another holder's lease (fail closed).
 *
 * Params: $1 tenant_id, $2 kind, $3 subject_id, $4 holder, $5 fencing_token.
 */
export const RELEASE_SQL = `DELETE FROM tenanos_leases
WHERE tenant_id = $1
  AND kind = $2
  AND subject_id = $3
  AND holder = $4
  AND fencing_token = $5`;

function requireNonEmpty(name: string, value: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`lease: ${name} required`);
  }
}

function requirePositiveTtl(ttlSeconds: number): void {
  if (typeof ttlSeconds !== 'number' || !(ttlSeconds > 0)) {
    throw new Error('lease: ttlSeconds must be > 0');
  }
}

export function isLeaseKind(value: unknown): value is LeaseKind {
  return (
    typeof value === 'string' &&
    (Object.values(LeaseKind) as string[]).includes(value)
  );
}

/** Fail-closed acquire request validation. */
export function validateAcquireRequest(req: AcquireRequest): AcquireRequest {
  requireNonEmpty('tenant_id', req.tenant_id);
  if (!isLeaseKind(req.kind)) throw new Error(`lease: unknown kind ${String(req.kind)}`);
  requireNonEmpty('subject_id', req.subject_id);
  requireNonEmpty('holder', req.holder);
  requireNonEmpty('fencingToken', req.fencingToken);
  requirePositiveTtl(req.ttlSeconds);
  return req;
}

/** Expired iff the lease end is at or before now (boundary: <= now). */
export function isExpired(row: LeaseRow, nowMs: number): boolean {
  return row.expiresAtMs <= nowMs;
}

/**
 * Interpret the RENEW_SQL rowCount. 'fenced-out' means: stop working the
 * subject immediately — the lease moved on (stolen/expired) or never
 * existed. rowCount > 1 is impossible (PK predicate) and throws.
 */
export function interpretRenewResult(rowCount: number): RenewVerdict {
  if (rowCount === 1) return 'renewed';
  if (rowCount === 0) return 'fenced-out';
  throw new Error(`interpretRenewResult: impossible rowCount ${rowCount} — renewal predicate matches at most one row`);
}

/** Interpret the RELEASE_SQL rowCount. Never release another holder's lease. */
export function interpretReleaseResult(rowCount: number): ReleaseVerdict {
  if (rowCount === 1) return 'released';
  if (rowCount === 0) return 'not-holder';
  throw new Error(`interpretReleaseResult: impossible rowCount ${rowCount}`);
}

interface AcquireSqlRow {
  holder: string;
  fencing_token: string;
  expires_at: Date | string | number;
  acquired: boolean;
}

function expiresToMs(v: Date | string | number): number {
  if (typeof v === 'number') return v;
  const ms = new Date(v).getTime();
  if (Number.isNaN(ms)) throw new Error('interpretAcquireRows: unparsable expires_at');
  return ms;
}

/** Map the ACQUIRE_SQL rows (exactly one; the UNION legs are exclusive). */
export function interpretAcquireRows(rows: AcquireSqlRow[]): AcquireResult {
  if (rows.length !== 1) {
    throw new Error(`interpretAcquireRows: expected exactly 1 row, got ${rows.length}`);
  }
  const r = rows[0];
  requireNonEmpty('holder', r.holder);
  requireNonEmpty('fencing_token', r.fencing_token);
  return {
    acquired: r.acquired === true,
    holder: r.holder,
    fencingToken: r.fencing_token,
    expiresAtMs: expiresToMs(r.expires_at),
  };
}

/**
 * In-memory lease store executing the same atomic decision semantics as the
 * SQL texts (single-threaded: each call is atomic). For tests and for
 * consumers without a database; the SQL is the production enforcer.
 */
export class MemoryLeaseStore {
  private readonly rows = new Map<string, LeaseRow>();

  private static mapKey(tenant_id: string, kind: LeaseKind, subject_id: string): string {
    return `${tenant_id}\n${kind}\n${subject_id}`;
  }

  acquire(req: AcquireRequest, nowMs: number): AcquireResult {
    validateAcquireRequest(req);
    const mk = MemoryLeaseStore.mapKey(req.tenant_id, req.kind, req.subject_id);
    const row = this.rows.get(mk);
    if (row !== undefined && !isExpired(row, nowMs)) {
      return { acquired: false, holder: row.holder, fencingToken: row.fencingToken, expiresAtMs: row.expiresAtMs };
    }
    // Absent or expired: (re)acquire with the caller's (possibly rotated) token.
    const next: LeaseRow = {
      tenant_id: req.tenant_id,
      kind: req.kind,
      subject_id: req.subject_id,
      holder: req.holder,
      fencingToken: req.fencingToken,
      expiresAtMs: nowMs + req.ttlSeconds * 1000,
      acquiredAtMs: nowMs,
    };
    this.rows.set(mk, next);
    return { acquired: true, holder: next.holder, fencingToken: next.fencingToken, expiresAtMs: next.expiresAtMs };
  }

  /** P0 path: extend only if holder+token still match. */
  renew(
    tenant_id: string,
    kind: LeaseKind,
    subject_id: string,
    holder: string,
    fencingToken: string,
    ttlSeconds: number,
    nowMs: number,
  ): RenewVerdict {
    requireNonEmpty('tenant_id', tenant_id);
    if (!isLeaseKind(kind)) throw new Error(`lease: unknown kind ${String(kind)}`);
    requireNonEmpty('subject_id', subject_id);
    requireNonEmpty('holder', holder);
    requireNonEmpty('fencingToken', fencingToken);
    requirePositiveTtl(ttlSeconds);
    const row = this.rows.get(MemoryLeaseStore.mapKey(tenant_id, kind, subject_id));
    if (row === undefined) return interpretRenewResult(0);
    if (row.holder !== holder || row.fencingToken !== fencingToken) {
      return interpretRenewResult(0);
    }
    row.expiresAtMs = nowMs + ttlSeconds * 1000;
    return interpretRenewResult(1);
  }

  release(
    tenant_id: string,
    kind: LeaseKind,
    subject_id: string,
    holder: string,
    fencingToken: string,
  ): ReleaseVerdict {
    const mk = MemoryLeaseStore.mapKey(tenant_id, kind, subject_id);
    const row = this.rows.get(mk);
    if (row === undefined || row.holder !== holder || row.fencingToken !== fencingToken) {
      return interpretReleaseResult(0);
    }
    this.rows.delete(mk);
    return interpretReleaseResult(1);
  }

  /** Test/introspection only. */
  peek(tenant_id: string, kind: LeaseKind, subject_id: string): LeaseRow | null {
    return this.rows.get(MemoryLeaseStore.mapKey(tenant_id, kind, subject_id)) ?? null;
  }
}
