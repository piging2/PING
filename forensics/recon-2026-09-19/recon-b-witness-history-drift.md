# RECON-B: Historical Constitutional Witness Definition + 12-Leaf vs 13-Leaf Drift Resolution

**Recon pass:** 2026-09-19 (planning sprint, read-only)
**Investigator scope:** Part 1 (historical constitutional witness definition) + Part 2 (12-leaf vs 13-leaf source/compiled drift)
**Read-only law observed:** git log/show/diff/grep only; no edits, no commits, no checkouts, no test execution against shared state, no secret reads. Public repo ngesk2/crx-runtime cloned to /tmp/crx-public for inspection only.
**Target:** Pig worktree /home/nolan/worktrees/constitutional-convergence, branch constitutional-convergence-v2, HEAD 84da2d40c.

**Provenance key used throughout:**
- PUBLIC_GITHUB = github.com/ngesk2/crx-runtime (public, read-only clone)
- LOCAL_BRANCH = constitutional-convergence-v2 git history on the Pig
- LOCAL_WORKTREE = working-tree files on the Pig
- LIVE_RUNTIME = the artifact chain actually imported by the production bootstrap

---

## PART 1: HISTORICAL CONSTITUTIONAL WITNESS DEFINITION

### 1.1 The freeze commit

Commit `6c4b5317f60b3501a5730e42c9474724c8ab1539` (2026-06-08, "Freeze constitutional object model with 7 definitions (Identity, Object, Placement, Host, Owner, Revocation, Witness)") added exactly one file: `certification/CONSTITUTIONAL_OBJECT_MODEL.md` (454 lines). The Witness section (section 7) is the constitutional definition.

**Definition (verbatim):** "The cryptographic commitment to the canonical state of an object, placement, or event."

**Constitutionally required fields (verbatim interface):**
```typescript
type WitnessRoot = Brand<string, 'WitnessRoot'>;
type LineageRoot = Brand<string, 'LineageRoot'>;

interface Witness {
  witness_root: WitnessRoot;
  leaf_count: number;
  tree_height: number;
  witness_algorithm: string;
  created_at: EventTime;
}
```

**Constitutional rules (verbatim):** Witness is a Merkle tree root; Witness is deterministic; Witness is canonical; Witness is cryptographically scoped; Witness is irreversible; Witness mismatches produce typed replay failure (never silent recovery).

**What the witness commits (verbatim list):** Canonical payload; Invariant version; Replay config version; Schema version; Actor signature; Permission state.

**Constitutional authorities allowed to witness (frozen list of 7):** CanonicalJson, CanonicalHashAuthority, StateSerializer, ReplayStateMachine, DeterministicReplayEngine, InvariantRunner, WitnessAuthority.

### 1.2 What "Witness" meant there, by semantics

From the definition and the interface, Witness was a **replay commitment**: a deterministic Merkle root committing to canonical state. It was NOT:
- an attestation by an identified entity (no witness identity, no key pair, no signer field on the record),
- an identity-bearing object (no witness_id; `witness_root` is a branded hash string, a value, not an identity),
- a provenance record in the lineage sense (provenance inputs like actor signature and permission state are committed leaves, i.e., inputs to the root, not metadata on the record),
- an execution witness in the "observer process" sense (no agent, no runtime, no clock in the computation).

The `created_at: EventTime` field records when the commitment was made; it does not make the computation clock-dependent.

**Was identity mandatory?** No. The interface has no identity field of any kind.

**Was persistence mandatory?** Not in the Witness section. No storage mandate, no table, no retention rule. `created_at` implies recording, but the section states no persistence law.

**Was hashing mandatory?** Yes. Merkle tree root, deterministic, canonical, cryptographically scoped, irreversible.

**Was signature/provenance mandatory?** Partially, as input: "Actor signature" is one of the six committed leaves. There is no signature field ON the witness record itself, and no provenance metadata fields.

### 1.3 Corroborating constitutional documents (same lineage)

- **PUBLIC_GITHUB `constitutional/WITNESS_PROTOCOL.md` (2026-06-07):** "Witness is deterministic evidence artifact"; "deterministic proof of replay correctness". Flow: event stream to canonicalization to fingerprint to lineage verification to replay state to witness root. Properties: deterministic, pure (no side effects), infrastructure-independent (no network IO, no clock dependence), independently verifiable. No identity field, no persistence requirement, no signature on the record.
- **PUBLIC_GITHUB `constitutional/REPLAY_BOUNDARY.md` (2026-06-07):** "Replay MAY consume immutable events, reconstruct deterministic state, validate lineage, emit witness proofs." Replay is the emitter; witness proofs are replay's output. Replay MUST NOT depend on clocks, agents, transport, or infrastructure.
- **PUBLIC_GITHUB `CRX_CONSTITUTION.md`, Axiom 8 ("Witness Is Verification, Not Origin"):** "A witness attests that a binding between content, identity, and constitutional context holds. A witness does not create content, identity, lineage, or policy." The Witness root concept: "A verifiable attestation that a specific binding holds"; "NOT DEFINITION: Not the content itself. Not identity assignment. Not lineage creation. Not policy judgment. Not a substitute for event recording." The Witness authority is **eliminated as an independent authority**, absorbed by Identity (creation of identity proofs) and Replay (verification of attestations against reconstructed substrate): "Constitutional law requires witness facts but not a witness authority." Witness is classified as a **DERIVED** fact (ROOT/DERIVED: Derived).
- **LOCAL_BRANCH `WITNESS_AUTHORITY_REDUCTION.md` (audit 2026-06-21):** explicitly tasked to "determine whether witness can become derived artifact (Replay to Canonical Bytes to Hash to Witness)". Classified `WitnessAuthority` as DERIVED ARTIFACT with delegation chain Replay to Canonicalization to Hash to Witness.

### 1.4 The competing historical strand (recorded, not hidden)

`WITNESS_IDENTITY_SPEC.md` and `CONSTITUTIONAL_PATCH_11_WITNESS_IDENTITY.md` (LOCAL_BRANCH) define a different, older PING semantics: "Witness is cryptographically identified entity that attests to event occurrence," requiring key pairs, Sybil resistance, witness IDs computed from public keys. This is the witness-as-notary-entity lineage from which the legacy minting behavior descends. It contradicts the CRX line (Axiom 8 explicitly rejects identity assignment as a witness function). This internal contradiction is real and is exactly what the operator's standing decision resolves.

### 1.5 Four-way comparison

| Aspect | HISTORICAL CONSTITUTIONAL CONTRACT (6c4b5317f + Axiom 8 + protocol) | CURRENT LIVE REPLAY ROOT (gateway/replay/kernel) | CURRENT WITNESS_CREATED (canonical_workers.js @ HEAD) | LEGACY AGENT-MEMORY WITNESS (workers/witness_worker.py, witness_worker.py) |
|---|---|---|---|---|
| What it is | Deterministic Merkle commitment to canonical state; derived attestation; NOT identity assignment | DeterministicReplayEngine computes witness_root via WitnessAuthority Merkle tree (12 base leaves + leaf_count + tree_height = 14-leaf tree) | WitnessWorker records WITNESS_CREATED bound to the replay-computed witness_root; attestation id `witness-<event_id[0:16]>` derived from triggering event, not minted | `witness_id = uuid4()` minted at random; `witness_root` SET EQUAL to the uuid; `witness_signature = "sig_<uuid[0:8]>"` fabricated; `verified: False` |
| Identity on the record | None required | None; root is a hash value | None minted; attestation label derived | Random UUID presented as both id and root |
| Who computes | Replay (MAY emit witness proofs); WitnessAuthority is derived, not independent | Replay engine (live) | Event authority (WitnessWorker) records; replay computed | The worker itself invents the values |
| Gate | Mismatch = typed replay failure | verified must be true or REPLAY_COMPLETED is refused upstream | REPLAY_COMPLETED with verified != true yields WITNESS_REJECTED; missing witness_root yields WITNESS_REJECTED (84da2d40c); non-REPLAY_COMPLETED triggers rejected as unsupported_witness_trigger (91e1337f4) | No gate; always emits |
| Relation to operator decision | Direct ancestor of it | Implements the "replay computes deterministic witness_root" clause (but on the older 12-leaf kernel; see Part 2) | Implements the "event authority records WITNESS_CREATED bound to it" clause and the removal of the creation bypass | The "legacy witness-id minting" clause: present in tree, not wired into the live bootstrap path (preserved-inactive) |

### 1.6 Verdict: COMPATIBLE

**Verdict: COMPATIBLE.**

Key evidence:
1. The frozen constitutional interface (6c4b5317f) requires a deterministic Merkle commitment with no identity field, no signature field, and no persistence mandate. The operator's decision (witness as derived replay attestation; replay computes witness_root; event authority records WITNESS_CREATED bound to it) instantiates exactly this shape and adds nothing the contract forbids.
2. Axiom 8 ("Witness Is Verification, Not Origin"; witness is NOT identity assignment; witness authority eliminated/absorbed; witness is a DERIVED fact) is the constitutional statement of the decision's first clause, nearly verbatim.
3. REPLAY_BOUNDARY ("Replay MAY emit witness proofs") and WITNESS_PROTOCOL (deterministic evidence artifact, pure, clock-independent) support the second clause: replay computes the root.
4. The 2026-06-21 reduction audit classified the witness implementation as a derived artifact with the exact delegation chain the decision describes.
5. The legacy minting (uuid4 as witness_root, fabricated signature) contradicts the historical contract on every axis (determinism, no identity assignment, typed failure), which is precisely why the decision's third clause (preserved-inactive) is the coherent resolution rather than a revision.

Caveats recorded with the verdict:
- The corpus contains a genuine competing strand (WITNESS_IDENTITY_SPEC.md / PATCH 11: witness as cryptographically identified entity). The decision resolves this contradiction in favor of the CRX line; the verdict is COMPATIBLE with the decision, not a claim that the corpus was ever unanimous.
- `created_at: EventTime` on the frozen interface and `timestamp` on the current WITNESS_CREATED are attestation-time recordings, not clock inputs to the root computation; both are compatible with the protocol's no-clock-dependence rule for generation.
- **Historical certification is not proof of current runtime behavior.** The documents above certify what the contract said and what past audits concluded. Whether the LIVE_RUNTIME honors it is established only by the Part 2 evidence (it does not fully: the live kernel is the pre-S.16 12-leaf revision; see below).

---

## PART 2: 12-LEAF VS 13-LEAF DRIFT RESOLUTION

### 2.1 The live replay-root chain (exact files)

The production bootstrap path, verified by require-chain inspection on LOCAL_WORKTREE:

1. `gateway/bootstrap/gateway_runtime.js` (lines 86, 103, 523-529): `require('../../ping-runtime/workers/canonical_workers')` and `require('../kernel_replay_execution_provider')`; constructs `new KernelReplayExecutionProvider()` and passes it as `replayProvider` into `registerCanonicalWorkers(workerRuntime, {...})`. The inline comment calls this "the LIVE arrow: REPLAY_VERIFY / PROJECTION_CREATED events dispatch to ReplayWorker to kernel provider to verified result."
2. `ping-runtime/workers/canonical_workers.js`: `ReplayWorker` (consumes the provider), `WitnessWorker` (current WITNESS_CREATED logic), `registerCanonicalWorkers`.
3. `gateway/kernel_replay_execution_provider.js` (lines 14-16): `require('./replay/kernel/deterministic_replay_engine')`, `require('./replay/kernel/canonical_event_envelope')`, `require('./replay/kernel/replay_event_stream')`.
4. `gateway/replay/kernel/*.js` (15 files, all `require`d within that directory): deterministic_replay_engine, witness_authority, merkle_tree, canonical_json, canonical_hash_authority, canonical_event_envelope, replay_event_stream, replay_state_machine, invariant_runner, replay_invariants, replay_verification, state_serializer, deterministic_failure, replay_types, index.

**The live replay root is computed by `gateway/replay/kernel/witness_authority.js` `computeWitnessRoot`, invoked via `gateway/replay/kernel/deterministic_replay_engine.js`.**

The TypeScript sources at `runtime/kernel/replay/*.ts` are **not imported by any live path** (no require/import of them from gateway, ping-runtime, or evals; verified by repo-wide grep). They are the DESIRED SOURCE OF TRUTH only by documentation claim, not by wiring.

### 2.2 The leaf-count difference, exactly

`gateway/replay/kernel/witness_authority.js` `computeWitnessRoot` builds **12 base leaves**:
canonical_bytes, fingerprint, lineage, state_version, schema_version, replay_version, policy_version, canonicalization_version, hash_version, artifact_count, state_contents, violations_canonical; then appends leaf_count (= 14) and tree_height (= ceil(log2(14)) = 4). **14-leaf tree.**

`runtime/kernel/replay/witness_authority.ts` `computeWitnessRoot` builds **13 base leaves**: the same 12 plus `constitutional_law_commitment` (computed from `getConstitutionalLawManifest()` via `CertificateAuthority.computeConstitutionalLawCommitment` over invariant_definitions, replay_rules, witness_rules, failure_codes, authority_hierarchy); then appends leaf_count (= 15) and tree_height (= ceil(log2(15)) = 4). **15-leaf tree.**

(tree_height is 4 in both by coincidence of the logarithm.)

So "12-leaf vs 13-leaf" = 12 vs 13 **base** leaves; the entire difference is the single `constitutional_law_commitment` leaf. `grep constitutional_law_commitment gateway/replay/kernel/*.js` returns zero hits; the TS tree references it in witness_authority.ts, replay_types.ts, certificate_authority.ts, canonical_certificate.ts.

### 2.3 Why the leaf exists in TS but not in the live JS

Timeline from LOCAL_BRANCH history (observational git log/show only):
- 2026-06-27 14:47, `83112507a` "Import constitutional replay kernel": TS imported **without** the law-commitment leaf (12 base leaves; `generateWitness(eventStream, state, violations)` single-run API already present).
- 2026-06-27 16:07, `c54bd91bc` / `e6c744f82` "S.16 Epic A: collapse witness/ into replay/": **added** the `constitutional_law_commitment` leaf plus `certificate_authority.ts` and `constitutional_law_manifest.ts`. The manifest header states the purpose: "PHASE 3: CONSTITUTIONAL LAW COMMITMENT. Witness root must commit to constitutional law itself." The certificate authority doc states the purpose: "Commits to actual law, not version labels. Prevents 'same version, different implementation' ambiguity."
- 2026-08-25, `de314f664` "feat(convergence): integrate kernel replay bridge + dormant authority stubs": introduced `gateway/replay/kernel/*.js` as **"MANUAL_RECONCILIATION"** ("15 extracted kernel modules"). The file has not changed since (empty diff de314f664 to HEAD).

Decisive provenance finding: the live `gateway/replay/kernel/witness_authority.js` is **byte-identical to PUBLIC_GITHUB `dist/runtime/replay/witness_authority.js`** except for (a) a UTF-8 BOM prepended, and (b) one comment line where the `->` arrows suffered encoding mojibake (`ΓåÆ`), a scar consistent with a manual copy through Windows tooling. The same holds for 11 other compared modules (each differs from its PUBLIC_GITHUB counterpart by exactly the 2 cosmetic lines), and `deterministic_failure.js` differs by exactly those plus one surgical patch (see 2.5).

**Strongest hypothesis:** the Aug 25 manual reconciliation did not compile the then-current TS sources. It copied the **pre-S.16 compiled kernel** (the PUBLIC_GITHUB dist-era build, which predates the June 27 law-commitment addition) into `gateway/replay/kernel/`, then applied a minimal determinism patch. The `constitutional_law_commitment` leaf was therefore never dropped by an edit; it was never present in the copied revision. The commit message ("MANUAL_RECONCILIATION", "15 extracted kernel modules") records a hand copy, not a build, and no build record exists for these files.

### 2.4 Build/generation mechanism; checked-in status

- The 15 files under `gateway/replay/kernel/` **are checked in** (present in `git ls-files`; the live bootstrap imports the checked-in bytes).
- **No build mechanism covers 14 of the 15.** No `sourceMappingURL`, no header naming a source/commit/tool (already recorded in `evidence/f7-freeze-2026-09-18/01-ts-js-drift.md` for canonical_json). No tsconfig covers `runtime/kernel/replay/`; no package.json build script produces `gateway/replay/kernel/`.
- Exactly one file has a sanctioned build: `scripts/rebuild-canonical-json.sh` (established 2026-09-18, F7/D2) rebuilds `gateway/replay/kernel/canonical_json.js` from `runtime/kernel/replay/canonical_json.ts` via tsc CommonJS/ES2020, fail-closed. Commit `de1112454` ("fix(events): converge legacy ingress on constitutional event authority") carried that rebuilt artifact; the working tree now matches HEAD and the file carries the F7 identity-domain rules (depth guard 64, no NFC normalization). The F7 freeze's canonical_json drift is therefore closed for that file only.
- The rebuild script itself acknowledges the remaining drift: it prints a NOTE that a fresh tsc compile of `deterministic_failure.ts` differs from the checked-in gateway copy ("known older-revision drift, frozen in evidence/f7-freeze-2026-09-18/01-ts-js-drift.md") and deliberately does not overwrite it as out of F7 scope.

### 2.5 Semantic drift beyond leaf count (live JS vs TS source)

All verified by direct file comparison on LOCAL_WORKTREE:

1. **Invariant execution count:** TS `DeterministicReplayEngine.replay()` runs invariants once and passes `violations` into `WitnessAuthority.generateWitness(eventStream, state, violations)`. Live JS `replay()` runs `invariantRunner.runInvariants(state)` once, then calls `generateWitness(eventStream, invariantRunner, state)`, which runs them **a second time** internally. `runInvariants` is stateless/pure (fresh array per call, sorted iteration, no mutation), so the double run is redundant but output-identical. The API shape differs, not the result.
2. **Failure envelope shape:** TS `DeterministicFailureFactory.create(code, replayPhase, context)` returns `{code, replay_phase, context}` (no timestamp). Live JS `create(code, replayPhase, context, timestamp)` returns `{code, replay_phase, context, timestamp: timestamp || 'REPLAY_DETERMINISTIC_TIMESTAMP'}`. The constant preserves determinism; the public old kernel had `timestamp: new Date().toISOString()` here, a clock dependency that the live copy surgically removed (the only non-cosmetic diff vs PUBLIC_GITHUB for this file). This also repairs a REPLAY_BOUNDARY violation present in the old build.
3. **Failure code coverage:** TS defines 24 failure codes; live JS defines 17. The JS lacks the envelope-validation family: INVALID_EVENT_ID, INVALID_EVENT_TYPE, INVALID_ACTOR_ID, INVALID_TIMESTAMP, INVALID_SCHEMA_VERSION, INVALID_REPLAY_VERSION, INVALID_POLICY_VERSION, INVALID_PARENT_EVENT_IDS. The JS `canonical_event_envelope.js` (85 lines) correspondingly lacks the TS envelope's validation (123 lines).
4. **Error typing:** TS `toWitnessLeafId` throws a typed `DeterministicFailure` (INVALID_WITNESS_LEAF_ID); live JS throws a plain `Error`. The constitutional rule "mismatches produce typed replay failure (never silent recovery)" is honored in shape by the TS, degraded in the live JS at this edge.
5. **Deep freeze:** TS `replay()` and `generateWitness` return `deepFreeze(...)`d results ("Certified replay outputs must become observationally immutable"). No `deepFreeze` exists anywhere under `gateway/replay/kernel/`; the live JS returns mutable objects.
6. **Merkle hash-domain semantics (most consequential after leaf count):** live JS `hashBytes` = `sha256(0x00 || raw_bytes)` via Node crypto on raw bytes. TS `hashBytes` = `CertificateAuthority.sha256(utf8Decode(prefix || bytes))` where `decodeUtf8` is `new TextDecoder()` with **default (lossy) options**: invalid UTF-8 sequences become U+FFFD, then the string is re-encoded with TextEncoder before the pure-TS SHA-256. The fingerprint leaf is 32 raw hash bytes (hex-decoded), essentially never valid UTF-8, so the TS and JS Merkle constructions are **not behaviorally equivalent even on identical leaf sets**: recompiling the current TS would change every historical witness root, not merely add a leaf. (The pure-TS SHA-256 in CertificateAuthority is also an independent reimplementation of the primitive; its correctness was not audited in this pass.)
7. **Certificate/law machinery absent:** no `certificate_authority`, no `constitutional_law_manifest`, no `byte_utils`/`byte_authority` under `gateway/replay/kernel/`; the live JS uses Node `Buffer` throughout, the TS is runtime-neutral `Uint8Array`.
8. **Invariant set parity (no drift):** both define exactly the same 4 standard invariants (ARTIFACT_HASH_VALID, LINEAGE_ACYCLIC, LINEAGE_PARENT_EXISTS, STATE_VERSION_CONSISTENT).

### 2.6 Tests: source vs compiled; EVAL-009 / EVAL-010

- **EVAL-009 (`evals/constitutional-runtime/EVAL-009_replay_convergence.js`):** uses the **live compiled artifacts**: `ping-runtime/workers/canonical_workers.js` (ReplayWorker, registerCanonicalWorkers) and `gateway/kernel_replay_execution_provider.js` (KernelReplayExecutionProvider), which in turn loads `gateway/replay/kernel/*`. The **only** mock is `MockEventRuntime` (the event bus); the replay kernel under test is the live one. Determinism, failure-honesty, trace preservation, and composition-injection assertions all execute against the 12-leaf live kernel.
- **EVAL-010 (`evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js`):** uses live `ping-runtime/workers/canonical_workers.js` (WitnessWorker) plus `gateway/generated/event_registry.json` for the governance check; event runtime mocked. It certifies the WITNESS_CREATED/WITNESS_REJECTED gate, not the root computation.
- **`gateway/test_kernel_replay.js`** (from de314f664, 17 tests): requires the live `./kernel_replay_execution_provider`; exercises the live compiled kernel.
- **`tests/certification/*.test.ts`** (5 files: replay-determinism-1000x, replay-mutation, replay-ordering-fuzz, replay-unicode, replay-witness-regeneration): import from `../../runtime/replay/...`, a path that **does not exist** in the worktree (pre-S.16 layout). These tests cannot run as written; they certify nothing about either current tree.
- **`runtime/kernel/replay/__tests__/constitutional_primitives.test.ts`:** vitest, imports the TS source (`../canonical_json`). The only test wired to the TS tree; it does not touch witness-root computation.

### 2.7 Four-way distinction (as requested)

- **CURRENT LIVE CONTRACT:** the checked-in `gateway/replay/kernel/*.js` bytes: 12 base leaves (14-leaf tree), double invariant run (pure, harmless), deterministic-timestamp failure envelopes, 17 failure codes, plain-Error leaf-id validation, no deep freeze, Node-crypto Merkle on raw bytes. This is what EVAL-009 certifies and what the bootstrap executes. It is byte-descended from the pre-S.16 public compiled kernel plus one determinism patch.
- **DESIRED SOURCE OF TRUTH:** `runtime/kernel/replay/*.ts`: 13 base leaves (15-leaf tree) including the S.16 constitutional-law commitment, single invariant run, typed failures, 24 codes, deep freeze, runtime-neutral bytes. Claimed authoritative by convention and by `scripts/rebuild-canonical-json.sh` (which covers one file), but wired to nothing at runtime and with one vitest file as its only test.
- **BUILD ARTIFACT:** `gateway/replay/kernel/*.js` are checked-in build-like artifacts with no reproducible build for 14 of 15 files; `canonical_json.js` alone has a pinned rebuild. They are not tsc output of the current TS (proven by the semantic diffs in 2.5, which no compiler flag explains).
- **CERTIFIED SEMANTICS:** EVAL-009 certifies determinism, failure-honesty, trace preservation, and composition of the **live 12-leaf kernel**, not of the TS design. The historical certifications (6c4b5317f freeze, reduction audit, F7 freeze) certify contract intent and specific file states, never the equivalence "TS source == live artifact". No artifact in the repo certifies that equivalence, and the evidence shows it is false.

### 2.8 What the ambiguity-eliminating sprint unit must establish

A single certification unit must not choose "source wins" or "compiled wins" by fiat. It must establish, with replayable evidence:

1. **The normative leaf set**, decided explicitly: is `constitutional_law_commitment` constitutionally required (S.16 PHASE 3 rationale: commits to actual law, defeats "same version, different implementation") or is the 12-leaf set sufficient? The decision changes every witness root ever computed, so it needs an operator-grade decision record, not an engineer's preference.
2. **Hash-domain semantics pinned before any rebuild:** the TS lossy UTF-8 round trip in `MerkleTree.hashBytes` vs the live raw-bytes hashing. Whichever is chosen, the choice must be written as the normative hash rule and both trees re-verified against it; a naive `tsc` rebuild of the current TS would silently fork all historical roots.
3. **A pinned, reproducible build** from the chosen normative source to `gateway/replay/kernel/` (extending the `scripts/rebuild-canonical-json.sh` pattern to all 15 modules), with the built bytes committed and the build command recorded in-repo, so "compiled == source" becomes a checkable invariant instead of a hope.
4. **Contract tests that run against the built artifact** (not the dead `runtime/replay/` path): determinism vectors, the failure-code surface actually reachable, and a corpus replay whose expected roots are recorded, so future drift fails closed.
5. **Disposition of the divergences in 2.5** one by one (double invariant run, timestamp field, 17 vs 24 codes, plain Error vs typed failure, deep freeze, Buffer vs Uint8Array): each either adopted into the normative contract with rationale or removed, with the EVAL-009/010 assertions updated to match the chosen contract.

### 2.9 Open questions (not resolved in this pass)

- Whether any persisted witness roots exist anywhere that would be invalidated by a leaf-set change (CERTIFICATION.md claims "zero persisted"; the DB was not queried in this read-only pass beyond the F7 freeze's era census, which did not cover witness tables).
- Whether `gateway/witness_recorder.js` (Ed25519 WitnessRecorder, identity derived from root hash) is reachable from any live path; it is not required by the bootstrap chain but is referenced by gateway registry/harness files.
- The exact provenance of the BOM + mojibake + timestamp patch applied to the copied kernel (which hands, which session); the bytes prove a manual Windows-hop copy, not who performed it.

---

## Method note

All claims above derive from: `git show`/`git log`/`git diff`/`git ls-files` on LOCAL_BRANCH; `grep`/`sed`/`od`/`md5sum` reads of LOCAL_WORKTREE files; byte comparison of live files against PUBLIC_GITHUB `dist/runtime/replay/*` (base64 transfer verified by size); and reading the cited documents. No file was modified, no process restarted, no test executed against shared state. Per the task's standing rule: do not trust other agents' reports as truth; the F7 freeze document (`evidence/f7-freeze-2026-09-18/01-ts-js-drift.md`) was used as a lead and every material claim in it that this report relies on was re-verified independently against the current tree.
