# AGENT C — Witness After the Two Commits + Replay Audit
**Frozen head:** `/home/nolan/worktrees/constitutional-convergence` @ `84da2d40c` (2026-09-18)
**Recon date:** 2026-09-18 (read-only; no mutations performed)
**Canonical decision (Nolan, 2026-09-18):** Witness in PING is a DERIVED REPLAY ATTESTATION, not a standalone authority or mutable business object. Replay Authority computes deterministic version-bound proof content + witness_root; Event Authority records the attestation as a canonical event. witness_root = proof-content identity; the persisted attestation retains canonical event identity over its bound payload. No second identity authority, no new WitnessAuthority, no witness table merely because one existed historically. Legacy agent-memory witness minting is preserved-inactive/legacy and must not become canonical.

---

## (a) WITNESS_CREATE residual classification

Commit `91e1337f4` ("fix(witness): remove unverified creation bypass") removed, from LIVE code:
- `ping-runtime/orchestration/event_to_mission_bridge.js`: `REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 }` deleted from EVENT_MISSION_MAP. REPLAY_COMPLETED no longer spawns a WITNESS_CREATE mission (bridge test now asserts `EVENT_MISSION_MAP['REPLAY_COMPLETED'] === undefined`).
- `ping-runtime/orchestration/mission_scheduler.js`: `WITNESS_CREATE: 'witness'` deleted from MISSION_WORKER_MAP (test asserts `MISSION_WORKER_MAP['WITNESS_CREATE'] === undefined`).
- `ping-runtime/workers/canonical_workers.js`: WitnessWorker registration `eventTypes: ['WITNESS_CREATE', 'REPLAY_COMPLETED']` → `['REPLAY_COMPLETED']`; handle() now rejects any non-REPLAY_COMPLETED trigger with `{status:'rejected', reason:'unsupported_witness_trigger'}`.
- Tests updated in the same commit: `gateway/test_witness_negpath.js` WIT-NEG-5 now asserts direct WITNESS_CREATE is rejected with zero WITNESS_CREATED; `gateway/test_decision_graph.js` mission-type coverage drops the witness-command bypass; `gateway/test_pipeline_bridge.js` expects 2 missions not 3 after REPLAY_COMPLETED; `evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js` asserts exact eventTypes `['REPLAY_COMPLETED']`.

Exact-match (`\bWITNESS_CREATE\b`) residual inventory, classified:

| File | Hit | Classification | Notes |
|---|---|---|---|
| `ping-runtime/workers/canonical_workers.js:467` | Comment: "The legacy WITNESS_CREATE command was an alternate, unverified path." | COMMENT (live file) | Accurate description of the removed path; harmless. |
| `gateway/test_decision_graph.js:199` | `assert.strictEqual(MISSION_WORKER_MAP['WITNESS_CREATE'], undefined)` | REJECTION TEST (live) | Guards the removal; updated in 91e1337f4. |
| `gateway/test_witness_negpath.js:172-177` | WIT-NEG-5: direct WITNESS_CREATE rejected | REJECTION TEST (live) | Updated in 91e1337f4; proves the bypass is dead. |
| `evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js` | Doc-comment line updated to `['REPLAY_COMPLETED']` | EVAL DOC (live) | Updated in 91e1337f4. |
| `AGENTS.md:2652,2656,2677` | "Non-replay `WITNESS_CREATE` still attests." / "WIT-NEG-5 WITNESS_CREATE direct→normal attestation" / eventTypes exactly `['WITNESS_CREATE','REPLAY_COMPLETED']` | STALE DOC (superseded 2026-08-21 session notes) | Directly contradicts frozen code. See (g). |
| `docs/MISSION_LIFECYCLE_AND_ROUTING.md:103-104,147,176` | Table: REPLAY_COMPLETED → WITNESS_CREATE mission; witness eventTypes `['WITNESS_CREATE','REPLAY_COMPLETED']` | STALE DOC | Describes the removed bridge arrow. |
| `docs/LIVE_ARROW_AUDIT.md:156` | "`WITNESS_CREATE` direct still attests (no regression)" | STALE DOC | Superseded. |
| `docs/WITNESS_AUTHORITY_LEDGER_2026-09-16.md:17,21,70,102` | "[STAT] Handles WITNESS_CREATE and REPLAY_COMPLETED events" etc. | HISTORICAL LEDGER (dated 2026-09-16, DOCUMENTED_ONLY) | True at ledger date; false at frozen head. Dated nature limits hazard. |
| `docs/EXECUTION_EVIDENCE_LEDGER.md:365`, `docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md:48` | Mentions in old evidence traces | HISTORICAL DOC | Snapshots of prior state. |
| `gateway/COMMISSIONING_REPORT.json:6280`, `gateway/KERNEL_PIPELINE_REPORT.json:2204` | `"WITNESS_CREATE"` in generated reports | GENERATED HISTORICAL REPORT | Point-in-time artifacts. |
| `orca/control-loop/evidence/run-*/...` (~24 files) | Workorder/dispatch JSON referencing WITNESS_CREATE | HISTORICAL RUN EVIDENCE (PRESERVED) | Past runs; must not be "fixed." |

**Verdict:** Zero live routes accept, dispatch, or generate WITNESS_CREATE. The removal is complete in executable code. Residuals are comments, rejection tests (which correctly guard the removal), and stale/superseded documentation. Substring-only matches (`WITNESS_CREATED`, `REPOSITORY_WITNESS_CREATED` in `gateway/generated/event_registry.json` / `event_generator.js`) are a different event type and unaffected.

---

## (b) WITNESS_CREATED binding inventory + sufficiency verdict

Commit `84da2d40c` ("fix(witness): bind replay root into attestations") added to `WitnessWorker.handle` (after the `verified === true` gate):
1. `const witnessRoot = payload.replay.witness_root;` — fail-closed: if not a non-empty string → emit WITNESS_REJECTED with `reason: 'missing_witness_root'` (includes full `payload.replay` for diagnosis), return `{status:'rejected'}`.
2. The attested object now carries `witness_root: witnessRoot` and `replay_fingerprint: payload.replay.fingerprint || null`.

**Exact bound payload** (`WITNESS_CREATED`, via `BaseWorker._emit` trace contract):

| Field | Value | Source |
|---|---|---|
| `payload.documentId` | document id | triggering event payload |
| `payload.witness.documentId` | same | — |
| `payload.witness.eventType` | `'REPLAY_COMPLETED'` | triggering event type |
| `payload.witness.witness_root` | Merkle root hash string (hex) | `payload.replay.witness_root` (fail-closed non-empty) |
| `payload.witness.replay_fingerprint` | `sha256:<hex>` or null | `payload.replay.fingerprint` (input-identity: canonical bytes of the replayed event stream) |
| `payload.witness.timestamp` | ISO string | `constitutionalTimeAuthority.nowAsISOString()` |
| `payload.witness.attestation` | `witness-<event_id[0:16]>` | DERIVED LABEL (not a content identity) |
| `payload.upstreamEventId` | REPLAY_COMPLETED event id | triggering event |
| `metadata.namespace` | inherited | privacy boundary preserved |
| `metadata.correlation_id` | inherited | correlation group preserved |
| `metadata.causation_id` | triggering event id | causal chain preserved |
| `metadata.confidence` | inherited or null | — |
| `event.event_id` | canonical event identity | UnifiedEventRuntime.emit |

**NOT bound in the attestation** (present in provider result but dropped before/at emission):
- `witness_algorithm` (`merkle_sha256_v1`), `witness_version` (`v1`), `leaf_count` (14), `tree_height` (4): computed by `KernelReplayExecutionProvider` (`witness_root_full`) but NOT copied into the REPLAY_COMPLETED payload, NOT in WITNESS_CREATED.
- `engine_version` (`v1` constructor default): never recorded per-attestation.
- Input event set identity: `event_count` is in the REPLAY_COMPLETED payload but NOT in WITNESS_CREATED; event IDs / transcript hash are absent (only `replay_id` exists as `authority.canonical_input_hash` on REPLAY_COMPLETED, not carried forward).
- Truncation/skip flags: `maxEvents` cap (10000) and malformed-envelope skips (`this._stats.failures++` + `continue`) are invisible in the attested set.
- Constitutional law manifest/commitment: the commitment leaf is absent from the live (compiled) artifact entirely (see (d)).
- Schema/replay/policy/canonicalization/hash versions as ACTUAL values: the leaves carry hardcoded `'1.0'` literals (and `'sha256'`), not the versions in play.

**Governance gap:** `gateway/generated/event_registry.json` registers WITNESS_CREATED (authority_owner: WitnessWorker) with a generic payload_schema (only `event_id`/`timestamp` properties). The `missing_witness_root` fail-closed gate is enforced ONLY in worker code, not by EventGovernance schema. A non-worker emitter (or a future regression) could emit WITNESS_CREATED without a witness_root and governance would not reject it.

**Sufficiency verdict: INSUFFICIENT for independent later verification from the attestation alone.** What IS sufficient: the attestation is an honest, trace-bound claim — root hash + input fingerprint + namespace/correlation/causation envelope + canonical event identity. A verifier holding the SAME code, the SAME leaf-construction, the SAME invariant set, and the SAME input events can recompute and compare. What is NOT possible: verifying the attestation years later from the event record alone, because the version-bound reproduction parameters (algorithm, witness version, leaf set, canonicalization/hash versions, engine version, law manifest, input set identity) are not recorded per-attestation. The attestation proves "ReplayWorker saw a verified replay with this root and this input fingerprint" — it does not make the proof re-derivable.

---

## (c) Naked-boolean trust verdict

**No live attestation path trusts a naked `verified` boolean.** `WitnessWorker.handle` requires BOTH gates in sequence:
1. `event.event_type === 'REPLAY_COMPLETED'` (else `unsupported_witness_trigger`),
2. `payload.replay.verified === true` (else WITNESS_REJECTED `unverified_replay:<reason>`),
3. `typeof witnessRoot === 'string' && length > 0` (else WITNESS_REJECTED `missing_witness_root`).

The only other `verified === true` consumer found is `gateway/routes/mission_control.js:524-525`, a READ-ONLY dashboard classifier (`verified`/`unverified` counts on REPLAY_COMPLETED events for the witness-status endpoint). It mints nothing and attests nothing; it cannot produce an attestation. Not a bypass. It does, however, classify by the boolean alone for display — cosmetic, but it means the dashboard can report "verified" for a replay whose root was never bound (e.g., a REPLAY_COMPLETED that the worker later rejected). Minor display-truth caveat, not an attestation hole.

One adjacent input-integrity caveat (not a naked-boolean issue, but it weakens what `verified:true` MEANS): `KernelReplayExecutionProvider.executeReplay` returns `status: 'ok'` whenever the engine doesn't throw, even when it silently (a) sliced the input at `maxEvents = 10000` or (b) skipped malformed envelopes via `continue` (`_stats.failures++` only). The REPLAY_COMPLETED payload carries `event_count` (post-cap, post-skip) but no skip/truncation flag, and `violations` only covers kernel invariants. So `verified:true` certifies "the events that survived conversion had no invariant violations" — NOT "the intended input set was replayed whole." The skipped-input case is the sharper hole: a corrupt event disappears silently instead of failing the replay.

---

## (d) 12-vs-13-leaf drift analysis + correct target contract

**The two files:**
- TS source (authoritative per repo convention): `runtime/kernel/replay/witness_authority.ts`
- Compiled artifact (what actually runs): `gateway/replay/kernel/witness_authority.js`

**Leaf sets** (Merkle leaves are sorted by `leaf_id` before hashing; leaf order in code is irrelevant, leaf SET is everything):

| # | Leaf ID | TS (13 base) | Compiled JS (12 base) |
|---|---|---|---|
| 1 | canonical_bytes | yes | yes |
| 2 | fingerprint | yes | yes |
| 3 | lineage | yes | yes |
| 4 | state_version | yes | yes |
| 5 | schema_version (`'1.0'` literal) | yes | yes |
| 6 | replay_version (`'1.0'` literal) | yes | yes |
| 7 | policy_version (`'1.0'` literal) | yes | yes |
| 8 | canonicalization_version (`'1.0'` literal) | yes | yes |
| 9 | hash_version (`'sha256'` literal) | yes | yes |
| 10 | artifact_count | yes | yes |
| 11 | state_contents | yes | yes |
| 12 | violations_canonical | yes | yes |
| 13 | **constitutional_law_commitment** | **yes** | **NO** |
| 14 | leaf_count (metadata) | yes (15) | yes (14) |
| 15 | tree_height (metadata) | yes (4) | yes (4) |

The missing leaf binds `CertificateAuthority.computeConstitutionalLawCommitment({invariant_definitions, replay_rules, witness_rules, failure_rules, authority_hierarchy})` from `getConstitutionalLawManifest()` — i.e., the exact rule-set under which the replay executed.

**Drift origin (git evidence):** the commitment leaf entered the TS at `83112507a` ("Import constitutional replay kernel") — the ORIGINAL import. The compiled JS was introduced at `de314f664` ("feat(convergence): integrate kernel replay bridge") and `git log -S constitutional_law_commitment` on the JS returns NOTHING: the compiled artifact has NEVER contained the leaf in this worktree's history. The JS was compiled (or hand-ported) from a different/older TS revision, or the leaf was added to the TS after the last compile with no rebuild. There is a sanctioned rebuild path only for `canonical_json.js` (`scripts/rebuild-canonical-json.sh`); there is NO rebuild script for `witness_authority`. No test asserts the leaf set (tests only assert `leaf_count > 0`), so the drift is uncaught.

**Which path runs:** the LIVE boot `gateway/bootstrap/gateway_runtime.js:521-531` instantiates `KernelReplayExecutionProvider`, which requires `./replay/kernel/deterministic_replay_engine`, which requires `./witness_authority` in `gateway/replay/kernel/` — the 12-leaf artifact. `EVAL-009`/`test_witness_negpath`/`test_kernel_replay` exercise the same artifact. The 13-leaf TS is never executed (no compiled counterpart is wired).

**Characterization:** source/artifact drift, semantic (not cosmetic): different leaf sets → different Merkle roots for identical inputs → a root produced by the live artifact CANNOT be verified against the TS spec, and a future rebuild from the TS would SILENTLY CHANGE every historical witness root. The drift is in the worst direction: the dropped leaf is the ONLY true external-version binding in the whole construction (the other "version" leaves are hardcoded `'1.0'` literals — see (f)).

**Correct target contract:**
1. The 13-leaf set is the semantically correct target: `constitutional_law_commitment` MUST be in the tree, because it is the only leaf that binds the actual rule-set (invariants, replay/witness/failure rules, authority hierarchy) to the attestation. Without it, a change to the invariant definitions between attestation and verification is undetectable from the root.
2. The compiled artifact must be regenerated from the TS source through a sanctioned, pinned rebuild (extend the `rebuild-canonical-json.sh` pattern); hand-editing the artifact to add the leaf would re-create the same class of drift.
3. Per-attestation version metadata must be recorded OUTSIDE the root too (see (f) gap list): witness_algorithm, witness_version, leaf_count, tree_height, engine version, law-manifest version/commitment, canonicalization and hash versions as ACTUAL values, and the input-set identity + truncation flags. The root binds content; the envelope must bind the reproduction parameters.
4. The hardcoded `'1.0'` version literals (leaves 5-8) must either be replaced with the actual versions in play or documented as fixed protocol constants with their own versioning story; as-is they assert a version binding they do not provide.
5. Until (2) lands, every live attestation is a 12-leaf root; any future verification harness must be pinned to the 12-leaf construction for historical roots. The leaf-count/version fields that WOULD disambiguate this are not recorded per-attestation (gap (f)-b), so the disambiguation currently rests on code archaeology alone.

**DO NOT FIX** (per task scope): no artifact regeneration, no leaf additions, no rebuild script — plans only.

---

## (e) Dedicated-witness-object falsification + legacy disposition

**Hypothesis under test:** "No dedicated witness object / witness table / witness_id is needed for the live attestation path."

**Result: NOT FALSIFIED — the hypothesis survives.** The live chain `gateway/bootstrap/gateway_runtime.js` → `WorkerRuntime` → `WitnessWorker` (REPLAY_COMPLETED-only) → `WITNESS_CREATED` consumes:
- no `witness_id` (no field exists on the attestation; `attestation: 'witness-<event_id[0:16]>'` is a label),
- no witness table (nothing is INSERTed; the attestation is a canonical event in `ping_events` via UnifiedEventRuntime),
- no legacy `createWitness` object (the worker builds a plain object; the ONLY WitnessAuthority class it touches is the kernel Merkle root calculator in `gateway/replay/kernel/witness_authority.js`, which is a pure function, not an identity authority).

**Legacy minting inventory** (all disconnected from the live canonical-worker pipeline):

| Legacy surface | Location | Live? | Classification |
|---|---|---|---|
| `createWitness` hash-contract authority (+ `witness_id` via `_generateWitnessId`) | `runtime/kernel/authorities/witness_authority.js`; gateway shim `gateway/witness_authority.js` re-exports it | Called by `runtime/execution_runtime.js`, `runtime/kernel/authorities/{lineage,capability_scheduler,reducer}_*.js`, `standard_event_schema.js`, `ping-runtime/agents/agent_memory_authority.js`, `distributed_desktop_agents.js`, `gateway/{prompt_authority,transaction_boundary,node_registry,...}.js` — NONE in the live boot path | LEGACY (still executable code, but unreachable from `gateway_runtime.js`) |
| Agent-memory witness minting (`AgentMemory._createWitness` → `witnessAuthority.createWitness`) | `ping-runtime/agents/agent_memory_authority.js:93-106` | Only referenced by itself; `memory_persistence_authority` has NO requirers at all | PRESERVED_INACTIVE |
| `memory_witnesses` SQL table (`witness_id PRIMARY KEY`, INSERT at :251) | `gateway/memory_persistence_authority.js:201,251` | Zero requirers in the repo | PRESERVED_INACTIVE (unwired; table DDL lives in code, never invoked) |
| `WitnessRecorder.record()` → standalone WitnessObject with `identityAuthority.generateFromCanonicalHash(..., 'witness')` (a witness-namespace IDENTITY — exactly the "second identity authority" the canonical decision forbids) | `gateway/witness_recorder.js` | Referenced only by `gateway/constitutional_runtime.js` (old GitHub-snapshot lifecycle; itself only required by `test_kernel_replay.js`), registries, and audit harnesses. NOT required by `gateway/bootstrap/gateway_runtime.js` | LEGACY |
| `WitnessGenerator` in-memory `witness_id → witness` Map | `gateway/witness_generator.js` | Requirers: `adapter_compiler_v2.js` (only required by `bootstrapping_validation.js`, which has no live requirers), `constitutional_blockers.js`, verify scripts, tests | LEGACY / PRESERVED_INACTIVE |
| `event_queue.js` `witness_id: data.witnessId || null` field | `ping-runtime/orchestration/execution/event_queue.js:74` | Live boot requires `execution/engine.js`, NOT `event_queue.js`; field is a nullable pass-through | PRESERVED_INACTIVE |
| `verification_authority.js` consuming `witness.witness_id` | `runtime/kernel/authorities/verification_authority.js` | Requirers are legacy gateway authorities (`prompt_runtime`, `knowledge_graph`, `temporal_authority`, `replay_authority` — the old lifecycle), not the live boot | LEGACY |

**Caveat on "legacy":** these paths are legacy RELATIVE TO the canonical-worker pipeline at the frozen head. The older `runtime/` omni-router world and the GitHub-snapshot `constitutional_runtime` lifecycle still reference them; if any of those are still booted somewhere (e.g., the Pig's older processes), the legacy minting is reachable THERE. Within the worktree's live boot (`gateway/bootstrap/`), they are dead. Disposition recommendation: keep PRESERVED_INACTIVE per Nolan's ruling (classify, never delete merely because authority is settled); do NOT let `WitnessRecorder`'s witness-namespace identity minting become canonical.

---

## (f) Replay audit

**Live replay path:** `gateway/bootstrap/gateway_runtime.js` → `registerCanonicalWorkers(workerRuntime, {replayProvider: new KernelReplayExecutionProvider()})` → `ReplayWorker` on `REPLAY_VERIFY`/`PROJECTION_CREATED` → `KernelReplayExecutionProvider.executeReplay(transcript)` → `DeterministicReplayEngine` (compiled JS in `gateway/replay/kernel/`) → `REPLAY_COMPLETED` → `WitnessWorker` → `WITNESS_CREATED`. Maturity: CURRENT EXECUTABLE CODE, wired in the live boot, exercised by PROVEN_UNIT/PROVEN_INTEGRATION tests (EVAL-009 determinism + failure-honesty; EVAL-010; WIT-NEG 8/8). No live-trace evidence was collected (read-only recon).

| Audit dimension | Finding |
|---|---|
| **Input set** | `transcript.state.replay_events[]`. Provider requires non-empty array, caps at `maxEvents=10000` (SILENT truncation, no flag), skips non-object/malformed envelopes via `continue` (counts `_stats.failures`, status stays `'ok'`). Missing `canonical_hash` → falls back to a 53-bit djb2-style `_computeHash(JSON.stringify(payload))` for `artifact_hash` (collision-prone; documented in code as deterministic, not as strong). |
| **Replay boundary** | `ReplayWorker._buildReplayEvents`: `payload.replay_events` in test/harness mode; PRODUCTION path is a comment ("In production, this would query Postgres ... For now, return the triggering event as a single-event replay"). So today the production boundary = the single triggering event. Correlation-group replay is designed, not implemented. |
| **Ordering source** | Array order of the input events; the provider does NOT sort. Kernel validates causal order (parent must exist, `evt-` namespace consistency, duplicate detection) but does not reorder. A future PG query (`SELECT ... WHERE correlation_id = $1` with NO ORDER BY in the sketched SQL) would make ordering non-deterministic. |
| **Canonicalization** | `CanonicalJson` (JCS-flavored): lexicographic key order, deterministic numbers, exact string preservation, F7/D1 identity domain — REJECTS NaN/±Infinity/undefined/sparse arrays/circular refs/Buffer/function/symbol/bigint, max depth 64. `canonical_bytes` = base64url of canonical JSON; fingerprint = `sha256:<hex>` of those bytes. Note: the REJECT domain means a historical event containing e.g. `undefined` or depth > 64 will THROW at replay time (fail-closed, but replay-breaking for old data). |
| **Versioning** | `engineVersion`/`witnessVersion` = `'v1'` constructor defaults; hardcoded `'1.0'` literals for schema/replay/policy/canonicalization version leaves and `'sha256'` for hash_version leaf; envelope-level `schema_version`/`replay_version`/`policy_version` default to `'3.0.0'`/`'5.0.0'`/`'1.0.0'` when the event lacks them — but the WITNESS leaves do NOT use these; they use the literals. CanonicalBytes carries `canonicalization_version: 'v1'` (code default). NONE of the actual versions are recorded per-attestation. |
| **Policy dependency** | 4 standard invariants (`ARTIFACT_HASH_VALID`, `LINEAGE_ACYCLIC`, `LINEAGE_PARENT_EXISTS`, `STATE_VERSION_CONSISTENT`), registered at engine construction, run in `invariant_id` sort order. The invariant SET is code, unversioned, unrecorded; only the live law-manifest commitment would bind it (missing from the compiled artifact — see (d)). |
| **Lineage dependency** | Derived from `artifact_lineage` edges, artifact IDs sorted deterministically; kernel enforces parent-existence and `evt-`/artifact namespace consistency. |
| **State reconstruction** | `ReplayStateMachine`: only `artifact_commit` / `artifact_update`; unknown event type → `DeterministicFailure` (kernel_error). Duplicate event/artifact IDs → failure. Immutable-copy-per-event. |
| **Invariant evaluation** | `InvariantRunner.runInvariants(state)` → violations array → serialized into `violations_canonical` leaf. `verified: true` IFF `status === 'ok' && violations.length === 0`. |
| **Divergence detection** | `ReplayVerification` (compare witness roots, fingerprints, canonical bytes, state, violations, lineage, versions, counts) EXISTS as a class; `replay_verification_port.js` has NO requirers; kernel `verifyWitnessRoot` has no live caller. Divergence detection = BUILT_NOT_LIVE. Nothing in the live loop re-verifies a historical root. |
| **Proof generation** | `MerkleTree.generateProof` / static `verifyProof` exist; no live caller found. `constitutional_proof_artifact.js` / `replay_certificate_authority.js` belong to the legacy lifecycle world. Provider returns `witness: result.witness, certificate: result.certificate` — both UNDEFINED (the engine never sets those keys): dead passthrough fields. |
| **Failure semantics** | kernel throw → `verified:false, reason:'kernel_error', witness_root:null` → WITNESS_REJECTED. violations → `verified:false` → WITNESS_REJECTED. no provider → `verified:false` → WITNESS_REJECTED. Silent input reduction (skip/cap) does NOT fail verification — the one failure-semantics hole. |

**REPLAYABLE TODAY vs REPLAYABLE IN 5 YEARS:**

Today: yes, given the same Node runtime, the same compiled JS, the same invariant set, and input events inside the F7/D1 domain with a sane `replay_events` order.

In 5 years, the following version-bound information is missing per-attestation and would have to be recovered from code archaeology (some of it is already drifting — see (d)):

1. **Leaf set and encodings**: which leaves, their IDs, byte encodings (base64url vs hex vs utf8 vs canonical-JSON buffer). Only the root hash is stored.
2. **`witness_algorithm`, `witness_version`, `leaf_count`, `tree_height`**: computed, then dropped before emission.
3. **Engine/kernel version** (`v1` default): never recorded.
4. **Canonicalization algorithm + version**: `CanonicalJson` "v1" is a code default; the leaf says `'1.0'` regardless.
5. **Hash algorithm/version**: actual = sha256 code default; the leaf says `'sha256'` regardless of what runs.
6. **Constitutional law manifest + version**: the commitment leaf is the binding; it is ABSENT from the live artifact. Even in the TS, the manifest itself (not just its commitment) must be recoverable.
7. **Invariant definitions + versions**: only bound via the (empty-when-clean) `violations_canonical` leaf and the missing commitment leaf.
8. **Input set identity**: no event IDs, no transcript hash in WITNESS_CREATED (`replay_id`/`authority.canonical_input_hash` exist only on REPLAY_COMPLETED and are not carried forward); `event_count` is on REPLAY_COMPLETED, not on the attestation.
9. **Truncation/skip flags**: maxEvents cap and malformed-envelope skips are invisible in the attested record.
10. **Actual schema/replay/policy versions in play**: the leaves carry `'1.0'` literals; the envelope defaults (`3.0.0`/`5.0.0`/`1.0.0`) are not bound into the root.
11. **Merkle construction parameters**: domain-separation bytes (0x00 leaf / 0x01 parent), duplicate-last-node odd handling, leaf sort by leaf_id, leaf hash EXCLUDING leaf_id — all code-only.
12. **Replay boundary definition**: single-event vs correlation-group — the production PG query is unimplemented; a future boundary change alters what the root covers without any version marker.

---

## (g) Contradictions

1. **AGENTS.md vs frozen code (HIGH):** 2026-08-21 session notes state "Non-replay `WITNESS_CREATE` still attests" and eventTypes exactly `['WITNESS_CREATE','REPLAY_COMPLETED']`; the 2026-09-18 commits make both false. The session note is the most likely place a future agent looks first.
2. **docs/MISSION_LIFECYCLE_AND_ROUTING.md vs frozen code:** still routes REPLAY_COMPLETED → WITNESS_CREATE mission and lists the removed eventTypes. Same for docs/LIVE_ARROW_AUDIT.md:156.
3. **TS source vs compiled artifact (HIGH):** 13-leaf spec vs 12-leaf live artifact (see (d)). The repo's own convention (TS = authoritative source, sanctioned rebuild) is violated for witness_authority: no rebuild script exists, and the artifact has never matched the TS in this worktree's history.
4. **Version leaves vs actual versions:** leaves named `schema_version`/`replay_version`/`policy_version`/`canonicalization_version` carry the literal `'1.0'` while the engine defaults and envelope defaults use different values (`v1`, `3.0.0`, `5.0.0`). The leaf names assert a binding the values do not provide.
5. **`attestation` field vs identity discipline:** `attestation: 'witness-<event_id[0:16]>'` is a truncated-event-id label on the attestation, adjacent to the canonical decision that witness_root is the proof-content identity and the event keeps canonical event identity. It is not consumed anywhere (no requirers of `payload.witness.attestation` found); it risks being mistaken for an identity.
6. **mission_control dashboard vs worker truth (LOW):** the witness-status route classifies REPLAY_COMPLETED by the `verified` boolean alone for display, while the worker requires boolean + root. A rejected-for-missing-root replay displays as "verified" on the dashboard.
7. **Dead provider fields:** `KernelReplayExecutionProvider` returns `witness: result.witness` and `certificate: result.certificate`, both always `undefined` (engine never sets them) — residue of the legacy ReplayObject/WitnessObject world, silently flowing into REPLAY_COMPLETED payloads.

## (h) Unknowns

1. Whether `gateway/bootstrap/gateway_runtime.js` is actually booted in production on the Pig (wiring is live code; no runtime trace collected per read-only law). If the Pig runs an older boot, the "live" chain above may not be the executing one.
2. Whether the legacy `runtime/` omni-router path or the GitHub-snapshot `constitutional_runtime` lifecycle is still executed anywhere (they keep the legacy witness minting reachable).
3. The intended owner of the TS→JS compile for `gateway/replay/kernel/*` (only `canonical_json` has a sanctioned rebuild; who compiles the rest, and from which TS revision?).
4. Whether `EVAL-009`/`EVAL-010`/WIT-NEG currently PASS at the frozen head (asserted by code inspection; not executed per read-only law).
5. The real production replay boundary decision: single-event replay is a documented stopgap ("For now..."); the correlation-group PG query is unimplemented. No record of when/if the boundary changes — and no version marker when it does.
6. What `REPLAY_VERIFY` payloads actually look like in production (who emits them, whether `replay_events` is ever populated outside tests).

## (i) Candidate deletions/merges (PLANS ONLY — no action taken)

1. **Stale doc corrections** (edit, not delete): AGENTS.md 2026-08-21 session notes (§2652/2656/2677), docs/MISSION_LIFECYCLE_AND_ROUTING.md, docs/LIVE_ARROW_AUDIT.md:156 — update to the post-91e1337f4 reality. The dated WITNESS_AUTHORITY_LEDGER_2026-09-16.md should get a superseding note, not a rewrite.
2. **Dead provider fields**: `witness: result.witness, certificate: result.certificate` in `kernel_replay_execution_provider.js` — always undefined; remove or wire intentionally.
3. **Legacy witness minting**: DO NOT DELETE per Nolan's classification rule (PRESERVED_INACTIVE/LEGACY must be classified, archived, and only removed after deadness is proven). Candidate for an explicit `PRESERVED_INACTIVE` marker file/index rather than deletion: `runtime/kernel/authorities/witness_authority.js` (legacy createWitness), `gateway/witness_recorder.js`, `gateway/witness_generator.js`, `gateway/memory_persistence_authority.js`, `ping-runtime/agents/agent_memory_authority.js` minting, `ping-runtime/orchestration/execution/event_queue.js` witness_id field.
4. **Naming collision**: TWO classes named `WitnessAuthority` with different semantics — `runtime/kernel/authorities/witness_authority.js` (legacy hash-contract minter) and `gateway/replay/kernel/witness_authority.js` (Merkle root calculator) — plus `runtime/kernel/replay/witness_authority.ts` (TS source of the latter). The canonical decision says "no new WitnessAuthority," yet the replay kernel's class IS named WitnessAuthority. Rename or explicitly scope the kernel one (e.g., `ReplayWitnessRootCalculator`) to prevent the exact confusion the decision warns about. PLAN ONLY.
5. **Merge the version story**: the four hardcoded `'1.0'` leaves and the envelope defaults (`3.0.0`/`5.0.0`/`1.0.0`) and the `'v1'` engine default should converge on ONE versioning scheme recorded per-attestation.

## (j) Top-5 highest-confidence improvements

1. **Regenerate the compiled witness artifact from the TS source via a sanctioned pinned rebuild** (extend the `rebuild-canonical-json.sh` pattern to `witness_authority` and the rest of `gateway/replay/kernel/`). This closes the 12/13-leaf drift at its root cause (unsanctioned artifact generation) and restores the `constitutional_law_commitment` binding in live attestations. Confidence: HIGH — drift is proven by git history, the fix direction is established by repo convention, and the missing leaf is the only true policy binding.
2. **Bind reproduction parameters into the attestation envelope**: add `witness_algorithm`, `witness_version`, `leaf_count`, `tree_height`, engine version, and input-set identity (event IDs hash + event_count + truncation/skip flags) to REPLAY_COMPLETED and carry them into WITNESS_CREATED. This is what makes a 5-year-later verification possible without code archaeology. Confidence: HIGH — the provider already computes all of these; it is purely a matter of not dropping them.
3. **Make silent input reduction fail the replay (or be attested)**: `maxEvents` truncation and malformed-envelope skips must either fail verification or be recorded as explicit attested flags (`input_truncated`, `inputs_skipped`). A `verified:true` that silently covers a reduced input set is the sharpest remaining honesty hole in the replay path. Confidence: HIGH — the skip path is 3 lines, the semantics are unambiguous.
4. **Enforce `witness_root` presence in EventGovernance schema for WITNESS_CREATED** (registry `payload_schema`), so the fail-closed `missing_witness_root` gate is a governed invariant, not just worker code. Confidence: MEDIUM-HIGH — small change, but requires regenerating the registry and checking governance enforcement semantics.
5. **Fix the stale documentation that contradicts the frozen head** (AGENTS.md session notes, MISSION_LIFECYCLE_AND_ROUTING.md, LIVE_ARROW_AUDIT.md) and add a dated superseding note to WITNESS_AUTHORITY_LEDGER_2026-09-16.md. Confidence: HIGH — zero behavioral risk, and AGENTS.md is the highest-traffic future-agent surface; leaving "WITNESS_CREATE still attests" there invites a regression.

---
*Read-only recon complete. No source files modified; no commits; no DB writes; no services touched. Only this report was written.*
