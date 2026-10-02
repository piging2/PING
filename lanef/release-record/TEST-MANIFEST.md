# Test Manifest: candidate a9cad2663

Every gate Lane F ran (R) or cited with re-verified preconditions (C) for candidate
a9cad266353679a90e54b318100efb8153ea988e. Proof plane per gate.
All (R) gates executed on the Pig against the candidate-pinned source
(pristine detached worktree /tmp/lanef/candidate-root @ a9cad2663, or the
git-archive snapshot of a9cad2663).

## A. release-certify.js pre-promotion sequence (R) — verdict CERTIFIED, exit 0

Command (effective):

    node tools/distribution/release-certify.js \
      --root /tmp/lanef/candidate-root \
      --snapshot /tmp/lanef/snap \
      --classify tools/distribution/classify.json \
      --entrypoints gateway/server.js \
      --dynamic-targets gateway/generated/capability_registry.json,gateway/generated/state_machine_registry.json \
      --migrations ping-runtime/events/unified_event_runtime.js \
      --trigger-policy tools/distribution/trigger-policy.oracle-canonical.json \
      --dockerfile infrastructure/oracle/Dockerfile.gateway \
      --smoke-node-version 20 \
      --fixture-result /tmp/lanef/fixture-adapter.json \
      --workdir /tmp/lanef/cert-work \
      --json-out /tmp/lanef/release-certification-a9cad2663.json

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| 0 | sourceSha | PASS | a9cad2663536, detached HEAD, clean tree, confidence HIGH (captured at certification time) |
| 1 | distributionManifest | PASS | 2160 files, digest e21a0d4faa18a9bcbb97b29b3fe7262e6e1d48025062d9770155c26be6c7ced4, nodeModules=present |
| 2 | distributionClosure | PASS | closure complete; WARN only on declared dynamic-require targets |
| 3 | runtimeDepsClosure | PASS | 14 external packages resolve from snapshot node_modules |
| 4 | arm64Compat | PASS | FROM=node:20-alpine, smoke-node=20, declared target linux/arm64 |
| 5 | executableSmoke | PASS | GatewayRuntime boots to safe boundary, controlled shutdown, no MODULE_NOT_FOUND |
| 6 | migrationTrigger | PASS | 18 statements scanned, 0 TRIGGER_SUSPECT; fixture PASS (adapter: 50/50 cert, triggerPolicyDigest 5b001268...) |
| 7 | securityNegatives | PASS | 2160 files walked (node_modules/.git excluded), 0 findings |

Full artifact: release-certification.json (this directory).

## B. Migration / append-only (R, scratch postgres:16 container lanef-pg, removed after)

    NODE_PATH=<candidate>/gateway/node_modules PGHOST=127.0.0.1 PGPORT=15434 PGUSER=postgres \
      node ping-runtime/events/migration-certification/certify-sequence-migration.js

- Result: 50 passed, 0 failed. GATE RESULT: PASS.
- Covers: structural (no UPDATE/DELETE/TRUNCATE of ping_events in unified_event_runtime.js),
  fail-before (frozen pre-fix migration rejected by the real append-only trigger, history
  byte-identical), variant A (Oracle pre-migration state) and variant B (Oracle actual
  current state: nullable sequence + nextval default): corrected migration succeeds,
  enforcement intact, legacy rows NULL, new emits strictly increasing, replay contract,
  idempotent re-run.
- Proof plane: PROVEN_TEST (executable, real trigger semantics).

## C. Event acceptance / dedup / collision (R)

1. `node tests/ce001-completion-identity/ce001_completion_identity.js`
   (real MissionRuntime + real UER + real IdentityAuthority, in-memory mock pool)
   Result: 45 passed, 0 failed. Covers deterministic completion identity
   (logical_id = {kind:'mission-completion', mission_id}; clocks never enter the
   identity preimage; reconciler repairs lost completions idempotently).
2. `node tests/ce002-attempt-fencing/ce002_attempt_fencing.js`
   Result: 46 passed, 0 failed.
3. `node tests/event-collision-law/volatile_metadata_dedup.js`
   (real UER against faithful in-memory mock of ping_events)
   Result: 25 pass, 0 fail. Covers byte-identical redelivery dedup, volatile-only
   retry dedup (deduplicated:true, one row, single dispatch), genuine divergence
   still fails closed with EVENT_IDENTITY_CONFLICT.
4. `PGHOST=127.0.0.1 PGPORT=15434 node tests/event-collision-law/uer_commit_collision_cert.js`
   (real PostgreSQL, scratch DB created and dropped by the harness)
   Result: 15 pass, 0 fail. Covers: same event_id + canonical-equivalent content ->
   idempotent dedup no-op (no dispatch); same event_id + different semantic content ->
   EVENT_IDENTITY_CONFLICT, fail closed, stored row never mutated, no UPDATE/DELETE
   on the conflict path.

## D. Replay (R)

`PGHOST=127.0.0.1 PGPORT=15435 node tests/event-sequence-replay/sequence_replay_cert.js`
(real PostgreSQL, scratch DB created and dropped by the harness)
Result: 64 passed, 6 failed, 1 blocked (71 total). FAILED GROUPS: T1 only.
The 6 T1 failures are the KNOWN pre-existing class FL-20260919-014: T1 encodes the
OLD backfill behavior (every migrated row gets a sequence) that the corrected,
trigger-compatible migration deliberately does not do (legacy rows keep NULL).
Identical 64/6/1 baseline was recorded on pristine code before this lane; unrelated
to the candidate. Replay contract for the corrected semantics is covered by the
migration cert (B), which passes 50/50.

## E. Mission path (R)

1. `node evals/constitutional-runtime/EVAL-006_fencing_adaptation.test.js`
   Result: EVAL-006 run: pass=10 fail=0. PASS.
2. `node gateway/test_priority_bridge_integration.js`
   (real EventToMissionBridge + EVENT_MISSION_MAP boundary)
   Result: Passed 49, Failed 0.

## F. Runtime identity (R)

`node runtime/kernel/test_runtime_identity_fl004_2026-09-20.js`
Result: 13 tests passed on v22.23.2. Covers http_parser -> llhttp era rule on
Node >= 20 (FL-20260920-004), runtimeId determinism, verifyIdentity round-trip,
initialize() idempotence, Buffer serialization guards, createWitness paths.

## G. Namespace / auth (R re-run + C citation)

Re-run by Lane F on the pinned candidate:
- `node tests/security/test_mount_wiring_contract.js`: 4 passed, 0 failed
- `node tests/security/test_exterior_auth_middleware.js`: 10 passed, 0 failed
  (includes the 2 no-generated-key-material-in-logs tests)
Cited from Lane E (2026-09-20 ~09:03 MDT, same candidate SHA a9cad2663, clean tree;
preconditions re-verified by Lane F): composed HTTP 107/107 (Lane B surfaces),
131/131 (Lane E surfaces), 80/80 (Lane G surfaces); contract 10/10 (Lane E),
6/6 (Lane G).

## H. Cited prior-lane gates (C; preconditions re-verified: same HEAD a9cad2663, clean tracked tree)

- Lane V2 (2026-09-20 ~08:58): overnight claims verified on this candidate, including
  canonical event ID via executeEvent/appendOptions.canonicalEventId, missing proof
  fails loudly (UnanchoredCanonicalWriteError, harnesses 5/5 + 4/4 + 1/1), 14 dead
  write sites fail closed, fresh-DB boot seeds 18 canonical events via the authorized
  UER path (steady-state boot performs no event writes).
- Lane E blockers (2026-09-20 ~09:03): runtime source closure 172 modules
  (171 REQUIRED_RUNTIME + 1 LEGACY_REQUIRED, 0 defects); legacy_ingress_adapter live;
  executable smoke on Pig; deterministic rejection -> STARTUP_BLOCKED; transient DB
  retry; Postgres startup ordering; migration-vs-trigger fixture 50/50 + trigger gate
  18/18 (independently re-run by Lane F in B above).
- Lane G (2026-09-20 ~09:08): generators PORTABLE_VERIFIED — 15/15 orchestration
  generators repository-relative and CWD-independent (45/45), 5/5 gateway generators
  CWD-independent and NOT-lossy-on-Linux; 3 lossy-by-design generators frozen untouched.
- Lane D: 14 dead caller sites PRESERVED_INACTIVE, no release-blocking reachability.
- Lane 003 / Lane 004: superseded by Lane F re-runs (EVAL-006 10/10 in E, FL-004 13/13 in F).

## I. Declared non-certifications (honest, not Lane F regressions)

- eventIdentity certification: WITHDRAWN (F7 falsified 2026-09-18; recorded in the
  release-certify artifact from the repo's own CERTIFICATION.md).
- witnessReplay certification: UNDEFINED (9 implementations, 3 live/reachable,
  incompatible formats, zero persisted; recorded in the artifact).
- Deployment-phase gates (container build -> rollback proof): NOT_RUN by design;
  owned by the deploy lane on the target plane.

## Proof-plane key

- PROVEN_TEST: executable test run by Lane F on the pinned candidate (sections A-G R).
- Cited (C): executed by the named prior lane on this exact candidate SHA with a clean
  tree; Lane F re-verified HEAD == a9cad2663 and the tracked tree clean before citing.
