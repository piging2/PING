# ARCHAEOLOGY SUPPLEMENT - LANE 19 INTEGRATION

**Date:** 2026-09-23. **Mode:** research only, no implementation, no philosophy.
**Source:** `lanes/LANE-19-ping-archaeology.md` (Wave 1, read-only audit of PING internals, 2026-09-22 audit of live repo @ `cc6856c3` plus a 4-file `ping-runtime` snapshot).
**Purpose:** make lane 19 consumable for the final mapper and the delete-our-need pass.
**Evidence bar:** nothing here is claimed from memory or inference. LIVE/PHANTOM classifications are lane 19's, which cite file+line sources. Check there for the primary citations.

**Note on the PING-analog index worker:** `PING-ANALOG-INDEX.md` does NOT exist yet in this tree. There are no contradictions to list. Lane 19 section 6 ("Highest-leverage existing mechanism per area") is currently the de facto analog index; this supplement does not duplicate it.

---

## (a) Dead on arrival: wave-1 harvested mechanisms whose assumed PING analog is PHANTOM

Rule: a mechanism is DOA only if it *assumed* the analog existed and built on it. Mechanisms that correctly flagged the gap as invention-required are fine and are not listed here.

**1. The Jev-lane standing instruction: "PING already has Mission -> Run -> Execution history. Reuse it."**
Source: `~/workspace/jev-archaeology/CRX-PERPETUAL-CONVERGENCE-DIRECTIVE.md:1749`.
Phantom analog: the Run entity and Execution history (lane 19: zero hits repo-wide for `run_id`/`RunRuntime`/`ping_runs`, confirmed 2026-09-22).
Effect: any Jev-lane mechanism bound to PING run history is built on air. Lane 19 calls this the single most consequential phantom and demands retract-or-prove: either name the run machinery with a file path, or retract the instruction before Jev builds on it.

**2. mechanisms.jsonl "run rotation / continue-as-new" (crx-autonomous-missions harvest, CRX_ANALOG entry).**
Claimed: close run N with a ContinuedAsNew event pointing at run N+1, carrying compacted mission state, to bound context growth per run.
Phantom analog: the Run entity and per-run event scopes. There is no run row to close and no run-scoped events to bound. DOA as a reuse of PING run identity; the underlying idea is salvageable only after a run row is invented (or re-anchored to missions).

**3. mechanisms.jsonl "Rebuilder pattern maps to CRX ReplayAuthority" (crx-autonomous-missions harvest).**
Claimed: given `ping_events` for a run, rebuild run state deterministically.
Phantom analog: run-scoped event grouping. With no run identity, there is no query that yields "the events for a run." DOA as specified. Rebuild scoped to `mission_id` (LIVE) is the honest version; lane 19's EVAL-007 (replay convergence) is the proven primitive to build on.

**4. mechanisms.jsonl "per-attempt Run IDs = deterministic function of (mission ID, attempt sequence, request ID)" (crx-autonomous-missions harvest).**
Claimed: a retried spawn resolves to the existing attempt instead of duplicating.
Phantom analog: the attempt entity. `ping_missions` carries only a `retries` counter; no attempt row, attempt ID, or attempt-scoped identity exists. DOA until the attempt row is invented. The honest stopgap per lane 19 section 6: the composite `(mission_id, retries)` is the only joinable attempt key; lanes must not invent parallel attempt IDs.

**5. mechanisms.jsonl "awakeable Signal event on the run" for human approval (crx-autonomous-missions harvest).**
Claimed: CRX needs exactly this for human approval and external events: an append-only Signal event on the run (causation-linked).
Phantom analog: the run entity. The approval-gate *concept* is salvageable (human-approval machinery is LIVE_PARTIAL: commit-scoped `ApprovalAuthority`, the research contract gate, the locked intent->identity->capability->proposal->approval->re-evaluate->effect->receipt ordering), but it must bind to a mission or a purpose-built awakeable entity, not to a phantom run.

**6. LANE-11 M2 (span links as canonical cross-trace causality): attempt-to-attempt linking.**
Claimed: attempt N+1 links to attempt N's terminal span; subagent root links to the spawning tool_call span.
Phantom analog: the attempt entity as a durable endpoint. The mechanism itself is valid (harvested from LangSmith/OTel), but the PING binding is dead at the attempt half. The mission-level and retries-level bindings are LIVE. Net: link harvesting is fine; the "attempt N+1 -> attempt N" link shape must use the `(mission_id, retries)` composite until an attempt row exists.

**7. LANE-11 M13 (LangSmith RunTree dotted_order): ordering within a mission attempt.**
Claimed: total experiential order of execution steps "within a mission attempt."
Phantom analog: again the attempt entity as the scope. Same resolution as M2: bind the ordering to mission scope, not to a phantom attempt scope.

**8. LANE-13 M2 IDEMPOTENCY-KEY: key derivation as a pure function of (mission_id, task_id, op_seq).**
Claimed: re-execution with the same key is always safe; key never derives from the attempt number.
Problematic analog: `task_id`. In PING canonical there is no durable task identity distinct from the mission; the only `task_id` in evidence comes from orca work orders, which lane 19 D5 adjudicates as a *shadow identity scheme* (work orders must anchor on canonical missions; until then they are not an authority). So the task_id term binds to shadow/phantom identity. DOA as specified. The honest version: derive from `(mission_id, op_seq)` using the `(mission_id, retries)` composite where attempt sensitivity is required. Do not lift the task_id term until canonical task identity exists.

**9. LANE-1 M-3 (orca attempt identity + record-before-dispatch, keyed on `workOrderId-attempt-N`).**
Claimed: attempt identity for the orca dispatch loop.
Phantom/shadow analog: orca work-order identity is adjudicated D5 as a shadow scheme, and `RUN_ID` itself is phantom list #16 (`orca-run-` + `Date.now().toString(36)`, non-deterministic across restarts, the documented cause of the A6 restart duplication). M-3 is DOA as a *PING-canonical* mechanism. It remains valid as an orca-plane pattern only if re-anchored on canonical `mission_id` via `MissionRuntime.create` or the `EventToMissionBridge` (the D5 verdict). LANE-1's M-1 (RUN_ID as correlation root) is already dead by the lane's own falsification note; it is cited as the negative example, so no further action.

**Not DOA (explicitly exempted because they flagged the gap, not assumed the analog):**
The mechanisms.jsonl "step journal" entry (correctly: "CRX has mission-level events but no durable per-attempt record"), LANE-12 M10 (leases, claimed "no lease primitive with expiry/renewal was observed" against PING artifacts, which the newer audit supersedes), LANE-13 M1 FENCED-LEASE (claimed "None known" for the PING analog), and LANE-17 M1 dependency-release (explicitly: "the PING draft lacks the release half"). These stay in the invention-required column.

---

## (b) Confirmed LIVE: harvested mechanisms that need no new PING machinery

These are capabilities lane 19 verifies as LIVE (with sources) that wave-1 lanes proposed to build or flagged as gaps. The delete-our-need pass should treat them as reuse, not invention.

| # | Wave-1 harvested mechanism (lane) | What PING already has (lane 19 area) | Verdict |
|---|---|---|---|
| 1 | Content-addressed event IDs + dedup on re-ingest (any lane proposing journal-level dedup; cf. LANE-12 M5 inbox dedup pattern) | Durable event log (area 4): `event_id = SHA-256({eventType, source, ...})`, no `Date.now()` in identity material, re-emit resolves to the same ID, `ON CONFLICT DO NOTHING`. 2321 rows live. | No new machinery. The structural pattern is proven at the journal layer. New dedup work belongs only at the *tool/effect* layer (area 6 gap). |
| 2 | Atomic claim on an idempotency key, "the store is the claim" (LANE-12 M1) | Mission claim (area 9): `assign()` does one conditional UPDATE `status='created' -> 'assigned'`; the loser gets rowCount 0. The get->claim race is already closed. | No new machinery for the claim semantics. The harvest adds value only as the *external-effect* idempotency-key store (area 6: "pre-tool-ship design," vetted but unbuilt). |
| 3 | Emission-gated completion / transactional outbox for completion (cf. LANE-12 M4) | Action receipts, crash half (area 5): `complete()` emits `MISSION_COMPLETED` and requires acceptance *before* the conditional row UPDATE; rejected emission throws and the row stays `running`. | No new machinery for the completion half. The missing half is the *effect* receipt (area 5 gap), which is genuinely new. |
| 4 | UNKNOWN-outcome tri-state / deliberate reconciliation (LANE-12 M8) | Unknown-outcome, crash half (area 7): lease reaper -> `created` + `MISSION_LEASE_EXPIRED` event, retry -> DLQ on exhaustion. Reference model one plane over (area 7 / D8): outreach `action-intent-ledger.py` types `UNKNOWN_EXECUTION` and refuses automatic re-execution (`cmd_refuse`, `cmd_list_unknown`, `cmd_reconcile` are deliberate acts). | No new *design* needed. Copy the outreach ledger's `UNKNOWN_EXECUTION` semantics verbatim for the PING effect ledger; the mission-level crash half is already proven. |
| 5 | Lease primitives with expiry and reclamation (LANE-12 M10 lease gap claim; LANE-13 M1 lease half) | Leases (area 9): 60s atomic claim, Arrow-0 renew every poll, Arrow-1 `reapExpiredLeases()`. The E-04 advisory-lock helper was explicitly REJECTED (unsound on pooled connections). | No new machinery for leases. New work is limited to *fencing tokens* (the M1 half PING genuinely lacks) and *progress-bearing* expiry. Do not revive the rejected advisory-lock helper. |
| 6 | Retry with backoff and a terminal dead letter (LANE-18 adversarial budget notes; LANE-12 M2 completer/recovery points) | Retry policy (area 12): `failWithRetry` increments `retries`, sets a backoff gate (default 5000ms), exhaustion at `max_attempts` (default 3) -> `failed` -> optional `deadLetterAuthority.recordDeadLetter`. Plus outreach `recovery-budgets.json` doctrine: budgets constrain recovery, never authorize exceeding caps. | No new machinery for the retry shape. The open item is wiring `deadLetterAuthority` (lane 19 unknown list #3), which is a wiring task, not a design task. |
| 7 | Replay-as-resume (deterministic workers re-executed from the triggering event) | Checkpoint/resume from scratch (area 8): canonical workers are pure functions of `(event_type, payload)`; replay IS the resume strategy; EVAL-007 replay convergence proves it. | No new checkpoint machinery for missions. Intra-run checkpointing stays invention-required, and the outreach `guard record`/`verify` pattern (area 8) is the reference for passes, not missions. |
| 8 | Verification-before-promotion (LANE-10 quarantine-then-verify; BindingVerifier family) | Evidence binding (area 16): `EvidenceAuthority.verify()` (hash recompute + `source_event_id` trace-back), WitnessWorker's `WITNESS_REJECTED` failure-honesty gate, ReplayWorker's `REPLAY_COMPLETED{verified:false}` rather than fabricated success, 10 constitutional evals (EVAL-001 to EVAL-010). Memory write provenance (area 15): `source_event_id` + `canonical_hash` + namespace on every artifact. | No new machinery for the verify pattern. Every new mechanism should emit evidence this machinery can verify (lane 19 section 6's standing rule). |
| 9 | Cross-trace correlation on a stable id (LANE-11 M8 gen_ai.conversation.id, anti-synthesis rule) | Correlation (area 17): PING threads root `correlation_id` through the mission pipeline via `EventToMissionBridge` and `BaseWorker._emit`; the canonical envelope carries `lineage`. The anti-synthesis rule maps directly: use the mission's real stable id, never invent one. | No new machinery for correlation at the mission level. Remaining gap (lane-19 area 17): `correlation_id` *fragments* mission lifecycles (595 distinct in prod) and `MISSION_*` events carry no `causation_id`; the fix is linking edges, explicitly not a new ID. |
| 10 | Deterministic, write-once identity for missions/tasks (several lanes) | Mission identity (area 3): `mission_id = sha256(missionType + ':' + event_id)`; `INSERT ... ON CONFLICT (mission_id) DO NOTHING` means the same event can never create two missions; 144/144 completed live. | No new machinery. Any new task identity anchors here; this kills the D5 shadow identity. |
| 11 | Supervisor guards: stale-worker detection, dispatch-time consistency, hung-dispatch watchdog (LANE-13 M1/M3 spirit) | Worker supervision (area 11): W-1A dispatch-time consistency guard, O5 hung-dispatch watchdog (`_dispatchWithTimeout`), P0-2 error propagation, dormant-worker fix, per-worker concurrency caps, dispatch-only mode. | No new in-process supervisor machinery. External workers are supervised by lease expiry + reaper only, by design (no cross-process heartbeat protocol; area 10). |

---

## (c) The 8 duplicate adjudications, restated as keep/kill verdicts

- **D1 (identity authority, three-way declared split).** KILL the split. KEEP ONE owner among `identity_authority.js`, `canonical-identity-service.ts`, and the Python identity authority; the emit hot path (`UnifiedEventRuntime.emit()`) must call the chosen owner instead of computing SHA-256 inline. The deprecated `deterministic_id_authority.js` stays dead.
- **D2 (tool execution: three dormant implementations + one unconnected authority).** KILL all three dormant implementations for any current-lane binding: fail-open `gateway/tool_authority.js`, `gateway/tool_gateway.js` (no auth, weak validator, `clear()` wipes the audit trail), `gateway/inference_authority.js` (discards its own manifest). If a pick must be made, `tool_gateway.js` has the best shape but must gain auth, a real validator, deterministic non-overwriting IDs, and lose `clear()`. Until then the tool layer is unauthorized-by-default; no lane may assume tool authorization exists.
- **D3 (worker episodic memory: two writers, one directory).** KEEP `worker_state_machine.js` (evidence of use: dashboard consumption). KILL the `WorkerMemory` class (zero callers; dead code). Note: neither feeds worker decisions today; both are display memory.
- **D4 (knowledge graph name collision).** KEEP the Postgres one (`ping-runtime/knowledge/knowledge_graph.js`, 197 candidate nodes live). KILL or rename the in-memory `gateway/knowledge_graph.js` imposter; a lane grepping "knowledge_graph" will otherwise bind the wrong implementation.
- **D5 (orca work orders vs canonical missions).** KEEP canonical `mission_id` as the task-identity anchor. KILL the shadow scheme: orca `work_order_id = sha256('workorder:' + taskId)` is not an authority; work orders must be issued through `MissionRuntime.create` or `EventToMissionBridge` so `mission_id` is real. The A6 restart duplication is the observed cost of the shadow scheme.
- **D6 (event tables: one live, five dead).** KEEP `ping_events`. KILL (drop, or document as traps) `canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox`: all zero rows, dead schema traps that will mislead projection and migration work.
- **D7 (memory subsystems: convergence unresolved).** KEEP the spine-projected producers: event-sourced context (`/context/*`), the vector projection, the KG projection, plus the E-06 primitives (namespace-required, bounded, evidence-verified reads). KILL any proposal for a new memory store (the convergence question is operator-grilled). The phantom members (`ConversationMemory`, `AgentMemoryAuthority`, "CRX Memory Engine" stub) stay dead; lanes must not build on them.
- **D8 (outreach intent ledger vs PING mission machinery).** KEEP BOTH; this is NOT a harmful duplicate. Different planes (outreach automation vs canonical missions), different authorities, different units of work. The verdict is *reference, not rivalry*: the outreach ledger's `UNKNOWN_EXECUTION` semantics are the proven model the PING effect ledger should copy.

---

## (d) The 9 FYD failure classes: LIVE-list help vs still-new mechanisms

Failure classes: #1 mobile-overflow, #2 unsafe-url, #3 graph-blindness, #4 fixture-drift, #5 claim-binding, #6 visibility-error, #7 clone-sitespecs, #8 correction-loss, #9 conflict-collapse. Coverage-matrix survivor claims are noted where relevant; "LIVE helps" means lane-19-verified machinery reduces the build, not that the class is closed.

| Class | LIVE-list help | Still needs new mechanisms |
|---|---|---|
| #1 mobile-overflow | Indirect: evidence binding (area 16) can verify oracle claims; the event log records assertion results. | Yes. The post-generation empirical oracle (F1S1: render, measure, assert, repair-or-block) and the geometry-typed seam (F1S2) are FYD-side harnesses with no PING analog. PING contributes no measurement capability. |
| #2 unsafe-url | Partial: the research contract gate (area 19, outreach plane) already quarantines unverified research before promotion into canonical claims; evidence provenance (area 16) traces hostile values to their source. | Yes. The typed-seam family (F2S1 schema-typed trust with capability allowlists, F2S2 sink-side validation, F2S3 fail-closed defaults) is FYD-side seam machinery; the lane-19 audit confirms no `TOOL_*` events or URL-sink instrumentation exists in PING. |
| #3 graph-blindness | Partial: the event log + recursive-CTE lineage traversal (areas 4, 17) are the proven substrate for extraction receipts (F3S2); unexplained-drop alerts can emit as `ping_events` through the single writer. | Yes. The receipt accounting, shape-coverage registry (F3S1), unknown-shape quarantine (F3S3), and dual-parser cross-check (F3S4) must still be built. The pinned-commodity-library repair pattern (jsonld@9.0.0) is established practice, not machinery. |
| #4 fixture-drift | Strong. This class gets the most LIVE help: deterministic content-addressed IDs (areas 3, 4), `ON CONFLICT DO NOTHING` semantics, pure-function workers with replay-is-resume (area 8), and EVAL-007 replay convergence (area 16) are exactly the drift-detection machinery. FAIL-4's run-twice-byte-compare practice maps onto PING's proven primitives. | Partial. The FYD regen harness and assertion suite (F1S1 determinism assertion, F1S3 canonical pure projection, F3S4 pinned reference) are FYD-side and still need building; lane 19's primitives are the substrate, not the suite. |
| #5 claim-binding | Strong. This is PING's strongest contribution: `EvidenceAuthority.verify()` + `source_event_id` + `canonical_hash` + namespace on every memory artifact (areas 15, 16), the WitnessWorker failure-honesty gate, and the locked approval ordering (area 19). FAIL-5's "no rendered claim without evidence" is the FYD rendering of a rule PING already executes at the canonical layer. | Partial. The projection-seam binding verifier (F5S1), prevention-first generation (F5S2), and claim-level provenance pointers with fail-closed dangling resolution (F5S3) are FYD-seam machinery with no PING analog; the lane-19 audit confirms binding verifiers emit booleans, not events, today. |
| #6 visibility-error | Weak/partial: the E-06 primitives (namespace-required, bounded, evidence-verified reads) and per-artifact namespace provenance (area 15) give the type-riding pattern; the outreach plane's visibility-like classification shows the pattern works. | Yes, and it is the biggest PING gap among the classes. The capability/permission model is DORMANT (area 18: fail-open, unconnected, zero callers); TenantRegistry enforcement is unverified (unknown list #7); the F6 lane has not completed, so classification authority itself is unassigned. Do not let the 7 coverage-matrix claimants for #6 mask this: they enforce a classification, none of them creates it. |
| #7 clone-sitespecs | Almost none. No LIVE mechanism addresses structural divergence between rendered sites. | Yes, and this is the thinnest class overall: only F1S1 claims it, and its own report flags the structural signature and divergence threshold as undefined. Treat as effectively uncovered until F7 completes. |
| #8 correction-loss | Partial, from two directions: the append-only journal (area 4) plus PING's no-FORGET-by-design give the base shape (corrections as records, not edits); the memory claim machinery's learned-date/replacement-chain discipline (lane-14 analog note) is a hand-rolled version of correction persistence. | Yes. The correction-persistence lifecycle (F5S3 owner-assertions-outrank, F9M4 owner task queue, F1S3 purity-as-declared-inputs) is still needed; the hard half (re-anchoring a correction when its node ID goes stale on source change) is flagged open in the FAIL reports and has no LIVE analog. |
| #9 conflict-collapse | Partial: append-only (area 4) already prevents silent merge-destroys-disagreement at the journal level; the `UNKNOWN_EXECUTION` / quarantine semantics (area 7, D8) are the proven reference for first-class unknown/conflict states; conflict-as-evidence-state (F9M1) fits `ping_events` naturally. | Yes. The conflict record entity, auditable source-priority policy (F9M3), certainty attenuation at the answer seam (F9M2), and the owner resolution loop (F9M4) are FYD-side machinery with no PING analog; lane 19 confirms no conflict-entity or policy-projection exists. |

**Summary line for the mapper:** #4 and #5 get the most from the LIVE list (determinism/replay/evidence machinery is proven and should be reused, not rebuilt); #2, #3, #8, #9 get partial substrate help and need their designed seam machinery built; #6 needs a classification authority that does not exist yet; #7 is effectively uncovered; #1 is FYD-harness work with only indirect PING help.

---

## Notes for the final mapper

1. Lane 19's phantom list (section 4) contains 16 items; the load-bearing ones for wave-1 are #1 (Run entity, blocking the Jev instruction), #2 (`run_id` owned by the runtime), #4 (`TOOL_*` events / `tool_calls` table), #6 (`AgentMemoryAuthority`, 752 lines, zero callers), and #13/#16 (orca README mechanisms and `RUN_ID` determinism). The rest are fabricated surfaces (dashboard metrics, health labels, MCP server claims) that lanes must not build on.
2. Lane 19's unknown list (section 5) contains 10 items; the ones that can flip a verdict are #1 (which DB the live gateway writes), #4 (mission cancellation existence), and #10 (correlation-ID fragmentation remedy, a decision not data). Everything else is wiring or boot-file verification.
3. Standing rejections the mapper must not let any lane re-litigate: second event journals, advisory-lock lease helpers, the fail-open `tool_authority.js`, any new memory store, and inventing RBAC (UI boundary ADR: "no invented RBAC").
4. PING-ANALOG-INDEX.md does not exist yet. When it lands, the three comparison points against this supplement are: (a) whether it repeats lane 19 section 6's per-area table; (b) whether any of its LIVE claims contradict the phantom list (especially Run/attempt identity and `TOOL_*` events); (c) whether it treats outreach-plane machinery as canonical PING (lane 19 D8: it is reference, not canonical).
