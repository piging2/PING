# Verdict Authority Fix — Evidence (2026-09-23)

Lane: JEV VERDICT AUTHORITY FIX. Directive: `PING-VERDICT-AUTHORITY-FIX-DIRECTIVE-2026-09-23.md`.
Worktree: `/home/nolan/ping/worktrees/jev-surgical` (detached at cc6856c3b).
No live deployment authorized; no live mutation performed. Candidate only, uncommitted.

## Threat model (locked)

AUTHENTICATED PRINCIPAL + VALID API KEY != AUTHORIZED VERDICT PRODUCER.
Before the fix, `POST /events` (`gateway/routes/events.js`) accepted ANY
`event_type` with source `'api'` into canonical history. A hand-built
`REPLAY_COMPLETED` with `verified:true` was persisted and eligible for
witness attestation (laundering).

## Primary patch — `ping-runtime/events/unified_event_runtime.js` (+94)

`UnifiedEventRuntime.emit()` is the single canonical admission choke point.
Added step 2b, before governance and before the `_skipGovernance` branch:

- `VERDICT_PRODUCERS` (frozen): REPLAY_COMPLETED->'replay',
  WITNESS_CREATED->'witness', WITNESS_REJECTED->'witness',
  LINEAGE_CREATED->'lineage', JEV_DECISION_EVALUATED->'jev-shadow'.
  Binds the registry's `authority_owner` values (ReplayWorker, WitnessWorker,
  LineageWorker, JevShadowWorker) to the actual worker source strings.
- `_assertVerdictAuthority()`: non-verdict types pass through; verdict-class
  types require source === producer AND qualifying provenance shape.
  Anything else fails closed with `verdict_not_authorized` /
  `verdict_provenance_missing` BEFORE persistence. Unskippable: bridges,
  replays, and internal callers cannot bypass it.

No new authorities, services, databases, event buses, or identity models.

## Witness defense — `ping-runtime/workers/canonical_workers.js` (+116)

`WitnessWorker` now qualifies evidence before attesting (defense in depth
behind the admission barrier). `_replayEvidenceQualifies()` requires ALL of:
verified===true (strict), non-null deterministic fingerprint, empty
violations array, document binding consistency, upstream reference
consistency, the producer authority evidence block, and — when a replay
transcript is present — structural soundness (unique ids, closed causation
read from metadata OR top level, registered event types via injected
EventValidator, fail-closed without one). Refusals emit observable
WITNESS_REJECTED with specific reasons (never silent).

Wiring: `registerCanonicalWorkers` already spreads options into every worker
constructor, so passing `eventValidator` in `gateway_runtime.js` (+1 line)
flows into the WitnessWorker automatically.

## Classification

Verdict class (assert authoritative outcomes): the 5 types above.
NOT verdict class: REPLAY_VERIFY, WITNESS_CREATE, LINEAGE_CREATE and all
trigger/command types — these request work, they assert nothing.
Witness role: notary-with-evidence-qualification. It does not re-verify the
kernel; it refuses to notarize claims lacking execution evidence.

## Test results (all offline, disposable infra)

- `gateway/test_verdict_authority.js` (new): 34/34.
  Attack reproduction (hand-built verdicts from 'api', 7 source-spoof
  strings, 2 bridge-shaped `_skipGovernance` bypasses) all rejected;
  producer-shaped verdicts accepted incl. failure-honest verified:false;
  non-verdict ingestion unaffected. Golden path: real
  KernelReplayExecutionProvider + DeterministicReplayEngine produced a
  genuine verified:true verdict (fingerprint
  sha256:00b62b54dfec278db122233b64fdb1a3243ee4da1fece27d75c5525cdd7cd239),
  admitted with source 'replay', tenant::acme-1 preserved, witness attested,
  WITNESS_CREATED admitted with source 'witness'.
- `gateway/test_witness_adversarial.js` (rewritten, hard assertions): 13/13
  (5 strong unchanged + 8 adversarial rejections incl. the 7 former WEAK).
- `gateway/test_witness_negpath.js`: 8/8 (WIT-NEG-1 fixture updated to the
  genuine producer payload shape; its old bare-verified:true fixture is
  exactly the forgery now refused).
- `gateway/test_jev_shadow.js`: 21/21. `test_replay_worker_wiring.js`: 17/17.
  `test_correlation_chain.js`: 13/13. `test_kernel_replay.js`: 23/23.
- `test_pipeline_bridge.js`: 5 passed / 5 failed — identical to the
  pre-patch baseline (no-pool environment, pre-existing).
- `test_replay_observability.js`: pre-existing env failure (express not
  installed in worktree), unrelated.

## String-use audit (verdict consumers)

- `mission_control.js` reads `payload.replay.verified===true` for DISPLAY
  (stats) only. No consumer uses source/actor/namespace strings, confidence,
  or metadata flags as authorization. Classification: ROUTING/DISPLAY only.
- Trust-transport: EventToMissionBridge maps verdict types to trigger
  missions (never upgrades); verdict-shaped rows via bridge now fail closed
  at admission. Tenant preserved (golden path proof).
- Confidence values untouched (0.85 / 1.0 not changed; confidence is not
  authority — recorded, not modified).

## Residual risks (not fixed in this lane; need Nolan's call)

1. `ReplayWorker._buildReplayEvents` prefers `payload.replay_events`
   ("test mode") over the DB correlation group. An authenticated caller who
   can get REPLAY_VERIFY dispatched could supply a crafted transcript; the
   kernel would genuinely replay it (determinism verdict about
   attacker-chosen events — true but about invented events). Worker input
   validation, separate lane.
2. Direct SQL INSERT into ping_events bypasses the application invariant.
   DB-level enforcement (trigger) would need live authorization.
3. `WorkerRuntime.dispatch()` still does not enforce worker capabilities
   (descriptive only). The admission barrier does not depend on it.
4. Dead confidence adapter: not audited (deferred per directive).

## Files changed (this lane only)

- `ping-runtime/events/unified_event_runtime.js` (+94)
- `ping-runtime/workers/canonical_workers.js` (+116 of the +145; +29 pre-existing P1)
- `gateway/bootstrap/gateway_runtime.js` (+1; rest pre-existing P2/P3/P4)
- `gateway/test_witness_negpath.js` (+9 fixture update)
- `gateway/test_verdict_authority.js` (new)
- `gateway/test_witness_adversarial.js` (rewritten, was untracked)
- Pre-existing unrelated dirty files untouched: event_generator.js,
  event_registry.json, orchestration.js, execution/engine.js,
  test_jev_shadow.js, ping-runtime/jev/.

Patch scripts retained: `~/workspace/jev/patch_verdict_authority.py`,
`patch_verdict_1b.py`, `patch_verdict_1c.py`, `patch_verdict_2.py`,
`patch_verdict_3.py`.
