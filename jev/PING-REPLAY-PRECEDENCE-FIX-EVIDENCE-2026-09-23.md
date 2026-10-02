# PING Replay Precedence Fix Evidence

Date: 2026-09-23
Lane: Jev lane, bounded replay precedence fix plus final security gate.
Worktree: /home/nolan/ping/worktrees/jev-surgical (on the Pig)
Candidate: UNCOMMITTED. No live deploy. No live mutation.

## Defect fixed

`ReplayWorker._buildReplayEvents()` in `ping-runtime/workers/canonical_workers.js`
preferred caller-controlled `payload.replay_events` over the authoritative DB
correlation group. Precedence now:

1. AUTHORITATIVE EXECUTION CONTEXT: canonical store via
   `UnifiedEventRuntime.getCorrelationGroup(correlationId, 200)`.
2. FALLBACK: the triggering event as a single-event replay.
3. CALLER PAYLOAD TRANSCRIPT: only when the worker instance was explicitly
   constructed with `allowPayloadTranscript: true` (system metadata at
   construction, unreachable from any event payload). Production registration
   in `gateway/bootstrap/gateway_runtime.js` does not set it.

Tenant authority: the event row `namespace` now outranks caller-controlled
`metadata.namespace` in `_buildAuthorityEvidence()`.

## Test results (all run on the Pig in the worktree)

| Suite | Result |
|---|---|
| test_replay_precedence.js (new, 8 hostile cases) | 8/8 pass |
| test_replay_worker_wiring.js | 17/17 pass |
| test_kernel_replay.js | 23/23 pass |
| test_verdict_authority.js | 34/34 pass (golden path G1-G7 intact) |
| test_witness_adversarial.js | 13/13 pass |
| test_witness_negpath.js | 8/8 pass |
| test_jev_shadow.js | 21/21 pass |
| test_correlation_chain.js | 13/13 pass |

During development, hostile case P2 initially failed on an over-strict
assertion: the attacker transcript survived only as inert nested data inside
the replayed triggering event's own payload (the canonical row is replayed
as-is, never mutated), never as executed transcript entries. The assertion was
corrected to check top-level transcript entries; the directive explicitly
permits "rejected, ignored, or retained only as inert user data."

## DB role inventory (read-only, brain-postgres / ping_runtime)

- Only login role: `postgres` (superuser). No other login roles exist.
- No PUBLIC grants on any event table.
- Only the `postgres` role holds INSERT (or any write-class privilege) on:
  ping_events, repository_events, canonical_events, event_outbox,
  event_processing, mission_events.
- Zero row-level-security policies.
- Direct-DB bypass requires the postgres superuser credential. The two
  credentialed exterior agents reach the spine only through the HTTP API
  (Bearer keys), not direct DB.
- Caveat recorded for later hardening: the gateway connects as the postgres
  SUPERUSER, not a least-privilege service role. The boundary is narrow in
  *who* (one role) but broad in *what that role can do*. This is not a
  promotion blocker under the directive's rule, but a least-privilege service
  role is recommended future work.
- rc_staging on ping-rc-postgres remains unobservable under current
  authorization (consistent with the deployment drift map); it is a separate
  staging spine, out of scope for the canonical boundary.
- Regression check: ~/workspace/jev/db-role-boundary-check.sql (three queries,
  PASS = zero rows except the RLS count review line).

## Dispatcher consequence-path classification

- `WorkerRuntime.dispatch()` matches workers by registered eventTypes only.
  Registered `capabilities` are descriptive, never enforced. Dispatch itself
  performs no DB writes, no HTTP, no external calls; worker-throw propagates
  to MissionScheduler.
- All canonical emissions from workers go through `BaseWorker._emit` ->
  `UnifiedEventRuntime.emit()` -> the proven admission barrier (verdict
  authority + governance). Workers never touch the SQL pool; no fetch/HTTP/
  child_process/fs writes exist in the worker file.
- Only direct external effect: `ProjectionWorker` -> injected
  `embeddingService.projectToQdrant` (only when the service is injected).
  This is a derived-truth projection of an already-admitted canonical event.
  It cannot create canonical rows or mint verdicts.
- `MissionScheduler` consumes dispatch results for mission lifecycle only:
  `ping_missions` operational table + MISSION_* events via the admission
  barrier.
- Classification: NOT P0. The dispatcher cannot independently create
  canonical or external consequential effects without passing the proven
  admission boundary. Execution is not authorization.
- Recorded as next capability-hardening patch: enforce registered
  capabilities in dispatch; consider routing ProjectionWorker's Qdrant write
  through an explicit projection authority.

## Unrelated diff

Verified via git status/diff. The modified set matches the prior lane's
known inventory exactly. New in this lane: the precedence fix in
canonical_workers.js, `allowPayloadTranscript: true` on legitimate harness
constructors (8 in test_replay_worker_wiring.js, golden path in
test_verdict_authority.js, 4 in EVAL-009), and the new
gateway/test_replay_precedence.js. Pre-existing unrelated dirty files
(event_generator.js, event_registry.json, routes/orchestration.js,
orchestration/execution/engine.js, test_witness_negpath.js fixture, untracked
test_jev_shadow.js and ping-runtime/jev/) were not touched.

The dead confidence adapter was left dead and untouched.
