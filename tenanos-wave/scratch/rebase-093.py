#!/usr/bin/env python3
"""Rebase P-20260923-093 evidence citations onto tenanos-wave-gateway/integration."""
import re, sys

SRC = '/home/hatch/workspace/tenanos-wave/diffs/P-20260923-093.diff'
DST = '/home/hatch/workspace/tenanos-wave/diffs/P-20260923-093.rebased.diff'

with open(SRC) as f:
    raw = f.read()

# Split into per-file sections at 'diff --git' boundaries.
parts = re.split(r'(?m)^(?=diff --git )', raw)
header_pre = parts[0]  # '' (file starts with diff --git)
file_secs = [p for p in parts[1:] if p.startswith('diff --git')]
assert len(file_secs) == 3, f'expected 3 files, got {len(file_secs)}'

def section_info(sec):
    m = re.search(r'^diff --git a/(\S+) b/(\S+)$', sec, re.M)
    path = m.group(1)
    # content lines start with '+'; headers do not
    lines = sec.split('\n')
    content = []
    hdr = []
    in_body = False
    for ln in lines:
        if ln.startswith('@@'):
            in_body = True
            continue
        if not in_body:
            hdr.append(ln)
        else:
            if ln.startswith('+'):
                content.append(ln[1:])
            elif ln == '':
                continue  # trailing newline artifact
            else:
                raise AssertionError(f'unexpected body line in {path}: {ln!r}')
    return path, hdr, content

files = {}
for sec in file_secs:
    path, hdr, content = section_info(sec)
    files[path] = (hdr, content)

def sub(path, old, new):
    hdr, content = files[path]
    text = '\n'.join(content)
    n = text.count(old)
    assert n == 1, f'{path}: expected 1 match, got {n} for: {old[:80]!r}'
    files[path] = (hdr, ('\n'.join(content)).replace(old, new).split('\n'))

TC = 'src/tenanos/tool-safety/tool-classification.ts'
GD = 'src/tenanos/tool-safety/fail-closed-guard.ts'
TS = 'src/tenanos/__tests__/tool-safety-side-effects.test.ts'

# ---------------- tool-classification.ts ----------------
sub(TC,
""" * Typed registry of tool/callable side-effect semantics for autonomous workers.
 * Source of truth: SWARM-04 TOOL-CLASSIFICATION.md (2026-09-23), code-level
 * evidence against the single CapabilityAuthority
 * (/home/nolan/ping-gateway-src/gateway/capability_authority.js).
 *
 * Standing law encoded here:""",
""" * Typed registry of tool/callable side-effect semantics for autonomous workers.
 * Source of truth: SWARM-04 TOOL-CLASSIFICATION.md (2026-09-23), observed
 * against snapshot 43a6cd2e4 (UNVERIFIED-ON-BRANCH; see evidence strings).
 *
 * The branch's actual tool plane (tenanos-wave-gateway/integration) is
 * gateway/tool_authority.js (executeTool at line 134; default tools file-read /
 * file-write / code-search / artifact-query registered at lines 192 / 209 /
 * 230 / 251) plus gateway/tool_gateway.js (executeTool at line 102).
 * There is NO capability_authority.js, NO routes/capabilities.js, NO
 * GET /discover catalog, and NO authorize()/deniedPaths/maxFileSize gate on
 * this branch. Evidence strings below are either branch-verified (file:line on
 * the integration ref) or explicitly marked UNVERIFIED-ON-BRANCH.
 *
 * Standing law encoded here:""")

sub(TC, "export const CLASSIFICATION_VERSION = '2026-09-23.1';",
        "export const CLASSIFICATION_VERSION = '2026-09-24.1-rebased';")

sub(TC,
"""  /** Agent profiles / roles granted this tool. Empty = nobody. */
  grantedTo: readonly string[];""",
"""  /**
   * Agent profiles / roles granted this tool. Empty = nobody.
   * NOTE: 'muse' / 'muse-level-2' are the registry's own role model (from
   * SWARM-04 provenance); they are not branch concepts (zero matches on the
   * integration ref). The branch permission model is mission/authority-scoped
   * (gateway/tool_authority.js:109-122), and fails OPEN when no permission
   * authority is configured.
   */
  grantedTo: readonly string[];""")

sub(TC,
"""/**
 * The 21 advertised capabilities (POST /capabilities, GET /discover).
 * Evidence: routes/capabilities.js GET /discover (lines 94-421);
 * execution: capability_authority.js execute() (line 438).
 */""",
"""/**
 * The 20 SWARM-04-classified capabilities (the original header said 21, but the
 * table lists 20; observed against snapshot 43a6cd2e4; POST /capabilities and
 * GET /discover do not exist on this branch, so the whole block is
 * UNVERIFIED-ON-BRANCH). Retained as a fail-closed registry:""")

sub(TC,
"    evidence: 'capability_authority.js:534 _scanRepository; no writes',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no fs.list capability exists on this branch. Closest: gateway/tool_authority.js:192 registers file-read; gateway/filesystem_authority.js:110 _scanRepository is a compile-cache scanner, not a capability dispatch.',")

sub(TC,
"      'capability_authority.js:382 deniedPaths enforced in authorize(); maxFileSize gate keys on client-supplied parameters.size (understatable)',",
"      'UNVERIFIED-ON-BRANCH: no fs.read capability; closest is gateway/tool_authority.js:192 (file-read). Branch _fileReadImplementation (tool_authority.js:283) is a placeholder with no size gate; no authorize()/maxFileSize/deniedPaths exists on the branch. _checkToolPermission fails OPEN without a permission authority (tool_authority.js:109-113).'")

sub(TC,
"      'Size gate is client-asserted, not server-measured. REFACTOR: stat the file server-side.',",
"      'UNVERIFIED-ON-BRANCH: no size gate exists on the branch; _fileReadImplementation is a placeholder. REFACTOR (if a real read path lands): stat the file server-side.'")

sub(TC,
"      'capability_authority.js:~593 fs.writeFileSync non-atomic; blind overwrite, no expected-hash/version precondition',",
"      'UNVERIFIED-ON-BRANCH: no fs.write capability; closest is gateway/tool_authority.js:209 (file-write). Branch _fileWriteImplementation (tool_authority.js:295) is a placeholder: no writeFileSync evidence, no atomicity or expected-hash precondition on the branch.'")

sub(TC,
"      'capability_authority.js:605 calls patchAuthority.createPatch(parameters) but the real signature is createPatch(missionId, agentId, patchData) (patch_authority_v2.js:273): every call throws TypeError',",
"      'UNVERIFIED-ON-BRANCH: no fs.patch capability; the phantom caller (capability_authority.js:605) does not exist on this branch. Branch-verified: gateway/patch_authority_v2.js:273 createPatch(missionId, agentId, patchData).'")

sub(TC,
"'Advertised-but-broken: discover claims IMPLEMENTED. Catalog LIES; fails closed in practice.',",
"      'Advertised-but-broken per SWARM-04 (UNVERIFIED-ON-BRANCH: no discover catalog and no fs.patch caller on this branch). Retained: UNKNOWN -> fail closed.'")

sub(TC,
"    evidence: 'capability_authority.js:723 repositoryAuthority.getRepositoryRoot',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no repo.inspect capability. Branch-verified: gateway/repository_authority.js:165 getRepositoryRoot(repoId) (authority method, not a capability route).',")

sub(TC,
"    evidence: 'capability_authority.js:633 commitAuthority.getGitStatus',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no git.status capability. Branch-verified: gateway/simple_git_adapter.js:73 getStatus() (adapter method, not a capability route).',")

sub(TC,
"    evidence: 'capability_authority.js:638 simpleGit.diff()',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no git.diff capability; gateway/simple_git_adapter.js exposes no diff method.',")

sub(TC,
"    evidence: 'capability_authority.js:645 simpleGit.log({maxCount})',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no git.log capability. Closest: gateway/simple_git_adapter.js:55 getRecentCommits(limit) (adapter method, not a capability route).',")

sub(TC,
"""      'capability_authority.js:655-661 gitBranchInstance.branch() called with NO arguments: LISTS branches. Discover advertises "Create Git branch".',""",
"""      'UNVERIFIED-ON-BRANCH: no git.branch capability on this branch; the catalog-vs-implementation drift claim (phantom capability_authority.js:655-661) cannot be re-verified because the caller does not exist on the branch. schemaDrift retained on SWARM-04 provenance.',""")

sub(TC,
"""      'Currently effect-free, but any worker reasoning "I created branch X" reasons from a lie. Treat catalog claim as untrusted.',""",
"""      'UNVERIFIED-ON-BRANCH: no git.branch capability on this branch, so there is no catalog claim to trust here; retained on SWARM-04 provenance as UNKNOWN.',""")

sub(TC,
"      'capability_authority.js:665 gitCheckoutInstance.checkout(parameters.branch); discover marks destructiveBehavior: true',",
"      'UNVERIFIED-ON-BRANCH: no git.checkout capability; gateway/simple_git_adapter.js exposes no checkout method.'")

sub(TC,
"      'capability_authority.js:672-673 git add . (ENTIRE worktree) + commit(message); duplicate request -> duplicate commits (distinct hashes)',",
"""      'UNVERIFIED-ON-BRANCH: no git.commit capability. Closest: gateway/commit_authority.js:174-175 is a placeholder ("in production, use actual git add"); no branch-verified worktree-commit dispatch.'""")

sub(TC,
"""      'capability_authority.js:678 _routeGit throws "not yet implemented with promotion authorization"; discover: DISABLED, executionPermitted: false',""",
"""      'UNVERIFIED-ON-BRANCH: no git.push capability. Policy: CAPABILITY-MATRIX-2026-09-23.md default-deny (§1 preamble "Every role starts with NOTHING") + §1.3 PROHIBITED EFFECTS ("pushing to any remote") + §1.4 ("git push" prohibited); see cli.git-push.',""")

sub(TC,
"    evidence: 'capability_authority.js:741 runtimeRegistry.executeListComponents',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no process.list capability. Branch-verified: ping-runtime/runtime/runtime_registry.js:140 executeListComponents (registry method, not a capability route).',")

sub(TC,
"    evidence: 'capability_authority.js:743 runtimeRegistry.executeResolveComponent',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no service.inspect capability. Branch-verified: ping-runtime/runtime/runtime_registry.js:123 executeResolveComponent.',")

sub(TC,
"""    evidence: 'discover: NOT_IMPLEMENTED, executionPermitted: false; no route case -> throws "Unknown capability"',""",
"""    evidence:
      'UNVERIFIED-ON-BRANCH: no logs.read capability and no NOT_IMPLEMENTED marker verifiable on this branch. Retained: UNKNOWN -> fail closed (KEEP disabled).',""")

sub(TC,
"    evidence: 'capability_authority.js:759 knowledgeGraph.queryNodes',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no knowledge.search capability. Branch-verified: ping-runtime/knowledge/knowledge_graph.js:167 queryNodes.',")

sub(TC,
"    evidence: 'capability_authority.js:762 unifiedEventRuntime.query',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no event.search capability. Branch-verified: ping-runtime/events/unified_event_runtime.js:224 query.',")

sub(TC,
"""    evidence: 'capability_authority.js:778 _routeExecution throws "not yet implemented with policy scoping"',""",
"""    evidence:
      'UNVERIFIED-ON-BRANCH: no command.run capability; no _routeExecution or policy-scoping code on this branch. KEEP disabled until policy scoping exists.',""")

sub(TC,
"    evidence: 'capability_authority.js:778 same throw; when implemented, hermetic test runs are reversible (ephemeral scratch)',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no test.run capability; no branch-verified execution plane for it. KEEP disabled until policy scoping exists.',")

sub(TC,
"    evidence: 'capability_authority.js:778 same throw',",
"    evidence:\n      'UNVERIFIED-ON-BRANCH: no build.run capability; no branch-verified execution plane for it. KEEP disabled until policy scoping exists.',")

sub(TC,
"""/**
 * Unauthenticated HTTP mutation surfaces (fail-open) on the gateway.
 * Evidence: bootstrap/gateway_runtime.js mounts lines 788-891 with NO
 * exteriorAuthMiddleware; no global auth middleware exists. Pig binds 0.0.0.0:8080.
 * GET /tenants live-verified unauthenticated (HTTP 200, 2026-09-23).
 * This is the wave's P0 tool-safety finding; reported, not silently diffed.
 */""",
"""/**
 * Unauthenticated HTTP mutation surfaces (fail-open) on the gateway.
 * Evidence (branch-verified on tenanos-wave-gateway/integration):
 * gateway/bootstrap/gateway_runtime.js mounts the routers with NO auth
 * middleware (verified: _setupMiddleware installs only express.json and a
 * CORS logger, lines 116-125; zero auth-middleware references in the file
 * or in any gateway/routes/*.js). Listens on 0.0.0.0 (line 820; 8080 is the
 * documented deployment port per CAPABILITY-MATRIX-2026-09-23.md topology,
 * not branch code). Mount lines: /context:684 /api/v1/repository:685
 * /system:686 /tenants:688 /deployments:689 /runtime:690 /constitution:706
 * /ops:763 /governance:777 /ai-workspace:781 /reviews:784 /customers:787
 * /projects:790 (degraded 503 stubs when PG is unavailable, :694-702).
 * GET /tenants unauthenticated -> HTTP 200 was live-verified 2026-09-23
 * against a running gateway (operational observation, not re-verifiable
 * from the ref).
 * This is the wave's P0 tool-safety finding; reported, not silently diffed.
 */""")

sub(TC,
"""      'bootstrap/gateway_runtime.js mounts without auth; LIVE: GET /tenants -> HTTP 200 no auth (2026-09-23)',""",
"""      'gateway/bootstrap/gateway_runtime.js:688 mounts without auth (verified: no auth middleware in file or any route file); gateway/routes/tenants.js:19/58/66/72 (POST register, PUT /:id, DELETE /:id, POST /:id/heartbeat). LIVE: GET /tenants -> HTTP 200 no auth (2026-09-23, operational observation).',""")

def sub_nth(path, old, new_list):
    """Replace identical repeated strings in file order, one replacement each."""
    hdr, content = files[path]
    text = '\n'.join(content)
    n = text.count(old)
    assert n == len(new_list), f'{path}: expected {len(new_list)} matches, got {n}'
    for new in new_list:
        text = text.replace(old, new, 1)
    files[path] = (hdr, text.split('\n'))

# File order: deployments, runtime, reviews, customers, projects, ai-workspace
sub_nth(TC,
"    evidence: 'bootstrap/gateway_runtime.js mounts without auth (lines 788-891)',",
[
"    evidence: 'gateway/bootstrap/gateway_runtime.js:689 mounts without auth; gateway/routes/deployments.js:69/77/85 (POST /:id/complete, /:id/fail, /:id/rollback).',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:690 mounts without auth; gateway/routes/runtime.js:20 (POST register), :79 (POST heartbeat).',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:784 mounts without auth; gateway/routes/reviews.js:18 (POST /sync), :81 (POST /:id/reply).',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:787 mounts without auth; gateway/routes/customers.js:24 (POST /import), :164 (POST /), :47 (POST /:id/sync-email), :73 (POST /:id/sync-calendar).',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:790 mounts without auth; gateway/routes/projects.js:20 (POST /), :61 (POST /:id/artifacts).',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:781 mounts without auth; gateway/routes/ai_workspace.js:22/35/51/64/77 (POST /sentiment, /tag, /parse, /translate, /summarize).',",
])

sub(TC,
"    evidence: '/context, /system, /api/v1/repository mount without auth; full method audit deferred to swarm-15 (red team)',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:684 (/context), :686 (/system), :685 (/api/v1/repository) mount without auth; full method audit deferred to swarm-15 (red team)',")

sub(TC,
"    evidence: '/ops, /governance, /constitution: no auth observed at mount; needs per-route audit',",
"    evidence: 'gateway/bootstrap/gateway_runtime.js:763 (/ops), :777 (/governance), :706 (/constitution): no auth observed at mount; needs per-route audit',")

sub(TC,
""" * Worker CLI tools (capability-matrix classes, not the gateway).
 * Evidence: ~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md section 1.
 */""",
""" * Worker CLI tools (capability-matrix classes, not the gateway).
 * Evidence: ~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md
 * section 1 (doc verified present locally 2026-09-24; section anchors added
 * per entry below).
 */""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: git fetch/clone/pull unauthenticated; content-addressed mirror cache, re-fetch is a no-op',",
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.3 GITHUB_INGESTER: clone/fetch/pull unauthenticated with conditional requests; cache content-addressed, writes are idempotent fetches.',")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: git push PROHIBITED for all roles',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: default-deny posture (§1 preamble "Every role starts with NOTHING"); §1.3 PROHIBITED EFFECTS ("pushing to any remote"); §1.4 IMPLEMENTER PROHIBITED EFFECTS ("git push").',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: npm run build, tsc; bounded, worktree-scoped, wall-clock + resource caps',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.4 IMPLEMENTER: bounded builds ("npm run build", "tsc", etc.) with wall-clock and CPU/memory caps, inside the worktree.',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: jest/vitest; hermetic, scratch DB only (ping-test-pg), kill-switch',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.7 TESTER: test runners with strict timeouts and resource caps; each run hermetic (fresh scratch DB); kill-switch on timeout; scratch DBs only (PIG ping-test-pg). Doc names generic test runners, not jest/vitest.',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: docker logs/inspect/events; docker restart/exec-write PROHIBITED',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10 OBSERVABILITY_WORKER: docker logs, docker inspect, docker events; PROHIBITED: restarts ("docker restart"), exec with write effects.',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: curl to plane endpoints; health/metrics; Class A receipted',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10: read-only CLI probes (docker, curl, psql SELECT); §1.9: observe/verify is Access Class A. ("Class A receipted" is the registry gloss.)',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: psql SELECT whitelisted; counts/timestamps; no direct writes ever',",
"""    evidence: 'CAPABILITY-MATRIX-2026-09-23.md §1.10 OBSERVABILITY_WORKER: SELECT-only, whitelisted read queries (counts, latest timestamps, ledger versions); no direct writes, ever. §1.7: scratch DBs only.',""")

sub(TC,
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: ssh (Pig/Oracle hops); human-operated only; workers never hold it',",
"    evidence: 'CAPABILITY-MATRIX-2026-09-23.md: no role lists SSH (default-deny §1 preamble); §5.1 documents SSH access mechanics (key auth via pig-config, oracle-ssh.sh). Derived: workers never hold it; human-operated only.',")

sub(TC,
"    evidence: 'activities/ (mission, replay, repository, compiler, knowledge, reflection): in-process only, no exterior route',",
"    evidence: 'gateway/activities/index.js exports exactly six activities (mission, replay, repository, compiler, knowledge, reflection); sole consumer is gateway/bootstrap/wiring.js:141 (activitiesPath of the in-process TemporalRuntime); no exterior route mounts activities',")

# ---------------- fail-closed-guard.ts ----------------
sub(GD, "export const GUARD_VERSION = '2026-09-23.1';",
        "export const GUARD_VERSION = '2026-09-24.1-rebased';")

sub(GD,
"""/** Codes that mark a failure as permanent: retrying is pointless, not just unsafe. */""",
"""/** Codes that mark a failure as permanent: retrying is pointless, not just unsafe.
 * NOTE: these codes come from the SWARM-04 envelope model (snapshot 43a6cd2e4,
 * UNVERIFIED-ON-BRANCH); the branch's plane throws Error('Tool not found: ...')
 * / Error('Tool not permitted: ...') instead (gateway/tool_authority.js:134-146).
 * The guard treats any coded failure in this set as permanent regardless of origin. */""")

sub(GD,
""" * Normalize a raw capability response into a typed Outcome.
 * Fixes E3 (nested status envelope): the observed execute() returns
 * {status:'ok', result:{status:'error', error, code:'CAPABILITY_EXECUTION_ERROR'}}
 * over HTTP 200. Any client reading the top-level status reads failure as
 * success. The INNER result status decides; the outer envelope is transport.""",
""" * Normalize a raw capability response into a typed Outcome.
 * Fixes E3: the SWARM-04-observed execute() (snapshot 43a6cd2e4,
 * UNVERIFIED-ON-BRANCH) returned
 * {status:'ok', result:{status:'error', error, code:'CAPABILITY_EXECUTION_ERROR'}}
 * over HTTP 200. The branch's own plane (gateway/tool_authority.js:134) returns
 * a flat {success:false, error} envelope and throws on unknown/not-permitted
 * tools, so the nested shape is not branch-verified — but the guard must stay
 * shape-agnostic regardless. Any client reading the top-level status reads
 * failure as success. The INNER result status decides; the outer envelope is
 * transport.""")

sub(GD,
" * Fixes E4 (no timeout in the execute path).",
" * Fixes E4 (no timeout in the execute path — holds on this branch too: neither gateway/tool_authority.js:134 nor gateway/tool_gateway.js:102 sets a deadline).")

sub(GD,
""" * caller MUST halt, never silently fall back to an in-memory buffer that dies
 * with the process (fixes E6: audit is best-effort, not a ledger).""",
""" * caller MUST halt, never silently fall back to an in-memory buffer that dies
 * with the process (fixes E6: the branch's execute paths have NO audit sink at
 * all — verified zero audit references in gateway/tool_authority.js and
 * gateway/tool_gateway.js — so the SWARM-04 best-effort-with-memory-fallback
 * observation is UNVERIFIED-ON-BRANCH; either way, no ledger means halt).""")

# ---------------- test file ----------------
sub(TS,
""" * The FakeCapabilityServer reproduces the OBSERVED execute() semantics:
 * nested error envelope over HTTP 200 (E3), derived request IDs that
 * collide within one tick (E2), no idempotency-key dedup (E1), no timeout
 * (E4), best-effort audit with in-memory fallback (E6).""",
""" * The FakeCapabilityServer reproduces the SWARM-04-OBSERVED execute()
 * semantics (snapshot 43a6cd2e4, UNVERIFIED-ON-BRANCH — capability_authority.js
 * does not exist on tenanos-wave-gateway/integration). Branch-status of each
 * premise against the real plane (gateway/tool_authority.js:134 executeTool,
 * gateway/tool_gateway.js:102):
 *   E1 no idempotency-key dedup ............ HOLDS on branch (no dedup logic)
 *   E2 derived request IDs collide ......... PARTIAL: branch executionId is a
 *       deterministic canonical hash of {tool_id, timestamp} (deprecated
 *       deterministicIdAuthority, tool_authority.js:148) — same-tick
 *       re-delivery can collide, via a different mechanism than the fake's
 *       weak hash
 *   E3 nested error envelope over HTTP 200 .. NOT branch-verified: branch
 *       returns flat {success:false, error} or throws Error('Tool not found'
 *       / 'Tool not permitted'); the nested shape is UNVERIFIED-ON-BRANCH
 *   E4 no timeout in the execute path ....... HOLDS on branch
 *   E5 a dropped connection proves nothing . HOLDS as a general principle
 *   E6 best-effort audit w/ memory fallback . NOT branch-verified: the branch
 *       execute paths have NO audit sink at all (worse than best-effort)
 * The harnesses test the GUARD's logic, which is premise-agnostic; the fake
 * is a hostile-environment model, not a claim about the branch.""")

sub(TS,
"  /** Reproduces E2: requestId = derived hash, NOT unique, NOT a dedup key. */",
"""  /**
   * Models E2 (UNVERIFIED-ON-BRANCH): requestId = derived hash, NOT unique, NOT
   * a dedup key. Branch analog: executionId = deprecated
   * deterministicIdAuthority.generateIdFromObject({tool_id, timestamp})
   * (gateway/tool_authority.js:148) — deterministic, so same-tick re-delivery
   * collides.
   */""")

sub(TS,
"""    // E6: on ANY audit failure the authority console.logs and keeps an
    // in-memory array. Reproduced here as a throw for the audit probe.""",
"""    // E6 (UNVERIFIED-ON-BRANCH): on ANY audit failure the SWARM-04-observed
    // authority console.logged and kept an in-memory array. Reproduced here as
    // a throw for the audit probe. On the branch there is no audit sink at all
    // (worse than best-effort).""")

sub(TS,
"""test('06 oversized-response (control): the existing fs.read size gate holds', () => {
  // Faithful replica of the documented gate: authorize() denies when the
  // client-asserted parameters.size exceeds the profile maxFileSize.""",
"""test('06 oversized-response (control): the modeled fs.read size gate holds', () => {
  // Model of the SWARM-04-documented gate (UNVERIFIED-ON-BRANCH): authorize()
  // denied when the client-asserted parameters.size exceeded the profile
  // maxFileSize. On this branch NO such gate exists: no authorize() /
  // maxFileSize / deniedPaths anywhere, and _fileReadImplementation
  // (gateway/tool_authority.js:283) is a placeholder with no size check —
  // while _checkToolPermission fails OPEN when no permission authority is
  // configured (:109-113). The test below exercises a client-side replica
  // only; the registry records the gate as UNVERIFIED-ON-BRANCH.""")

sub(TS,
"""  // The registry records the gate as client-asserted (the known weakness).
  const c = classify('fs.read');
  expect(c!.effectClass).toBe('READ_ONLY');
  expect(c!.evidence).toMatch(/client-supplied parameters\\.size/);""",
"""  // The registry records the gate as UNVERIFIED-ON-BRANCH (see evidence).
  const c = classify('fs.read');
  expect(c!.effectClass).toBe('READ_ONLY');
  expect(c!.evidence).toMatch(/UNVERIFIED-ON-BRANCH/);""")

sub(TS,
"""test('07 tool-lies: legacy reads {ok, result:{error}} as success; guarded reads FAILED', () => {
  // Byte-faithful shape of the observed execute() failure path.""",
"""test('07 tool-lies: legacy reads {ok, result:{error}} as success; guarded reads FAILED', () => {
  // Byte-faithful shape of the SWARM-04-observed execute() failure path
  // (snapshot 43a6cd2e4, UNVERIFIED-ON-BRANCH). The branch's own plane
  // (gateway/tool_authority.js:134) returns flat {success:false, error} or
  // throws — the guard's inner-status rule is deliberately shape-agnostic.""")

sub(TS,
"""  // LEGACY: the denial is wrapped in {status:'ok'} -> reads as success.
  const l = await legacyExecute(server, req, { retries: 0, timeoutMs: 100 });
  expect(l.verdict).toBe('SUCCESS'); // VIOLATION: shows E3's blast radius on the deny path""",
"""  // LEGACY: the denial is wrapped in {status:'ok'} -> reads as success
  // (E3-shaped wrap, UNVERIFIED-ON-BRANCH).
  const l = await legacyExecute(server, req, { retries: 0, timeoutMs: 100 });
  expect(l.verdict).toBe('SUCCESS'); // VIOLATION: shows the E3-shaped blast radius on the deny path""")

sub(TS,
"""  // GUARDED: the lookup is consulted per dispatch; the revoked capability
  // now resolves to a denied classification.""",
"""  // GUARDED: the lookup is consulted per dispatch; the revoked capability
  // now resolves to a denied classification. The per-dispatch check the
  // GUARDED mode models IS branch-verified: gateway/tool_authority.js:142-146
  // runs _checkToolPermission on every executeTool call — with the caveat that
  // it fails OPEN when no permission authority is configured (:109-113).""")

# ---- Emit the rebased diff ----
out = []
for path in ['src/tenanos/tool-safety/tool-classification.ts',
             'src/tenanos/tool-safety/fail-closed-guard.ts',
             'src/tenanos/__tests__/tool-safety-side-effects.test.ts']:
    hdr, content = files[path]
    # drop trailing empty artifact lines from content
    while content and content[-1] == '':
        content.pop()
    n = len(content)
    out.append(f'diff --git a/{path} b/{path}')
    out.append('new file mode 100644')
    out.append('--- /dev/null')
    out.append(f'+++ b/{path}')
    out.append(f'@@ -0,0 +1,{n} @@')
    out.extend('+' + ln for ln in content)
out.append('')
with open(DST, 'w') as f:
    f.write('\n'.join(out))
print('wrote', DST)
