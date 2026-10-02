# ORCA vs CRX — Source-Level Comparison

**Source:** https://github.com/orca-cli/orca @ `5beeefc` (2026-05-08, PR #2 "skeleton-week-1"; HEAD is 4.5 months stale as of 2026-09-23)
**License:** MIT
**Audited:** 2026-09-23, source-read in full (29 Go files; Go toolchain absent in sandbox, so tests were read, not executed)
**CRX baseline:** CRX/FYD pre-sprint read-only audit, 2026-09-22 (`~/workspace/crx-audit/`)

## Verdict first

Orca at HEAD is a **week-1 skeleton with a v1.0 README**. The vision in the README is the thing Nolan wants compared, but the honest audit result is: the vision is unimplemented, and the skeleton implements four real, small, correct mechanisms. This document compares both — what exists and what is claimed — because the harvest rule is README != IMPLEMENTATION.

## Falsified README claims (source-checked)

| README claim | Source reality |
|---|---|
| `orca mcp serve`; MCP tools (`orca_list_runs`, `orca_stage`, `orca_review`); "Surviving Context Loss" snippet calling MCP tools | `internal/mcp/doc.go` is a 4-line stub. Zero MCP code. |
| "agents pick up work as upstream runs complete" | No runner package implementation; no claiming logic; no dependency-ready query anywhere. |
| "Orca decomposes goal → builds DAG" | `internal/pod/doc.go` stub only. No pod lifecycle, no decomposition. |
| "Constraints gate what reaches review" | Constraint engine unimplemented; only the `constraints` table exists. |
| "Twelve CLI Commands" | Only `orca version` exists (`internal/cli/root.go` + `version.go`). |
| TUI watch / review / ship | `internal/tui/doc.go` stub only. |
| "Full Docs (DOCS.md)", CONTRIBUTING.md | Files referenced by README; absent from repo. |
| "active development — interfaces may shift before v1.0" | Last commit 2026-05-08. 4.5 months of silence. |

What IS real and tested (test files present for each): run-state transition table, SQLite store (pods/runs/dependencies/constraints/logs+FTS5/events/context_files), git worktree create/archive, adapter port + registry.

## Central question: what does Orca solve that CRX currently makes Nolan or a coordinator do?

**At HEAD: almost nothing beyond the skeleton's four mechanisms.** The vision claims to solve the real coordinator burdens — goal decomposition into DAGs, dependency-driven scheduling, context rehydration after compaction, review queue, ship — but none of it is implemented. Treat the vision as a design sketch, not evidence.

**What the skeleton actually solves** (and CRX currently does conversationally):
1. **Durable per-attempt execution identity.** CRX audit gap #3: "Run unit: ABSENT (no durable per-attempt execution identity)." The coordinator today tracks work in chat context; when a worker dies mid-run, reconstruction is manual. Orca's `runs` row (UUIDv7, typed status, worktree path, branch, timestamps) is the smallest durable unit that survives worker death. This is the highest-value harvest.
2. **Typed run lifecycle as a pure function.** `state.Apply(from, event)` is a 30-line transition table with `ErrIllegalTransition`. CRX has typed failure semantics as doctrine (SOUL.md §11) but transitions scattered across runtime code. A pure transition table is cheap, testable, and makes illegal states unrepresentable.
3. **Per-run git worktree isolation with archival.** CRX practice already uses worktrees ad hoc (`jev-surgical`); Orca's `CreateForRun`/`Archive` is the boring, correct version: per-run branch `orca/<runID>`, archive to `_<kind>/` on ship/kill, `ErrEmptyBase` guard. Small enough to ADAPT directly.
4. **Append-only per-run event audit + FTS5 logs.** CRX's canonical journal (PostgreSQL `ping_events`) is stronger and must remain the authority. Orca's local `events`/`logs` tables are a PATTERN for portable per-run evidence bundles, not a replacement journal.

## Mechanism-by-mechanism comparison

Format: ORCA PRIMITIVE / CRX EXISTING ANALOG / SEMANTIC DIFFERENCE / WHICH IS STRONGER / HARVESTABLE MECHANISM / INTEGRATION COST / SECOND-AUTHORITY RISK.

### O-1. Durable run row (UUIDv7, typed status, worktree path)
- **CRX analog:** MissionRuntime missions (idempotent, deterministic IDs, 144/144 completed); JSONL run ledgers (`runs.jsonl`). No per-attempt run identity (audit gap #3).
- **Difference:** Orca's unit is the *attempt* (one worker, one worktree, one lifecycle); CRX's unit is the *mission* (coordinator-level). Orca rows survive worker death; CRX mission state lives in coordinator context.
- **Stronger:** Orca's *shape* for the missing layer; CRX's *durability* (PG journal) for the canonical layer. Neither has both.
- **Harvest:** ADAPT. A `runs` table (or run-scoped event namespace in `ping_events`) keyed by UUIDv7, with typed status and worker/worktree binding, as the durable attempt unit under MissionRuntime.
- **Cost:** Low. Schema + a few store methods. No new authority.
- **Second-authority risk:** Medium if built as a parallel SQLite journal. Mitigation: implement as a projection/namespace of the canonical event journal, not a second writer.

### O-2. Pure state-transition table
- **CRX analog:** Typed failure semantics (doctrine); verdict-authority admission checks; scattered transition logic.
- **Difference:** Orca: `Apply(from, event) → (to, error)`, total, no I/O. CRX: transitions embedded in imperative runtime code.
- **Stronger:** Orca's mechanism; CRX's enforcement context.
- **Harvest:** ADAPT. Extract run/mission lifecycle transitions into pure tables with illegal-transition errors; runtime code calls the table.
- **Cost:** Very low. **Risk:** None — it is a function, not an authority.

### O-3. Per-run worktree isolation + archive
- **CRX analog:** Ad-hoc git worktrees (`jev-surgical`); no create/archive discipline.
- **Difference:** Orca: `CreateForRun` (branch `orca/<runID>`, `ErrEmptyBase`), `Archive` (move to `_shipped`/`_killed`, `git worktree prune`, data preserved before unregister). CRX: manual.
- **Stronger:** Orca.
- **Harvest:** REUSE (MIT, ~120 lines, tested). Adapt paths to CRX conventions.
- **Cost:** Very low. **Risk:** None.

### O-4. Dependency edges as data (`run_dependencies`)
- **CRX analog:** Causation/correlation lineage on events; but mission lifecycle events carry **no causation_id** (audit gap #6); no task DAG; no dependency gating.
- **Difference:** Orca models `run_id → dep_id` edges explicitly (scheduler unimplemented, but the *representation* is right). CRX has lineage on events but no first-class "task B is blocked on task A" representation.
- **Stronger:** Orca's representation; CRX has nothing here.
- **Harvest:** ADAPT. Dependency edges as data + a pure "ready set" query (all deps in terminal-success states). Do not import a scheduler; the query is the mechanism.
- **Cost:** Low. **Risk:** Low — edges are data, gating is a query.

### O-5. Adapter port (hexagonal) + Decision enum
- **CRX analog:** WorkerRuntime + 6 canonical workers (deterministic, lineage-preserving).
- **Difference:** Orca's `Adapter` interface (`Launch`/`Validate`/`Handle`/`Result` with `Decision`: merge/abandon/needs_review) is a *disposable worker* contract; CRX workers are *canonical* (authority-bearing). Orca has zero concrete adapters — the port is unproven.
- **Stronger:** CRX's workers (real, deterministic). Orca's `Decision` enum is a useful *review-outcome vocabulary* CRX lacks (reviewer agent → typed outcome).
- **Harvest:** PATTERN. Adopt the `Decision` (merge/abandon/needs_review) vocabulary for review gates; do not adopt the adapter port (CRX workers are sovereign, not pluggable CLIs).
- **Cost:** Trivial. **Risk:** None if vocabulary-only.

### O-6. Agent-driven rehydration ("Surviving Context Loss")
- **CRX analog:** Memory system (MEMORY.md, daily logs, people pages); compaction summaries; no agent-invoked state-rehydration protocol.
- **Difference:** Orca's design (unimplemented): on every session start the agent *calls* `orca_list_runs` via MCP and re-establishes in-flight work. CRX: the coordinator re-briefs workers conversationally; nothing survives worker-side.
- **Stronger:** The *idea* is stronger than either implementation. Orca never built it; CRX never needed it at small scale.
- **Harvest:** PATTERN. A rehydration protocol: a new/resumed worker queries durable run state (its run row, open tasks, last checkpoint) through a bounded interface before acting. This is the mechanism that makes workers truly disposable.
- **Cost:** Medium (needs the run row + a query surface). **Risk:** Low — read-only query surface; must never grant the worker write authority beyond its run.

### O-7. Constraint gates as typed events
- **CRX analog:** BindingVerifier, verdict-authority admission, URL-safety gates (FYD); typed refusals.
- **Difference:** Orca: constraints are named commands (`name`, `command`, `timeout_s`) evaluated before ship, emitting `ConstraintsPassed`/`Block` events. CRX gates are code, not data; outcomes are booleans, not events.
- **Stronger:** CRX's gates (real, enforced). Orca's *representation* (gate as data + typed outcome event) is the harvestable part.
- **Harvest:** ADAPT. Represent ship/merge gates as named, auditable checks whose pass/fail becomes a canonical event. (CRX already emits verdict events; this aligns, not duplicates.)
- **Cost:** Low. **Risk:** Low.

### O-8. FTS5 structured logs per run
- **CRX analog:** Cron run history, `runs.jsonl` ledgers, per-lane evidence markdown.
- **Difference:** Orca: `logs` table + FTS5 virtual table + insert triggers; queryable by run. CRX: logs scattered across files; grep-scale retrieval.
- **Stronger:** Orca's queryability; CRX's content.
- **Harvest:** WATCH (or ADAPT later). Searchable run-log store is valuable at 50-investigation scale; premature at current scale.
- **Cost:** Low. **Risk:** None.

### O-9. Short-ref resolution with ambiguity detection
- **CRX analog:** None (run IDs are conversational).
- **Harvest:** WATCH. Nice UX; irrelevant until run rows exist.
- **Cost:** Trivial. **Risk:** None.

### O-10. UUIDv7 run IDs
- **CRX analog:** IdentityAuthority doctrine (SOUL.md §8: identity generation is a sovereign capability).
- **Difference:** UUIDv7 gives monotonic, B-tree-friendly, uncoordinated IDs.
- **Stronger:** Compatible, not competing.
- **Harvest:** PATTERN, subject to IdentityAuthority. If CRX mints run IDs, UUIDv7 is the right shape.
- **Cost:** Trivial. **Risk:** None if routed through the identity authority.

## What NOT to harvest

- **The MCP server design as authority.** It does not exist. When CRX builds tool execution, Orca contributes nothing beyond the rehydration-protocol *idea* (O-6).
- **The pod/decomposition vision.** Unimplemented; and goal decomposition is a coordinator intelligence task, not a schema. Do not build a "pod" entity until a real decomposition workload needs it.
- **SQLite as the system journal.** CRX's PostgreSQL canonical journal is stronger (replication, auth, existing lineage). A second SQLite writer would be a competing authority — the exact failure the campaign forbids.
- **The TUI/CLI surface.** No evidence; no harvest.

## Cross-references (routed, not audited here)

- **alex2481kobe/orca** (Apache-2.0, active): agent-spawns-agent over MCP, governed lanes with worktree-on-collision, server-enforced audit gate, phone dashboard. Actually implements parts of orca-cli/orca's vision. → orchestrator super-lane.
- **The "Orca" desktop app** (v1.4.198, per nirvana-os-engine ADR-009): Run → Task (DAG, `--deps`) → Dispatch with `worker-start`, `dispatch --inject`, `worker_done`, `ask`/`reply`, `escalation`. A *shipped* implementation of the DAG+dispatch vision. → orchestrator super-lane, high priority.

## Mechanism library entries

See `mechanisms.jsonl` (O-1..O-10 in the 16-field schema).
