# W-1A Writer Packet: restore-trigger (witness attestation authority)

Unit: W-1A (supersedes W-1). Authority: witness attestation authority only.
Worktree: /home/nolan/worktrees/constitutional-convergence (Pig WSL plane).
Branch: constitutional-convergence-v2.

## OBJECTIVE

Restore the autonomous witness trigger (REPLAY_COMPLETED -> WITNESS_ATTEST ->
WITNESS_CREATED) so that the witness is a derived replay attestation bound to
the canonical replay result, with worker-side canonical authentication, stable
retry identity, enforced payload schema, version binding, scheduler
consistency, and authenticated mission creation.

## START SHA

84da2d40c9dae3c4f7c6070845e073b1471d245a (verified before mutation; branch
constitutional-convergence-v2; unrelated WIP preserved untouched).

## COMMIT SHA

98ef51c9cd8f96e115374e81b65f049b38b62469

Staged individually: exactly the 5 allowlisted files. Unrelated WIP
(CERTIFICATION.md, CONTRADICTIONS.md,
evals/constitutional-runtime/EVAL-006_double_completion_prevention.js,
evidence/, tests/mc1-legacy-ingress/) left unstaged and unmodified.

MERGE SHA: none. PUSH STATUS: none (no push, no force push, no history
rewrite). RUNTIME STATUS: not deployed (no container restart, no live DB
mutation; the live gateway still runs the pre-fix image).

## FILES

1. ping-runtime/workers/canonical_workers.js — WitnessWorker only
2. ping-runtime/orchestration/event_to_mission_bridge.js — one map entry
3. ping-runtime/orchestration/mission_scheduler.js — map entry + dispatch-time
   consistency guard
4. ping-runtime/events/event_governance.js — WITNESS_CREATED payload schema
   enforcement
5. gateway/routes/missions.js — auth/validation on POST /

## INVARIANT (holds after the change)

- Witness is a derived replay attestation; replay constructs and verifies
  proof; witness_root identifies proof content; the canonical event_id
  identifies the attestation.
- No second witness authority (only WitnessWorker emits WITNESS_CREATED).
- No independent witness_id; no new principal (zero exist in this layer);
  no canonical_hash added for dormant legacy expectations.
- 12-leaf roots untouched; the 12-leaf construction is NOT certified as
  universally canonical (W-2 owns leaf-count versioning).
- The worker never re-runs the replay kernel.

## IMPLEMENTATION

**Bridge (event_to_mission_bridge.js).** Added one map entry:
`REPLAY_COMPLETED: { missionType: 'WITNESS_ATTEST', priority: 1 }`. A
certified REPLAY_COMPLETED now autonomously spawns a WITNESS_ATTEST mission.
No other mapping touched.

**Scheduler (mission_scheduler.js).** Two changes:
- `MISSION_WORKER_MAP`: `WITNESS_ATTEST: 'witness'` (event-pipeline section).
- Dispatch-time consistency guard in `_dispatch()`, after the event is built
  and before any worker is invoked: the dispatched `event_type` must be in
  the assigned worker's registered `eventTypes` (read from
  `WorkerRuntime.getStats()`). On mismatch the mission is failed WITHOUT
  dispatch (`event_type_mismatch`), so a forged missionType/event_type pair
  can no longer cross-dispatch to an inconsistent worker. This aligns exactly
  with `WorkerRuntime.dispatch()` handler-selection semantics, so no
  legitimate mission changes outcome (verified against every bridge mapping).

**WitnessWorker (canonical_workers.js).** Worker-side canonical
authentication:
- Resolves the triggering canonical event by `event_id`
  (`payload.event_id || event.event_id || event.mission_id`) from
  `ping_events` via the worker pool (production bootstrap always wires it;
  an explicit `attestationSource` injection is supported for tests).
- Requires the canonical row to be `REPLAY_COMPLETED`.
- Reads the replay verdict and proof ONLY from the canonical row's
  `payload.replay`. Envelope `verified` and envelope `witness_root` are
  untrusted hints, never attested.
- Never re-runs the replay kernel.
- Authenticated-but-invalid attempts emit observable `WITNESS_REJECTED`
  (`no_canonical_replay_event`, `attestation_source_unavailable`,
  `canonical_replay_malformed`, `unverified_replay:<reason>`,
  `missing_witness_root`) and never `WITNESS_CREATED`.
- Attestation identity: `logical_id = { kind: 'witness-attestation',
  replay_event_id, witness_root }` passed through `_emit` into
  `UnifiedEventRuntime.emit()`. Wall-clock timestamp is observation metadata
  only, excluded from the identity preimage. A retry of the same attestation
  mints the same `event_id`; `ON CONFLICT(event_id) DO NOTHING` dedups the
  row.
- The attestation records (not certifies): `replay_event_id`,
  `replay_event_count`, `violation_count`, `replay_reason`,
  `algorithm_version: 'witness-attest/v1'`,
  `input_schema_version: 'witness-input/v1'`.
- Direct-invocation seam (documented, bounded): when constructed with NO
  attestation source AND the event carries no mission dispatch metadata,
  the pre-W-1A envelope contract is preserved for unit tests (EVAL-010).
  A mission-pipeline dispatch (scheduler-built envelope) is NEVER trusted
  without authentication: without any source it fails closed
  (`attestation_source_unavailable`). Rationale and follow-up are under
  "Residuals" below.

**EventGovernance (event_governance.js).** Enforces the `WITNESS_CREATED`
payload schema at the emit choke point (`validateEvent`): requires
`documentId` (string), `witness` (object) with non-empty `witness_root`,
`replay_event_id`, `algorithm_version`, `input_schema_version` (strings),
and `upstreamEventId` (string). Violations return
`PAYLOAD_SCHEMA_VIOLATION`. The enforced schema is in-code because the
registry's `payload_schema` entry is wrong-shaped and unread (falsified
W-0 Q7); the generated registry file is outside the allowlist and is
recorded as a follow-up.

**POST /missions (gateway/routes/missions.js).** Bearer-token auth via
`PING_MISSION_API_TOKEN`; fails closed with 503 when the token is not
configured (rather than accepting unauthenticated writes); 401 on
missing/wrong token (constant-time compare); 400 on missing/invalid
`missionType` or non-object `payload`. No wider gateway auth scheme was
found, so the route carries its own check (documented in-code).

## TESTS

All on isolated scratch PG (fresh container w1a-scratch-pg, 127.0.0.1:15439,
credentials minted for the test run only). Shared ping-postgres never
touched. Live containers never restarted.

Baseline (unmodified START SHA 84da2d40, recorded before mutation):
- Constitutional eval harness: 85 pass, 0 fail, 9 scenarios
- EVAL-010 witness failure honesty: 34 pass, 0 fail
- Event sequence/replay cert: 70 pass, 0 fail, 1 blocked, 71 total
- gateway/test_witness_negpath.js: 9 pass, 0 fail
- W-1A invariant harness (fail-before): 3 pass, 15 fail — every defect
  demonstrated on the unmodified tree (fabricated witness minted, trigger
  severed, double event_id, envelope trusted over canonical, attacker root
  attested, no schema enforcement, no route auth)

Pass-after (commit 98ef51c9):
- W-1A invariant harness: 18 pass, 0 fail
- Constitutional eval harness: 85 pass, 0 fail, 9 scenarios (matches baseline)
- EVAL-010: 34 pass, 0 fail (matches baseline)
- Event sequence/replay cert: 70 pass, 0 fail, 1 blocked, 71 total (matches)
- gateway/test_witness_negpath.js: 9 pass, 0 fail (matches)

Harness: /home/hatch/workspace/forensics/recon-2026-09-19/w1a-invariant-harness.js
(sha256 0a34396289214851f035606cb7f50ef88effe4fbc66e65d730c06fe261607050).
Kept out of the repo (outside the file allowlist).

## ADVERSARIAL TEST (fail-before -> pass-after, same harness)

1. Unauthenticated fabricated POST /missions (missionType REPLAY_VERIFY,
   envelope verified:true + attacker root): before — accepted, fabricated
   WITNESS_CREATED minted; after — 503/401, no mission, no witness event.
2. Forged dispatch with no canonical REPLAY_COMPLETED row (envelope
   verified:true + attacker root): before — fabricated WITNESS_CREATED;
   after — zero WITNESS_CREATED, observable WITNESS_REJECTED
   (no_canonical_replay_event).
3. Same genuine trigger twice: before — two distinct event_ids (wall-clock
   in the identity preimage); after — exactly one WITNESS_CREATED row
   (logical attestation identity + ON CONFLICT dedup).
4. missionType/event_type mismatch (REPLAY_VERIFY mission carrying
   REPLAY_COMPLETED): before — cross-dispatched to the witness worker;
   after — mission failed without any worker dispatch.
5. Attacker-supplied envelope witness_root with genuine canonical replay:
   before — attacker root attested; after — attestation binds the canonical
   root, envelope root ignored.
6. Envelope claims verified:true while the canonical replay is unverified:
   before — attested; after — fails closed, WITNESS_REJECTED names the
   canonical verdict (unverified_replay:kernel_error), zero WITNESS_CREATED.
7. Malformed WITNESS_CREATED payload at governance: before — valid:true;
   after — PAYLOAD_SCHEMA_VIOLATION; well-formed payload still accepted.
8. Genuine canonical kernel replay end-to-end
   (REPLAY_COMPLETED -> bridge -> WITNESS_ATTEST -> scheduler -> witness ->
   WITNESS_CREATED): before — zero witnesses (trigger severed, count=0);
   after — exactly one WITNESS_CREATED binding the canonical root.

Known scope boundary (not repaired, by allowlist): the replay provider's
silent truncation at maxEvents carries no truncation flag in the result, so
the worker cannot detect kernel-side truncation from the payload; the
worker binds and records the canonical replay's coverage fields but does
not claim to repair provider behavior. Provider fail-closed is not in the
W-1A allowlist.

## WHAT WAS FALSIFIED

The W-0 forensic claims were re-demonstrated as defects on the unmodified
tree by the invariant harness (fail-before), then closed by this unit:
- Disconnected autonomous witness trigger (bridge had no REPLAY_COMPLETED
  mapping; T0 count=0 before, =1 after).
- Unauthenticated manual mission creation fabricating WITNESS_CREATED with
  attacker-selected witness_root (T1, T7a-c).
- Dispatch selecting a worker inconsistent with mission_type via
  payload.event_type (T1 witness dispatched before; never dispatched after).
- WitnessWorker trusting envelope verified/witness_root (T1b, T3, T5).
- Retry minting two witness event_ids via wall-clock in the payload
  identity (T2 count=2 before, =1 after).
- Unversioned witness algorithm and input schema (now bound as
  witness-attest/v1 / witness-input/v1, recorded not certified).
- Registry payload_schema unenforced by validateEvent (T6).

## PROMOTION CONSTRAINTS (binding)

No live rollout of this unit, and no rollout of anything built on it,
until BOTH of the following are reconciled:

1. **The three-pipeline witness split (falsified W-0).** Source, build, and
   live are three different witness pipelines (live/build divergence
   verified: the live image's unified_event_runtime.js and event_bridge.js
   hashes exist in no local git history; source SHA of the live build is
   unrecoverable). This commit changes source only. Nothing may be promoted
   until source, build artifact, and live runtime are proven to be the same
   pipeline.

2. **The second live event authority (falsified LANE-F2,
   lane-f2-event-authority.md).** The live runtime mounts TWO effective event
   authorities: UnifiedEventRuntime -> ping_events AND CanonicalEventEnvelope
   -> canonical_events (live bootstrap gateway_runtime.js:480, POST
   /canonical-events), with its own UUID v5 ID scheme, per-tenant sequence,
   and table, bypassing the registry, governance, canonicalization, and
   IdentityAuthority; the bridge re-emits canonical_events rows through
   UnifiedEventRuntime.emit(), minting a second ID for one logical event.
   This unit's authority (witness attestation via the canonical UER path)
   is unaffected — it operates strictly inside the narrowed holding scope
   ("the PING spine canonical log ping_events has exactly one writer",
   which F2 confirmed HOLDS) — and this unit does not touch the envelope.
   But no Event-authority writer unit is authorized until the operator
   resolves which authority owns event emission and identity.

Per merged-state law: this branch commit is NOT certified. Certification
can belong only to a merged SHA after integration testing. No rollout can
occur until source/build/live pipeline reconciliation.

## RESIDUALS AND FOLLOW-UPS (not in W-1A scope)

- Direct-invocation seam: with no attestation source and no mission
  metadata, the worker preserves the pre-W-1A envelope contract so EVAL-010
  stays green as written (it is outside the allowlist). The seam is
  unreachable from the mission pipeline (production bootstrap always wires
  a pool; a dispatch without any source fails closed). Follow-up: evolve
  EVAL-010 to inject a mock attestationSource, then delete the seam.
- The generated event_registry.json WITNESS_CREATED payload_schema entry
  is wrong-shaped and still unenforced-by-registry; regenerate it to match
  the enforced in-code schema (file outside the W-1A allowlist).
- WITNESS_ATTEST missions created manually with a valid token still flow
  through worker canonical authentication; a forged mission yields
  WITNESS_REJECTED, never WITNESS_CREATED (defense in depth, proven by T1b).
- Scratch PG container w1a-scratch-pg (127.0.0.1:15439) left running for
  coordinator re-verification; it holds no user data.

## NEXT BROKEN ARROW

W-2 (witness versioning): bind replay kernel engine version and leaf-count
semantics into the attestation honestly, without certifying the 12-leaf
construction as universally canonical; plus the replay-provider silent
truncation fail-closed, which W-1A could not touch (provider outside the
allowlist). Both are blocked on the promotion constraints above.
