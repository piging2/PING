# LANE A — Findings Verification Report

**Lane:** A (findings verification) | **Date:** 2026-09-19 | **Mode:** read-only
**Target worktree:** `/home/nolan/worktrees/constitutional-convergence-authority-law`
**Baseline HEAD:** `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` — verified, no drift (`git rev-parse HEAD` matches)
**Dirty worktree state** (uncommitted modifications, distinguished in every claim below):
- `gateway/bootstrap/gateway_runtime.js` (4 lines)
- `gateway/test_witness_w2_versioning.js` (39 lines)
- `ping-runtime/orchestration/mission_runtime.js` (30 lines)
- `ping-runtime/workers/canonical_workers.js` (23 lines)
- untracked: `evidence/`, two test files

**Method:** every factual claim checked live against source on the Pig via `pigwsl-run.sh` (read-only: `cat`, `grep`, `sed`, `git show`, `git diff`, `sha256sum`). Other agents' deliverables treated as unaudited external work. No writes were made to the Pig.

**Verdict vocabulary:** VERIFIED (live source confirms) / FALSIFIED (live source contradicts) / UNVERIFIED (cannot be checked from available evidence). Citations are `file:line` in the stated tree.

---

## 1. HERMES FINDINGS

### 1a. WAVE_3K_HERMES_RUNTIME_AUDIT.md — claim-by-claim

The document's stated basis is `hermes/runtime.py`, `hermes/worker.py`, `hermes/execution.py`, `hermes/storage.py`, `hermes/runtime/bootstrap_loader.py`. **None of these paths exist in the convergence worktree** (or in `/home/nolan/ping`): the worktree has no `hermes/` directory at all. The closest real artifact is a different repo: `/home/nolan/projects/constitutional-runtime/hermes/`. The audit conflates two different "Hermes" things (see scope note 1c).

| # | Claim (as stated in the doc) | Verdict | Evidence |
|---|---|---|---|
| H1 | `hermes/runtime.py` (telemetry) exists and is the audit basis | FALSIFIED | No `hermes/` dir in the convergence worktree (verified by `find`). Nearest: `/home/nolan/projects/constitutional-runtime/hermes/hermes_runtime.py` (different filename, different repo) |
| H2 | `hermes/worker.py` exists | FALSIFIED (in tree) | `worker.py` exists only in the separate constitutional-runtime repo, not in the convergence worktree |
| H3 | `hermes/execution.py` exists | FALSIFIED | Nearest is `hermes/execution/` directory containing only `state_store.py` (constitutional-runtime repo) |
| H4 | `hermes/storage.py` exists | FALSIFIED | Nearest is `hermes/storage/` directory containing only `engine.py` (constitutional-runtime repo) |
| H5 | `hermes/runtime/bootstrap_loader.py` exists | FALSIFIED (in tree) | Exists only at `/home/nolan/projects/constitutional-runtime/hermes/runtime/bootstrap_loader.py` |
| H6 | Telemetry classes `ModelVersion, GPUUtil, QueueDepth, InferenceLatency, WarmCacheStatus, MemoryUsage, ModelDownloads, HealthCheck` exist in the hermes modules | FALSIFIED | Zero hits for any of these names in the hermes package (`grep -rn` across all `.py`); the word "telemetry" itself appears in no hermes `.py` file. `hermes_runtime.py` defines only `HermesRuntime` (missions: submit/cancel/status/stats/health_check) |
| H7 | `_load_connector` is a STUB ("Future: implement connector loading logic") — doc's only defect finding | FALSIFIED | `bootstrap_loader.py:179-211` is a real implementation: splits the name, tries `connectors.{name}`, `capabilities.{name}`, `storage.{name}` via `importlib`, resolves `CONNECTOR_CLASS` / `create_connector` / TitleCase class. Returns `None` only when nothing is found. It is a loader, not a stub |
| H8 | "HPP never starts Hermes; PING does" (PING starts the shared Hermes service on Oracle) | UNVERIFIED | In the convergence worktree there is no hermes runtime service to start. The only live Hermes wiring is: `orca/control-loop/hermes_dispatch.py` (invokes the **Nous Research Hermes desktop agent CLI** `hermes_cli/main.py -z` as an exterior worker) and `ping-runtime/external-agent/external_agent_adapter.js:66-77` (treats `hermes` as an exterior agent family with a proven-live CLI invocation). No evidence of a PING-managed shared hermes runtime service in this tree |
| H9 | One shared instance; per-tenant Hermes would violate the design | UNVERIFIED | No such module in the tree to check against; the doc cites PING v2, which is a doc-to-doc claim, not auditable against code here |
| H10 | Hermes events (`AgentExecution`, `ToolCall`, `AIInference`, ...) are PING-owned telemetry, not business | UNVERIFIED | These event names do not exist in the hermes package or the convergence worktree's event path; the claim is a classification assertion with no code anchor in this tree |
| H11 | Hermes references `constitution/authority/*` but never redefines it | UNVERIFIED | No hermes module in the tree references any authority module |

**Scope note 1c — what "Hermes" actually is in this tree (bearing on convergence):**
There are two distinct things, neither touching the event-authority convergence:
1. **Nous Research Hermes desktop AI agent** (`hermes.exe` on the Pig) — an *exterior worker agent* invoked via CLI (`orca/control-loop/hermes_dispatch.py`, `external_agent_adapter.js`). It is a mission/work-order *consumer*, never an event writer.
2. **The `hermes/` Python package** in the separate repo `/home/nolan/projects/constitutional-runtime` — a standalone mission runtime (`HermesRuntime.submit_mission`, sqlite `hermes_missions.db`). It contains **zero references** to `ping_events`, `canonical_events`, `UnifiedEventRuntime`, or `CanonicalEventEnvelope` (verified by grep). It is not wired into the convergence worktree at all.

**Bearing on the convergence invariants: NONE.** Neither "Hermes" writes to `ping_events`/`canonical_events`, neither mints event identity, neither sits on the `UnifiedEventRuntime.emit` path, neither triggers `EventToMissionBridge`. The WAVE_3K audit's architecture claims (shared platform, PING-starts-Hermes, event taxonomy) are doc-to-doc assertions that cannot be anchored in this tree's code, and its one code-grounded defect claim (stub `_load_connector`) is factually wrong. Hermes work may proceed or not on its own track; it neither threatens nor supports the event-authority invariants.

### 1b. HERMES_SMART_APP_CONTROL_FORENSICS.md — claim-by-claim

This is a point-in-time (2026-09-01) Windows machine-state report, not code. I re-verified the machine-state claims against the live C: drive via WSL (`/mnt/c/...`).

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| F1 | Blocked binary `win-unpacked\Hermes.exe` SHA256 = `1785D487...2D799`, size 213,963,776, built 2026-06-08 | STALE — FALSIFIED as-current | Live file SHA256 = `2184445267c8f2dd38c8d1fbfa3e32c2a32803158555823ef6d124f0d7f72e82`, size 214,007,808, mtime 2026-09-01. The binary was rebuilt after the report; the documented artifact no longer exists at that path. True-at-capture cannot be re-verified |
| F2 | Fresh signed installer at `Downloads\Hermes-Setup.exe`, 7,946,048 bytes, SHA256 prefix `CFC818AD...` | STALE — file no longer there | `Downloads\Hermes-Setup.exe` does not exist. The file now at `AppData\Local\hermes\hermes-setup.exe` is 7,946,048 bytes with SHA256 `cfc818adf831a748c61a407152a03c7a...` — i.e. it matches the doc's "fresh download" row, not the doc's "cached install" row (which claimed 7,597,376 bytes / `505DFB4C...`). The two-installer distinction in the doc no longer describes machine state |
| F3 | Executive finding: unsigned Electron dev artifact blocked by SAC by design; remediation is to use the signed installer; no policy change needed | UNVERIFIABLE from this lane | Authenticode/SAC state cannot be checked from WSL; the conclusion is an OS-policy interpretation, not a code claim. It is entirely about desktop app launch on the Pig |
| F4 | Gateway startup path (`hermes_cli.main gateway run`) is unblocked Python, unaffected | UNVERIFIABLE | Process-state claim from 2026-09-01; no live process check performed in this lane (out of scope for read-only convergence audit) |

**Bearing on the convergence invariants: NONE.** This document concerns whether a Windows desktop shortcut launches an unsigned Electron binary. It has no intersection with `UnifiedEventRuntime`, `ping_events`, event identity, or the mission path.

---

## 2. DEVIN CASCADE

Produced across two sibling worktrees (both authored by Devin, 2026-09-17/18). These are **not** the convergence worktree; their changes are not merged into the convergence target. Audited read-only via `git show`.

### 2a. `/home/nolan/worktrees/ping-event-runtime` — branch `event-runtime-deduplication` (HEAD `1f40cf432`)

| # | Claim (commit message / test name) | Verdict | Evidence |
|---|---|---|---|
| D1 | `1f40cf432`: "When ON CONFLICT DO NOTHING occurs (rowCount: 0), the runtime now reads the persisted row and compares canonical content: same payload = genuine duplicate; different payload = collision (error, collision: true)" | VERIFIED in code structure, **FALSIFIED against real SQL execution** | `ping-runtime/events/unified_event_runtime.js:157-188`: the duplicate branch SELECTs the persisted row and compares payloads. BUT the query is literally `'SELECT payload, metadata, namespace FROM ping_events WHERE event_id = '` with params `[event.event_id]` — the `$1` placeholder is **missing** (line 159). Against a real PG pool this throws a syntax error; the `deduplicated: true` / `collision: true` outcomes are reachable only in the mock tests. The mock pool answers `sql.includes('SELECT')` without executing SQL, which is why the 11 tests passed |
| D2 | "Does the collision detection compare the FULL canonical digest or only the truncated ID?" | NEITHER — it compares the full **payload** only | `unified_event_runtime.js:165-175`: `JSON.stringify(persistedRow.payload) === JSON.stringify(event.payload)`. It does **not** compare the truncated event ID, and it does **not** compare the full canonical digest either: metadata is deliberately excluded by design (commit message: "metadata can differ on legitimate retries (causation_id, correlation_id, etc.), so only payload collision is treated as an error"). Namespace is read but never compared |
| D3 | `23f0df57e`: "Persisted duplicates now return early with deduplicated=true before dispatching handlers or integrations" / "does dedup actually prevent double handler dispatch, and at what layer?" | VERIFIED (in this worktree only) | The dedup/collision branch `return`s (lines 157-188) before step 6 "Dispatch to handlers" and step 7 "Route to integrations". Layer = **UnifiedEventRuntime.emit**, in-process, before handler dispatch. Caveat: because of D1's broken SQL, against real PG the duplicate path errors in the `catch` (`Persist failed: ...`) rather than returning `deduplicated: true`; handlers are still not re-dispatched (the error return also precedes them), so the no-double-dispatch property holds, but via an error path, not the designed one |
| D4 | `4d02c332f`: concurrent duplicate emissions test — "9 duplicates, 1 canonical outcome" | VERIFIED against mocks only | Test uses mock pools; the underlying `ON CONFLICT DO NOTHING` + `rowCount` logic is sound, but real-PG behavior of the follow-up SELECT is broken per D1 |
| D5 | `fc19b0fc7` "docs(hardening): correct false implementation claims" | VERIFIED (doc-only hygiene commit) | Not behavior; no code impact |

**Net:** the Devin event-runtime cascade's *intent* (dedup-before-dispatch, payload-level collision detection) is real in code, but the collision-detection SELECT is syntactically invalid against real Postgres. Any duplicate emission at runtime would surface as a persist error, not as `deduplicated: true`. This worktree's changes are NOT in the convergence worktree (whose UER dedup path, by contrast, re-dispatches handlers — see §3b).

### 2b. `/home/nolan/worktrees/ping-codex-convergence` — branch `codex/context-workorder-convergence` (HEAD `08c3036d9`)

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| C1 | `b30790f3f` "feat(workorder): bind authorized ContextPack identity" — does ContextPack identity actually bind authority? | VERIFIED | Three independent bindings: (1) `issueWorkOrder` requires non-empty `contextPackId` string, else `WORK_ORDER_DENIED` (`external_agent_adapter.js`, `Object.entries({..., contextPackId, ...})` check); (2) `resultIdentity()` hashes `context_pack_id` into the SHA256 result identity (`external_result:${stableStringify(binding)}`); (3) `verifyResultEnvelope` rejects with `'context_pack_id mismatch (result does not match authorized context)'` when `result.context_pack_id !== workOrder.context_pack_id`. The verified-result event also carries `context_pack_id` in payload and metadata |
| C2 | The bound identity is content-derived and authority-backed, not a bare label | VERIFIED | `context_compiler.js:290-297`: `context_pack_id` = hash over `{mission_id, query, namespace, correlationId, retrieval_hash: retrievalManifest.hash}` where the manifest covers the canonicalized event set. `compile()` requires the canonical event runtime, EvidenceAuthority, canonical namespace (`/^(core|tenant)::...$/`), and tenant-scoped evidence verification (`f20f6b9c4`, `67daa5b15`). The pack is a derived consumer of `getCorrelationGroup`, never an event writer |
| C3 | `a97e6a97f` "test(workorder): reject ContextPack result substitution" | VERIFIED (test exists, 150 lines, `context_workorder_binding.test.js`) | Test-only commit; asserts substitution rejection. Not executed in this lane |
| C4 | `902f40f44` "make ContextPack selection replayable", `3ddb03404` "canonicalize event sets for determinism" | VERIFIED (present in history) | Supporting determinism commits; consistent with C2's retrieval-manifest hash |

**Net:** ContextPack identity binding is real and multi-layered (issuance gate + result-identity hash + envelope verification + content-derived ID). This cascade is healthy and has no conflict with the convergence invariants: the ContextPack is a derived consumer of canonical events, and the workorder boundary never mints event identity.

---

## 3. THE TWO STRONGEST NEW FACTS

### 3a. Event-derived mission identity is deterministic — VERIFIED

- `ping-runtime/orchestration/mission_runtime.js:71-76` **at HEAD** (`git show HEAD:...`, lines 71-76) and `mission_runtime.js:74-76` in the dirty worktree (identical logic; the dirty diff touches other methods):
  ```js
  const idempotencyKey = payload.event_id
    ? `${missionType}:${payload.event_id}`
    : `${missionType}:${JSON.stringify(payload)}`;
  const missionId = crypto.createHash('sha256')
    .update(idempotencyKey)
    .digest('hex').slice(0, 16);
  ```
- For event-derived missions (`EventToMissionBridge._handleEvent` passes `event_id` in the payload — `event_to_mission_bridge.js:129-140`), the preimage is exactly `missionType:event_id`. **`Date.now()` is not in the preimage.** (`Date.now()` appears at `mission_runtime.js:175,257` for lease/duration bookkeeping only, never in identity.)
- The doc comment at `mission_runtime.js:62-66` states the invariant explicitly: "mission_id is deterministic: hash(missionType:event_id) when event_id is present... Same event always produces the same mission — idempotent by construction. ON CONFLICT DO NOTHING prevents duplicate missions."
- Caveat (not a falsification): the no-`event_id` fallback hashes `JSON.stringify(payload)`, whose key order is insertion-order dependent — deterministic per caller, but not canonicalization-guaranteed. Only the event-derived path was claimed, and it is exact.

**Verdict: VERIFIED** (both HEAD and dirty worktree).

### 3b. The durable-handoff break — VERIFIED

Exact ordering, all citations in the convergence worktree (adapter and bridge files are **clean at HEAD**; `gateway_runtime.js` ordering lines are identical at HEAD — the dirty diff there only adds `WORKER_COMPLETED`/`WORKER_FAILED` to a graph-projection list at lines 618+):

1. **UER.persist** — `ping-runtime/events/unified_event_runtime.js:243-251`: `INSERT INTO ping_events (...) VALUES ($1..$7) ON CONFLICT (event_id) DO NOTHING`. (Note: in THIS worktree the dedup branch does **not** skip handlers — it re-reads the sequence at lines 257-268 and falls through to dispatch. The Devin early-return dedup exists only in the sibling worktree.)
2. **Mission consumer runs** — UER step 7 "Dispatch to handlers" (`unified_event_runtime.js:276-283`, `await handler(event)`) → `EventToMissionBridge._handleEvent` (`event_to_mission_bridge.js:113-147`) → `await missionRuntime.create(...)` → `INSERT INTO ping_missions ... ON CONFLICT (mission_id) DO NOTHING` (`mission_runtime.js:78-83`). The bridge subscribes only inside `EventToMissionBridge.start()` (`event_to_mission_bridge.js:98-107`).
3. **Receipt marked processed** — back in the adapter, only on `emitResult.status === 'ok'`: `_markAccepted` (`legacy_ingress_adapter.js:406-418`) → `UPDATE canonical_events SET processed = TRUE, processed_at = NOW(), ... WHERE event_id = $1 AND processed IS DISTINCT FROM TRUE` (`legacy_ingress_adapter.js:476-483`).

**The break:** `gateway/bootstrap/gateway_runtime.js:493` calls `legacyIngressAdapter.start()`, whose `start()` fires the first sweep **immediately** (`legacy_ingress_adapter.js:220`: `this._poll()` right after `setInterval`). `EventToMissionBridge.start()` — the only thing that registers the mission-creating handlers — is not called until `gateway_runtime.js:605`, after ~110 lines of further init (connectors, mission scheduler, graph projection setup, etc.). **During that window, any legacy row the adapter sweeps is: persisted to `ping_events` by UER → `emit` returns `status: 'ok'` (no bridge handler exists to run) → `_markAccepted` sets `processed = TRUE` → the sweep's `WHERE processed IS DISTINCT FROM TRUE` (`legacy_ingress_adapter.js:288`) skips it forever.** The event is in the canonical journal, the receipt is durably marked, and **no mission was ever created for it — permanent mission loss with no retry path.**

Additional loss variants of the same ordering defect (same files):
- If `EventToMissionBridge.start()` runs in degraded mode (missing `missionRuntime` → early return, no subscriptions), the same silent loss occurs for every subsequent sweep.
- If UER is in degraded in-memory mode (`this._pool` null), `emit` still returns `ok` and handlers still run, but nothing is persisted — the receipt is marked accepted while the canonical journal has no row. (Observed degraded-mode precedent noted in operator context.)

**Verdict: VERIFIED.** The claim is confirmed as stated: receipt becomes processed AFTER UER persistence but the mission consumer has not durably consumed the event (because it had not started), producing mission loss.

---

## 4. ESCALATION LANE

**E1 — NEW CONSTITUTIONAL CONTRADICTION (durable-handoff invariant violated).** The convergence program's durable-handoff invariant is, in effect: *a legacy receipt may only be marked processed once its downstream effects (canonical persistence AND mission creation) are durably established.* The startup ordering in `gateway_runtime.js` (adapter live at :493, bridge live at :605) violates this for every row swept in the window, with no detection or replay. This is not a two-writer race; it is a single-writer ordering defect with permanent data consequence (mission loss, invisible to the sweep). Recommended for the operator's decision queue; I propose no patch (other lanes own that).

**E2 — No unresolved two-writer condition found in the live path.**
- `ping_events`: exactly one production writer — `UnifiedEventRuntime` (`unified_event_runtime.js:245`). All other `INSERT INTO ping_events` hits are test/eval mocks.
- `canonical_events.processed`: exactly one live writer — `LegacyIngressAdapter` (`legacy_ingress_adapter.js:476/491/510/535`). The second writer in the codebase, `event_bridge.js:322` (`worker = 'event_bridge'`), is **PRESERVED_INACTIVE**: the bootstrap comment states "Supersedes EventBridge (PRESERVED_INACTIVE)" (`gateway_runtime.js:485`) and no `new EventBridge` exists in production code.
- `CanonicalEventEnvelope` is still instantiated and mounted (`gateway_runtime.js:401,715`) but explicitly documents itself as a **receipt surface, not an acceptance authority** (`canonical_event_envelope.js:222-234`: "this path is a RECEIPT surface... Constitutional identity, ordering, and acceptance timestamp are minted only if/when this row converges through UnifiedEventRuntime.emit()"). The standing law ("never revive as a second runtime event authority") is honored in current code.

**E3 — Unaudited external work with a live defect (flag, not escalation).** The Devin `ping-event-runtime` worktree's collision-detection SELECT (`unified_event_runtime.js:159` in that worktree) is missing its `$1` placeholder — syntactically invalid against real Postgres, so the designed `deduplicated:true` path is unreachable outside mocks. If that branch is ever merged toward the convergence line, it must be fixed and re-proven against a real pool. Left for the owning lane.

---

## Appendix — citation index

- Convergence worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law/`
- `ping-runtime/orchestration/mission_runtime.js:71-76` (HEAD) / `:74-76` (dirty) — deterministic mission identity
- `ping-runtime/orchestration/event_to_mission_bridge.js:98-107` (start/subscribe), `:113-147` (_handleEvent)
- `ping-runtime/events/unified_event_runtime.js:243-251` (persist), `:276-283` (handler dispatch)
- `ping-runtime/events/legacy_ingress_adapter.js:212-222` (start/immediate poll), `:288` (sweep filter), `:406-418` (_markAccepted), `:476-483` (processed=TRUE update)
- `gateway/bootstrap/gateway_runtime.js:493-494` (adapter start), `:601-605` (bridge start), `:485` (EventBridge PRESERVED_INACTIVE), `:401` (envelope instantiation)
- `gateway/canonical_event_envelope.js:206-245` (receipt semantics), `:339+` (acceptCanonicalEvent)
- `ping-runtime/events/event_bridge.js:322` (inactive second writer)
- Devin worktree A: `/home/nolan/worktrees/ping-event-runtime/` — `ping-runtime/events/unified_event_runtime.js:157-188` (dedup/collision branch), commits `1f40cf432`, `23f0df57e`, `4d02c332f`, `75827fbd7`, `fc19b0fc7`
- Devin worktree B: `/home/nolan/worktrees/ping-codex-convergence/` — `ping-runtime/external-agent/external_agent_adapter.js` (b30790f3f diff), `ping-runtime/context/context_compiler.js:290-297` (pack ID), commits `b30790f3f`, `a97e6a97f`, `f20f6b9c4`, `67daa5b15`, `902f40f44`
- Hermes python package: `/home/nolan/projects/constitutional-runtime/hermes/` — `hermes_runtime.py:30` (HermesRuntime), `runtime/bootstrap_loader.py:179-211` (_load_connector, not a stub)
- Forensics machine state: `/mnt/c/Users/nolan/AppData/Local/hermes/...` (live hashes/sizes as of 2026-09-19)
