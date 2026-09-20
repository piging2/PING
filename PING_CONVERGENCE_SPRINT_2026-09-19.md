# PING Convergence Sprint 2026-09-19 — synthesis artifact

Sprint window: 2026-09-19 ~20:20 MDT to 2026-09-20 ~08:20 MDT (12h, 24/7 queue thereafter).
Mode: EXECUTE / TEST / FALSIFY / COMMIT / MERGE WHEN PROVEN / CERTIFY / DEPLOY WHEN PROVEN / VERIFY RUNTIME / CONTINUE.
Coordinator: sprint-coordinator subagent (parent: main agent).

## STARTING SHAS
- Workspace repo (/home/hatch/workspace, master): e522eb857c16340903091e533d4a154321e0a0ed
- Convergence worktree (/home/nolan/worktrees/constitutional-convergence, constitutional-convergence-v2): 395b9759ee4fb6067303d4775f4f14699d7dc705 (== failed deploy commit; parked generator WIP present, untouched)
- Oracle running image: oracle-gateway:rollback-20260919 / oracle-gateway:latest, image id 8400deecf2a9 (per FL-20260919-ORACLE-008; source SHA behind it UNKNOWN at sprint start, provenance lane investigating)
- Failed forensic image: oracle-gateway:refactor-395b9759, image id 1ad1d981e6e6, source commit 395b9759e

## ENDING SHAS
(pending)

## COMMITS BY LANE
Lane A (migration/append-only), branch constitutional-convergence-v2, local only:
- 53d40bfc4 test(events): migration-vs-trigger certification gate (fail-before proof: STRUCTURAL FAIL + old migration reproduced the exact Oracle append-only failure, history byte-identical)
- 8e2496b14 fix(events): append-only-compatible sequence migration (design B: sequence for new events only; legacy rows keep NULL with explicit unknown-ordering semantics; removes backfill UPDATE; conditional SET NOT NULL; NULL-count invariant; typed failures via ping-runtime/events/migration_error.js; replay delivers legacy rows first as explicit LEGACY segment)
- ce2b43f2d test(events): gate self-bootstraps pg driver modules
Coordinator (Lane A handoff, shared file gateway_runtime.js):
- 9c0009b31 fix(gateway): terminal STARTUP_BLOCKED for deterministic migration failures (wires migration_error classifier into _startPgRecoveryLoop; non-retryable classes set terminal _startupBlocked flag + log, no retry; only TRANSIENT keeps backoff). Verified 2/2 stub-harness. /health surfacing of _startupBlocked left to Lane B.
Incident: FL-20260919-SPRINT-001 (coordinator's first commit attempt swept Lane B's staged files; HEALED: reset --soft, Lane B WIP preserved byte-identical, recommitted single file).
Lane B (security), branch constitutional-convergence-v2, local only:
- aadb9dad9 test(security): SEC-001/SEC-002 fail-before evidence + exterior auth port + handoff diff
- 2b4f02f05 fix(security): never log generated key material in exterior auth middleware (deliberate divergence from ERA-R copy; +2 unit tests)
- 283dfd2cb docs(security): record 9c0009b31 base + TEN-001 authorization investigation
Coordinator (Lane B handoff applied to shared gateway_runtime.js):
- 8e981ea18 fix(security): mount exterior auth on /tenants and /mc (SEC-001/SEC-002; 26 insertions/3 deletions; 401 fail-closed; 503 fail-closed when middleware absent)
Coordinator (Lane A follow-up, declined by Lane B as outside charter):
- 6396113a7 feat(gateway): surface terminal STARTUP_BLOCKED on /health (startup check: blocked/ready=false + failureClass + sanitized reason; flips aggregate to unhealthy; distinct from transient postgres_readiness degraded)
Incident: FL-20260919-SPRINT-002 (bridge heredoc stripped string quotes from the /health patch; caught by harness pre-commit, healed via base64 transfer; node --check is insufficient for this failure class).
Lane C (release certification), branch constitutional-convergence-v2, local only:
- 473a70263 chore(distribution): em-dash cleanup of the five previously committed Lane C files
- e3438958f feat(distribution): release-certification sequence, artifact schema v1, snapshot-manifest builder, worked example, validator, synthetic proof
- caea3d7de docs(oracle): artifact classification (infrastructure/oracle/ARTIFACT-CLASSIFICATION.md)
Coordinator note: Lane C's ledger entries (4) are in ~/workspace/FAILURE_LEDGER.md. Lane C claims: PROVEN_TEST for gate mechanisms (fail-before on pre-fix migration, fixture controls, synthetic verdict propagation); BUILT_NOT_LIVE for the certification tooling; BLOCKED for fixture execution (no scratch PG) and all deployment-phase gates; UNKNOWN for .env secret content (operator triage; gate fails closed).
Lane D (Dockerfile authority), branch constitutional-convergence-v2, local only:
- 224260463 fix(oracle): Dockerfile.gateway node:18-alpine -> node:20-alpine (match proven Oracle runtime). 1 file, 1 line. arm64-compat gate: FAILED before (TOOLCHAIN_MISMATCH, exit 1), PASS after (exit 0).
Coordinator (Lane D follow-up):
- 15d3947a6 docs(oracle): mark Dockerfile drift defect resolved in ARTIFACT-CLASSIFICATION.md.
Lane E (SEC-003/004/005 adjacent surfaces): complete.
- ca2e58345 fix(security): mount exterior auth on SEC-003/004/005 surfaces (Lane E). 4 files.
- Per-surface: /context, /api/v1/repository, /system, /deployments, /runtime, /canonical-events wrapped in requireAuth (via _pgRoute); /api/v1/ollama and /knowledge behind hoisted mcAuth; /health untouched and contract-asserted public.
- Tests: fail-before RED (contract 2/10; HTTP negatives 45/131, 86/86 unauth-or-wrong-key assertions failed pre-fix); post-fix GREEN (contract 10/10; composed HTTP 131/131); Lane B suite re-run green (4/4, 10/10, 107/107). Evidence: tests/security/EVIDENCE_fail_before_lane_e_2026-09-19.md (7 surfaces returned 200 unauthenticated on live Pig gateway pre-fix; /canonical-events already 401 in production image).
- Open divergence flagged by Lane E: /events, /ingest, /ai, /connectors carry exterior auth in ERA-R production but are public in this worktree. Assigned to Lane G.
- FL-20260919-SPRINT-003 (OPEN): dockerode and simple-git genuinely not installed anywhere on the Pig and absent from worktree package.json; gateway cannot boot from worktree source. Assigned to Lane F.
Next lanes spawned 2026-09-19 ~21:00 MDT:
- Lane F: prove the worktree gateway boots from source (resolve FL-20260919-SPRINT-003 genuinely via package manager; success = boot reaches startup/recovery loop with no MODULE_NOT_FOUND).
Lane G (auth parity /events /ingest /ai /connectors): complete.
- 263e89a61 test(security): Lane G fail-before evidence (contract test, HTTP test, evidence doc)
- f4c0545da fix(security): mount exterior auth on the 4 surfaces (gateway_runtime.js, 8 insertions/4 deletions). /events + /ingest wrapped in requireAuth; /ai + /connectors get hoisted mcAuth.
- Caller audit pre-fix: /events sole caller is tandem/emit-observation.py (already sends Bearer key); /ingest, /ai zero callers; /connectors zero scripted callers (OAuth callback is a browser redirect; production wraps identically, so parity not regression). Deliberately left public: /health only.
- Tests: fail-before RED (contract 2/6; HTTP 28/80 with all 52 unauth/wrong-key assertions failing); post-fix GREEN (contract 6/6; HTTP 80/80); suite re-runs green (Lane B 4/4+10/10+107/107; Lane E 10/10+131/131).
- Incident: FL-20260919-SPRINT-004 (bridge stripped quotes around a key-like string literal in a patch command; healed via sha256-verified pigwsl-put.sh; same family as SPRINT-002).
Lane F COMPLETE 2026-09-19 ~21:20 MDT: boot entry proven = gateway/server.js (package.json main + start; gateway_runtime.js has no require.main self-boot block, so the /opt/ping/gateway/Dockerfile CMD `node gateway/bootstrap/gateway_runtime.js` would load-but-never-start; image-history CMD `node gateway/server.js` is the real one). 8 bare modules proven on the boot graph (express, pg, dockerode, simple-git, googleapis, yaml, @temporalio/client, @temporalio/worker), ALL already declared in gateway/package.json — pure environment defect. Fixed with `npm ci` (360 packages, exit 0, lockfile versions). Boot proof: PORT=18099, closed PG port -> zero MODULE_NOT_FOUND, full service init, reached "NOT_READY ... bounded Postgres retry scheduled". No commit (node_modules gitignored; package.json/lockfile byte-identical). FL-20260919-SPRINT-003 HEALED. Non-blocking observation: [CompilerCompatibility] FAIL 11 mismatches on generated artifacts (parked generator WIP) — relevant to Lane 2.
Next: Lane 4 (gateway consolidation follow-through) dispatched now that boot is proven and runtime smoke is possible.

## MERGES
(pending)

## DEPLOYMENTS
(none at sprint start; deploy only when every gate passes)

## ROLLBACKS
(none at sprint start; current certified image oracle-gateway:rollback-20260919 / 8400deecf2a9 is the one-command rollback)

## ORACLE IMAGE DIGEST
- Running image: oracle-gateway:rollback-20260919 / :latest (also tagged certified-20260919), image id 8400deecf2a9, arm64, created 2026-09-17T12:59:33Z. Container ping-gateway Up healthy, recreated 2026-09-20T01:48:15Z, no bind mounts. [PROVEN_RUNTIME via provenance lane, read-only forensics]
- Source SHA behind running image: 099927152b93e0de7c1a120bc88d73fb939c1502 ("docs(report): history rewrite complete", 2026-09-16 19:55 MDT, branch constitutional-convergence-v2, repo ngesk2/crx-runtime). Confidence HIGH: container files EXACT sha256 match to /opt/ping/releases/ping-source-clean-2026-09-16.tar.gz; tarball STRONG_MATCH to the commit after CRLF normalization (Windows packaging path). Timeline corroborates (commit -> tarball +31min -> image).
- Build origin: non-git snapshot tarball (per /opt/ping/releases/RESTORE-2026-09-16.md); build/deploy commands UNKNOWN (no ubuntu bash_history); Dockerfile at /opt/ping/gateway/Dockerfile on Oracle.
- Provenance gap CONFIRMED: image carries no OCI/git labels (compose labels only). Phase 9 requirement recorded for deploy lane (design only): embed org.opencontainers.image.revision/source/created at build time; expose non-secret source_sha on /health or build-info surface.

## ORACLE SCHEMA STATE
At sprint start: ping_events carries a real schema delta from the failed deploy attempt: `ALTER TABLE ping_events ADD COLUMN sequence BIGINT` committed before the backfill UPDATE was rejected by the append-only trigger. Additive, rollback verified safe, NOT reverted (no cosmetic symmetry reverts). Exact schema recorded by Lane A during forensics.

## TESTS + EXACT COUNTS
Lane A:
- Migration-vs-trigger certification gate (ping-runtime/events/migration-certification/certify-sequence-migration.js): 50/50 PASS (structural 1, fail-before phase 5, variant A 22, variant B = Oracle's actual current schema state 22). Asserts trigger-intact, history hashes unchanged, legacy rows NULL, new emits strictly increasing sequences, replay contract, idempotent re-run. [PROVEN_TEST]
- Migration-error classifier unit test: 8/8 OK (MIGRATION_REJECTED x2 non-retryable, TRANSIENT x2 retryable, AUTHENTICATION_FAILURE, SCHEMA_INCOMPATIBILITY x2, UNKNOWN fail-closed non-retryable); sanitizeDbMessage strips password fragments. [PROVEN_TEST]
- Coordinator startup-blocked integration (stub harness, gateway_runtime.js wiring): 2/2 PASS (deterministic reject -> STARTUP_BLOCKED + no retry; ECONNREFUSED -> retry scheduled). [PROVEN_TEST]
- Coordinator /health surfacing (stub harness, startup check callback): 2/2 PASS (unblocked -> healthy/ready=true; blocked -> status blocked, ready=false, failureClass MIGRATION_REJECTED, sanitized reason). [PROVEN_TEST]
Lane B:
- Mount-wiring contract (tests/security/test_mount_wiring_contract.js): 4/4 PASS against patched worktree file (was RED pre-diff). [PROVEN_TEST]
- Exterior auth middleware unit (tests/security/test_exterior_auth_middleware.js): 10/10 PASS incl. 2 key-redaction tests. [PROVEN_TEST]
- Composed HTTP (tests/security/test_tenants_mc_auth.js, NODE_PATH=/tmp/laneb-test/node_modules): 107/107 PASS (35 endpoints x unauth/wrong-key/valid-key + spot checks). [PROVEN_TEST]
- Fail-before evidence committed in aadb9dad9 (EVIDENCE_fail_before_2026-09-19.md): live read-only reproduction GET /mc/business/who-needs-followup -> 200, GET /tenants -> 200 pre-fix. [PROVEN_RUNTIME pre-fix state]
Lane C: pending (lane running; distribution sequence + manifest builder committed, results not yet reported).

## SECURITY FIXES
(pending; Lane B)

## MIGRATION RESULTS
- Trigger forensics [PROVEN_RUNTIME]: trg_ping_events_append_only (BEFORE DELETE OR UPDATE) + trg_ping_events_append_only_truncate on Oracle ping_events, function ping_events_no_mutation() raises unconditionally, no maintenance exception path. Installed out-of-band; owner/date UNKNOWN; absent from all repository-managed history (all branches), database/events.sql, /opt/ping/infrastructure/oracle/schema.sql, repository_store_migrations (11 rows, none trigger-related).
- Design decision: (B) sequence for new events only; legacy rows NULL with explicit unknown-ordering semantics. (A) rejected as cursor-complex; (C)/(D) unnecessary; (E) unavailable (no constitutional exception history). Trigger preserved per Nolan's law.
- Actual Oracle schema state recorded [PROVEN_RUNTIME]: sequence BIGINT NULLABLE, default nextval('ping_events_sequence_seq'); no unique index; no NOT NULL. 2510 rows: 41 sequenced (new inserts via default), 2469 NULL legacy. Column/default came solely from the failed deploy's partial migration (running image 8400deecf2a9 = source 09992715, zero sequence references). NOT reverted.
- Fix [PROVEN_SOURCE, PROVEN_TEST]: backfill UPDATE removed; NULL-count invariant (MIGRATION_INVARIANT_FAILURE); conditional SET NOT NULL; replay legacy-first LEGACY segment.
- Recovery classification [PROVEN_TEST]: deterministic migration rejection -> STARTUP_BLOCKED terminal state, no infinite retry; transient connectivity keeps bounded backoff. /health surfacing of _startupBlocked: follow-up with Lane B.
- Certification gate [PROVEN_TEST]: exact failing migration FAILS BEFORE, corrected migration PASSES AFTER, against fixture carrying Oracle's real enforcement semantics.

## EVENT AUTHORITY RESULT
Independent forensic lane still running at sprint start; consumed when delivered.

## REPLAY RESULT
(pending; Lane E after P0)

## NOLAN'S GO 2026-09-19 ~21:02 MDT (supersedes the 12-hour shape; accelerated continuous sprint)
Governing objective, Nolan's words: MAKE THE LIVE DECISION GRAPH SMALLER, MAKE THE RELEASE GRAPH MORE COMPLETE, AND GET EVERY PROVEN IMPROVEMENT INTO ORACLE. Refactor authority. Preserve mechanism. Delete only proven waste.
- Lane mapping: LANE 1 (migration/append-only) COMPLETE; LANE 8 (security) COMPLETE with Lane G parity in progress; LANE 2 (generators) dispatched; LANE 10 (Qdrant) dispatched; dependency-closure (Lane F) in progress as the deploy-gate critical path.
- Queued (not yet dispatched): LANE 3 (index web reduction), LANE 5 (connector/integration consolidation), LANE 6 (legacy demotion, threshold >=99%), LANE 7 (authority consolidation), LANE 9 (replay truth).
- Dispatched 2026-09-19 ~21:25 MDT: LANE 4 (gateway consolidation follow-through). UPDATE ~21:30 MDT: Lane G complete, gateway_runtime.js released to Lane 4 (same discipline; recent auth/startup/health additions treated as live).
Lane 10 (Qdrant/search honesty): COMPLETE 2026-09-19 ~21:30 MDT. No worktree commits (read-only); ledger FL-20260919-LANE10-001; FL-20260919-005 HEALED.
- Deploy stance: "GET EVERY PROVEN IMPROVEMENT INTO ORACLE" executes through the certification ladder, not around it. No Oracle deploy until dependency closure, ARM64 candidate build, startup/readiness, and rollback gates are proven. No fake certification, no premature deploy. Current deploy gates proven: migration/trigger compat (test), toolchain aligned (test), auth surfaces (test). Unproven: dependency closure (Lane F), candidate image build, candidate runtime behavior.
- Mirror: proven and operational; not re-proved unless it reports failure.
- Reporting: milestones, Nolan-authority decisions, safety boundaries, or sprint conclusion only. Otherwise keep executing.

## SEARCH/QDRANT RESULT
Lane 10 complete 2026-09-19 ~21:30 MDT. CORRECTION: the 503 Lane E saw was the Pig DEV gateway, not Oracle.
- Oracle (read-only): HEALTHY, was never down. ping-qdrant (v1.7.0) Up healthy; /health 200 all 8 components; `knowledge` collection serving. Vector retrieval LIVE on Oracle. [PROVEN_RUNTIME]
- Pig dev gateway: was 503 (FL-20260919-005), now HEALED. Root cause (proven read-only): Docker Desktop host port-forward for :6333 accepted TCP then reset every HTTP request (verified from WSL host and inside container); Qdrant itself fine via bridge IP. Regression came from the 2026-09-19 ~16:13-16:18 MDT container recreations. Bounded repair: `docker restart brain-qdrant` (volume preserved; Postgres untouched), then `docker restart ping-gateway`. After: /health 200, embedding healthy (19 types, 768-dim, nomic-embed-text, 168 points). FL-20260919-005 HEALED; FL-20260919-LANE10-001 ledgered with replay.
- "Hybrid" claims audit: no mislabeled claims found (QDRANT_ARTIFACT_READINESS.md capability assessment honest; capability.ts enum unrelated; RETRIEVAL_INTELLIGENCE_REPORT Law 2 prescriptive not operational; hybrid_search.js degrades gracefully). Zero worktree commits.
- Left untouched: ping-qdrant network detachment + broken curl healthcheck on Pig (cosmetic, affects nothing; Pig compose owner's follow-up). Canonical truth (Postgres/event authority) never at risk.

## GENERATOR RESULT
Parked at sprint start: 13 generators + stable_payload.js + GENERATOR_DETERMINISM.md uncommitted in convergence worktree (base 2c656513b). Resume only per P1 ordering after P0 migration/security independently safe. Lane D standby.

## INDEX REDUCTION RESULT
(pending; after generator portability proven)

## EFFECT RESULT
(pending; Lane H after P0)

## KNOWLEDGE RESULT
(pending)

## ARCHIVE/DEMOTION RESULT
(pending; Lane I, >=99% reachability confidence, demote not destroy)

## OPEN BLOCKERS
- B0: workspace repo has no authoritative remote (REMOTE IDENTITY REQUIRED). UPDATE 2026-09-19 ~21:02 MDT (Nolan's GO): remote creation attempted by the parent and BLOCKED on all reachable paths — cloud GitHub API 401 via the known egress-proxy auth-swap fault (FL-20260919-004 family); Pig Git Credential Manager cannot see the Windows credential store from non-interactive SSH (0 targets in cmdkey). Recorded as FL-20260919-009, status OPEN. Do not retry, do not hunt for credentials. ngesk2/crx-runtime untouched. Audit commit 38535ea567b49f7beb09d68025f6f73f7cd69f78 stays local-only until Nolan unblocks auth. NO PUSHES from any lane until auth is unblocked.
- ~~B1: Oracle running image 8400deecf2a9 source SHA unknown~~ RESOLVED 2026-09-19 ~20:29 MDT: source SHA 099927152b93e0de7c1a120bc88d73fb939c1502, confidence HIGH (provenance lane, read-only).
- B2: TEN-001 (agent-to-tenant authorization model) genuinely BLOCKED pending Nolan's decision (which agents may read /mc business data, mutate the registry, agent-to-tenant binding). No tenant authority exists anywhere to reuse; Lane B refused to invent one. AUTHENTICATED-only (401) shipped for /tenants + /mc; AUTHORIZED/NAMESPACE_SCOPED deliberately not introduced. Candidate for the Grill.
- B3: adjacent public surfaces out of scope for Lane B (SEC-003/004/005 class: /context, /api/v1/repository, /system, /deployments, /runtime, /api/v1/ollama, /knowledge POST, /canonical-events in ERA-C): candidate follow-up lane. SEC-006/SEC-007 recorded, out of scope.
- B4: runtime-manifest.json allowlist does not exist in the worktree yet; when Lane C builds it, gateway/exterior_auth_middleware.js MUST be included or the distribution build fails on the new import (Lane B handoff checklist).
- B5: runtime CMD mismatch — RESOLVED which is real 2026-09-19 ~21:20 MDT (Lane F): the real boot entry is gateway/server.js (package.json main + start script). Image-history CMD `node gateway/server.js` is correct; /opt/ping/gateway/Dockerfile CMD `node gateway/bootstrap/gateway_runtime.js` would load-but-never-start (no require.main self-boot block). The host Dockerfile CMD is stale; noted, not patched (Oracle read-only).
- B6 (new 2026-09-19 ~20:51 MDT): H9 ARM64 toolchain content exists only on oracle/deploy-2026-09-18, never merged into constitutional-convergence-v2. Merge decision is Nolan's; not attempted in this sprint without authorization.
- No Oracle deployment until all gates pass. Rollback image remains 8400deecf2a9.

## NEWLY DISCOVERED RISKS
(pending)

## CURRENT CERTIFICATION LADDER
Rungs claimed only when demonstrated.
- ORACLE_RUNTIME_PROVEN: rollback image 8400deecf2a9 (source 09992715), re-proof 2026-09-20 ~01:49 UTC, FL-20260919-ORACLE-008. [PROVEN_RUNTIME]
- MIGRATION_TRIGGER_COMPATIBLE: corrected migration passes the certification gate against Oracle-enforcement fixture; exact old migration fails before. [PROVEN_TEST] Runtime deployment of the corrected migration: UNPROVEN (no Oracle deploy attempted; deploy only when all gates pass).
- Everything above for new candidates (distribution closure, ARM64 build of new candidate, candidate startup, readiness, canonical write, dedup, mission path, restart, post-restart read, rollback proof): UNPROVEN / in progress (Lanes D, E).
- TENANTS_MC_AUTHENTICATED: /tenants + /mc require exterior auth (401 fail-closed); fail-before proven (200 pre-fix on live gateway), contract 4/4, unit 10/10, composed HTTP 107/107. [PROVEN_TEST]
- STARTUP_BLOCKED_SURFACED: /health startup check reports terminal migration failure distinctly from transient PG degradation. [PROVEN_TEST]
- RELEASE_CERTIFICATION_TOOLING: built, synthetic proof passes; never run against a real deploy. [BUILT_NOT_LIVE]
- TOOLCHAIN_ALIGNED: deploy Dockerfile node:20-alpine matches proven Oracle runtime (node v20.20.2 live); arm64-compat gate FAILED before, PASS after. [PROVEN_TEST]
- DEPENDENCY_CLOSURE_BOOT: worktree gateway boots from source (gateway/server.js) with zero MODULE_NOT_FOUND; 8 bare modules proven on boot graph, all declared, installed via npm ci from lockfile; boot reaches PG bounded-retry. Executed on Pig dev host. [PROVEN_RUNTIME on Pig; Oracle runtime of new code UNPROVEN]
- ADJACENT_SURFACES_AUTHENTICATED: /context, /api/v1/repository, /system, /deployments, /runtime, /canonical-events, /api/v1/ollama, /knowledge require exterior auth; fail-before RED (2/10 contract, 45/131 HTTP), post-fix GREEN (10/10, 131/131); /health contract-asserted public. [PROVEN_TEST]
- EVENT_INGRESS_AUTHENTICATED: /events, /ingest, /ai, /connectors require exterior auth at parity with ERA-R production; caller audit found no legitimate keyless caller (/events sole caller already sends Bearer); fail-before RED (2/6 contract, 28/80 HTTP), post-fix GREEN (6/6, 80/80); full security suite re-runs green. [PROVEN_TEST]
- QDRANT_LIVE_ORACLE: Oracle Qdrant healthy, /health 200, vector retrieval live on the `knowledge` collection. Pig dev gateway outage (FL-20260919-005) root-caused to Docker Desktop port-forward wedge and healed by bounded restart. No "hybrid" mislabeling found. [PROVEN_RUNTIME]

## NEXT 12-HOUR QUEUE
(pending; queue-selection loop: after each objective, refresh state, ingest evidence, pick highest-leverage unblocked objective)

## STATEMENT CLASSIFICATION KEY
Every statement in this artifact carries one of: PROVEN_RUNTIME / PROVEN_TEST / PROVEN_SOURCE / BUILT_NOT_LIVE / PRESERVED_INACTIVE / EXPERIMENTAL / BLOCKED / UNKNOWN.

## NOLAN'S 12-HOUR MEGA DIRECTIVE 2026-09-19 ~21:17 MDT (SUPERSEDES the ~21:02 accelerated queue)

Nolan issued a broader execution directive that wins wherever it conflicts with earlier instructions. Verbatim key content is in the coordinator's task record; this section records its operational consequences.

Governing objective: MAXIMIZE PROVEN / SIMPLIFIED / CONSOLIDATED / PORTABLE / DETERMINISTIC / SECURE / RECOVERABLE / OBSERVABLE / ORACLE-LIVE PING. Optimization target: smaller live decision graph + fewer competing authorities + fewer duplicate mechanisms + less bootstrap surface + less machine-specific state + less generated repository weight + more deterministic releases + more durable consequences + more truthful runtime claims + more complete Oracle certification.

Operating loop: QUESTION, DELETE PROVEN WASTE, PRIORITIZE, SIMPLIFY, REUSE, WIRE, VERIFY, FALSIFY, CERTIFY, DEPLOY, OBSERVE, CONTINUE. Per objective: refresh evidence, preserve/write invariant test, smallest coherent correction, targeted tests, adversarial falsification, commit, merge if proven, certify if deployment-relevant, deploy if certified, verify Oracle, immediately select next objective. Blocked lane: record blocker, preserve evidence, do not lower the proof standard, move to an independent lane.

Amendments (part of the directive):
1. CE-001 pulled INTO the engineering sprint. The Grill already contains the resolved direction: evidence falsified the current completion identity because Date.now() enters the completion preimage. Execute the smallest deterministic completion-identity fix with retry/restart/crash/reconciliation invariance (same logical completion yields same completion identity across retry, lease expiry, restart, crash-after-accept, reconciliation). No re-debate; implement, test adversarially, commit.
2. Do not trample the separate operational engine. The backlog's owned/blocked items must not be silently reassigned; do not mutate outreach/customer/external-action state; do not mark anything DONE on a worker's word alone. The validator, runtime, truth surfaces, release machinery, and infrastructure around those workflows MAY be improved, but respect existing authority.

Nolan is asleep; the sprint runs the full 12 hours overnight (~21:17 MDT 2026-09-19 to ~09:17 MDT 2026-09-20). He reviews in the morning. Interrupt only for: meaningful milestone, required authorization, genuine constitutional decision, security emergency, irreversible/destructive decision, sprint completion.

## 12-HOUR TARGET LADDER (rungs claimed only when demonstrated)
MIGRATION_TRIGGER_COMPATIBLE [PROVEN_TEST] / STARTUP_FAILURE_CLASSIFIED [PROVEN_TEST] / SECURITY_BOUNDARIES_PROVEN [PROVEN_TEST] / RELEASE_CLOSURE_PROVEN [BUILT_NOT_LIVE, gates unexecuted] / GENERATOR_PORTABLE [in progress, Lane 2] / GENERATOR_IO_CONSOLIDATED [queued after fanout] / INDEX_DAG_PROVEN [dispatched 21:17 wave] / REPOSITORY_WEIGHT_REDUCED [pending] / GATEWAY_CONSOLIDATED [in progress, Lane 4] / EVENT_AUTHORITY_PROVEN [partial; event-authority forensic lane consumed at sprint start; Lane G2 dispatched 21:17] / EVENT_COLLISION_SAFE [pending] / EVENT_MISSION_DURABLE [pending] / COMPLETION_IDENTITY_DETERMINISTIC [CE-001 forensics dispatched 21:17, fix follows] / RESULT_SEMANTICS_PROVEN [pending] / REPLAY_FIDELITY_PROVEN [pending] / WITNESS_PROVEN [pending] / KNOWLEDGE_PATH_PROVEN [pending] / CONNECTOR_BOUNDARIES_PROVEN [pending] / EFFECT_IDEMPOTENCY_PROVEN [pending] / QDRANT_PROJECTION_PROVEN [PROVEN_RUNTIME on Oracle; SEARCH_TRUTHFUL verified, no hybrid mislabeling] / MISSION_CONTROL_TRUTHFUL [audit dispatched 21:17] / LEGACY_DEMOTED [pending] / RELEASE_CERTIFIED [pending] / ORACLE_DEPLOYED [pending] / ORACLE_RUNTIME_PROVEN [rollback image only] / ORACLE_RESTART_PROVEN [pending] / ORACLE_ROLLBACK_PROVEN [pending] / ORACLE_RECOVERY_PROVEN [pending] / OPERATIONS_ARTIFACTS_COMPLETE [pending]

## PLANE STATE AT DIRECTIVE ABSORPTION (2026-09-19 ~21:17 MDT)
- Coordinator execution plane (this subagent's shell): /home/hatch, workspace repo /home/hatch/workspace master e522eb857c16340903091e533d4a154321e0a0ed (matches sprint start). The convergence worktree path from earlier context (/home/nolan/worktrees/constitutional-convergence) is NOT visible from this shell (no /home/nolan on this host).
- Source-mutation plane verified reachable via the Pig bridge (~/workspace/pig/pigwsl-run.sh): /home/nolan/worktrees/constitutional-convergence, branch constitutional-convergence-v2, HEAD 257b9f5090c488ea8cf45c8c383080d779a99f55. Dirty: Lane 2 generator files (ping-runtime/orchestration/*), Lane 4 gateway/bootstrap/gateway_runtime.js, evals/constitutional-runtime/EVAL-006_double_completion_prevention.js, CERTIFICATION.md, CONTRADICTIONS.md, capability_registry.json; untracked evidence/, GENERATOR_CWD_PROOF.md, GENERATOR_DETERMINISM.md, dormant_classifications/, stable_payload.js, tests/mc1-legacy-ingress/.
- All source-mutation lanes run through the Pig bridge. Oracle remains READ-ONLY until a candidate passes the full certification ladder; rollback anchor stays 8400deecf2a9.
- ping-agent-ops remote creation: BLOCKED until morning (FL-20260919-009); no cycles spent overnight. No pushes from any lane.
- Sunday 2026-09-20 15:00 post path: untouched by every lane, per standing rule.

## WAVE 1 DISPATCH (2026-09-19 ~21:17 MDT)
Active writers at dispatch: Lane 2 (ping-runtime/orchestration/*), Lane 4 (gateway/* incl. gateway_runtime.js). New lanes are read-only forensics or write only to disjoint paths:
- CE-001 forensics (READ-ONLY): map exact current completion-identity code, preimage fields, Date.now() entry points, all completion lifecycle states (WORKER_RETURNED through MISSION_COMPLETED); produce minimal-fix design + fail-before test plan. Output: evidence/ce001-forensics-*.md. NO mutation (EVAL-006 is already dirty, ownership unclear).
- Lane 3 index DAG (READ-ONLY evidence): enumerate the generated index/artifact web; build the exact DAG table (name/size/producer/canonical inputs/derived inputs/runtime+build+test consumers/determinism/clock+path+order+network dependencies/stable-payload reproducibility/distribution need/historical uniqueness); classify per CANONICAL_INPUT / RUNTIME_REQUIRED_PROJECTION / BUILD_DERIVED / DEV_DERIVED / CACHE / REPORT / HISTORICAL_EVIDENCE / UNKNOWN. Output: evidence/index-dag-2026-09-19.md. NO untracking in this pass (evidence first).
- Lane N Mission Control truth (READ-ONLY audit): audit every status/health surface for fabricated green state (incl. the Grill-flagged Math.random() health/status), stale counts, fake hybrid/replay/completion claims; bind each claim to backend proof; classify UNKNOWN/UNAVAILABLE/DEGRADED honestly. Output: evidence/mc-truth-audit-*.md. NO UI mutation.
- Lane O release candidate (BUILD ONLY, no Oracle touch): from a recorded source SHA, build clean runtime distribution via the Lane C tooling, run closure certifier, build ARM64 candidate image with non-secret provenance labels, record image digest + gate evidence. Stop before any Oracle swap; hand the deploy decision back to the coordinator with the full certification packet.

Queue behind wave 1 (dispatch on results): CE-001 fix lane, Lane 3 untracking of proven waste, Lane G2 event-collision/event-mission lanes, replay/witness lanes, connector/effect lanes, legacy demotion lane, Lane O Oracle swap (only if the candidate's certification packet is complete).

## LANE 4 COMPLETE 2026-09-19 ~21:12 MDT (verified on exact plane)

Worktree constitutional-convergence-v2. Three commits, local only, no pushes:
- ee0797ede `refactor(gateway): remove dead DI-container bootstrap island` (6 files, +18/-602): deleted bootstrap/index.js, container.js, lifecycle.js, main.js, constitutional_runtime.js (all source-proven dead: zero static/dynamic/test/config references); slimmed bootstrap/wiring.js (removed wireContainer + validateWiring + 15 exclusive imports; kept buildDependencyGraph, live via /constitution route and runtime_hash).
- 257b9f509 `refactor(gateway): remove duplicate construction residue in composition` (core_event_spine.js duplicate eventValidator key; integrations.js dead ternary platformHash).
- 4d522a6bd `refactor(gateway): remove write-only _storage field from GatewayRuntime` (setStorage callback now a no-op).
Tests: test_wiring_path_time_authority 12/12, test_p001_p005 27/27, composition contract 5/5 after each commit, test_startup_secret_hygiene ALL PASS. Smoke after each commit via Lane F recipe (PORT=18099, closed PG): zero MODULE_NOT_FOUND, full service init, reached NOT_READY with bounded retry. Readiness/degraded semantics, init/shutdown order, public service surface, event authority ownership preserved. Deliberately preserved: _kernelAdapter shutdown guard (pinned by composition contract GC-5), buildDependencyGraph, all 25 route mounts, requireAuth/mcAuth, _startupBlocked, startup health check. [PROVEN_TEST]
Ladder: GATEWAY_CONSOLIDATED rung claimed [PROVEN_TEST].
Ledgered by Lane 4 (not a Lane 4 regression): FL-20260919-LANE4-001 OPEN. gateway/test_pg_recovery.js case C ("starts degraded") fails pre-existing: Lane B's ExteriorAuthMiddleware.initialize() consumes flakyPool(1)'s single failure before the SELECT 1 readiness probe, so the probe succeeds and the spine initializes instead of going degraded. Proven identical with Lane 4 edits stashed and on pristine baseline f4c0545da. Needs triage: real product defect (auth init masking degraded startup) vs test-only artifact. Triage lane dispatched.

## LANE 2 PROGRESS 2026-09-19 ~21:12 MDT
Lane 2 committed 8d9c07233 `feat(orchestration): repository-relative generator fanout, CWD-independence proven 15/15` (local only). Lane 2 still running; remaining generator files still dirty in the worktree.

## FL-20260919-LANE4-001 HEALED 2026-09-19 ~21:15 MDT (verified on exact plane)

Triage lane verdict: (b) TEST-ONLY ARTIFACT, not a product defect. Decisive evidence: auth initialize() runs before the SELECT 1 probe and swallows DB errors into in-memory degraded mode by design (Lane B); in production PG-down fails every query so the independent probe still governs degraded startup (case B proves the honest NOT_READY path); per-request authenticate() prefers Postgres so no auth pinning. Fix: replaced count-based flakyPool(1) with time-gated downUntilPool(Date.now()+1000) faithfully modeling PG-down-at-boot. Commit c70fa44233 (one file, gateway/test_pg_recovery.js, +18/-5, explicit staging, local only). Verification: test_pg_recovery ALL PASS x2 runs, composition contract 5/5, startup secret hygiene ALL PASS, Lane F boot smoke clean. No product code touched. Ledger entry updated to HEALED with replay instructions before narration. [PROVEN_TEST]

## WAVE 2 DISPATCH (2026-09-19 ~21:16 MDT)
- Event authority + collision forensics (READ-ONLY): trace every event producer and acceptance path (PRODUCER -> EVENT INTENT -> ONE CANONICAL EVENT ACCEPTANCE AUTHORITY -> CANONICAL JOURNAL -> DOWNSTREAM CONSEQUENCES); classify each event-ish component as AUTHORITY / INGRESS / ENVELOPE / ADAPTER / JOURNAL / PROJECTION / COMPATIBILITY / LEGACY / UNKNOWN; prove the current exact event identity format (same logical ID + canonical-equivalent content -> duplicate; same logical ID + different semantic content -> COLLISION / FAIL CLOSED); audit every ON CONFLICT path for silent semantic-collision hiding using the actual current schema (no assumed legacy columns). Output: evidence/event-authority-2026-09-19.md. NO mutation, NO authority changes in this pass (demotion design only).

## LANE N COMPLETE 2026-09-19 ~21:16 MDT (read-only audit)

41 distinct Mission Control / status / health claims audited against backend proof. Evidence: evidence/mc-truth-audit-2026-09-19.md (303 lines, sha256-verified).
- PROVEN: 12 (convergence gateway /health with 10 real registered checks incl. STARTUP_BLOCKED surfacing, /system/state, /mc/* event-derived routes, Docker healthchecks, 6 fail-closed UI components, no-hybrid-labels finding stands).
- FABRICATED: 22. STALE: 3. BROKEN BINDING: 5. UNKNOWN: 2.
- Math.random() verdict: CONFIRMED PRESENT. The exact Grill-flagged code: CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx:30-31 (latency/contextUsage under a literal `// Simulate runtime updates` comment) and :74 (tok/s). Ships in the compiled .next build; /chat renders the header by default. Also: hardcoded 'healthy'/'connected' initial states never fetched, hardcoded 99.9% uptime, hardcoded Ready/Pass checkmarks, hardcoded Mission Queue zeros, NextResponse.json({status:'healthy'}) with zero probes, gateway/simple_server.js unconditional /health ok plus fabricated-negative /system/state, hardcoded ollama status contradicting the UI's model name, and a weak 'healthy' fallback in gateway/routes/health.js. No Math.random in any gateway status path. Key contradiction: header shows green while the dev gateway 503s (FL-20260919-005), and simple_server simultaneously claims ollama Offline.
- Ledger note: the Math.random() finding was already ledgered as FL-20260919-009 (line 134, suspected false-green), now CONFIRMED. A later entry (line 647) reused FL-20260919-009 for the ping-agent-ops GitHub auth blocker. Disambiguation appended to the ledger: 009 canonically refers to the auth blocker per the sprint doc and memory; the Math.random() item is referenced as FL-20260919-009-UI going forward. Ledger is append-only; no entries renamed.
- Ladder: MISSION_CONTROL_TRUTHFUL audit phase [PROVEN_TEST]; the fabricated claims are not yet fixed. Fix lane dispatched.

## WAVE 3 DISPATCH (2026-09-19 ~21:17 MDT)
- UI truth fix (MUTATION, UI/status surfaces only): first prove which surfaces are actually served live (ui-next app vs convergence gateway vs simple_server.js) from repo configs before mutating; then remove Math.random() status values and hardcoded green states, bind to the real convergence /health where the component is served against it, otherwise render honest UNKNOWN/UNAVAILABLE/DEGRADED (never HEALTHY without proof); fix the STALE lifecycle poll and hardcoded counts; fix or honestly label simple_server.js fabricated endpoints (DEV_ONLY classification if it is a dev stub); fix the weak health.js fallback. Verify with UI build/typecheck and targeted tests. Commit explicitly, local only.

## LANE 3 INDEX DAG COMPLETE 2026-09-19 ~21:17 MDT (read-only evidence)

26 artifact records (24 present + 2 missing DAG nodes), 123,755,668 bytes (~118 MB). The ~104 MB web = 13 orchestration JSONs at ~102 MB. Classification: CANONICAL_INPUT 1, RUNTIME_REQUIRED_PROJECTION 5, BUILD_DERIVED 0, DEV_DERIVED 11, CACHE 1, REPORT 1, HISTORICAL_EVIDENCE 4, UNKNOWN 2. Evidence: evidence/index-dag-2026-09-19.md (sha256-verified).
- Headline: the 13 orchestration JSONs have ZERO live consumers. The only wired consumer (ConstitutionalQueryAPI.js) hardcodes Windows paths and requires the missing SymbolRouter.json; classified PRESERVED_INACTIVE (Q2 resolved by coordinator on this evidence).
- The 5 gateway/generated/*.json ARE runtime-required: loaders throw on missing, wired on the live boot graph via integrations.js. They currently drift from their generators (matches Lane F's [CompilerCompatibility] FAIL 11 observation). Drift-heal queued as a follow-up lane after Lane 2's fanout.
- RepositoryKnowledgeIndex_Filesystem.json (14 MB) is the DAG root with no producer in the tree (June 2026 Windows scan, commit 4a8587ad3); three generators read live repo files via stale C:\ absolute paths, not byte-reproducible on Linux.
- Every generate_*.js has exactly one real clock use (generatedAt); the Math.random/Date.now hits are string literals inside a violation detector and keyword list.
- Top 5 future untracking candidates (~58.8 MB combined): UUIDRegistry.json (18.3 MB), RoutingIndex.json (17.6 MB), RoutingCache.json (17.1 MB), ContextPackets.json (5.4 MB), ArchitectureManifest.json (0.4 MB). Untracking ONLY after Lane 2's portability fanout is proven, with regenerate-and-compare-stable-SHA smoke each.
- UNKNOWN preserved: Filesystem.json (irreplaceable DAG root), the two missing nodes (CrossReferenceMatrix, SymbolRouter; producers exist, never produced on this branch), knowledge_report.json, 4 historical raw txt dumps, Lane 2's dormant_classifications/ WIP.
- Ladder: INDEX_DAG_PROVEN claimed [PROVEN_TEST]. REPOSITORY_WEIGHT_REDUCED pending the untracking pass.
- Q1 (whether the 9 DRIFT artifacts regenerate during fanout or stay frozen) relayed to Lane 2 with the directive's constraint (do not rewrite tracked production artifacts unnecessarily); Lane 2 decides on evidence.

## WAVE 4 DISPATCH (2026-09-19 ~21:18 MDT)
- Replay/witness fidelity forensics (READ-ONLY): trace the actual current path CANONICAL PERSISTENCE -> REPLAY INPUT -> REPLAY ENGINE -> VERDICT -> WITNESS. Determine whether replay synthesizes a replacement envelope or remints identity (if so, it is not canonical replay; name it precisely). Verify witness as derived replay attestation: proof-content digest, replay fingerprint, algorithm/version binding, input-schema/version binding, completeness, truncation fail-closed, historical proof preservation. Check against previous W-1A/W-2 work before any mutation thinking. Output: evidence/replay-witness-2026-09-19.md. NO mutation in this pass.

## CE-001 FORENSICS COMPLETE 2026-09-19 ~21:18 MDT (read-only)

Evidence: evidence/ce001-forensics-2026-09-19.md (330 lines, sha256-verified). HEAD 4d522a6bd.
- No dedicated completion-identity minter exists. De facto completion identity = event_id of the MISSION_COMPLETED event, minted at mission_runtime.js:172 via UER.emit with no logical_id passed.
- Clock entry points: mission_runtime.js:162 (duration_ms = Date.now() - started_at, flows into stored result AND emit payload); mission_scheduler.js:351 (completed_at via constitutionalTimeAuthority, lands in payload). unified_event_runtime.js:246 timestamp correctly excluded from identity by design.
- Lifecycle: WORKER_RETURNED, RESULT_PERSISTED, RESULT_VERIFIED, EFFECT_DISPATCHED, EFFECT_CONFIRMED, MISSION_OUTCOME_VERIFIED all ABSENT repo-wide. Only MISSION_COMPLETED event exists, with ZERO in-repo subscribers. Implemented lifecycle: worker returns -> conditional UPDATE running->completed on ping_missions -> MISSION_COMPLETED emitted. No reconciler exists.
- Five-scenario traces: every re-completion mints a new event_id (clock differs); lease-reaper can duplicate via stale worker late complete() winning the conditional UPDATE (no attempt fencing); crash between DB UPDATE and emit loses the completion event permanently (row completed, no event, no reconciler); emit() steps 7-8 dispatch handlers/integrations even on ON CONFLICT dedup hits (emit-before-check defect).
- Dirty EVAL-006: unrelated test-harness maintenance, not CE-001 evidence. tests/mc1-legacy-ingress/: unrelated MC-1 harness.
- Minimal-fix design: pass logical_id {kind:'mission-completion', mission_id} on the MISSION_COMPLETED emit; identity becomes clock-free; dedup via ON CONFLICT. Keep duration_ms/completed_at as payload metadata. Optional: startup reconciler re-emitting lost completions (idempotent by deterministic identity). Must not change: IdentityAuthority as sole minter, no historical reminting, no new lifecycle states. Out of scope: attempt fencing (queued as CE-002), dispatch-on-dedup gating (but see fix-lane note below).
- Test plan: 7 cases; cases 1 (clock-independence) and 5b (crash between UPDATE and emit) must run pre-fix.
- Coordinator note to fix lane: deterministic identity makes dedup hits MORE frequent by design, so the emit-before-check defect (handlers dispatched on dedup hits) becomes a duplicate-consequence risk inside the same semantic objective. The fix lane must verify and gate dispatch on actual insert as part of the coherent unit. Also: same logical ID + different semantic content must COLLIDE fail-closed, not silently DO NOTHING; verify the ON CONFLICT path proves equivalence or add the gate.

## WAVE 5 DISPATCH (2026-09-19 ~21:19 MDT)
- CE-001 fix (MUTATION, mission runtime only): fail-before cases 1 and 5b pre-fix (must FAIL), then the smallest deterministic completion-identity fix (logical_id on the MISSION_COMPLETED emit; clock values stay as payload metadata only), collision fail-closed gate for same-ID/different-content, dispatch-on-actual-insert gating so deterministic dedup cannot double-dispatch, then all 7 adversarial cases post-fix (retry, lease expiry, restart, crash-after-accept a/b, reconciliation idempotency, no-over-collapsing negatives). Optional startup reconciler for lost completions only if proven idempotent. No new lifecycle states, no historical reminting, IdentityAuthority stays sole minter. Commit explicitly, local only.
- CE-002 queued: attempt fencing for the lease-reaper duplication window (stale worker late complete() vs new attempt), behind CE-001.

## REPLAY/WITNESS FORENSICS COMPLETE 2026-09-19 ~21:20 MDT (read-only)

Evidence: evidence/replay-witness-2026-09-19.md (sha256-verified). HEAD c70fa4423.
- REPLAY INPUT IS SYNTHESIZED, NOT CANONICAL REPLAY. ReplayWorker._buildReplayEvents (canonical_workers.js:424-445): the Postgres correlation-group load is commented out (433-434); live input is the in-flight triggering event repackaged as a one-element array. KernelReplayExecutionProvider then remints every event_id (67-70, evt-ping-<i>-<sha12>; canonical event_ IDs never survive the kernel's evt- gate), remaps all types to artifact_commit/artifact_update (176-181), stamps silent current-era defaults (schema 3.0.0, replay 5.0.0, policy 1.0.0, timestamp 2026-01-01, 84-90), silently truncates at maxEvents (43), silently skips malformed envelopes (113-120). True causation_ids cannot pass the kernel gate; kernel lineage is a rebuilt sequential chain. No era handling under gateway/replay/kernel.
- Replay engine (DeterministicReplayEngine) is deterministic and pure but computes over replacement envelopes; 12-leaf P0 invariant undisturbed.
- VERDICT: REPLAY_COMPLETED.verified can be true on silently truncated input. Engine/algorithm/completeness fields are dropped before persistence, so the verdict cannot name its reproduction parameters. canonical_input_hash is a misnomer (hashes synthesized input JSON, not canonical rows).
- WITNESS: faithful DERIVED REPLAY ATTESTATION on the live path, no independent mutable authority. WitnessWorker authenticates the trigger against the canonical ping_events REPLAY_COMPLETED row, distrusts envelope claims, never re-runs the kernel, attests only on verified===true with non-empty witness_root, emits observable WITNESS_REJECTED otherwise, derives identity from logical_id (wall-clock excluded; ON CONFLICT dedups retries). W-1A (98ef51c9c) is an ancestor of HEAD, all properties live. W-2 (172577628) is NOT an ancestor (lives on constitutional-convergence-authority-law): engine/algorithm version binding, explicit INCOMPLETE state, input counts absent here. Dormant witness_worker.py (uuid4 IDs, own table, non-UER emission) has zero live references: do not wire, do not execute, do not delete (adversarial-audit material). No rogue witness branch among the 72 branches.
- Bottom line: the witness stage is faithful; the thing it attests to is not canonical replay. Weak link is replay input. W-2 addresses version-binding/INCOMPLETE on the other branch only; input synthesis and identity reminting unaddressed everywhere.
- Ladder: WITNESS_PROVEN claimed [PROVEN_SOURCE] for the derived-attestation property (no independent mutable authority on the live path). REPLAY_FIDELITY_PROVEN pending convergence. Fix lane dispatched.

## WAVE 6 DISPATCH (2026-09-19 ~21:21 MDT)
- Replay convergence (MUTATION, replay path only): converge replay toward the persisted canonical representation. Wire the Postgres correlation-group load as the replay input (fail closed if rows cannot be loaded); preserve canonical event identity through the kernel (fix the evt- prefix gate rather than reminting; reminting is the constitutional violation); remove silent current-era defaults (era handling or fail closed on era mismatch, never silently apply current routing semantics to historical eras); truncation and malformed-envelope skips become INCOMPLETE/failed verdicts, never verified:true; persist engine/algorithm/completeness parameters on the verdict; fix the canonical_input_hash misnomer. Harvest version-binding/INCOMPLETE mechanisms from W-2 (172577628, branch constitutional-convergence-authority-law) where safe; do not blindly merge. Keep the 12-leaf invariant undisturbed; witness path untouched except what verdict changes require; do not wire witness_worker.py. Fail-before per violation, all green post-fix. Commit explicitly, local only.

## EVENT AUTHORITY/COLLISION FORENSICS COMPLETE 2026-09-19 ~21:22 MDT (read-only)

Evidence: evidence/event-authority-2026-09-19.md (32,549 bytes, sha256-verified). HEAD c70fa4423.
- Producer-to-journal trace: POST /events and /ingest -> CanonicalizationService -> UER.emit (validate -> govern -> IdentityAuthority mint -> INSERT INTO ping_events ON CONFLICT DO NOTHING -> dispatch handlers). All emitters (business, workers, witness, external adapter, emit-observation.py) converge here. EventToMissionBridge -> MissionRuntime is downstream routing, not acceptance.
- Classification: UER / IdentityAuthority / CanonicalAuthority = AUTHORITY; ping_events = JOURNAL; routes/emitters/workers = INGRESS; CanonicalizationService / LegacyIngressAdapter / EventValidator / EventGovernance / EventToMissionBridge = ADAPTER; replay classes = ENVELOPE; EventRepository = LEGACY (independent write path still live); repository_events / event_read_authority / event_processing = PROJECTION; StandardEventSchema shim = COMPATIBILITY; EventBridge / PostgresEventStore / witness_worker.py = LEGACY; omni_router_bootstrap = UNKNOWN (reachability unverified).
- 7 competing truth conflicts: (1) JS CanonicalEventEnvelope mints UUIDv5 identity vs IdentityAuthority event_<16hex>; (2) its MAX(sequence)+1 ordering vs Postgres sequence; (3) its direct canonical_events write returning unconditional 'ok' = independent acceptance; (4) EventRepository.appendEvent permits independent writes (rule by wiring only); (5) UER silently absorbs semantic collisions; (6) mission_id ON CONFLICT absorbs same-key divergence (adjacent); (7) Era H 64-hex vs V2 event_<16hex> IDs coexist with no single-format enforcement.
- COLLISION VERDICT: FAILS the collision law. Same logical ID + different content mints the same event_id (payload excluded from preimage when logical_id is set), is silently dropped, returns {status:'ok', deduplicated:true}, AND the differing in-memory event is still dispatched. Affected: CanonicalizationService (all /ingest + business emitters), witness WITNESS_CREATED, ExternalAgentAdapter. Current format is NOT collision fail-closed.
- Critical history: ab0adbc20 (2026-09-19 06:48 MDT) implemented Phase 12 collision enforcement (content compare, fail closed EVENT_IDENTITY_CONFLICT); 114afad01 (06:50) reverted it with a bare message, no justification. Branch constitutional-convergence-authority-law carries 1995f0a59's canonical-hash witness design; neither is at HEAD.
- ON CONFLICT audit (9 paths): UNSAFE = UER ping_events:271, canonical_event_envelope.js:178, postgres_event_store.ts:91. Safe = projection_status, event_processing, ping_bridge_cursors, ping_missions, lineage edges, repository_objects. No production UPDATE/DELETE against ping_events; Oracle append-only trigger is the backstop.
- Demotion map: CanonicalEventEnvelope -> ingress envelope producer (remove UUIDv5 identity, MAX+1 ordering, unconditional acceptance); EventRepository -> PROJECTION/ADAPTER with fail-closed accepted-canonical-event code gate; UER commit layer needs collision enforcement restored.
- Coordinator decisions: (a) CE-001 fix lane narrowed to identity + tests; UER commit-layer collision enforcement + dispatch-on-actual-insert gating move to the dedicated collision lane (one writer per file). (b) Collision lane first investigates the bare revert empirically; only a genuinely unresolvable constitutional tradeoff goes to the Grill. (c) Event-authority demotion lane queued after the collision lane.
- Ladder: EVENT_AUTHORITY_PROVEN partial (trace + classification [PROVEN_SOURCE]); EVENT_COLLISION_SAFE pending (currently FALSIFIED, not merely unproven).

## WAVE 7 DISPATCH (2026-09-19 ~21:23 MDT)
- Collision enforcement (MUTATION, UER commit layer): investigate why 114afad01 reverted ab0adbc20 (diffs, surrounding commits, test evidence, docs); examine 1995f0a59's canonical-hash design on constitutional-convergence-authority-law; then implement commit-layer collision enforcement: content compare at the conflict point, same-ID + equivalent-content -> duplicate (no re-dispatch), same-ID + different-content -> COLLISION fail closed with typed error and observability (never silent ok, never dispatch the differing event). Gate handler/integration dispatch on actual insert. Fail-before per behavior, all green post-fix. If the revert reason reveals a genuine constitutional tradeoff evidence cannot resolve, stop and report it for the Grill instead of implementing.

## LANE O COMPLETE 2026-09-19 ~21:26 MDT (build only, no Oracle touch)

Release candidate from certified merged state. Verified on the exact plane by the coordinator: packet and image both present, digests match.
- Source: 4d522a6bd (constitutional-convergence-v2). Built from committed HEAD via git archive into a clean clone; Lane 2/4 uncommitted WIP excluded by construction. All 8 sprint lane commits verified as ancestors. (Branch HEAD has since moved to c70fa44233; the candidate is pinned to 4d522a6bd, not the branch tip.)
- Closures: 8/8 PASS, verdict CERTIFIED. Distribution manifest: 2773 files, digest ae45fb77.... B4 verified (exterior_auth_middleware.js resolves). Migration/trigger gate re-executed on the sandbox: 50/50 PASS. Security negatives: 3 credential-bearing .env files excluded via .dockerignore (real-looking secret values; their repo presence is a standing risk, deploy lane must replicate Oracle's existing env wiring exactly, never guess).
- Image: ping-gateway:rc-4d522a6b, digest sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38, linux/arm64 (buildx on the Pig). Provenance labels verified: revision=4d522a6bd, source, created=2026-09-20T03:17:55Z.
- Staging proof (Pig sandbox, Oracle untouched): startup, readiness (/health healthy), real-boot migration against the live append-only trigger (sequence added, legacy NULLs kept), authenticated canonical write, dedup, mission path CREATED->ASSIGNED->STARTED, restart, post-restart read. Unauthenticated /events rejected; /health public. Qdrant absent by design (health degraded honestly).
- Still unproven: rollback drill, Oracle-plane migration deploy, mission COMPLETED path (no worker plane in sandbox), /health source_sha surface.
- Packet: releases/candidate-4d522a6b/CERTIFICATION-PACKET.md (+ release-certification.json, Dockerfile.candidate).
- Coordinator note: the rollback anchor 8400deecf2a9 lives on ORACLE, not the Pig (expected; the Pig docker images listing correctly shows no such ID). The deploy lane verifies it on Oracle via oracle-ssh.sh.
- Ladder: RELEASE_CERTIFIED claimed [PROVEN_CONTAINER] (8/8 closures + staging gates on the actual candidate image). ORACLE_DEPLOYED / ORACLE_RUNTIME_PROVEN / ORACLE_RESTART_PROVEN / ORACLE_ROLLBACK_PROVEN pending the deploy lane.
- Deploy decision: the candidate is CERTIFIED, so per the directive (DEPLOY IF CERTIFIED; Nolan's GO: get every proven improvement into Oracle) the deploy lane is dispatched. The .env secret provenance is the one fail-closed gate: the deploy lane replicates Oracle's existing env wiring exactly and stops BLOCKED (morning Grill) if any required value would need guessing.

## WAVE 8 DISPATCH (2026-09-19 ~21:27 MDT)
- Oracle deploy (MUTATION, Oracle plane): Phase 0 read-only — record exact Oracle state, verify rollback image 8400deecf2a9 present on Oracle, resolve env/secret wiring from existing Oracle configuration only (never guess; BLOCKED->Grill if unresolvable), establish the proven image-transfer path (Pig->Oracle). Phase 1 — minimum service swap of the gateway container to ping-gateway:rc-4d522a6b (Postgres untouched; service ordering honored). Phase 2 — prove on Oracle: readiness, migration idempotency, canonical write/read/dedup, mission path, restart + post-restart read, unauthenticated rejection. Phase 3 — rollback drill if the candidate is healthy (swap to 8400deecf2a9, prove, swap back, prove); real rollback + stop if any gate fails. Phase 4 — observe, verify the operational event path is not broken (401 vs 500 semantics on /events, gateway logs), record per DEPLOY LAW (source SHA, image digest, schema state, migration result, test manifest, rollback image). Report the full Oracle proof set.

## COLLISION ENFORCEMENT COMPLETE 2026-09-19 ~21:30 MDT

Commit 6e49d3c8b (verified on the exact plane: 3 files, +251/-4): "fix(event-authority): enforce Phase 12 collision law at the UER commit layer." Local only, no push.
- Revert forensics: ab0adbc20 was reverted by 114afad01 with no recorded justification; the imported module was not missing. Most likely tension: the then-current Phase 12 test treated same-logical-ID/different-payload as legitimate UER dedup. No evidence of production breakage. No Grill item: current sprint law explicitly resolves collision enforcement at the UER commit layer.
- Design: on ON CONFLICT DO NOTHING (rowCount 0), re-read the stored canonical row and compare canonical content via CanonicalAuthority through new pure module ping-runtime/events/commit_collision.js (67 lines; sequence/timestamp/envelope excluded from the comparison preimage, matching the UER identity contract). Equivalent content -> return existing event with deduplicated:true, zero handler/integration redispatch. Different content -> typed EVENT_IDENTITY_CONFLICT (status:'error'), safe observability (event_id + differing field names only), no overwrite, no dispatch. Hash/readback failure -> fail closed. Mock pools with no rows preserve legacy behavior exactly. No UPDATE/DELETE anywhere on the conflict path. Canonical-hash witness column rejected (new journal column + migration larger than the smallest unit).
- Tests: cert harness fail-before on unpatched HEAD 9 pass / 6 fail (violations demonstrated; correction: pre-fix returned {status:'ok'} with NO deduplicated flag); post-fix 15 pass / 0 fail. EVAL-001 4/4, EVAL-002 5/5, EVAL-003 5/5. sequence_replay_cert 64 pass / 6 fail / 1 blocked with IDENTICAL baseline on pristine code (pre-existing T1 legacy-migration-backfill failure, unrelated) -> recorded as FL-20260919-014 (OPEN, not this lane's scope). Lane F boot smoke: no MODULE_NOT_FOUND, bounded retry, NOT_READY fail-closed.
- Adjacent unsafe paths reported untouched (queued follow-ups): gateway/canonical_event_envelope.js:178, runtime/adapters/postgres_event_store.ts:91, mission_runtime.js mission ID ON CONFLICT.
- Watch item: CE-001 lane's WIP suite currently requires ping-runtime/orchestration/unified_event_runtime.js (nonexistent); their WIP, not a writer conflict yet. Coordinator monitoring.
- Ladder: EVENT_COLLISION_SAFE now [PROVEN_TEST].

## LANE 2 COMPLETE 2026-09-19 ~21:31 MDT (generator fanout + consolidation, Q1 decided)

Three commits, all verified on the exact plane, local only:
- 8d9c07233 feat(orchestration): repository-relative generator fanout, CWD-independence proven 15/15 (253+/68-)
- 766078cff refactor(orchestration): consolidate 58 JSON load sites into readJsonArtifact (187+/74-)
- e0bc51bb9 refactor(orchestration): consolidate 15 write sites into writeJsonArtifact (99+/40-)
- Per-generator: all 15 generators converted, none unconverted. CWD-independence 45/45 runs green across /, generator dir, /tmp. Consolidation A equivalence 30/30 (pre 8d9c07233 vs post, pristine inputs). Consolidation B 30/30 + raw byte diff identical modulo volatile generatedAt. SymbolRouter.json byte-identical pre/post on both consolidations: 55e2e03b54f6dd70 (32MB, 15,886 symbols). node --check 16/16 each phase; zero load/write-site stragglers.
- Artifact state: 4 generators MATCH tracked artifacts; 9 DRIFT from 2026-07-04 staleness (pre-existing); 2 (cross_reference_matrix, routing_cache) proven only against synthetic fixture (output deliberately untracked).
- Q1 DECIDED: the 9 DRIFT artifacts STAY FROZEN. Evidence: (1) regenerating is unnecessary for the portability invariant, proven without touching tracked bytes; (2) Linux regeneration is LOSSY, not healing: proven live, a Linux-regenerated DependencyGraph drives symbol_router to an EMPTY 501-byte SymbolRouter.json (0 symbols) vs the real 32MB artifact from tracked inputs, because generators read per-file content via stale Windows AbsolutePaths that fail silently on Linux; regenerating would destroy Windows-extracted content the tracked artifacts still carry; (3) the 13 orchestration JSONs have zero live consumers (only dead, Linux-unloadable ConstitutionalQueryAPI.js); (4) drift healing belongs in the queued follow-up lane. Reference SHAs in GENERATOR_CWD_PROOF.md remain the stable values; decision reversible by any future lane with a Windows-capable regeneration path.
- Failures recorded before narration: FL-20260919-LANE2-003 through -008.
- No GeneratorFramework, no new authority, path resolution remains owned by artifact_paths.js. Lane 2 writer ownership of ping-runtime/orchestration/* unchanged; uncommitted files there belong to other lanes.
- Ladder: GENERATOR_PORTABILITY [PROVEN_TEST]. REPOSITORY_WEIGHT_REDUCED stays pending (untracking pass still queued; now unblocked on the portability proof).

## CE-001 FIX COMPLETE 2026-09-19 ~21:33 MDT

Commits verified on the exact plane, local only:
- 7f47e2224 test(ce001): fail-before evidence (cases 1 and 5b vs unpatched code, both failed as required)
- c5c41b58c fix(ce001): deterministic MISSION_COMPLETED identity via logical_id (mission_runtime.js +87, mission_scheduler.js +10, suite 795 lines)
- Writer ownership respected: only mission_runtime.js, mission_scheduler.js, new test files; unified_event_runtime.js untouched.
- Implementation: MissionRuntime.complete() passes { logical_id: {kind:'mission-completion', mission_id} } on the MISSION_COMPLETED emit; duration_ms/completed_at stay in the payload as observation metadata only. reconcileLostCompletions(): startup reconciler for crash-after-accept, re-emits via UER keyed by deterministic identity (idempotent by construction; reconstructed payload byte-identical to the original emit shape, so a raced re-emission is canonical-equivalent under the collision gate). MissionScheduler.start() invokes it non-fatally before the first poll.
- Proof: tests/ce001-completion-identity/ce001_completion_identity.js, real MissionRuntime + real UER + real IdentityAuthority, in-memory mock pool. 7 cases, 45/45 checks pass: clock-independence, retry (fail->retry->complete-once), lease-expiry reclaim, restart duplicate delivery (dedup no-op), crash-after-accept a/b, reconciliation idempotency (incl. via scheduler.start()), no-over-collapsing. Adjacent evals EVAL-001/006/007/009 all exit 0. Composes with the collision lane's landed mechanism (uses it, never duplicates it).
- Coordinator judgment call (flagged by the lane): the reconciler calls identityAuthority.generateId('event', ...) to COMPUTE the deterministic event_id for its existence check (read path only; actual mint stays in UER.emit). Ruling: legitimate use of the authority, not a bypass. No new identity is created, IdentityAuthority remains the sole minter. No refactor required. Review point recorded.
- Ledger: FL-20260920-001 (put.sh missing dest dir; healed), FL-20260920-002 (31KB upload truncated at 27,000 bytes with no verification error; healed via re-upload + node --check; standing lesson: verify every put independently, keep working copies out of /tmp).
- Ladder: CE001_COMPLETION_IDENTITY [PROVEN_TEST].

## CROSS-LANE GAP: collision gate vs volatile metadata (fail-safe, queued refinement)

The CE-001 lane surfaced a real design tension: the landed collision gate compares whole-payload canonical content, so a retry re-emission differing ONLY in volatile clock metadata (duration_ms, completed_at) fails closed with EVENT_IDENTITY_CONFLICT. Current behavior is fail-safe (loud typed error, no corruption), but it contradicts the ratified CE-001 principle that clocks are observation metadata, not semantic content. A legitimate retry (crash after persist, ack lost) would surface a false collision instead of deduping. Resolution: a small refinement lane extends the comparison preimage exclusions (which already cover sequence/timestamp/envelope) to declared volatile payload metadata, with fail-before proof and a guarantee that genuine semantic divergence still fails closed. This is a principled application of already-ratified law, not a new constitutional question; no Grill item.

## WAVE 9 DISPATCH (2026-09-19 ~21:34 MDT)
- Collision gate volatile-metadata refinement (MUTATION, owns ping-runtime/events/commit_collision.js only): fail-before (same logical_id + metadata-only difference currently fails closed), implement declared volatile-metadata exclusion in the comparison preimage, prove genuine semantic divergence still fails closed (collision lane's adversarial cases stay green), re-run the collision cert harness (15/15) and CE-001's 7-case suite for composition proof. Commit explicitly, local only.

## OBSERVED, PENDING HANDOFF
- 3be6635ec fix(ui): honest status surfaces v2, UI CLAIM <= BACKEND PROOF (UI truth fix lane committed; handoff not yet received).

## UI TRUTH FIX COMPLETE 2026-09-19 ~21:34 MDT

Commits verified on the exact plane, local only:
- 6e7a4cb10 revert(system): restore in-scope boundary (reverts the out-of-scope 48a65bec6 system_authority semantics change; backend mission/knowledge semantics belong to the owning lane)
- 3be6635ec fix(ui): honest status surfaces v2, UI CLAIM <= BACKEND PROOF (6 files: 5 under ui-next/src, gateway/simple_server.js)
- Corrections: zero em dashes in added lines (numeric unknowns N/A, textual Unknown); /api/health is genuinely dynamic (force-dynamic + no-store; build confirms dynamic route); Mission Queue panel shows "unavailable" with reason instead of stale measured values; Knowledge Growth gated on backend status; Object Counts knowledge row Unknown when unavailable; 93 tracked .next build-residue files restored to HEAD; untracked tsconfig.tsbuildinfo deleted.
- Verification: tsc --noEmit clean; next build 7/7 pages; node --check on both gateway files; gateway boot smoke reached NOT_READY with bounded retry, /health 503 with honest unhealthy body; Lane N spot check: Math.random survives only in an explicitly decorative labeled element and removal-describing comments.
- Ledger: FL-20260919-012 (scope breach) and FL-20260919-013 (failed staging) recorded before narration, both HEALED. NUMBERING COLLISION: the lane also recorded its /tmp-wipe entry as FL-20260919-014, duplicating the collision lane's entry; coordinator disambiguated in the ledger (append-only note): FL-20260919-014 canonically = the sequence_replay T1 migration failure (OPEN); the /tmp-wipe entry is renumbered FL-20260919-017 (HEALED).
- Caveat: live browser binding NOT proven. Compose sets NEXT_PUBLIC_GATEWAY_URL=http://gateway:8080 (Docker-internal hostname); client-side probes honestly report UNKNOWN in a real browser. Server-side /api/health probe works via the compose network. Follow-up queued: switch client-side fetches to relative URLs through Next rewrites so the browser binding is real, or accept honest-UNKNOWN in browsers.
- Ladder: UI_TRUTH [PROVEN_TEST] for honesty (claim <= proof); UI_BROWSER_BINDING pending.

## WAVE 10 DISPATCH (2026-09-19 ~21:36 MDT)
- UI browser binding (MUTATION, owns ui-next client fetch paths only): route client-side gateway fetches through relative URLs via Next rewrites so a real browser resolves them (no Docker-internal hostnames in client code); prove with next build + a local headed fetch exercising the rewrite path; keep the honest-UNKNOWN fallbacks (UI CLAIM <= BACKEND PROOF still governs). Commit explicitly, local only.

## REPLAY CONVERGENCE COMPLETE 2026-09-19 ~21:37 MDT

Commit 1d18f9c95 verified on the exact plane (6 files, +1177/-103): "Replay convergence: consume the persisted canonical representation." Local only, no push.
- Fail-before: gateway/test_replay_fidelity_failbefore.js, 8 adversarial tests, ALL 8 FAILED on unpatched code (each demonstrating its named violation), all 8 pass post-fix: worker queries the persisted correlation group (never repackages the trigger); canonical event_* IDs survive the kernel verbatim (evt-ping- reminting deleted, not relocated); verdict records original canonical event types; verdict carries row-declared era with version provenance; unsupported row era fails closed (era_mismatch); maxEvents truncation yields INCOMPLETE, never silent; skipped malformed input cannot verify (incomplete_input_set); verdict binds engine version, witness algorithm/version, completeness, honest 64-hex sha256 input hash.
- Corrections: gateway/kernel_replay_execution_provider.js (no timestamp fabrication; provider machinery versions recorded as provider-declared with provenance; era gate fails closed on unsupported metadata.schema_version; identity-space uniformity gate fails closed on mixed windows; true in-window PING causation carried as kernel lineage; canonical_input_hash = sha256 of canonical JSON of consumed inputs in order; INCOMPLETE on any truncation/skip, W-2 harvest). ping-runtime/workers/canonical_workers.js ReplayWorker only (_buildReplayEvents loads the correlation group from ping_events with the Lane A contract ORDER BY sequence NULLS FIRST, timestamp ASC, event_id ASC; payload.replay_events now an explicitly labeled test-mode seam only; no-pool/empty/load-failure fail closed with typed reasons; verified requires provider-ok + zero violations + COMPLETE; canonical_input_hash replaces the replay_id misnomer). WitnessWorker untouched; witness/Merkle behavior unchanged. Mid-lane self-caught regression (confidence_source -> confidence_provenance trace carry) restored and locked with a test assertion.
- Positive proof: gateway/test_replay_persisted_e2e.js (9 tests): persisted 4-event correlation group incl. legacy NULL-sequence rows replays with every event_id preserved in Lane A order, namespace/semantic payload/metadata surviving, era with provenance, verdict hash matching independent computation, determinism across runs, WitnessWorker attesting the honest verdict from the canonical REPLAY_COMPLETED row.
- Adjacent: test_kernel_replay.js 24/24, test_replay_worker_wiring.js 17/17, EVAL-009/010 pass, test_gateway_composition_contract.js 5/5, boot smoke pass. trace_propagation TR-7/TR-8 pass.
- Pre-existing failures referenced (not caused by this lane, out of scope): FL-20260919-015 (test_kernel_pipeline.js crashes in UER initialize sequence migration, reproduced identically on pristine HEAD), FL-20260919-016 (test_replay_composition RC-2 stale require path). Both already had single ledger entries; the lane referenced them, no duplicates created.
- Design caveat: rows with absent schema_version ('unknown' era, predating era stamping) replay with the era explicitly labeled rather than failing closed; only declared-but-unsupported eras fail closed. Keeps the entire pre-existing journal replayable.
- Ladder: REPLAY_FIDELITY_PROVEN [PROVEN_TEST].

## COLLISION-GATE VOLATILE-METADATA REFINEMENT COMPLETE 2026-09-19 ~21:38 MDT

Commit 5bf8f643c verified on the exact plane (2 files, +299/-4): "fix(events): dedup volatile clock metadata in collision comparison preimage." Local only, no push.
- Fail-before: new tests/event-collision-law/volatile_metadata_dedup.js (real UER + faithful in-memory ping_events mock with ON CONFLICT DO NOTHING + jsonb round trip). On unpatched code: the gap scenario proven, same logical_id re-emission differing only in duration_ms (111 vs 222) and nested result.completed_at returned EVENT_IDENTITY_CONFLICT with differing-fields observability [payload]; 5 volatile-equivalence assertions failed as required.
- Fix (commit_collision.js only): declared VOLATILE_PAYLOAD_METADATA_FIELDS = ['duration_ms', 'completed_at'], pure stripVolatileMetadata() deep-strip applied to payload and metadata on both sides inside normalizeForCollisionCheck. Field choice keyed to what the codebase itself designates as observation metadata (duration_ms computed in complete() as Date.now() - started_at; completed_at stamped via constitutionalTimeAuthority). Exported set + strip function, additive; unified_event_runtime.js and CE-001 files untouched. No I/O, no authority decisions, no framework. Extending the set is noted as a constitutional decision for a lane of its own.
- Post-fix: own suite 25/25 (volatile-only retry -> ok + deduplicated:true, same eventId/sequence, one row, single dispatch; unit level volatile-only diffs hash equal, zero differing fields). Genuine divergence unchanged: different mission under same logical_id and same mission with different result.out both still fail closed with EVENT_IDENTITY_CONFLICT, no overwrite, no dispatch. Byte-identical redelivery still dedups. CE-001 suite 45/45; its case-1 informational line flipped from status=error code=EVENT_IDENTITY_CONFLICT to status=ok, exactly the coordinated gap. Lane F boot smoke pass.
- Proof-limitation honestly reported by the lane: the real-PG collision cert harness re-run is BLOCKED (PGPASSWORD redacted in transit, not documented in the repo, retrieval not authorized per credential rules); the lane does not claim 15/15 post-refinement. Coverage rests on the faithful mock-pool suite + CE-001 45/45 composition. The real-PG re-cert remains an open proof item if a future lane needs it (password question goes to Nolan).
- Coordinator follow-up: fixed the stale CE-001 suite header comment the lane flagged (it still described the gate as stricter than the coordinated design). One-line doc edit, explicit staging, committed as 10f080764 docs(ce001). Other lanes' WIP untouched.
- Ladder: EVENT_COLLISION_SAFE remains [PROVEN_TEST] (refined, not weakened: genuine-divergence fail-closed proven unchanged).

## UI BROWSER BINDING COMPLETE 2026-09-19 ~21:39 MDT

Commit ae3349b46 verified on the exact plane (8 files, 41+/8-, intact under HEAD): "fix(ui): route browser gateway fetches through relative /gateway/* rewrite." Local only, no push.
- Fetch inventory: all 8 client-side fetch sites found; every caller is a 'use client' component, so all ran in the browser against the unresolvable Docker hostname (useGatewayHealth.ts, gateway.ts, CockpitDashboard, DecisionEngine, ConstitutionalMixer, chat/page.tsx, command-center/page.tsx; the server-side /api/health route unchanged).
- Rewrite design: next.config.js rewrites() maps /gateway/:path* to the gateway URL resolved server-side at startup (compose DNS works there); the Docker hostname never enters client bundles. All 7 client files now use relative /gateway/... paths. No client code references NEXT_PUBLIC_GATEWAY_URL anymore. Honesty preserved byte-for-byte: 401 handler, fire-and-forget POSTs, unknown initial states, unknown-on-failure paths all untouched. UI CLAIM <= BACKEND PROOF still governs.
- Proof: tsc --noEmit clean; node --check next.config.js OK; next build green (5 routes); exercised rewrite path on the built app (GATEWAY_URL=http://localhost:8080): GET /gateway/health -> real gateway body HTTP 200 (status healthy, real uptime/components); POST /gateway/api/v1/decision/weights faithfully relayed the gateway's own 404 (endpoint absent on the convergence gateway; client swallows as before; no fabrication); /command-center 200. Bundle scan: 0 occurrences of gateway:8080 in any production bundle; /gateway prefix confirmed in 3 client chunks. Build residue restored to HEAD; commit contains only the 8 source files.
- Still unproven, stated plainly: live browser end-to-end render (subagents cannot run a live browser).
- Coordinator hygiene fix: the broad `lib/` gitignore rule (Python template line 16) that forced `git add -f` on tracked src/lib files for two lanes is narrowed to `/lib/` (repo-root anchor; original intent preserved). Verified no nested lib/ content newly surfaces. Committed as 2ffe39231 chore(gitignore). No new ledger entry (condition already recorded under FL-20260919-012/013).
- Queued infra follow-up (not this lane): rename NEXT_PUBLIC_GATEWAY_URL to GATEWAY_URL in compose.yaml; it now only feeds server-side resolution. Compose is infra-owned; queued for the deploy/infra lane.
- Ladder: UI_BROWSER_BINDING [PROVEN_TEST] for the rewrite path; live-browser render remains the honest unproven tail.

## ORACLE DEPLOY COMPLETE 2026-09-19 ~21:40 MDT (MILESTONE)

Deploy lane verdict: DEPLOYED AND PROVEN, all Phase 0/1/2/3/4 gates passed, no rollback for cause. Coordinator independently verified on Oracle via oracle-ssh.sh (-s mode; the bare-arg form fails on a Windows path error, the documented -s stdin form works).
- Coordinator verification: ping-gateway running image sha256:fb6f3069d642f (the certified candidate digest); ping-postgres and ping-qdrant Up healthy, untouched; rollback anchor 8400deecf2a9 present (3 refs); /health healthy; unauthenticated POST /events -> 401 (fail-closed, no 500).
- Phase 0: exact Oracle baseline recorded (releases/candidate-4d522a6b/ORACLE-PRE-DEPLOY-BASELINE.md); env wiring resolved exactly (14 container env keys, no env_file, compose interpolation; replicated verbatim, nothing guessed, secrets never printed); image transfer via docker save -> ssh pipe -> docker load, digest verified ON Oracle before the swap (no registry precedent existed; minimal path established); rollback anchor confirmed present.
- Phase 1: gateway-only swap, Postgres untouched throughout, pre-swap ref recorded, new container digest-pinned, clean start, no crash loop.
- Phase 2: /health healthy (all 10 checks incl. startup and postgres_readiness); migration idempotent (sequence BIGINT NULLABLE nextval; 2510 rows, 41 sequenced / 2469 legacy NULL, exactly matching pre-deploy, legacy untouched, zero STARTUP_BLOCKED); auth fail-closed (401s on /events, /mc, /tenants; /health public; no 500s; Bearer key never extracted); mission path (bridge listening on 28 types, scheduler polling, workers registered); restart proven (post-restart healthy, data intact). Authenticated write/dedup and MISSION_COMPLETED success path rest on the staging proof (no worker plane / no key on the deploy lane's boundary, declared honestly).
- Phase 3: rollback drill, zero anomalies. Rollback to 8400deecf2a9 -> /health healthy; forward to candidate -> /health healthy, 0 STARTUP_BLOCKED, /events 401.
- Phase 4: clean boot logs ("gateway READY"), no error storms, no unhealthy flaps; Postgres and Qdrant healthy and untouched.
- DEPLOY LAW record: source SHA 4d522a6bd823e980bb97b76f95caeb2252a9c5d2; image ping-gateway:rc-4d522a6b digest sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38; schema/migration/test-manifest/rollback as above. Written to releases/candidate-4d522a6b/ORACLE-DEPLOY-RECORD.md (sha256-verified).
- Non-blocking notes: CompilerCompatibility FAIL 11 mismatches at boot (known parked-generator drift, warning only); Orca engine EACCES warning (non-fatal); /health has no source_sha build-info surface (packet section 7 follow-up, deploy-lane work for a future cycle).
- Final Oracle state: ping-gateway Up healthy on the candidate (source 4d522a6bd); ping-postgres, ping-qdrant Up healthy, untouched.
- Ladder: ORACLE_DEPLOYED [PROVEN_ORACLE_RUNTIME]; ORACLE_RUNTIME_PROVEN [PROVEN_ORACLE_RUNTIME]; ORACLE_RESTART_PROVEN [PROVEN_ORACLE_RUNTIME]; ORACLE_ROLLBACK_PROVEN [PROVEN_ORACLE_RUNTIME].
- Note: the branch has since moved past the deployed SHA (collision fix, CE-001, UI, replay, refinement, docs, gitignore). Per the release doctrine a release is a certified closure of a specific revision; the deployed revision is certified and proven. The next release cycle certifies a newer SHA later in the sprint.

## WAVE 11 DISPATCH (2026-09-19 ~21:43 MDT, four parallel lanes, disjoint file sets)
- Event-authority demotion (MUTATION): CanonicalEventEnvelope -> ingress/envelope producer (remove independent UUIDv5 identity, MAX+1 ordering, unconditional acceptance); EventRepository -> projection/adapter with a fail-closed code gate requiring proof of an already-accepted canonical event. Evidence-led: read-only forensics first (which paths are live), smallest patch, targeted tests, preserve mechanisms and historical stores, delete nothing merely because authority is settled. Owns gateway/canonical_event_envelope.js and the EventRepository module (lane locates it); does not touch UER commit layer, witness, or replay.
- CE-002 attempt fencing (MUTATION): a stale worker may complete after lease reassignment because attempt fencing is absent. Implement attempt/lease tokens: completion must present the current attempt token, stale attempts fail closed. Fail-before, smallest unit, targeted tests, commit explicitly. Owns mission lease/attempt logic (coordinates with CE-001's committed files; CE-001 lane is done, no active writer).
- Lane 3 untracking pass (MUTATION, git index only): untrack only artifacts with zero live consumers per evidence/index-dag-2026-09-19.md AND proven byte-stable regeneration on this machine. git rm --cached (working tree and history preserved). Given Lane 2's lossy-Linux finding, many candidates will not qualify; report exactly what qualified and what did not, with per-artifact evidence. Commit explicitly. Does not touch the 5 runtime-required gateway/generated JSONs.
- Gateway/generated drift heal (MUTATION): the 5 runtime-required gateway/generated/*.json files drift from their generators. Proven-regeneration lane: determine whether the gateway generators run correctly on Linux (fail-before: regenerate and diff); if lossy like the orchestration generators, report BLOCKED with evidence instead of writing lossy bytes into runtime-required files. Owns gateway/generated/*.json outputs only.

## GATEWAY/GENERATED DRIFT HEAL COMPLETE 2026-09-19 ~21:43 MDT

Commit 8d492338a verified on the exact plane (2 files, 103+/103-): "fix(gateway): regenerate event and workflow registries with Linux-native source paths." Local only, no push. No generator sources touched.
- Per-file: capability_registry.json NO_DRIFT (byte-identical modulo generated_at, 45/45 caps, hash aec84eaf7bf2 matches); deployment_manifest.json NO_DRIFT (hash 3f9bd7a3bdd1 matches); event_registry.json HEALED (233/233 events identical except source_file Windows backslashes -> Linux forward slashes, 61 events affected; stale-but-reproducible); state_machine_registry.json NO_DRIFT (21/21, hash ff1285809784 matches); workflow_registry.json HEALED (20/20 identical except separators; per-workflow hashes correctly recomputed).
- Key contrast with Lane 2: the gateway generators are NOT lossy on Linux. All 5 ran cleanly with healthy counts; no silently-empty output. The only platform artifact was path separators in provenance metadata.
- Proof: real GeneratedArtifactLoader (boot path) PASS, valid=true, all 5 artifacts, on both pre- and post-commit bytes. Boot smoke: zero MODULE_NOT_FOUND, loader PASS, NOT_READY with bounded retry. Semantic check: no runtime consumer parses registries' source_file as a filesystem path; no consumer reads per-element hashes; loader top-level hash check passes on new bytes.
- Queued follow-up 1 (checker defects, FAIL 11 fully decomposed, zero content drift): proven by running the actual CompilerCompatibility.verify() as integrations.js calls it: 1 error from `new CompilerCompatibility()` instantiated with no compiler version (integrations.js:42; manifest 1.0.0 != runtime undefined); 5 generator_version links (undefined != undefined); 5 hash mismatches because Link 3 recomputes the hash INCLUDING generated_at while every generator and the loader exclude it. Fix belongs to integrations.js / compiler_compatibility.js owners.
- Queued follow-up 2 (generator integrity defect, all 5 generators): `_computeHash` uses JSON.stringify(stable, Object.keys(stable).sort()); the array replacer whitelists keys at EVERY nesting level, silently dropping nested content (event types, payload schemas, source_file) from the hash preimage. The top-level hash is nearly content-free and cannot detect the drift this lane just healed. Fix belongs to the generator-source owner; recommend canonical serialization.

## WAVE 12 DISPATCH (2026-09-19 ~21:44 MDT, two small lanes)
- CompilerCompatibility checker fix (MUTATION): fix the three decomposed defects: pass the compiler version at the integrations.js:42 instantiation; resolve the 5 generator_version undefined links; exclude generated_at from Link 3's hash recomputation (matching the generator and loader contract). Prove by running the actual verify() exactly as integrations.js calls it: 0 errors. Boot smoke. Owns integrations.js checker wiring and compiler_compatibility.js only.
- Generator _computeHash fix (MUTATION): replace the whitelist-replacer hash with a canonical serialization that includes nested content, in all 5 gateway generators; regenerate all 5 gateway/generated/*.json files with the fixed generators; prove the loader's top-level hash check passes and boot smoke is green. Fail-before: demonstrate the current hash is content-free (two semantically different payloads hashing equal). Owns the 5 gateway generator sources + the 5 outputs only.

## LANE 3 UNTRACKING PASS COMPLETE 2026-09-19 ~21:45 MDT

Commit 45826bdcb verified on the exact plane (7 files, 799,226 deletions): "chore(artifacts): untrack 7 byte-regenerable orchestration JSONs." Local only, no push. 35,772,708 bytes (~34.1 MB) removed from the tracked tree. No file content edited; no source, tests, or gateway/generated files touched.
- Qualification was conjunctive (zero live consumers re-verified at current HEAD + byte-stable regeneration in fresh sandboxes + replaceable). Per-artifact table:
  - QUALIFIED and untracked: UUIDRegistry (18.3MB, regen e4163e0e4fae8050 == tracked), CapabilityRegistry (8.3MB, 5e68474c17d26bec == tracked), ContextPackets (5.4MB, b5c76ee313c7bad8 == tracked), LawRouter (2.6MB, d96b486bb57a6628 == tracked), ExecutionRouter (445KB, 4571f4c7ec4b2af8 == tracked), ArchitectureManifest (424KB, e4317e17e44afb95 == tracked), AuthorityResolver (319KB, 567371149778856a == tracked).
  - DISQUALIFIED with evidence: RoutingIndex (17.6MB; regen deterministic 3/3 but != tracked), RoutingCache (17.1MB; real-input regen impossible, SymbolRouter untracked), RepositoryConstitutionManifest (2.6MB; DRIFT confirmed), DependencyGraph/ExecutionGraphs/HygieneReport (Linux-lossy via stale Windows paths), knowledge_report.json (determinism UNKNOWN, unaudited producer).
  - EXCLUDED: Filesystem.json (14MB, no in-tree producer), 4 historical txt dumps (16.5MB, no producer), 5 gateway/generated JSONs (runtime-required, drift-heal lane's).
- Post-untracking: git ls-files no longer lists the 7; working-tree bytes verified identical; boot smoke PASS (zero MODULE_NOT_FOUND, NOT_READY with bounded retry); all 7 generators remain tracked with tracked inputs, so a fresh clone regenerates them.
- Coordinator completion: the 7 files added to .gitignore (repo-root anchored) so they don't re-enter as untracked noise; committed as 38f0be40f. Verified they no longer appear in status.
- Observation for the record: Lane 2's GENERATOR_CWD_PROOF.md recorded 3 of these artifacts (uuid_registry, law_router, execution_router) as DRIFT vs tracked, but this lane's independent fresh-sandbox runs at current HEAD produce SHAs byte-identical to tracked. Possible causes: shared-sandbox cascading drift in Lane 2's proof, or consolidation behavior beyond the 30/30 claims. The untracking verdicts rest on independent current-HEAD proofs. Queued as low-priority proof-hygiene: re-examine the CWD-proof "vs tracked" column.
- The lane's HEAD-move abort guard worked as designed (drift-heal commit landed mid-pass; delta verified disjoint before committing).
- Ladder: REPOSITORY_WEIGHT_REDUCED in progress, 34.1 MB proven (full rung awaits the remaining candidates only if they ever qualify; most are disqualified on evidence).

## GENERATOR _COMPUTEHASH FIX COMPLETE 2026-09-19 ~21:49 MDT

Commit 038285a7e verified on the exact plane (12 files, +81/-26): "fix(gateway): content-complete canonical hash for generated artifacts." Local only, no push.
- Fail-before: on unpatched code, two 2-event payloads with completely different nested content (event types, authorities, payload schemas, source files) hashed EQUAL (38f671b6...); same for workflows (891ceefe...); per-element hashes also collided. Different-length payloads hashed different, proving the old hash carried essentially only element count. This is why it could not detect the drift the heal lane fixed.
- Fix: new shared module gateway/generated/canonical_serialize.js (canonicalStringify sorts object keys in UTF-16 code-unit order at every depth, mirroring JSON.stringify value semantics exactly: toJSON honored, undefined/function/symbol dropped in objects and null in arrays, non-finite numbers to null, BigInt throws fail-loud; canonicalHash = sha256 over the canonical string). Applied identically in all 5 generators' _computeHash plus _computeCapabilityHash/_computeWorkflowHash. Exclusion contracts unchanged (generated_at, hash, count, model_mappings stay out); hash field names unchanged. 11 serializer self-tests pass.
- Disclosed boundary cross (accepted by coordinator): generated_artifact_loader.js _validateHash contained the identical defective formula and recomputes the hash on the boot path; leaving it would have made the loader reject the fixed output. The lane changed only the serialization call to the shared canonicalHash; exclusion set, field names, and comparison logic untouched. Documented in the commit message.
- Regeneration: all 5 gateway/generated/*.json via the generators' write() paths. Counts unchanged (45/233/21/20). Semantic diff with hash/generated_at stripped: byte-identical per file; only top-level hashes changed (new: capability bfecf46240d18668, deployment 1d1a6c1cbbbc49f1, event e2ab82407fec2eca, state_machine d08af5bd0dfa60e9, workflow 0fe8fb9267dfa078). Per-element hashes unchanged (flat at hash time; old and new serializers agree byte-for-byte there, confirming strict generalization).
- Proofs: real GeneratedArtifactLoader.loadAll on new bytes valid=true, 5/5 PASS. Boot smoke green. Post-fix: nested-different payloads hash different in all 5 generators; identical payloads and key insertion order hash equal; generated_at still excluded. Checker path not regressed (same 11 errors, same decomposition as pre-fix).
- Coordination sent to the checker-fix lane (still running): its Link 3 fix corrects the exclusion set but still uses the old defective serialization; it needs one more line, use canonicalHash(stable) from canonical_serialize.js in Link 3's recomputation, to clear the 5 hash mismatches.
- Minor note: the lane reported the ledger tail highest as FL-20260919-014; the actual highest is FL-20260919-017 / FL-20260920-002. No new entries were needed, so no harm; the standing lesson (check the tail) is restated here.

## COMPILERCOMPATIBILITY CHECKER FIX COMPLETE 2026-09-19 ~21:50 MDT

Commit 702640675 verified on the exact plane (2 files, 9+/7-): "fix(gateway): CompilerCompatibility checker defects, FAIL 11 decomposed to zero." Local only, no push. No generator sources or JSON outputs touched.
- Reproduction: the actual verify() as integrations.js calls it failed with exactly the 11 mismatches as decomposed (1 Link-1, 5 Link-2, 5 Link-3); zero content drift (loader passed on the same bytes).
- Diff: integrations.js:42 now passes manifestLoader.getCompilerVersion() (real 1.0.0); Link 2 reads artifact.generator_version (was the nonexistent artifact.compiler_version), with explicit 'unknown' fallback, nothing fabricated; Link 3's preimage now mirrors the loader contract exactly (excludes generated_at, hash, count, model_mappings; empirically proven that excluding only generated_at still mismatches) and serializes with canonicalHash(stable) from ./canonical_serialize (following the _computeHash lane's landed contract per coordinator note); dead computeArtifactHash require removed.
- Proofs: same verify() call now reports PASS, 11 links verified, all match compiler 1.0.0, valid=true, 0 errors. Negative control: bogus compiler 9.9.9 still FAILs with real version strings (checker not neutered). Boot smoke: PASS line in boot log, no compatibility warning, NOT_READY with bounded retry.
- Note: two transient smoke attempts collided with a concurrent lane mid-write on mission files (self-resolved on retry; not a product defect, not ledgered).
- Observed: CE-002 has committed e02960f0f "fix(ce002): attempt/lease fencing for mission completion"; its handoff is pending.

## CE-002 ATTEMPT FENCING COMPLETE 2026-09-19 ~21:51 MDT

Commits verified on the exact plane, local only: 55c6b3ab5 (fail-before evidence) and e02960f0f (4 files, 179+/32-): "fix(ce002): attempt/lease fencing for mission completion."
- Design: additive `attempts INTEGER NOT NULL DEFAULT 1` on ping_missions (CREATE TABLE plus ALTER TABLE IF NOT EXISTS; no destructive migration). assign() atomically bumps attempts in its existing conditional UPDATE; the bumped value is the fencing token for that lease grant (renewal does not bump). New getFencingToken(missionId) reads the current token. complete(missionId, result, fencingToken) requires attempts = token in the conditional UPDATE; missing/invalid/mismatched tokens fail closed with typed STALE_ATTEMPT before any write; row untouched; nothing emitted. Non-running missions stay a legacy no-op. Accepted completions name the producing attempt in payload.attempt (attribution only; the CE-001 deterministic identity is attempt-blind by design and unchanged).
- Reconciler decision (explicit, accepted): reconcileLostCompletions() is the privileged recovery path, not an attempt. It presents no token, transitions no state, re-emits with the row's own attempts value (provably equal to the attempt complete() wrote; attempts cannot change after completion). Forcing a token there would require the reconciler to claim a lease, a new authority action for zero additional safety.
- Scheduler: _dispatch reads the token after its winning claim/start and presents it to complete(); rejected completions are warned, not counted.
- Proof: fail-before on unpatched HEAD 18 pass / 27 fail (worker's stale completion after lease reassignment was ACCEPTED as the canonical completion, wrong result won the row and the journal, indistinguishable from legitimate). Post-fix: CE-002 46/46, CE-001 45/45 preserved. Adjacent evals 8/9 (EVAL-001/002/003/004/005/007/008/009); EVAL-006 fails 3 checks because its harness calls complete() tokenless and its file is another lane's dirty WIP (left untouched) -> ledgered as FL-20260920-003 (OPEN, routed to the EVAL-006 lane). volatile_metadata_dedup 25/25. Boot smoke OK.
- In-lane decision accepted by coordinator: the CE-001 suite's 10 call sites were updated to present getFencingToken() (call contract only; no assertions changed). The CE-001 suite is this CE family's own foundation from the same sprint; leaving it tokenless would fail it against the new fenced contract. The adaptation is isolated in the same commit.
- Ladder: CE002_ATTEMPT_FENCED [PROVEN_TEST].

## EVENT-AUTHORITY DEMOTION COMPLETE 2026-09-19 ~21:53 MDT

Commit 56d3d7912 verified on the exact plane (8 files, +1694/-101): "fix(event-authority): demote envelope to ingress producer and gate EventRepository writes on prior canonical acceptance." Local only, no push. Unrelated WIP verified byte-preserved.
- Live-path forensics reverified at HEAD 702640675 before mutation: envelope's UUIDv5/getNextSequence/unconditional-emit all live (callers: POST /canonical-events, 4 business authorities, google business_profile, boot-wired via core_event_spine.js:37); EventRepository.appendEvent() plain INSERT with no ping_events check (callers: GatewayToKernelAdapter on boot path, capability_scheduler x4, agent_memory_authority x5, distributed_desktop_agents x5, all minting evt_-style IDs).
- UER ratification note: direct UER delegation is impossible without forging legacy capability (business event types absent from event_registry.json -> UNKNOWN_EVENT_TYPE fail-closed; envelope holds no capability -> GOVERNANCE_VIOLATION fail-closed). The demotion path (ingress receipt producer + existing adapter convergence) is the minimal truthful one.
- CanonicalEventEnvelope rewritten: executeEmitEvent() now writes an ingress RECEIPT (UUIDv4 receipt id, explicitly not a canonical identity; accepted:false; ingress marker metadata with acceptance pending and accepted_by unified_event_runtime). MAX+1 demoted to ingress-local receipt serial (getNextSequence kept as deprecated alias; DB UNIQUE(tenant_id, sequence) preserved as bookkeeping, not canonical order). Receipt-order race: 3 retries, then typed INGRESS_RECEIPT_CONFLICT (never silent drop). generateEventId() kept as deprecated historical helper (no emit-path callers). Honest contract: role ingress_envelope_producer, determinism non-deterministic, receipt id is not a canonical identity, ordering belongs to the UER. Preserved: query/stats/unprocessed/mark processed/failed/health/validation/historical schema; the adapter's WHERE processed IS DISTINCT FROM TRUE poll converges receipts as before.
- EventRepository: appendEvent() resolves claimed canonical id (options.canonicalEventId > event.canonical_event_id > event.correlation_id; raw evt_* event_id intentionally NOT a carrier) and verifies against ping_events before insert, via options.client || this.pool. Missing/non-matching claim, missing client, or unverifiable lookup -> UnanchoredCanonicalWriteError (EVENT_REPOSITORY_UNANCHORED_WRITE, exported, non-retryable); no insert after a failed gate; infrastructure failure never treated as acceptance. Historical rows/tables/hash-chain/reads unchanged; no destructive migration; no ID rewrites.
- Tests: fail-before envelope 3/7, repo 2/5 (each demonstrating its violation); post-fix 7/7 and 5/5; p001_p005 27/27; constitutional_validation 63/64 (1 skipped); time_authority 5/5; MC-1 assertions syntax OK. Boot smoke: 0 MODULE_NOT_FOUND, bounded NOT_READY, deterministic STARTUP_BLOCKED [AUTHENTICATION_FAILURE] (smoke-env credentials, no hang).
- CONSEQUENCE (intended, loud, queued): the known appendEvent callers now fail closed loudly until adapted (routed to owning lanes). Oracle is UNAFFECTED until the next release cycle (deployed SHA 4d522a6bd predates the demotion). The next release candidate must include the caller adaptations or the kernel adapter boot path fails closed. A dedicated caller-adaptation lane is now active; its hard rule: never forge anchoring, report deliberately unanchored callers with routing.
- Blocked-not-failures: test_sec003_005_auth cannot run on the Pig (no node_modules in worktree; pre-existing); MC-1 live run needs the PG admin password (credential boundary; assertions syntax-verified, live run routed to harness owner).
- Ladder: EVENT_AUTHORITY_DEMOTION [PROVEN_TEST] for the mechanism; EVENT_AUTHORITY_CALLERS_ADAPTED pending the active lane.

## EVENTREPOSITORY CALLER ADAPTATION COMPLETE 2026-09-19 ~21:58 MDT

Commit 9597208d7 verified on the exact plane (7 files, 311+/3-): "fix(caller-adaptation): wire canonical proof through pipeline repository write; mark 14 dead-caller sites deliberately unanchored." Local only, no push. Other lanes' dirty WIP verified untouched.
- GatewayToKernelAdapter execute(): adapted to forward request.canonical_event_id as options.canonicalEventId to appendEvent. With proof the derived write succeeds; without proof the gate still fails closed loudly. No new authorities, no identity minting, gate untouched. Narrower-than-feared consequence: executeEvent currently has no live callers (boot-wired for initialize() only) and boot performs no writes.
- 14 sites DELIBERATELY UNANCHORED (left failing closed by design, per the hard rule): capability_scheduler x4, agent_memory_authority x5, distributed_desktop_agents x5. Evidence: all three modules are dead at runtime (singleton getters never called anywhere, required by nothing live). Their correlation_ids are local ids that never resolve to ping_events rows; adapting would require forging canonical acceptance (registering legacy types with the UER, explicitly ruled out as forgery) or inventing resolving correlation ids. Each file carries an in-file DELIBERATELY UNANCHORED header note routing the owning-lane decision: either UER-accept these lifecycle types as real canonical event types (an authority decision) or move them to an operational store outside the canonical journal.
- Tests: fail-before on unpatched HEAD pinned each loud failure exactly as designed; post-fix test_caller_adaptation 4/4, adapter boot smoke 1/1 (boot completes, no gate error). Adjacent: gate 5/5, demotion 7/7, p001_p005 27/27, constitutional_validation 63/64.
- New ledger entry FL-20260920-004 (OPEN): pre-existing defect newly observed (product code deliberately untouched, out of lane scope): runtimeIdentityAuthority.initialize() throws CANONICALIZATION_ERROR on Node 22 because the fingerprint hashes process.versions.http_parser (undefined since Node 20); plus a latent Buffer serialize guard in the witness path. Nothing live calls it at boot (no live breakage today). Routed to the owning lane.
- Ladder: EVENT_AUTHORITY_CALLERS_ADAPTED [PROVEN_TEST] for the live path; 14 dead sites recorded as DELIBERATELY UNANCHORED pending owning-lane decisions.

## GO CYCLE 2026-09-20 ~08:50 MDT (Nolan directive: continuous convergence, certify post-demotion SHA, Oracle if proven)

BASELINE RECORDED (coordinator, independent):
- pwd: /home/nolan/worktrees/constitutional-convergence (Pig WSL)
- repository: https://github.com/ngesk2/crx-runtime.git
- branch: constitutional-convergence-v2
- mechanism base: 9597208d74a4aeffe9c038055d7c90c7e0dde034 (EventRepository adaptation + 14 unanchored dead callers)
- sprint-wrap commit: f6d5bcfe2125e5b382e95df71050652134c9c285 (docs/evidence only; mechanism files byte-identical to 9597208d7 — verify lane to confirm)
- candidate SHA for certification: f6d5bcfe2 (+ lane fixes to be merged)
- commits since last certified Oracle source 099927152b: 75 (099927152b is ancestor of candidate)
- rollback image preserved on Oracle: 8400deecf2a9 (3 refs: certified-20260919, latest, rollback-20260919; full digest sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5)
- Oracle current running state (independently verified 2026-09-20 08:55 MDT): ping-gateway on ping-gateway:rc-4d522a6b (sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38), Up 11h healthy; /health healthy; ping-postgres 17-alpine healthy; ping-qdrant v1.7.0 healthy. This is the pre-swap baseline for the new cycle.
- Worktree hygiene: capability_registry.json timestamp churn reverted; releases/candidate-4d522a6b left untracked (stale, not committed); EVAL-006 fix left uncommitted for Lane 003 to evaluate.

LANES DISPATCHED (parallel, disjoint write sets):
- Lane V: read-only verification of overnight claims on exact candidate plane.
- Lane 003: reproduce FL-20260920-003 before mutation, fix smallest incorrect layer, own the EVAL-006 file.
- Lane 004: reproduce FL-20260920-004 on Node 22.23.2, determine constitutional intent, classify LIVE_BLOCKER/RELEASE_BLOCKER/DORMANT_DEFECT/UNKNOWN.
- Lane D: classify 14 dead caller sites + complete reachability proof, own evidence/dead-caller-classification-2026-09-20.md.

QUEUED after lane results: Oracle 12-blocker recheck lane, generator portability lane, post-demotion certification lane, release manifest, Oracle deploy lane (gate order per Nolan's GO).

## GO CYCLE UPDATE 2026-09-20 ~08:58 MDT
- FL-20260920-003: HEALED (14ce2e3f0, EVAL-006 10/10, harness 91/0).
- FL-20260920-004: HEALED, classified DORMANT_DEFECT (a9cad2663, http_parser -> llhttp era rule; 13/13 on Node 22 + Node 20; zero call sites of initialize(); does NOT block Oracle).
- Lane D: 14 dead callers all PRESERVED_INACTIVE, no release-blocking reachability (10d152442).
- Lane V report lost in delivery; re-dispatched as Lane V2 (read-only verification redo).
- Candidate SHA advanced to a9cad2663 (stack: f6d5bcfe2 -> 14ce2e3f0 -> 10d152442 -> a9cad2663).
- Dispatched: Lane E (12 Oracle blockers recheck on a9cad2663, read-only), Lane G (generator portability re-examine, read-only unless a small safe port remains).
- Queued: Lane F (post-demotion certification ladder + release manifest), then Oracle deploy lane (only if every gate passes).

## GO CYCLE UPDATE 2026-09-20 ~08:58 MDT — LANE V2 VERIFICATION COMPLETE
Overnight claims verified on exact candidate plane (mechanism files byte-identical 9597208d7 -> 10d152442; FL-004 files orthogonal):
- Claim 0 mechanism byte-identity: VERIFIED.
- Claim 1 canonical event ID via adapter: VERIFIED (name correction: method is executeEvent, not execute; canonical ID flows via appendOptions.canonicalEventId).
- Claim 2 missing proof fails loudly: VERIFIED live (UnanchoredCanonicalWriteError, code EVENT_REPOSITORY_UNANCHORED_WRITE, retryable=false; harnesses 5/5 + 4/4 + 1/1).
- Claim 3 no live callers of adapted route: VERIFIED (zero callers at all; adapter LIVE-constructed at boot but route DORMANT).
- Claim 4 "boot performs no writes": REFUTED AS STATED, qualified version verified. Fresh-DB boot seeds 18 canonical events into ping_events via the AUTHORIZED UER path (gateway_runtime.js:212-217, only when ping_events is empty). Steady-state boot on non-empty ping_events performs no event writes. No Oracle impact (Oracle has 2510 rows; seed skips).
- Claim 5 14 dead sites fail closed: VERIFIED (typed rejection before any INSERT; un-awaited fire-and-forget surfaces as unhandled rejection -> [FATAL] log; modules unreachable/unloadable).
Running: Lane E (12 blockers), Lane G (generators). Queued: Lane F certification, release manifest, Oracle deploy lane.

## GO CYCLE UPDATE 2026-09-20 ~09:03 MDT — LANE E: ALL 12 ORACLE BLOCKERS CLOSED
Candidate a9cad2663, read-only recheck, scratch PG fixture, all scratch resources removed, worktree left clean:
1. runtime source closure CLOSED (PROVEN_TEST: 172 modules, 171 REQUIRED_RUNTIME + 1 LEGACY_REQUIRED, 0 defects)
2. legacy_ingress_adapter included CLOSED (LEGACY_REQUIRED, live require in core_event_spine.js:13, instantiated :50)
3. executable gateway smoke CLOSED (PROVEN_RUNTIME Pig: 0 MODULE_NOT_FOUND, reached startup/recovery loop on ephemeral port)
4. append-only migration compatibility CLOSED (50/50 PASS on scratch PG)
5. sequence migration preserves history CLOSED (legacy rows NULL, hashes byte-identical, NULL-count invariant)
6. deterministic rejection -> STARTUP_BLOCKED CLOSED (classifier 5/5; live boot observed STARTUP_BLOCKED [AUTHENTICATION_FAILURE])
7. transient DB unavailability retry/not-ready CLOSED (recovery tests ALL PASS)
8. no generated secrets logged CLOSED (SEC-002 10/10; label-only logging)
9. Postgres startup ordering safe CLOSED (spine init only if pgAvailable; exactly-once on recovery)
10. security boundaries present CLOSED (4/4, 10/10, 107/107, 10/10, 131/131, 6/6, 80/80)
11. migration-vs-trigger fixture CLOSED (50/50 + trigger gate 18/18 safe)
12. distribution pre-promotion gates CLOSED (snapshot-manifest, runtime-deps-closure 14 pkgs, arm64-compat node:20-alpine PASS, migration-trigger-gate, security-negatives 1710 files PASS)
Caveats: (a) git-tracked .env files (.env.base, brainos/orchestration/config/environments/.env.mission-control) contain REAL credentials but are excluded from the Docker build by .dockerignore — repo hygiene flag for Nolan, not an Oracle blocker; (b) release-certify.js not run end-to-end (untracked releases/ would report DIRTY) — Lane F to handle; (c) deployment-phase gates (container build, Oracle runtime proofs) out of scope for Lane E.
Running: Lane G (generators). Queued: Lane F certification ladder + release manifest, then Oracle deploy lane.

## GO ADDENDUM 2026-09-20 ~09:05 MDT — CONTINUOUS BACKLOG DISCOVERY (parallel function)
Nolan: keep the certification/Oracle sprint running; backlog discovery is now a continuous parallel function, not gated on queue empty.
- Dispatched Discovery Lane A (structural forensics: write-never/read-live field hunt, shelfware mechanisms, inflated gate names) and Discovery Lane B (dead product loops: 144 completed missions / 0 non-test consumers, KnowledgePromoter 0 approvals). Both read-only forensics first; patches go to NEW branch convergence-discovery-2026-09-20 (never to the certified candidate branch); release-blocking findings report to coordinator immediately, no commit.
- Backlog admission gate (8 requirements), horizons NOW/NEXT/SOON/LATER/ASPIRATIONAL/UNKNOWN, question resolution loop, anti-aspiration rule, and execution ratio are in both lane briefs. Lanes write dated discovery files under ~/workspace/convergence/discovery/; coordinator integrates into BACKLOG.md as single writer.
- STANDING RETRY RULE (Nolan, verbatim): "IF A RUN IS UNSUCCESSFUL, TRY AGAIN EVERY SO OFTEN. MAKE IT HAPPEN." Applies to all lanes and gates: failed certification runs, builds, Oracle gate attempts retry on bounded cadence with evidence-based backoff, reconcile before retry, never duplicate unknown-execution effects, never hammer. Silent abandonment is not acceptable. Lane F and the Oracle deploy lane briefs will carry this rule.
Running: Lane G (generators), Discovery A, Discovery B. Queued: Lane F (certification ladder + release manifest), Oracle deploy lane (only if every gate passes).

## GO CYCLE UPDATE 2026-09-20 ~09:08 MDT — LANE G: GENERATOR_PORTABLE_VERIFIED
- 15/15 orchestration generators repository-relative, CWD-independence re-proven 45/45 at HEAD; outputs identical to fanout-commit behavior for all 15.
- 5/5 gateway generators CWD-independent; NOT-lossy-on-Linux re-verified (faithful regeneration, 233 events / 20 workflows / 45 capabilities, Linux-native paths).
- 3 orchestration generators remain lossy on Linux (dependency_graph, execution_graphs, hygiene_report: stale Windows paths in inputs) — frozen by design, still CWD-independent. Correct call, untouched.
- Non-blocking follow-ups: 5 stale reference SHAs in GENERATOR_CWD_PROOF.md; 9 DRIFT-class tracked artifacts stay frozen.
- Full pre-deploy verification stack now complete: V2 (claims verified) + 003 + 004 + D + E (12 blockers closed) + G (portable verified).
- Dispatched Lane F: post-demotion certification ladder + release manifest on a9cad2663 (carries the standing retry rule). Deploy lane queued behind Lane F's PASS verdict.
Running: Lane F, Discovery A, Discovery B.

## GO CYCLE UPDATE 2026-09-20 ~09:17 MDT - LANE B PROCESSED
- Discovery Lane B complete. Findings: worker dispatchResult discarded at mission_scheduler.js:371 (144 missions products unrecoverable); KnowledgePromoter was registered but reachable by nothing (triple break: zero emitters, no bridge entries, no worker-map routing). Lane closed the routing edge: KNOWLEDGE_PROMOTE -> knowledge-promotion (commit ed0de7edd on discovery branch, 3/3 wiring tests, knowledge_search 10/10 clean).
- Backlog: LANEB-001 (DONE on discovery branch, needs gate review) through LANEB-007 admitted.
- Grill: G-LANEB-1 added (should MISSION_COMPLETED auto-project into the knowledge graph as candidate nodes?). Default if Nolan does nothing: business-events-only.
- FL-20260920-008 (Pig->Oracle SSH hang) HEALED: invocation-plane error, not an outage. oracle-ssh.sh runs locally only; verified Oracle healthy ~09:16 MDT (rc-4d522a6b, PG 17, Qdrant v1.7.0). Lesson in AGENTS.md.
- Discovery branch now has one commit (ed0de7edd). Zero conflicts with certification (certified branch untouched).
Running: Lane F (certification ladder + release manifest on a9cad2663). Deploy lane queued behind PASS.

## GO CYCLE UPDATE 2026-09-20 ~09:16 MDT - LANE F: CERTIFICATION_PASS
- Certified SHA a9cad266353679a90e54b318100efb8153ea988e. release-certify 8/8 (HIGH confidence, clean tree); migration/append-only 50/50; CE-001 45/45; CE-002 46/46; dedup 25/25; collision 15/15; EVAL-006 10/10; runtime identity 13/13; bridge 49/49; auth 4/4+10/10; replay 64/6fail (T1-only known class FL-20260919-014).
- Release record committed ddba42557 (5 files under releases/candidate-a9cad2663/; branch note: record sits on convergence-discovery-2026-09-20, candidate branch tip untouched at a9cad2663). IMAGE_DIGEST PENDING_DEPLOY_LANE. Distribution digest e21a0d4f...be6c7ced (2160 files).
- Ledgered FL-20260920-LANEF-001/002 (healed environmental) and FL-20260920-LANEF-003 (discovery commit mid-cert, handled).
- Deploy lane dispatched. Oracle deploy authorized ONLY on this PASS.
