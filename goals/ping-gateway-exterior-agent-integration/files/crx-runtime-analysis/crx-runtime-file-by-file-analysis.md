# crx-runtime: file-by-file analysis

Analyzed 2026-09-11 from a fresh clone of https://github.com/ngesk2/crx-runtime. Every file below was read. Claims were checked against the actual code on disk.

## What this repo claims to be

CRX is Nolan's "constitutional replay kernel": a deterministic event-sourcing substrate where every state change is an immutable event, replaying the event log reproduces identical state, and a Merkle witness root proves it. Around that core sits a constitutional governance layer (authorities, policies, audits) meant to keep AI agents from forking truth. The ambition is real and the crypto core is genuinely implemented. The repository around it is not in a working state.

## Verdict up front

1. The deterministic core in `dist/runtime/replay/` is real code with real bugs. The two P0 bugs break everything downstream of event envelopes, and one determinism hazard (`new Date()` in failure envelopes) contradicts the project's central claim.
2. Nothing in the repo builds, boots, or passes CI as committed. The Dockerfile, CI workflow, tsconfig, and eslint config all target a phantom `runtime/replay/` tree that does not exist.
3. The audit/report corpus (97 files) was largely written against a different machine: Nolan's Windows workspace `C:\Users\nolan\CRX`, not this GitHub repo. Many "verified" findings are unverifiable here.
4. The certification layer is stale: frozen corpus hashes do not match the corpus files, the freeze SQL would reject the frozen values, and several "PASSED" audits describe code that does not exist.
5. Hygiene problems: a committed `.env`, a hardcoded Postgres password, committed `node_modules`, `.docker`, `__pycache__`, and a file literally named `touch src/engines/canonical_engine.ts`.

---

## 1. Root files

### README.md
Purpose: repository title stub. Contents: one line, `# crx-runtime`. Issue: a repo with 5+ constitutional documents has no overview, quickstart, or links.

### AGENT.md
Purpose: supreme agent directive declaring the authority hierarchy and laws for execution, infrastructure, and consolidation. Contents: mission ("replayable constitutional cognition substrate"), REUSE-BEFORE-CREATE law, event law with a canonical event envelope, infrastructure law (`infra/` must own all compose), agent behavior law, audit duties. Issues: references paths absent from this clone (`vos/viz/schema/`, `infra/`, `runtime/kernel/commit-service`); describes the Windows workspace layout, not this repo; claims authority over sub-repos (`knowledge/`, `vos/`) that are not present.

### CRX_CONSTITUTION.md
Purpose: the frozen constitutional kernel spec: 8 axioms, 5 root authorities (Identity, Lineage, Event Recording, Replay, Policy), root vs derived fact taxonomy, minimum replay set. Contents: phases 1-7 from axioms to an elimination test that demotes Witness and Canonicalization to absorbed authorities, ending in a kernel equation and freeze declaration. Issues: says FROZEN, but legacy-preservation-report.md says the freeze gate is NOT READY (FCA-11/FCA-12 incomplete). The latest git commit freezes a 7-definition object model that includes Witness, contradicting this document's elimination of Witness as an independent authority. Normative prose only, no implementation references.

### AUTHORITY_CONFLICT_REPORT.md
Purpose: phase-4 audit reconciling competing constitutional authorities. Contents: duplicate `AGENT.md` under `CascadeProjects/`, 4 competing event schemas, 2 compose stacks, 3 agent ontologies, one authority leak (`commit_controller.ts` doing derivation in transport). Issues: written against `C:\Users\nolan\CRX`; much of what it audits does not exist in this clone. Its "RESOLUTION: delete CascadeProjects/" was never applied.

### EXECUTION_REALITY_REPORT.md
Purpose: phase-5 "can anything boot" audit. Contents: claims 8 verified runtime components bootable via `npm run dev` with `DATABASE_URL`; declares replay and policy DOC_ONLY, infrastructure GENERATED_NOT_IMPLEMENTED. Issues: everything it verified as runtime truth is absent from this clone (`runtime/` is empty). Directly contradicts legacy-preservation-report.md, which claims an executable replay engine exists. One of the two is factually wrong about replay.

### FILE_INVENTORY.md
Purpose: SHA256 inventory of 12 commit-service source files for audit. Contents: per-file hashes, line counts, notes about a deleted `models/artifact.ts`. Issues: inventories files that do not exist here; hashes unverifiable; references commit `10353c8...` with no chain to current HEAD (`6c4b531`). Audit trail with no live anchor.

### REPOSITORY_PROVENANCE_MAP.md
Purpose: phase-3 classification of original repo content vs agent-generated content (wrong-location `CascadeProjects/`). Contents: dir-by-dir ORIGINAL vs GENERATED table; documents an agent accidentally creating files in `C:\Users\nolan\CascadeProjects` instead of `C:\Users\nolan\CRX`. Issues: reads like an LLM confession log; instructs readers to IGNORE `CascadeProjects/`, yet it remains in the repo.

### VERIFIED_EXISTING_FILES.md
Purpose: phase-1 filesystem truth walk. Contents: tables over AGENT.md, knowledge/, vos/, runtime/, agents/, infra/ with VERIFIED/SHADOW/MISSING labels. Issues: audited the Windows workspace, not this clone. `knowledge/`, `vos/`, `runtime/kernel/commit-service/` do not exist here; root `.git` DOES exist here (report says it does not).

### VERIFIED_RUNTIME_ENTRYPOINTS.md
Purpose: phase-2 verification that entrypoints resolve. Contents: verifies `server.ts` boots Express on :8080; full commit-path forensics; declares `agents/docker-compose.yml` broken. Issues: the entrypoint it verifies does not exist on disk here. Claims "NO Dockerfile exists for runtime commit-service", contradicted by the root Dockerfile (which is itself unbuildable). Claims "0 UNVERIFIED" files, false in this clone.

### legacy-preservation-report.md
Purpose: phase-0 legacy audit classifying files KEEP/ARCHIVE/MERGE/DELETE ahead of the freeze. Contents: declares all of `runtime/replay/` (15 files) and `runtime/adapters/` (3 files) KEEP and "complete and hardened"; freeze gate NOT READY pending FCA-11/FCA-12. Issues: (a) `runtime/replay/` does not exist on disk, the 18 KEEP files are phantom; (b) crowns `witness_authority.ts` and `canonical_hash_authority.ts` as "sole authorities", violating CRX_CONSTITUTION.md's elimination of both; (c) says freeze NOT READY while the constitution says FROZEN; (d) uniform KEEP verdicts and self-congratulatory PASS checklists with no evidence citations.

### Dockerfile
Purpose: multi-stage production image for the "Constitutional Replay Kernel". Contents: pinned `node:20.11.1-alpine`, `npm ci`, global `typescript@6.0.3`, `npx tsc`, HEALTHCHECK and CMD running `runtime/replay/constitutional_self_check.ts`. Issues: unbuildable. No root `package*.json` (COPY/npm ci fails); `runtime/replay/` does not exist; `constitutional_self_check.ts` does not exist; TypeScript 6 is not a released major; CMD echoes rather than serving traffic, so the container never serves anything.

### docker-compose.yml
Purpose: two-service stack (replay kernel + PostgreSQL with schema/index freeze SQL). Contents: `crx-replay-kernel` with healthcheck, `postgres:15-alpine` with freeze SQL mounted into initdb. Issues: hardcoded `POSTGRES_PASSWORD=crx_password` in plaintext with port 5432 published to host. Claims "zero database dependencies" while wiring schema freeze into Postgres initdb. Second compose stack alongside `agents/docker-compose.yml`, the exact duplication AGENT.md forbids. Deprecated `version: '3.8'` syntax.

### .dockerignore
Purpose: excludes non-kernel files from the Docker build context. Contents: ignores node_modules, dist, `*.ts` except tsconfig, git, docs, reports, legacy dirs. Issues: internally consistent but operates on a fiction, excluding files to build a kernel from `runtime/replay/` which does not exist.

### .eslintrc.json
Purpose: lint config for the replay kernel with custom `no-replay-forbidden-imports` rule. Contents: extends `eslint:recommended`, sets the TS parser, enforces the custom rule repo-wide and under `runtime/replay/**`. Issues: the custom rule is declared `"error"` but no plugin provides it, so ESLint errors on unknown rules. TS parser set without the plugin. Override path targets a nonexistent directory. Dead config.

### tsconfig.json
Purpose: TypeScript config for the kernel build. Contents: ES2022/CommonJS, `outDir dist`, `rootDir .`, includes `runtime/replay/**/*.ts` and `tests/**/*.ts`; `strict: false`. Issues: include globs match almost nothing real (`runtime/replay/` absent; only `tests/replay/replay.test.ts` matches). Does NOT include `kernel/commit-service`, so the root build never compiles the actual server. `strict: false` undercuts the "hardened" claims. `ignoreDeprecations: "6.0"` plus `typescript@6.0.3` suggests a TypeScript 6 that does not exist.

### .github/workflows/replay-integrity.yml
Purpose: CI enforcing replay-kernel purity. Contents: runs on PR/push; Node 18; `npm ci` in `./runtime/kernel/commit-service`; dependency validator; `npm run replay:test`; grep checks for forbidden imports in `runtime/replay/`. Issues: (a) `./runtime/kernel/commit-service` does not exist, step 1 fails immediately; (b) `npm run replay:test` exists in no discoverable package.json; (c) Node 18 in CI vs pinned Node 20.11.1 in Dockerfile; (d) validator target `runtime/replay` is phantom. CI cannot pass as written.

---

## 2. Kernel source and dependency guard

### kernel/commit-service/package.json
NPM manifest for the commit service (Express + Postgres deps, ts-node dev runner). `dev` runs `ts-node src/server.ts`. Issues: `typescript: ^6.0.3` and `@types/node: ^25.6.2` do not exist publicly, so `npm install` fails to resolve. `pg` is installed but never imported anywhere (dead dependency; the commit endpoint persists nothing). `test` script always exits 1. `main: index.js` points at a nonexistent file. No `build` or `start` script.

### kernel/commit-service/tsconfig.json
Strict TypeScript config (ES2022, CommonJS, `rootDir ./src`, `outDir ./dist`). Issue: the garbage path `src/engines/touch src/engines/canonical_engine.ts` still satisfies `rootDir`, so the misplaced file compiles silently instead of erroring.

### kernel/commit-service/src/server.ts
Express bootstrap exposing `POST /kernel/commit`. Single route wired to `commitArtifact`, hardcoded port 8080. Issues: no request-size tuning, no 404 handler, no error middleware, no auth or rate limiting on a commit endpoint, no graceful shutdown.

### kernel/commit-service/src/api/commit_controller.ts
HTTP handler: hashes the artifact, validates lineage, returns acceptance. Issues: the "commit" persists nothing, no DB write despite `pg` installed. `artifact` is never validated against the `Artifact` interface (TS interfaces are compile-time only). Non-array `lineage.parents` throws a raw TypeError that leaks in the 400 response. Parent IDs are never checked to exist anywhere. Sync validation, fine, but shallow.

### kernel/commit-service/src/engines/identity_engine.ts
Computes the canonical SHA-256 identity hash. Issues: imports from `"./touch src/engines/canonical_engine"` (literal spaces, works on disk, clearly accidental). Circular input causes infinite recursion. `Map`/`Set`/class instances serialize degenerately (`new Map()` hashes identically to `{}`), a real identity-collision quirk for a "canonical" hash.

### kernel/commit-service/src/engines/touch src/engines/canonical_engine.ts
The legitimate `canonical_engine.ts` (recursive key-sorting canonicalizer, `Object.keys().sort()`) stranded inside directories literally named `touch src/engines/`. Someone ran `touch src/engines/canonical_engine.ts` from inside `src/engines/`, creating nested directories instead of a file, and the import was then written to match the broken path instead of fixing the layout. Move it to `src/engines/canonical_engine.ts` and fix the import. Logic note: key sort is UTF-16 lexicographic, deterministic but not locale-aware; `undefined`/functions/symbols are dropped later by `JSON.stringify`, not here.

### kernel/commit-service/src/models/artifact.ts
TypeScript interface (`artifact_type: string`, `content: any`). Pure type declaration, nothing imports it, and `content: any` makes it a weak contract anyway.

### kernel/commit-service/src/validation/dag_validator.ts
Lineage sanity checks: throws on self-parent and duplicate parents. Issues: extremely shallow. No transitive cycle detection, no existence check (you can commit a child of nonexistent parents), `parentIds` never runtime-checked to be an array. The name overpromises.

### tools/dependency-guard/ci-enforcement.sh
CI gate running the dependency validator and an ESLint rule against the replay kernel. Issues: two fatal bugs. With `set -e`, if `npx ts-node` exits nonzero the script dies at that line, so the `if [ $? -ne 0 ]` check below is unreachable. Worse, `dependency-validator.ts` only defines `validateReplayDependencies` and never calls it, so the invocation always exits 0: the validator never actually runs. Also targets `runtime/replay`, which does not exist, and the eslint `--rule` string is never registered as a plugin.

### tools/dependency-guard/dependency-validator.ts
Static scanner flagging forbidden imports and `process.env` in the replay kernel. Issues: regex misses side-effect imports, `require()`, `export ... from`, dynamic `import()`; multiline imports evade it without the `s` flag; false positives from comments. Forbidden list is inconsistent with the ESLint rules file (which bans more modules). The two enforcers disagree with each other.

### tools/dependency-guard/replay-dependency-rules.js
Custom ESLint rule `no-replay-forbidden-imports`: no IO/network/process imports, no `process.env`, no `Date.now`/`Math.random`/`fetch`/dynamic imports. Issues: nothing in this repo lives under `runtime/replay`, so the rule can never fire here, while the real service imports `express`, the exact thing the guard forbids. Detection gaps: `process['env']`, destructured `Date.now`, `globalThis.fetch` all evade it. No eslint config loads this rule file.

---

## 3. Replay runtime, tests, and corpus

`dist/runtime/replay/*.js` is compiled TypeScript CommonJS output (`"use strict"`, `__esModule` markers). No source maps, no TS sources in the repo. This is the only executable kernel in the repo, and it is real code with real bugs.

### canonical_json.js
RFC-8785-style canonicalization: key sorting (UTF-16 code-unit order), NFC string normalization, number handling, circular/sparse-array rejection. Bugs: no `stringify` static exists, yet `canonical_event_envelope.js` calls `CanonicalJson.stringify` twice, so envelope construction always throws TypeError. Non-JSON inputs are not rejected despite the docstring: BigInt throws a raw TypeError (not a deterministic failure), while functions/symbols/`undefined` are silently dropped so distinct inputs canonicalize identically. The scientific-notation branch in `canonicalizeNumber` is dead code.

### canonical_event_envelope.js
Validated, immutable event envelope with typed getters; 9 required fields, deep copy, base64 canonical bytes. Critical bug: constructor calls the nonexistent `CanonicalJson.stringify`, so every envelope construction throws. This breaks `ReplayEventStream.fromJSON`, the engine, and all tests that build envelopes. Secondary: `getPayload()`/`getLineage()` return live internal references, contradicting the immutability claim; validation throws plain `Error`, not deterministic failures.

### canonical_hash_authority.js
SHA-256 fingerprinting over canonical bytes; `hashBytes` digests with node:crypto, output prefixed `sha256:<hex>`. Deterministic, no hazards. Minor: no domain tag on preimages here (domain separation lives only in the Merkle tree).

### deterministic_failure.js
Typed failure envelopes (`FailureCode` x `ReplayPhase`) with `toError`/`fromError` bridging. Determinism hazard: `create()` stamps `timestamp: new Date().toISOString()`, so identical failures produce different envelopes across runs, directly contradicting the module's "no runtime-dependent error messages" requirement. Any hashed failure record is non-reproducible.

### deterministic_replay_engine.js
Orchestrates a full replay: state machine, canonical bytes, fingerprint, invariants, witness root, lineage graph. Issues: runs invariants twice per replay (wasted work); `witnessVersion` threaded but version strings inconsistent (`'v1'` vs `'1.0'`); constructor hard-registers the standard invariants, so no custom invariant injection (limits testability).

### index.js
Barrel re-exports, 10 classes via lazy getters. Notably does not export `CanonicalJson`, `DeterministicFailureFactory`, `StateSerializer`. No hazards; omitting the failure factory forces consumers to catch untyped errors.

### invariant_runner.js
Runs invariants in `invariant_id` sort order; cycle detection, forbidden-edge detection, lineage validation with deterministic sorted DFS. Issue: `detectCycles`/`detectForbiddenEdges`/`validateLineage` are dead-ish API (the engine never calls them; invariants use inline logic). `validateLineage` fails for evt-namespaced parents.

### merkle_tree.js
Binary Merkle tree, SHA-256, domain separation (`0x00` leaf / `0x01` parent), odd-node duplication, proof generation/verification. Deterministic, no hazards. Minor: zero-leaf construction throws plain `Error` instead of a deterministic failure.

### replay_event_stream.js
Immutable ordered event stream; accessors return copies; `appendEvent` returns a new stream. Issue: `fromJSON` is broken in practice (envelope constructor throws). `getLineageChain` traverses `parent_event_ids` as event IDs, inconsistent with artifact-namespaced lineage elsewhere.

### replay_invariants.js
Four standard invariants: `ARTIFACT_HASH_VALID`, `LINEAGE_ACYCLIC`, `LINEAGE_PARENT_EXISTS`, `STATE_VERSION_CONSISTENT`. Bugs: `LINEAGE_ACYCLIC` is dead, it can never fire because the state machine throws `PARENT_NOT_FOUND` before the invariant runs. `LINEAGE_PARENT_EXISTS` treats stored `evt-*` parent IDs as artifact IDs and always reports them missing, contradicting the corpus expectation of zero violations. `ARTIFACT_HASH_VALID` accepts any non-empty string as a valid hash (no format check).

### replay_state_machine.js
Applies `artifact_commit`/`artifact_update` events with lineage, duplicate, and namespace validation. Enforces one namespace per lineage. Bugs: stores the raw `parent_event_ids` (evt IDs) in `artifact_lineage` instead of converted artifact IDs, the root cause of the invariant contradiction above. Payload schema validation is dead code: `payload.artifact_id` is dereferenced before the null check, so a missing payload throws raw TypeError. `artifact_update` on a nonexistent artifact is silently dropped. Non-`evt-` IDs assumed to be artifact IDs without prefix validation. `immutableCopy`/`getArtifactState` are shallow: lineage arrays shared by reference (mutation hazard).

### replay_types.js
Branded ID types (`evt-`, `artifact-`, witness leaf) with guards, plus execution limits (1M events, 10M edges, depth 1000). Issues: guards throw TypeError on non-string input instead of returning false. `MAX_REPLAY_DEPTH` exported but never enforced. Branding is compile-time only; in this compiled JS there is no runtime branding.

### replay_verification.js
Compares two replay results across 8 dimensions; `verifyReproducibility` replays N times and compares. Sound approach (all comparisons through canonical serialization). Gaps: boolean-only comparisons with no diff output (failures undiagnosable); `verifyDeterminism` replays with the same code, so there is no independent oracle.

### state_serializer.js
Deterministic serialization of replay state and violations to canonical bytes. Sorts artifact IDs and per-artifact lineage; violations sorted by `invariant_id`. Violation sort key is `invariant_id` only, so same-invariant violations keep input order (V8 stable sort keeps it deterministic for identical inputs). No hazards.

### witness_authority.js
Builds the 14-leaf witness Merkle tree (canonical bytes, fingerprint, lineage, state, violations, version/count metadata) and the lineage graph. Inconsistencies: `schema_version`/`replay_version`/`policy_version` leaves hardcoded `'1.0'` (per-event versions ignored, version heterogeneity invisible to the witness); `canonicalization_version` is `'1.0'` while `CanonicalHashAuthority` defaults to `'v1'`; `hash_version` leaf contains `'sha256'` (the algorithm name, not the version). `generateWitnessRoot` just unwraps a field (trivial).

### tests/replay/replay.test.ts
Six hand-rolled console-log tests (not a framework; manual pass/fail counting with `process.exit`; imports TS source paths `../../runtime/replay/...`). Cannot run as-is: `runtime/` is an empty directory, so every import fails. Tests 1, 2, 5 would also throw on the envelope `stringify` bug. Test 6 greps only `.ts` files for three substrings and would miss the actual impurity (`new Date()` in deterministic_failure). No assertions on actual hash/witness values.

### tests/replay/corpus/*.json (8 files)
`minimal_event_stream.json`, `deterministic_replay.json`, `lineage_chain.json`: happy-path fixtures, but all expected hashes/witness roots are `"sha256:placeholder_..."`, never filled with real vectors, so they assert nothing. No test consumes them. `deterministic_failure.json`: misnamed, it is a successful 4-event chain expecting zero violations, but the implementation produces `MISSING_PARENT` for evt-parents (verified contradiction). `cycle_violation.json`: expects a `LINEAGE_ACYCLIC` violation, but the scenario is unreachable (first commit references nonexistent `artifact-003` and throws `PARENT_NOT_FOUND`); the invariant it targets is dead code. `duplicate_event.json`: expects `DUPLICATE_EVENT` invariant that does not exist (duplicates throw `DUPLICATE_EVENT_ID` during apply); also expects committed state even though replay aborts. `parent_violation.json`: expects invariant `PARENT_EXISTENCE` (nonexistent) and an error message matching neither the code nor its format. `unicode_normalization.json`: single payload, all placeholders; NFC behavior never asserted.

### tests/corpus/*.json (5 files)
Frozen vector fixtures with real computed values (e.g. `minimal_replay.json`: fingerprint `sha256:ab75672b...`, witness root `3cdd550c...`, leaf_count 14, tree_height 4). Generated by `generate-corpus-vectors.ts` against a working build, but the current `dist` cannot reproduce them (envelope construction throws), so the frozen vectors are currently unverifiable. No test compares live output against these vectors.

### tests/certification/*.ts (6 files)
`generate-corpus-vectors.ts`: freezes expected vectors by replaying each stream; imports nonexistent `runtime/` TS paths; cannot run as-is. `replay-determinism-1000x.test.ts`: replays 4 corpora 1000x each, checks witness-root self-equality only (not state, violations, or frozen vectors); self-consistency only, would pass even with wrong-but-stable output. `replay-mutation.test.ts`: mutating a plain unfrozen object always succeeds silently, so the "immutability" check is vacuous. `replay-ordering-fuzz.test.ts`: replays one fixed 3-event stream 100x, never permutes; not actually a fuzz test. `replay-unicode.test.ts`: replays 8 unicode payloads twice each; never asserts NFC normalization actually happened; self-consistency only. `replay-witness-regeneration.test.ts`: doubly broken, calls `generateWitness(eventStream, state, violations)` but the real signature is `(eventStream, invariantRunner, state)`, and destructures a return shape that does not exist. Can never pass.

### docs/REPLAY-CORPUS.md
Design doc proposing corpus layout and five determinism measurement methods, with FACT/INFERENCE/UNKNOWN classifications. Stale vs reality: documented directory structure does not match the actual flat corpus files; field names differ from implementation (`parent_ids` vs `parent_event_ids`, `schema_hash` vs `schema_version`); the doc's corpus was never implemented as specified and no test follows its process.

---

## 4. Constitutional and certification

### constitutional/CONSTITUTIONAL_FOUNDATION.md
Doctrinal charter: reuse-before-create, 9 permanent kernel authorities, kernel purity, replay/witness rules, canonical event envelope. Aspirational by design (doctrine, and its own "Misconception 8" admits doctrine is not executable authority). Ironic: section 13 warns against excessive top-level constitutional documents while the repo contains dozens.

### constitutional/REPLAY_BOUNDARY.md
Defines what replay MAY do (consume immutable events, reconstruct state, validate lineage, emit witnesses) and MUST NOT do (network IO, infra mutation, clocks, agents/transport/Express/pg). Honestly admits all 4 enforcement mechanisms are NOT_IMPLEMENTED; cites 1 violation, `db.ts` reading `DATABASE_URL`. That citation is miscategorized: `db.ts` lives in commit-service, which every other doc classifies as infra, not replay.

### constitutional/WITNESS_PROTOCOL.md
Spec for the witness pipeline: event stream to canonicalization to fingerprint to lineage verification to replay state to witness root (Merkle). Ends with "RECOMMENDATION: Implement witness protocol", i.e. unimplemented. "Cross-runtime consistency" assumes runtimes that do not exist.

### certification/CONSTITUTIONAL_OBJECT_MODEL.md
Freezes 7 domain definitions (Identity, Object, Placement, Host, Owner, Revocation, Witness), 8 object states, 7 authorized modules, and a Temporal-to-DBOS pivot. Purely aspirational: none of these types exist in code. Freezing definitions with "Next Step: Implement Layer 1" freezes nothing. The DBOS/distributed roadmap contradicts the foundation doc's "no distributed abstractions" restraint.

### certification/hashes/corpus_sha256.txt
Frozen SHA256 hashes of the 5 corpus JSON files. Contradicted: all 5 hashes mismatch the actual `tests/corpus/*.json` files. The freeze attests to a corpus that is no longer present.

### certification/hashes/witness_roots.txt
Frozen witness root per corpus vector. Internally consistent (all 5 match the manifest), but they attest to the same absent corpus, so the freeze is stale.

### certification/vectors/replay_vectors_manifest.json
Frozen replay vectors: base64 canonical bytes, fingerprints, witness roots, tree metrics (leaf_count 14, tree_height 4 across all). Partially substantiated: sha256(canonical bytes) equals the claimed fingerprint for all 5 vectors. But `canonical_bytes_hash` is misnamed (it is the bytes, not a hash), `lineage_graph_hash` is the literal placeholder string "deterministic_derivation", and re-canonicalizing the repo's own corpus files with the repo's own `canonical_json.js` does not reproduce any fingerprint, confirming corpus drift.

### certification/reports/certification_report.md
Master certification record, verdict PASSED. Claims 4000/4000 determinism matches, zero fuzz/unicode/mutation failures, no shadow authorities, clean git, GO for postgres/docker/ollama/persistence/distributed. Self-certification ("Certification Authority: Cascade Constitutional Kernel"). Since the corpus no longer matches the freeze, a rerun today would fail corpus-hash verification. GO verdicts for distributed replay and Ollama rest on docs, not executed integration tests.

### certification/reports/clean_room_reproducibility_report.md
Claims clean-room (clone, no `npm ci`) reproduction of all artifacts with identical roots/fingerprints/hashes and zero dependencies. Stale: the procedure invokes `npx ts-node` on `.ts` kernel sources that do not exist, and corpus-hash equivalence is currently false. "Zero dependencies" ignores the TypeScript toolchain the procedure itself requires.

### certification/reports/dependency_drift_report.md
Declares dependency drift N/A because the kernel has zero dependencies; lists 13 pure-TypeScript kernel files. Mostly substantiated for the compiled kernel (`dist/runtime/replay` uses only Node's `crypto`; confirmed no other imports). But it inventories `.ts` filenames absent from the repo, so the file-level claim cannot be audited as written.

### certification/reports/deployment_readiness_decision.md
Phase 13 GO/NO-GO across postgres, docker, ollama, persistence, distributed replay. Claims all GO conditions met. Aspirational: every item in its own deployment checklist is an unchecked box. GO on Ollama/distributed asserted without integration evidence.

### certification/reports/determinism_results.json
Records the 1000x determinism test: 4000/4000 pass. Unverifiable: no logs, no run metadata, and `vectors_tested` lists only 4 of the 5 vectors (`violation_replay` omitted without explanation). An assertion file, not evidence.

### certification/reports/distributed_worker_safety.md
Specifies cross-worker determinism; claims guarantees "documented" and divergence detection "implemented"; audit PASSED. False: no worker code, no distribution code, no divergence-detection code exists anywhere in the repo. A requirements doc wearing an audit's clothes.

### certification/reports/fuzz_results.json
Records the ordering fuzz test: 100/100 pass. Mislabeled: "execute same event stream 100 times" is a determinism retest, not a fuzz test; no permutation fuzzing occurred. Unverifiable.

### certification/reports/immutability_audit.md
Verdict "STRUCTURALLY IMMUTABLE". Claims `Object.freeze(result)` at `deterministic_replay_engine.ts:85-86`. Contradicted: zero occurrences of `Object.freeze` anywhere in `dist/runtime/` (the only executable artifact). The central claim is false against the shipped code, and all line citations point to `.ts` files absent from the repo.

### certification/reports/js_runtime_boundary_audit.md
Verdict "CONSTITUTIONALLY SEALED". Claims single-source authorities with zero violations. Directionally substantiated: canonicalization flows through `CanonicalJson` and hashing through `crypto/sha256`, with `JSON.stringify` used only post-canonicalization. But citations are to missing `.ts` files, and the "infra-only" labeling of commit-service's parallel hashing is a naming convention, not an enforced boundary.

### certification/reports/mutation_results.json
Records the mutation test: 1 attempt, 0 successes. Vacuous (a single attempt is trivially weak) and stale (no `Object.freeze` in shipped code). Unverifiable.

### certification/reports/ollama_isolation_boundary.md
Declares Ollama outputs untrusted inputs, never replay authorities; audit PASSED. Aspirational: no Ollama integration code, no validation layer, no proposal pipeline exists to audit. A policy statement presented as a passed audit.

### certification/reports/persistence_architecture_report.md
Asserts persistence stores replay truth but never computes it; SQL is storage-only. Directionally plausible (`dist/runtime` has no db code), but inventories 13 `.ts` files that do not exist. The claimed kernel-to-infra delegation is not wired up by any visible code.

### certification/reports/postgres_index_freeze.sql
Frozen index definitions for 7 tables. Harmless as SQL, but indexes on `created_at` everywhere while the constitution forbids replay dependence on clocks, and it creates mutable `index_version` bookkeeping inside an "immutable freeze".

### certification/reports/postgres_schema_freeze.sql
Frozen schema with CHECK constraints for 7 tables. Contradicted by its own certification data: `CHECK (witness_root ~ '^[A-F0-9]{64}$')` requires UPPERCASE hex, but every frozen witness root and fingerprint is lowercase, so inserting the certified values would violate the constraint. `certification_vectors.fingerprint` is `VARCHAR(64)` while recorded fingerprints carry the `sha256:` prefix (71 chars) and would not fit.

### certification/reports/replay_authority_map.md
Maps every authority call site; verdict single-source authorities, zero duplicates. Roughly true against `dist/`, but citations reference missing `.ts` files, and it quietly documents `witness_authority` computing fingerprints itself, undercutting the "single hash authority" narrative.

### certification/reports/runtime_entropy_audit.md
Proves zero entropy sources in the kernel; verdict ZERO ENTROPY. Substantiated, the most code-grounded audit in the set: confirmed no `Date.now`/`Math.random`/`performance.now` in `dist/runtime/replay`, and the single `new Date().toISOString()` exists in `dist/runtime/replay/deterministic_failure.js` (line 62 in compiled output).

### certification/reports/unicode_results.json
Records unicode normalization testing: 8/8 pass, NFC per RFC-8785. Mechanism plausible (`canonical_json.js` has a dedicated string-canonicalization path) but the result is unverifiable, an assertion file with no run evidence.

---

## 5. Reports and inventory (97 files)

One or two lines each. Verdicts: substantiated (evidence-graded finding), aspirational (plan/procedure, not findings), duplicate (topic covered elsewhere), stale (superseded or never executed).

### reports/ (83 files)
- AUDIT_OF_AUDITS.md: meta-review of earlier audits against direct repo evidence; documents a forensic mistake in prior audits. Substantiated; the keystone file.
- AUTHORITY_BOUNDARY_MAP_V2.md: which module owns which authority. Aspirational; overlaps REPLAY_AUTHORITY_MAP and authority_classification_map.
- AUTHORITY_CONFLICT_RESOLUTION_PROTOCOL.md: process for resolving competing authorities. Aspirational.
- AUTHORITY_CYCLE_REPORT.md: circular dependencies between authority modules. Substantiated; overlaps AUTHORITY_IMPORT_GRAPH.
- AUTHORITY_EQUIVALENCE_MATRIX.md: pairwise CRX-runtime vs archived JS.txt overlap table. Substantiated, concise forensic table.
- AUTHORITY_IMPORT_GRAPH.md: import/dependency graph of authority modules. Substantiated; overlaps AUTHORITY_CYCLE_REPORT and DUPLICATE_AUTHORITY_GRAPH.
- AUTHORITY_LOSERS.md: losing implementations per authority duel (archive candidates). Substantiated comparisons; the archive actions are aspirational.
- AUTHORITY_MIGRATION_GRAPH.md: planned migration edges loser to winner. Aspirational plan stub.
- AUTHORITY_PRECEDENCE_MATRIX.md: ranked winner per authority conflict. Aspirational; overlaps WINNERS/LOSERS and CANONICAL_AUTHORITY_FINAL_VERDICT.
- AUTHORITY_REUSE_MATRIX.md: which JS.txt modules are reusable/inspirational/dangerous. Substantiated; overlaps FINAL_FORENSIC_VERDICT.
- AUTHORITY_WINNERS.md: winning implementation per authority, source-inspected. Substantiated; pairs with LOSERS.
- BEHAVIORAL_DIFFERENTIAL_REPORT.md: behavioral diffs between competing implementations. Substantiated but thin; largely repeated in WINNERS/LOSERS.
- CANONICAL_AUTHORITY_FINAL_VERDICT.md: declares the canonical winner per authority domain. Aspirational; third "final" verdict in the corpus.
- CANONICAL_INFRA_REMEDIATION_PLAN.md: 808-line remediation plan for infra-authority violations. Aspirational; no evidence of execution.
- CONSTITUTIONAL_CI_PLAN.md: plan for constitutional CI enforcement. Aspirational.
- CONSTITUTIONAL_CONFLICT_MATRIX.md: runtime model vs spec model conflicts (identity, lineage). Substantiated concise matrix.
- CONSTITUTIONAL_FOLDERS_PROPOSAL.md: proposed constitutional folder layout. Aspirational; contradicts actual layout, never implemented.
- CONSTITUTIONAL_IMPORT_VIOLATIONS.md: import statements violating constitutional boundaries. Substantiated findings list.
- CONSTITUTIONAL_PRIORITY_QUEUE.md: prioritized fix queue. Aspirational todo list.
- DUPLICATE_AUTHORITY_GRAPH.md: graph of duplicate authority implementations. Substantiated; duplicate of duplicate_authority_systems.md.
- FINAL_CONSOLIDATED_CRX_TOPOLOGY.md: prescriptive target architecture, self-described "READ-READY (prescriptive)". Aspirational by its own admission.
- FINAL_FORENSIC_VERDICT.md: reusable vs inspirational vs dangerous archived authorities. Substantiated; overlaps AUTHORITY_REUSE_MATRIX.
- INFRA_EXTRACTION_PLAN.md: plan to extract infrastructure into its own layer. Aspirational; overlaps CANONICAL_INFRA_REMEDIATION_PLAN and RUNTIME_EXTRACTION_PLAN.
- INFRA_GAP_REPORT.md: gaps between infra reality and constitutional requirements. Substantiated; overlaps infrastructure-sovereignty-report.
- KERNEL_MINIMIZATION_REPORT.md: defines the minimal replay-safe kernel. Aspirational target definition.
- KNOWLEDGE_VOS_DEPENDENCY_ANALYSIS.md: dependencies between knowledge/ and vos/ spec corpora. Substantiated; overlaps local_corpus_topology/master_corpus_inventory.
- LEGACY_CONTAINMENT_REPORT.md: legacy code containment status/plan. Substantiated findings, aspirational containment.
- LEGACY_MIGRATION_PLAN.md: legacy migration plan. Aspirational.
- MACHINE_ENFORCEMENT_READINESS.md: whether constitutional rules are machine-enforceable yet; verdict leans not-ready. Substantiated.
- MISC_QUARANTINE_PLAN.md: plan to quarantine miscellaneous modules. Aspirational.
- MODULARIZATION_PLAN.md: principle-level modularization plan. Aspirational.
- REPLACEMENT_SAFETY_MATRIX.md: safety classification of loser-to-winner replacements. Substantiated-but-thin; derived from WINNERS/LOSERS.
- REPLAY_AUTHORITY_MAP.md: authorities replay depends on. Substantiated; one of three files on this exact topic.
- REPLAY_CONSTITUTION_ALIGNMENT_REPORT.md: replay design vs constitution alignment. Aspirational; overlaps REPLAY_AUTHORITY_MAP.
- REPLAY_CRITICAL_AUTHORITY_REGISTRY.md: registry of replay-critical authorities. Substantiated inventory; duplicate topic of replay_critical_authority_map.md.
- REPLAY_GAP_REPORT.md: gap between declared replay objectives and code reality (zero replay primitives in runtime). Substantiated; one of the strongest negative findings.
- REPLAY_LAYER_EXTRACTION_PLAN.md: plan to extract a replay layer. Aspirational; REPLAY_GAP_REPORT says there is no replay code to extract.
- REPORT_RETENTION_POLICY.md: consolidate 61 reports into reports/generated/, delete nothing, remove inventory/. Stale: never executed (no generated/ dir, inventory/ intact, count grown to 97).
- REPOSITORY_STRUCTURE_AUDIT_V2.md: directory structure audit. Substantiated; partially stale (TARGET_REPOSITORY_TREE proposes a different structure).
- ROADMAP_TRACEABILITY_MATRIX.md: roadmap items traced to evidence. Substantiated but thin; overlaps continuity_breaks.
- RUNTIME_EXTRACTION_PLAN.md: runtime boundary extraction plan. Aspirational; overlaps INFRA_EXTRACTION_PLAN.
- TARGET_REPOSITORY_TREE.md: 691-line proposed target tree. Aspirational; contradicts actual layout.
- adversarial_replay_verification.md: adversarial verification of replay claims. Substantiated; overlaps REPLAY_GAP_REPORT.
- archive_to_runtime_mapping.md: JS.txt archive to runtime module mapping. Substantiated; overlaps AUTHORITY_EQUIVALENCE_MATRIX.
- async_behavior_audit.md: async determinism hazards. Substantiated; overlaps hidden_nondeterminism_audit.
- authority-conflicts-v2.md: authority conflicts, Layer 0B sovereignty audit. Substantiated; duplicate of inventory/authority-conflicts-v2.md (expanded rewrite, same date).
- authority_boundary_violations.md: boundary violations in the local checkout. Substantiated; overlaps CONSTITUTIONAL_IMPORT_VIOLATIONS; stale path context.
- authority_classification_map.md: classification of every authority module. Substantiated; overlaps AUTHORITY_BOUNDARY_MAP_V2.
- authority_existence_verification.md: verifies claimed authorities exist on disk. Substantiated; a genuinely useful anti-hallucination check.
- authority_leakage_analysis.md: authority concerns leaking across module boundaries. Substantiated; overlaps authority_boundary_violations.
- behavioral_determinism_audit.md: runtime determinism audit. Substantiated; overlaps hidden_nondeterminism_audit.
- ci_bypass_vectors.md: ways constitutional checks can be bypassed. Substantiated; supports MACHINE_ENFORCEMENT_READINESS.
- constitutional-authority-reconciliation.md: verdict "no valid authority chain exists". Substantiated; contradicts CANONICAL_AUTHORITY_FINAL_VERDICT.
- constitutional_relevance_map.md: corpus docs mapped to constitutional relevance. Substantiated; overlaps KNOWLEDGE_VOS_DEPENDENCY_ANALYSIS.
- continuity_breaks.md: breaks between roadmap, specs, and code. Substantiated; overlaps ROADMAP_TRACEABILITY_MATRIX and REPLAY_GAP_REPORT.
- dependency_graph_correction.md: corrections to a previously published dependency graph; implies an earlier graph was wrong. Substantiated.
- deterministic_hashing_verification.md: hashing determinism verification. Substantiated; overlaps merkle_witness_integrity.
- duplicate_authority_systems.md: duplicate authority systems inventory. Substantiated; duplicate of DUPLICATE_AUTHORITY_GRAPH.md.
- event_substrate_forensics.md: event substrate forensics. Substantiated; overlaps AUDIT_OF_AUDITS.
- floating_module_inventory.md: modules not anchored to any authority. Substantiated; near-duplicate of orphaned_modules.md.
- hidden_nondeterminism_audit.md: hidden nondeterminism sources. Substantiated; third file on the determinism theme.
- historical_strata_registry.md: strata registry (active/reference/archaeological). Substantiated archaeology map; git branch details stale.
- infrastructure-sovereignty-report.md: infra sovereignty findings. Substantiated; duplicate of inventory version (expanded rewrite).
- infrastructure_reality_audit.md: reality check on infra claims. Substantiated; supports AUDIT_OF_AUDITS.
- ingestion-gap-report.md: ingestion pipeline gaps. Substantiated; duplicate of inventory version (expanded rewrite).
- local_corpus_topology.md: local spec corpus topology. Substantiated; overlaps master_corpus_inventory.
- master_corpus_inventory.md: full corpus inventory. Substantiated; overlaps local_corpus_topology and floating_module_inventory.
- mergeability-report.md: whether strata/branches can merge. Substantiated; branch references likely stale.
- merkle_witness_integrity.md: Merkle witness scheme integrity. Substantiated; overlaps deterministic_hashing_verification.
- orphaned_modules.md: modules with no dependents/owners. Substantiated; near-duplicate of floating_module_inventory.md.
- pre_infra_constitutional_freeze.md: freeze assessment, stable vs emergent authorities. Substantiated.
- pre_infrastructure_readiness_verdict.md: infrastructure expansion BLOCKED (readiness 0/5). Substantiated; contradicts the expansion-presupposing plans.
- provenance-report.md: artifact provenance. Substantiated; overlaps root REPOSITORY_PROVENANCE_MAP.md.
- replay-readiness-gap-analysis.md: replay readiness gaps. Substantiated; duplicate of inventory version (expanded rewrite); overlaps REPLAY_GAP_REPORT.
- replay_capability_matrix.md: replay capability matrix. Substantiated; overlaps REPLAY_GAP_REPORT and adversarial_replay_verification.
- replay_corpus_coverage_gaps.md: corpus coverage gaps for replay. Substantiated; overlaps replay_capability_matrix.
- replay_critical_authority_map.md: replay-critical authority map (33 lines). Substantiated but thin; duplicate topic of REPLAY_CRITICAL_AUTHORITY_REGISTRY.md.
- replay_truth_audit.md: truth audit of replay claims. Substantiated; overlaps REPLAY_GAP_REPORT and AUDIT_OF_AUDITS.
- runtime-boundary-report.md: runtime boundary findings. Substantiated; duplicate of inventory version (expanded rewrite).
- runtime_instability_vectors.md: runtime instability vectors. Substantiated; overlaps serialization_instability_audit.
- serialization_instability_audit.md: serialization determinism hazards. Substantiated; overlaps hidden_nondeterminism_audit.
- shadow-system-map.md: shadow/duplicate systems map. Substantiated; duplicate of inventory version (expanded rewrite); overlaps DUPLICATE_AUTHORITY_GRAPH.
- sovereignty-gap-report.md: sovereignty gaps (recovery forensics). Substantiated; overlaps infrastructure-sovereignty-report and INFRA_GAP_REPORT.

### inventory/ (14 files)
- authority-conflicts-v2.md: Layer 0B discovery version. Substantiated; superseded by the reports/ rewrite (same date, no supersession marker).
- authority-map.md: Layer 0 discovery authority map. Substantiated; superseded by AUTHORITY_BOUNDARY_MAP_V2.
- infrastructure-sovereignty-report.md: Layer 0B discovery version. Substantiated; superseded by reports/ rewrite.
- infrastructure.md: Layer 0 infrastructure inventory. Substantiated discovery; carries era infra claims later partially corrected by forensics.
- ingestion-gap-report.md: Layer 0B discovery version. Substantiated; superseded by reports/ rewrite.
- ingestion-readiness.md: ingestion readiness inventory. Substantiated; overlaps ingestion-gap-report.
- knowledge.md: knowledge corpus inventory. Substantiated; overlaps master_corpus_inventory.
- readiness-report.md: Layer 0 overall readiness. Substantiated; likely contradicted by the BLOCKED verdict.
- replay-boundary.md: replay boundary discovery. Substantiated; overlaps runtime-boundary-report and REPLAY_GAP_REPORT.
- replay-readiness-gap-analysis.md: Layer 0B discovery version. Substantiated; superseded by reports/ rewrite.
- repositories.md: repository inventory. Substantiated; overlaps historical_strata_registry.
- runtime-boundary-report.md: Layer 0B discovery version. Substantiated; superseded by reports/ rewrite.
- runtime-readiness.md: runtime readiness inventory. Substantiated; overlaps readiness-report (tension with the BLOCKED verdict).
- shadow-system-map.md: Layer 0B discovery version. Substantiated; superseded by reports/ rewrite.

### Report-corpus themes
The volume is itself a finding: 97 report files, and the retention policy that ordered consolidation was never executed. Six topics are duplicated across reports/ and inventory/ as same-day expanded rewrites with no supersession markers. Four unreconciled generation eras (Pre-Replay forensics, ALL-CAPS 2026-06-07 consolidation wave, lowercase audit wave, inventory Layer-0 wave) with naming conventions never unified. Real internal contradictions: AUDIT_OF_AUDITS documents a forensic mistake while the wrong reports stay uncorrected; constitutional-authority-reconciliation ("no valid authority chain exists") vs CANONICAL_AUTHORITY_FINAL_VERDICT (declares winners); pre_infrastructure_readiness_verdict (BLOCKED, 0/5) vs ~20 plans presupposing expansion. The substantiated core is about 10-15 files (AUDIT_OF_AUDITS, FINAL_FORENSIC_VERDICT, REPLAY_GAP_REPORT, AUTHORITY_WINNERS/LOSERS, pre_infrastructure_readiness_verdict, infrastructure_reality_audit, authority_existence_verification, AUTHORITY_EQUIVALENCE_MATRIX); the rest is re-audit, expansion, or unexecuted plan.

---

## 6. Agents, AI stack, integration lab, CascadeProjects

### agents/Dockerfile
Base container (python:3.11-slim): copies authoritative/, derived/, experimental/ workspace layers, installs requirements, sets CRX_WORKSPACE env vars, runs agents.base. Scaffolding only; the referenced agents/base module does not exist in the repo.

### agents/Dockerfile.planner
Planner agent image: read-only mounts for all three layers, writes proposals to /experimental/proposals. AGENT_PERMISSIONS=read,analyze,propose. Proposes changes without executing.

### agents/Dockerfile.governance
Governance agent image: generates audits into /authoritative/audits. Permissions read,audit,validate.

### agents/Dockerfile.refactor
Refactor agent image: only agent allowed write access to /experimental/ (read,modify_experimental,test). Cannot touch schemas/constitutions.

### agents/Dockerfile.documentation
Documentation agent image: read/write on /derived/, writes docs/diagrams.

### agents/docker-compose.yml
Orchestrates the 4 agent services on crx-network with least-privilege volume mounts matching the permission model. No actual agent code (agents/planner/main.py etc.) exists, so the compose file is currently unbuildable.

### agents/agent_permissions.md
The permission-boundary contract: authority structure (/authoritative read-only except Governance; /derived r/w Documentation only; /experimental r/w Refactor only), per-agent can/cannot lists and permission matrices. 180 lines. Contract without an implementation behind it.

### agents/crx_workspace_indexer.py / .ps1
Workspace indexer (295 lines each, twins): scans the repo, classifies files (Runtime/Library/Interface/Infrastructure/Documentation/Governance/Schema), builds dependency and workspace graphs, assigns authority classification. Outputs inventory.json.

### agents/implement_authority_reduction.ps1
Implements the authority-reduction model: classifies each file (extension/path heuristics + governance keywords) and physically moves files into authoritative/, derived/, experimental/ directories. The script that enforces the directory-authority scheme the Dockerfiles assume. PowerShell/Windows-only.

### agents/requirements.txt
Pinned Python deps (fastapi, uvicorn, pydantic, watchdog, structlog, jsonschema, pytest, ast, etc.).

### ai-stack/api/main.py
"CRX Memory Engine": tiny FastAPI app, 3 endpoints: GET / health check, POST /event (stores source/event_type/payload via SQLAlchemy), GET /events (last 50). Broken as committed: imports db and models modules that do not exist anywhere in the repo. Crashes on import.

### ai-stack/python-env/Dockerfile
Trivial env: python:3.11, installs numpy pandas requests, drops to bash. No app code wired in.

### constitutional-integration-lab/
Forensic consolidation lab (June 2026, read-only against a Windows C:\Users\nolan\CRX source). Top-level docs: mappings/constitutional_authority_registry.md (master registry: 12 TS/SQL runtime files, 59 JS.txt modules, MCP0 design tree, 3 CascadeProjects authorities, 5 Codex schemas, 4 competing CRX schemas; primary authority declared as AGENT.md); duplicate_matrix/constitutional_duplicate_matrix.md (side-by-side competing authorities with reuse/merge/quarantine targets; many rows conclude "no real conflict, different domains"); inventories/crx_repository_inventory.md (229-file inventory: 11 CRITICAL / 34 HIGH / 2 MEDIUM / 6 PARTIAL / 176 REFERENCE); inventories/js_txt_module_inventory.md (59 extracted modules with per-module replay/lineage/witness flags plus a reusable_score, mostly 80-82); comparisons/*.md (7 files: forensic side-by-sides of existing TS authority vs extracted JS candidate, e.g. canonical_engine vs canonical_fingerprint_service, commit_controller vs execution_integrity_auditor; verdict style is pick-the-winner, quarantine-the-duplicate); reports/*.md (14 files: phased audit reports; pattern is that most phases find the audited thing does not exist yet in CRX runtime, e.g. boot audit found no boot sequences, replay kernel stabilization found no replay kernel); temporary/*.csv (4 files: working inventory/scoring artifacts feeding the inventories).
The extracted/ subtree: extracted/js_txt/ (60 files pulled verbatim from a JS.txt archive, no reformatting; groups are the Merkle-anchor chain family with misuse tests ~20 files, constitutional CI gate + determinism/adversarial harnesses, plugin system, authority/structural guards, resource/entropy guards; purpose was scoring each module's reusability for the constitutional kernel); extracted/runtime/ (12 TS/SQL files: the existing commit-service runtime pulled read-only, the "incumbent" side of the comparisons); extracted/schemas/ (12 JSON/SQL: the deduplicated schema authority collection, including foundational-primitives).

### CascadeProjects/
The current working constitutional runtime, the live counterpart to the read-only lab. Governed by its own AGENT.md ("CRX-RUNTIME CONSTITUTIONAL AGENT DIRECTIVE", primary law REUSE BEFORE CREATE). Key files: AGENT.md + README.md (constitutional law and framing: GitHub Kernel to Event Runtime to Replay Engine to Policy Engine); kernel/ (system-invariants.md, constitutional-principles.md, README: the law layer); events/canonical-event-envelope.json (the single canonical event schema; "no competing event schemas allowed"); schemas/foundational-primitives.json (Provenance, Claims, Decisions, Facts, Rules); policies/constitutional/reuse-before-create.md; prompts/constitutional/audit-agent.md; runtime/, replay/, events/, tests/ (README-only directories: no implementation code yet); infra/ (docker-compose.yml, observability configs for Loki/Prometheus/Tempo, scripts/init-db.sql, and a committed .env of 980 bytes even though CascadeProjects/.gitignore says infra/.env should be local-only); agents/README.md; constitutional-extraction-lab/ (smaller-scale mirror of the top-level lab).

---

## 7. Committed noise (should not be in git)

- `.docker/` (buildx state, contexts, daemon config): local Docker Desktop state, never belongs in a repo.
- `ai-stack/api/__pycache__/`: compiled Python bytecode.
- `kernel/commit-service/node_modules/`: committed dependencies (46MB repo weight largely from this).
- `.cursor/`: committed Cursor agent transcripts and MCP metadata.
- `dist/`: compiled output committed alongside (absent) sources.
- `CascadeProjects/infra/.env`: committed despite the project's own .gitignore forbidding it; rotate whatever credentials it holds and purge from history.
- `docker-compose.yml` (root): hardcoded `POSTGRES_PASSWORD=crx_password` with published port 5432.

---

## Cross-cutting themes

1. Two repos in a trench coat. The audit corpus describes Nolan's Windows workspace (multi-repo: knowledge, vos, runtime; live commit-service on :8080). The GitHub clone is a single repo where `runtime/` is empty and half the audited paths do not exist. Most "VERIFIED" findings cannot be verified here.
2. The executable core is real but broken at the seams. Canonical JSON, SHA-256 fingerprinting, Merkle trees with domain separation, and a deterministic state machine are genuinely implemented in `dist/`. But `CanonicalJson.stringify` does not exist (every envelope construction throws), failure envelopes embed wall-clock timestamps, evt-namespaced lineage corrupts the invariant the corpus expects, and one invariant is dead code.
3. The certification layer is stale or fictional. Corpus hashes mismatch the corpus. The freeze SQL would reject the frozen values (uppercase CHECK vs lowercase hashes; VARCHAR(64) vs 71-char prefixed fingerprints). "PASSED" audits for distributed workers and Ollama describe code that does not exist. `Object.freeze` is claimed but absent from the shipped code.
4. Plans outnumber executions. ~20 extraction/migration/modularization plans presuppose an expansion that the readiness verdict says is BLOCKED at 0/5. The retention policy ordering report consolidation was never executed.
5. The dependency guard guards nothing. All three enforcer files target a `runtime/replay` tree that is not in the repo, disagree with each other on the forbidden list, and the shell gate has two fatal logic bugs (unreachable error branch; the validator it invokes never runs its own validation function).
6. TypeScript 6 does not exist. `typescript@6.0.3` and `@types/node@^25.6.2` appear in the Dockerfile and package.json; neither resolves publicly. `npm install` and `docker build` both fail.

## What would make this real (in priority order)

1. Fix the two P0 bugs in the replay core: add the missing `CanonicalJson.stringify` (or fix the two call sites) and remove the wall-clock timestamp from deterministic failure envelopes. Without these, nothing downstream works and the determinism claim is false.
2. Fix the evt-lineage bug (store converted artifact IDs, not raw evt IDs) and remove or repair the dead `LINEAGE_ACYCLIC` invariant; regenerate the corpus fixtures from a working build instead of placeholder hashes.
3. Decide what this repo is: either restore the `runtime/` TypeScript sources the tests, CI, Dockerfile, and tsconfig expect, or rewrite those configs to target what actually exists (`dist/`, `kernel/`). Delete the phantom paths.
4. Collapse the report corpus: keep the ~12 substantiated files, archive the rest per the (unexecuted) retention policy, and add supersession markers. Stop generating new audits until the P0 bugs are fixed.
5. Rotate the credentials in `CascadeProjects/infra/.env`, remove it from git history, and fix the hardcoded Postgres password. Add `node_modules`, `.docker`, `__pycache__`, `dist`, and `.cursor` to `.gitignore`.
6. Fix or remove the dependency guard: point it at a tree that exists, unify the forbidden list, fix the shell script logic bugs, and actually load the ESLint rule.
7. Rename the `touch src/engines/canonical_engine.ts` accident and fix the import. Pin TypeScript to a real version (5.x) and Node types to a real release.

Method note: six parallel analysts each read their section in full; cross-cutting claims (hash mismatches, missing paths, phantom configs) were verified against the cloned files. Severity labels reflect impact on the project's own stated goals.
