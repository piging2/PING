# Agent D Report: Phases 9-10, PING convergence sprint 2026-09-16/17

Date: 2026-09-17 (overnight, MDT). Worktree: `/home/nolan/ping/worktrees/agent-exec` (branch `sprint/agent-exec`, HEAD `5b102c66425a346bd3074df0822b5bed184d13ba`). No commits, no pushes. All code changes are untracked files under `external-agent/` in that worktree. Per Nolan's 20:18 directive, blockers were doubled down on with alternative paths before classification.

Classification vocabulary: VERIFIED, PARTIAL, BLOCKED, BLOCKED_EXTERNAL, FALSIFIED, UNKNOWN.

## Phase 9: first real ExternalAgentAdapter execution

### P9.1 Scoped WorkOrder executed through Hermes: VERIFIED

A real exterior agent executed a real scoped WorkOrder through the file-protocol boundary, and PING recorded canonical evidence itself.

- Task: `task-uppercase-001`, capability `text.transform`, namespace (canonical) `core::owner`, isolation label `test.agent-exec` in correlation/payload.
- WorkOrder ID (deterministic): `0d598aef352b9a8a` = sha256("workorder:task-uppercase-001")[0:16].
- Agent: Hermes v0.21.2, one-shot: `hermes.exe -z <prompt> --safe-mode -t <toolsets> < /dev/null`. Started 2026-09-17T02:23:54Z, ended 02:24:16Z, exit code 0.
- Constraints honored: no network, no writes, no tool use, no canonical events, no mission-state writes.
- Output independently verified PASS (exact uppercase transformation). Result envelope sha256: `f0b021848c2ddc7d6e07b8f8e186c78259454a935153804c7b4c574ec5bb1eed`. Envelope echoed the WorkOrder ID, `agent_id=hermes`, `status=completed`, `error=null`.
- Hermes ran from `C:\Users\nolan` and could not see WSL paths (see P9.2). Input must travel inline in the WorkOrder for Windows-native agents, never by file path.

### P9.2 File-read WorkOrder: FALSIFIED (first attempt), root cause identified

- WorkOrder `754b49476433e566` (task: read `FIXTURE.txt`, sha256 `40cb9b78bf9ea0d3454ba1f96a43cd42e25ff4d4c529c613ff01020ec548486e`).
- First attempt (02:22:10Z-02:23:21Z) returned `completed` with EMPTY content: a false success. This is recorded as a transport failure, not a success.
- Retry with WSL UNC path (02:23:28Z-02:23:38Z) honestly returned `File not found: FIXTURE.txt`.
- Root cause: Windows-native Hermes runs from `C:\Users\nolan`; its file boundary does not reach the WSL scratch directory. This is a real, verified boundary property, now documented in the adapter. It motivated the inline-input fallback that became P9.1.

### P9.3 Canonical evidence for the execution: VERIFIED

PING itself emitted three authenticated events via live POST /events on 2026-09-17 at ~02:25:23Z (Hermes emitted nothing; it never holds the Bearer token):

1. Work order issued: `f326ea70d7cf16ce85c4cc56a23bc147ce0273984023c123b8b5467ea6d507de`
2. Task completed: `e91681bfd300389e9c8f10c7c3ad2f9cea352342bfe6aa71f962d14c764bb587`
3. Evidence recorded: `daaa75fc5b298c5b7fedab679e8bbf8a792099afc779877dd3d8acc7def1bf92`

All HTTP 200, persisted in `ping_events`, type `ENTITY_CREATED`, source `api:muse-level-2`, canonical namespace `core::owner`, payload carrying `test.agent-exec`. Event 1's ID was independently recomputed byte-identical from the live identity rule (eventType + source + namespace + JSON.stringify(timestamp-stripped payload)). Earlier locally predicted IDs (`600dde...`, `4c1cb...`, `1f438...`) are discarded; they used wrong identity assumptions.

### P9.4 Production mission/WorkerRuntime routing edge: PARTIAL

The WorkOrder referenced `mission-agent-exec-001` but no production `ping_missions` row was created, so the chain "PING mission -> WorkerRuntime -> adapter" is not yet production-routed. What is real: external execution + canonical evidence + a reusable adapter module (see Phase 10). No fake mission was created. The adapter now exists precisely to make this wiring safe when the mission path is built.

### P9.5 Codex execution: BLOCKED_EXTERNAL

- Codex native WSL binary exists: `/mnt/c/Users/nolan/.codex/bin/wsl/d52321d8cd5e913f/codex`, `codex-cli 0.154.0-alpha.6.2`. Auth present. Correct invocation: `CODEX_HOME=/mnt/c/Users/nolan/.codex codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>`.
- Real execution blocked by the account usage limit; the API reports retry at 2026-09-17 12:01 AM. A `gpt-5-mini` attempt also failed (unsupported on the ChatGPT plan). No retry was attempted before the stated reset time. This is the one blocker that could not be doubled down on.

### P9.6 OpenCode: BLOCKED

OpenCode desktop exists (`OpenCode.exe`, Electron) but no usable headless CLI was found. No safe invocation path; not pursued further.

### Concurrent live change (not Agent D work)

At 2026-09-17 02:20:25 UTC, another actor changed live `/app/gateway/routes/events.js`: POST /events now goes through `CanonicalizationService` with `authorizeNamespace()` and returns 403 for unauthorized namespaces (the B2 fix). The repo checkout at `099927152` still has the old route; the live container is ahead. Do not attribute this to Agent D.

## Phase 10: capability decision-ownership forensics

### P10.1 Decision map: VERIFIED (file+line evidence, Pig worktree)

For each capability-adjacent component, the exact decision it makes and its owner:

1. `CapabilityResolver.resolve` (`ping-runtime/runtime/capability_resolver.js:62-90`): "Is capability X registered with well-formed provider/secret/dependency metadata?" Read-time validation only, used by `gateway/routes/constitution.js:113-127` for status reporting. NOT an authorization decision.
2. Live `CapabilityAuthority.authorize` (`/app/gateway/capability_authority.js:230`): "May agent A invoke capability C with parameters P in workspace W?" Fail-closed on unknown agents, profile allowlist check, workspace/repo containment, canonical-repo write denial, path containment (`_isPathContained`, :96), write-capability gating (`_isWriteCapability`, :125). Agent profiles hardcoded at :185-217 (`muse` level 1, `muse-level-2` level 2). Wired live at `gateway_runtime.js:416-418` with Filesystem/Commit/Patch/Repository authorities as prerequisites (:431-440). This IS execution-time capability authorization, live since 2026-09-15.
3. `ExteriorAuthMiddleware` (live `gateway_runtime.js:420-421`): "Is this Bearer token a valid active exterior agent?" Sets `req.authenticatedAgent`. Credential validity + principal identity.
4. `CanonicalizationService.authorizeNamespace` (`ping-runtime/canonicalization/canonicalization_service.js:76-83`): "May source S emit into namespace N?" Enforced on POST /ingest and, as of tonight's live fix, POST /events.
5. Live `WorkerRuntime.dispatch` (`/app/ping-runtime/workers/worker_runtime.js:69-93`): "Which registered workers handle event E?" Selection rule `entry.eventTypes.length > 0 && includes(eventType)` plus concurrency guard. Routing, not authorization.
6. `FilesystemAuthority` (`gateway/filesystem_authority.js:17`): despite the name, a repository compiler/scanner (`compile`, `_scanRepository`, `getFiles`). Makes NO authorization decision. No live callers.
7. `CommitAuthority` (`gateway/commit_authority.js:20,68`): `commitPatch`/`pushCommit` perform commits; an effector, not an authorizer. Only called by build scripts. "May commit" has no code owner but is not reachable from any live request path.
8. `PatchAuthority` (`gateway/patch_authority.js:30,582`): `verifyPatchHash`, a verification primitive called by `patch_authority_v2.js`.
9. TypeScript `CapabilityAuthority` (`runtime/kernel/capabilities/capability-authority.ts`): dormant; the only file referencing it is itself. No gateway/ping-runtime caller.
10. External-agent policy (Nolan's standing grant): policy input to work orders. The issuance decision ("may PING delegate capability C to agent A under constraints K?") was procedural tonight, owned by the issuer. This was the one reachable decision without a code owner.

### P10.2 "CapabilityAuthority = missing_implementation": FALSIFIED as an absolute claim

The overnight ledger (`docs/CAPABILITY_AUTHORITY_LEDGER_2026-09-16.md`) and `authorities/registry.yaml:33-38` classify it `missing_implementation`. That is true only of the current branch tree. The implementation EXISTS: live in the container (`/app/gateway/capability_authority.js`, 870+ lines, mtime 2026-09-15 15:04) and in git on `remotes/windows-preserve/constitutional-convergence-v2` at `43a6cd2e4` ("gateway: commit the live exterior-agent authorization boundary", 2026-09-12), which is NOT an ancestor of current HEAD (`099927152`). Corrected status: implemented live and on the preserve branch, absent from the `constitutional-convergence-v2` tree. The registry classification needs a tree-relative correction, not new code.

### P10.3 Minimum authority implemented: VERIFIED

The reachable decision lacking exactly one owner was #10: "may PING issue work order W delegating capability C to external agent A under constraints K?" The live `CapabilityAuthority.authorize` covers agent-initiated invocation via POST /capabilities; it does not cover PING-initiated delegation. These are distinct decisions, so a minimal issuance authority does not duplicate it.

Implemented in the isolated worktree (`worktrees/agent-exec/external-agent/`, uncommitted):

- `external_agent_adapter.js`: `AGENT_PROFILES` (data, mirroring the live authority's profile shape: hermes, codex, opencode with allowlists and blocks), `authorizeWorkOrder()` (the one owned decision, fail-closed: unknown agent, unlisted capability, external block, non-canonical namespace, loosened constraints, or missing event/mission-state prohibitions all deny), `issueWorkOrder()` (deterministic ID, throws on denial), `verifyResultEnvelope()` (schema + ID echo + status; failure is worker failure, retryable:false), `canonicalEventId()` (byte-compatible with the live identity rule).
- `WORKORDER_SCHEMA.json`, `RESULT_SCHEMA.json`: the two envelopes.
- `BOUNDARY.md`: the exact adapter surface, transport commands, namespace rule, and the precise external boundary (agent must not emit canonical events, write mission state, touch event storage, decide promotion, or self-assert identity).
- `external_agent_adapter.test.js`: 18 assertions, all passing on the Pig (node 22), covering determinism of the live WorkOrder ID `0d598aef352b9a8a`, eight fail-closed denial paths, envelope construction, result validation, and the canonical-ID rule (determinism, timestamp-invariance, payload- and namespace-sensitivity).

### Namespace alignment: PARTIAL

Canonical emission requires `core::<name>`/`tenant::<id>`; the requested `test.agent-exec` is not a valid canonical namespace. Execution isolation was preserved in the WorkOrder/correlation/payload (`sprint-2026-09-16`, `test.agent-exec`), and canonical events persisted under `core::owner`. The adapter now requires canonical namespaces at issuance and carries test isolation in payload/correlation instead. No canonicalization rule was bypassed.

## Operational note for the coordinator

My cloud VM and the Pig see different `/home/nolan` filesystems. Early in this turn I wrote adapter files via the cloud-side tools and they landed on the cloud VM, not the Pig worktree; the test then failed on the Pig. All writes were redone through the sanctioned Pig channel (`ssh -F ~/.ssh/pig-config pigwsl 'wsl -d Ubuntu -- bash -s'`), and all 18 tests pass there. Future agents should write to the Pig worktree exclusively through that channel and never assume cloud-side `/home/nolan` is the repo.

## Open items / recommended follow-ups

- Retry Codex execution after 2026-09-17 12:01 AM (its hard read-only sandbox is the preferred transport when quota returns).
- Wire `ExternalAgentAdapter` into `MissionRuntime`/mission issuance so Phase 9.4 becomes VERIFIED instead of PARTIAL. The module is ready; the wiring needs a real mission type.
- Correct the `CapabilityAuthority` status in `authorities/registry.yaml` and the ledger to tree-relative wording (implemented live + preserve branch, absent from current tree).
- Agent A (or whoever) owns the live B2 fix should confirm it is committed somewhere durable; the live container is ahead of the repo.
