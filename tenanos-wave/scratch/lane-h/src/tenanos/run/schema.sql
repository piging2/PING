-- TenantOS run substrate — additive schema (swarm-11).
-- New tables only. No ALTER to ping_missions / ping_events / mission_executions.
-- Addresses STATE-MACHINE-MAP.md gap R1 (no durable NEEDS_RECONCILIATION /
-- UNKNOWN_EXECUTION record).
--
-- SEAM NOTE (P-20260923-002, binding): Run/Attempt identity + journal is owned
-- by src/tenanos/runs/schema.ts (002). This file intentionally defines NO
-- attempt-identity table: tenanos_run_attempts was narrowed out at write time
-- (P-20260923-095) so this proposal does not create a second run-identity
-- store. Only the reconciliation queue lives here.

-- Durable reconciliation queue. Rows enter here when a run projects to
-- UNKNOWN_EXECUTION (never silently back to PENDING). The reconciler drains
-- it via classifyUnknownExecution(); every drain writes a MISSION_RECONCILED
-- event into ping_events through the existing UnifiedEventRuntime.
CREATE TABLE IF NOT EXISTS tenanos_reconciliation_queue (
  mission_id   TEXT PRIMARY KEY,
  from_state   TEXT NOT NULL,
  enqueued_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_refs JSONB NOT NULL DEFAULT '[]',
  resolved_at  TIMESTAMPTZ,
  resolution   TEXT
               CHECK (resolution IS NULL OR resolution IN (
                 'MARK_SUCCEEDED_FROM_EVIDENCE','REQUEUE_AS_PENDING',
                 'RETRY_ATTEMPT_WITH_LINEAGE','HOLD_NEEDS_RECONCILIATION'))
);
