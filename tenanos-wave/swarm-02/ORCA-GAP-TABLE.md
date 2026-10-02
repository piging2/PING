# ORCA GAP TABLE — mechanism → PING analog → verdict (SWARM 02)

**ORCA source:** `orca-cli/orca @ 5beeefc` (2026-05-08), per
`~/workspace/crx-autonomous-missions/orca-crx-comparison.md` (O-1..O-10) and
`~/workspace/autonomous-missions/ORCA-ARCHAEOLOGY-2026-09-23.md` (A1..A15).
**PING side:** live `/home/nolan/ping` code, re-verified 2026-09-23 (see
`ENGINE-INVENTORY.md`). Verdicts: KEEP / PROPAGATE / REFACTOR / REPLACE / DROP.
Burden of proof is on REPLACE/DROP — met below with file:line evidence.

## Harvest verdicts

| # | ORCA mechanism | PING analog (live) | Semantic delta | Verdict | Rationale |
|---|---|---|---|---|---|
| O-1/A1 | Durable run row (UUIDv7, typed status, worktree) | **None** — missions are durable, attempts are not (G-01) | Orca's unit is the attempt; PING's unit is the mission | **ADAPT → P-20260923-003** | Highest-value harvest (4 lanes triangulate). Implement as `ping_mission_attempts` in PG beside `ping_missions` — never a second SQLite writer (A3 rejection stands). Copy `short_ref` ambiguity discipline; UUIDv7 via identity authority |
| O-2/A2 | Pure transition table `Apply(from,event)` | Conditional single-row UPDATEs (`mission_runtime.js:106-170`) — transition logic embedded in SQL | PING has enforcement without a readable table; Orca had a table without enforcement | **ADAPT → P-20260923-003** | Extract attempt lifecycle into a pure `attemptTransition(from,event)` table; store layer calls it first (Orca's own bug — unenforced table — must not be repeated) |
| O-3/A3 | SQLite store (WAL, single-conn) | `ping_events` PG journal, single writer `UnifiedEventRuntime.emit` | PING strictly stronger (replication, auth, lineage, real one-writer) | **DROP** | A second journal is the competing-authority failure the campaign forbids. Nothing to harvest except migration discipline (lexicographic, idempotent) as a pattern |
| O-4/A4 | `run_dependencies` edges as data | **None** (G-04); ordering is bridge-map convention | Orca has representation, no gating; PING has neither | **ADAPT (repr) + INVENT (gating) → P-20260923-006** | `ping_mission_dependencies(mission_id, depends_on)` with self-edge CHECK + cycle rejection; pure ready-set query evaluated atomically with claim. Do not import a scheduler |
| O-5/A7 | `Decision` enum (merge/abandon/needs_review) | No shared review-outcome vocabulary | Vocabulary only, no behavior | **ADAPT → fold into P-20260923-005** | Three-valued `ReconcileDecision` (retry/reconcile/skip/escalate) for the classifier; same closed-vocabulary idea |
| O-6/A12 | Agent rehydration protocol ("surviving context loss") | **None** — replacement workers get conversational re-briefs | Idea only in Orca (MCP tools never built) | **PROPAGATE (pattern) → P-20260923-003** | The attempt row's read surface IS the protocol: `rehydrate(attempt_id)` returns attempt + mission + last checkpoint + input digest. Read-only; worker never gains write beyond its attempt |
| O-7/A8 | Constraints as data (gates) | Real enforced gates (BindingVerifier, verdict admission) — **sprint-owned** authority area | PING stronger on enforcement; Orca's is representation-only | **KEEP (PING) — no wave action** | Per boundary update, gate/authority internals belong to the constitutional sprint. Not duplicated here |
| O-8/A10 | FTS5 per-run logs | `runs.jsonl` ledgers + PG journal | Queryability vs content | **DROP (WATCH)** | Premature at current scale; revisit at 50-investigation scale |
| O-9 | Short-ref ambiguity detection | None | Fail-closed on ambiguity | **ADAPT → P-20260923-003** | `resolveShortRef` semantics copied for attempt short refs |
| O-10 | UUIDv7 run IDs | IdentityAuthority doctrine | Compatible shape | **PROPAGATE** | Subject to identity authority; UUIDv7 is the right shape when PING mints attempt IDs |
| A6 | Adapter port + registry | `WorkerRuntime` + canonical workers (authority-bearing) | Orca's port is unproven (zero adapters); PING's workers are real | **DROP** | A pluggable-CLI port would create an unauthoritative worker universe beside canonical workers — competing authority surface |
| A9 | `events` table (convention-only append) | `ping_events` (deterministic IDs, lineage, single writer) | PING stronger on every axis | **DROP** | Nothing to harvest |
| A11 | `context_files` join table | None | Trivial shape | **PROPAGATE (pattern) → P-20260923-003** | Folds into the rehydration bundle (input digest + artifact refs on the attempt row) |
| A13 | MCP server | Does not exist in Orca | No design to harvest | **DROP** | MCP posture is swarm-03's lane |
| A14 | Pod entity | None (decomposition is coordinator intelligence) | Schema without workload | **DROP** | Do not build until a real decomposition workload needs it |
| A15 | CLI surface | N/A | Only `version` exists | **DROP** | |

## PING-side gaps with no ORCA analog (invention, ordered)

| Gap | Live evidence | Proposal |
|---|---|---|
| G-02 hung dispatch: no timeout; Arrow 0 renews hung leases forever | `mission_scheduler.js:231` awaits unbounded; reaper (`mission_runtime.js:277`) can never fire on `_processing` members | **P-20260923-004** dispatch watchdog (timeout → `timed_out`, distinct from `failed`) |
| G-03 emit-after-update in `complete()` | `mission_runtime.js:146-170` | **P-20260923-005** reconciler heals completed-without-event |
| Effect ledger unwired + in-memory | `ping-runtime/approval/effect_authority.js`; defect recorded in `approval_restart_durability.test.js:1-12`; zero external requirers | **REFACTOR → P-20260923-005** PG-backed `ping_effect_ledger` + wire into retry path |
| G-06 no startup reconciliation / attempt fencing | absent from live code (ce002 was experiment-only) | **P-20260923-005** startup scan + `STALE_ATTEMPT` fail-closed |

## Explicit non-goals (rejected with reason)

- **Second orchestrator** (Temporal `mission_workflow.js` is dormant — keep it dormant).
- **Second event authority** (`ping_events` stays the sole journal; attempt/effect/
  dependency tables are companion tables in the same PG database, written through
  the same pool — namespaces, not authorities).
- **Second capability system** (capability decisions stay in `WorkerRuntime.dispatch`
  + canonical workers; the watchdog only bounds time, never routes).
- **Pod/decomposition entities, TUI/CLI, SQLite stores, adapter ports.**
