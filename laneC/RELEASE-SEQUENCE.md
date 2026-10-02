# The ONE Release-Certification Sequence (Lane C)

**Doctrine.** "A release is not the set of files changed since the previous
release. A release is a complete, certified closure of the runtime
represented by a specific source revision." (Nolan, 2026-09-19)

**Rule.** There is exactly one release-certification sequence. Gates are not
added, reordered, or skipped per-deploy. `release-certify.js` is the machine
that runs the pre-promotion portion; this document is the design that both
the machine and the deploy lane follow. Timestamp is provenance only, never
release identity.

## Pre-promotion (runs on the build plane, before `docker build`)

Executed by `release-certify.js` against the EXACT distribution snapshot
(the build-context directory the image is built from). Any FAIL blocks
promotion. Any BLOCKED blocks promotion pending the named dependency.

| # | Gate | Script | Closes |
|---|------|--------|--------|
| 0 | source SHA | (built in) | Release must be a specific revision; dirty worktree fails |
| 1 | distribution manifest | snapshot-manifest.js | Distribution identity: byte-identical snapshots share one digest |
| 2 | distribution closure | closure-certify.js | FL-20260919-ORACLE-006: source-reachable + runtime-required + not distributed |
| 3 | runtime dep closure | runtime-deps-closure.js | Incomplete node_modules (npm externals unresolvable in snapshot) |
| 4 | ARM64 toolchain | arm64-compat.js | FL-20260919-ORACLE-008: node 24 broke tree-sitter 0.21.1 native build; smoke/toolchain mismatch |
| 5 | executable smoke | gateway-smoke.js | Build success treated as deployability evidence; entrypoint never executed |
| 6 | migration/trigger | migration-trigger-gate.js | FL-20260919-ORACLE-008: startup UPDATE vs append-only trigger. Fixture execution BLOCKED until Lane A lands |
| 7 | security negatives | security-negatives.js | Credential material shipped inside the distribution closure |

Gate 6's fixture portion is BLOCKED (exit 3), not failed: the static scan
runs, the execution evidence is unevaluated. A BLOCKED gate blocks promotion
exactly like a FAIL; the difference is what unblocks it (Lane A's fixture
result, not a code fix).

## Deployment phase (runs on the target plane, after image build)

Executed by the deploy lane. Lane C performs no Oracle mutation and does not
run these; it defines them so the deploy lane's runtime proof is the same
sequence every time, and so the second certification artifact (same schema)
is complete. Order is fixed:

| # | Gate | Acceptance |
|---|------|------------|
| 8 | container build | Image builds for linux/arm64; digest recorded |
| 9 | candidate startup | Candidate container starts; no crash-loop; MODULE_NOT_FOUND class absent |
| 10 | readiness | /health returns 200 / READY within the bounded startup window (no silent endless retry) |
| 11 | canonical event write | Authenticated POST /events persists one canonical event to ping_events |
| 12 | dedup | Re-POST of the same event returns the identical event_id with no new row |
| 13 | mission path | Event triggers the mission chain (CREATED to COMPLETED + evidence) |
| 14 | worker/result path | Where live: worker executes and result/evidence lands canonically |
| 15 | restart | Container restarts cleanly |
| 16 | post-restart read | The canonical event, mission, and evidence from gates 11-14 are recoverable after restart |
| 17 | rollback proof | Rollback image retagged and verified healthy BEFORE the candidate swap (rollback must be proven before it is needed, not after) |

Gates 11-16 are the certification target Nolan authorized for ping-core-01:
request -> authenticated identity -> canonical event -> durable PostgreSQL
-> mission -> scheduler -> worker -> result/evidence -> canonical event ->
RESTART -> same event/mission/evidence recoverable -> processing resumes.

## Artifact lifecycle

1. Pre-promotion: `release-certify.js` emits `release-certification.json`
   (schema v1: `release-artifact.schema.json`). deploymentPhase is NOT_RUN.
2. Post-build: the deploy lane fills deploymentPhase gates 8-17 and emits a
   second artifact with the same schema, referencing the first by its
   distribution manifestDigest. Both artifacts are immutable once written;
   a correction is a new artifact, never an edit.
3. Rollback: the rollback image digest is recorded in the pre-promotion
   artifact's deploymentPhase BEFORE the swap (gate 17 ordering). The
   rollback image itself is HISTORICAL_EVIDENCE/RECOVERY_REQUIRED per the
   artifact classification (see infrastructure/oracle/ARTIFACT-CLASSIFICATION.md).

## Provenance (recorded requirement, deployment agent implements)

The provenance lane's read-only Oracle forensics (2026-09-19) proved a gap
this design must close:

- The running image `8400deecf2a9` fingerprints to source commit
  `099927152b93e0de7c1a120bc88d73fb939c1502` (branch
  `constitutional-convergence-v2`, repo `ngesk2/crx-runtime`), confidence
  HIGH (container files EXACT sha256 match to the Oracle release tarball;
  tarball STRONG_MATCH to the commit after CRLF normalization).
- BUT the image was built from a non-git snapshot tarball
  (`/opt/ping/releases/RESTORE-2026-09-16.md`), not a git checkout, with
  unknown build/deploy commands. Its source SHA had to be reconstructed by
  forensics afterward. That is the gap: **source SHA must be captured at
  build time, not reconstructed by forensics afterward.**
- The image carries NO OCI/git provenance labels (compose labels only).

Phase 9 (candidate startup) therefore carries a recorded deployment
requirement, design only in this lane (the deployment agent implements it;
nothing in the audit repo changes):

1. Every PING image carries `org.opencontainers.image.revision=<git SHA>`,
   `org.opencontainers.image.source=<repository>`,
   `org.opencontainers.image.created=<build timestamp>`.
2. `/health` or a build-info surface exposes non-secret `source_sha`,
   image identity, and runtime version.
3. The release artifact records `deploymentPhase.provenance`:
   `capturedAtBuild`, the OCI label values, and whether the build-info
   surface exposes them.

Two provenance chains are kept distinct in the artifact and never mixed:

- `ping-runtime`: the PING app source repo (e.g. `ngesk2/crx-runtime`).
  This is the chain release-certify.js certifies.
- `agent-ops`: the agent-operations workspace repo (outreach machine,
  crons, skills). It has its own commits and its own history; a workspace
  commit is never cited as PING runtime provenance.

Certified baseline of record: source
`099927152b93e0de7c1a120bc88d73fb939c1502`, image `8400deecf2a9`. This is
the rollback target until a newer release completes the full sequence.
A worked example artifact using this baseline is at
`tools/distribution/release-artifact.example.json`.

## Non-goals (owned elsewhere, not duplicated here)

- Test-suite execution: the artifact carries a test manifest (suites +
  results) supplied as `--test-evidence`; the certifier does not re-run
  suites. Suite ownership stays with the test lanes.
- Vulnerability scanning of dependencies or image layers: deploy/build lane.
- Runtime authentication posture (F1/F2/F3): convergence lane.
- Fixture execution for migration/trigger: Lane A, via
  MIGRATION-TRIGGER-FIXTURE-INTERFACE.md.
