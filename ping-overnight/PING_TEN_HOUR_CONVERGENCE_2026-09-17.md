# Tell it to keep working The Exact Next Action section has five things that are yours: review the playbook revision waiting on you, rule on credential rotation, rule on off-host backups, the commit allowlist, and the live-ahead-of-repo drift reconciliation. PING Ten-Hour Convergence Sprint: 2026-09-17

Sprint window: 2026-09-16 ~20:15 MDT to 2026-09-17 ~06:00 MDT (all seven agents completed by ~20:51 MDT; remaining window used for integration and this report).
Coordinator: Pigi. Operators: Agents A (event boundary), B (Oracle deployment), C (production Python + failure handling), D (external agent + capability ownership), E (knowledge compounding loop), F (backup remediation), G (website truth).

Standing constraints honored across every track: no pushes, no publishing, no commits, no history rewrite, no destructive database operations, no volume destruction, no whole-branch merges, no secret exposure, no paid resources, no new cloud accounts, no irreversible external actions outside existing authorization boundaries. Human authority remains constitutional.

# Executive Result

The constitutional substrate became demonstrable end to end on live Oracle: observation to canonical event to mission to worker (JS, Python, and one exterior agent) to result to verification to witness to lineage to outcome to a learning proposal gated on Nolan. Every P0 correctness track closed VERIFIED. One genuine P0 production defect was found by a failed run and fixed the same night. Three more production wiring gaps were proven by failed runs and are documented as platform follow-ups. Backups now exist and are verified, but live only on the same host. The website truth matrix was updated from receipts only. Nothing was committed or pushed. Two incidents are disclosed honestly below: a credential printed into internal tool output (rotation needs Nolan), and a probe that touched one disposable test row before the append-only trigger existed (restored immediately).

Claim classification key used throughout: VERIFIED, PARTIAL, BLOCKED, FALSIFIED, UNKNOWN.

# What Became True

- POST /events can no longer bypass namespace authorization: VERIFIED (Agent A, live matrix).
- The append-only event guarantee is now a live database trigger, not a convention: VERIFIED (Agent A).
- Deterministic canonical event identity is proven live with known-vector self-tests: VERIFIED (Agents A, E).
- Production Python executes PING missions against live Postgres with byte-identical cross-runtime hashing and zero Python-emitted canonical events: VERIFIED (Agent C, 44/44).
- Dead-letter after bounded exhaustion: VERIFIED (Agent C).
- A retry-then-success defect was found, fixed, and reproven: VERIFIED (Agents C, A, 12/12).
- The first real exterior-agent execution under PING authority (Hermes WorkOrder, exit 0, independently verified, three canonical PING events): VERIFIED (Agent D).
- Capability decision ownership is mapped with file and line evidence; the "missing implementation" classification is corrected: VERIFIED (Agent D).
- The full knowledge compounding loop ran: proposal, approval, activation, execution, outcome, human-gated revision proposal, replay, witness, lineage, restart survival: VERIFIED in test scope (Agent E).
- The Oracle deployment definition is canonical, validated, and installed in the deployment assembly worktree; the dead scheduler service is classified obsolete: VERIFIED (Agent B).
- A verified backup set exists on Oracle (pg_dump, Qdrant snapshot, clean source tarball, restore guide): VERIFIED, same-host only (Agent F).
- The website truth matrix and homepage now reflect only what tonight proved: VERIFIED (Agent G plus coordinator update for the playbook claim).

# What Was Falsified

- The claimed `emitWithDefaults` random-ID defect: FALSIFIED for this release (absent everywhere; fixed upstream on night-shift-2026-09-15). Agent A.
- The 1.1 GB old tarball as a disaster-recovery artifact: FALSIFIED (truncated gzip, missing Git pack data, stale schema, no live data). Preserved, not trusted. Agent B/F.
- "CapabilityAuthority = missing_implementation" as an absolute claim: FALSIFIED (real fail-closed implementation runs live in the container and on a preserved remote branch; absent only from the current branch tree). Agent D.
- The compose `scheduler` service as a live scheduling authority: FALSIFIED (points at code that exists nowhere; in-process MissionScheduler is the one live authority). Agent B.
- Agent C's first read of an infinite retry loop: FALSIFIED as a live-production event (the live scheduler was only skipping the orphaned test mission; the loop lived in the finished test harness). The underlying defect it exposed was real and is fixed.
- Agent A's mid-sprint "worktree vanished / .git lost" alarm: FALSIFIED by direct coordinator verification (repo, .git, and all five worktrees intact, HEADs unchanged; transient observation error on the agent's side).
- Agent D's first file-read WorkOrder completion claim: FALSIFIED by the agent itself (false completion, then honest failure; Windows-native Hermes cannot see WSL paths, a verified boundary property).

# P0 Closed

| Item | Verdict | Evidence |
|---|---|---|
| /events namespace-authorization bypass | VERIFIED | Live matrix: malformed namespace 403, no auth 401, idempotent replays, /ingest unaffected; event 5e24e593... |
| Deterministic event identity | VERIFIED | Zero reachable random/time-based ID paths; sha256 canonical formula; known-vector self-tests |
| Event-type registry convergence | VERIFIED | 233 types, all SCREAMING_SNAKE; live LEAD_CREATED to LEAD_FOLLOWUP mission completed through patched /events |
| Append-only enforcement | VERIFIED | Trigger trg_ping_events_append_only live; UPDATE/DELETE rejected, rows unchanged; INSERT and ON CONFLICT idempotency unaffected |
| Retry-then-success lifecycle | VERIFIED | reclaimRetryPending implemented; 12/12 assertions; fail-once-then-succeed reaches completed with attempt 2 |
| Dead-letter on bounded exhaustion | VERIFIED | Mission 3daa14285107788e, exactly 2 attempts, MISSION_DEAD_LETTERED 21a6af0b72a8cfeb..., one dead-letter record, no third attempt |
| Production Python execution | VERIFIED | 44/44 assertions; full chain E1 27482dbdabfb57b7 to MISSION_COMPLETED f8c1ae1fc1c7bc32; cross-runtime sha 1945b844... matched JS recomputation |
| Exterior-agent execution | VERIFIED | Hermes v0.21.2 WorkOrder 0d598aef352b9a8a, exit 0, result sha f0b021848c..., three canonical events f326ea70..., e91681bf..., daaa75fc... |
| Capability decision ownership | VERIFIED | Live /app/gateway/capability_authority.js:230 authorize(), fail-closed, wired at gateway_runtime.js:416-418; 18/18 fail-closed tests for the new PING-initiated delegation authority |
| Compose convergence | VERIFIED | Canonical docker-compose.oracle.yml validated with docker compose config on Oracle; renders postgres, gateway, qdrant; installed in worktree (sha 5163084e...), byte-verified |
| Backup set | VERIFIED | pg_dump 160,927 B gzip PASS (1158 ping_events, 222 ping_missions, 31 tables); Qdrant snapshot 67,375,104 B, 13 points; clean source tarball 26,628,632 B, 2,902 entries, zero secret-filename matches; restore guide written |
| ARM64 portability | VERIFIED | Active images ARM64; native Node deps ARM64-compatible; no blockers for live topology |
| Knowledge compounding loop | VERIFIED (test scope) | 5/5 phases; identifiers below; restart survival 9/9 events |
| Website truth alignment | VERIFIED | 8 claims relabeled from receipts; site builds; pages 200; receipts in served HTML |

# P0 Remaining

1. Per-principal namespace ACLs: Agent A's /events fix validates namespace syntax only. A valid-but-unauthorized explicit namespace (e.g. tenant::hpp from api:muse-level-2) is still accepted. No per-principal entitlement map exists yet. Classification: P0 follow-up, platform fix.
2. Playbook wiring gap 1: POST /knowledge/nodes drops nodeId, sourceEventId, correlationId, so nodes created through it are invisible to the approval gate (orphan 4917265ee67e678c remains as residue). Classification: P0 platform fix.
3. Playbook wiring gap 2: SNIPPET_APPROVED is in neither the event-to-mission bridge map nor the mission-to-worker map, so ordinary runtime wiring cannot reach KnowledgePromoter. Classification: P0 platform fix.
4. Playbook wiring gap 3: a directly emitted REPLAY_VERIFY creates no mission, so the dispatch-only worker runtime never runs the replay worker. Classification: P0 platform fix (same dispatch pattern class as gap 2).
5. Append-only trigger does not cover TRUNCATE, and must be re-applied after any from-scratch database rebuild. Classification: P0 runbook item (DDL saved at workspace/ping-overnight/event-boundary/trigger-append-only.sql).
6. Live-ahead-of-repo drift: the Oracle container tree is ahead of every branch in at least three places (capability_authority.js, the /events route fix, the gateway_runtime.js retry fix). Reconciliation into a branch is Nolan's call; nothing commits without his word. Classification: P0 durability.
7. Credential rotation: Agent C's docker inspect printed the Postgres container environment, including its password, into internal tool output. Not written to any file or report, not repeated. Rotation needs Nolan's authorization. Classification: P0 security, awaiting Nolan.
8. Backups are same-host only: verified on Oracle, no off-host copy, no recurring automation, no tested restore. The OCI queue timer stays disabled per Nolan. Classification: PARTIAL disaster recovery until off-host storage and automation are authorized.

# Canonical Authority Map

| Concern | Owner | State tonight |
|---|---|---|
| Canonical event identity | CanonicalizationService + sha256 formula | VERIFIED live; known-vector self-tests pass |
| Event namespace authorization | CanonicalizationService.authorizeNamespace (syntax) + POST /events patch | VERIFIED live; per-principal ACLs UNKNOWN (do not exist) |
| Append-only event store | trg_ping_events_append_only (Postgres) | VERIFIED live |
| Mission lifecycle | MissionRuntime + MissionScheduler (in-process) | VERIFIED; retry reclaim fixed tonight |
| Worker execution | WorkerRuntime + worker map | VERIFIED (JS, Python, ReplayWorker, witness worker) |
| Exterior-agent invocation | ExternalAgentAdapter.authorizeWorkOrder (new, fail-closed) | VERIFIED in isolated worktree, 18/18; not yet wired into MissionRuntime |
| Agent-initiated capability decisions | CapabilityAuthority.authorize() (live container) | VERIFIED live; absent from branch tree (drift item 6) |
| PING-initiated work delegation | authorizeWorkOrder (new minimum authority) | VERIFIED in worktree; production wiring is follow-up |
| Knowledge authority | KnowledgeGraph + KnowledgePromoter | VERIFIED logic; runtime reachability BLOCKED by gaps 2 and 3 |
| Replay | DeterministicReplayEngine + ReplayWorker | VERIFIED (mission-driven path) |
| Witness | witness worker (WITNESS_CREATED) | VERIFIED |
| Lineage | lineage worker | VERIFIED (fired on the playbook chain) |
| Projection | projection event path | VERIFIED |
| Configuration | oracle.env.template (no secrets) | VERIFIED; live secrets stay in /opt/ping/.env, never printed |

Proof ladder position for the core chain (EXISTS to REPRODUCES): every rung is now evidenced for the JS and Python mission paths and the playbook chain in test scope. Exterior-agent execution sits at PRODUCES EVIDENCE (one execution, not yet REPLAYS at fleet level).

# Event Boundary Proof

Agent A, worktree oracle-assembly, deployed to live Oracle. POST /events now routes through CanonicalizationService.authorizeNamespace() and canonicalizeAndEmit() with explicit 400/403/422/503. Live matrix on the real gateway: malformed namespace returns 403, missing Bearer returns 401, replayed submissions are idempotent, /ingest behavior unchanged, gateway healthy across restarts. Event 5e24e593... captured as the boundary receipt. Full evidence: workspace/ping-overnight/event-boundary/REPORT.md. Residual: syntax-only validation (P0 Remaining item 1).

# Deterministic Identity Proof

Agent A verified the sha256 canonical identity formula in source and found zero reachable random or time-based ID generation paths on the event path. Agent E proved the deployed formula differs from the inspected source by known-vector self-test: proposal in namespace core::owner produced d1b47668c4b71b125c6e34a4c54c4360fa0bc079cca0397fd9f461bfbb6055d, matching sha256(JSON({eventType, source, namespace, logical_id: JSON(payload minus volatile timestamp fields)})) exactly, with authenticated source api:muse-level-2. Cross-runtime: Python-computed canonical sha 1945b844... matched independent JS recomputation byte for byte. Restart probe: post-restart event c4b129f76a8afd17... persisted with the exact predicted deterministic id.

# Database Invariants

Live Oracle Postgres at time of backup (2026-09-17 ~02:26 UTC): 31 public tables, ping_events 1,158 rows, ping_missions 222 rows. Append-only trigger trg_ping_events_append_only is live: UPDATE and DELETE are rejected with zero row change; INSERT and ON CONFLICT idempotent replays are unaffected. The trigger DDL is saved for runbooks at workspace/ping-overnight/event-boundary/trigger-append-only.sql. Incident disclosed: Agent A's first trigger apply silently failed (missing stdin forwarding) and a probe UPDATE/DELETE touched one disposable test row before enforcement existed; the row was restored immediately by deterministic re-emit, no business data was touched, and the trigger is now live and proven. TRUNCATE is not covered; re-apply the DDL after any from-scratch rebuild.

# Oracle Deployment State

Host ping-core-01, ARM64/aarch64, Docker 29.1.3, Compose 2.40.3, passwordless sudo. Three live containers, all healthy: ping-gateway, ping-postgres, ping-qdrant. The canonical compose candidate (workspace/ping-overnight/oracle-deploy/docker-compose.oracle.yml) was validated on Oracle with docker compose config and renders exactly postgres, gateway, qdrant under the default profile; it is installed in the oracle-assembly worktree at infrastructure/oracle/docker-compose.oracle.yml (sha256 5163084ec2f15b710159d53bf491b0dc40ccdff762f3019f6b055d4a9e4f6749, byte-verified identical), with the pre-canonical copy preserved alongside as docker-compose.oracle.yml.pre-canonical-20260916. The compose scheduler service (pointing at node runtime/scheduler/main.js, which exists nowhere) is removed from the canonical definition and classified PRESERVED_INACTIVE / OBSOLETE; its Dockerfile and systemd files remain in place, not deleted. The live on-box compose file was not overwritten. Live files were backed up before any deploy (Agent A's .bak-agent-a-20260916 siblings; diffs confirm the live files contain the patches). No live data volumes were touched. /opt/ping/.env was never printed.

# Multi-Runtime Production Proof

One authority, three execution runtimes, shared evidence, all on live Oracle Postgres. JavaScript: the existing mission path (LEAD_FOLLOWUP completed end to end through the patched /events). Python: production chain canonical event to EventToMissionBridge to MissionRuntime to MissionScheduler to WorkerRuntime to PythonProdAdapter to tools/execution/runner.py to real Python execution to structured result to TASK_STARTED to TASK_COMPLETED to EVIDENCE_RECORDED to MISSION_COMPLETED, 44/44 assertions, identifiers E1 27482dbdabfb57b7..., mission bfe815990337e45d, task e694f5787ad45764 attempt 1, TASK_COMPLETED a6e70b783956e4c1..., EVIDENCE_RECORDED 9bbbfff731a2023d..., evidence 6cafb21dca536f4f, MISSION_COMPLETED f8c1ae1fc1c7bc32..., all isolated to namespace test.python-prod, correlation sprint-2026-09-16. Python emitted zero canonical events directly; rerunning the same semantic input produced the same E1 with zero new executions. Exterior: Hermes v0.21.2 executed scoped WorkOrder 0d598aef352b9a8a (task-uppercase-001, text.transform, read-only, no network, no writes), exit 0, output independently verified PASS, result sha f0b021848c2ddc7d6e07b8f8e186c78259454a935153804c7b4c574ec5bb1eed; PING emitted f326ea70..., e91681bf..., daaa75fc... itself. Python is not a canonical event authority. Honest limits: adapters live in uncommitted worktrees, not a fleet; mission-row to exterior-adapter production routing is PARTIAL (real execution and evidence, no production ping_missions row; no fake mission was created to pretend otherwise).

# Failure / Retry / Dead-Letter Proof

Dead-letter: VERIFIED. Always-failing mission 3daa14285107788e with max_attempts 2 ran exactly two attempts, reached terminal failed status, emitted canonical MISSION_DEAD_LETTERED 21a6af0b72a8cfeb..., wrote exactly one dead-letter record, and made no third attempt after settling. Retry: the production defect is found, fixed, and reproven. failWithRetry() set retry_pending while the referenced reclaimRetryPending() did not exist, so retried missions could never be reclaimed (assign() only transitions from created; complete() requires running). Agent C observed 124 harness executions against mission 73e08f46f843beb2 before termination; the live gateway scheduler was only skipping that orphaned mission ("No worker for mission type 'PYTHON_FLAKY_RUN'"), so no live production impact occurred. The coordinator neutralized the orphaned test row to failed with a documented reason. Agent A implemented the missing reclaim path plus the scheduler arrow; 12/12 proof assertions pass: fail-once-then-succeed reaches completed with attempt 2 recorded, bounded exhaustion still dead-letters exactly once, no re-execution loop.

# External Agent Execution

VERIFIED for Hermes; BLOCKED_EXTERNAL for Codex; BLOCKED for OpenCode. Hermes v0.21.2 ran scoped WorkOrder 0d598aef352b9a8a on 2026-09-17 02:23:54 to 02:24:16 UTC, exit 0, output independently verified PASS. The earlier file-read WorkOrder is recorded as FALSIFIED (false completion, then honest failure): Windows-native Hermes cannot see WSL paths, a verified boundary property that forced the successful inline-input fallback. Codex is quota-blocked until 2026-09-17 00:01 local; OpenCode has no headless CLI. Constraints held: no autonomous swarm, no broad agent permissions, no direct canonical event or mission-state writes by the exterior agent. Caveat: Agent D's cloud VM and the Pig have different /home/nolan filesystems; early writes landed cloud-side and were redone through the sanctioned Pig channel; all tests pass on the Pig.

# Capability Decision Ownership

VERIFIED with a correction. Full forensics with file and line evidence: a real fail-closed CapabilityAuthority runs live in the container (/app/gateway/capability_authority.js:230 authorize(), agent profiles, workspace containment, wired at gateway_runtime.js:416-418) and in git on remotes/windows-preserve/constitutional-convergence-v2 (43a6cd2e4, 2026-09-12); it is only absent from the current branch tree, so "missing_implementation" is FALSIFIED as an absolute claim and stands only as a tree-relative classification (registry correction recommended). The one reachable decision without a code owner was PING-initiated work delegation ("may PING issue work order W to agent A?"), distinct from the live authority's agent-initiated invocation decision. Agent D implemented the minimum authority in the isolated sprint/agent-exec worktree: external-agent/ with external_agent_adapter.js (authorizeWorkOrder fail-closed, issueWorkOrder, verifyResultEnvelope, canonicalEventId), both JSON schemas, BOUNDARY.md, and 18 passing fail-closed tests on the Pig. Suggested follow-ups: retry Codex after quota reset, wire the adapter into MissionRuntime, correct the registry's tree-relative status.

# Knowledge Compounding Loop

VERIFIED in test scope (namespace test.playbook, correlation sprint-2026-09-16, every approval labeled TEST SCOPE ONLY). The full chain ran on live Oracle: knowledge proposal event 9d5b14d3... to playbook node 94043c0eb1d3918d (candidate, confidence 0.5) to approval event 3c1985a53d... to the deployed KnowledgePromoter.handle() returning promoted:true (node approved, confidence 1.0, gate fired exactly once) to activation event 0bc80b9d... (lifecycle active) to projection event 04e4808a... to mission 0405c01805096690 (REPLAY_VERIFY, completed via the real ReplayWorker through the real MissionRuntime, Scheduler, and WorkerRuntime) to REPLAY_COMPLETED 408247b6... to WITNESS_CREATED 2c75c8da... to outcome 93687aab... to revision node 194a2b85bde957ed v1.1.0 (candidate, PENDING_HUMAN, decided_by null, required approver Nolan Geske; zero approval events reference it; active v1.0.0 untouched) to mission-driven replay verified by DeterministicReplayEngine (REPLAY_COMPLETED ead4be8a..., verified True; WITNESS_CREATED 4aa7b0eb..., documentId = playbook node, attestation witness-ead4be8a1eaaa77c) with the lineage worker firing. Gateway-only restart (Postgres and Qdrant untouched): node still approved and active, revision still PENDING_HUMAN, 9/9 chain events present, both missions still completed, post-restart probe c4b129f76a8afd17... persisted with the predicted deterministic id. No production playbook was approved or revised. Full report: workspace/ping-overnight/playbook/REPORT.md with chain.json and runlog.jsonl, all 13 chain identifiers cross-checked character for character. Honest limitation: the promoter logic was proven via an in-container harness against real persisted data; the ordinary runtime path to it is broken by the three documented wiring gaps (P0 Remaining 2 to 4).

# Playbook Proof

The playbook revision path is proven and the human gate held. Outcome 93687aab... produced revision node 194a2b85bde957ed (v1.1.0, candidate, PENDING_HUMAN, decided_by null, Nolan Geske named as required approver). Zero approval events reference it. The active v1.0.0 node is untouched. No auto-promotion occurred anywhere in the run. The revision awaits Nolan's review; nothing in this sprint approved it.

# Outcome / Learning Proof

The learning proposal exists as a first-class persisted node (194a2b85bde957ed) derived from a real recorded outcome, not as a log line. It carries its provenance (source outcome 93687aab..., parent playbook 94043c0eb1d3918d), its version (1.1.0), and its gate state (PENDING_HUMAN). The compounding loop therefore closed the full target chain: observation to evidence to canonical event to knowledge to playbook to authorized mission to execution to result to verification to witness to lineage to outcome to learning, with the final step correctly stopped at the human boundary.

# Replay / Witness / Lineage Proof

Mission-driven replay is VERIFIED: POST /missions created mission 945689817fdad075, whose id matched the deterministic sha256("REPLAY_VERIFY:"+event_id)[0:16]; it completed at 02:43:27.554Z, DeterministicReplayEngine returned verified True (REPLAY_COMPLETED ead4be8a...), and the witness worker attested (WITNESS_CREATED 4aa7b0eb..., attestation witness-ead4be8a1eaaa77c) with the lineage worker firing. A directly emitted REPLAY_VERIFY event creates no mission (documented as wiring gap 4); the first attempt failed honestly and was corrected to the mission-driven path. Last night's 34/34 traceability assertions and replay/witness/lineage baseline stand unmutated.

# Restart / Recovery Proof

Gateway-only restart (docker restart ping-gateway; Postgres and Qdrant untouched): gateway healthy after; the playbook node still approved and active; the revision still PENDING_HUMAN with decided_by null; 9/9 chain events present (ping_events is append-only by trigger); both missions still completed; the post-restart probe event persisted with the exact predicted deterministic id. Canonical identifiers survived restart. The append-only trigger, the Python retry fix, and the exterior-agent evidence were all verified against the restarted gateway.

# Disaster Recovery

PARTIAL. A verified backup set now exists at /opt/ping/releases/: pgdata-backup-2026-09-16.sql.gz (160,927 B, gzip test PASS, contains ping_events and ping_missions), qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot (67,375,104 B, collection knowledge, 13 points), ping-source-clean-2026-09-16.tar.gz (26,628,632 B, 2,902 entries, gzip PASS, final case-insensitive audit zero matches for .env/secret/credential/.key/.bak; the first build leaked 12 uppercase SECRET/CREDENTIAL filenames and was rebuilt), and RESTORE-2026-09-16.md specifying isolated restore targets and forbidding live ports, volumes, and names. The old 1.1 GB tarball is FALSIFIED as a DR artifact and preserved, not trusted. Honest limits: backups live on the same host as production; no off-host copy; no recurring automation; no tested restore. The OCI queue timer stays disabled per Nolan's standing order.

# ARM64 Portability

VERIFIED (Agent B, Phase 17). The active Oracle images support ARM64; native Node dependencies resolve to ARM64-compatible variants; profile-gated Temporal and LiteLLM manifests list ARM64; Ollama is not deployed on Oracle and the current embedding path uses fallback mode. No ARM64 blockers for the live topology.

# Operational Health

All three Oracle containers healthy after the previous overnight triage and still healthy at sprint end. The gateway ran the full live matrices tonight (/events auth, determinism, registry, append-only, retry, Python, Hermes, playbook) without degradation. Live event volume: ping_events 1,158 rows, ping_missions 222 rows at backup time; test-namespace activity tonight was isolated to test.python-prod, test.agent-exec, test.playbook, and core::playbook with correlation sprint-2026-09-16. No production namespaces were written by any sprint agent. The 02:27 UTC gateway restart observed mid-sprint is attributed to Agent A's deploy (its own backups confirm), not to a third party.

# Website Truth Changes

Agent G plus the coordinator's playbook update. The 23-claim matrix (workspace/ping-overnight/website/TRUTH_MATRIX.md, mirrored byte-identical to research/website-truth-matrix.md in the site repo) changed: claim 1 canonical events PROVEN with strengthened evidence and recorded residuals; claim 4 playbooks/compounding DIRECTION to BUILT_NOT_LIVE with the full receipt chain and the three wiring gaps; claim 9 capability authority BUILT_NOT_LIVE to PROVEN with the tree-relative caveat; claim 10 agents stays EXPERIMENTAL with the Hermes receipt; claim 14 multi-runtime DIRECTION to BUILT_NOT_LIVE; claim 16 Python workers EXPERIMENTAL to BUILT_NOT_LIVE; claim 17 Oracle stays EXPERIMENTAL with the operational backup receipt; claim 19 missions BUILT_NOT_LIVE to PROVEN. Homepage mirrors: /govern layer 02 Built to Live; /act beats to Live/Experimental with tonight's receipts; /run PYTHON card Experimental to Built; EXTERIOR AGENTS keeps Experimental with receipt; convergence caption Direction to Built; new "Execution receipts, Captured 2026-09-16/17" card in /prove; STATUS_STRIP rows updated; /technology title "Multi-runtime direction" to "Multi-runtime convergence"; playbook STATUS_STRIP row and /prove card updated to Built with the test-scope receipt. Dev server recompiled cleanly; / and /technology return 200; served HTML contains the new receipts. No visual phone-width QA was possible (open item carried from last night). Site repo: main at f6386ee, still exactly 21 uncommitted files, nothing committed or pushed, no secrets printed.

# Commit 099927152 Forensics

Read-only investigation, no mutations. Commit 099927152b93e0de7c1a120bc88d73fb939c1502 ("docs(report): history rewrite complete") changes only docs/HISTORY_REWRITE_COMPLETION_REPORT_2026-09-16.md; parent c5f7808b2; author Trish Nikitha <trishnikitha@gmail.com> (machine Git identity). The commit is a benign docs-only commit in tree contents, but the history rewrite it documents did occur: HEAD reflog shows c5f7808b2 reset and fast-import, and the report says the rewrite removed a large Next.js SWC Windows binary from constitutional-convergence-v2 ancestry and published the rewritten branch. Observed local remote-tracking tip origin/constitutional-convergence-v2 = c5f7808b2. Recovery bundles exist at /tmp/constitutional-convergence-v2.bundle, /tmp/git-forensics-2026-09-16-final.bundle, /tmp/git-forensics-2026-09-16.bundle (fragile /tmp storage; preserve with care, no history mutation). GitHub acceptance of the rewritten branch is UNKNOWN from this environment. No revert, reset, rebase, or further rewrite was performed or is authorized.

# Files Changed

No commits; all changes are uncommitted worktree state, preserved as found plus tonight's additions:

- /home/nolan/ping/worktrees/oracle-assembly (main @ 5b102c664): M infrastructure/oracle/docker-compose.oracle.yml (canonical compose installed, byte-verified); untracked docker-compose.oracle.yml.pre-canonical-20260916 (preserved pre-canonical copy); untracked oracle-assembly-patches/ (gateway/routes/events.js, gateway/bootstrap/gateway_runtime.js: the live /events fix and retry fix); untracked multiruntime-proof/ (last night). No tracked source files modified in the worktree.
- /home/nolan/ping/worktrees/python-prod (sprint/python-prod @ 5b102c664): untracked prod/ drivers and results-phase8.jsonl (Agent C's harness and evidence).
- /home/nolan/ping/worktrees/agent-exec (sprint/agent-exec @ 5b102c664): untracked external-agent/ (adapter, schemas, BOUNDARY.md, 18-test suite).
- /home/nolan/ping/worktrees/playbook (sprint/playbook @ 5b102c664): untracked playbook/ (run_phases drivers v4/v5/v6, PLAYBOOK_SPEC.md).
- /home/nolan/ping (constitutional-convergence-v2 @ 099927152): pre-existing modifications from before the sprint left untouched (.env.base, gateway_runtime.js, wiring.js, end_to_end_verifier.js, deployment_generator.js, deployment_manifest.json, launch_bg.ps1, launch_bg2.ps1, db_guard.js, worktrees/agent-smoke-abc123def456, worktrees/oracle-assembly). The agent-smoke worktree (3e0c3ddd1, dirty) was never touched.
- /home/nolan/projects/ping (website, main @ f6386ee): 21 uncommitted files, same as last night plus tonight's truth updates; nothing committed or pushed.
- Oracle /opt/ping/releases/: the verified backup set and restore guide (new).
- Cloud VM ~/workspace/ping-overnight/: seven agent reports (event-boundary, oracle-deploy, python-prod, agent-exec, playbook, backup, website/TRUTH-UPDATE-2026-09-16).

# Tests Executed

- Agent C production Python: 44/44 assertions pass (live Oracle Postgres).
- Agent A retry fix: 12/12 proof assertions pass (fail-once-then-succeed; bounded exhaustion dead-letters exactly once; no re-execution loop).
- Agent D exterior authority: 18/18 fail-closed assertions pass on the Pig.
- Agent E restart durability: 9/9 chain events present post-restart; missions completed; probe id predicted exactly.
- Agent A /events live matrix: malformed 403, no-auth 401, idempotent replays, /ingest unaffected, healthy across restarts.
- Agent A append-only live matrix: UPDATE/DELETE rejected with zero row change; INSERT and ON CONFLICT idempotency unaffected.
- Agent A registry: 233 types, all SCREAMING_SNAKE; live LEAD_CREATED to completed LEAD_FOLLOWUP.
- Agent E known-vector identity self-test: d1b47668... matched the deployed formula exactly.
- Last night's 34/34 traceability assertions: stand, unmutated.
- Website: dev server recompile clean; / and /technology 200; receipts present in served HTML; matrix mirrored byte-identical (md5 777ddfa2683ebe997e2dbe8437fe64c8).

# Git State

- /home/nolan/ping: constitutional-convergence-v2 @ 099927152, dirty with pre-existing modifications only; .git verified intact mid-sprint after a false alarm.
- /home/nolan/ping/worktrees/oracle-assembly: main @ 5b102c664; only untracked additions plus the canonical compose modification.
- /home/nolan/ping/worktrees/python-prod: sprint/python-prod @ 5b102c664.
- /home/nolan/ping/worktrees/agent-exec: sprint/agent-exec @ 5b102c664 (created 20:26 MDT).
- /home/nolan/ping/worktrees/playbook: sprint/playbook @ 5b102c664.
- /home/nolan/ping/worktrees/agent-smoke-abc123def456: 3e0c3ddd1, dirty, untouched per standing order.
- /home/nolan/projects/ping: main @ f6386ee, 21 uncommitted files, untouched HEAD.
- No commits, no pushes, no merges, no resets, no history rewrites, no branch deletions anywhere tonight.

# Exact Next Action

Nolan's decisions, in priority order:

1. Review the playbook revision node 194a2b85bde957ed (v1.1.0, candidate, PENDING_HUMAN): approve, edit, or reject. Nothing auto-promotes; the active v1.0.0 is untouched until he decides.
2. Authorize rotation of the Postgres credential printed into internal tool output by Agent C's docker inspect (P0 security). The value was never written to a file or report.
3. Authorize off-host backup copies and recurring backup automation, or accept same-host-only DR as the standing posture. The OCI queue timer stays disabled until he says otherwise.
4. Rule on the commit allowlist: seven worktrees hold uncommitted patches (event-boundary, oracle-deploy, python-prod, agent-exec, playbook, website truth). Nothing commits without his explicit word.
5. Rule on reconciling the live-ahead-of-repo drift (capability_authority.js, /events fix, gateway_runtime.js retry fix) into a branch.
6. Accept the platform fix list: per-principal namespace ACLs plus the three playbook wiring gaps (knowledge adapter drops IDs; SNIPPET_APPROVED dispatch; REPLAY_VERIFY dispatch), or schedule them.
7. Retry Codex after its 00:01 quota reset if a second exterior-agent execution is wanted.

Coordinator's standing posture resumes: quiet when healthy; surface only failure, the important, response-required, new self-improvement, or blocked.
