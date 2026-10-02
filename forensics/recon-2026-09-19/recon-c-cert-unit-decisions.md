# RECON C - Minimum Witness Certification Unit: Boundaries + Q1-Q4 Decisions

**Scope:** DEFINE THE MINIMUM WITNESS CERTIFICATION UNIT; challenge the 10-item candidate; answer Q1-Q4 with recommendation, confidence, evidence.
**Method:** read-only. Every claim below was verified against the worktree at HEAD via observational git/grep/sed through the Pig WSL hop. The Agent C witness-replay report (2026-09-18) was used as reference only; its load-bearing claims were re-verified independently and are cited as re-verified, not trusted.
**No mutations performed.** No source/doc edits, no commits, no tests executed, no DB writes, no process restarts.

## Evidence-plane discipline

| Plane | Status in this recon |
|---|---|
| LOCAL_WORKTREE | VERIFIED: `/home/nolan/worktrees/constitutional-convergence`, branch `constitutional-convergence-v2`, HEAD `84da2d40c` ("fix(witness): bind replay root into attestations", 2026-09-18). Parent `91e1337f4` ("fix(witness): remove unverified creation bypass"). Working tree has uncommitted WIP (CERTIFICATION.md, CONTRADICTIONS.md, EVAL-006, evidence/, tests/mc1-legacy-ingress/) - left untouched. |
| LOCAL_BRANCH | The branch matches the worktree HEAD; no branch switch performed. |
| PUBLIC_GITHUB | NOT CHECKED in this recon (no GitHub access used). Nothing below asserts parity with any remote. |
| LIVE_RUNTIME | NOT TRACED (read-only law). `gateway/bootstrap/gateway_runtime.js` wiring is live *code*, not a live *trace*. Whether the Pig boots this file in production is unknown (same unknown as Agent C (h)-1). All "live" claims below mean "reachable from the live boot file by static require", nothing stronger. |

---

## 1. The 10-item candidate, challenged item by item

For each item: what HEAD actually contains, whether 91e1337f4 / 84da2d40c satisfied it, and the verdict (KEEP IN MINIMUM UNIT / DECISION ONLY / MOVE TO SEPARATE UNIT).

### Item 1 - Make source and live replay-root semantics identical
**Status at HEAD:** NOT satisfied. Re-verified independently: `runtime/kernel/replay/witness_authority.ts:193` contains the `constitutional_law_commitment` leaf; `gateway/replay/kernel/witness_authority.js` contains zero matches for it (13-leaf TS spec vs 12-leaf live artifact). The live boot (`gateway_runtime.js:523-531` → `KernelReplayExecutionProvider` → `deterministic_replay_engine` → `./witness_authority` in `gateway/replay/kernel/`) executes the 12-leaf artifact. Neither commit touched this.
**Verdict:** MOVE TO SEPARATE UNIT (R-1, replay kernel convergence). The WitnessWorker consumes `witness_root` as an opaque string; the drift is owned by the replay authority, not the attestation path. The witness unit's *mechanical* gates do not need it, but the witness unit's *semantic* claim ("this attestation certifies replay X") is unstable until R-1 settles which leaf set the root commits to.

### Item 2 - Bind WITNESS_CREATED to exact witness_root
**Status at HEAD:** SATISFIED in worker code by 84da2d40c. Re-verified in `ping-runtime/workers/canonical_workers.js` (WitnessWorker.handle): `const witnessRoot = payload.replay.witness_root;` fail-closed - non-string/empty → `WITNESS_REJECTED` with `reason: 'missing_witness_root'`, return `{status:'rejected'}`. The emitted `witness` object carries `witness_root` and `replay_fingerprint`.
**Residuals (split):** (a) the gate is worker-code-only: `gateway/generated/event_registry.json` registers WITNESS_CREATED with a generic payload_schema (only `event_id`/`timestamp` properties), so EventGovernance would not reject a root-less WITNESS_CREATED from a non-worker emitter - small hardening, KEEP IN MINIMUM UNIT. (b) reproduction parameters the provider already computes (`witness_root_full`, `leaf_count`, `tree_height`, input-set identity, truncation flags) are dropped before emission - payload-contract redesign, MOVE TO W-2 (envelope v2).
**Verdict:** KEEP the core (already done; certify it). Governance enforcement stays in the minimum unit. Parameter envelope moves out.

### Item 3 - Ensure attestation consumes only genuinely verified replay
**Status at HEAD:** SATISFIED mechanically. Re-verified: `WitnessWorker.handle` requires `payload.replay.verified === true` (else `WITNESS_REJECTED` `unverified_replay:<reason>`) AND the item-2 root gate. The `verified` flag itself is produced by `ReplayWorker.handle` (canonical_workers.js:319-322): `verified: true` ONLY when `kernelResult.status === 'ok' && violations.length === 0`, where the kernel result comes from `KernelReplayExecutionProvider.executeReplay` running the deterministic kernel engine's own invariant evaluation. Neither witness commit changed this; it predates them.
**Residual:** what `verified:true` *means* has one hole, and it is not in the witness worker: the provider silently truncates at `maxEvents = 10000` (`replayEvents.slice(0, maxEvents)`) and silently skips malformed envelopes (`continue` with only `this._stats.failures++`), while `status` stays `'ok'` - so `verified:true` certifies the events that survived conversion, not the intended input set. Fix belongs at the replay boundary.
**Verdict:** SPLIT. The two gates (3a) KEEP IN MINIMUM UNIT. Input-integrity semantics of `verified` (3b) MOVE TO R-1.

### Item 4 - Eliminate or prove unreachable the WITNESS_CREATE fallback bypass
**Status at HEAD:** SATISFIED as a removal by 91e1337f4. Re-verified all three routing points: (i) `event_to_mission_bridge.js` - `REPLAY_COMPLETED → WITNESS_CREATE` entry deleted (only `WITNESS_CREATED → LINEAGE_CREATE` remains at line 64); (ii) `mission_scheduler.js` `MISSION_WORKER_MAP` - no `WITNESS_CREATE` entry, and `_dispatch` fail-closes on unknown mission_type ("No worker for mission type … - skipping", `stats.skipped++`); (iii) `canonical_workers.js` - WitnessWorker `eventTypes: ['REPLAY_COMPLETED']` only, and `handle()` rejects any other trigger with `unsupported_witness_trigger`. Regression guards exist in the same commit (WIT-NEG-5, decision-graph assertion, pipeline-bridge 2-missions assertion).
**Residual:** a written reachability proof (this section is part of it). No code change needed.
**Verdict:** KEEP IN MINIMUM UNIT as a proof obligation, not as code work. See Q4.

### Item 5 - Define witness identity semantics, if identity is actually required
**Status at HEAD:** the live attestation carries NO `witness_id` field (re-verified in `WitnessWorker.handle` - the `witness` object has documentId, eventType, witness_root, replay_fingerprint, timestamp, attestation). The `attestation: 'witness-<event_id[0:16]>'` field is a truncated-event-id label with zero live consumers (dashboard joins on `upstreamEventId`, mission_control.js:615; no requirer of `payload.witness.attestation` in live code). The legacy `witness_<16hex>` id (`_generateWitnessId` in `runtime/kernel/authorities/witness_authority.js`) exists only in the preserved-inactive legacy minting world.
**Verdict:** DECISION ONLY, no implementation work. See Q1 (recommendation: OPTION 4 - no independent witness_id).

### Item 6 - Define canonical hash semantics, if separate from root
**Status at HEAD:** no `canonical_hash` field exists on the live attestation, and no live verifier requires one (re-verified; see Q2).
**Verdict:** DECISION ONLY, no implementation work. See Q2 (recommendation: option D - legacy expectation to retire).

### Item 7 - Preserve causation/correlation/namespace/principal provenance
**Status at HEAD:** SUBSTANTIALLY SATISFIED by mechanism. Re-verified `BaseWorker._emit` (canonical_workers.js:31-75): namespace, correlation_id, causation_id are inherited from the triggering event; `WitnessWorker.handle` passes `causation_id: event.event_id`. The replay-side authority block (`_buildAuthorityEvidence`) records `authority: 'ReplayWorker'`, `provider: 'KernelReplayExecutionProvider'` on REPLAY_COMPLETED; WITNESS_CREATED's authority owner is registered as WitnessWorker in `event_registry.json`.
**Residual:** a certification assertion (prove the envelope on a real emission), not new code.
**Verdict:** KEEP IN MINIMUM UNIT as a verification checklist item.

### Item 8 - Certify persistence/restart
**Status at HEAD:** persistence is owned by `UnifiedEventRuntime.emit` (re-verified): canonical `event_id` minted by IdentityAuthority, `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING`, DB-assigned sequence. The witness worker adds no persistence logic of its own.
**Verdict:** MOVE TO SEPARATE UNIT (E-1, Event Authority persistence/restart certification - the P0 sequence/replay work). The witness unit ASSUMES the runtime's persistence contract; it must not re-certify it. Dependency recorded, not duplicated.

### Item 9 - Certify idempotence
**Status at HEAD:** PARTIAL, with one genuine witness-specific finding. The runtime gives `ON CONFLICT DO NOTHING` dedup on `event_id`, and the emit comments state "Timestamp is deliberately excluded: wall-clock is observation metadata assigned after identity … two emissions of the same logical event hash identically, preserving idempotent retries." BUT `WitnessWorker.handle` embeds `timestamp: constitutionalTimeAuthority.nowAsISOString()` INSIDE `payload.witness`, and the payload is inside the identity preimage (`identityData.payload`). Re-verified both sides. Consequence: two emissions of the same attestation (e.g., a retry seconds later) mint DIFFERENT `event_id`s - the worker defeats the runtime's own timestamp-exclusion principle, and retry-dedup does not work for WITNESS_CREATED.
**Verdict:** KEEP IN MINIMUM UNIT. The fix is small and witness-specific: keep wall-clock out of the identity-relevant payload (or pass a stable `logical_id` for the attestation). This is the one item-9 work item; the rest is E-1's.

### Item 10 - Certify negative/refusal paths
**Status at HEAD:** SATISFIED in code. Three fail-closed gates re-verified in `WitnessWorker.handle`: (1) non-REPLAY_COMPLETED → `unsupported_witness_trigger` (no emission); (2) `verified !== true` → `WITNESS_REJECTED` `unverified_replay:<reason>`; (3) missing/empty `witness_root` → `WITNESS_REJECTED` `missing_witness_root`. Tests updated in both commits (test_witness_negpath.js, EVAL-010).
**Residual:** run-to-green certification (not done here per read-only law).
**Verdict:** KEEP IN MINIMUM UNIT - the refusal paths ARE the safety property.

---

## 2. Smallest safe unit boundaries + dependency order

### W-1 - WITNESS ATTESTATION EMISSION CONTRACT (the minimum certification unit)
The smallest coherent unit that makes "WITNESS_CREATED was honestly emitted" a certifiable claim:
- W-1a trigger gate: only REPLAY_COMPLETED (code done in 91e1337f4; certify).
- W-1b verified gate: `payload.replay.verified === true` (code done; certify).
- W-1c root-binding gate: non-empty `witness_root` (code done in 84da2d40c; certify) + EventGovernance schema enforcement for WITNESS_CREATED (small hardening; the only new code in W-1 besides W-1g).
- W-1d WITNESS_CREATE unreachability proof (Q4; proof + existing regression guards).
- W-1e provenance checklist: namespace/correlation/causation inheritance on emission (mechanism exists; assert).
- W-1f refusal paths certified (gates 1-3 above; run existing tests to green).
- W-1g idempotence fix: wall-clock out of the identity preimage (the item-9 finding).
- W-1h identity decision (Q1: OPTION 4) + W-1i hash decision (Q2: option D): decisions recorded; the only code touch is retiring or documenting the misleading `attestation` label.

### R-1 - REPLAY KERNEL CONVERGENCE (separate unit)
- 12/13-leaf drift: sanctioned TS→JS rebuild (extend the rebuild-canonical-json.sh pattern), restoring `constitutional_law_commitment` in the live artifact.
- Input integrity: `maxEvents` truncation and malformed-envelope skips must fail verification or be emitted as explicit attested flags.
- Version literals: the hardcoded `'1.0'` witness leaves must carry actual versions or be documented as fixed protocol constants.
- Production replay boundary decision (single-event stopgap vs correlation-group) with a version marker.
- Owns the semantic strength of `verified:true` (item 3b).

### W-2 - ATTESTATION ENVELOPE V2 (separate follow-on unit)
- Carry the provider-computed reproduction parameters into the attestation: `witness_algorithm`, `witness_version`, `leaf_count`, `tree_height`, engine version, law-manifest commitment, input-set identity (event IDs hash + event_count + truncation/skip flags).
- Requires provider changes + registry regeneration. Explicitly NOT in the minimum unit: it redesigns the payload contract.

### E-1 - EVENT AUTHORITY PERSISTENCE/RESTART (separate unit)
- Item 8. Owned by the Event Authority P0 work (sequence + replay). W-1 assumes its contract.

### Dependency order (and why)
1. **E-1 is assumed by W-1, not preceded by it.** W-1's restart story ("an emitted attestation is durably recorded or safely re-emittable") rests on the runtime's persistence contract. If E-1 falsifies that contract, W-1 reopens. No code flows either way, so they can proceed in parallel with the assumption recorded.
2. **R-1 runs parallel to W-1.** W-1's mechanical gates (trigger/verified/root/refusal) do not depend on which leaf set the kernel uses. But W-1's *semantic* claim ("this attestation certifies a genuine replay of input set S under rule set R") only closes after R-1 settles the leaf set and the meaning of `verified`. Parallel work, sequential closure.
3. **W-2 depends on W-1 AND R-1.** Do not redesign the envelope of an emission contract that is not yet stable (W-1 first), and you cannot record "the" leaf set, versions, and input identity until the drift is settled and the versions are real (R-1 first). W-2 last.

What the minimum unit explicitly EXCLUDES: leaf-set convergence (R-1), the reproduction-parameter envelope (W-2), persistence/restart certification (E-1), legacy witness-minting disposition (classified preserved-inactive; separate cleanup track), the stale-doc corrections (zero behavioral risk; separate docs pass).

---

## 3. Q1 - WITNESS_ID

### Recommendation: OPTION 4 - no independent witness_id; the canonical event_id identifies the attestation, witness_root identifies the content.
**Confidence: HIGH.**

### Evaluation across the required dimensions
- **Collision domain:** `witness_root` is a sha256 Merkle root (content identity, 256-bit). The canonical `event_id` is `event_<16hex>` (64-bit, truncated sha256) minted by IdentityAuthority over `{event_type, source, namespace, payload}` - re-verified in `UnifiedEventRuntime.emit` (identityData includes payload; timestamp deliberately excluded from identity material). 64-bit is the house identity scheme for ALL canonical events, not a witness-specific weakening.
- **Semantic stability:** the event_id is content-bound: the attestation's full payload (including `witness_root`, `replay_fingerprint`, `upstreamEventId`) is inside the identity preimage. Same logical attestation → same identity (subject to the W-1g timestamp fix).
- **Replay determinism:** the root is deterministic over the kernel's leaf set; the attestation identity is deterministic over the attestation payload. Two layers, each deterministic in its own domain. No witness_id needed to bridge them.
- **Multiple attestations over the same replay:** YES, this is explicitly possible and must stay expressible - same root re-attested under a different namespace, a re-emission after W-1g, or attestation of the same root by a different pipeline run. Under Option 4 each distinct attestation payload gets its own event_id; byte-identical payloads dedup via `ON CONFLICT DO NOTHING`. The (replay → attestations) relation is carried by `upstreamEventId` + `witness_root`, both queryable in `ping_events`. **Option 1 (`witness_id = witness_root`) would collapse these into one identity and destroy the distinction between "the proof content" and "the attestation act" - that is the decisive semantic reason to reject it.**
- **Future signatures:** a signature would be over `(event_id, witness_root)` - both already exist. No witness_id required.
- **Multiple verifiers:** verifier context is envelope data (`source`, `namespace`, registry `authority_owner`). It belongs in the envelope, not in a content identity.
- **Namespace separation:** namespace is inside the canonical identity preimage AND is the privacy boundary. Option 1 is namespace-blind: the same root attested in two namespaces would share one identity, leaking across the boundary. Option 4 keeps namespace in the identity. This is the decisive safety reason to reject Option 1.
- **Migration compatibility:** nothing live to migrate - the live attestation has never carried a `witness_id` (re-verified: no such field in `WitnessWorker.handle` output).
- **Legacy compatibility:** the legacy `witness_<16hex>` id (`_generateWitnessId` over `{authority, execution_id, input_hash, output_hash}`) lives only in the preserved-inactive legacy minting world (`runtime/kernel/authorities/witness_authority.js`), unreachable from the live boot. Option 4 requires no reconciliation with it; per Nolan's classification rule it stays classified, not resurrected.
- **Storage/index implications:** no new table, no new index, no new ID column. Attestations live in `ping_events`, keyed by `event_id`; `witness_root` is queryable inside the JSON payload.
- **Lineage implications:** `causation_id` → the REPLAY_COMPLETED event; `upstreamEventId` in payload; LineageWorker already consumes WITNESS_CREATED. No witness_id needed for the chain.
- **Options 2 and 3** (domain-separated hash of witness preimage; deterministic identity over replay+root+verifier context) both create a second identity authority for an entity that already has exactly one canonical identity (the event). That is precisely the "second identity authority" Nolan's canonical decision forbids. They add a join key nobody queries.

### Decisive evidence
`UnifiedEventRuntime.emit` mints `event_id` from identity material that INCLUDES the full payload (witness_root inside it), and the live `WitnessWorker.handle` has emitted attestations with NO `witness_id` field since the path was built - the system already operates on Option 4, and the only identity-like field (`attestation: 'witness-<event_id[0:16]>'`) has zero live consumers.

---

## 4. Q2 - CANONICAL_HASH on WITNESS_CREATED

### Recommendation: (D) - a legacy verification expectation to retire. Do NOT add the field.
**Confidence: HIGH.**

### Trace (re-verified, not trusted from prior reports)
Three implementations require a hash on a witness object, and all three are LEGACY:
1. `runtime/kernel/authorities/verification_authority.js` `verifyWitness` → requires `witness.witness_metadata.hash` (sha256 format check) + metadata checks. Requirers re-verified: `ping-runtime/events/repository_store.js`, `gateway/{prompt_runtime, knowledge_graph, replay_authority, temporal_authority, knowledge_objects, constitutional_parser}.js` - the legacy gateway lifecycle world. None is required by `gateway/bootstrap/gateway_runtime.js`.
2. `runtime/kernel/authorities/witness_authority.js` `verifyWitness` → requires `witness.witness_metadata.hash === CanonicalAuthority.hash(witness-minus-hash)`. Callers: `lineage_authority.js`, `reducer_authority.js`, `constitutional_execution_pipeline.js` (the `runtime/kernel` omni-router world). None in the live boot.
3. `gateway/replay_verifier.js` → delegates to the legacy `WitnessAuthority.verifyWitness`. Requirers: `constitutional_fuzzer.js`, `replay_rule_set.js`, `verify/09_replay.js`, `worker_registry.js`, `dispatcher.js`. None in the live boot.
4. The kernel-side `verifyWitnessRoot` (`gateway/replay/kernel/replay_verification.js:47`, `witness_authority.js:188`) - the replay-domain verifier - has NO live caller: not required by `gateway_runtime.js` or `mission_scheduler.js`. Classification: BUILT_NOT_LIVE.

### Determination
- (A) is TRUE as a supporting fact: the canonical event identity already covers payload+metadata (identity preimage includes the payload; re-verified in `UnifiedEventRuntime.emit`). Integrity does not need a second hash.
- (B) is FALSE: there is no dedicated witness object on the live path - the attestation IS a canonical event (Nolan's canonical decision: derived replay attestation, no witness table).
- (C) is FALSE for the same reason: no dedicated witness object is created on the live path, so the condition never triggers.
- (D) is the correct classification: the `canonical_hash`-on-witness requirement belongs to the legacy WitnessObject world (self-contained `witness_metadata.hash`), where the witness was a standalone mutable object needing its own integrity field. In the derived-attestation architecture the event envelope already provides it. Adding `canonical_hash` to WITNESS_CREATED would serve only dormant callers - explicitly out of scope per the task ("Do not add fields for dormant callers") - and would create a competing content identity alongside `witness_root` and `event_id`.

### Decisive evidence
Zero live callers of any witness verifier that requires a hash: all three `verifyWitness` implementations trace exclusively to the legacy/preserved-inactive lifecycle, none reachable from `gateway/bootstrap/gateway_runtime.js` by static require; the one replay-domain verifier (`verifyWitnessRoot`) is built but has no live caller.

---

## 5. Q3 - VERIFICATION OWNERSHIP

### Recommendation: The current architecture is CORRECT - the replay provider owns replay verification; WitnessWorker attests the provider's certified result. Do NOT make the worker re-verify. The high-confidence improvement is binding the attestation to the replay's certified artifact (done by 84da2d40c), not duplicating verification.
**Confidence: HIGH.**

### Is "WitnessWorker trusts replay payload.verified" actually wrong?
No - with one precision: it does not trust a naked boolean. Re-verified `WitnessWorker.handle` requires FOUR things, in order: (1) trigger is REPLAY_COMPLETED (the provider's verdict event, not an arbitrary claim) else `unsupported_witness_trigger`; (2) `payload.replay.verified === true` else `WITNESS_REJECTED`; (3) `witness_root` present and non-empty (the actual proof artifact, fail-closed) else `WITNESS_REJECTED` `missing_witness_root`; (4) causal binding (`causation_id: event.event_id`, `upstreamEventId`). Commit 84da2d40c is what moved it from boolean-only to boolean-plus-artifact. The remaining "trust" is placed exactly where it belongs.

### Who owns replay verification, and what proof must the worker require?
- **Owner:** the replay provider - `KernelReplayExecutionProvider.executeReplay` running `DeterministicReplayEngine`, which evaluates the kernel invariants and computes `witness_root`/`fingerprint`; `ReplayWorker` assembles the verdict with the rule `verified: true` ONLY when `kernelResult.status === 'ok' && violations.length === 0` (canonical_workers.js:319-322). The provider is injected by the live boot (`gateway_runtime.js:523`), and `WorkerRuntime` documents "MissionScheduler is the single dispatch path" - the verification decision happens exactly once, inside the provider. Re-running the kernel inside WitnessWorker would create two independent deciders of "verified" - a duplicate verification authority, violating the single-authority-per-decision rule.
- **Proof the worker must require:** the provider's certified RESULT, not a re-derivation: the REPLAY_COMPLETED event itself (authenticated by its canonical event_id), the `verified` verdict, and the bound `witness_root` artifact. That is what the worker now requires.
- **Adjacent non-issue:** `mission_control.js:524-525` classifies REPLAY_COMPLETED by the `verified` boolean alone - but it is a read-only dashboard route (mints nothing, attests nothing). Cosmetic: it can display "verified" for a replay the worker later rejected for a missing root. Display-truth caveat, not an authority duplication.
- **The real residual is upstream of the worker:** `verified:true` currently certifies the events that survived conversion (silent `maxEvents` truncation, silent malformed-envelope skips - re-verified in `kernel_replay_execution_provider.js`). Tightening what the provider certifies (fail or flag) is R-1 work; the worker is the wrong place to fix it because the worker cannot see the input set.

### Decisive evidence
`ReplayWorker.handle` line 322 (`verified: true` ONLY when `kernelResult.status === 'ok' && violations.length === 0`) over the kernel engine's own invariant run, with the provider injected by the live boot (`gateway_runtime.js:523`): the verification decision is made exactly once, by the provider, before the worker ever sees it.

---

## 6. Q4 - WITNESS_CREATE FALLBACK

### Recommendation: PROVE ROUTE UNREACHABLE (the removal is already complete; the remaining work is the proof plus the existing regression guards).
**Confidence: VERY_HIGH.**

### Trace (re-verified at HEAD)
- **Bridge:** `REPLAY_COMPLETED → WITNESS_CREATE` deleted from `EVENT_MISSION_MAP` by 91e1337f4 (only `WITNESS_CREATED → LINEAGE_CREATE` remains, event_to_mission_bridge.js:64). No generator of WITNESS_CREATE missions remains.
- **Scheduler:** `MISSION_WORKER_MAP` (mission_scheduler.js:41) has no `WITNESS_CREATE` entry. `_dispatch` fail-closes: unknown mission_type → log + `stats.skipped++` + return. A WITNESS_CREATE mission can be *created* but never *dispatched*.
- **Worker runtime:** `WorkerRuntime.dispatch` (workers/worker_runtime.js:69-78) matches `entry.eventTypes.includes(eventType)`; WitnessWorker registers `eventTypes: ['REPLAY_COMPLETED']` only, and `handle()` rejects anything else with `unsupported_witness_trigger`. The scheduler's null-dispatch guard fails (not completes) missions no worker matched.
- **Manual mission route:** `POST /orchestration/missions` (gateway/routes/orchestration.js:39) is mounted in the live boot (gateway_runtime.js:802) and accepts an arbitrary `type` with no visible auth middleware - BUT it pushes into the Orca `ExecutionEngine._missions` (a different mission system: types like ENTROPY_REDUCTION/DEAD_CODE_AUDIT), not into `MissionScheduler`'s `MISSION_WORKER_MAP`. There is no route from HTTP input to `WorkerRuntime.dispatch` with an arbitrary event_type; the worker-runtime comment states "MissionScheduler is the single dispatch path". So even an unauthenticated caller submitting `type: 'WITNESS_CREATE'` cannot reach the witness pipeline. (The missing auth on the Orca route is a separate, non-witness concern.)
- **Bypass of verified replay semantics:** impossible at HEAD - the only historical bypass was the pre-91e1337f4 bridge arrow, which is gone.
- **Legitimate need:** none. The live chain reaches the worker by direct `WorkerRuntime.dispatch` of REPLAY_COMPLETED; no mission type is required for the witness step at all.

### Why not the other options
- REMOVE FALLBACK: already done by 91e1337f4; recommending it again would be redundant.
- NARROW FALLBACK / MAKE WITNESS_CREATE REQUIRE VERIFIED REPLAY REFERENCE: both would resurrect a dead path to solve a problem that no longer exists, adding attack surface for zero function.
- KEEP WITH EXPLICIT DISTINCT SEMANTICS: there are no distinct legitimate semantics - the worker's only legitimate trigger is REPLAY_COMPLETED, and a "verified replay reference" requirement would just duplicate the existing gates under a second name.
- PROVE ROUTE UNREACHABLE is the honest remainder: the three independent fail-closed points above, plus the regression guards already landed in 91e1337f4 (WIT-NEG-5 direct-WITNESS_CREATE rejection, decision-graph `MISSION_WORKER_MAP` assertion, pipeline-bridge mission-count assertion).

### Decisive evidence
Three independent fail-closed points verified in code at HEAD - bridge map entry deleted, `MISSION_WORKER_MAP` lookup miss → skip, worker `eventTypes` + `handle()` rejection - with the worker's own rejection test (WIT-NEG-5) asserting zero WITNESS_CREATED from a direct WITNESS_CREATE.

---

## 7. New findings for the unit (not in the 10-item candidate)

1. **Timestamp-in-identity-preimage breaks retry idempotence (W-1g).** `WitnessWorker.handle` embeds `timestamp: constitutionalTimeAuthority.nowAsISOString()` inside `payload.witness`, while `UnifiedEventRuntime.emit` includes the payload in the identity preimage and documents that wall-clock is "deliberately excluded … preserving idempotent retries." Net effect: every re-emission of the same attestation mints a new `event_id`; `ON CONFLICT DO NOTHING` can never dedup a retried WITNESS_CREATED. Fix inside W-1: keep wall-clock out of the identity-relevant payload (or pass a stable `logical_id`).
2. **The `attestation` label is a latent identity confusion (W-1h).** `attestation: 'witness-<event_id[0:16]>'` looks like an identity, is not content-bound, and has zero live consumers. Either remove it or document it as a human label; it must never be treated as `witness_id`.
3. **Dashboard boolean-only classification (cosmetic).** `mission_control.js:524-525` counts REPLAY_COMPLETED as verified by the boolean alone, while the worker requires boolean + root. A root-less verified replay displays as "verified" though no attestation was emitted. Display only; no attestation impact.

## 8. Explicit non-goals of the minimum unit
12/13-leaf convergence (R-1) · reproduction-parameter envelope (W-2) · persistence/restart certification (E-1) · legacy minting disposition (separate classified-cleanup track) · stale-doc corrections (docs pass) · any new witness table, WitnessAuthority, or witness-namespace identity (forbidden by the canonical decision).

---
*Read-only recon complete 2026-09-18. No files modified except this report; no commits; no DB writes; no services touched; no tests executed.*
