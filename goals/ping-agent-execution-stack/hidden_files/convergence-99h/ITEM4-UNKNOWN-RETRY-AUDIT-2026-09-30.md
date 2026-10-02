# ITEM 4 — UNKNOWN ≠ FAILED: retry-path audit + reconcile seam design
Date: 2026-09-30 ~17:20 MDT. Scope: gw-repair-build tree (source of ping-gateway:retry-fix-20260930).
Method: full source reads of mission_runtime.js (412 lines), mission_scheduler.js (343 lines),
canonical_workers.js (926 lines), worker_runtime.js (171 lines), intelligence_worker.js (185 lines),
dead_letter_authority.js (header), BaseWorker._emit; production wiring check in
gateway/bootstrap/gateway_runtime.js. All findings evidence-graded.

## 1. The retry path as it exists (CONFIRMED by source read)

Three failure inputs funnel into one retry mechanism:

| # | Source | Location | Outcome knowledge |
|---|--------|----------|-------------------|
| 1 | Worker threw mid-execution | mission_scheduler.js:274-276 (`_dispatch` catch → `_failMission(mission, err.message)`) | UNKNOWN — worker may have partially executed |
| 2 | Lease expired, worker vanished | mission_runtime.js:277 (`reapExpiredLeases` → status reset to `created`) | UNKNOWN — crash/timeout, effect state unknowable |
| 3 | Worker returned `{status:'failed'}` | mission_scheduler.js:259 | KNOWN failure — worker reported its own failure |

All three converge on `failWithRetry` (mission_runtime.js:202): retries+1, else
`retry_pending` with backoff; exhaustion → `failed` → DeadLetterAuthority
(P0-5, `repository_dead_letters`, surfaced in Mission Control via
gateway/routes/mission_control.js).

Source 2 is the exact mechanism AGENTS.md flagged: lease expiry → reset to
`created` → blind re-dispatch ~60s later. That IS an automatic retry of an
unknown-outcome mission, in production today.

## 2. External-effect capability audit (CONFIRMED: NONE in the mission path)

- All 8 registered workers (observation, claim, classification, recommendation,
  projection, replay, witness, lineage) do only: build in-memory objects →
  `BaseWorker._emit` → return `{status:'ok'}`. Zero external-write I/O in any
  worker file (no fetch-POST/PUT/DELETE, no SMTP, no provider SDK, no
  child_process). The single `fetch` in the worker plane (worker_runtime.js:151)
  is a GET poll for unprocessed events — read-only.
- `BaseWorker._emit` is idempotent by construction (W-1 logical-identity
  hashing: a retried handle() converges on the same event_id, never remints).
- Mission creation is idempotent (sha256 idempotency key + ON CONFLICT DO NOTHING).
- Business mission types (EMAIL_PROCESS, LEAD_FOLLOWUP, REVIEW_RESPONSE,
  ESTIMATE_FOLLOWUP, INVOICE_FOLLOWUP, …) all map to ObservationWorker, whose
  handle() only emits OBSERVATION_CREATED. The names are aspirational: no
  emails are sent, no one is contacted, no external system is touched.
- Production wiring (gateway_runtime.js:489,523,577) registers exactly this
  canonical set; WorkerRuntime.dispatch() is the single canonical execution
  decider per the DOC-CONTRACT comment.

**Verdict: there are currently ZERO actions capable of external side effects in
the mission execution path.** Blind retry of unknown outcomes is SAFE today
(idempotent internal writes only). The 25-mission drain earlier today depended
on exactly this retry behavior working.

## 3. Decision: audit + seam design, no code change (per task's explicit fallback)

Building a reconcile gate now would be untestable scaffolding with no consumer:
no mission type needs it, so no test could prove it, violating "prove every
claim with observed evidence" and "smallest patches." The CEO order sequences
item 4 as "BEFORE allowing autonomous marketing actions" — i.e., the invariant
must hold when external-effect actions ARRIVE, not before. It holds vacuously
today.

## 4. The exact seam (for the first external-effect worker/mission type)

When the first worker capable of an external write is introduced, the minimal
correct change is:

a) Add a per-mission-type (or per-worker-capability) flag, e.g.
   `EXTERNAL_EFFECT_MISSION_TYPES` next to MISSION_WORKER_MAP, plus a
   `safely_repeatable` policy per type. No new authority, no new queue.

b) In `_failMission` (mission_scheduler.js:289), split the unknown path
   (called from :276) from the known-failure path (called from :259):
   unknown-outcome + external-effect → do NOT `failWithRetry`; mark `failed`
   with error prefix `UNKNOWN_OUTCOME:` and route to the EXISTING
   DeadLetterAuthority with `outcome_unknown: true` for human reconciliation.

c) In `reapExpiredLeases` (mission_runtime.js:277), same split: expired lease
   on an external-effect mission → DLQ as unknown-outcome, NOT reset to
   `created`. Internal missions keep current crash-recovery behavior.

d) Reconcile primitive already exists: `getTrace(missionId)`
   (mission_runtime.js:352) resolves the correlated event chain; a future
   reconcile step scans for effect-receipt events post-MISSION_STARTED to decide
   SUCCEEDED / FAILED / remain-UNKNOWN before any retry.

e) Park-for-review surface already exists: `repository_dead_letters` via
   DeadLetterAuthority, already rendered in Mission Control. No new surface.

Trigger to build: the FIRST worker or mission type that performs an external
write. Until then, document the seam; do not build the gate.

## 5. Open caveats

- Audit covers the gw-repair-build tree only (the served image's source). Other
  Pig worktrees were not audited; they are not what runs.
- The MC approvals path (POST /api/mc/approvals → real site effect, per the
  seal investigation) is OUTSIDE the mission scheduler path and is item 3's
  lane, not this one. No mission worker can reach it (no outbound writes).
- `replayProvider` injection point in ReplayWorker: production wires none
  (verified in gateway_runtime.js call args) — replay is a structural no-op
  today. If a provider is ever wired, re-audit: re-execution semantics change.
