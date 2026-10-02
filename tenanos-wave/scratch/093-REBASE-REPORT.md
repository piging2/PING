# P-20260923-093 Evidence Rebase Report (worker R1)

Date: 2026-09-24. Verifier: worker R1 (093 evidence rebase).
Branch under test: `tenanos-wave-gateway/integration` on the Pig
(`/home/nolan/ping`), ref `870069ca72c604bb8435543f45287b476aca36f0`
(merge commit, 2026-09-23 21:46 MDT).
Method: `git show <ref>:<path>` and `git grep` against the ref only.
The shared working tree was never consulted.

## Verdict: NOT BLOCKED, rebased

The mechanism does not depend on the phantom file beyond comments and
evidence strings. `fail-closed-guard.ts` is pure logic over the diff's own
registry; the test file's `FakeCapabilityServer` is a self-contained
hostile-environment model whose guard assertions (dispatch deny, inner-status
rule, timeout-to-UNKNOWN, reconcile-first, late-result discard, auditOrHalt)
hold regardless of what the real authority looks like. No mechanism logic was
changed. All changes are comment/evidence-string rebases plus a version bump
(`2026-09-23.1` -> `2026-09-24.1-rebased` in both modules).

Deliverable: [P-20260923-093.rebased.diff](../diffs/P-20260923-093.rebased.diff)
(full corrected diff, same 3 files, 38 registry entries, hunk counts verified).

## The divergence, confirmed

- `gateway/capability_authority.js`: MISSING on the branch (re-confirmed via
  `git cat-file -e`).
- `routes/capabilities.js` and `gateway/routes/capabilities.js`: MISSING.
  No `POST /capabilities`, no `GET /discover` capability catalog anywhere.
- `bootstrap/gateway_runtime.js`: MISSING; the file is
  `gateway/bootstrap/gateway_runtime.js` (exists, 892 lines).
- The branch's real tool plane:
  - `gateway/tool_authority.js` (388 lines): `executeTool` at line 134,
    returns a flat `{success, error}` envelope, throws
    `Error('Tool not found' / 'Tool not permitted')`. Four default tools
    registered: `file-read` (:192), `file-write` (:209), `code-search` (:230),
    `artifact-query` (:251). `_fileReadImplementation` (:283) and
    `_fileWriteImplementation` (:295) are placeholders. No idempotency dedup,
    no timeout, no audit sink anywhere in the file.
  - `gateway/tool_gateway.js` (494 lines): `executeTool` at line 102, throws
    `TOOL_NOT_FOUND` / `TOOL_VALIDATION_FAILED` / `TOOL_EXECUTION_FAILED`
    via the failure authority, returns a constitutional result plus witness.
    No dedup, no timeout, no audit sink.
- Also missing on the branch: `authorize()`, `deniedPaths`, `maxFileSize`,
  `_routeGit`, `_routeExecution`, and every `CAPABILITY_UNKNOWN` /
  `AGENT_UNKNOWN` / `CAPABILITY_REVOKED` / `EXECUTION_DISABLED` /
  `NOT_IMPLEMENTED` error code. The agent profiles `muse` / `muse-level-2`
  have zero matches on the branch (they are the registry's own role model).

## Changed citations

### tool-classification.ts header and interface

BEFORE: "Source of truth: SWARM-04 TOOL-CLASSIFICATION.md (2026-09-23),
code-level evidence against the single CapabilityAuthority
(/home/nolan/ping-gateway-src/gateway/capability_authority.js)."

AFTER: provenance restated as SWARM-04 observed against snapshot 43a6cd2e4
(UNVERIFIED-ON-BRANCH), plus a branch-verified description of the actual
plane (tool_authority.js:134 executeTool, default tools at :192/:209/:230/:251,
tool_gateway.js:102) and an explicit list of what does not exist on the branch.
Evidence: `git cat-file -e` MISSING checks + `git show` line reads above.

BEFORE: `/** Agent profiles / roles granted this tool. Empty = nobody. */`

AFTER: same plus a NOTE that `muse`/`muse-level-2` are not branch concepts
(zero `git grep` matches on the ref) and that the branch permission model is
mission/authority-scoped (`gateway/tool_authority.js:109-122`).

### CAPABILITIES block header

BEFORE: "The 21 advertised capabilities (POST /capabilities, GET /discover).
Evidence: routes/capabilities.js GET /discover (lines 94-421); execution:
capability_authority.js execute() (line 438)."

AFTER: "The 20 SWARM-04-classified capabilities (the original header said 21,
but the table lists 20; observed against snapshot 43a6cd2e4; POST
/capabilities and GET /discover do not exist on this branch, so the whole
block is UNVERIFIED-ON-BRANCH). Retained as a fail-closed registry..."
(the 21-vs-20 miscount is itself a corrected evidence bug).

### Per-entry evidence (capability plane)

| id | before (phantom) | after | branch verification |
|---|---|---|---|
| fs.list | capability_authority.js:534 _scanRepository | UNVERIFIED-ON-BRANCH; closest: tool_authority.js:192 file-read; filesystem_authority.js:110 _scanRepository is a compile-cache scanner, not a capability | `git show` filesystem_authority.js:110; tool_authority.js:192 |
| fs.read | capability_authority.js:382 deniedPaths/authorize()/maxFileSize | UNVERIFIED-ON-BRANCH; tool_authority.js:192 file-read; _fileReadImplementation (:283) is a placeholder with no size gate; no authorize()/maxFileSize/deniedPaths on branch; _checkToolPermission fails OPEN without a permission authority (:109-113) | grep deniedPaths/maxFileSize: zero matches; `git show` ta.js:283, :109-113 |
| fs.write | capability_authority.js:~593 writeFileSync non-atomic | UNVERIFIED-ON-BRANCH; tool_authority.js:209 file-write; _fileWriteImplementation (:295) placeholder; no writeFileSync/atomicity evidence | `git show` ta.js:295 |
| fs.patch | capability_authority.js:605 createPatch(parameters) vs patch_authority_v2.js:273 | UNVERIFIED-ON-BRANCH (phantom caller gone); signature VERIFIED: gateway/patch_authority_v2.js:273 createPatch(missionId, agentId, patchData) | `git show` pa.js:273, exact signature match |
| repo.inspect | capability_authority.js:723 getRepositoryRoot | UNVERIFIED-ON-BRANCH; branch-verified: gateway/repository_authority.js:165 getRepositoryRoot(repoId) | `git show` repository_authority.js:165 |
| git.status | capability_authority.js:633 getGitStatus | UNVERIFIED-ON-BRANCH; branch-verified: gateway/simple_git_adapter.js:73 getStatus() (adapter, not capability) | `git show` simple_git_adapter.js:73 |
| git.diff | capability_authority.js:638 simpleGit.diff() | UNVERIFIED-ON-BRANCH; simple_git_adapter.js exposes no diff method | method list grep: getRemoteUrl/getCurrentBranch/getRecentCommits/getStatus/isAvailable only |
| git.log | capability_authority.js:645 simpleGit.log | UNVERIFIED-ON-BRANCH; closest: simple_git_adapter.js:55 getRecentCommits | `git show` simple_git_adapter.js:55 |
| git.branch | capability_authority.js:655-661 drift claim | UNVERIFIED-ON-BRANCH; drift claim not re-verifiable (caller gone); schemaDrift kept on SWARM-04 provenance | no branch() method in simple_git_adapter.js |
| git.checkout | capability_authority.js:665 checkout | UNVERIFIED-ON-BRANCH; no checkout method in simple_git_adapter.js | method list grep |
| git.commit | capability_authority.js:672-673 git add . + commit | UNVERIFIED-ON-BRANCH; closest: gateway/commit_authority.js:174-175 placeholder ("in production, use actual git add") | `git show` commit_authority.js:174-175 |
| git.push | capability_authority.js:678 _routeGit throw | UNVERIFIED-ON-BRANCH; policy cross-ref: CAPABILITY-MATRIX default-deny + §1.3/§1.4 prohibitions (see cli.git-push) | doc verified present locally 2026-09-24 |
| process.list | capability_authority.js:741 executeListComponents | UNVERIFIED-ON-BRANCH; branch-verified: ping-runtime/runtime/runtime_registry.js:140 executeListComponents | `git show` rr.js:140 |
| service.inspect | capability_authority.js:743 executeResolveComponent | UNVERIFIED-ON-BRANCH; branch-verified: ping-runtime/events... no: ping-runtime/runtime/runtime_registry.js:123 executeResolveComponent | `git show` rr.js:123 |
| logs.read | discover NOT_IMPLEMENTED / throws "Unknown capability" | UNVERIFIED-ON-BRANCH; no logs.read capability or NOT_IMPLEMENTED marker verifiable; kept disabled | `git grep` for the codes: zero matches |
| knowledge.search | capability_authority.js:759 knowledgeGraph.queryNodes | UNVERIFIED-ON-BRANCH; branch-verified: ping-runtime/knowledge/knowledge_graph.js:167 queryNodes | `git grep` knowledge_graph.js:167 |
| event.search | capability_authority.js:762 unifiedEventRuntime.query | UNVERIFIED-ON-BRANCH; branch-verified: ping-runtime/events/unified_event_runtime.js:224 query | `git grep` unified_event_runtime.js:224 |
| command.run | capability_authority.js:778 _routeExecution throw | UNVERIFIED-ON-BRANCH; no _routeExecution or policy-scoping code on branch | `git grep` _routeExecution: zero matches |
| test.run | capability_authority.js:778 same throw | UNVERIFIED-ON-BRANCH; no branch-verified execution plane | same as above |
| build.run | capability_authority.js:778 same throw | UNVERIFIED-ON-BRANCH; no branch-verified execution plane | same as above |

Notes also adjusted for fs.read (no size gate on branch), fs.patch
(no discover catalog on branch), git.branch (no catalog claim to trust on
this branch).

### HTTP_SURFACES (all branch-verified, path + lines corrected)

BEFORE (all entries): `bootstrap/gateway_runtime.js mounts without auth
(lines 788-891)` plus block comment claiming `exteriorAuthMiddleware`
absence and `Pig binds 0.0.0.0:8080`.

AFTER: path corrected to `gateway/bootstrap/gateway_runtime.js`; per-entry
mount lines: /tenants:688, /deployments:689, /runtime:690, /context:684,
/system:686, /api/v1/repository:685, /constitution:706, /ops:763,
/governance:777, /ai-workspace:781, /reviews:784, /customers:787,
/projects:790. Auth absence verified: `_setupMiddleware` installs only
express.json + a CORS logger (lines 116-125); zero auth-middleware
references in the file or in any `gateway/routes/*.js`. Listen is 0.0.0.0
(line 820; 8080 is the documented deployment port from
CAPABILITY-MATRIX-2026-09-23.md topology, not branch code). Route verbs
cross-verified in each route file (e.g. tenants.js:19/58/66/72 for POST
register, PUT /:id, DELETE /:id, POST /:id/heartbeat; deployments.js:69/77/85
for complete/fail/rollback; reviews.js:18/81; customers.js:24/164/47/73;
projects.js:20/61; ai_workspace.js:22/35/51/64/77). The LIVE claim
(GET /tenants -> HTTP 200 unauthenticated, 2026-09-23) is kept as an
operational observation, explicitly not re-verifiable from the ref.

### WORKER_CLI (doc verified present locally; section anchors added)

All 8 entries were already plausible; anchors added and two glosses corrected:
- cli.test: doc says generic "test runners" (§1.7 TESTER), not "jest/vitest";
  hermetic + scratch DB (PIG ping-test-pg) + kill-switch VERIFIED at §1.7.
- cli.curl-plane: "Class A receipted" flagged as the registry's gloss;
  read-only probes VERIFIED at §1.10, Class A at §1.9.
- cli.ssh: "human-operated only; workers never hold it" DERIVED from
  default-deny (§1 preamble: "Every role starts with NOTHING") plus the fact
  that no role lists SSH; §5.1 documents the access mechanics.
- cli.git-mirror (§1.3: clone/fetch/pull unauthenticated, content-addressed,
  "writes are idempotent fetches"), cli.git-push (default-deny + §1.3
  "pushing to any remote" + §1.4 "git push" prohibited), cli.build (§1.4:
  "bounded builds (npm run build, tsc, etc.) with wall-clock and CPU/memory
  caps, inside the worktree"), cli.docker-read (§1.10: logs/inspect/events;
  PROHIBITED: restart, exec-write), cli.psql-select (§1.10: "SELECT-only,
  whitelisted read queries (counts, latest timestamps, ledger versions). No
  direct writes, ever.") all VERIFIED against the doc text.

### INTERNAL

BEFORE: `activities/ (mission, replay, repository, compiler, knowledge,
reflection): in-process only, no exterior route`.

AFTER (branch-verified): `gateway/activities/index.js` exports exactly those
six activities; sole consumer is `gateway/bootstrap/wiring.js:141`
(activitiesPath of the in-process TemporalRuntime); no exterior route mounts
activities. Verified via `git show` on both files.

### fail-closed-guard.ts (comment-only premise rebases)

- PERMANENT_FAILURE_CODES: noted the codes come from the SWARM-04 envelope
  model (UNVERIFIED-ON-BRANCH); the branch throws
  `Error('Tool not found' / 'Tool not permitted')` instead
  (tool_authority.js:134-146).
- normalizeEnvelope docstring: E3 premise relabeled as SWARM-04-observed /
  UNVERIFIED-ON-BRANCH; branch returns flat `{success:false, error}` or
  throws; the guard's inner-status rule is deliberately shape-agnostic.
- withTimeout docstring: E4 relabeled; verified it holds on the branch too
  (no deadline in either executeTool).
- auditOrHalt docstring: E6 corrected — the branch's execute paths have NO
  audit sink at all (verified zero audit references in both files), which is
  worse than the best-effort observation; halt-on-sink-failure still correct.

### test file (premise-comment rebases; no logic changed)

- File header: FakeCapabilityServer now labeled as a SWARM-04-semantics model
  (UNVERIFIED-ON-BRANCH) with a per-premise branch-status table:
  E1 HOLDS, E2 PARTIAL (branch executionId is a deterministic canonical hash
  of {tool_id, timestamp} via deprecated deterministicIdAuthority,
  tool_authority.js:148, so same-tick re-delivery can collide by a different
  mechanism), E3 NOT branch-verified, E4 HOLDS, E5 HOLDS as a principle,
  E6 NOT branch-verified (no audit sink at all on the branch).
- Fake request-id comment: branch analog documented.
- E6 audit comment in the fake: corrected to "no audit sink at all on the
  branch (worse than best-effort)".
- Test 06: title changed to "the modeled fs.read size gate holds"; comment
  rewritten — no authorize()/maxFileSize/deniedPaths on the branch,
  _fileReadImplementation is a placeholder, and _checkToolPermission fails
  OPEN without a permission authority (:109-113). Assertion changed from
  matching /client-supplied parameters\.size/ to /UNVERIFIED-ON-BRANCH/
  (matches the rebased fs.read evidence).
- Tests 07 and 09: nested-envelope shape relabeled as SWARM-04-observed /
  UNVERIFIED-ON-BRANCH; guard rule noted as shape-agnostic.
- Test 10: added the branch-verified per-dispatch permission check
  (tool_authority.js:142-146) with the fail-open caveat (:109-113).

## Dropped entries

None. All 38 entries were kept and rescoped rather than dropped, because:
(1) the registry-completeness test requires >20 entries and all six effect
classes represented (still holds: 13/5/1/5/8/6 across the six classes);
(2) the falsification harnesses address entries by id (`fs.write`, `fs.read`,
`fs.list`, `git.branch`); dropping them would break the tests and weaken the
fail-closed posture; (3) every entry now carries either a branch-verified
grounding or an explicit UNVERIFIED-ON-BRANCH mark, so nothing is presented
as verified that is not. The fail-closed default (unclassified -> deny) is
unchanged, and the UNVERIFIED entries keep their conservative classifications
from SWARM-04 provenance.

## Why not BLOCKED

The task's BLOCKED condition was: the mechanism depends on the phantom file
beyond comments. It does not:
- The guard functions (`dispatch`, `normalizeEnvelope`, `retryAfter`,
  `withTimeout`, `AttemptTracker`, `auditOrHalt`) operate only on the
  diff's own registry data and on response shapes they normalize generically.
- The classification table is self-contained data; its ids are referenced by
  the diff's own test file, not by branch code.
- The FakeCapabilityServer models hostile semantics for the guard to defeat;
  its premises being UNVERIFIED-ON-BRANCH changes what the fake proves about
  the branch, not whether the guard logic is correct.
- The one test assertion that depended on a phantom-cited evidence string
  (test 06 matching /client-supplied parameters\.size/) was rebased to match
  the corrected evidence.

## New failure classes

Recorded in [failures-R1.md](failures-R1.md):
- FC-R1-001: fail-open permission check on the branch tool plane
  (`_checkToolPermission` allows ALL when no permission authority is set).
- FC-R1-002: audit gap is worse than E6 (no audit sink at all in either
  execute path).
- FC-R1-003: phantom-snapshot evidence divergence (process class: evidence
  cited against a commit that is not an ancestor of the integration branch).
