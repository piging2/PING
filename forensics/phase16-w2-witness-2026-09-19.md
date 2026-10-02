# Phase 16 W-2: witness versioning + root semantics (2026-09-19)

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`
Pre-unit HEAD: `66c775d0b` (verified before any mutation; matched expectation)
Post-unit HEAD: `172577628` ("feat(witness): W-2 bind engine/algorithm versions and explicit INCOMPLETE replay state")
Worktree: clean. Explicit staging of exactly 3 files (2 modified, 1 new test).
No add -A, no reset, no clean, no history rewrite. No em dashes in new content.

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION.
Standing: witness is a DERIVED replay attestation, never a standalone authority;
witness_root comes from the canonical ping_events row, never the envelope;
12-leaf = P0 INTERIM INVARIANT.

Rule followed: FORENSICS -> DECISION -> MINIMAL PATCH -> TARGETED TEST -> REGRESSION -> EVIDENCE.

## 1. 12-vs-13 verdict: the 12-leaf interim invariant still governs

**Verdict: 12-leaf stays normative. No leaf-set change. No 13th leaf.**

Evidence, all re-verified live on this tree (not taken from reports):

- The executed artifact `gateway/replay/kernel/witness_authority.js`
  `computeWitnessRoot` builds exactly 12 base leaves (canonical_bytes,
  fingerprint, lineage, state_version, schema_version, replay_version,
  policy_version, canonicalization_version, hash_version, artifact_count,
  state_contents, violations_canonical) plus leaf_count (=14) and tree_height
  (=4): a 14-leaf tree. Zero occurrences of `constitutional_law_commitment`
  in the live file.
- `git log -S constitutional_law_commitment -- gateway/replay/kernel/`
  returns NOTHING: the live artifact has NEVER contained the 13th leaf in
  this worktree's history. The 13-leaf construction exists only in
  `runtime/kernel/replay/witness_authority.ts`, which no live require chain
  imports (verified: no reference from gateway/bootstrap, ping-runtime, or
  evals). The TS tree is an unexecuted design document, not a drifted build
  output.
- Rebuilding the TS into the live artifact is not a leaf-addition; it is a
  root fork. Recon-b 2.5(6) proved the TS and JS Merkle hash-domain
  semantics differ (TS: lossy UTF-8 round trip through TextDecoder/TextEncoder
  before the pure-TS SHA-256; JS: Node crypto sha256 over raw bytes with
  0x00/0x01 domain separation). A naive TS rebuild would SILENTLY CHANGE
  every historical witness root, not merely add a leaf. That is exactly what
  the P0 interim invariant forbids.
- No operator-grade decision record choosing the 13-leaf set exists
  (recon-b 2.8 requires one for a normative leaf-set change).

So the "13-leaf drift" is source/artifact divergence between two trees, not
drift of the executed artifact. The executed artifact is stable and stays
normative. Adopting the constitutional_law_commitment leaf remains a future
operator decision, out of W-2 scope; doing it here would violate the interim
invariant.

Normative construction recorded (and now pinned by regression test W2-2):
12 base leaves in the fixed leaf_id set, sorted by leaf_id, leaf hash over
raw bytes excluding leaf_id, sha256 with 0x00 leaf / 0x01 parent domain
separation, odd-node duplication, leaf_count=14, tree_height=4.

## 2. Version binding: two versions were missing; both now bound (additive)

Pre-W-2 state (verified against the tree, consistent with recon agent-c (b)/(f)):

| Version | Pre-W-2 status |
|---|---|
| ReplayEngineVersion | MISSING. Provider held `_engineVersion` ('v1') but never emitted it; the kernel engine has no independent engine version (its constructor arg is consumed as the witness version). |
| WitnessAlgorithmVersion | MISSING. Kernel computed `witness_algorithm: 'merkle_sha256_v1'` in `witness_root_full`; the provider flattened only the root string into `payload.replay.witness_root` and dropped the rest. |
| WitnessInputSchemaVersion | PRESENT (W-1A): `input_schema_version: 'witness-input/v1'` emitted on every attestation; it versions the canonical replay input shape the worker reads. Proven bound by W2-5 below. |

Additive change (no column exists; attestations live in the ping_events
payload JSON, so the "new field" is a new payload key; pre-existing rows
simply lack the keys, i.e. NULL, and are never backfilled):

- `gateway/kernel_replay_execution_provider.js`: the success result now
  carries `replay_engine_version` (the provider's engine version, 'v1'),
  `witness_algorithm_version` and `witness_version` (read from the kernel's
  actual `witness_root_full` object, null-safe), plus the coverage fields
  `completeness`, `input_event_count`, `input_truncated`, `inputs_skipped`.
- `ping-runtime/workers/canonical_workers.js` (ReplayWorker): the
  REPLAY_COMPLETED `payload.replay` carries all of the above through to the
  canonical row.
- `ping-runtime/workers/canonical_workers.js` (WitnessWorker `handle` and the
  `_attestFromEnvelope` unit seam): every WITNESS_CREATED now records
  `replay_engine_version`, `witness_algorithm_version`, `witness_version`,
  `replay_completeness`, `replay_input_event_count`, `replay_inputs_skipped`,
  each null-safe. A pre-W-2 certified row (no version keys) still attests,
  with NULL versions: absence is honest, never fabricated.

Honesty note recorded in code: the live tree conflates engine and witness
versions (the engine constructor's single version arg feeds the
WitnessAuthority); both are recorded as 'v1' with the conflation documented
rather than hidden.

## 3. Truncation: explicit INCOMPLETE state, never a silent partial attestation

Pre-W-2 hole (confirmed): provider sliced at `maxEvents` (default 10000) and
skipped malformed envelopes via `continue`, counting only `_stats.failures`;
status stayed 'ok', and ReplayWorker verified the reduced window as
`kernel_verified`. A truncated replay attested silently.

W-2 change (deterministic, additive):

- Provider counts `inputsSkipped` (non-object inputs + envelope-conversion
  failures) and computes `inputTruncated` (input count > maxEvents). Result
  carries `completeness: 'COMPLETE' | 'INCOMPLETE'` (INCOMPLETE when either
  occurred), `input_event_count`, `input_truncated`, `inputs_skipped`.
- ReplayWorker: `verified` now requires `status === 'ok' && completeness ===
  'COMPLETE' && violations.length === 0`. An incomplete window yields
  `verified: false` with the explicit reason `incomplete_input_set`
  (previously it would have been `kernel_verified`: the silent hole).
- WitnessWorker's existing gate (`verified !== true` -> WITNESS_REJECTED)
  then refuses attestation observably. No silent partial attestation is
  possible: INCOMPLETE can never reach WITNESS_CREATED.

## 4. Historical-root immutability proof

The W-2 patch touches only the provider response envelope and the two
workers' record construction. Zero bytes changed under
`gateway/replay/kernel/` (git diff confirms: only the two files above plus
the new test file).

Regression proof (test W2-1, `gateway/test_witness_w2_versioning.js`):

- A fixed two-event transcript was replayed through the live kernel at the
  pre-patch HEAD `66c775d0b`, producing the pinned root
  `d9a012f0d983fc3e1f779804f35cc1af7a6f08b30c4a423d870306014cd29a0b`
  with `{witness_algorithm: 'merkle_sha256_v1', witness_version: 'v1',
  leaf_count: 14, tree_height: 4}`.
- After the W-2 patch (and at the committed HEAD `172577628`), the same
  transcript reproduces the pinned root byte-identically, and a rerun is
  deterministic. The full object deep-equals the pinned value.
- Test W2-2 additionally pins the normative leaf set (12 base leaf_ids
  present, 13th absent) so any future silent leaf-set change fails closed.

Existing 12-leaf roots were not destroyed, rewritten, or silently
recomputed. The interim invariant holds.

## 5. Full regression tally (W-2 tree, commit 172577628 content)

Scratch PostgreSQL `w1a-scratch-pg` on 127.0.0.1:15439; credentials resolved
at runtime from the container environment (never printed or persisted).
Harnesses that hardcode a foreign tree path ran as byte-exact temp copies
with the path repointed; the product tree was never mutated. EVAL-010 ran via
its exported `run()` (bare `node` execution is vacuous).

| Suite | Result |
|---|---|
| W-2 witness versioning + root semantics (new, `gateway/test_witness_w2_versioning.js`) | 8 pass, 0 fail |
| W-1A invariant harness (repointed to this worktree; includes mission spoofing negatives T1/T1b/T3/T5 and bearer T7a-d) | 18 pass, 0 fail |
| convergence invariants | 67 pass, 0 fail |
| phase 7 producer migration | 50 pass, 0 fail |
| phase 9 model-B proof | 32 pass, 0 fail |
| phase 12 collision/duplicate law | 54 pass, 0 fail |
| phase 13 fanout exactly-once | 31 pass, 0 fail |
| phase 14 ordering | 21 pass, 0 fail |
| constitutional eval (EVAL-001..009, mock) | 82 pass, 3 fail (pre-existing EVAL-006 1/4: mission is running / mission completed / result not overwritten; repair is uncommitted WIP in the dirty worktree, untouched) |
| EVAL-010 witness failure honesty (via run()) | 34 pass, 0 fail |
| sequence/replay cert (repointed temp copy) | 70 pass, 0 fail, 1 blocked (T5: `docker restart p0-cert-postgres` -> No such container; environmental, verbatim as Phase 15) |
| witness negative-path (`gateway/test_witness_negpath.js`) | 9 pass, 0 fail |

Total: 466 pass, 3 pre-existing fails (EVAL-006, unchanged), 1 environmental
block. No new failures introduced by W-2.

## 6. Carryovers (unchanged, not W-2 scope)

- EVAL-006 3 failures: pre-existing; repair lives as uncommitted WIP in the
  dirty worktree, untouched per instructions.
- MissionRuntime.create() content-drift decision: open follow-up from
  Phase 12.
- EventGovernance payload_schema for WITNESS_CREATED still does not enforce
  `witness_root` presence (worker-code gate only); the new version fields are
  likewise worker-bound. Registry regeneration is a separate unit.
- The TS `runtime/kernel/replay/*` 13-leaf design and the sanctioned rebuild
  story for `gateway/replay/kernel/` remain open; adopting the
  constitutional_law_commitment leaf requires an operator-grade decision
  record plus a hash-domain-semantics pin first (a naive rebuild forks all
  historical roots).

## W-2 VERDICT

W-2 GO. The two missing versions are now bound into every attestation
(additive, null-safe for legacy rows), truncated/incomplete replay windows
are an explicit INCOMPLETE state that can never attest silently, the 12-leaf
interim invariant is preserved and regression-pinned, the pinned historical
root reproduces byte-identically, and the full battery is green (466 pass;
only the 3 pre-existing EVAL-006 failures and the environmental T5 block
remain, both unchanged from Phase 15).

Commit: `172577628` ("feat(witness): W-2 bind engine/algorithm versions and
explicit INCOMPLETE replay state"). Product diff: +63/-3 across 2 files, plus
the new 8-check W-2 harness. No kernel files touched. No deletions.
