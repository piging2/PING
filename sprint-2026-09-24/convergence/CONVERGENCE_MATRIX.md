# Convergence matrix — 24h swarm, 2026-09-25
Synthesized by the swarm coordinator from lane artifacts in
~/workspace/sprint-2026-09-24/convergence/. Lane docs are the evidence;
this matrix is the adjudication.

## Rows

### IDENTITY
- CURRENT IMPLEMENTATION: kernel identity + product identity, both live.
- LIVE CALLERS: gateway bootstrap/runtime path.
- CANONICAL AUTHORITY: split; kernel carries a twin.
- DUPLICATES: kernel identity twin.
- HARVEST CANDIDATES: none.
- MISSING SEAM: kernel twin retirement.
- TESTS: exist.
- DECISION: keep both layers; converge by retiring one kernel twin.

### TENANT
- CURRENT IMPLEMENTATION: three parallel — live JS binder (`ping-runtime/canonicalization/namespace_binding.js`, hardcoded `tenant::hpp`), TS tenant kit (wave branch, zero live callers), journal gateway `fyd-site:<tenant>` convention.
- LIVE CALLERS: JS binder only.
- CANONICAL AUTHORITY: none.
- DUPLICATES: 3 implementations + 5 competing tenant-ID regexes; wave branch not an ancestor of HEAD (fixes landed on both lines).
- HARVEST CANDIDATES: TS kit ideas.
- MISSING SEAM: `resolveTenantContext(req)` primitive; authenticated principal (zero `req.user`/`req.principal` anywhere); `tenant_id` on `ping_missions`; per-tenant vector parameterization.
- TESTS: harness-proven only; nothing runs live.
- DECISION: hold; converge on `resolveTenantContext` before tenant #2. TenantRegistry unauthenticated write surface is a LIVE DEFECT; `/missions/stats` unscoped is known-unresolved. (Evidence: TENANTOS_CONVERGENCE_MAP.md)

### OBJECTS
- CURRENT IMPLEMENTATION: kernel + product object models.
- LIVE CALLERS: gateway runtime, FYD pipeline.
- CANONICAL AUTHORITY: per layer, coherent.
- DUPLICATES: none found.
- HARVEST CANDIDATES: none.
- MISSING SEAM: kernel consolidated object files' wiring status (open question).
- TESTS: exist.
- DECISION: keep.

### RELATIONSHIPS
- CURRENT IMPLEMENTATION: product has two follow stores.
- LIVE CALLERS: product.
- CANONICAL AUTHORITY: undecided.
- DUPLICATES: two follow stores.
- HARVEST CANDIDATES: none.
- MISSING SEAM: single-writer decision (needs owner word).
- TESTS: exist.
- DECISION: converge onto one follow store.

### EVENTS
- CURRENT IMPLEMENTATION: UnifiedEventRuntime; `ping_events` canonical store; `event_id` logical identity; exactly one live dispatch route.
- LIVE CALLERS: gateway, journal.
- CANONICAL AUTHORITY: UnifiedEventRuntime.
- DUPLICATES: none live.
- HARVEST CANDIDATES: CRX event/replay doctrine as comparison only.
- MISSING SEAM: none.
- TESTS: exist.
- DECISION: keep. No competing envelope.

### EVIDENCE
- CURRENT IMPLEMENTATION: kernel evidence authority (in live gateway path, not unwired); product evidence grading.
- LIVE CALLERS: gateway bootstrap, FYD pipeline.
- CANONICAL AUTHORITY: per layer.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: product evidence-grade owner (open question).
- TESTS: exist.
- DECISION: keep.

### CAPABILITIES
- CURRENT IMPLEMENTATION: capability resolver loading `gateway/generated/capability_registry.json`; orchestration 8.3MB registry copy referenced by no .js file.
- LIVE CALLERS: capability resolver.
- CANONICAL AUTHORITY: CapabilityAuthority (existing).
- DUPLICATES: dead orchestration copy (archive candidate, not delete).
- HARVEST CANDIDATES: CRX permission-matrix concept mapped onto CapabilityAuthority (no second permissions system).
- MISSING SEAM: none.
- TESTS: exist.
- DECISION: keep; archive the dead copy. Permission matrix extends CapabilityAuthority minimally or not at all.

### MISSIONS
- CURRENT IMPLEMENTATION: kernel MissionRuntime/MissionScheduler live; Mission Control has NO missions concept (only marketing mentions).
- LIVE CALLERS: kernel scheduler.
- CANONICAL AUTHORITY: kernel.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: Mission Control operational missions; first mission per Batch 2 = SOURCE REFRESH / FYD REGENERATION.
- TESTS: kernel tests exist.
- DECISION: keep kernel; wire MC missions per MISSION_CONTROL_SURFACE.md plan.

### RUNS
- CURRENT IMPLEMENTATION: MissionRuntime/MissionScheduler/WorkerRuntime.dispatch; run owns one worktree keyed by (agent_id, run_id); Gate 2 attempt identity decided.
- LIVE CALLERS: scheduler.
- CANONICAL AUTHORITY: MissionRuntime.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: `ping_missions.result` fiction unverified — do not trust run history until verified.
- TESTS: exist.
- DECISION: keep, with the run-history caveat.

### EXECUTION
- CURRENT IMPLEMENTATION: Python ExecutionAuthority spine; effect_reconciler live with typed FAILED/UNKNOWN outcomes; probe-only-local-ledger.
- LIVE CALLERS: mission execution path.
- CANONICAL AUTHORITY: ExecutionAuthority.
- DUPLICATES: none.
- HARVEST CANDIDATES: Orka fenced-attempt / clean-room publication patterns.
- MISSING SEAM: reaper-vs-HOLD design word (needs Nolan); reaper does not honor advisory HOLD.
- TESTS: exist.
- DECISION: keep; converge HOLD semantics per ORCA_HOLD_CONVERGENCE.md after the design word.

### AGENTS
- CURRENT IMPLEMENTATION: agent routes in MC are 404/staging-only; providers (Copilot/Hermes/Goose/OpenCode/Ollama/Codex) not inventoried.
- LIVE CALLERS: none in MC.
- CANONICAL AUTHORITY: none yet.
- DUPLICATES: unknown.
- HARVEST CANDIDATES: CRX agent-permissions doctrine; Orka runtime/session patterns.
- MISSING SEAM: provider inventory lane is DONE (PROVIDER_INVENTORY.md). Contract freeze still needs the open questions answered (see §5).
- TESTS: none yet.
- DECISION: hold remains. Freeze the minimal AgentTask/AgentResult only after the 6 OPEN fields get evidence and the gap questions resolve.

### KNOWLEDGE
- CURRENT IMPLEMENTATION: derived projections only; no canonical knowledge store.
- LIVE CALLERS: retrieval paths.
- CANONICAL AUTHORITY: objects/relationships/evidence (sources), not knowledge.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: retrieval contract (Lane 5 design closes it).
- TESTS: n/a.
- DECISION: hold; knowledge stays derived.

### GITHUB
- CURRENT IMPLEMENTATION: none. Two design docs (2026-09-23) + thin REST skill.
- LIVE CALLERS: none.
- CANONICAL AUTHORITY: n/a (GitHub is source evidence, never truth).
- DUPLICATES: none.
- HARVEST CANDIDATES: libgit2 + partial-clone mechanism; D3 connector enums.
- MISSING SEAM: the entire adapter; needs named owners for signature trust-anchor, webhook secret custody, tenant-to-repo authority before implementation.
- TESTS: 16-test gauntlet designed, not run.
- DECISION: design complete (GITHUB_INGESTION_ADAPTER.md); implement with an assigned writer when owners are named.

### WEBSITE INGESTION
- CURRENT IMPLEMENTATION: FYD deterministic acquisition (verified product work).
- LIVE CALLERS: FYD pipeline.
- CANONICAL AUTHORITY: FYD acquisition seam.
- DUPLICATES: none.
- HARVEST CANDIDATES: Crawl4AI as commodity behind a wrapper (do not embed crawler servers in trusted core).
- MISSING SEAM: none known.
- TESTS: exist.
- DECISION: keep. FYD lane owns; no convergence rewrite without proven benefit.

### SITE GENERATION
- CURRENT IMPLEMENTATION: FYD compiler (SiteSpec IR -> deterministic renderer), main lane in progress.
- LIVE CALLERS: demo servers.
- CANONICAL AUTHORITY: FYD compiler.
- DUPLICATES: none.
- HARVEST CANDIDATES: schema-driven UI patterns (compact spec, deterministic render).
- MISSING SEAM: none in scope.
- TESTS: being built by main lane.
- DECISION: keep. Hands off the main lane.

### MEDIA
- CURRENT IMPLEMENTATION: product media selection in compiler; no rights/source-policy field yet.
- LIVE CALLERS: FYD pipeline.
- CANONICAL AUTHORITY: FYD media selection.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: rights metadata, derived-asset provenance, hotlink enforcement (#27 epic).
- TESTS: partial.
- DECISION: keep; MEDIA PIPELINE epic queued (BACKLOG_FALSIFICATION.md). Batch 2 media policy binds: no assumed authorization to copy/rehost demo media.

### ASK FYD
- CURRENT IMPLEMENTATION: `POST /api/fyd/ask` live, evidence-bounded, returns draft proposals + suggestedActions.
- LIVE CALLERS: Ask panel (note: `/api/fyd/ask` route absent in fyd-object-build while panel posts to it — gap).
- CANONICAL AUTHORITY: ask pipeline.
- DUPLICATES: none.
- HARVEST CANDIDATES: none.
- MISSING SEAM: rate/abuse guard (#32 epic); hostile suite A-J must run before visitor Ask opens (Batch 2).
- TESTS: exist (ask suite).
- DECISION: keep; run hostile suite; ship guard before public exposure.

### MISSION CONTROL
- CURRENT IMPLEMENTATION: `/mission-control` serves technology projection UI; 6/7 `/api/mc` routes 404 (code in uncommitted staging only); journal gateway + proposal/approval routes live.
- LIVE CALLERS: technology probes, ask pipeline, owner panels.
- CANONICAL AUTHORITY: none yet (projection surface).
- DUPLICATES: technology-vs-5-tab fork at `/mission-control`.
- HARVEST CANDIDATES: external Mission Control UX patterns (task queues, approval queues, event streams) as patterns only.
- MISSING SEAM: reconcile the fork; opportunities + receipts read-models; durable needs-authority queue.
- TESTS: 55 contract tests in ping-ui-contract.
- DECISION: implement the wiring plan (MISSION_CONTROL_SURFACE.md) with a single writer after adjudication. Journal is the single integration point.

### RECONCILIATION
- CURRENT IMPLEMENTATION: effect reconciler live (typed outcomes); ORCA UNKNOWN-PARK proposal (plan only).
- LIVE CALLERS: execution path.
- CANONICAL AUTHORITY: effect reconciler (live); ORCA proposal pending.
- DUPLICATES: H1/H2/H3/H4 hold representations (to converge).
- HARVEST CANDIDATES: H2 boolean-flag representation; H4 effect-layer events; H3 pre/post-boundary classifier.
- MISSING SEAM: reaper-vs-HOLD word; release vocabulary; event taxonomy.
- TESTS: SIGKILL crash-proof suite (H3, landed).
- DECISION: converge on UNKNOWN-PARK after Nolan's design word. No second scheduler.

### FRONTEND
- CURRENT IMPLEMENTATION: 16 inventoried; REAL: ping-ui-contract, fyd-build renderer, FYD family/tokens, mission-control staging; BROKEN: uilane2, phase24-ui; ABSENT: ui-next, all of TenantOS.
- LIVE CALLERS: demo servers, MC staging.
- CANONICAL AUTHORITY: none (foundation proposed).
- DUPLICATES: uilane2/ui-next lineage (delete-vs-salvage needs Nolan's word).
- HARVEST CANDIDATES: token pipeline + contrast gate, family primitives, lane-b evidence chrome, ObjectCircle/Card/Node, approval phase machine, truth labels.
- MISSING SEAM: frontend auth/session everywhere; command palette; generic component library; capability-invocation contract.
- TESTS: 55 contract tests; jest proofs on evidence chrome.
- DECISION: converge on typed ping-ui-contract-style packages; product composition stays product-specific.

### PROTOCOL ADAPTERS
- CURRENT IMPLEMENTATION: none dedicated.
- LIVE CALLERS: none.
- CANONICAL AUTHORITY: n/a.
- DUPLICATES: none.
- HARVEST CANDIDATES: MCP as external agent/tool interface (NOT canonical authority).
- MISSING SEAM: none named by a product need.
- TESTS: n/a.
- DECISION: hold. No new adapters until a product need names one.

## Cross-cutting notes
- Lane 9 falsification: 49 proposals -> 5 PROVEN CURRENT DEFECT, 22 PROVEN MISSING TEST, 12 ALREADY IMPLEMENTED, 1 DUPLICATE, 4 NICE-TO-HAVE, 3 FUTURE, 2 SUPERSEDED, 0 INVALID. 12 promoted candidates in 9 epics (meets the ~12 bar). NOTHING added to the canonical backlog; promotion awaits the product/constitutional call.
- 15 verified-real items already owned by the approved compiler plan (Phases 0/2/4/9): no new backlog items needed.
- Coordinator corrections issued during the run: (1) CRX checkout exists (lane 5's absence claim retracted in-doc); (2) Pig SSH works (two lanes' unreachability claims corrected; retry-before-UNKNOWN rule broadcast).
- Power: Pig on AC throughout (baseline 20:01 MDT, rechecks ~20:05 and 20:08 MDT, all `PowerOnline=True`). Q4 policy holds.
