# Event Authority Ordering Trace — Forensic Report

Date: 2026-09-18 (evening MDT)
Phase: FORENSIC, READ-ONLY. No implementation. No mutation.
Worktree: `/home/nolan/worktrees/constitutional-convergence`
Executed from: cloud VM via `~/workspace/pig/pigwsl-run.sh` (Pig WSL, base64-wrapped, read-only commands only)

## 1. Provenance and repo-state attestation

Pre-audit probe (17:48 MDT, Pig reachable despite 4pm commute blackout window):

- `pwd` / `git rev-parse --show-toplevel`: `/home/nolan/worktrees/constitutional-convergence`
- `git branch --show-current`: `constitutional-convergence-v2`
- `git rev-parse HEAD`: `ff9751221530eebb155d42e4972f8baa2d9a5644`
- `git status --short`:
  ```
   M CERTIFICATION.md
   M CONTRADICTIONS.md
   M EVIDENCE_LEDGER.md
   M evals/constitutional-runtime/EVAL-006_double_completion_prevention.js
  ?? evidence/
  ?? tests/mc1-legacy-ingress/
  ```
- `git worktree list --porcelain`: 13 worktrees; the convergence worktree entry confirms
  HEAD `ff975122` on `refs/heads/constitutional-convergence-v2`.

The dirty/staged state matches the expected WIP exactly. No drift.

Post-audit probe: HEAD `ff9751221530eebb155d42e4972f8baa2d9a5644`, identical
`git status --short`. A pre-existing stash (`stash@{0}`, on `night-shift-2026-09-15`)
was observed and left untouched.

No-mutation attestation: every command executed on the Pig was read-only —
`git rev-parse`, `git status`, `git worktree list`, `grep -rn`, `sed -n`, `cat`, `wc -l`.
No checkout, stash, reset, clean, add, commit, or any write into the worktree.
The audit did not mutate the source state.

## 2. Authority map (one owner per decision, with file:line evidence)

**Who authorizes event creation? — UnifiedEventRuntime.emit(), as the single choke point.**
Three gates run inside `emit()` in `ping-runtime/events/unified_event_runtime.js`:
registry membership via `EventValidator` (:117-131), the namespace privacy boundary
(`core::<name> | tenant::<id>`) via `EventGovernance` (:133-149, boundary defined at
`ping-runtime/events/event_governance.js:168,208`), and the F7/D1 value-domain boundary
inside `IdentityAuthority.generateId` which rejects before any ID is minted (:150-165).
The `LegacyIngressAdapter` holds a documented, capability-bound (object-identity, not
boolean flag) exception to the registry-membership check only — everything else applies
unchanged. Producers (HTTP routes, workers, adapters) submit candidates; the emit choke
point is the single place where acceptance is decided.

**Who constructs canonical identity? — IdentityAuthority, invoked only by emit().**
`identityAuthority.generateId('event', identityData)` at `unified_event_runtime.js:158`.
Preimage: `{type:'event', version:'2.0.0', identity_version:'2.0.0', event_type, source,
namespace, logical_id|payload}` → `CanonicalBytes.serialize` (RFC-8785) →
`CanonicalAuthority.hashBytes` → `event_<16hex>`. Timestamp is deliberately excluded
from the preimage and assigned after minting (:174). Namespace is resolved before
identity (C-007). No caller-supplied `event_id` bypass exists in the emit path.
Implementation: `runtime/kernel/authorities/identity_authority.js` (the
`ping-runtime/` copy is a pure delegation shim).

**Who persists canonical events? — UnifiedEventRuntime.emit(), sole live writer.**
Single statement at `unified_event_runtime.js:186-207`:
`INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING`,
auto-commit (no explicit transaction; the only `BEGIN` under `ping-runtime/events/`
is in the unrelated `repository_store.js`). Writer audit: the only production
`INSERT INTO ping_events` is `:196`; every other hit is a test/eval SQL-string mock
or a test fixture (`tests/mc1-legacy-ingress/assertions.js:815`, test-only).

**Who establishes ordering? — NOBODY (proven P0 gap).**
`ping_events` DDL (`unified_event_runtime.js:50-68`) has no sequence/serial/identity
column; primary key is `event_id`. Consumers sort by wall-clock `timestamp`,
`created_at`, or causal depth — equal timestamps have undefined relative order.

**Who publishes/notifies consumers? — UnifiedEventRuntime itself.**
In-process handlers via `on(eventType, handler)` dispatched at `:211-219`, plus
`IntegrationManager` routing at `:221-227`. `IEventAuthority` is dormant and plays
no role (see classifications).

**Who reads history? — Many readers, one canonical log (legitimate).**
`query()` (timestamp DESC), `getChildren` (created_at ASC), `getDescendants`
(depth, created_at), `getAncestors` (depth), `getCorrelationGroup` (created_at ASC),
plus `mission_runtime.js:417` (correlation_id, timestamp ASC),
`evidence_authority.js` `accumulate()` (event_id set, timestamp ASC),
`canonical_workers.js`, orca telemetry readers. Multiple readers of one log is not
an authority violation. Two live routes consult the dormant store first and are
flagged below (`GET /events/:stream`, `POST /events/processed|/failed`).

**Who supplies replay? — NOBODY (proven P0 gap).**
`unified_event_runtime.js` contains zero replay logic. The only cursor-based replay
that existed lived in `EventBridge`, which is `PRESERVED_INACTIVE`.
`gateway/continuous_replay_authority.js` concerns branch/PR replay, is unreferenced
by any other file, and is dormant. There is no canonical replay mechanism over
`ping_events`.

## 3. Component classifications (from executable source, never names)

- **UnifiedEventRuntime** (`ping-runtime/events/unified_event_runtime.js`): CANONICAL.
  Sole live identity minter, sole live writer, single acceptance choke point.
- **EventRepository** (`runtime/kernel/event_repository.js`, shim at
  `gateway/event_repository.js`): **LEGACY_UNREACHABLE — verified live.**
  Falsification attempt: it IS constructed and its `initialize()` IS called in the
  live bootstrap (`runtime/kernel/gateway_adapter.js:27,147`, invoked from
  `gateway_runtime.js:386-387`), so its DDL creates `repository_events` and
  `event_processing`. But the append path is unreachable: the only route from the
  adapter to `appendEvent` is `adapter.executeEvent()` (`gateway_adapter.js:53-55`)
  → `ConstitutionalExecutionPipeline.execute()` → `appendEvent`, and `executeEvent`
  is never called by the live runtime (`_kernelAdapter` is never assigned
  repo-wide; the shutdown guard at `gateway_runtime.js:836-837` is dead code).
  `getEventRepository()` has zero external callers. All other `appendEvent` call
  sites (`capability_scheduler.js`, `agent_memory_authority.js`,
  `distributed_desktop_agents.js`, `automatic_mission_generator.js`,
  `continuous_replay_authority.js`) sit in files unreachable from the live bootstrap.
  Its model (per-`object_id` caller-supplied sequence, aggregate hash chains,
  worker processing bookkeeping) is a different bounded context from the canonical
  log. Not a competing authority. Leave alone.
- **IEventAuthority** (`runtime/kernel/events/event-authority-interface.ts`):
  **DORMANT, pub/sub-shaped — a different concern.** The interface is
  `subscribe/unsubscribe/publish/getHistory/clearHistory` over execution-lifecycle
  event types (`ExecutionStarted` … `WitnessGenerated`). Zero implementations exist
  (only doc mentions in `EVIDENCE_LEDGER.md`/`CERTIFICATION.md`). It is not event
  storage authority. Never implement it to fill "the Event Authority" — that would
  be exactly the name-driven convergence mistake.
- **AcquisitionManager**: **PHANTOM.** Zero executable-source hits repo-wide; the
  only reference is in `CERTIFICATION.md`. Off the board, as ruled.
- **ConstitutionalEventStore**: **PHANTOM name.** Zero executable-source hits; only
  `CERTIFICATION.md` mentions. "Likely persistence authority" was name-based only.
  The proven persistence authority is `UnifiedEventRuntime` + PostgreSQL
  `ping_events`. The name must not be treated as evidence of anything.
- **canonical_events**: **ADAPTER / legacy ingress surface — confirmed.** Written by
  `CanonicalEventEnvelope` (`gateway/canonical_event_envelope.js`) with per-tenant
  `MAX(sequence)+1` assignment (`:95-102`, race-prone; unique constraint on
  `(tenant_id, sequence)` is the only concurrency guard) and converged into
  `ping_events` by `LegacyIngressAdapter` through `emit()`. Legitimately
  partitioned, not overlapping canonical authority.
- **LegacyIngressAdapter** (`ping-runtime/events/legacy_ingress_adapter.js`):
  **ADAPTER (live).** Polls `canonical_events` by durable per-row state (no cursor),
  resolves `tenant::<id>` namespaces fail-closed, and submits event candidates to
  `emit()`; it never mints canonical identity itself (ingress keys are carried in
  the payload so re-emission is idempotent). It never runs DDL on
  `canonical_events`. Non-atomic boundary: the emit INSERT auto-commits, then
  `_markAccepted` runs a separate UPDATE — a crash can leave the event accepted
  but the ingress row unmarked; re-polling is safe via `ON CONFLICT DO NOTHING`
  (idempotent, not transactional).
- **EventBridge** (`ping-runtime/events/event_bridge.js`): **PRESERVED_INACTIVE**
  (self-declared header, superseded by the adapter). Do not revive.
- **EventWriteAuthority** (`gateway/event_write_authority.js`): **DORMANT dead
  code, divergent identity law.** Zero instantiations, unreferenced. Uses
  `generateId('event', {type: eventType})` — different preimage from the canonical
  law — and writes to a non-canonical `events` table. Hazard only if ever wired.
- **EventBus** (`gateway/event_bus.js`): **DORMANT chain.** Reachability chain
  `event_bus → knowledge_compiler → replay_rule_set →
  constitutional_classifier/replay_kernel_audit` terminates in files with no
  requirers outside themselves; nothing in the live bootstrap touches it. Fallback-
  mints IDs via `generateId('event', {type:'event'})` and persists to the
  non-canonical `events` table. Divergent, dormant.
- **mission_event_bus.js**: **DORMANT.** Unreferenced. `_generateEventId`
  bypasses the identity authority entirely (`CanonicalAuthority.hash` over
  `{event_type, timestamp}` with timestamp IN the material, no version domain,
  direct `event_${hash}` string construction). Dormant hazard.
- **constitutional_event_sourcing.js**: **DORMANT** (required only by
  `constitutional_bootstrap.js`, which has no requirers).
- **EventReadAuthority** (kernel + shim): **read path over the dormant store,
  partially live-wired — flagged.** It reads `repository_events`. Two live routes
  in `gateway/routes/events.js` touch it: `GET /events/:stream` tries
  `getEventsByStream` (dormant table) before falling back to `ping_events`, and
  `POST /events/processed|/failed` call `markProcessed/markFailed`, which mutate
  `event_processing` (the dormant store's bookkeeping table), NOT
  `ping_events.processed`. Live endpoints with dormant-store side effects. Out of
  this P0's scope; recorded for a future unit.

No genuine constitutional ambiguity was found: every live decision has exactly one
owner, and the two gaps (ordering, replay) are proven absences, not contests.

## 4. Identity/hash trace

- Sole live minter: `emit()` at `unified_event_runtime.js:158`.
- Preimage: `{type:'event', version:'2.0.0', identity_version:'2.0.0', event_type,
  source, namespace, logical_id|payload}`.
- `CanonicalBytes.serialize` (RFC-8785) → `CanonicalAuthority.hashBytes` →
  `event_<16hex>`.
- Timestamp assigned at step 5 (`:174`), after minting — deliberately excluded so
  logical retries hash identically. `created_at` is DB `NOW()`.
- Identity is independent of ordering: no sequence, timestamp, or position
  participates in the preimage. A future sequence column must stay out of it.
- Divergence audit: the only other `generateId('event', …)` callers are dormant
  (`event_write_authority.js`, `constitutional_event_sourcing.js`, `event_bus.js`)
  or evidence fixtures. No live bypass.

## 5. Ordering findings

- `ping_events`: no ordering authority of any scope. Readers use `timestamp`
  (`query()` DESC, `mission_runtime.js:417` ASC, `evidence_authority` ASC),
  `created_at` (children, correlation group), or causal depth. Equal timestamps →
  undefined relative order.
- **Namespace** is the only runtime-supported partitioning concept: `namespace`
  column, governance-enforced `core::<name> | tenant::<id>` boundary, namespace in
  the identity preimage. But there is NO namespace-scoped sequence in
  `ping_events`.
- **Aggregate/stream** scoping exists only in dormant or dead code:
  `EventRepository` (per-`object_id` caller-supplied sequence), POST `/events`
  still accepts `aggregate_id/aggregate_type` in the body but reduces them to
  event metadata, and the dead `events` table has `aggregate_id`. No
  runtime-supported stream scope in the canonical log.
- `canonical_events.sequence` is per-tenant `MAX(sequence)+1` — the exact
  race-prone pattern Nolan flagged. It is ingress-surface metadata, re-minted on
  convergence, and must never be mistaken for canonical log order.
- Timestamp (`ConstitutionalTimeAuthority.nowAsISOString`,
  `runtime/kernel/authorities/constitutional_time_authority.js:122`) is
  observation metadata assigned post-identity. It must never be treated as log
  position.

## 6. Sequence allocation vs commit order

- Current canonical path: one auto-commit `INSERT` per `emit()`; no explicit
  transactions on the canonical path. The ingress boundary (`LegacyIngressAdapter`)
  is two separate auto-commit statements (insert, then mark-accepted) — non-atomic
  but idempotent.
- For a future database-generated sequence (identity column or sequence): the
  value is allocated at insert attempt inside the statement's transaction.
  PostgreSQL consumes the value even when the row is skipped by
  `ON CONFLICT DO NOTHING` or the transaction rolls back. Therefore a sequence
  certifies **unique monotonic allocation position assigned by the database at
  insert attempt** — and nothing stronger.
- It does NOT certify: gapless numbering (gaps are normal around
  conflicts/rollbacks); exact durable commit order (under concurrent explicit
  transactions, allocation order and commit/visibility order can diverge — the
  stall case: txn A allocates 100 and stalls, txn B allocates 101 and commits;
  `100 < 101` then certifies allocation order, not which event became durable
  first); wall-clock chronology.
- Replay over committed rows in sequence order is deterministic once the writers'
  transactions are durable. The contract must promise monotonic-unique positions
  and deterministic traversal — never gaplessness, never commit chronology —
  unless the implementation actually proves the stronger semantic. With the
  current auto-commit-per-emit design, allocation order tracks commit order in
  practice, but that is an implementation property, not a constitutional
  guarantee; the contract must not overclaim it.

## 7. Semantic taxonomy (concept → code)

- **Identity** (which event is this?) → `IdentityAuthority.generateId` in `emit()`
  (`:158`); `event_<16hex>`.
- **Hashing** (is canonical content the same/untampered?) →
  `CanonicalAuthority.hashBytes` over `CanonicalBytes.serialize` (same call path).
- **Sequence** (what ordering relationship does the authority certify?) →
  MISSING for `ping_events`. Weak/per-tenant in `canonical_events` (ingress
  only). Per-object/caller-supplied in dormant `repository_events`.
- **Timestamp** (when observed/recorded per a clock?) →
  `ConstitutionalTimeAuthority.nowAsISOString()` (`:174`, post-identity) and DB
  `NOW()` for `created_at`. Metadata, not position.
- **Causation/correlation** (why/how related?) → `metadata.causation_id` /
  `correlation_id` with expression indexes (`:66-67`); readers
  `getChildren/getDescendants/getAncestors/getCorrelationGroup`. Relatedness, not
  order.
- **Replay order** (in what deterministic order must history be reconstructed?) →
  MISSING. Nothing supplies it.

A database-generated integer solves sequence and nothing else. The other five
concepts already have owners or are proven gaps; the sequence mechanism must not
be allowed to silently absorb their semantics.

## 8. Ordering contract recommendation (evidence only)

- **Scope established by runtime semantics: NONE-PROVEN for `ping_events`.**
  Namespace partitioning exists as a privacy/identity concept, not as an ordering
  contract. Per-tenant ordering exists only in the legacy ingress surface
  (`canonical_events.sequence`, race-prone). No evidence establishes global,
  namespace-scoped, or aggregate/stream-scoped ordering as the canonical
  contract.
- **Recommended minimal contract for the gated implementation unit:**
  a database-allocated monotonic sequence as storage metadata certifying
  "unique monotonic allocation position by the canonical persistence authority";
  the constitutional claim limited to deterministic replay traversal order over
  committed rows. Storage may provide stronger ordering than the contract
  requires; tests and documentation must never claim stronger semantics
  (cross-namespace business-event ordering, commit chronology, gaplessness) than
  the runtime establishes.
- **Do not use `MAX(sequence)+1`** — the weakness is already proven in
  `canonical_event_envelope.js:95-102`. Database-owned atomic allocation only.
- If a scoped contract is ever wanted, the prerequisite evidence does not yet
  exist: no consumer has been shown to require per-namespace ordering, and no
  runtime path certifies cross-namespace relationships.

## 9. Implementation readiness and gate

Proven: sole writer, single identity law, idempotent insert, namespace
partitioning, non-atomic-but-idempotent ingress boundary, full reader inventory,
dormant/duplicate/phantom classifications, allocation-vs-commit semantics.

Still unknown: whether any consumer needs scoped (non-global) ordering (no
evidence either way); the live-Postgres acceptance environment for the eventual
unit's tests; disposition of the `EventReadAuthority` live routes' dormant-store
side effects (future unit, not this P0).

**IMPLEMENTATION GATE: OPEN.** The forensic prerequisites Nolan set — the
AcquisitionManager → identity/hash → persistence → sequence → stream/replay
trace, and resolution of ConstitutionalEventStore vs EventRepository vs
IEventAuthority — are satisfied by this report. The separately bounded
implementation unit may begin **only on Nolan's explicit authorization**; no
code was written in this phase, and this report proposes no schema change by
itself.

## 10. Commands executed on the Pig (read-only)

`cd` + `pwd`, `git rev-parse --show-toplevel`, `git branch --show-current`,
`git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
`git stash list`, `grep -rn` (class/interface/INSERT/FROM/ORDER BY/requirers/
callers), `sed -n` (bounded line windows), `cat`, `wc -l`. No write-state git
operation was performed at any point.
