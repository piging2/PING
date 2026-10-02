/**
 * Run identity + journal vocabulary — TenantOS execution substrate (swarm-14, P-20260923-002).
 *
 * SINGLE ownership point for durable per-attempt Run identity and the journal
 * entry vocabulary (Restate pattern: pattern only, BSL-1.1).
 *
 * Binding seams (do not duplicate; see STATE.json):
 *   - P-20260923-095 (swarm-11) owns the canonical run-state VOCABULARY
 *     (CanonicalRunState), the projection, the transition guard, the
 *     reconciliation classifier, and tenanos_reconciliation_queue.
 *     This module restores 095's ORIGINAL base-table columns (attempt_id,
 *     mission_id, attempt_number, worker_name, started_at, ended_at,
 *     outcome, evidence_refs) because 095's schema.sql was narrowed at write
 *     time to the reconciliation queue only (binding seam note in
 *     src/tenanos/run/schema.sql @ db80f142) and nothing else creates the
 *     base table 103's ALTERs extend.
 *   - P-20260923-103 (swarm-02) owns the fencing MECHANICS columns on this
 *     table (fencing_token, status, lease_until, checkpoint_seq,
 *     input_digest) plus tenanos_attempt_checkpoints. This CREATE
 *     deliberately OMITS those columns; 103's idempotent ALTERs apply on
 *     top. Do not add them here.
 *   - P-20260923-092 (swarm-01) owns tenant-context propagation. This module
 *     adds the tenant_id COLUMN the attempt record was missing and consumes
 *     tenant identity; it does not redefine tenant semantics.
 *
 * Identity note: the proposal's `run_id (uuidv7)` is realized AS
 * `attempt_id` (single primary key). 103 pins "attempt_id is the PK" in
 * interpretFenceResult and resolves short-refs against it; a second identity
 * column would be a competing identity. The column is TEXT so both uuidv7
 * and short-ref encodings are representable.
 *
 * Journal vs checkpoints: this module's tenanos_run_journal is the
 * append-only execution log (every effectful step: input/output/state/
 * call/sleep/awaitable). 103's tenanos_attempt_checkpoints are coarse resume
 * pointers into a running attempt. Different tables, different purposes.
 *
 * PING ping_events stays the canonical event journal; this run journal is
 * the execution substrate's durable step log, not an event authority.
 */

/** 095's outcome vocabulary, stored on the base attempt row. */
export const RunOutcome = Object.freeze({
  STARTED: 'started',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
} as const);
export type RunOutcome = (typeof RunOutcome)[keyof typeof RunOutcome];

/** Journal entry vocabulary (Restate pattern). */
export const JournalEntryKind = Object.freeze({
  INPUT: 'input',
  OUTPUT: 'output',
  STATE: 'state',
  CALL: 'call',
  SLEEP: 'sleep',
  AWAITABLE: 'awaitable',
} as const);
export type JournalEntryKind = (typeof JournalEntryKind)[keyof typeof JournalEntryKind];

/** Durable per-attempt Run row (base columns; 103 adds mechanics via ALTER). */
export interface RunRow {
  /** Durable per-attempt identity (proposal's run_id, realized as attempt_id). */
  attempt_id: string;
  /** Tenant scoping (novel vs 095/103: attempt records had no tenant column). */
  tenant_id: string;
  mission_id: string;
  attempt_number: number;
  worker_name: string | null;
  started_at: string;
  ended_at: string | null;
  /** 095's outcome vocabulary; 103's finer status projects onto this. */
  outcome: RunOutcome;
  evidence_refs: unknown[];
  /** Pointer to this attempt's journal head; null until the first entry. */
  journal_ref: string | null;
}

/** One append-only journal entry for an attempt's execution log. */
export interface JournalEntry {
  journal_ref: string;
  /** Monotonic per journal_ref; 0-based. */
  seq: number;
  kind: JournalEntryKind;
  /** Effect payload refs; never inline secrets (002 proposal contract). */
  payload: Record<string, unknown>;
  recorded_at: string;
}

/**
 * Base identity table. Idempotent; applies BEFORE 103's
 * schema-attempt-fencing.sql ALTERs. New tables only.
 */
export const RUN_IDENTITY_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS tenanos_run_attempts (
  attempt_id   TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  mission_id   TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  worker_name  TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  outcome      TEXT NOT NULL DEFAULT 'started'
               CHECK (outcome IN ('started','succeeded','failed','unknown')),
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  journal_ref  TEXT,
  UNIQUE (mission_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_tra_mission ON tenanos_run_attempts(mission_id);
CREATE INDEX IF NOT EXISTS idx_tra_tenant ON tenanos_run_attempts(tenant_id);`;

/**
 * Journal vocabulary table (Restate pattern). (journal_ref, seq) is the PK:
 * a replayed entry INSERT conflicts instead of rewriting history.
 */
export const RUN_JOURNAL_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS tenanos_run_journal (
  journal_ref TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  kind        TEXT NOT NULL
              CHECK (kind IN ('input','output','state','call','sleep','awaitable')),
  payload     JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (journal_ref, seq)
);
CREATE INDEX IF NOT EXISTS idx_trj_ref ON tenanos_run_journal(journal_ref);`;

/** Deterministic journal head ref for an attempt. No randomness required. */
export function mintJournalRef(attemptId: string): string {
  if (!attemptId) throw new Error('mintJournalRef: attemptId required');
  return `jrnl:${attemptId}`;
}

export function isJournalEntryKind(value: unknown): value is JournalEntryKind {
  return (
    typeof value === 'string' &&
    (Object.values(JournalEntryKind) as string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Fail-closed journal entry validation. Throws on unknown kind, negative or
 * non-integer seq, or non-object payload.
 */
export function validateJournalEntry(entry: unknown): JournalEntry {
  if (!isRecord(entry)) throw new Error('validateJournalEntry: entry must be an object');
  const { journal_ref, seq, kind, payload } = entry;
  if (typeof journal_ref !== 'string' || journal_ref.length === 0) {
    throw new Error('validateJournalEntry: journal_ref required');
  }
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
    throw new Error('validateJournalEntry: seq must be a non-negative integer');
  }
  if (!isJournalEntryKind(kind)) {
    throw new Error(`validateJournalEntry: unknown kind ${String(kind)}`);
  }
  if (!isRecord(payload)) {
    throw new Error('validateJournalEntry: payload must be an object');
  }
  const recorded_at = entry['recorded_at'];
  return {
    journal_ref,
    seq,
    kind,
    payload,
    recorded_at: typeof recorded_at === 'string' ? recorded_at : new Date().toISOString(),
  };
}

/** Next journal seq after the last accepted seq (monotonic, A-4 analog). */
export function nextJournalSeq(lastAcceptedSeq: number): number {
  if (!Number.isInteger(lastAcceptedSeq) || lastAcceptedSeq < -1) {
    throw new Error('nextJournalSeq: lastAcceptedSeq must be an integer >= -1');
  }
  return lastAcceptedSeq + 1;
}

/** Fail-closed Run row validation (base columns only; 103 validates its own). */
export function validateRunRow(row: unknown): RunRow {
  if (!isRecord(row)) throw new Error('validateRunRow: row must be an object');
  const r = row as Record<string, unknown>;
  for (const f of ['attempt_id', 'tenant_id', 'mission_id'] as const) {
    if (typeof r[f] !== 'string' || (r[f] as string).length === 0) {
      throw new Error(`validateRunRow: ${f} required`);
    }
  }
  if (typeof r['attempt_number'] !== 'number' || !Number.isInteger(r['attempt_number'])) {
    throw new Error('validateRunRow: attempt_number must be an integer');
  }
  const outcome = r['outcome'];
  if (
    outcome !== RunOutcome.STARTED &&
    outcome !== RunOutcome.SUCCEEDED &&
    outcome !== RunOutcome.FAILED &&
    outcome !== RunOutcome.UNKNOWN
  ) {
    throw new Error(`validateRunRow: unknown outcome ${String(outcome)}`);
  }
  if (r['evidence_refs'] !== undefined && !Array.isArray(r['evidence_refs'])) {
    throw new Error('validateRunRow: evidence_refs must be an array');
  }
  return {
    attempt_id: r['attempt_id'] as string,
    tenant_id: r['tenant_id'] as string,
    mission_id: r['mission_id'] as string,
    attempt_number: r['attempt_number'] as number,
    worker_name: typeof r['worker_name'] === 'string' ? (r['worker_name'] as string) : null,
    started_at: typeof r['started_at'] === 'string' ? (r['started_at'] as string) : new Date().toISOString(),
    ended_at: typeof r['ended_at'] === 'string' ? (r['ended_at'] as string) : null,
    outcome: outcome as RunOutcome,
    evidence_refs: Array.isArray(r['evidence_refs']) ? (r['evidence_refs'] as unknown[]) : [],
    journal_ref: typeof r['journal_ref'] === 'string' ? (r['journal_ref'] as string) : null,
  };
}
