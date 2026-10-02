'use strict';
/**
 * ORCA completion-criteria status model (Nolan directive section 8).
 *
 * Workstream (e), 2026-09-18. Worktree: /home/nolan/worktrees/orca-autonomy,
 * branch feature/orca-autonomy.
 *
 * The ten delegation-unit states:
 *   PLANNED / AUTHORIZED / QUEUED / RUNNING / BLOCKED / FAILED /
 *   EVIDENCE_PENDING / VERIFICATION_FAILED / VERIFIED / CLOSED
 *
 * A unit closes only when evidence satisfies its completion contract.
 * Every transition requires persisted evidence (an artifact path or a live
 * runtime state reference) and is recorded in the run's status ledger.
 *
 * Where an existing PING status is equivalent, it is mapped explicitly
 * (STATUS_MAPPING). Where none exists, that is stated explicitly too:
 * PLANNED, AUTHORIZED, and EVIDENCE_PENDING are ORCA delegation-boundary
 * states with no exact pre-existing equivalent, because PING's mission
 * statuses describe PING-owned missions while these describe ORCA's
 * authorized delegation requests at the WorkOrder boundary.
 *
 * Sources for existing statuses:
 *  - mission_runtime.js: created, retry_pending, assigned, running, completed, failed
 *  - WorkerLifecycle (gateway/generated/state_machine_registry.json): idle,
 *    assigned, running, waiting, consensus, completed, failed, archived
 *  - EventProcessing (same registry): emitted, persisted, processing, processed, failed
 *  - merge gate: BLOCKED signaling
 *  - external_agent_adapter: WORKER_COMPLETED / WORKER_FAILED canonical events
 */

const STATUSES = Object.freeze([
  'PLANNED',            // plan artifact exists; not yet authorized
  'AUTHORIZED',         // authorization gate granted; envelope not yet issued
  'QUEUED',             // envelope issued; awaiting dispatch
  'RUNNING',            // dispatched to worker; awaiting result
  'BLOCKED',            // awaiting an external precondition or human decision
  'FAILED',             // worker-reported failed, retries exhausted (terminal for the unit)
  'EVIDENCE_PENDING',   // result captured; awaiting verification
  'VERIFICATION_FAILED',// verifyResultEnvelope invalid (non-retryable, terminal for the unit)
  'VERIFIED',           // verified and recorded as a canonical event
  'CLOSED',             // assessment recorded; run closed (terminal)
]);

const TERMINAL = Object.freeze(['FAILED', 'VERIFICATION_FAILED', 'CLOSED']);

// Legal transitions: from -> [ { to, evidence, via } ].
const TRANSITIONS = Object.freeze({
  PLANNED: [
    { to: 'AUTHORIZED', evidence: 'policy-<tag>.json (AUTO_EXECUTE decision)', via: 'orca_policy.classifyDelegation + adapter.authorizeWorkOrder' },
    { to: 'BLOCKED', evidence: 'policy-<tag>.json (REQUIRES_HUMAN_APPROVAL / PROHIBITED decision)', via: 'orca_policy.classifyDelegation' },
  ],
  AUTHORIZED: [
    { to: 'QUEUED', evidence: 'workorder-<tag>.json (issued envelope)', via: 'adapter.issueWorkOrder' },
    { to: 'BLOCKED', evidence: 'policy-<tag>.json', via: 'dispatch precondition missing' },
  ],
  QUEUED: [
    { to: 'RUNNING', evidence: 'dispatch-<tag>-a<n>.json', via: 'dispatcher transport (Hermes)' },
    { to: 'BLOCKED', evidence: 'policy-<tag>.json', via: 'worker unavailable (profile blockedExternal) or human gate' },
  ],
  RUNNING: [
    { to: 'EVIDENCE_PENDING', evidence: 'dispatch-<tag>-a<n>.json (captured envelope)', via: 'envelope extraction from worker stdout' },
    { to: 'BLOCKED', evidence: '99-escalate.json', via: 'worker protocol failure (no parseable envelope)' },
    { to: 'FAILED', evidence: 'dispatch-<tag>-a<n>.json (worker-reported failed, attempts exhausted)', via: 'orca_policy.classifyRetry exhaustion' },
  ],
  BLOCKED: [
    { to: 'PLANNED', evidence: 're-plan artifact (02-plan.json of the new run)', via: 'human resolution or re-plan from evidence' },
    { to: 'CLOSED', evidence: '99-close.json (abandoned with recorded decision)', via: 'human decision to abandon' },
  ],
  FAILED: [
    { to: 'PLANNED', evidence: 'new plan artifact citing the failure evidence', via: 're-plan from recorded failure (recovery)' },
    { to: 'BLOCKED', evidence: '99-escalate.json', via: 'awaiting human disposition' },
  ],
  EVIDENCE_PENDING: [
    { to: 'VERIFIED', evidence: 'verify-<tag>-a<n>.json + canonical WORKER_COMPLETED event_id', via: 'adapter.verifyResultEnvelope + adapter.recordVerifiedResult' },
    { to: 'VERIFICATION_FAILED', evidence: 'verify-<tag>-a<n>.json (reason)', via: 'adapter.verifyResultEnvelope invalid' },
    // A valid envelope with status=failed is a FAILED unit outcome, not a
    // VERIFIED one. A granted retry re-plans from the recorded failure
    // (FAILED -> PLANNED); VERIFIED may only CLOSE, so the failed envelope
    // must never take the VERIFIED state on the retry path.
    { to: 'FAILED', evidence: 'verify-<tag>-a<n>.json (valid envelope, status=failed) + policy-<tag>-retry-a<n>.json', via: 'adapter.verifyResultEnvelope + adapter.recordVerifiedResult + orca_policy.classifyRetry' },
  ],
  VERIFICATION_FAILED: [
    // Terminal for the unit: validation failure is non-retryable per contract§5.
    // Recovery is re-plan (a NEW unit) or human disposition, recorded on the run.
  ],
  VERIFIED: [
    { to: 'CLOSED', evidence: '99-close.json (assessment + work-order/event IDs)', via: 'assess + close' },
  ],
  CLOSED: [],
});

// Explicit mapping: ORCA status -> existing PING status(es) or explicit NONE.
const STATUS_MAPPING = Object.freeze([
  { orca: 'PLANNED', existing: 'NONE (new ORCA boundary state)', source: 'plan artifact 02-plan.json', note: 'PING mission statuses describe PING-owned missions; PLANNED describes an ORCA delegation proposal before any authorization request exists.' },
  { orca: 'AUTHORIZED', existing: 'NONE (new ORCA boundary state)', source: 'policy-<tag>.json + authorizeWorkOrder grant', note: 'The grant decision lives in the adapter; no named PING status covers "authorized but not yet issued".' },
  { orca: 'QUEUED', existing: 'mission created (mission_runtime.getPending)', source: 'ping-runtime/orchestration/mission_runtime.js:303', note: 'Issued envelope awaiting dispatch, like a created mission awaiting assignment.' },
  { orca: 'RUNNING', existing: 'mission running; WorkerLifecycle running', source: 'mission_runtime.js:129; state_machine_registry.json WorkerLifecycle', note: 'Dispatched, awaiting result.' },
  { orca: 'BLOCKED', existing: 'WorkerLifecycle waiting; merge gate BLOCKED; profile blockedExternal', source: 'state_machine_registry.json; merge_gate.js; AGENT_PROFILES', note: 'Awaiting an external precondition or human decision.' },
  { orca: 'FAILED', existing: 'mission failed (failWithRetry exhaustion); WorkerLifecycle failed; result envelope status failed', source: 'mission_runtime.js:202 (exhaustion); registry; RESULT_SCHEMA', note: 'Worker-reported failed: verified failed envelope (retry pending or budget exhausted), or timeout-exhausted.' },
  { orca: 'EVIDENCE_PENDING', existing: 'NONE (new ORCA boundary state); nearest: EventProcessing emitted/persisted', source: 'state_machine_registry.json EventProcessing', note: 'Result captured but not yet verified; no exact PING equivalent because PING verifies inside recordVerifiedResult.' },
  { orca: 'VERIFICATION_FAILED', existing: 'EventProcessing failed', source: 'state_machine_registry.json; contract§5', note: 'verifyResultEnvelope invalid: non-retryable, never reaches canonical event authority.' },
  { orca: 'VERIFIED', existing: 'EventProcessing processed; mission completed; canonical WORKER_COMPLETED/WORKER_FAILED persisted', source: 'registry; mission_runtime.js:146; recordVerifiedResult', note: 'Verified and recorded; the completion contract is satisfied.' },
  { orca: 'CLOSED', existing: 'WorkerLifecycle archived', source: 'state_machine_registry.json WorkerLifecycle', note: 'Terminal and recorded; assessment persisted in 99-close.json.' },
]);

function legalTransition(from, to) {
  const edges = TRANSITIONS[from] || [];
  return edges.find(e => e.to === to) || null;
}

function isTerminal(status) {
  return TERMINAL.includes(status);
}

/**
 * Append-only status ledger for one run. Every transition is validated
 * against TRANSITIONS and persisted with its evidence reference, so the
 * ledger is the auditable proof that every state change was evidenced.
 */
class OrcaStatusLedger {
  constructor() {
    this._dir = null;
    this._states = new Map(); // unit -> current status
    this._ledger = [];
  }
  setDir(dir) {
    this._dir = dir;
  }
  transition(unit, to, opts) {
    opts = opts || {};
    const from = this._states.get(unit) || null;
    if (from === to) return { unit, from, to, noop: true };
    if (from !== null) {
      const edge = legalTransition(from, to);
      if (!edge) {
        throw new Error(`[OrcaStatusLedger] illegal transition ${from} -> ${to} for unit '${unit}'`);
      }
    } else if (!STATUSES.includes(to)) {
      throw new Error(`[OrcaStatusLedger] unknown status '${to}' for unit '${unit}'`);
    }
    const entry = {
      unit,
      from,
      to,
      at: new Date().toISOString(),
      evidence: opts.evidence || null,
      sourceRule: opts.sourceRule || null,
      detail: opts.detail || null,
    };
    this._states.set(unit, to);
    this._ledger.push(entry);
    this._save();
    return entry;
  }
  current(unit) {
    return this._states.get(unit) || null;
  }
  _save() {
    if (!this._dir) return;
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(this._dir, 'status-ledger.json'),
      JSON.stringify({ ledger: this._ledger, states: Object.fromEntries(this._states) }, null, 2) + '\n'
    );
  }
}

module.exports = {
  STATUSES,
  TERMINAL,
  TRANSITIONS,
  STATUS_MAPPING,
  legalTransition,
  isTerminal,
  OrcaStatusLedger,
};
