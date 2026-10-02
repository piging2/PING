/**
 * Run Reconciler — TenantOS execution substrate (swarm-11).
 *
 * Implements the KILL-BATTERY.md "Reconciliation procedure" as an idempotent
 * adapter over the EXISTING substrate. Authority check:
 *
 * - It does NOT re-implement MissionRuntime, WorkerRuntime, or the event
 *   authority. All state writes go through the injected MissionStore port
 *   (whose production adapter delegates to the existing MissionRuntime SQL).
 * - It does NOT emit events directly: classifications are published through
 *   the injected emit() — the existing UnifiedEventRuntime in production.
 * - It is read-mostly: projection + evidence gathering are pure reads;
 *   the pass is idempotent (same evidence -> same directive, KB-05).
 *
 * Crash windows healed: scheduler death (KB-03), worker death after effect
 * (KB-02), lost ack after effect (KB-04), gateway restart (KB-05).
 */

import {
  CanonicalRunState,
  Classification,
  classifyUnknownExecution,
  MissionRow,
  projectMission,
  ReconcileDirective,
  RunAttempt,
} from './run-state-authority';

/** Minimal port the reconciler needs. Production adapter delegates to the
 *  existing MissionRuntime / ping tables (no new authority). */
export interface MissionStore {
  /** All rows not in a terminal state (created/assigned/running/retry_pending). */
  getNonTerminal(): Promise<MissionRow[]>;
  /** Durable evidence for one mission (read-only). */
  getEvidence(missionId: string): Promise<ReconciliationEvidenceInput>;
  /** Mark succeeded with reconciled result (delegates to MissionRuntime.complete). */
  markSucceeded(missionId: string, result: Record<string, unknown>): Promise<void>;
  /** Return to created with attempt lineage (mirrors reapExpiredLeases' guarded reset). */
  resetToCreated(missionId: string, reason: string): Promise<void>;
  /** Record a per-attempt row (tenanos_run_attempts). */
  recordAttempt(attempt: RunAttempt): Promise<void>;
  /** Enqueue / resolve the durable reconciliation queue (tenanos_reconciliation_queue). */
  enqueueReconciliation(missionId: string, fromState: string, evidenceRefs: string[]): Promise<void>;
  resolveReconciliation(missionId: string, resolution: string): Promise<void>;
}

export interface ReconciliationEvidenceInput {
  effectProven: boolean;
  effectAbsent: boolean;
  attemptStarted: boolean;
  refs: string[];
}

/** Event sink: the existing UnifiedEventRuntime.emit in production. */
export type EmitEvent = (eventType: string, source: string, payload: Record<string, unknown>) => Promise<void>;

export interface ReconcileReport {
  scanned: number;
  enqueued: number;
  markedSucceeded: number;
  requeued: number;
  retriedWithLineage: number;
  held: number;
  errors: Array<{ mission_id: string; error: string }>;
}

const EMPTY: ReconcileReport = {
  scanned: 0, enqueued: 0, markedSucceeded: 0, requeued: 0,
  retriedWithLineage: 0, held: 0, errors: [],
};

/**
 * One reconciliation pass. Run at scheduler startup (before first dispatch)
 * and on a bounded periodic cadence. Safe to re-run after a crash mid-pass.
 */
export async function reconcileOnce(
  store: MissionStore,
  emit: EmitEvent,
  now: number = Date.now(),
): Promise<ReconcileReport> {
  const report: ReconcileReport = { ...EMPTY, errors: [] };
  let rows: MissionRow[];
  try {
    rows = await store.getNonTerminal();
  } catch (err) {
    throw new Error(`reconcileOnce: getNonTerminal failed: ${(err as Error).message}`);
  }
  report.scanned = rows.length;

  for (const row of rows) {
    try {
      const canonical = projectMission(row, now);
      if (canonical !== CanonicalRunState.UNKNOWN_EXECUTION) continue;

      // Step 2: durable enqueue (idempotent by PRIMARY KEY on mission_id).
      await store.enqueueReconciliation(row.mission_id, row.status, []);
      report.enqueued++;

      // Step 3: gather evidence (read-only).
      const evidence = await store.getEvidence(row.mission_id);

      // Step 4: classify (pure).
      const classification: Classification = classifyUnknownExecution(evidence);

      // Step 5: apply the directive — never re-execute when forbidden.
      switch (classification.directive) {
        case ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE: {
          await store.markSucceeded(row.mission_id, {
            reconciled_from_evidence: true,
            evidence_refs: evidence.refs,
          });
          await store.resolveReconciliation(row.mission_id, classification.directive);
          report.markedSucceeded++;
          break;
        }
        case ReconcileDirective.REQUEUE_AS_PENDING: {
          await store.recordAttempt(newAttempt(row, 'unknown', evidence.refs));
          await store.resetToCreated(row.mission_id, 'reconciler: effect provably absent, never started');
          await store.resolveReconciliation(row.mission_id, classification.directive);
          report.requeued++;
          break;
        }
        case ReconcileDirective.RETRY_ATTEMPT_WITH_LINEAGE: {
          await store.recordAttempt(newAttempt(row, 'unknown', evidence.refs));
          await store.resetToCreated(row.mission_id, 'reconciler: attempt began, effect provably absent');
          await store.resolveReconciliation(row.mission_id, classification.directive);
          report.retriedWithLineage++;
          break;
        }
        case ReconcileDirective.HOLD_NEEDS_RECONCILIATION: {
          // Leave queued; surface for Mission Control / human resolution.
          // Coordinates with swarm 10 (human decision budget) — the hold is
          // the BLOCKED-adjacent state, never a silent requeue.
          report.held++;
          break;
        }
      }

      // Step 6: evidence event through the EXISTING event authority.
      await emit('MISSION_RECONCILED', 'tenanos-run-reconciler', {
        mission_id: row.mission_id,
        from: row.status,
        canonical_from: CanonicalRunState.UNKNOWN_EXECUTION,
        directive: classification.directive,
        reexecute: classification.reexecute,
        evidence_refs: evidence.refs,
      });
    } catch (err) {
      report.errors.push({ mission_id: row.mission_id, error: (err as Error).message });
    }
  }
  return report;
}

function newAttempt(
  row: MissionRow,
  outcome: RunAttempt['outcome'],
  evidenceRefs: string[],
): RunAttempt {
  const attemptNumber = (row.retries ?? 0) + 1;
  return {
    attempt_id: `${row.mission_id}:a${attemptNumber}`,
    mission_id: row.mission_id,
    attempt_number: attemptNumber,
    worker_name: row.assigned_to ?? null,
    started_at: new Date().toISOString(),
    ended_at: null,
    outcome,
    evidence_refs: evidenceRefs,
  };
}

/**
 * Startup hook contract for the scheduler bootstrap. The replacement MUST
 * call this before its first dispatch (KILL-BATTERY.md procedure steps 1-7).
 * `setDispatchFrozen` is provided by the scheduler; while frozen, getPending
 * returns nothing.
 */
export async function reconcileAtStartup(
  store: MissionStore,
  emit: EmitEvent,
  setDispatchFrozen: (frozen: boolean) => void,
): Promise<ReconcileReport> {
  setDispatchFrozen(true);
  try {
    return await reconcileOnce(store, emit);
  } finally {
    setDispatchFrozen(false);
  }
}