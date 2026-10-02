# ORCA ARCHAEOLOGY — LANE C PHASE 3 (FINISH ORCA)

**Audited:** 2026-09-23, source-read of https://github.com/orca-cli/orca @ `5beeefcb57555962bb93facc54b5f82484731802` (2026-05-08; HEAD verified locally, no new commits — still 4.5 months stale).
**License:** MIT.
**Method:** Go toolchain is UNAVAILABLE in this sandbox (checked: `which go`, `/usr/local/go/bin` — absent). No `go vet` / `go test` execution was possible. All findings are source-read archaeology; Orca's test files were READ, never executed. Nothing in this document claims runtime proof of Orca code.
**CRX grounding:** `/home/nolan/ping` is not mounted in this sandbox. CRX facts are grounded against three converging sources, read-only: (1) workspace snapshot `convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/` (matches the 2026-09-22 crx-audit's file:line evidence, treated as the live-repo baseline); (2) workspace variant `ce002/src/` (newer CE-001/CE-002 experiment — flagged as VARIANT, not confirmed live); (3) `~/workspace/crx-audit/` (2026-09-22 read-only audit of the live repo).
**Extends:** `~/workspace/crx-autonomous-missions/orca-crx-comparison.md` (O-1..O-10) — this file goes mechanism-by-mechanism deeper and answers the Phase-3 question set. It does not redo the comparison.

**Standing law in force:** STANDING-LAW-2026-09-23 (no grill; 80%+ decide; consequential gates; DB only via app paths; adversarial tests synthetic-first; unauthenticated GitHub; silent-when-healthy; FYD tiebreak; Phase-0.5 falsification). BASELINE-FREEZE-2026-09-23 (read-only; no builds/launches/patches/commits).

**Headline:** Orca @ HEAD contributes four real mechanisms and one idea to autonomous missions; everything else in the README is falsified (documented below with file evidence). Against the CRX baseline, Orca's *highest-value* contributions are the per-attempt run-row shape (closes crx-audit gap #3) and the worktree create/archive discipline. CRX is already decisively stronger on claiming/leases, failure recovery, failure semantics, and evidence. Three primitives remain explicit invention gaps (attempt-level run row, dependency-aware ready-set, external-effect reconciliation). Orca's MCP server, pod lifecycle, runner/claiming, constraint engine, and TUI do not exist — they are rejected as harvest sources, not deferred.

---

## 0. What Orca actually is at HEAD (falsification table, extended)

| Claimed (README) | Source reality | Evidence |
|---|---|---|
| `orca mcp serve`; MCP tools `orca_list_runs`, `orca_stage`, `orca_review`; "Surviving Context Loss" snippet | `internal/mcp/doc.go` is a 4-line stub. Zero MCP code, zero tool definitions | `internal/mcp/doc.go` (4 lines) |
| "agents pick up work as upstream runs complete" | No runner; no claiming; no ready-set query; no lease; no heartbeat anywhere in the tree | `internal/runner/doc.go` stub only; grep: no `claim`, `lease`, `heartbeat` in implemented packages |
| "Orca decomposes goal → builds DAG" | `internal/pod/doc.go` stub; `pods` table exists but no lifecycle code | `internal/pod/doc.go`; migration `0001_init.sql` (`pods` DDL only) |
| "Constraints gate what reaches review" | Only the `constraints` table DDL; no evaluation engine | `internal/constraint/doc.go` stub; no other constraint code |
| "Twelve CLI Commands" | Only `orca version` exists | `internal/cli/root.go` + `version.go`; `init()` registers one command |
| TUI watch / review / ship | `internal/tui/doc.go` stub | stub only |
| "Full Docs (DOCS.md)", CONTRIBUTING.md | Absent from repo | `find` — no such files |
| Homebrew tap / release binaries | No releases exist at HEAD era; README links to empty releases page pattern | repo has 5 commits total |

**What IS implemented** (29 Go files; implemented = more than a doc.go): `internal/state` (status/event types, transition table), `internal/store` (SQLite open/migrations/runs CRUD/ids), `internal/adapter` (port interface + registry), `internal/worktree` (create/archive), `internal/testutil` (git fixtures), `internal/cli` (root + version). Test files present for state, store, adapter/registry, worktree — read, not executed.

---

## 1. Mechanism-by-mechanism archaeology

Format per mechanism: the 13 questions, then the CRX classification.

### A1. Durable run row (attempt identity)

- **WHAT PROBLEM DOES IT SOLVE?** A coding-agent attempt is a process with memory-only state. When the agent's session compacts or the process dies, the attempt's identity, status, and work location vanish. The run row gives the attempt a durable identity that outlives any single process or session.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** Every attempt has exactly one row: `runs(id PK, short_ref, pod_id FK, status, prompt, worktree_path, adapter, branch, started_at, completed_at, created_at, updated_at)`. ID is UUIDv7 (monotonic, B-tree friendly). `short_ref` is a non-unique 8-hex prefix; ambiguity is detected at query time (`ResolveShortRef` returns `ErrAmbiguousRef`), never silently resolved.
- **WHERE IS IT IMPLEMENTED?** `internal/store/runs.go` (Create/GetByID/List/UpdateStatus), `internal/store/ids.go` (NewRunID/ShortRef/ResolveShortRef), `internal/store/migrate.go` + `internal/store/migrations/0001_init.sql` (DDL), `internal/store/store.go` (Open).
- **WHAT FAILURE DOES IT HANDLE?** Worker process death (row survives); ambiguous human references (typed `ErrAmbiguousRef`); duplicate IDs (PK constraint).
- **WHAT STATE IS DURABLE vs EPHEMERAL?** Durable: the row, timestamps, worktree path. Ephemeral: the adapter `Handle` (PID/SessionID — in-memory only, never persisted), the actual agent process.
- **HOW DOES RECOVERY WORK?** It doesn't — in Orca. No reaper, no watchdog, no heartbeat. A dead worker's row sits in `running` forever until a human runs a CLI command that doesn't exist yet. The row makes recovery *possible*; nothing performs it.
- **HOW DOES TASK CLAIMING WORK?** It doesn't — in Orca. The `Pickup` event exists in the transition table but no code performs a claim. There is no lease, no `claimed_by`, no expiry.
- **HOW DOES DAG STATE CHANGE?** It doesn't — in Orca. `run_dependencies(run_id, dep_id)` edges exist as data; no code reads them to gate execution, no `Pending → Pickup` trigger exists.
- **HOW ARE WORKTREES ISOLATED?** See A5.
- **HOW ARE FAILED WORKERS REPLACED?** They aren't — in Orca. `Fail` event exists in the table; nothing detects failure, nothing relaunches.
- **HOW IS NEXT WORK DISCOVERED?** It isn't — `List(Filter{Status})` is a filterable listing, not a discovery/claim query.
- **HOW DOES MCP PARTICIPATE?** It doesn't — zero MCP code.
- **WHAT IS ACTUALLY PROVEN vs MERELY DOCUMENTED?** `runs_test.go` and `store_test.go` exist and read correctly (round-trip, not-found, status filter, updated_at bump, concurrent updates in WAL file mode, short-ref format, UUID uniqueness) — but were NOT executed here (no Go toolchain). Proven-by-inspection only. The migration's `INSERT OR IGNORE INTO schema_migrations` + `applyMigrations` skip logic is straightforward and low-risk.
- **CRX CLASSIFICATION: ADAPT (shape), with a hard constraint.** CRX's audit gap #3 is exactly this: "no durable per-attempt execution identity." Orca's row is the right *shape* (attempt = id, status, worker binding, work location, input). But it must be implemented as a namespace/projection of the canonical PG event journal (`ping_events`), NOT as a second SQLite writer — a second journal is the competing-authority failure the campaign forbids. The `short_ref` ambiguity-detection discipline (fail closed on ambiguity) is worth copying verbatim. UUIDv7 stays subject to IdentityAuthority (SOUL.md §8). This converges with two independent lanes: Orka's write-once execution binding and the OpenAI-agents-SDK per-attempt invocation ledger — three lanes triangulate the same gap.

### A2. Pure state-transition table

- **WHAT PROBLEM DOES IT SOLVE?** Lifecycle transitions scattered through imperative code make illegal states reachable by accident.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `Apply(from, event) → (to, error)` is a total pure function over a closed table: 8 statuses × 7 events, `ErrIllegalTransition` on any undefined pair. Terminal states (`shipped`, `killed`) have empty event maps — nothing leaves them.
- **WHERE IS IT IMPLEMENTED?** `internal/state/state.go` (types), `internal/state/transition.go` (table + Apply).
- **WHAT FAILURE DOES IT HANDLE?** Illegal transitions (e.g. `ship` from `queued`, `pickup` from `running`, any event on a terminal state).
- **WHAT STATE IS DURABLE vs EPHEMERAL?** None — the table is a pure function, no state at all.
- **CRITICAL ARCHAEOLOGY FINDING:** the table is **not enforced at the persistence layer**. `Store.UpdateStatus` (`internal/store/runs.go`) executes a raw `UPDATE runs SET status = ?` with no `Apply()` call. Any caller can write any status string (the column has no CHECK constraint either). "Illegal states unrepresentable" is true of the function and false of the system. A harvest must wire the table as the *only* transition path (store method calls Apply first, rejects on `ErrIllegalTransition`), or it reproduces the gap.
- **WHAT IS PROVEN vs DOCUMENTED?** `state_test.go` enumerates all 16 legal cells + 8 illegal pairs + unknown status — read, not executed. The table itself is 30 lines; inspection-risk is minimal.
- **CRX CLASSIFICATION: ADAPT.** Extract run/mission lifecycle transitions into a pure table with illegal-transition errors; the runtime calls the table and the store enforces it. Zero second-authority risk (it's a function, not a writer). Note CRX already has the harder half: conditional single-row UPDATEs (`UPDATE ... WHERE status=...`) in `MissionRuntime` (pig-src snapshot, P0-1/P0-3). The table gives those transitions a single readable definition.

### A3. SQLite store (WAL, migrations, single connection)

- **WHAT PROBLEM DOES IT SOLVE?** Zero-dependency local persistence for a single-binary CLI tool.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** Embedded migrations applied in lexicographic order, idempotent (`IF NOT EXISTS` + `INSERT OR IGNORE`), tracked in `schema_migrations`. WAL mode for file DBs. `SetMaxOpenConns(1)` with the comment "SQLite in WAL mode works best with a single writer connection."
- **WHERE IS IT IMPLEMENTED?** `internal/store/store.go`, `internal/store/migrate.go`.
- **WHAT FAILURE DOES IT HANDLE?** Partial migration (per-migration transaction with rollback); concurrent in-process writers (`database is locked` — mitigated, and `TestRun_UpdateStatus_Concurrent` targets exactly this).
- **WHAT STATE IS DURABLE vs EPHEMERAL?** Durable: the SQLite file. Ephemeral: the pool.
- **THE ONE-WRITER CLAIM, CHECKED:** `SetMaxOpenConns(1)` limits connections **within one process**. Two `orca` processes (or a CLI + a TUI + an MCP server) open the same file with independent pools — the invariant does not hold across processes. SQLite's own file locking prevents corruption, but there is no writer election, no advisory lock, no fencing. Orca has no one-writer invariant; it has a one-connection-per-process mitigation.
- **WHAT IS PROVEN vs DOCUMENTED?** `store_test.go` covers Open idempotency (second Open re-runs migrations cleanly), `:memory:` mode, `runs` schema columns, and FTS5 availability + trigger propagation (`logs_ai` insert → `logs_fts` MATCH query) — read, not executed.
- **CRX CLASSIFICATION: REJECT.** Concrete reason: a SQLite journal beside the canonical PG `ping_events` journal is a competing writer authority — the exact failure the campaign forbids (directive: "no second orchestration universe"; standing law: DB mutation only through authorized application paths). CRX already proves the stronger invariant: `UnifiedEventRuntime.emit()` → `ping_events` is the single runtime writer (resolved 2026-09-22), and `MissionRuntime` mutations are conditional single-row UPDATEs (atomicity unit = the row). Harvest the *migration discipline* (lexicographic, idempotent, tracked) as a pattern for any future PG migration tooling, not the store.

### A4. Dependency edges as data (`run_dependencies`)

- **WHAT PROBLEM DOES IT SOLVE?** Multi-step agent work has implicit ordering in the coordinator's head; making `run_id → dep_id` edges explicit data lets any agent read the DAG.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** Almost none. `PRIMARY KEY (run_id, dep_id)` prevents duplicate edges. That is the entire invariant surface. There is: no `CHECK (run_id != dep_id)` (a run can depend on itself), no cycle detection (A→B→A is storable), no query that computes the ready set, no code that transitions `pending → queued/pickup` when deps complete, no `ON DELETE` semantics beyond cascade.
- **WHERE IS IT IMPLEMENTED?** `internal/store/migrations/0001_init.sql` only. Zero Go code references `run_dependencies` anywhere in the tree.
- **WHAT FAILURE DOES IT HANDLE?** Duplicate edge insertion (PK). Nothing else.
- **HOW DOES DAG STATE CHANGE?** It doesn't. The `Pending` status and its `Pickup`/`Kill` transitions exist in the table (A2), but no code moves a run out of `pending`.
- **HOW IS NEXT WORK DISCOVERED?** It isn't. No "all deps in terminal-success" query exists.
- **WHAT IS PROVEN vs DOCUMENTED?** Documented only. No tests touch dependencies.
- **CRX CLASSIFICATION: PATTERN_ONLY for the representation; INVENTION_REQUIRED for everything else.** The edge-table shape (`depends_on(run_id, dep_id)` with cascade) is the right representation and is cheap to add to PG. But the actual mechanisms — a pure ready-set query (all deps in terminal-success states), acyclicity enforcement (reject self-edges and cycles at insert), and the `pending → claimable` transition trigger — do not exist in Orca and must be invented. CRX has no task DAG at all (missions are independent; the event-to-mission-bridge chains them via events, not edges), so there is nothing to be "already stronger" against here; the representation is the harvest, the gating is the gap. Explicit gap statement: *a dependency-aware ready-set query with cycle rejection, evaluated atomically with the claim, does not exist in Orca or CRX.*

### A5. Worktree create / archive

- **WHAT PROBLEM DOES IT SOLVE?** Parallel agents editing one checkout collide. Ad-hoc worktree use has no create/archive discipline (branch naming, empty-base guard, archival on completion, registry cleanup).
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `CreateForRun(root, runID, baseBranch)`: resolves the real repo root (never trusts CWD; resolves symlinks), refuses empty base branches (`ErrEmptyBase` — `git rev-parse <branch>` must succeed), creates the worktree at `<repo>/.orca/runs/<runID>/` on a new branch `orca/<runID>` (never checks out the base branch directly — git forbids two worktrees on one branch). `Archive(root, runID, kind)`: moves the directory to `.orca/runs/_<kind>/<runID>/` **before** unregistering (`git worktree prune`), so data is preserved even if prune fails (prune failure is non-fatal by design).
- **WHERE IS IT IMPLEMENTED?** `internal/worktree/worktree.go` (~150 lines), `internal/testutil/gitfixture.go`.
- **WHAT FAILURE DOES IT HANDLE?** Empty base branch (typed `ErrEmptyBase`); archiving a non-existent worktree (typed `ErrNotFound`); prune failure (non-fatal, data already moved); macOS `/var → /private/var` symlink non-canonicalization.
- **WHAT STATE IS DURABLE vs EPHEMERAL?** Durable: the worktree directory, the branch, the archived directory. Ephemeral: nothing — the design is deliberately filesystem-only.
- **HOW DOES RECOVERY WORK?** Archive is the recovery primitive: a killed run's work is moved to `_killed/<runID>/`, never deleted. Nothing is ever destroyed by the lifecycle.
- **GAPS FOUND IN ORCA'S OWN CODE (must be fixed in harvest):** (1) `Archive`'s `kind` is an unvalidated string — `Archive(root, id, "anything")` creates `_<anything>/`; it must be a typed enum (`shipped`/`killed`). (2) `CreateForRun` is not idempotent: a second call with the same runID fails inside `git worktree add -b orca/<runID>` (branch exists) with an untyped wrapped error, after `MkdirAll` already ran. A harvest needs a typed `ErrWorktreeExists` / `ErrBranchExists` and a pre-check. (3) No ownership check: `Archive` does not verify the worktree at the path belongs to the run (branch name check). (4) No lock: concurrent create+archive of the same runID races on the filesystem.
- **WHAT IS PROVEN vs DOCUMENTED?** `worktree_test.go` covers happy-path create, empty-base refusal, archive-shipped (directory moved, `git worktree list` clean), archive-not-found, path structure — read, not executed. The tests use real temp git repos via `testutil`, which is the right test shape.
- **CRX CLASSIFICATION: HARVEST_DIRECTLY.** MIT, ~150 lines, tested in source, zero authority risk (filesystem operations, no journal). This is the boring, correct version of CRX's current ad-hoc worktree practice (`jev-surgical` et al). Port to the CRX runtime's language with the four hardenings above, keep the MIT attribution. This is the mechanism behind test draft `04-worktree-collision-mutation-refused`.

### A6. Adapter port + registry

- **WHAT PROBLEM DOES IT SOLVE?** (Intended) Pluggable coding-agent backends behind a stable port: `Launch`/`Validate` with `Capabilities`, `Handle{PID, SessionID}`, `Result{Status, Decision, Error}`.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `Registry.Register` refuses double-registration (`ErrAlreadyRegistered`); `Get` on unknown name returns typed `ErrNotFound`. That is the entire proven surface.
- **WHERE IS IT IMPLEMENTED?** `internal/adapter/adapter.go`, `internal/adapter/registry.go`.
- **WHAT FAILURE DOES IT HANDLE?** Double registration; unknown adapter lookup. (Both are programmer errors, not runtime failures.)
- **WHAT IS PROVEN vs DOCUMENTED?** `registry_test.go` — read, not executed. Zero concrete adapters exist, so the port's actual contract (does `Launch`'s `Handle` suffice to supervise a real agent?) is unproven by construction.
- **CRX CLASSIFICATION: REJECT.** Concrete reason: the port is unproven (zero implementations — nothing has ever validated that `Handle{PID, SessionID}` is sufficient supervision surface), and it is the wrong shape for CRX. CRX workers are *canonical, authority-bearing* (`WorkerRuntime.register` with capabilities; deterministic, lineage-preserving `_emit`). A pluggable-CLI-adapter port would create a second, unauthoritative worker universe beside the canonical workers — a competing authority surface. What CRX needs is disposable *attempts* under canonical workers, not disposable *worker types*.

### A7. Decision enum (review-outcome vocabulary)

- **WHAT PROBLEM DOES IT SOLVE?** Review outcomes as free text can't drive automation.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** A closed vocabulary: `merge` / `abandon` / `needs_review`, carried on `Result.Decision`.
- **WHERE IS IT IMPLEMENTED?** `internal/adapter/adapter.go` (type + constants). No producer, no consumer.
- **CRX CLASSIFICATION: ADAPT (vocabulary only).** Adopt the three-valued review outcome as the typed vocabulary for review gates (CRX's verdict/approval paths currently lack a shared outcome enum). Trivial cost, no authority risk — vocabulary, not a writer. Do not adopt the `Result` struct or the adapter port around it.

### A8. Constraints as data (gates)

- **WHAT PROBLEM DOES IT SOLVE?** (Intended) Ship/merge gates as named, auditable, per-pod data (`name`, `command`, `timeout_s`, `enabled`) whose evaluation emits typed events (`ConstraintsPassed`/`Block`) instead of living as opaque code.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** None — only the `constraints` table DDL. No evaluation engine, no timeout enforcement, no event emission.
- **WHERE IS IT IMPLEMENTED?** `internal/store/migrations/0001_init.sql` (DDL). `internal/constraint/doc.go` is a stub.
- **CRX CLASSIFICATION: CRX_ALREADY_STRONGER on enforcement; ADAPT the representation.** CRX's gates are real and enforced (BindingVerifier, verdict-authority admission, URL-safety, Lane J completion-requires-emission). Orca's contribution is only the representation idea: gates as named rows with typed pass/fail *events*. Where CRX already emits verdict events, align the vocabulary; do not build a parallel gate engine.

### A9. Events table (audit trail)

- **WHAT PROBLEM DOES IT SOLVE?** (Intended) Immutable per-run audit of state transitions and system events.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `(id, run_id FK CASCADE, kind, payload JSON-text, created_at)`. "Immutable" is a code comment — there is no trigger or permission preventing UPDATE/DELETE, no hash chain, no tamper evidence. It is append-only by convention only.
- **WHERE IS IT IMPLEMENTED?** `internal/store/migrations/0001_init.sql` (DDL). No Go code writes to it.
- **CRX CLASSIFICATION: CRX_ALREADY_STRONGER.** `ping_events` is the canonical append-only journal with deterministic IDs, causation/correlation lineage, and the single-writer invariant. Orca's table is weaker on every axis (convention-only append, no lineage, no identity authority). Nothing to harvest; the per-run event *namespace* idea folds into the A1 attempt-row work.

### A10. Structured logs + FTS5

- **WHAT PROBLEM DOES IT SOLVE?** Agent run logs as greppable text don't scale; per-run structured logs with full-text search do.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `logs(run_id FK CASCADE, level, message, created_at)` + FTS5 virtual tables (`logs_fts`, `runs_fts`) kept in sync by AFTER INSERT triggers. Note the triggers cover INSERT only — UPDATE/DELETE on `logs` would desync the index (no update/delete path exists in the store, so this is latent, not live).
- **WHERE IS IT IMPLEMENTED?** `internal/store/migrations/0001_init.sql` (DDL + triggers). No Go writer code.
- **CRX CLASSIFICATION: WATCH.** Queryable per-run logs are valuable at 50-investigation scale; premature now (CRX has `runs.jsonl` ledgers + per-lane evidence markdown + PG journal). Revisit when log volume makes grep fail. No action.

### A11. Context files

- **WHAT PROBLEM DOES IT SOLVE?** (Intended) Declaring which extra files belong to a run's agent context, so a replacement worker can rehydrate the same context.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** `context_files(run_id FK CASCADE, path, included)` — a join table. Nothing reads it.
- **CRX CLASSIFICATION: PATTERN_ONLY.** Trivial shape; relevant only as part of the attempt-row + rehydration-bundle invention (A1/A12). Not worth a standalone harvest.

### A12. Agent-driven rehydration ("Surviving Context Loss")

- **WHAT PROBLEM DOES IT SOLVE?** Context compaction wipes the agent's in-flight state; the replacement session must re-establish what it was doing without human re-briefing.
- **WHAT EXACT INVARIANT DOES IT PROVIDE?** None — this is a README design (CLAUDE.md snippet calling `orca_list_runs` / `orca_stage` / `orca_review` on every session start). The MCP tools it calls do not exist.
- **CRX CLASSIFICATION: PATTERN_ONLY.** The *idea* is the highest-leverage design in the Orca corpus: a resumed worker queries durable run state (its attempt row, open tasks, last checkpoint) through a bounded read-only interface before acting — this is what makes workers truly disposable. But there is zero code to harvest. Fold the protocol into the A1 attempt-row invention: the attempt row's read surface IS the rehydration protocol. The worker must never gain write authority beyond its own attempt.

### A13. MCP server / control plane

- **CRX CLASSIFICATION: REJECT.** Concrete reason: zero code exists — the README's agent-setup docs describe MCP tools (`orca_list_runs`, `orca_stage`, `orca_review`) that are not implemented. There is no design to harvest, only documentation of a non-existent interface. (CRX's own MCP posture is separately owned by the mcp-execution lane: MCP stays an adapter, never an authority.)

### A14. Pod concept

- **CRX CLASSIFICATION: REJECT as an entity.** The `pods` table exists (id, name, base_branch, adapter, config_json) with no lifecycle code. Goal decomposition is coordinator intelligence, not a schema — the directive said this in Phase 1 and nothing in the source changes it. Do not build a `pods` entity until a real decomposition workload needs one.

### A15. CLI surface

- **CRX CLASSIFICATION: REJECT.** Only `orca version` exists (ldflags-injected version/commit/date — a fine pattern, but trivial). Nothing to harvest.

---

## 2. Completion bar — every critical primitive terminates

No "interesting; investigate later" remains. Each primitive ends in exactly one terminal state.

| # | Primitive | Terminal state | Evidence / note |
|---|---|---|---|
| 1 | Durable run identity (per-attempt) | **INVENTION_REQUIRED** | CRX has mission-level identity (`MissionRuntime`, deterministic `sha256(missionType:event_id)`, ON CONFLICT DO NOTHING). The *attempt* layer (one worker, one worktree, one lifecycle under a mission) has no durable row — crx-audit gap #3, confirmed against the pig-src snapshot. Orca's run row is the shape to ADAPT (A1), implemented as a PG journal namespace, not SQLite. Triangulated: Orka write-once binding + OA invocation ledger agree. Explicit gap: *a durable attempt row (mission_id, attempt_seq, worker binding, worktree, input digest, typed status) with the transition table as its only mutation path does not exist in CRX.* |
| 2 | One-writer invariant | **CRX_ALREADY_PROVEN** | `UnifiedEventRuntime.emit()` → `ping_events` is the single runtime writer (resolved 2026-09-22); `MissionRuntime` mutations are conditional single-row UPDATEs (atomicity unit = the row); ce002 variant adds attempt fencing (`attempts = $3`). Orca's `SetMaxOpenConns(1)` is per-process only — weaker, correctly rejected (A3). |
| 3 | Task claiming / leases | **CRX_ALREADY_PROVEN** | Atomic claim: `assign()` sets status/claimed_at/lease_until in one conditional UPDATE (`WHERE status='created'`), 60s lease; scheduler Arrow 0 renews every poll, Arrow 1 `reapExpiredLeases()` (P0-6) reclaims orphans and emits `MISSION_LEASE_EXPIRED`; `reclaimRetryPending()` (O3 repair). Orca contributes nothing — no claiming code exists. |
| 4 | Worktree isolation | **HARVEST_DIRECTLY** | Orca's `CreateForRun`/`Archive` (A5): MIT, ~150 lines, tested in source (read, not executed). Harvest with four hardenings (typed kind enum, typed collision error, idempotency pre-check, branch-ownership check on archive). CRX practice today is ad-hoc. |
| 5 | Worker replacement (failed workers) | **CRX_ALREADY_PROVEN** | Death detection = lease timeout (no heartbeat needed); recovery = reaper → `created` → re-claim → re-execute; hung-worker watchdog `_dispatchWithTimeout` (O5 repair); retry with backoff + exhaustion (P0-4) → DLQ (P0-5). Orca has no detection and no replacement — the row survives but nothing acts. |
| 6 | Next-work discovery | **CRX_ALREADY_PROVEN** (flat) + **INVENTION_REQUIRED** (dependency-aware) | Flat case proven: `getPending(limit)` priority-ordered + atomic claim (the get→claim race is closed by the conditional UPDATE; loser gets rowCount 0). Dependency-aware ready-set (all deps terminal-success, cycle-rejected, evaluated atomically with claim) exists in neither codebase — explicit gap (see A4). |
| 7 | UNKNOWN_OUTCOME reconciliation | **CRX proves the crash half; INVENTION_REQUIRED for the external-effect half** | Proven (pig-src snapshot): Lane J completion-requires-emission (emit accepted BEFORE row transitions; rejected emission throws, row stays `running` → normal retry path, no phantom completion). ce002 variant (source, not confirmed deployed): CE-001 deterministic completion identity + `reconcileLostCompletions()` startup reconciler (dedup no-op re-emission), CE-002 attempt fencing (`STALE_ATTEMPT` fail-closed on superseded attempts). Orca: nothing (blind user-driven `Retry`). **Explicit gap:** *unknown external effect* — if a worker dies after performing a side effect (email sent, row written elsewhere) but before reporting, no effect ledger exists in either codebase; retry would duplicate the effect. Required invention: an effect ledger (idempotency keys on external effects) + a reconcile-vs-retry classifier. Test draft 07 encodes this. |
| 8 | Evidence comparison | **CRX_ALREADY_PROVEN** | `EvidenceAuthority.verify` (hash recompute, `source_event_id` trace-back), WitnessWorker, ReplayWorker, `getTrace()` correlation-id evidence bundle. Orca's events table is convention-only append (A9) — weaker on every axis. |
| 9 | Explanation | **CRX_ALREADY_PROVEN** (deterministic path + evidence bundle); **ADAPT** Orca's input-retention | Deterministic workers are explainable from `(event_type, payload)` (rule tables); every mission carries its triggering event (`payload.event_id`) and `getTrace()` rebuilds the causal chain. Orca's contribution: store the task *input* (prompt) on the attempt row (A1) so a reviewer can see what the worker was asked, not just what it did. The typed Decision-object contract for the LLM path is owned by the Jev lane (P2/P3, 2026-09-22) — cross-referenced, not duplicated here. |

---

## 3. Harvest list (ordered, FYD tiebreak applied)

The FYD-first tiebreak (standing law #6) was considered: no harvest-priority conflict arose — every harvested mechanism is a mission-runtime primitive with no overlap against FYD's product/UI lanes. If a future harvest touches the object-graph projection layer, FYD wins automatically.

1. **A5 worktree create/archive — HARVEST_DIRECTLY.** Highest code-value harvest. Port `internal/worktree/worktree.go` → CRX runtime language with the four hardenings (§1.A5). Keep MIT attribution. Unblocks test draft 04.
2. **A1 run-row shape — ADAPT into PG journal namespace.** Closes crx-audit gap #3. Attempt row: id (UUIDv7 via IdentityAuthority), mission FK, attempt_seq, worker binding, worktree path, input digest + input text (prompt), typed status; A2's transition table as the only mutation path; read-only rehydration surface (A12). Never a second SQLite writer.
3. **A2 transition table — ADAPT.** Pure `apply(from, event)` + store-layer enforcement (Orca forgot the enforcement; we won't).
4. **A7 Decision enum — ADAPT (vocabulary).** `merge` / `abandon` / `needs_review` for review gates.
5. **A8 gate-as-data representation — ADAPT.** Named gates + typed pass/fail events, aligned with existing verdict events.
6. **A4 edge-table representation — PATTERN.** `depends_on(run_id, dep_id)` DDL only; the ready-set query + acyclicity are invention (primitive #6 gap).
7. **A12 rehydration protocol — PATTERN.** Folds into the attempt-row invention: read-only rehydration query surface for resumed workers.
8. **A11 context_files — PATTERN.** Folds into the rehydration bundle.
9. **A10 FTS5 logs — WATCH.** Revisit at 50-investigation scale.

**Rejected with reason:** A3 (competing writer authority; per-process mitigation mislabeled as invariant), A6 (unproven port; wrong shape — CRX workers are canonical), A13 (zero code; falsified docs), A14 (decomposition is intelligence, not schema), A15 (only `version` exists).

**Invention-required gaps (explicit):** attempt-level run row (#1), dependency-aware ready-set with cycle rejection (#6/A4), external-effect ledger + reconcile-vs-retry classifier (#7). The typed Decision contract for explanation is Jev-lane-owned (cross-ref §2.#9).

---

## 4. PERSISTENT ORCA WATCH — design

**Purpose:** Orca is a reference implementation / test oracle. Its value to CRX is comparative: if Orca ever implements what it currently only documents (runner/claiming, MCP server, constraint engine, dependency gating), our harvest/reject decisions may go stale. The watch detects exactly that, and nothing else.

**Pinned baseline:** `5beeefcb57555962bb93facc54b5f82484731802` (2026-05-08). Local clone: `~/workspace/crx-autonomous-missions/repos/orca/`.

**What is watched (and why):**
- HEAD SHA via `git ls-remote https://github.com/orca-cli/orca.git HEAD` — read-only, unauthenticated, conditional per standing law #4. Any SHA change = the 4.5-month silence broke.
- Releases via the GitHub releases API (conditional requests, ETag caching; token becomes a surfaced blocker only if rate limits actually block — standing law #4). README already advertises release binaries; a first real release is a meaningful signal.
- Critical modules (any commit touching these triggers a diff review): `internal/state/`, `internal/store/`, `internal/worktree/`, `internal/runner/`, `internal/mcp/`, `internal/pod/`, `internal/constraint/`, `internal/adapter/`, `cmd/`.
- `go.mod` / `go.sum` changes (dependency swaps that could affect vendored/harvested code — relevant only after A5 is harvested).
- Architectural PRs: PRs touching ≥2 critical modules, or adding a package, or changing the README's falsified claims into implemented features.

**On change — the pipeline (read-only until the last step):**
1. **Diff:** fetch the commit range, produce per-module diffs.
2. **Map to harvested mechanisms:** each diff hunk is classified against the A1–A15 table — does it touch a HARVEST_DIRECTLY/ADAPT mechanism (A1, A2, A5, A7), a REJECT (A3, A6, A13 — a new implementation could *reopen* the decision), or an INVENTION gap (A4 ready-set, #7 effect ledger)?
3. **Stale-assumption check:** for each affected decision, state the CRX assumption it rested on and whether the new code falsifies it. Examples: "Orca now implements lease-based claiming → re-open primitive #3 comparison (CRX still likely stronger, but verify)"; "Orca's MCP server is now real → re-open A13 (still likely REJECT as authority, but the rehydration protocol A12 may have a concrete implementation to compare against)".
4. **Review task — ONLY when meaningful.** "Meaningful" is defined narrowly: (a) a previously-stub package gained a real implementation; (b) the transition table's semantics changed; (c) new claiming/lease/heartbeat/death-detection code appeared; (d) the worktree layout or archive semantics changed (affects harvested A5); (e) dependency-cycle handling appeared (affects the #6 invention gap). Cosmetic changes, docs-only PRs, CI/config churn, and dependency patch bumps are logged, never tasked.

**State:** `~/workspace/autonomous-missions/orca-watch/state.json` — `{last_seen_sha, last_checked_utc, releases_etag, head_etag, findings: []}`. File-based; no new event system (continuity guardrail: never duplicate PING's event system).

**Cadence:** weekly poll is proportionate to a repo silent for 4.5 months; escalate to daily for 30 days after any SHA change.

**Activation:** this design is delivered as a section, not an active cron — creating the schedule is persistent state for the parent to authorize. The poll itself is network-read-only (no writes), consistent with the lane constraints.

---

## 5. Provenance and honesty log

- Go unavailable in sandbox → no `go vet`, no `go test`. Every "proven" claim about Orca means "test file present, source read, logic inspected" — never "executed".
- `/home/nolan/ping` not mounted → CRX API grounding via the pig-src 2026-09-19 snapshot (matches crx-audit 2026-09-22 file:line evidence) and the ce002 variant (flagged VARIANT where used).
- Orca HEAD re-verified locally: `5beeefc`, no new commits, working tree clean vs origin/main.
- No network writes performed. No repo mutations performed. No secrets in this file.
- Falsified README claims are recorded with file evidence in §0, not summarized away.

## 6. File map (Orca @ 5beeefc, implemented packages)

- `internal/state/state.go` — Status/Event types (8 statuses, 7 events)
- `internal/state/transition.go` — transition table + `Apply` (pure)
- `internal/state/state_test.go` — 16 legal + 8 illegal + unknown-status cases
- `internal/store/store.go` — `Open` (WAL, `SetMaxOpenConns(1)`, migrations)
- `internal/store/migrate.go` — embedded lexicographic migrations
- `internal/store/migrations/0001_init.sql` — full DDL (pods, runs, run_dependencies, context_files, constraints, logs, events, FTS5, triggers, indexes)
- `internal/store/runs.go` — Create/GetByID/List/UpdateStatus (raw status writes — no transition enforcement)
- `internal/store/ids.go` — UUIDv7, ShortRef, ResolveShortRef (ambiguity-typed)
- `internal/store/runs_test.go`, `store_test.go` — CRUD, filters, concurrency, ids
- `internal/worktree/worktree.go` — CreateForRun/Archive/Path (+4 gaps noted in §1.A5)
- `internal/worktree/worktree_test.go` — real-git-fixture tests
- `internal/adapter/adapter.go` — port interface, Capabilities, Handle, Result, Status, Decision, Error
- `internal/adapter/registry.go` — Register/Get (+typed errors); `registry_test.go`
- `internal/testutil/gitfixture.go` — NewRepo/NewEmptyRepo
- `internal/cli/root.go`, `version.go` — cobra root, `version` only
- Stubs (doc.go only, zero implementation): `internal/mcp`, `internal/pod`, `internal/runner`, `internal/constraint`, `internal/config`, `internal/tui`, `internal/cli/doc.go`
