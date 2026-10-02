# Release Candidate Certification Packet

Candidate: releases/candidate-4d522a6b
Build plane: Pig WSL (x86_64), via ~/workspace/pig/pigwsl-run.sh
Built by: Lane O (BUILD ONLY; no Oracle containers, volumes, ports, or data touched)
Date: 2026-09-19 MDT

## 1. Source

- Source SHA: 4d522a6bd823e980bb97b76f95caeb2252a9c5d2
- Branch: constitutional-convergence-v2
- Tree state at build: shared worktree DIRTY with Lane 2 (ping-runtime/orchestration/* generator
  WIP, evals/constitutional-runtime/EVAL-006, CERTIFICATION.md, CONTRADICTIONS.md, evidence/,
  ping-runtime/orchestration/dormant_classifications/, tests/mc1-legacy-ingress/) and Lane 4 WIP.
  This candidate EXCLUDES all uncommitted content by construction: the distribution is a
  `git archive HEAD` of 4d522a6bd, which contains zero uncommitted bytes. Certification ran against
  a clean clone checked out at 4d522a6bd (detached HEAD, git status clean, 0 files).
- HEAD moved on the shared branch during the build (c70fa44233, a Lane 4 test commit, landed
  after the build started). This candidate is PINNED to the recorded SHA 4d522a6bd and does not
  include that commit. Any deploy must name this SHA, not "the branch tip".
- Ancestry verified at build start: all 8 sprint lane commits are ancestors of the candidate SHA:
  8e2496b14 (append-only-compatible migration), 9c0009b31 (STARTUP_BLOCKED), 6396113a7 (/health
  surfacing), 8e981ea18 (SEC-001/002), ca2e58345 (Lane E), f4c0545da (Lane G),
  e3438958f (release tooling), 224260463 (node:20 toolchain).
- Writer ownership respected: Lane 2 owns ping-runtime/orchestration/*, Lane 4 owns gateway/*;
  this lane created files only under releases/candidate-4d522a6b/ and read everything else.

## 2. Distribution

- Distribution manifest digest (snapshot-manifest.js): ae45fb774c94bf2cccfd7daddd0d6b3b47bf45b3f3ed9e30844ddeaee0179df0
- Files in manifest: 2773. node_modules: present at snapshot root (production npm ci from the
  locked package-lock; matches the proven Oracle deploy layout: /app = snapshot root).
- Excluded from the distribution (honoring the repo .dockerignore, which the deploy build uses):
  .env.base, brainos/orchestration/config/environments/.env.mission-control,
  brainos/orchestration/config/environments/.env.qdrant. These three files contain real-looking
  secret values (passwords, tokens, keys); security-negatives fails the snapshot until they are
  excluded. The gateway reads configuration from process.env; no runtime require chain touches
  these files. Their presence in the repo tree is a standing risk (see section 8).
- Lane B handoff B4 check: gateway/exterior_auth_middleware.js is tracked at HEAD and present in
  the distribution; the distributionClosure gate resolves the new auth import through
  gateway_runtime.js, so the runtime allowlist covers it (closure CERTIFIED, no
  REQUIRED_NOT_DISTRIBUTED defects).

## 3. Pre-promotion gates (Lane C release-certify.js, artifact: release-certification.json)

verdict: CERTIFIED. 8/8 PASS, 0 FAIL, 0 BLOCKED.

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| 0 | sourceSha | PASS | 4d522a6bd823, clean tree, HIGH confidence at certification time |
| 1 | distributionManifest | PASS | 2773 files, digest ae45fb77..., nodeModules=present |
| 2 | distributionClosure | PASS | closure complete; WARN only on declared dynamic-require targets |
| 3 | runtimeDepsClosure | PASS | 14 external packages resolve from snapshot node_modules |
| 4 | arm64Compat | PASS | FROM=node:20-alpine, smoke-node=20, declared target linux/arm64 |
| 5 | executableSmoke | PASS | GatewayRuntime boots to safe boundary, controlled shutdown, no MODULE_NOT_FOUND |
| 6 | migrationTrigger | PASS | 18 statements scanned, 0 TRIGGER_SUSPECT; fixture PASS (section 4) |
| 7 | securityNegatives | PASS | 3247 files walked (node_modules/.git excluded), 0 findings |

## 4. Migration certification (Lane A gate, executed on the staging sandbox)

- Tool: ping-runtime/events/migration-certification/certify-sequence-migration.js (unmodified),
  running against the candidate's own unified_event_runtime.js.
- Fixture: scratch postgres:16 on disposable sandbox network ping-rc-sandbox; variant A
  (pre-migration state + byte-captured Oracle append-only trigger) and variant B (Oracle's
  actual current schema state).
- Result: GATE RESULT: PASS. 50/50 assertions PASS, 0 FAIL. Structural (no UPDATE/DELETE of
  ping_events anywhere in the migration), fail-before (frozen pre-fix migration rejected by the
  trigger, history byte-identical), variant A (corrected migration succeeds, history preserved,
  enforcement intact, new emits strictly increasing, replay contract, idempotent re-run),
  variant B (same).
- Adapter JSON consumed by migration-trigger gate per MIGRATION-TRIGGER-FIXTURE-INTERFACE.md v1:
  verdict PASS, triggerPolicyDigest 5b001268..., sourceSha matches the candidate.

## 5. Candidate image

- Image: ping-gateway:rc-4d522a6b
- Image digest: sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38
- Architecture: linux/arm64 (built on x86_64 Pig via buildx emulation; platform verified in inspect).
- Dockerfile: releases/candidate-4d522a6b/Dockerfile.candidate (sha256
  a3d676f835848593debbe23ed0db8c5a1c4663083d358837f93361954021d34f), modeled on the proven
  Oracle deploy Dockerfile (node:20-alpine, apk build tools, COPY package*.json, npm ci
  --only=production, COPY . ., CMD ["node", "gateway/server.js"]).
- Provenance labels (non-secret, verified via docker inspect):
  org.opencontainers.image.revision=4d522a6bd823e980bb97b76f95caeb2252a9c5d2,
  org.opencontainers.image.source=local:constitutional-convergence-v2@4d522a6bd823e980bb97b76f95caeb2252a9c5d2,
  org.opencontainers.image.created=2026-09-20T03:17:55Z.
- Build note: the first build attempt failed on a broken Docker Desktop credential helper
  (credsStore desktop.exe: "A specified logon session does not exist") during registry metadata
  load. Workaround: DOCKER_CONFIG with an empty config.json (anonymous public pull); the ARM64
  base was then pulled successfully and the build completed. Nolan-side fix is out of lane scope.

## 6. Staging sandbox proof (Pig, fully separate from Oracle)

Sandbox: docker network ping-rc-sandbox; disposable container ping-rc-postgres (postgres:16,
fresh volume); candidate container ping-rc-gateway on the same network, port 127.0.0.1:18099.
Oracle plane untouched: no Oracle containers, volumes, ports, or data were inspected or modified.
The staging Postgres was pre-loaded with the variant A fixture (6 pre-sequence rows, both
append-only triggers enabled, no sequence column), mirroring Oracle's pre-migration enforcement.

| Deployment gate | Result | Evidence |
|---|---|---|
| 9 candidate startup | PROVEN | container starts, no crash loop, zero MODULE_NOT_FOUND |
| 10 readiness | PROVEN | /health: startup=healthy, postgres_readiness=healthy; aggregate "unhealthy" solely because Qdrant is absent from the sandbox (honest degradation, same semantics as production) |
| migration vs trigger (real boot) | PROVEN | boot ran the corrected migration against the live append-only trigger: sequence column now BIGINT NULLABLE with nextval default; all 6 legacy rows keep NULL sequence; zero UPDATEs; startup check healthy (not STARTUP_BLOCKED) |
| 11 canonical event write | PROVEN | authenticated POST /events (Bearer key via exterior auth) -> event_79a34ddff1aa4313 persisted, sequence=2 |
| 12 dedup | PROVEN | identical re-POST returned the same event_id, no new row |
| 13 mission path | PROVEN | event triggered the mission chain: MISSION_CREATED (seq 3) -> ASSIGNED (4) -> STARTED (5) |
| 14 worker/result path | PROVEN (sandbox-scoped) | mission execution produced MISSION_FAILED (seq 6) with reason "observation: emit OBSERVATION_CREATED failed — undefined is not in the canonical identity domain"; the result path lands canonically as an event. No real worker plane exists in the sandbox, so success-path execution remains unproven |
| 15 restart | PROVEN | docker restart -> container Up, clean, zero STARTUP_BLOCKED/migration-failure log lines |
| 16 post-restart read | PROVEN | event_79a34ddff1aa4313 (seq 2) still in ping_events after restart; /health startup+pg healthy |
| auth surfaces | PROVEN | unauthenticated POST /events rejected; authenticated POST accepted; /health public |

## 7. Gates still unproven

- Gate 17 (rollback proof): UNPROVEN. Rollback anchor confirmed as oracle-gateway:rollback-20260919 /
  oracle-gateway:latest, image id 8400deecf2a9 (not touched in this lane). The rollback-retag-and-verify
  proof belongs to the deploy lane on the target plane, before any swap.
- Oracle-plane deployment of the corrected migration: UNPROVEN by design (no Oracle deploy attempted;
  deploy only when all gates pass, per standing law).
- Mission success path (MISSION_COMPLETED end-to-end): the staging sandbox has no worker plane;
  the bridge fired and the result path proved canonical, but COMPLETED remains unproven.
- /health build-info surface exposing non-secret source_sha (Lane C provenance design): the image
  carries the OCI labels; runtime surface exposure is a deploy-lane implementation item.
- Qdrant/embedding healthy in the staging sandbox: absent by design (disposable sandbox);
  health semantics behaved honestly (aggregate degraded, components truthful).

## 8. Findings for follow-up (not blocking this candidate)

- Three credential-bearing .env files live in the repo tree (.env.base,
  brainos/orchestration/config/environments/.env.mission-control,
  brainos/orchestration/config/environments/.env.qdrant). They are excluded from the distribution
  per .dockerignore, but their checked-in presence carrying real-looking values is a standing risk.
  Candidate Grill question: why do checked-in .env files carry real-looking secret values?
- Docker Desktop credential helper (credsStore desktop.exe) is broken in the Pig's non-interactive
  session. The deploy lane will hit the same fault on any build there; workaround recorded above.
- Unauthenticated POST /events is rejected; the /events caller audit (tandem/emit-observation.py
  already sends a Bearer key) means no legitimate caller breaks from the Lane G parity change.
