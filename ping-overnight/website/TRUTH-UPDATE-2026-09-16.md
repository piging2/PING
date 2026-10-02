# Truth Matrix Update 2026-09-16/17 (Agent G, website truth, PHASE 19)

Date: 2026-09-16/17 MDT. Source: tonight's convergence-sprint agent reports
(event-boundary, oracle-deploy, python-prod, agent-exec, backup). Agent E's
compounding-loop report had not landed at write time; playbook/institutional-memory
claims were left exactly as they were.

Git law held: repo /home/nolan/projects/ping, main @ f6386ee, still 21 uncommitted
files (same set as before; nothing deleted, reverted, committed, or pushed).
Matrix updated in both places: ~/workspace/ping-overnight/website/TRUTH_MATRIX.md
and the repo mirror research/website-truth-matrix.md (byte-identical).
Homepage mirrors verified live on the dev server (tmux ping-dev, :3000): / 200,
/technology 200, new receipts present in served HTML. No live browser QA done
(visual phone-width QA still open from last night). No em dashes in any edit.

## Claim changes (matrix status -> site label)

### 1. Events are canonical (claim 1): PROVEN -> PROVEN (strengthened evidence)
Strengthened only to what was proven tonight:
- POST /events namespace-authorization bypass closed live (~20:21 MDT 2026-09-16):
  route now goes through CanonicalizationService (authorizeNamespace, then
  canonicalizeAndEmit). Malformed namespace returns 403, unauthenticated 401,
  live event 5e24e593f6a9f7b762ecedfed45a447faba57b6d1d9dded1dacd28feab3fe443
  persisted under api:muse-level-2. /ingest unaffected.
- DB trigger trg_ping_events_append_only live: UPDATE and DELETE rejected with
  zero row change (rows 1125 -> 1125); INSERT and ON CONFLICT idempotency
  unaffected. DDL copy at ~/workspace/ping-overnight/event-boundary/trigger-append-only.sql.
Honest residuals recorded in the matrix: the trigger does not cover TRUNCATE
(no code path uses it); authorizeNamespace validates syntax only, so true
per-principal namespace ACLs remain future work.
Homepage mirror: STATUS_STRIP "Event plane" and "Canonical events" details now
name the bypass closure and the trigger; /remember loop beat now reads
"Append-only store, now DB-enforced: the trigger rejects UPDATE and DELETE.
TRUNCATE is not covered."

### 9. Agent authority: "explicit capability grants, not vibes" (claim 9): BUILT_NOT_LIVE -> PROVEN
Tonight's finding: the "CapabilityAuthority = missing_implementation" classification
is FALSIFIED as an absolute claim. A real fail-closed implementation runs live in
the container (/app/gateway/capability_authority.js, 870+ lines, live since
2026-09-15): authorize() decides "may agent A invoke capability C with parameters
P in workspace W?", fail-closed on unknown agents, profile allowlist, workspace
and repo containment, canonical-repo write denial; wired live at
gateway_runtime.js:416-418. Plus the minimum PING-initiated delegation authority:
authorizeWorkOrder() fail-closed (unknown agent, unlisted capability, external
block, non-canonical namespace, loosened constraints, or missing event/mission-state
prohibitions all deny), issueWorkOrder() with deterministic IDs,
verifyResultEnvelope(); 18/18 test assertions PASS on the Pig (captured 2026-09-17).
Precise caveat kept in the matrix (no overclaim): the implementation is ABSENT
from the constitutional-convergence-v2 branch tree; authorities/registry.yaml still
says missing_implementation and needs a tree-relative correction.
Homepage mirror: /govern layer 02 "SCOPED GRANTS" label Built -> Live, with the
fail-closed + 18/18 receipt in the detail line.

### 10. Agents run missions under that authority (claim 10): EXPERIMENTAL -> EXPERIMENTAL (receipt attached)
One real scoped execution exists, captured 2026-09-17: Hermes v0.21.2 ran WorkOrder
0d598aef352b9a8a (task-uppercase-001, capability text.transform; constraints honored:
no network, no writes, no tool use, no canonical events, no mission-state writes),
exit 0, output independently verified PASS, result envelope sha256
f0b021848c2ddc7d6e07b8f8e186c78259454a935153804c7b4c574ec5bb1eed.
PING itself recorded three canonical events:
f326ea70d7cf16ce85c4cc56a23bc147ce0273984023c123b8b5467ea6d507de (order issued),
e91681bfd300389e9c8f10c7c3ad2f9cea352342bfe6aa71f962d14c764bb587 (task completed),
daaa75fc5b298c5b7fedab679e8bbf8a792099afc779877dd3d8acc7def1bf92 (evidence recorded).
Stays EXPERIMENTAL because it is one execution, not a fleet; mission-to-adapter
production routing is not yet wired (PARTIAL); Codex was quota-blocked
(retry after 2026-09-17 00:01); OpenCode has no headless CLI.
Homepage mirror: STATUS_STRIP "Agents" keeps Experimental and now carries the
WorkOrder receipt; /run EXTERIOR AGENTS card keeps Experimental with the receipt
and the honest limits.

### 14. Multi-runtime: "one authority, many runtimes" (claim 14): DIRECTION -> BUILT_NOT_LIVE
Now demonstrated, not just designed:
- Production Postgres-backed Python execution VERIFIED: canonical event
  27482dbdabfb57b7190dd9f4ae530bee98ff381c8cc0eebec27349dd04b502a1
  (PYTHON_CAPABILITY_VERIFY, namespace test.python-prod) -> bridge -> mission
  bfe815990337e45d (PYTHON_CAPABILITY_RUN) -> scheduler -> WorkerRuntime ->
  PythonProdAdapter -> unmodified tools/execution/runner.py -> capability
  python.canonical_hash -> structured result -> JS-side canonical events
  TASK_STARTED a6e70b783..., TASK_COMPLETED 9bbbfff7..., EVIDENCE_RECORDED
  49a96bff... (evidence_id 6cafb21dca536f4f), MISSION_COMPLETED f8c1ae1f....
  44/44 assertions read back from live Postgres rows; identifier chain
  (event/mission/task/worker/capability/correlation/causation) asserted;
  zero Python-emitted events (verified); cross-runtime sha256 agreement
  1945b844... byte-identical; idempotent rerun reproduced the identical E1.
- First real external-agent execution (Hermes, receipts above) recorded as
  canonical PING evidence through the same authority boundary.
Honest limits kept: single Python capability through uncommitted worktree code
(sprint/python-prod), not a persistent live Python runtime; not a fleet; Codex
quota-blocked; OpenCode has no headless CLI. Status is BUILT_NOT_LIVE (captured
runs, not live-continuous).
Homepage mirror: STATUS_STRIP "Multi-runtime convergence" Direction -> Built with
the captured receipt and "not a fleet yet"; /run bottom caption Direction -> Built
with the same honest framing; /technology page section title changed from
"Multi-runtime direction" to "Multi-runtime convergence".

### 16. Python workers (claim 16): EXPERIMENTAL -> BUILT_NOT_LIVE
A Python worker executed a real PING task under the authority model: the
PythonProdAdapter ran python.canonical_hash through the unmodified
tools/execution/runner.py (stdin/stdout only) against live Oracle Postgres,
driven by the production mission scheduler; the result returned as a structured
result and the JS side recorded canonical TASK_COMPLETED + EVIDENCE_RECORDED.
Python emitted zero events (verified by grep and by event sources in the rows).
Receipt: mission bfe815990337e45d, result sha 1945b844..., captured 2026-09-16/17.
BUILT_NOT_LIVE (not Experimental) because the execution is now evidenced; honest
limit kept: the adapter is uncommitted worktree code, not a registered persistent
live Python worker runtime (that remains the required proof).
Homepage mirror: /run PYTHON WORKERS card Experimental -> Built, with the 44/44
assertion receipt and the worktree caveat.

### 17. Oracle execution location (claim 17): EXPERIMENTAL -> EXPERIMENTAL (operational receipt added)
No label change: no matrix claim covers backups. Recorded as Oracle operational
evidence only:
- pg_dump: /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz, 160927 bytes,
  sha256 10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e,
  gzip -t PASS, 31 tables including ping_events (1158 rows) and ping_missions (222 rows).
- Qdrant snapshot: knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot,
  67375104 bytes, 13 points.
- Clean source tarball: ping-source-clean-2026-09-16.tar.gz, 26628632 bytes,
  sha256 962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6,
  gzip -t PASS, .env/keys/credentials/backups excluded.
Explicitly NOT claimed: off-host copy (same-host only), automation (no cron yet),
or a tested restore (not a DR guarantee).
Homepage mirror: STATUS_STRIP "Oracle execution" keeps Experimental; detail now
names the on-box backup set with the same-host/no-automation caveat.

### 19. Missions (claim 19): BUILT_NOT_LIVE -> PROVEN
Real missions completed live on Oracle tonight (captured 2026-09-16/17):
- LEAD_FOLLOWUP via the patched /events door: LEAD_CREATED
  ba034e511d5de5bc694826b05421b614b6ccad04003522c2c9961775d1b65456 ->
  full worker chain (CLAIM_GENERATE, CLASSIFICATION_CREATE, PROJECTION_CREATE,
  RECOMMENDATION_CREATE, REPLAY_VERIFY, WITNESS_CREATE, LINEAGE_CREATE,
  15 MISSION_COMPLETED events).
- PYTHON_CAPABILITY_RUN bfe815990337e45d completed (assigned python-worker@Pig,
  attempt 1, result recorded).
- Retry/dead-letter path VERIFIED live: controlled failure is structured
  (TASK_FAILED with error/attempt/correlation); scheduler-owned retry via the
  newly implemented reclaimRetryPending() (deployed live ~20:55 MDT);
  fail-once-then-succeed reaches completed with attempt 2 (12/12 assertions);
  bounded exhaustion dead-letters exactly once (PYTHON_FAIL_RUN
  3daa14285107788e -> MISSION_DEAD_LETTERED
  21a6af0b72a8cfeb2c3dbbec40184e87456065f956c67b62238b936d3b76e0b7,
  retries=2, exactly one DLQ record, no attempt 3 after the 8s settle).
  The retry-then-success defect was found live tonight (mission
  73e08f46f843beb2 re-executed 124 times in an unbounded loop) and FIXED.
Homepage mirror: /act loop beat labels ["Built", "Experimental"] -> ["Live", "Experimental"]
with tonight's mission receipts in the bullets; /prove section gained a new
"Execution receipts" card (Captured 2026-09-16/17) with the Python and Hermes
identifier sets and the honest-limits caption.

### Scheduler (no claim change)
The compose `scheduler` service was proven OBSOLETE/unbuildable (no scheduler
runtime code anywhere, unbuildable Dockerfile, never ran); the in-process
MissionScheduler is the one live scheduling authority. Neither the matrix nor
the site makes a scheduling claim, so no label changed. Noted here only.

## Untouched (deliberately)
- Claims 4, 11, 13, 21 and the whole playbook/institutional-memory chain:
  Agent E's compounding-loop report had not landed; left exactly as they were
  for the coordinator.
- Claims 2, 3, 5, 6, 7, 8, 12, 15, 18, 20, 22, 23: unchanged statuses; only claim 1's
  evidence column and claim 17's evidence column were extended.

## Files
- [TRUTH_MATRIX.md](sandbox://workspace/ping-overnight/website/TRUTH_MATRIX.md)
- Repo mirror: /home/nolan/projects/ping/research/website-truth-matrix.md (uncommitted, byte-identical)
- Homepage edits: /home/nolan/projects/ping/src/app/page.tsx, src/components/architecture/multi-runtime.tsx, src/app/technology/page.tsx (all uncommitted)
- This summary: [TRUTH-UPDATE-2026-09-16.md](sandbox://workspace/ping-overnight/website/TRUTH-UPDATE-2026-09-16.md)
