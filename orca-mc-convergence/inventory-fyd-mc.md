# Phase 0 inventory — Reader 2/3: FYD repo / Mission Control / pipelines (delivered 2026-09-26 ~19:11 MDT)

Scope note: /home/nolan/projects/ping does not exist in this sandbox; reader surveyed ~/workspace (PING repo, github.com/piging2/PING, branch fyd/builder-rebuild-v1, HEAD 85faad1). Live Mission Control routes (/api/mc/*) exist only on the Pig (branch fyd/sprint-integration-2026-09-24). Local repo diverges from Pig; noted per item.

## 1. Mission Control — FOUR+ duplicate implementations (genuine duplicate cluster)

1a. ~/workspace/mission-control/ — Journal-projection MC (Python lane + docs). emit.py, project.py, backfill.py, STATE.md, OBSERVABILITY-MISSION-CONTROL.md, LANE-D-DISPATCH.md. Typed MC_* events appended to existing PING journal (fyd-journal-gateway/events.jsonl) — the only write path, no new store. Lane D (2026-09-26) added dispatch UI/API design: src/app/api/mc/dispatch/route.ts (GET catalog / POST witnessed dispatch), src/app/api/mc/missions/route.ts, src/app/api/mc/missions/[id]/route.ts, DISPATCH tab — but these live on the Pig repo, not in this checkout. Mutation controls (retry/hold/cancel) deliberately withheld by law. State: live (design + journal path); UI routes Pig-only. Classification: KEEP (journal-projection model is the convergence target; Pig-only routes need MERGE into canonical repo).

1b. ~/workspace/ping-ui-contract/apps/mission-control/ — @ping/mission-control UI-contract slice. Projection-builder functions over gateway JSON (toMissionProjection, buildMissionWindow, buildApprovalQueue, buildIntentLedgerView, schedulerIntentFromDefs). Honest by construction: gaps labeled, never fabricated (APPROVAL_DISPATCH_GAP). Stage labels IMPLEMENTED → WIRED → RUNTIME_VERIFIED. State: experimental, not wired to live data. Classification: KEEP / WIRE — closest thing to a reusable MC UI layer; owns no backend.

1c. ~/workspace/orca-finish/wave1/mission-control/MISSION-CONTROL-AUDIT.md — audit doc of live Pig gateway /mc API (gateway/routes/mission_control.js, Pig-only). Real mission schema: ping_missions (created/assigned/running/completed/failed/retry_pending, retries, retry_at, max_attempts, assigned_to, result JSONB, error TEXT) vs ping_events journal, with divergence risks. State: stale evidence doc (2026-09-23). Classification: RETIRE (archive as evidence).

1d. ~/workspace/tenant-os/marketing-mission-control/ — SPEC.md, IMPLEMENTATION-PROMPT.md. Stale/unstarted. Classification: DEAD / RETIRE.

Duplicates: four MC concepts (journal-projection lane, UI-contract builders, Pig gateway /mc API, marketing spec) + orca-finish wave2 contract docs. No single canonical MC. Converge on 1a (journal-projection) + 1b (honest projection builders).

## 2. Pipeline definitions

No unified composable pipeline DSL/orchestrator exists. Stage-chains + one harvest protocol:
- FYD site-builder stage chain: ~/workspace/fyd-build/package.json description SOURCE → OBSERVATIONS → EVIDENCE → OBJECT GRAPH → SITE SPEC → COMPONENTS → CAPABILITIES → EXPERIENCE. Implemented by src/fyd/* modules; no runner composes stages; each is a library function/test suite. Live convention. WIRE (a mission runner composes these).
- ~/workspace/fyd-factory/missions/MISSION-PROTOCOL.md — factory harvest protocol: mission classes, deterministic world addressing (mulberry32), atomic shard claiming, per-world stage chain generate → SOURCE → OBSERVATION → EVIDENCE → OBJECTS → RELATIONSHIPS → OWNER INTENT → PUBLIC-SAFE PROJECTION → SITE SPEC → RENDER → VERIFY. Live/experimental, actively used. KEEP — closest thing to a mission definition language.
- ~/workspace/fyd-build/src/fyd/refresh/ — temporal refresh pipeline (website-observe.ts, facebook-source.ts, conflict.ts, diff.ts, dependency-index.ts, snapshot-store.ts, run-t2.ts). Second-source ingestion → claim grading → conflict-as-evidence → diff → dependency index. Live, tested. KEEP (the observe/refresh stage).

## 3. Worktree isolation — convention-by-document, no enforced tooling

Documented in ~/workspace/fyd-factory/MISSION-STATE.md: clean preview worktree at frozen SHA, per-lane worktrees, Pig git read-only. Lineage tracking: ~/workspace/fyd-factory/lineage/ (chain-happy-place.json, chain-coppersmith.json, LINEAGE-REPORT.md) — SOURCE BYTES → OBSERVATION → EVIDENCE → OBJECT FIELD → SITESPEC BINDING → RENDERED CLAIM → ASK FYD ANSWER. Locally ad hoc (~/worktrees/, /tmp/fyd-* prunable). WIRE (formalize into worktree manager: named worktree + base SHA + lineage record; lineage JSONs are the seed).

## 4. Agent/executor registry — does NOT exist

Nearest: MISSION_WORKER_MAP in ~/workspace/f01-fix/mission_scheduler.js (mission_type → worker-name labeling, NOT an execution decider); ExternalAgentAdapter profiles (Pig-side); ~/workspace/gateway-hardening/orig-capability_registry.js (capability registry, gateway context, not agent registry). UNKNOWN (gap) — future runner needs one.

## 5. FYD pipeline stages — all callable library units under ~/workspace/fyd-build/src/fyd/ (TypeScript, jest-tested)

Acquire: refresh/website-observe.ts, refresh/facebook-source.ts, media/discover.ts, media/safe-fetch.ts (SSRF gate). Extract: website-observe.ts (page → graded claims), media/ingest.ts (npx tsx src/fyd/media/run-ingest.ts <site>; path drift locally). Resolve: sitespec/graph.ts, refresh/conflict.ts. Compile: proceduralize/generator.ts (ObjectGraph → FYDSiteSpec, pure/deterministic), proceduralize/compile-service-graph.ts, sitespec/validator.ts, sitespec/schemas.ts. Render: components/renderer.tsx, components/registry.ts. Screenshot: ~/workspace/fyd-factory/visual/visual-capture.js (+ mobile-capture.js, visual-zoom.js, fab-probe.js) — node visual-capture.js <slug> <outdir>, PIG-ONLY (hardcoded Windows paths, CDP 9334). Test: per-module __tests__/, npm test / npm run typecheck in fyd-build, fyd-factory/probe-*.sh hostile probes, golden*/ suites. Ask/verify: ask/answer.ts, ask/visitor.ts, ask/context-builder.ts (SUPPORTED/DERIVED/INFERRED/UNKNOWN). Regen: regen/regenerate.ts. Owner apply: owner/apply.ts, interpret.ts, store.ts, demo-owner.ts. Refresh/diff: refresh/diff.ts, snapshot-store.ts, run-t2.ts (npm run test:refresh).
State: live, tested. KEEP — the deterministic stage units a mission runner should invoke. Screenshot driver needs WIRE (portability).

## 6. Mission/run/task/stage data model — THREE coexisting models (duplicate cluster)

6a. ~/workspace/ce002/src/mission_runtime.js — "Mission Runtime — PING Core v1". MissionRuntime class; created → assigned → running → completed/failed → archived; pg-backed (ping_missions/ping_events), event emission. Header claims it "Replaces 12 dead mission implementations." Classification: KEEP candidate as canonical runtime model.
6b. NINE copies of mission_runtime.js across the tree (ce002/src/, f01-fix/, pig-transfer-tmp/, convergence-zoom-2026-09-19/lane-d-execution/pig-src/, tenanos-wave/scratch/lane-h/, constitutional-sprint/fleet/, orca-finish/program/orca-{a,b,c}/...) plus mission_scheduler.js ×3. RETIRE all but one — consolidation claimed, not completed.
6c. Factory shard-claim model — ~/workspace/fyd-factory/missions/claim.sh: atomic mkdir-based shard claim/lease (claim|renew|release|status), markers at missions/<class>/shard-N/.claim/owner, CLAIMS.jsonl. Live, proven. KEEP.
6d. Journal MC_* events — ~/workspace/mission-control/emit.py: append-only typed mission events on existing PING journal, no new store. Live (Pig journal path). KEEP (sanctioned "no new store" persistence).

## 7. Approval/proposal UI or API — no functional path with real authority in this checkout

ping-ui-contract/apps/mission-control/src/approval-queue.mjs renders PENDING_HUMAN queue and documents APPROVAL_DISPATCH_GAP: "SNIPPET_APPROVED lacks the ordinary runtime mapping (harness path proven only)… it never renders a functional approval button where the authority path does not exist." Lane D MC: mutation controls withheld by law. No /api/*/approve, /propose, /authorize route in this checkout (Pig's api/mc/dispatch POST is dispatch, not approval). UNKNOWN (gap) for the mechanism; KEEP the honest PENDING_HUMAN projection pattern.

## 8. Scheduler / cron / retry

- ~/workspace/cron.d/ — declarative schedule defs (.md with YAML frontmatter: id, kind, timezone, time, timeout_secs, enabled, mode: task). Live. KEEP.
- ~/workspace/f01-fix/mission_scheduler.js — poll-based scheduler bridging MissionRuntime ↔ WorkerRuntime: 5s poll, MISSION_WORKER_MAP, idempotent skip-if-assigned, retry re-entry via reclaimRetryPending() (backoff-gated), constitutional PARK/HOLD on unknown outcomes (TIMEOUT ≠ FAILED). Experimental, Pig-deployed. KEEP (retry/HOLD semantics); RETIRE 2 duplicate copies.
- ping-ui-contract automation-health.mjs schedulerIntentFromDefs() — honest projection over cron defs. KEEP/WIRE.
- ~/workspace/scheduler/ — empty directory. DEAD.

## 9. Screenshot / visual-regression

- ~/workspace/fyd-factory/visual/ — visual-capture.js (dedicated headless Chrome, own user-data-dir, own CDP 9334, full-page screenshots + DOM metrics at 1440/1280), mobile-capture.js, visual-zoom.js, fab-probe.js. Experimental, proven (VQ-001), Pig/Windows-hardcoded. WIRE (portable config; dedicated-browser pattern worth keeping).
- ~/workspace/fyd-build/src/fyd/refresh/snapshot-store.ts — snapshot store for temporal diffing. KEEP.
- Golden/hostile suites — fyd-factory/golden*/, probe-*.sh, mobile-proof-2026-09-24/. KEEP as regression corpus.

## Callable deterministic units for a future mission runner (today)

1. proceduralize/generator.ts → generateSiteSpec(objectGraph) — pure deterministic compile (import from fyd-build)
2. sitespec/validator.ts → validation verdict (0 errors = pass)
3. components/renderer.tsx → render (SiteSpec, graph, viewer context)
4. ask/answer.ts + ask/visitor.ts → Ask FYD verdicts (SUPPORTED/DERIVED/INFERRED/UNKNOWN)
5. refresh/* → observe/conflict/diff pipeline (npm run test:refresh)
6. npx tsx src/fyd/media/run-ingest.ts <site> → media ingest (fix repo-root path assumption)
7. fyd-factory/missions/claim.sh claim|renew|release|status → shard locking primitive
8. mission-control/emit.py → append MC_* journal events (no new store)
9. cron.d/*.md frontmatter → schedule declarations
10. node fyd-factory/visual/visual-capture.js <slug> <outdir> → screenshots (after de-hardcoding)
11. npm test / npm run typecheck in fyd-build → test/type gates

## Does NOT exist here

- No live-browser operation from this machine (text fetch/search only) — browser runs must be delegated
- No unified mission orchestrator/runner — stages are libraries; nothing composes SOURCE→EXPERIENCE end to end
- No agent/executor registry
- No functional approval/proposal API or UI (PENDING_HUMAN projections only, by design)
- No Mission Control UI routes in this checkout (Pig-only branches)
- No worktree manager (convention docs + lineage JSONs only)
- Canonical live mission schema (ping_missions/ping_events Postgres) and gateway /mc API live in the Pig backend (/home/nolan/ping), unreachable from here
