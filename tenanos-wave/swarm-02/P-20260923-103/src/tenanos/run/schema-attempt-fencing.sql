-- TenantOS attempt fencing — additive schema (swarm-02, P-20260923-103).
--
-- Extends P-20260923-095's tenanos_run_attempts (swarm-11 owns the base
-- table: attempt_id, mission_id, attempt_number, worker_name, started_at,
-- ended_at, outcome, evidence_refs). This file owns ONLY the fencing
-- mechanics columns. Applies AFTER P-20260923-095 integrates.
-- Every statement is idempotent (IF NOT EXISTS) so re-application is safe.
--
-- Design notes:
--   fencing_token  — random secret minted per claim. On supersede/timeout
--                     the token is ROTATED; the zombie attempt's writes
--                     carry the old token and match zero rows (A-1).
--   status         — finer-grained than 095's `outcome`. outcome is a
--                     projection: created/claimed/running->'started',
--                     completed->'succeeded', failed->'failed',
--                     timed_out/stale->'unknown'. The projection lives in
--                     attempt-fencing.ts projectAttemptOutcome(); the CHECK
--                     here is the SQL-level backstop.
--   lease_until    — per-attempt lease. A coordinator crash leaves the
--                     attempt row (not just the mission row) lease-stamped,
--                     so a replacement coordinator can distinguish
--                     "zombie attempt" from "live attempt".
--   checkpoint_seq — last accepted checkpoint seq; the writer's INSERT
--                     carries seq = checkpoint_seq + 1 under the fencing
--                     token (monotonic, A-4).
--   input_digest   — hash of the attempt input; retries with lineage
--                     (RETRY_ATTEMPT_WITH_LINEAGE) carry the prior digest
--                     so the worker can detect duplicate delivery.

ALTER TABLE tenanos_run_attempts
  ADD COLUMN IF NOT EXISTS fencing_token TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created','claimed','running','completed','failed','timed_out','stale'
    )),
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkpoint_seq INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS input_digest TEXT;

CREATE INDEX IF NOT EXISTS idx_tra_fence
  ON tenanos_run_attempts (mission_id, status);

-- Attempt checkpoints: resume points inside a running attempt.
-- (attempt_id, seq) is the PK; a replayed checkpoint INSERT conflicts
-- instead of rewriting history. Checkpoint writes MUST carry the
-- fencing token in a join-guarded INSERT:
--
--   INSERT INTO tenanos_attempt_checkpoints (attempt_id, seq, kind, payload)
--   SELECT $1, $2, $3, $4
--   WHERE EXISTS (
--     SELECT 1 FROM tenanos_run_attempts
--     WHERE attempt_id = $1 AND fencing_token = $5 AND status = 'running'
--   );
--
-- A zombie attempt's checkpoint matches zero rows (A-1, A-4).
CREATE TABLE IF NOT EXISTS tenanos_attempt_checkpoints (
  attempt_id TEXT NOT NULL
    REFERENCES tenanos_run_attempts (attempt_id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (attempt_id, seq)
);
