# SWARM 18 — Contract/Schema Adversary: Seam Report

**Date:** 2026-09-23 ~19:00 MDT
**Scope:** TenantOS autonomous execution loop artifact boundaries (Mission, Run, Attempt, WorkOrder, ContextPack, CapabilityDecision, ToolIntent, ToolResult, Evidence, MemoryCandidate, Verification)
**Method:** adversarial read of typed artifacts at every system crossing; no identity/authority-semantics investigation (deferred to constitutional sprint per boundary update)
**Hygiene:** read-only vs repo; no FYD/HPP contact; all outputs here

## Sources attacked (base revisions)

| # | Artifact surface | File | Base |
|---|---|---|---|
| S1 | Mission row + lifecycle | `pig-src/ping-runtime/orchestration/mission_runtime.js` (469 lines) | workspace snapshot `convergence-zoom-2026-09-19/lane-d-execution/pig-src/` — NEWER than live `/home/nolan/ping/ping-runtime/` (412-line stale copy; live lacks O4 claim-owner check and Lane J completion-requires-emission) |
| S2 | Mission dispatch + completion gate | `pig-src/ping-runtime/orchestration/mission_scheduler.js` (424 lines) | same snapshot |
| S3 | Worker dispatch + result contract | `pig-src/ping-runtime/workers/worker_runtime.js` (169 lines) | same snapshot |
| S4 | Canonical workers, `_emit`, outcome vocabulary | `pig-src/ping-runtime/workers/canonical_workers.js` (1020 lines) | same snapshot |
| S5 | WorkOrder issue / authorize / verify / result identity | `~/workspace/orca-workstream-d/external_agent_adapter.js` (19,383 bytes, 2026-09-18 workstream-d port) | mirrors reference `ping-runtime/external-agent/` (proven live 2026-09-16/17); normative `WORKORDER_SCHEMA.json` / `RESULT_SCHEMA.json` **not found anywhere** — only the contract doc + inline code remain |
| S6 | WorkOrder contract (normative prose) | `~/workspace/multi-runtime-workorder-contract.md` v1.0.0-draft 2026-09-18 | — |
| S7 | Temporal tool-execution path | `/home/nolan/ping/ping-runtime/temporal/activities/mission_activities.js` | live Pig |
| S8 | Run/job envelope + ledger (meta-ai-intel) | `~/workspace/pig-fb/new-job.sh`, `~/workspace/pig-fb/meta-pass.sh` | — |
| S9 | ContextPack builder | `~/workspace/tandem/build-context-pack.py` (197 lines) | — |

**Constitutional sprint alignment:** checked `~/workspace` for sprint outputs — none present yet (sprint just launched). Seams touching identity/authority semantics are marked `DEFER→SPRINT` below, not patched.

**Diff convention:** diffs in `diffs/` are unified diffs anchored to the source files above (so they are verifiable against reality). Intended convergence target per coordinator directive is `src/tenanos/**`; each diff header names it. The one-writer adapts paths at convergence time. Diffs touching the same file use non-overlapping hunks and compose in any order.

---

## Boundary 1 — Mission (`ping_missions` row, S1)

**Schema (S1:30-52):** `mission_id VARCHAR(255) PK`, `mission_type VARCHAR(100) NOT NULL`, `status VARCHAR(50) NOT NULL DEFAULT 'created'`, `priority INTEGER DEFAULT 0`, `payload JSONB NOT NULL DEFAULT '{}'`, `result JSONB`, `assigned_to VARCHAR(255)`, `created_by VARCHAR(255)`, six TIMESTAMPTZ columns, `retries INTEGER DEFAULT 0`. No tenant/namespace column.

### 1A. Unknown `mission_type` → silent infinite skip livelock — BROKEN
- **Attack:** `create()` (S1:68) accepts any `missionType` string; no validation against `MISSION_WORKER_MAP` (S2:38-76), the de-facto enum living in a different file. `_dispatch` (S2:242-247): unknown type → `console.log` + `skipped++` + `return`. The row stays `'created'`; `getPending` (S1:~360) returns it every 5s poll forever. No terminal state reachable, no DLQ, no event — invisible to Mission Control except log spam.
- **Concrete:** a one-character typo in `missionType` wedges a scheduler slot every poll cycle indefinitely.
- **Patch:** S18-01 (dispatch: unknown type → `_failMission`, bounded retries then DLQ) + S18-02 (create-time allowlist via `options.allowedMissionTypes`).

### 1B. `mission_id` derivation: key-order-dependent + 64-bit truncation — RISKY
- **Attack:** S1:71-76: `missionId = sha256(missionType + ':' + JSON.stringify(payload)).slice(0,16)` when no `event_id`. `JSON.stringify` is key-order-sensitive: the same logical payload with different key order → different `mission_id` → duplicate missions for the same event, defeating the "idempotent by construction" claim (S1:63-66). Truncation to 16 hex chars (64 bits) is undocumented as a collision decision.
- **Patch:** S18-02 (canonical `stableStringify` for the idempotency key).

### 1C. `status` / `mission_type` are open VARCHARs, no DB CHECK — RISKY
- **Attack:** S1:32-33. Transition safety rests entirely on conditional `UPDATE ... WHERE status=...` in code (S1:110+). Any direct writer (psql, migration, second client) can set any status string. The Orca archaeology found the identical gap (table not enforced at persistence layer).
- **Patch:** none proposed (DB migration on canonical store; needs coordinator/DBA call). JS-level allowlist (S18-02) covers the application path.

### 1D. `payload` / `result` JSONB unbounded — RISKY
- **Attack:** `create()` (S1:79-82) and `complete()` stringify caller-controlled objects with no byte bound. A multi-MB payload bloats the row, the `MISSION_CREATED` event, and every `getPending`/`getTrace` read.
- **Patch:** S18-02 (create) — 256 KiB bound on serialized payload; same bound proposed for `complete()` result in report (writer to apply symmetric hunk).

### 1E. `created_by` nullable — missing actor silently allowed — RISKY
- **Attack:** S1:82: `options.createdBy || null`. Missions can enter the loop with no recorded requesting actor. The `MISSION_CREATED` event (S1:87-90) does not even carry `created_by`. For a tenant loop, the intent→mission link has no required actor anywhere (see also 6C).
- **Patch:** none proposed (would break existing callers that pass no actor); recorded as known gap. Recommend requiring once the tenant intent surface exists.

### 1F. No tenant column — tenant-blind mission row — RISKY
- **Attack:** tenant scoping lives only inside `payload.namespace` *if* the bridge put it there. Cannot `SELECT ... WHERE tenant_id = ?`; nothing enforces `payload.namespace` exists for directly-created missions. The TENANT execution loop's core entity cannot answer "whose mission is this" from its own row.
- **Patch:** none proposed (DDL + writer + reader change; needs design decision, not a seam patch). Flagged for coordinator.

### 1G. `failWithRetry` SELECT-then-UPDATE race loses increments — RISKY
- **Attack:** S1:238-243 reads `retries`, S1:248-263 writes `retries = $2`. Two concurrent `failWithRetry` calls interleave: both read N, both write N+1 — one increment lost, exhaustion delayed. The conditional `UPDATE` does not include `retries` in its `WHERE`.
- **Patch:** S18-04 (single atomic `UPDATE ... SET retries = retries + 1 ... RETURNING retries`).

### 1H. `reapExpiredLeases` bypasses exhaustion accounting — RISKY
- **Attack:** S1:309-312 resets crashed-scheduler missions to `'created'` without touching `retries`. A mission whose scheduler crashes every attempt cycles `created→assigned→running→(lease expires)→created` forever; `retries` never increments; `max_attempts` exhaustion is unreachable on this path. Contrast `failWithRetry`, which does increment.
- **Patch:** S18-05 (increment `retries` on reclaim so the counter is truthful; full reclaim-path exhaustion noted as follow-up).

### 1I. `getTrace` unguarded `JSON.parse` — SAFE (minor)
- **Attack:** S1:~395: `JSON.parse(missionRow.payload)` throws on corrupt string payload; no try/catch. pg returns JSONB as object so this is a latent path only.
- **Patch:** none (latent, low value).

**Boundary 1 grade: BROKEN** (1A livelock; 1G/1H exhaustion-accounting holes).

---

## Boundary 2 — Run

Two run-shaped artifacts exist; neither is a complete durable run record.

### 2A. Meta-ai-intel `run_id`: timestamp-as-identity, second resolution, timezone-mixed — BROKEN
- **Attack:** `new-job.sh:8`: `RUN_ID="$TS-$SLUG"`, `TS=$(date +%Y%m%d-%H%M%S)` — **local** time, 1-second resolution. `meta-pass.sh:24,37`: same construction when no job file. Two runs of the same brief within one second → identical `RUN_ID` → job file `$RUN_ID.job.json` overwritten, sidecar `$RUN_ID.provenance.json` overwritten (atomic via tmp+mv, but last-write-wins), and `runs.jsonl` (append-only, no uniqueness) silently holds two rows with the same `run_id`. Meanwhile ledger timestamps use `date -u` (UTC) — the ID embeds local time while the record is UTC; correlation across zones requires knowing the host offset. Without a job file, a retry minutes later mints a *different* run_id (no idempotency); with a job file, a retry reuses the run_id (ledger duplicates, files clobbered). Neither mode is safe re-delivery.
- **Patch:** S18-10 (UTC `TS` + PID/random suffix in both scripts).

### 2B. Ledger silent defaults: actor/auth/pack-version — RISKY
- **Attack:** `meta-pass.sh` ledger: `initiated_by` → `"unknown"`, `auth_ref` → `None`, `pack_version` → `"unknown"` (`${PACKVER:-unknown}`), `resumable: True` hardcoded for every outcome, `parent_run_id: None` always. Missing provenance is normalized, never rejected or flagged. A run with no initiator, no auth, and no pack version is indistinguishable in shape from a fully-attributed one.
- **Patch:** S18-10 covers identity; defaults left as-is (failing research crons on missing env would break the existing 6h cadence — coordinator call). Recorded.

### 2C. Mission row doubles as the run record; no per-attempt run row — RISKY
- **Attack:** the mission lifecycle (`created→assigned→running→completed/failed`) is the only durable execution record; the scheduler's `_processing` set is ephemeral. There is no durable per-attempt row (Orca A1's shape: attempt = id, status, worker binding, work location, input). Attempt counting for external work orders lives in the dispatcher's head (`attempt` param, S5:212).
- **Patch:** none (invention gap, acknowledged by wave; matches Orca archaeology "invention required").

**Boundary 2 grade: BROKEN** (2A identity collisions in an append-only ledger).

---

## Boundary 3 — Attempt

### 3A. `attempt` is caller-managed with silent default 1 — BROKEN (with 3B)
- **Attack:** S5:212: `issueWorkOrder({..., attempt = 1 })`. A dispatcher that forgets to pass `attempt` on retry silently re-issues attempt 1. Nothing in the adapter verifies the attempt number against any durable counter (none exists — see 2C).
- **Patch:** S18-07 (remove the default; `attempt` becomes required, positive integer, else throw).

### 3B. `resultIdentity` ignores result content — duplicate attempt swallows results — BROKEN
- **Attack:** S5:273-285: the binding hashed into `result_id` is `{work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id, namespace}` — **`output`, `error`, `evidence` are not bound** (the `_result` param is literally unused). `recordVerifiedResult` emits with `logical_id = result_id` for idempotent emission. Consequence: if attempt 1 is re-issued (see 3A) and produces a *different* result, the second result carries the *same* `result_id` and idempotent emission deduplicates it away — a legitimately different outcome is silently swallowed. Re-delivery is NOT safe unless the dispatcher perfectly manages attempt counters, and nothing enforces that.
- **Concrete:** worker A times out on attempt 1 (dispatcher records failure), worker B re-runs as attempt 1 (default!) and succeeds — the success can be deduplicated as the failure's result_id. Which outcome survives is a race.
- **Patch:** S18-08 (bind `sha256(stableStringify({output, error, evidence}))` into the identity).

**Boundary 3 grade: BROKEN** (3A+3B compose into silent result loss).

---

## Boundary 4 — WorkOrder envelope (S5, S6)

**Schema (S6 §2):** closed envelope, 14 required fields: `work_order_id, agent_id, mission_id, task_id, correlation_id, context_pack_id, attempt, principal, namespace, capability, input, constraints, result_path, deadline`; optional `causation_id`. Normative `WORKORDER_SCHEMA.json` not found — S5 inline code + S6 prose are the authority (version ambiguity: S6 says `1.0.0-draft`; no version field inside the envelope).

### 4A. `work_order_id` not bound to mission/namespace — BROKEN
- **Attack:** S5:163-165: `sha256('workorder:' + taskId).slice(0,16)`. Two missions issuing the same `taskId` (template reuse, retry-across-missions, two tenants) produce the **same** `work_order_id`. The "re-issue is idempotent" property (S6 §2) has global-by-taskId scope instead of per-(mission,task) scope: cross-mission result envelopes can validate against the wrong work order, and `verifyResultEnvelope`'s echo checks (`work_order_id`, `context_pack_id`, `capability` match) will happily pass.
- **Patch:** S18-06 (`sha256('workorder:' + missionId + ':' + taskId)`).

### 4B. `input` unbounded — RISKY
- **Attack:** S5:226-230: `input` must be an object, no size bound. Hermes/Ollama families inline `input` into the dispatch prompt (S6 §3) — unbounded input → prompt bloat / transport failure. Passed through to the worker verbatim.
- **Patch:** S18-09 (64 KiB JSON bound at issue).

### 4C. No explicit tenant field; tenant is string-embedded in `namespace` — RISKY
- **Attack:** the envelope has `namespace` (`tenant::<id>`) but no `tenant_id`. Consumers must parse the tenant out of the string; `core::system` namespaces have no tenant at all. Two fields that could both be "the" tenant (namespace vs parsed suffix), and neither is canonical. The commented wiring in S7:30 shows the failure mode concretely: `namespace: input.context_pack_id ? 'tenant::default' : 'core::default'` — hardcoded `tenant::default`, ignoring the actual tenant.
- **Patch:** none (needs a schema-version bump + tenant column design; flagged for coordinator).

### 4D. Schema files missing; envelope carries no version — RISKY
- **Attack:** `WORKORDER_SCHEMA.json` / `RESULT_SCHEMA.json` referenced by S5 docstrings and S6 §7 do not exist in any searched location. The envelope has no `schema_version` field, so a future v1.1 envelope is indistinguishable from v1.0-draft on the wire.
- **Patch:** none proposed (adding a version field is a wire change needing coordinator approval); S18-13's MemoryCandidate schema demonstrates the versioned-schema pattern to follow.

**Boundary 4 grade: BROKEN** (4A cross-mission ID collision).

---

## Boundary 5 — ContextPack (S9)

### 5A. `context_pack_id` is an unresolvable opaque string — RISKY
- **Attack:** S5:220-224 requires `contextPackId` non-empty; S5:308-310 requires exact echo in the result. Nothing resolves the ID to a pack: no registry, no manifest, no existence check. A dispatcher can put any string; verification compares strings, not artifacts. The tandem pack (S9) is a markdown file in `.pack-cache/` with no machine-readable manifest.
- **Patch:** S18-11 (manifest sidecar `{pack_id, version, algo, created_at, sources}` next to each pack; documents the `pack:<sha256-16>` ID format).

### 5B. Version = `sha1(pack)[:10]` — 40-bit, sha1 — RISKY
- **Attack:** S9:187. 10 hex chars = 40 bits (birthday bound ~2^20 packs — fine today, not principled); sha1 (not sha256); same content under different slugs yields same version with different filenames (version does not bind the slug); `PACK_VERSION=unknown` fallback silently accepted in provenance (S8).
- **Patch:** S18-11 (sha256, 16 hex chars, slug-bound ID).

### 5C. No tenant/actor on the pack; outreach-hardcoded — RISKY
- **Attack:** the pack builder hardcodes mission/geography sources for the outreach campaign. As a TenantOS ContextPack it has no tenant, no requesting actor, no schema — it is prose, not a typed artifact.
- **Patch:** none (product surface of the tandem; the manifest in S18-11 is the typed toehold).

**Boundary 5 grade: RISKY** (untyped, unresolvable, weak versioning).

---

## Boundary 6 — CapabilityDecision (`authorizeWorkOrder`, S5:170-210)

The decision itself is well-constructed (fail-closed: unknown agent, `blockedExternal`, capability allowlist, namespace regex, tighten-only constraints, hard `no_canonical_events`/`no_mission_state_writes`). Seams around it:

### 6A. Denied intents leave no trace — RISKY
- **Attack:** `authorizeWorkOrder` is pure; `issueWorkOrder` throws `WORK_ORDER_DENIED` with `reason`. No denial is logged, emitted, or counted. For an autonomous loop, a capability policy that silently denies is unauditable — a misconfigured profile looks identical to "no work".
- **Patch:** none proposed (logging inside the adapter would add a side channel to a pure decision function; the dispatcher/loop should record denials — flagged for swarm-02/ORCA-engine alignment).

### 6B. `NAMESPACE_RE` dual-sourced; fallback is branch drift — RISKY — DEFER→SPRINT
- **Attack:** S5:44-46: prefers `_canonicalization.NAMESPACE_RE`, falls back to an inline literal, with a comment admitting "branch drift vs the reference worktree". Two sources of the namespace grammar; behavior differs by deployment depending on which wins.
- **Patch:** none from this swarm — canonicalization authority is constitutional-sprint-owned. Flagged for sprint alignment (single-source the regex or version it).

### 6C. Temporal execution path bypasses the decision entirely — BROKEN (see Boundary 7)

**Boundary 6 grade: RISKY** (decision sound; observability and authority-sourcing gaps around it).

---

## Boundary 7 — ToolIntent → MCP/Tool Execution (S7)

### 7A. `executeWorkOrder` stub fabricates success; authorization commented out — BROKEN
- **Attack:** S7:22-52. The live temporal activity — the actual tool-execution path — returns `{success: true, outcome: {result: 'Draft generated', draft: 'Hi Jane, thanks for reaching out...'}}` **unconditionally**. `authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope` are all commented out. Any capability, including `email.send`/`sms.send` (which the contract requires route through an approval gate, S6 §6), "succeeds" with a fabricated draft. This is a phantom-success generator on the execution path: Mission Control sees success where no work happened and no authorization was checked.
- **Worse:** the commented wiring is itself contract-drifted: `adapter.verifyResultEnvelope({workOrder, resultPath: workOrder.result_path})` does not match the real signature `verifyResultEnvelope(result, workOrder, {invokedAgentId, verifiedAt})` (S5:293), and `namespace` is hardcoded to `'tenant::default'` (S7:30). Uncommenting it as-is wires a broken contract.
- **Patch:** S18-12 (fail-closed stub: throw `not wired`; correct the commented reference so a future wiring starts from the true signature).

### 7B. No ToolIntent schema; raw params destructured — RISKY
- **Attack:** S7:23: `const { missionId, capability, input, constraints, externalAgentId } = params` — no validation, no intent ID, no version. There is no distinct "intent" artifact validated *before* the capability decision; the WorkOrder envelope is the first typed thing, created after authorization.
- **Patch:** none (the WorkOrder-as-intent folding is acceptable once 7A is fail-closed; a separate intent type would be a second artifact — rejected per no-competing-implementations).

**Boundary 7 grade: BROKEN** (7A phantom success on the live execution path).

---

## Boundary 8 — ToolResult (S5:293-341 result envelope; S2:336-352 scheduler gate)

### 8A. Scheduler completion gate does not understand worker `'rejected'` — BROKEN
- **Attack:** S4:570,686,705,765 — the witness worker returns `{status: 'rejected', reason}` for unverified replays / unsupported triggers / missing roots. S2:339-352: the gate fails on `'failed'`, fails on null, and **completes on everything else** — `'rejected'` falls into the `else` → `missionRuntime.complete()`. A rejected verification is recorded as a successful mission completion with `result: {worker, completed_at}`. The worker's outcome vocabulary and the scheduler's gate vocabulary disagree; there is no shared outcome enum (Orca A7's `merge/abandon/needs_review` was "adapt vocabulary only" — the same gap, live here).
- **Patch:** S18-03 (treat `'rejected'` as failure with the worker's reason; update the outcome comment).

### 8B. `retryable` is a constant `false` — schema noise — SAFE
- **Attack:** S5:289,341: every return — valid or invalid — carries `retryable: false`. The field exists but never varies; a consumer branching on it is branching on a constant. (Intentional per S6 §5 "retry decisions live ONLY in orchestration", but then the field should not be on the wire.)
- **Patch:** none (removing it is a wire change; documented here).

### 8C. `deadline`/`verifiedAt` parsed with lenient `Date.parse` — RISKY
- **Attack:** S5:232,334: `Date.parse` accepts non-ISO formats (`"next friday"`, epoch millis as string, etc.). The contract says ISO; the code accepts whatever the engine parses. Timezone-naive strings parse as local time on the verifier — a worker and verifier in different zones disagree on the deadline.
- **Patch:** none proposed (strict ISO regex is a one-liner but changes acceptance behavior; flagged for coordinator).

**Boundary 8 grade: BROKEN** (8A rejected→completed).

---

## Boundary 9 — Evidence

### 9A. `evidence` is an open, unbounded object passed into the canonical event — RISKY
- **Attack:** S5:305-306 requires only "an object". S6 §4 explicitly leaves it open ("PING may add timing/host"). `recordVerifiedResult` (S5:348+) embeds `result.evidence` verbatim into the `WORKER_COMPLETED`/`WORKER_FAILED` event payload. No size bound, no key policy: a buggy or hostile worker can bloat the canonical journal row arbitrarily. Recommended keys (`startedAt`, `endedAt`, ...) are "SPEC-LEVEL recommended (not adapter-required)" — unenforced.
- **Patch:** S18-09 (64 KiB JSON bound in `verifyResultEnvelope`; oversized → invalid, non-retryable).

### 9B. Evidence is agent-reported but the boundary labeling is sound — SAFE
- **Credit:** S6 §4 states "It is agent-reported evidence, not canonical truth." The provenance vocabulary is honest. No patch needed; the bound in 9A is the remaining seam.

**Boundary 9 grade: RISKY** (9A unbounded into the journal).

---

## Boundary 10 — MemoryCandidate

### 10A. No MemoryCandidate schema exists in the substrate — RISKY
- **Attack:** the loop step MEMORY has no typed artifact. Memory writes are prose (`MEMORY.md`, daily notes) via agent tooling; a worker in the autonomous loop cannot emit a machine-checkable memory candidate (no ID, no version, no evidence refs, no confidence, no tenant). The convergence loop cannot close MEMORY→MISSION CONTROL without inventing this type at runtime — which would be a second memory system (forbidden).
- **Patch:** S18-13 (new `src/tenanos/memory/MemoryCandidate.schema.json`: `candidate_id`, `schema_version`, `tenant`, `actor`, `created_at`, `kind` enum, `content` bounded 8 KiB, `evidence_refs`, `confidence`, `status: proposed`). New file; nothing exists to compete with. Intended as the proposal surface only — promotion/authority stays with the memory owner (swarm-05 alignment noted).

**Boundary 10 grade: RISKY** (untyped boundary on the loop's memory step).

---

## Boundary 11 — Verification

Two verifiers exist and they are not the same check:

### 11A. Vocabulary split between verifiers — BROKEN (see 8A)
- `verifyResultEnvelope` (S5): closed status enum `{completed, failed}`, exact echo checks, deadline check.
- Scheduler gate (S2:339): `failed` → fail, null → fail, **anything else → complete**.
- A worker returning `{status:'rejected'}` passes the scheduler but would fail `verifyResultEnvelope`'s closed enum. The two verification points disagree on what a result *is*.
- **Patch:** S18-03.

### 11B. `verifiedAt <= deadline` has no lower bound and no issuance-time anchor — RISKY
- **Attack:** S5:334-339. `verifiedAt` must be ISO and `<= deadline`, but there is no check against issuance (the work order carries no `issued_at`). A result "verified" before it was issued passes.
- **Patch:** none proposed (needs `issued_at` on the envelope — wire change; flagged).

### 11C. Double-`complete()` emits a duplicate canonical event — RISKY — DEFER→SPRINT
- **Attack:** S1 `complete()`: emit-then-conditional-UPDATE. A raced second `complete()` gets emit `ok` (second `MISSION_COMPLETED` event) then UPDATE matches 0 rows. Whether the event authority deduplicates is event-authority semantics.
- **Patch:** none — sprint-owned (event identity/dedup certification).

**Boundary 11 grade: BROKEN** (11A).

---

## P0 list (fix first)

| # | Seam | Grade | Patch |
|---|---|---|---|
| P0-1 | Temporal `executeWorkOrder` fabricates success, auth commented out (7A) | BROKEN | S18-12 |
| P0-2 | Scheduler completes missions on worker `'rejected'` (8A/11A) | BROKEN | S18-03 |
| P0-3 | Unknown `mission_type` → infinite skip livelock (1A) | BROKEN | S18-01 + S18-02 |
| P0-4 | `work_order_id` unbound to mission — cross-mission collision (4A) | BROKEN | S18-06 |
| P0-5 | Duplicate `attempt=1` + content-blind `result_id` → silent result loss (3A/3B) | BROKEN | S18-07 + S18-08 |
| P0-6 | Meta-ai-intel `run_id` timestamp collisions in append-only ledger (2A) | BROKEN | S18-10 |

## P1 (patch now, small)

S18-04 (atomic retry increment), S18-05 (reclaim counts against retries), S18-09 (64 KiB bounds on work-order `input` and result `evidence`), S18-11 (pack manifest + sha256-16 version), S18-13 (MemoryCandidate schema), S18-14 (DLQ record version label).

## Proposed but NOT patched (need a decision, not a seam patch)

- 1C DB CHECK constraints on `ping_missions` (needs DBA/coordinator migration call)
- 1E required `created_by` actor (breaks existing callers; needs tenant-intent surface)
- 1F tenant column on mission row (DDL + writer + reader; design decision)
- 4C explicit `tenant_id` on WorkOrder envelope (wire/schema-version decision)
- 4D envelope `schema_version` field (wire change)
- 6B `NAMESPACE_RE` single-sourcing → **constitutional sprint**
- 8C strict ISO date parsing (acceptance-behavior change)
- 11B `issued_at` on WorkOrder (wire change)
- 11C duplicate-emission dedup → **constitutional sprint** (event authority)

## Open questions for the coordinator

1. **Live-vs-snapshot drift:** live `/home/nolan/ping/ping-runtime/` is an older copy (no O4/Lane J). Is the snapshot the convergence base, and does the live deployment get refreshed from it? (Integration/release lane?)
2. **Temporal path ownership:** is `temporal/activities/mission_activities.js` in the convergence set, or is Temporal being replaced? S18-12 assumes it converges.
3. **Mission `payload.namespace` invariant:** can the loop require it (fail-closed at create) or must direct-created missions stay legal? (affects 1F/4C)
4. **`retryable` field:** remove from the result envelope wire format, or keep as documentation? (8B)
5. **MemoryCandidate authority:** S18-13 proposes the *surface*; who owns promotion to memory — swarm-05's convergence? Confirm no duplication.

## Test notes (for the writer)

Each diff carries a suggested test in its header comment. Highest-value: (a) unknown `mission_type` reaches `failed`+DLQ within bounded polls; (b) worker `{status:'rejected'}` never completes a mission; (c) two missions sharing a `taskId` get distinct `work_order_id`s; (d) re-issued attempt 1 with different output yields a different `result_id`; (e) oversized `evidence` (>64 KiB) is invalid; (f) same brief twice in one second yields distinct `run_id`s. `src/tenanos/jest.config.cjs` (P-20260923-001, approved) is the test harness.

---
*End of SEAM-REPORT.md*
