# WITNESS + EVIDENCE — inventory, verdicts, liveness

**Agent:** 02 (witness + evidence). **Date:** 2026-09-23 ~20:00-21:00 MDT.
**Mode:** READ-ONLY. COMMITS CREATED: NONE. No repo written, no process touched, no secret values printed.
**Scope boundary:** "evidence" here = witness/verification/certification artifacts (who attests to what).
The epistemic observation→evidence chain is owned by the observation investigator; the predecessor
EVIDENCE-OBJECT-INTENT.md was treated as a pointer, not duplicated.
Agent 03 owns replay+lineage; the replay kernel is cited only where the witness binds to it.
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "<cmd>"'`, batched.
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (worktree had unreviewed WIP
during this pass, see F29 note below); (b) CANONICAL CORE `/home/nolan/ping` branch
`refactor/runtime-authority-convergence` @ `cc6856c` (live runtime home, untouched).
Prior reads: EVENT-FORENSICS.md, AUTHORITY-MAP.md, SECURITY-SWEEP.md, ping-replay-law.md, REACHABILITY.md,
WRITER-OWNERSHIP.md.

## F29 accountability (write-gate)

**Explicit statement: I did not author or apply the uncommitted changes.**
This session made zero writes: every tool call was read-only (file reads, `git status`/`git log`/`git diff`,
`grep`, `sed`, `head`, read-only HTTP GETs to `/health`, `/mc/witness/stats`, `/mc/workers`).
No `muse.write`/`muse.edit` and no mutating shell command ran before this deliverable was written,
and this deliverable lives only under `~/workspace/constitutional-sprint/`, never in either repo.

What I observed in the sprint worktree (`git status --short`, 2026-09-23 ~20:40 MDT):
- `M src/fyd/social/attestation-gate.ts` (comment revision: ordering degrades to created_at/event_id)
- `M src/fyd/social/readers.ts` (adds `created_at` to NetRelationship + tiebreak in `winsOver`)
- `M src/fyd/claim/identity.ts` (comment correction dated 2026-09-23 re: Google adapter already landed)
- `?? src/fyd/social/__tests__/readers-tiebreak.test.ts`, `?? src/fyd/social/jest.config.cjs`

The changes are coherent (readers.ts + its tiebreak test share an author; the comment edits cite the
event-forensics no-sequence-column finding) and consistent with another agent's active work.
They are preserved as unreviewed WIP per the parent's order. They affect my domain surface
(the attestation gate's ordering claim); the per-mechanism table below cites the committed HEAD
plus a note where the WIP changes the claim.

## Mechanism inventory (8 questions each)

### M1. WitnessWorker W7 — LIVE (core)

`ping-runtime/workers/canonical_workers.js:451-505`. Registered in the live composition root
(`gateway/bootstrap/gateway_runtime.js:514`, inside `registerCanonicalWorkers`), dispatched by
`MissionScheduler` (started, `gateway_runtime.js` ~line 546) fed by `EventToMissionBridge.start()`
(`gateway_runtime.js` ~line 580; map `REPLAY_COMPLETED → WITNESS_CREATE`, `event_to_mission_bridge.js:64`).
Corroborated live: `GET :8080/mc/workers` shows the witness worker `totalProcessed: 9`;
`GET :8080/mc/witness/stats` shows 66 `WITNESS_CREATED` / 0 `WITNESS_REJECTED` in `ping_events`.

| Q | A |
|---|---|
| CREATES | `WitnessWorker.handle()` emits `WITNESS_CREATED` with `witness: {documentId, eventType, timestamp, attestation}` (lines 490-499); on unverified replay emits `WITNESS_REJECTED` (lines 478-484). Trigger: `REPLAY_COMPLETED` (original business event type, re-dispatched through the mission by `mission_scheduler.js:224-240`). |
| IDENTIFIES | `attestation: 'witness-' + event.event_id.slice(0, 16)` — a label derived from the triggering event's ID. Not a commitment. |
| HASHES | Nobody. The emitted witness object contains no hash, no signature, no Merkle root. |
| PERSISTS | `this._emit('WITNESS_CREATED', ...)` → `UnifiedEventRuntime.emit` → `ping_events` row (event_id content-hashed by `emit`). |
| READS | `LineageWorker` (via bridge map `WITNESS_CREATED → LINEAGE_CREATE`, `event_to_mission_bridge.js:65`); `GET /mc/witness/stats` (`gateway/routes/mission_control.js:568-587`); `GET /mc/replay/trace/:correlationId` (`:591`). |
| VERIFIES | Nobody verifies the emitted attestation. The W7 gate verifies the INPUT (`payload.replay.verified === true`, lines 467-476), never the OUTPUT. `ConstitutionalVerificationAuthority.verifyWitness` would REJECT this shape (requires `witness.canonical_hash`; `ping-runtime/evidence/constitutional_verification_authority.js:444-449`) — and is never called on it. |
| LINKS TO EVENT | `causation_id: event.event_id` on emit; `payload.upstreamEventId = event.event_id`; `correlation_id` threaded bridge → scheduler (`event_to_mission_bridge.js:119-122`, `mission_scheduler.js:240`). |
| BYPASS | `POST /events` with `event_type: REPLAY_COMPLETED` + `payload.replay.verified: true` enters the same in-process pipeline (bridge subscribes via `eventRuntime.on`; auth posture of POST /events is the unresolved question in EVENT-FORENSICS.md). Also: any caller that can create a `WITNESS_CREATE` mission via `MissionRuntime` gets a dispatched attestation without touching the replay kernel. The W7 gate itself is bypassable only if `payload.replay.verified === true` is supplied by the emitter — the gate trusts the field, it does not recompute it. |

### M2. Kernel replay WitnessAuthority (compiled, live) — `gateway/replay/kernel/witness_authority.js`

Compiled (tsc) copy of the TS kernel; this is what the live `KernelReplayExecutionProvider`
(`gateway/kernel_replay_execution_provider.js:16`, constructed in `gateway_runtime.js:513`) loads.

| Q | A |
|---|---|
| CREATES | `DeterministicReplayEngine.replay()` → `witnessAuthority.generateWitness(eventStream, invariantRunner, state)` (engine line 56) → Merkle `witness_root` over leaves (canonical_bytes, fingerprint, lineage, state, violations) (`witness_authority.js:40-50,94+`). Invoked via `ReplayWorker` (`canonical_workers.js:320-329`): `verified = kernelResult.status === 'ok' && violations.length === 0`. |
| IDENTIFIES | `witness_root` object (Merkle root + leaf set). |
| HASHES | `CanonicalHashAuthority` (sha256) + `MerkleTree` (`gateway/replay/kernel/merkle_tree.js`). |
| PERSISTS | Ephemeral: embedded as `REPLAY_COMPLETED.payload.replay.witness_root` → persisted only as nested JSON inside the `ping_events` row for the REPLAY_COMPLETED event. No dedicated table, no first-class row. |
| READS | Nobody on the live path. `ReplayWorker` reads `verified`, `fingerprint`, `violations` from the kernel result; `witness_root` is carried but never consumed downstream. |
| VERIFIES | Compiled `verifyWitness` (`witness_authority.js:189`: regenerates and compares) — code-only, zero live callers found. |
| LINKS TO EVENT | Carried inside the `REPLAY_COMPLETED` payload (`upstreamEventId`, `causation_id`). |
| BYPASS | Creation is computed, not bypassable — but its OUTPUT is dropped at the M1 boundary (see first broken boundary). |

### M3. TS kernel WitnessAuthority source — `runtime/kernel/replay/witness_authority.ts` — CODE-ONLY (skewed)

`generateWitness(eventStream, state, violations)` (line 48) vs the compiled live copy's
`generateWitness(eventStream, invariantRunner, state)`. Instantiated only in TS files
(`deterministic_replay_engine.ts:31`, `constitutional_self_check_core.ts:44,208`) that the live JS
gateway does not load. **Source/compiled signature skew**: the reviewed source is not the running code.
Classification: DORMANT source, DIVERGED from live.

### M4. JS kernel WitnessAuthority singleton — `runtime/kernel/authorities/witness_authority.js:189` — DORMANT

"Single Witness Authority" (Phase 11.11). `createWitness` computes `CanonicalAuthority.hash` over the
witness minus the hash field, attaches `witness_metadata.hash` (64-hex) + `witness_id`.

| Q | A |
|---|---|
| CREATES / IDENTIFIES / HASHES | `createWitness(witnessData, options)`; `witness_id`; sha256 via `CanonicalAuthority`. |
| PERSISTS | Returned to caller; persisted as `repository_events.witness` JSONB only via dormant writers. |
| READS / VERIFIES | `_verifyWitnessHash` (`runtime/kernel/authorities/verification_authority.js:170-185`) checks only that `witness.witness_metadata.hash` matches `/^[a-f0-9]{64}$/i` — **format check, never recomputes**. Any 64-hex string passes. |
| LINKS TO EVENT | `witness_metadata.created_by` = authority name. No event linkage. |
| BYPASS | Module-level singleton: any requirer gets the same instance. Only requirers are `agent_memory_authority.js`, `distributed_desktop_agents.js` (both uninstantiated — zero live requirers), `constitutional_execution_pipeline.js`, `omni_router_bootstrap.js` (neither in the live bootstrap). |
| Liveness | DORMANT. No live caller. |

### M5. WitnessRecorder (Ed25519) — `gateway/witness_recorder.js` — DORMANT

Derives an Ed25519 keypair from a seed (default `'ping-constitutional-witness-seed'`), builds
WitnessObjects with witness root + verification status. Header claims "Witness verification is
cryptographic (Ed25519)". Consumers (`gateway/constitutional_runtime.js`,
`gateway/constitutional_bootstrap.js`, `gateway/authority_registry.js`, `gateway/replay_kernel_audit.js`,
etc.) have **zero live requirers** — `constitutional_bootstrap.js` and `constitutional_runtime.js` are
required by nothing outside tests. The Ed25519 witness path never runs. DORMANT.

### M6. CertificationAuthority / ReplayCertificate — DORMANT

`gateway/certification_authority.js`, `gateway/replay_certificate.js`,
`gateway/replay_certificate_authority.js` — zero references in the live bootstrap
(`gateway_runtime.js` has no `certification_authority` or `knowledge_runtime` reference).
Consumers: `tests/certification/*.test.js` and dormant gateway files only.
`tests/certification/replay-witness-regeneration.test.ts` (+ 4 sibling replay tests) import from
`../../runtime/replay/*` — `/home/nolan/ping/runtime/replay/` is an EMPTY directory (confirmed),
so the witness-regeneration certification test cannot load. **No live certification flow exists.**

### M7. ConstitutionalVerificationAuthority.verifyWitness — LIVE GATE, UNSATISFIABLE INPUT

`ping-runtime/evidence/constitutional_verification_authority.js:427-449`. `verifyArtifact` (lines 100-149)
is a hard fail-closed chain: canonical bytes → hash → identity → authority → lineage → schema →
constitution → **witness** (requires `artifact.witness` object with `canonical_hash`) → certificate.
Enforced by `RepositoryStore.append` (`ping-runtime/events/repository_store.js:67-71`), which is
instantiated in the live bootstrap (`gateway_runtime.js:384`) and called by the LIVE route
`POST /api/v1/repository/objects` (`gateway/routes/repository.js:18`, mounted at
`gateway_runtime.js:685`).

The route passes `{ object_id, kind, data, metadata }` — no `canonical_bytes` (fails at the first gate,
`verifyCanonicalBytes` requires a Buffer, line 170-175), and no `witness` (would fail `verifyWitness`
with `INVALID_WITNESS`). **No live producer creates `artifact.witness.canonical_hash` for repository
objects.** The live write path demands a witness attestation that no live creation path supplies.
(Code-traced; not live-probed — POSTing would be a write to the live core, out of scope.)

### M8. EvidenceAuthority — LIVE (core)

`ping-runtime/evidence/evidence_authority.js`. Constructed in the live bootstrap
(`gateway_runtime.js:528-531`, Phase E) with `canonicalObjectVerifier: verifyCanonicalObject`;
consumed by `HybridSearch` (`ping-runtime/search/hybrid_search.js:60`: `await this._evidence.verify(hit)`).

| Q | A |
|---|---|
| CREATES | N/A — verification, not creation. Evidence is created by producers (canonical objects with `canonical_hash`; Qdrant hits with `source_event_id`). |
| IDENTIFIES | `source_event_id` (Qdrant hits), `canonical_hash` (canonical objects). |
| HASHES | Recomputes via `verifyCanonicalObject` when the verifier is attached (it is, live). For Qdrant hits: compares `metadata.canonical_hash` of the backing `ping_events` row with the hit's claimed hash (lines 102-105). |
| PERSISTS | Stats counters only (`verified`, `tampered`). No durable artifact. |
| READS | `HybridSearch` (live retrieval path). |
| VERIFIES | `verify()` (lines 76-136): hash + lineage anchor + namespace regex (`/^(core|tenant)::[a-zA-Z0-9_-]+$/`) + backing `ping_events` row existence. `verified` requires every check `=== true`. |
| LINKS TO EVENT | `payload.source_event_id → ping_events.event_id`; namespace equality between hit and backing row. |
| BYPASS | If constructed WITHOUT `canonicalObjectVerifier`, any string `canonical_hash` passes (`else if (typeof evidence.canonical_hash === 'string') checks.hash = true`, lines 121-122) — presence-only. Closed on the live path (verifier attached), open in any other construction. ADD-only reader: never mutates events. |

### M9. `repository_events` witness columns — LIVE TABLE, DEAD FIELDS

`runtime/kernel/event_repository.js:31,43,108,141`. The table carries `witness JSONB` and
`WitnessHash TEXT` alongside `PreviousEventHash`, `CanonicalEventHash`, `ReducerHash`, `ReplayHash`.

- `appendEvent` passes `event.WitnessHash` straight through (line 108) — **no producer in the core
assigns `WitnessHash`** (exhaustive grep over `ping-runtime`, `runtime`, `gateway`: only pass-throughs,
`standard_event_schema.js:91` default `WitnessHash: null`, and unrelated manifest hashes). The field is
permanently NULL on live rows.
- `chain_root` is computed from `previousHash + canonicalEventHash` only (line 110) — the chain does not
bind any witness.
- `witness` JSONB is populated only by `agent_memory_authority.js` / `distributed_desktop_agents.js`,
both uninstantiated (zero live requirers) — dormant writers on a live table.

### M10. Adapter attestation gate — DARK (adapter)

`src/fyd/social/attestation-gate.ts` (adapter-owned; my *attest* path). Post-write journal re-read
(C4 failure-honesty): `attestRelationshipState` / `attestObjectCreated` fetch
`GET <fydGatewayBaseUrl()>/events/<TYPE>?limit=1000` and require the journal to carry the claimed state;
missing evidence → `ATTESTATION_REJECTED`, success never reported on failure. No cryptographic
commitment — the "attestation" is `{ attested: true, relationshipId, eventId }`.
Latest-wins ordering "mirroring the projector" is, per the unreviewed F29 WIP and the event-forensics
no-sequence-column finding, an **adapter-local convention**: `ping_events` has no sequence column, so
ordering degrades to `(created_at DESC, event_id DESC)` and no core-side projector enforces it.
Liveness: DARK tonight — `fydGatewayBaseUrl()` defaults to `http://127.0.0.1:18199` with nothing
listening (reachability G1/G2); zero test files at `src/fyd/social/__tests__` in committed HEAD
(the WIP adds `readers-tiebreak.test.ts`, unreviewed). No bypass: fail-closed on read failure.

### M11. Adapter claim verification seam — DARK (adapter)

`src/fyd/claim/verification-seam.ts` — only `operator-attestation` implemented, honestly labeled
"a statement, not a cryptographic proof". No commitment, no bypass (nothing to bypass).

### M12. Adapter owner event log — DARK (adapter)

`src/fyd/object/owner-events.ts` — content-hash event IDs (sha256 over canonical JSON of
sequence/actor/target/previous-basis/new-value/time/evidence-ref), append-only local log, locally
replayable fold. A genuine local commitment, but it witnesses only the adapter-local owner log,
never the gateway journal. (Real proof per reachability A1; dark with the rest of the social lane.)

### M13. ExecutionPlanAuthority._witnessSign — CODE-ONLY placeholder

`gateway/execution_plan_authority.js:154-161`: `// Placeholder: Would use actual witness authority to sign`;
hashes `{plan_id, canonical_hash, timestamp: constitutionalTimeAuthority.now()}` with no key.
Because `now()` is re-evaluated at verify time, `verifyPlanIntegrity` (lines 223-226) recomputes a
different hash — the check is non-deterministic by construction. Only called from
`gateway/replay_plan_authority.js` (liveness unconfirmed, no bootstrap reference). Never runs live.

### M14. Python WitnessWorker — DEPRECATED

`/home/nolan/projects/constitutional-runtime/witness_worker.py` — file header: "DEPRECATED - NOT
DEPLOYED IN PRODUCTION ... preserved for reference but is not reachable from the active runtime."
Code-only.

## First broken boundary — VERDICT

**The live `WITNESS_CREATED` attestation does not bind the witness commitment it claims to certify.**

The chain, all on the live path:

1. The kernel replay engine computes a REAL cryptographic witness: Merkle `witness_root` over
(canonical_bytes, fingerprint, lineage, state, violations)
(`gateway/replay/kernel/witness_authority.js:40-50,94+`, invoked via `KernelReplayExecutionProvider`
→ `ReplayWorker`, `canonical_workers.js:320-329`).
2. It is carried in `REPLAY_COMPLETED.payload.replay.witness_root` — still bound to the replay verdict
(`verified`, `violations`) in the same payload.
3. `EventToMissionBridge` → `WITNESS_CREATE` mission → `MissionScheduler` re-dispatches with the
original event type → `WitnessWorker.handle()` sees `REPLAY_COMPLETED` with the full payload.
4. **The W7 gate checks `payload.replay.verified === true` — then DISCARDS the payload.**
The emitted `WITNESS_CREATED` witness object is `{documentId, eventType, timestamp,
attestation: 'witness-<16 hex of triggering event_id>'}` (`canonical_workers.js:490-499`).
No `witness_root`. No `fingerprint`. No `violations`. No hash of any kind.

The 66 persisted "attestations" (live, `GET :8080/mc/witness/stats`) are therefore labels, not
commitments: no consumer can recompute them, no verifier can check them against the replay they
claim to certify, and the one verifier that could (`ConstitutionalVerificationAuthority.verifyWitness`,
which requires `witness.canonical_hash`) would reject every one of them. The cryptographic witness
root exists only ephemerally in the `REPLAY_COMPLETED` payload — one hop upstream of the attestation
that is supposed to certify it.

**Second broken boundary (also live): the repository-object write path demands a witness no live
producer can supply.** `POST /api/v1/repository/objects` (mounted `gateway_runtime.js:685`) →
`RepositoryStore.append` → `verifyArtifact` → `verifyWitness` requires `artifact.witness.canonical_hash`
(`constitutional_verification_authority.js:444-449`). The route supplies `{object_id, kind, data,
metadata}` — no witness, no `canonical_bytes` (fails even earlier at `verifyCanonicalBytes`).
No live code path mints `artifact.witness` for repository objects. The constitutional gate makes the
live route's append unsatisfiable: the witness requirement is enforced but unfulfillable.

Supporting breaks (dormant but structural):
- `repository_events.WitnessHash`: never computed by any producer; chain_root ignores it. The hash
chain has a permanently-null "witness" member.
- `_verifyWitnessHash` (`runtime/kernel/authorities/verification_authority.js:170`): format-only
(`/^[a-f0-9]{64}$/i`), never recomputes — any 64-hex string "verifies".
- Three WitnessAuthority implementations (JS kernel singleton, TS source, compiled gateway copy)
with source/compiled signature skew; the patch rule's "never create a second canonical witness
authority" is already violated three times over.
- Certification is entirely dormant: `CertificationAuthority` unreferenced by the live bootstrap;
`replay-witness-regeneration.test.ts` imports from the empty `runtime/replay/` dir and cannot load.

## Witness liveness summary

| Mechanism | Runs? | Corroboration |
|---|---|---|
| WitnessWorker W7 (M1) | YES | `/mc/workers` totalProcessed 9; `/mc/witness/stats` 66/0; registered + dispatched in live bootstrap |
| Kernel replay witness root (M2) | YES (computed) | Same pipeline; `witness_root` present in REPLAY_COMPLETED payload per code path |
| EvidenceAuthority.verify (M8) | YES | Constructed in bootstrap; called by HybridSearch line 60 |
| ConstitutionalVerificationAuthority.verifyWitness (M7) | YES (as gate) | Called by RepositoryStore.append on live route |
| JS kernel WitnessAuthority.createWitness (M4) | NO | Only dormant callers |
| TS kernel WitnessAuthority (M3) | NO | Skewed source, unloaded |
| WitnessRecorder Ed25519 (M5) | NO | Zero live requirers |
| CertificationAuthority / ReplayCertificate (M6) | NO | Zero live requirers; test imports dead |
| repository_events.WitnessHash (M9) | NO (field) | Never assigned; table live, field dead |
| _witnessSign (M13) | NO | Placeholder, dormant caller |
| Adapter attestation gate (M10) | NO (dark) | Nothing on :18199; fail-closed |
| Adapter claim seam (M11) | NO | Honest non-proof |
| Python WitnessWorker (M14) | NO | Self-declared deprecated |

## Patch record

No patch applied. Target files for the first broken boundary live in `/home/nolan/ping`
(propose-only, always) and in a fleet worker file (propose-only per WRITER-OWNERSHIP rule 4).
A second canonical witness authority was NOT created.

Proposal (WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT) is filed at
`~/workspace/constitutional-sprint/patches/agent02-witness-evidence/PROPOSAL-witness-root-binding.md`.
Dependency note for the coordinator / Agent 20: the change touches `WitnessWorker` in
`ping-runtime/workers/canonical_workers.js`, which also contains `ReplayWorker` (Agent 03's
replay territory) and is consumed via Agent 01's event/mission pipeline — propose-only, no conflict
with another agent's applied patch (none exists).

## Findings table (shared record format)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| witness | WitnessWorker W7 `ping-runtime/workers/canonical_workers.js:451-505` | Live worker attests verified replays; 66 attestations, 0 refusals in ping_events | `gateway_runtime.js:514` registration; `mission_scheduler.js:224-240` dispatch; `GET :8080/mc/workers` totalProcessed 9; `GET :8080/mc/witness/stats` 66/0 (2026-09-23) | MissionScheduler | WitnessWorker.handle | WitnessWorker | LineageWorker, /mc/witness/stats | none (label, not commitment) | LIVE | HIGH | YES: emitted attestation drops kernel witness_root; attestation string is a label | agent01 (event/mission), agent03 (replay verdict) | 01, 03, 20 |
| witness | Kernel replay WitnessAuthority (compiled) `gateway/replay/kernel/witness_authority.js` | Computes real Merkle witness_root over (canonical_bytes, fingerprint, lineage, state, violations) | `:40-50` generateWitness; `:94+` computeWitnessRoot; `deterministic_replay_engine.js:56`; carried in REPLAY_COMPLETED.payload per `canonical_workers.js:320-329` | DeterministicReplayEngine | WitnessAuthority.generateWitness | DeterministicReplayEngine | none live | CanonicalHashAuthority + MerkleTree | LIVE (computed) | HIGH | YES: output dropped at M1 boundary; verifyWitness code-only | agent03 (replay engine) | 03 |
| witness | TS WitnessAuthority source `runtime/kernel/replay/witness_authority.ts` | Source diverged from the compiled live copy (signature skew) | `:48` generateWitness(eventStream, state, violations) vs compiled `:40` (eventStream, invariantRunner, state) | deterministic_replay_engine.ts (TS, unloaded) | — | — | — | — | DORMANT/SKEWED | HIGH | source is not the running code | agent03 | 03 |
| witness | JS kernel WitnessAuthority singleton `runtime/kernel/authorities/witness_authority.js:189` | createWitness attaches witness_metadata.hash; only dormant callers | `:44-72` createWitness; requirers: agent_memory_authority.js, distributed_desktop_agents.js (uninstantiated), constitutional_execution_pipeline.js, omni_router_bootstrap.js (not in bootstrap) | (dormant) agent_memory_authority | witnessAuthority.createWitness | witnessAuthority | none live | self (singleton) | DORMANT | HIGH | second canonical witness authority exists | — | 20 |
| witness | `_verifyWitnessHash` `runtime/kernel/authorities/verification_authority.js:170-185` | "Verification" is a 64-hex format check; never recomputes | `:170-185` regex `/^[a-f0-9]{64}$/i`, no hash recomputation | VerificationAuthority.verify | _verifyWitnessHash | — | — | none | DORMANT | HIGH | format check presented as verification | — | 20 |
| witness | WitnessRecorder `gateway/witness_recorder.js` | Ed25519 witness objects; never runs | `:22-27` key derivation; requirers constitutional_runtime.js / constitutional_bootstrap.js / authority_registry.js have zero live requirers | none live | WitnessRecorder.record | — | — | deterministicKeyAuthority | DORMANT | HIGH | cryptographic witness path aspirational only | — | 20 |
| witness | CertificationAuthority / ReplayCertificate `gateway/certification_authority.js` | No live certification flow | zero references in `gateway_runtime.js`; `tests/certification/replay-witness-regeneration.test.ts` imports empty `runtime/replay/` | tests only | — | — | — | — | DORMANT/DEAD-TEST | HIGH | certification claimed, none wired | — | 20 |
| witness | ConstitutionalVerificationAuthority.verifyWitness `ping-runtime/evidence/constitutional_verification_authority.js:427-449` | Live gate requires witness.canonical_hash; live route cannot supply it | `:444-449`; `repository_store.js:67-71`; `routes/repository.js:18`; mounted `gateway_runtime.js:685` | POST /api/v1/repository/objects | RepositoryStore.append | (none live) | — | ConstitutionalVerificationAuthority | LIVE (gate) | HIGH | YES: unsatisfiable witness requirement on live write path | agent01 (routes), agent13 (schema) | 01, 13, 20 |
| witness | `repository_events.WitnessHash` `runtime/kernel/event_repository.js:108` | Field never computed; chain_root ignores it | exhaustive grep: zero assignments; `:110` chain_root = f(previousHash, canonicalEventHash); `standard_event_schema.js:91` default null | — | EventRepository.appendEvent | (none) | event_repository.js:216 | — | LIVE TABLE / DEAD FIELD | HIGH | hash chain has null witness member | agent13 | 13 |
| evidence | EvidenceAuthority.verify `ping-runtime/evidence/evidence_authority.js:76-136` | Live retrieval verification: recompute hash + backing ping_events row + namespace | `gateway_runtime.js:528-531`; `hybrid_search.js:60` | HybridSearch | EvidenceAuthority.verify | — | HybridSearch | verifyCanonicalObject | LIVE | HIGH | bypass closed live (verifier attached); open if constructed without verifier (`:121-122` presence-only) | agent04 (retrieval) | 04 |
| evidence | `_witnessSign` `gateway/execution_plan_authority.js:154-161` | Explicit placeholder; non-deterministic verify | `:155` "Placeholder: Would use actual witness authority to sign"; `now()` in hashed object | replay_plan_authority.js (dormant) | _witnessSign | ExecutionPlanAuthority | — | none | CODE-ONLY | HIGH | signature is a timestamped hash, no key | — | 20 |
| witness | Adapter attestation gate `src/fyd/social/attestation-gate.ts` | Fail-closed journal re-read; no crypto commitment; ordering is adapter-local convention | `:72-130`; F29 WIP comment revision; `fydGatewayBaseUrl()` default `:18199` dark (reachability G1/G2) | src/fyd/social/actions.ts | attestRelationshipState | — | — | journal (unreachable) | DARK | MEDIUM | "mirrors the projector" claim false; no core projector | — | 01 |
| witness | Adapter claim seam `src/fyd/claim/verification-seam.ts` | Honest non-proof (operator-attestation only) | file content; reachability A5 | claim verify route | — | — | — | none | DARK | HIGH | none (honest) | — | — |
| witness | Python WitnessWorker `constitutional-runtime/witness_worker.py` | Self-declared deprecated, not deployed | file header lines 1-8 | none | — | — | — | — | DEPRECATED | HIGH | none (labeled) | — | — |

## Open questions for the coordinator

1. `POST /events` auth posture (the event-forensics unresolved question) determines whether M1's
bypass is remotely triggerable or only in-process.
2. Whether any of the 66 persisted `WITNESS_CREATED` attestations correspond to replays whose
`witness_root` should be recoverable from the sibling `REPLAY_COMPLETED` rows (correlation_id join)
— a backfill could restore binding without new machinery.
3. `gateway/routes/repository.js` — is `POST /api/v1/repository/objects` reachable past auth, and is
its always-fail behavior known/intended (the route looks recently added)?
