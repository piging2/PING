# ORCA PHANTOM REGISTRY — Wave 1, Lane C5

Scope: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`, SHA
`cc6856c3bc78e0535e66f168c66dc31abee2c073`, 17 dirty files, READ-ONLY) and
`/home/nolan/crx/app` (not a git repo; no SHAs available). Inspected 2026-09-23 ~19:30-20:35 MDT.

Rule applied per finding (capability/authority/ownership/behavior test): a
specialization, adapter, worker, or compatibility layer is NOT a duplicate. A
finding counts as phantom only if two implementations independently exercise the
same capability or define competing truth, or the code claims behavior that no
call path can produce.

All classifications are CLASSIFICATION ONLY. No deletions, no edits, no git
mutations were performed. Deletion is a later integration decision.

---

## PHANTOMS (classify DELETE / MERGE / WIRE)

### P-1 — `WorkerPort.execute()` is unreachable; executor is always null
- Repo/file: `/home/nolan/ping`, `ping-runtime/orchestration/execution/worker_port.js`
  (lines 51, 118-126, 198/222/241)
- Claimed: worker ports execute missions through an injected executor.
- Reality: `this._executor = config.executor || null`; every subclass defaults
  `executor: config.executor || null`. The single production registration
  (`ping-runtime/orchestration/execution/engine.js:93-96`) passes
  `executor: null` explicitly. A grep across the whole repo (excluding
  node_modules/.git/worktrees) finds ZERO production callers of
  `WorkerPort.execute()` — and `ExecutionEngine.dispatchToAssignment()` never
  calls `.execute()` at all (it builds a prompt, stores a prompt artifact, and
  returns the prompt to a completion handler). Calling it would return
  `{ error: 'no_executor', confidence: 0, findings: [] }`.
- Evidence of deadness: zero callers; null-executor default at every
  construction site; dispatch path bypasses execute entirely.
- **CLASSIFY: DELETE** — the `execute()` method and the executor constructor
  wiring. KEEP the registry/health/state-machine methods (`findAvailable`,
  `listAll`, `getStats`, `transition`, `canTransition`) that engine.js actually uses.

### P-2 — Second `WorkerPort` claiming the same single authority
- Repo/file: `/home/nolan/ping`, `ping-runtime/agents/worker_port.js`
- Claimed: header says "Constitutional Port ... Constitutional Constraint:
  Single worker authority for all worker operations."
- Reality: a second `WorkerPort` class coexists with
  `orchestration/execution/worker_port.js`. It has ZERO `require()` callers
  anywhere in the repo, and its header references `CustomWorkerProvider
  (current)` — a provider class that does not exist in the repo (only
  self-reference in the comment). It can independently define worker-execution
  truth but nothing can ever reach it.
- Evidence of deadness: zero requirers; referenced provider nonexistent.
- **CLASSIFY: DELETE.**

### P-3 — Fabricated autonomous loop that nothing runs
- Repo/file: `/home/nolan/ping`, `gateway/continuous_reflection_loop.js`
  (321 lines)
- Claimed: header — "Continuous Reflection Loop Ω.25 ... The runtime literally
  learns from itself. Constitutional Constraint: Every replay triggers
  reflection, which produces new objects and missions."
- Reality: zero instantiations and zero `require()` callers repo-wide. Fully
  written, never constructed, never started.
- Evidence of deadness: only self-reference in the repo.
- **CLASSIFY: DELETE.**

### P-4 — Competing `IdentityAuthority` implementations in live paths
- Repo/files: `/home/nolan/ping`,
  `gateway/constitutional-dist/identity-authority.js` (compiled) vs
  `ping-runtime/authorities/identity_authority.js` (source, extends
  `KernelIdentityAuthority` from `runtime/kernel/authorities/identity_authority.js`).
- Claimed: one canonical deterministic ID-generation authority.
- Reality: TWO independently exercisable ID generators are live.
  `gateway/routes/identities.js`, `gateway/social_ingest_adapter.js`, and
  `gateway/knowledge_ingest_adapter.js` require the COMPILED
  `gateway/constitutional-dist/identity-authority.js`, bypassing the kernel
  authority entirely. Separately, `ping-runtime/authorities/identity_authority.js`
  is required by ping-runtime/gateway modules (agent_memory_authority.js,
  distributed_desktop_agents.js, transaction_boundary.js, etc.). Additionally
  `runtime/constitutional/dist/` is a SECOND compiled copy (72K) with ZERO
  requirers. The two dist builds differ (distinct md5s).
- Evidence of competing truth: both generate IDs in production code paths;
  which one "owns" ID generation depends on the caller, not on any declared
  authority. Committed `dist/` output required directly by live routes violates
  the declared source-owned authority.
- **CLASSIFY: MERGE** — converge all callers onto one source-owned authority;
  treat `dist/` as build output (regenerated, not committed/required directly);
  delete the unrequired `runtime/constitutional/dist/` tree.

### P-5 — Dead duplicate `WitnessAuthority`
- Repo/file: `/home/nolan/ping`, `gateway/replay/kernel/witness_authority.js`
- Claimed: a witness authority variant.
- Reality: zero `require()` callers. Near-duplicate (197 vs 191 lines,
  different hash) of the live `runtime/kernel/authorities/witness_authority.js`,
  which is the kernel source that `gateway/witness_authority.js` extends and
  that runtime/kernel consumers require.
- Evidence of deadness: zero requirers.
- **CLASSIFY: DELETE.**

### P-6 — Dead worker-port subclasses
- Repo/file: `/home/nolan/ping`,
  `ping-runtime/orchestration/execution/worker_port.js`
  (`OllamaWorkerPort`, `DevinWorkerPort`)
- Claimed: alternative worker backends (Ollama, Devin).
- Reality: zero instantiations repo-wide. Only `OpenCodeWorkerPort` is ever
  constructed (engine.js:93).
- Evidence of deadness: zero `new` call sites.
- **CLASSIFY: DELETE** (`OllamaWorkerPort`, `DevinWorkerPort` only; keep
  `OpenCodeWorkerPort` and `WorkerPortRegistry`).

### P-7 — `startAutonomousLoop()` fabricates mission resolutions (mock success path)
- Repo/file: `/home/nolan/ping`,
  `ping-runtime/orchestration/execution/engine.js:579-648`
- Claimed: runs an autonomous loop that dispatches missions and resolves them
  via workers; exposed as live HTTP endpoint `POST /orchestration/engine/loop`
  ("Trigger autonomous loop", `gateway/routes/orchestration.js:272`).
- Reality: for each "dispatched" mission it fabricates worker output inline:
  `findings: [{ file: mission.target || 'x', line: 0, bypass_type:
  'auto_scan', confidence: 0.85 }]`, `confidence: 0.85`. No worker runs, no
  prompt is executed, no LLM is called. It then feeds these synthetic outputs
  through `collectWorkerOutput` and the real consensus machinery, so dashboard
  closure rates (`closureRate`, `missionClosureRate`) are computed over
  fabricated completions. This is the 2026-09-18 forensic finding ("dashboard
  closure outputs synthetically fabricated"), verified verbatim in current source.
- Evidence: hardcoded literal `0.85` and `'auto_scan'` in the method body; no
  execution path between dispatch and the synthetic `collectWorkerOutput` call.
- **CLASSIFY: DELETE** — the synthetic self-resolution block and the
  `/engine/loop` endpoint surface until (and unless) it is wired to real worker
  execution. This is a live fabrication surface, not merely dead code.

### P-8 — Debug leftover executed on import (CRX)
- Repo/file: `/home/nolan/crx/app`, `main.py` (module level, after
  `create_event`)
- Claimed behavior: none; it is a stray statement.
- Reality: `print(app.routes)` runs at import time, dumping the full route
  table to stdout on every process start.
- Evidence: present in module scope of a 94-line file, clearly a debug
  artifact (CRX is a 121-line FastAPI event store).
- **CLASSIFY: DELETE.**

---

## KEEP LIST — looks duplicated but legitimately separated

- **K-1: Two schedulers.** `ping-runtime/orchestration/mission_scheduler.js`
  (Core v1 bridge MissionRuntime ↔ WorkerRuntime; wired into
  `gateway/routes/mission_control.js`; cited in the 2026-09-18 audit evidence,
  which already recorded "AUTHORITY CONFLICT: Could compete with
  MissionScheduler for orchestration authority") vs
  `ping-runtime/orchestration/execution/scheduler.js` (ORCA engine assignment
  over WorkerPortRegistry). Different substrates, different consumers. KEEP
  with boundary stated; revisit at the Orca-vs-live-spine convergence decision.
- **K-2: Two `CapabilityRegistry` classes.** `ping-runtime/connectors/
  capability_registry.js` (connector capability contracts — email/calendar/
  OAuth; used by `gateway/bootstrap/gateway_runtime.js`) vs
  `ping-runtime/orchestration/execution/capability_registry.js` (ORCA worker
  capability index; used by engine.js). Different data, different consumers.
  KEEP.
- **K-3: `gateway/witness_authority.js` vs
  `runtime/kernel/authorities/witness_authority.js`.** The gateway class
  `extends KernelWitnessAuthority` — a legitimate specialization layer over
  the kernel source. KEEP.
- **K-4: ORCA `Scheduler` (execution/scheduler.js).** A real assignment
  algorithm (capability matching, load balancing, consensus scheduling). KEEP.
- **K-5: `ping-runtime/orchestration/dashboard.js`.** Genuine aggregation over
  graph/queue/certifier inputs; no hardcoded numbers. KEEP with caveat: its
  velocity metrics measure an engine that never executes (P-1/P-7).
- **K-6: The ORCA ExecutionEngine subsystem as a whole.** It IS wired into
  production (`gateway/bootstrap/gateway_runtime.js:339-341` initializes it;
  `/orchestration` routes mount when it initializes). And the in-repo
  DOC-CONTRACT at `gateway_runtime.js:326-336` explicitly keeps it as a
  "parallel execution authority, NOT the production spine" with
  `discoverOllama` intentionally false "until an explicit Orca-vs-live-spine
  convergence decision is made." Nolan prohibited deleting ORCA. The engine
  itself is KEEP; the phantoms are the fabricated/dead paths inside it (P-1,
  P-6, P-7).
- **K-7: `ping-runtime/ai/ollama_provider.js` vs
  `orchestration/execution/ollama_provider.js`.** The former is the live-spine
  inference provider owned by AIRuntime; the latter is ORCA worker discovery,
  deliberately disabled by the DOC-CONTRACT. KEEP with that boundary.
- **K-8: `WorkerPortRegistry.findBest()`** — zero external callers, but it is
  a method on a live class (registry API surface), not an independent
  mechanism. Leave to the later integration pass (low value).

---

## Context (verified, not in mandated scope, no action)

- Autonomy-challenge "PHANTOM: canonical run identity and attempt identity"
  refers to `orca-remediation/orca_control_loop.js` v1 (RUN_ID used as
  identity), fixed in v2 via record-before-dispatch (M-3). Lives in
  `/home/nolan/workspace`, outside the mandated repos.
- The "falsified orca-cli README (MCP/DAG/claiming)" from the CRX campaign's
  orchestrator-survey refers to the CRX campaign's own orca-cli scaffold, not
  the real `alex2481kobe/orca` Go binary at
  `~/workspace/crx-autonomous-missions/repos/orca`, which DOES contain
  `internal/mcp/` in source. No in-scope README falsification found
  (`runtime/README.md` is a stub title).

---

## Inspection count

~35 source files read (full or significant segments), ~20 bounded grep sweeps
across `/home/nolan/ping` (excluding node_modules/.git/worktrees) and the
full `/home/nolan/crx/app` (all 121 lines of application code). Zero-caller
verification done per finding via repo-wide `require`/`new` greps.

## Open questions / blockers

1. CRX `db.py` `DATABASE_URL` value was un-verifiable from this channel (the
   Pig wrapper redacted it in output). Not a phantom — flagged so the value
   is not mis-cited.
2. `/home/nolan/crx` has no git repository — findings there carry file paths
   only, no SHAs.
3. The 17 dirty files on `refactor/runtime-authority-convergence` were not
   individually examined (read-only constraint); classifications are on the
   working tree as found.
4. `findBest()` (worker_port.js:289) has zero callers — left for the later
   integration pass as low-value dead API surface.
