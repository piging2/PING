# MARKETINGOS OPERATIONALIZATION WAVE — Phase 1 Report

**Date:** 2026-10-01
**Ordered by:** Nolan, ~11:49 MDT
**Coordinator:** PING program coordinator (subagent 376497b0)
**Status:** Phase 1 (9 tracks) COMPLETE. Phase 2 (4 design tracks) COMPLETE. All 13 tracks done. Blocked items held for owner decisions (listed below).

This report follows the wave's reporting law: product integration, not agent activity.
Format per arrow: ARROW / BEFORE / FIRST BROKEN EDGE / EXISTING OWNER / SMALLEST DELTA / COMMIT / TEST / REACHED? / SERVED? / OBSERVED? / NEW CAPABILITY / STRANDED / NEXT BROKEN EDGE.

Constitutional constraints honored throughout: NO NEW SUBSYSTEM until an existing primitive is proven incapable. ONE BRAIN. MANY HANDS. NO PARALLEL SOVEREIGN RUNTIMES. Commit law absolute. No pushes.

---

## Infrastructure (pre-track, 2026-10-01 ~11:52 MDT)

**Pig reachability.** The Tailscale CONNECT tunnel failure from ~11:31 MDT recovered on its own, consistent with the transient-WiFi hypothesis. Verified `ssh pigwsl` returns PIG_ALIVE and all containers healthy. First broken edge was the proxy CONNECT tunnel; nothing was restarted. Full chain TAILSCALE PEER to ROUTE to WINDOWS to WSL to SERVICE verified.

**AC host policy.** Per the binding directive, set Pig AC system sleep to Never via `powercfg /change standby-timeout-ac 0` (was 30 min). Display sleep and DC behavior untouched. Before/after values and exact rollback (`powercfg /change standby-timeout-ac 30`) recorded at `~/workspace/pig/host-policy-ac-sleep-2026-10-01.md`. Host policy, not application architecture.

---

## POINT 1: P0 operational liveness — HOLD to RESOLUTION

**ARROW:** HOLD to RESOLUTION (operator visibility and operation)

**BEFORE:** Five held missions (four siblings plus one proof mission) sat in the missions DB with no operator work queue. The wave premise stated no scheduler performs the held-resolution sweep.

**FIRST BROKEN EDGE:** Two findings, one action.

1. **T1 sibling holds (done 17:59 UTC).** All four remaining held missions in `ping-postgres`/`integrate_run` (`bc1d0595338bd5fa`, `278093e4ba9cc2c8`, `f66c5dc77ad3b12f`, `333ae6feeb703ca7`) were independently investigated (distinct run/event IDs, principals, grant expiries; per-mission Qdrant and event-store absence checks) and each truthfully resolved MANUAL_RESOLUTION via the existing `orchestration/resolve-hold-cli.js`. All were one-shot fault-injection test missions from concluded 2026-09-30 runs with expired grants and genuinely unknowable outcomes; PROVEN_OCCURRED and PROVEN_NOT_OCCURRED were rejected per mission for lack of positive proof. Post-resolution: status=completed, hold cleared, completed_at 17:58:39 to 17:58:56 UTC; full-row sha256 diff confirmed only resolution columns changed; `hold_at IS NOT NULL` count = 0. Proof mission `67d994a00e844226` untouched. Notable: `resolveHold` emits no ping_events; resolutions live only in the mission row's result JSON (a visibility gap).

2. **T3 premise correction (done 18:01 UTC).** Against canonical source `/home/nolan/ping`, the held-resolution sweep EXISTS and IS wired: `MissionScheduler._poll()` runs `reconcileHeldMissions()` every poll (default 5s), and `gateway/bootstrap/gateway_runtime.js` lines 569-578 constructs and starts the MissionScheduler. The Track A finding examined only the 19-line `gateway/server.js` and missed the bootstrap where all wiring lives. BUT the live deployment (`ping-gateway` container) PREDATES the entire HOLD repair (E2/E3, 2026-09-27): zero `reconcileHeldMissions`, zero `hold_at`/`markHold`, no CLI, no runbook in the image. Its `_dispatch` catch calls `_failMission`, so in production today an unknown outcome becomes FAILED, never HELD. Zero HOLD lines in 18h of container logs.

**EXISTING OWNER:** MissionRuntime (markHold/resolveHold/findHeld), MissionScheduler (reconcileHeldMissions + escalation), gateway `/mc` route layer.

**SMALLEST DELTA (designed, not built):** One read-only route, `GET /mc/missions/held`, in `gateway/routes/mission_control.js`, mirroring the existing `/mc/dead-letters` pattern. Calls existing `MissionRuntime.findHeld(limit)`. Returns queue identity, age (from durable hold_at), reason, possible effect (payload/assigned_to/retries), evidence links (existing `/mc/missions/:id/trace` + MISSION_RECONCILE_HOLD events in ping_events), and static available-resolutions text from the runbook. Push via a dumb poll-and-page cron outside PING reading that endpoint. No new authority, scheduler, runtime, or store. Cannot-silently-disappear rests on existing machinery: durable row, restart re-armed escalation keyed per hold episode, fail-closed resolveHold, no auto-resolve.

**COMMIT:** none (design only).
**TEST:** n/a.
**REACHED?** No. **SERVED?** No. **OBSERVED?** No.
**NEW USER-VISIBLE / OPERATOR-VISIBLE CAPABILITY:** none yet.
**STRANDED VALUABLE IMPLEMENTATION:** the held-visibility design; the HOLD repair itself (in source, not deployed); the resolve-hold CLI (not in the deployed image).
**NEXT BROKEN EDGE:** gateway redeploy (owner/deployment decision) to bring the HOLD repair and the visibility route live. Until then there are no production holds to make visible.

---

## POINT 2: Jev namespace failure — traced, fixed, committed

**ARROW:** CLASSIFICATION_CREATE to jev-shadow call to JEV_DECISION_EVALUATED to namespace admission to failure

**BEFORE:** 33 failed CLASSIFICATION_CREATE missions in the live DB, error `No owner defined for namespace 'jev'`.

**FIRST BROKEN EDGE (T4, done 18:04 UTC):** Traced mission `59108dd6936ee3da` (type CLASSIFICATION_CREATE, status failed, assigned_to=classification, created_by=event-to-mission-bridge, tenant_id=UNKNOWN; created 2026-10-01 00:30:41 UTC, terminal failed 00:31:06 UTC). Event chain: CLAIM_CREATED 00:30:41.489 to MISSION_CREATED to MISSION_ASSIGNED to MISSION_STARTED to MISSION_FAILED (retries 1-3). Smoking gun: CLASSIFICATION_CREATED was emitted by source `classification` at 00:30:46.522, 14ms BEFORE the first MISSION_FAILED. The primary worker ran and succeeded inside the same dispatch; the mission failed purely on the shadow observer's emit rejection, after the primary result was already produced. Downstream pipeline continued anyway (RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_COMPLETED, WITNESS_REJECTED). Zero JEV_DECISION_EVALUATED events exist in ping_events.

Two-layer cause:
(a) The `jev` namespace is genuinely missing: `_extractNamespace('JEV_DECISION_EVALUATED')` derives `jev`, but NAMESPACE_OWNERS has no `jev` entry, and `git log -S "jev"` on event_governance.js is empty. The namespace was never registered; the emit could never have passed governance in this tree.
(b) The shadow emitter is incorrectly placed in the parent mission's critical path: `MissionScheduler._dispatch` builds the dispatch event with `event_type = payload.event_type` (CLAIM_CREATED, not the mission type); `WorkerRuntime.dispatch` fans out to ALL workers registered for CLAIM_CREATED (classification, then jev-shadow); classification succeeds, jev-shadow throws; dispatch's catch does `throw err`, landing in `_dispatch`'s catch to `_failMission`. Each of the 3 retries re-ran the primary classification (duplicate CLASSIFICATION_CREATED events) before terminal FAILED.

Intended contract (proven from code before changing anything): `shadow_worker.js` header ("ZERO execution authority", "The canonical pipeline is never altered", "only adds observation records"), `gateway_runtime.js:525-528` ("Zero execution authority", "Never alters canonical pipeline behavior"), `typed_decision.js` header ("Jev has ZERO execution authority"). The throw-into-dispatch behavior contradicts all three. Per the wave constraint, the namespace was NOT added and Jev was NOT constitutionalized.

**EXISTING OWNER:** UnifiedEventRuntime (verdict-class admission), EventGovernance (namespace ownership), WorkerRuntime.dispatch, MissionScheduler._dispatch.

**SMALLEST DELTA:** In `JevShadowWorker.handle()`, the emit is wrapped in try/catch: on failure it logs `[JevShadowWorker] SHADOW FAILURE: emit JEV_DECISION_EVALUATED failed (...); primary mission unaffected` and returns `{ status: 'ok', record, shadowEmit: { persisted: false, error } }`. No governance, verdict-admission, or namespace changes. Jev stays shadow-only.

**COMMIT:** `23e15f622572bc8fdca46ff42b61d6817f6423df` on branch `testing/ladder-2026-09-30`, message `fix(jev): isolate shadow emit failure from parent mission outcome`. Staged only `ping-runtime/jev/shadow_worker.js` (19 insertions, 4 deletions). No push. Temp replay scaffolding removed from the repo tree.

**TEST:** Replay with real modules on the traced mission's dispatch event (fake pg pool). BEFORE (HEAD): dispatch threw the exact production error; CLASSIFICATION_CREATED persisted=1; JEV_DECISION_EVALUATED persisted=0; mission outcome FAILED. AFTER (patched): no throw; receipt `{status:'ok', shadowEmit:{persisted:false, error}}`; CLASSIFICATION_CREATED persisted=1; JEV_DECISION_EVALUATED persisted=0; mission outcome COMPLETED; SHADOW FAILURE visible on console. Regression: `gateway/test_verdict_authority.js` 34 passed / 0 failed; `gateway/test_production_bootstrap_load.js` 6 passed / 0 failed (incl. PB-6 shadow-only).

**REACHED?** Yes (committed). **SERVED?** No (takes effect on the live gateway's next restart/reload of this module; nothing running was changed). **OBSERVED?** Replay observed; production not yet observed.

**NEW USER-VISIBLE / OPERATOR-VISIBLE CAPABILITY:** none (bug fix, not capability).

**STRANDED VALUABLE IMPLEMENTATION:** the fix itself (committed, awaiting deployment).

**NEXT BROKEN EDGE:** deployment of the fix; the 33 already-failed missions remain `failed` (historical truth; retrying would re-run the primary classification and emit duplicate CLASSIFICATION_CREATED events — owner decision, left alone by design). Residual: JEV_DECISION_EVALUATED is registered at the verdict layer but has no governance namespace owner, so shadow records still cannot persist; making them durable needs an explicit authority ruling, not a quiet namespace addition.

**Topology correction:** `ping_runtime` lives in container `brain-postgres`, not `ping-postgres` (which holds `crx_runtime`, `integrate_run`, `lanea_gate`). The traced failure was written to `brain-postgres`/`ping_runtime` on 2026-10-01 00:30:41 UTC with post-tenant schema (tenant_id column present). The currently running `ping-gateway` container (up since ~01:04 UTC) serves older code and, per T5, reads `ping-postgres`/`crx_runtime` with pre-tenant schema. The service-to-DB topology (which writer produced the 00:30 UTC failures; which DB the live gateway actually writes) is NOT fully reconciled. Flagged as an open question for the owner/operator.

---

## POINT 3: INTELLIGENCE_RESEARCH mission — recipe ready, dispatch blocked

**ARROW:** QUESTION/OBJECTIVE to INTELLIGENCE_RESEARCH to SOURCES to OBSERVATIONS to EVIDENCE to CLAIMS

**BEFORE:** No INTELLIGENCE_RESEARCH mission type, worker, or dispatch path.

**FIRST BROKEN EDGE (T5 mission-substrate-recon, done 18:02 UTC):** The full substrate is mapped. Mission creation flows through exactly one function, `MissionRuntime.create(missionType, payload, options)`, via three entry points: HTTP `POST /missions`, the EventToMissionBridge (automatic, the main production path), and direct code calls. Mission types are open at storage (VARCHAR, no enum) but closed at dispatch: `MISSION_WORKER_MAP` in mission_scheduler.js maps type string to worker name; unmapped types are skipped forever ("No worker for mission type"). The scheduler dispatches on `payload.event_type` (the original business event), NOT on `mission_type`, so a new mission type works only if the payload's event_type is in some registered worker's `eventTypes`. New event types MUST be registered in `gateway/generated/event_registry.json` (239 types); `EventValidator` is wired into the live UnifiedEventRuntime and fails unregistered types. Verdict-class types additionally require the exact producer worker.

**CRITICAL FINDING:** The live container is behind the repo. Live `ping-gateway` runs pre-tenant, pre-HOLD code: its `ping_missions` (DB `crx_runtime`) has no `tenant_id`/`hold_at`/`hold_reason` columns; mission_id = sha256(missionType:event_id) with no tenant; `POST /missions` takes `{missionType, payload, priority, createdBy}` with no tenant; live routes sit behind an `exteriorAuthMiddleware` absent from repo HEAD; the scheduler is the pre-receipt version. Repo HEAD requires tenant_id fail-closed. 18 mission types observed live, all completed, dated 2026-09-16.

**EXISTING OWNER:** MissionRuntime.create, MISSION_WORKER_MAP, WorkerRuntime.register, registerCanonicalWorkers, BaseWorker, EVENT_MISSION_MAP, POST /ingest + CanonicalizationService + UnifiedEventRuntime, event_registry.json.

**SMALLEST DELTA (recipe, not executed):** (0) Write worker class extending BaseWorker with `handle(event)`; register in registerCanonicalWorkers with non-empty eventTypes; add `INTELLIGENCE_RESEARCH: '<worker-name>'` to MISSION_WORKER_MAP; register emitted event types in event_registry.json; rebuild/redeploy gateway (owner call). (1) `POST http://100.79.154.43:8080/missions` with auth: `{"missionType":"INTELLIGENCE_RESEARCH","payload":{"event_id":"ir-20261001-topic-slug","event_type":"INTELLIGENCE_RESEARCH","source":"marketingos-wave","payload":{"topic":"...","questions":["..."]}},"priority":2,"createdBy":"marketingos-wave"}`. Mission ID = sha256("INTELLIGENCE_RESEARCH:ir-20261001-topic-slug")[:16], computable offline; re-POST is a no-op (ON CONFLICT DO NOTHING). (2) Scheduler claims within ~5s, dispatches on payload.event_type. (3) Worker researches, emits findings via `this._emit` (preserves namespace/correlation/causation/confidence/tenant), returns truthy for completion. (4) Observe via GET /missions/pending, /missions/stats, SQL, or getTrace.

**COMMIT:** none. **TEST:** n/a. **REACHED?** No. **SERVED?** No. **OBSERVED?** No.

**NEXT BROKEN EDGE:** gateway rebuild/redeploy (owner call) + the live `exteriorAuthMiddleware` credential scheme, which was not characterized in the read-only pass. A no-code smoke test works today: POST an existing type (e.g. OBSERVATION_CREATE with `event_type: DOCUMENT_IMPORT`) and watch the observation worker run.

**Also mapped (unblocks wave points 7 and the grant question):** The metrics ingress seam is `POST /ingest` (source string + registered event type + payload; no new ingress code needed). The `media.placement:placeAsset` grant is NOT in the canonical tree; it exists only in the lane-C worktree (`worktrees/wt-lane-c-media-placement`). The canonical `tenant_capability_grant.js` has only the data family and `checkGrant` has no live callers. If the wave wants grant-checked dispatch, the lane-C pattern is the reference implementation to port, not something to re-derive.

---

## POINT 4: Acquisition — verified 95/97, activation blocked on fenced lane

**ARROW:** URL to hardened acquisition to immutable/raw artifact to provenance to POST /ingest to CanonicalizationService to UnifiedEventRuntime to ping_events

**BEFORE:** A prior 58/58 pass claim for `acquire-url.ts`, inherited not verified.

**FIRST BROKEN EDGE (T6, done 18:03 UTC):** Fresh independent 97-case hostile battery against `/home/nolan/workspace/acquisition-seam/acquire-url.ts` (sha256 `224f28ae631475650ca2e68a5377e7d7b83baabade70bbc41a84e135cb8d18c7`), all live servers localhost-controlled, no third-party infrastructure touched. **95/97 PASS.**

- SSRF (17 cases): all PASS. localhost, 127.0.0.1, [::1], 169.254.169.254, 10/8, 172.16/12, 192.168/16, CGNAT 100.64/10, 198.18/15, 0.0.0.0, decimal/hex/octal tricks, ::ffff:127.0.0.1, ::ffff:0a00:0001, trailing-dot, userinfo-onto-loopback. All rejected pre-connect with the correct reason class.
- Schemes/shape, DNS vetting (every-address rule proven), redirect escapes (full guard set re-run per hop, chain recorded; proxy observed CONNECT with the vetted hostname, not the pinned IP), timeouts (bounds hold; no hang), size caps (both lie directions covered), content-type allowlist, DNS rebinding/pinning (single resolution proven; second resolver call never happened), TLS cert verification on the tunnel path: all PASS.
- **2 real failures, both minor, both in `isPublicIp`:** accepts `fe90::1` and `fec0::1` as public. The link-local check is `low.startsWith("fe80:")`, missing the rest of fe80::/10 (fe80-febf); no check for deprecated site-local fec0::/10. The header claims link-local rejection; that claim is not fully true. Minor in practice, real, small fix (match the fe80::/10 nibble range, add fec0::/10).
- **Provenance gap (stated plainly):** the seam returns only `{ok, bytes, contentType, finalUrl, redirectChain}`. Missing entirely: retrieval time, source/content digest, worker identity, tenant, correlation, causation. Provenance must be added at the caller layer, not in this seam.
- Cosmetic: slow-drip timeout reports `Body read failed: aborted`; stalled CONNECT reports `Fetch failed: timeout` rather than `proxy connect timeout`. Bounds hold in both.
- Known documented residual: through `proxyUrl` the seam cannot pin the socket; proxy-side DNS divergence for a public hostname is inherent and stated honestly in the header.

**EXISTING OWNER:** acquire-url.ts (the surviving fetch seam).

**SMALLEST DELTA (designed, not executed):** (1) Fix the two `isPublicIp` v6 gaps first (2-line change). (2) Copy the verified seam as the canonical acquisition seam. (3) Rebase `safeFetch`/`safeFetchPage` as thin wrappers over `acquireUrl` (or point the adapter at it directly) and delete the duplicate guard logic, satisfying the locked "never two fetch paths" decision. (4) Emit the mandatory provenance envelope (source URI, retrieval time, sha256 of bytes, media type, worker identity, tenant, correlation/causation IDs, redirect chain, typed outcome) in the caller when it builds its observations. (5) Bring the 97-case battery along as the seam's regression battery.

**Proposed ONE production caller + ONE bounded source class (design only, nothing wired):** Caller = `StaticAcquisitionAdapter.acquire()` in the fyd harvest worktree (the L1 static-HTTP implementation of the AcquisitionAdapter contract), reached via `runLiveLoop()` from `POST /api/fyd/build`. Source class = operator/customer-supplied FYD intake seed URLs fetched as static HTML in the live acquisition loop (`allowContentTypes: ["text/html"]`), plus the same adapter's same-host media fetches for authorized demo tenants only. No crawl frontier, no arbitrary link-following beyond the loop's existing link budget, no browser-rendered fallback.

**COMMIT:** none (verification only). **TEST:** 95/97 hostile battery; battery source at Pig `/tmp/t6verify/t6-verify-battery.ts`, log `/tmp/t6verify/run3.log`. **REACHED?** No. **SERVED?** No. **OBSERVED?** Verification observed.

**NEXT BROKEN EDGE:** activation is BLOCKED. The proposed caller lives in `/home/nolan/projects/ping-fyd-harvest-wt/`, the fenced Wicked Wrench FYD lane. Activation would touch that fence. Needs the parent's call: route through that lane's owner, or name a caller outside the fence. Do not wire until this is resolved.

---

## POINT 5: Contradiction-native — deltas designed

**Status (T8 vocabulary harvest, done 18:00 UTC):** Four contradiction-native deltas, all to existing owners, no new authority/store/event type needed:
- verdict literal registry (existing owner: the verdict/assessment structure),
- claim payload support/counterevidence metadata,
- SUPPORTS/CONTRADICTS edge literals,
- rich claim producer.
Design only; not implemented. The representation target is: CLAIM to SUPPORT SET to COUNTEREVIDENCE SET to SOURCE INDEPENDENCE to EVIDENCE GRADE to VERDICT to CONFIDENCE to UNKNOWN to NEXT VERIFICATION ACTION.

---

## POINT 6: Durable human approval — inventoried, honest failure stated

**Status (T8):** `ping-runtime/approval/approval_events.js` defines PROPOSED_ACTION / ACTION_APPROVED / REJECTED as durable ping_events vocabulary with ZERO producers and ZERO consumers. Binding gaps: no proposal digest, no proposal version, tenant only as emit option, principal as free-form string. Four unwired in-memory approval authorities named and proven unwired (BusinessActionAuthority, EffectAuthority, AuthorityRepository, temporal approval workflow); not to be revived, per the wave constraint.

**Honest constitutional-test failure:** "authorized attempt to result to independent effect verification to outcome" has NO existing wired representation (zero EFFECT_* types, by deliberate forensics decision). This segment needs new vocabulary on the existing spine. Approval must bind the principal, tenant, exact proposed effect or digest, relevant capability, and proposal version; approval of proposal X must never authorize mutated proposal Y. Design only; not implemented.

---

## POINT 7: Metrics ingress seam — manned by identification

**Status (T5):** The seam is `POST /ingest` (`gateway/routes/ingest.js`), thin adapter only, behind `exteriorAuthMiddleware` on the live container. Accepted body: `{source (required), eventType (required), payload (required), namespace?, logicalId?, confidence? (default 0.5), evidence?[], lifecycleStage?}`. Chain: route to `CanonicalizationService.canonicalizeAndEmit` (namespace authorization fail-closed BEFORE canonicalization; deterministic logical identity; canonical envelope v1.0.0) to `UnifiedEventRuntime.emit` (deterministic event_id; EventValidator registry check; verdict-class admission; EventGovernance; persists to ping_events ON CONFLICT DO NOTHING; dispatches to in-process handlers including the bridge). One producer posts here with a source string and a registered event type. No new ingress code required. Standing law preserved: METRIC is not OUTCOME is not CAUSATION; CORRELATION is not LEARNING; LEARNING is not AUTHORITY.

---

## POINT 8: EXPERIMENT_RUN vocabulary — queued Phase 2

Not yet designed. T8 established that the "authorized attempt to outcome" segment needs new vocabulary on the existing spine; the EXPERIMENT_RUN mission type (hypothesis, treatment, control/baseline, audience, channel, primary metric, guardrails, observation window, stopping condition, evidence requirements; result SUPPORTED | FALSIFIED | INCONCLUSIVE, INCONCLUSIVE first-class) will be designed in Phase 2 on that basis.

---

## POINT 9: Learning to next question — queued Phase 2

Not yet designed. The promotion chain stays explicit: VERIFIED OUTCOMES to PATTERN to CANDIDATE LEARNING to SUPPORT SET to CONFIDENCE/APPLICABILITY to PROPOSAL to EXISTING AUTHORIZATION BOUNDARY to DETERMINISTIC POLICY. Candidate learning never silently modifies execution policy. Phase 2 design.

---

## POINT 10: Intelligence-to-software compiler — queued Phase 2

Not started. Design target: for every repeated model judgment, log inputs actually consulted, output, uncertainty, human correction, eventual outcome, and whether a deterministic rule could have made the same decision. Promote MODEL-REQUIRED to MODEL-ASSISTED to DETERMINISTIC DEFAULT + MODEL ESCALATION. No premature encoding from anecdotes; require an evidence/support set and explicitly scoped applicability.

---

## POINT 11: Mission Control epistemic chain — partially designed, remainder queued

T3 designed the held-mission slice (what was attempted, what happened, evidence links, available resolutions). The broader projection (what are we trying to learn, what claims exist, which conflict, what evidence supports each, what remains unknown, what opportunity was inferred, what was proposed, who authorized exactly what, what was attempted, what actually happened, who independently verified the effect, is the observation window complete, what outcome was measured, what learning is candidate, what was promoted into deterministic behavior) is not yet designed. Unknown fields render UNKNOWN + machine-readable reason, never empty green boxes. Phase 2 design. Note: no Mission Control frontend exists in-repo; the operator surface today IS the `/mc` JSON API, so "surface in Mission Control" means the route first.

---

## POINT 12: Codex-path harvesting — complete

**Status (T7, done 18:00 UTC):** Ten execution-path rows, zero overlap with the prior navigation harvest. ADOPT (1): resumability (fork-as-branch, queue-to-running) to MISSION. ADAPT (9): task decomposition, repo exploration, context selection, patch construction, test/falsification loops, computer-use handoff (envelope only), parallel read lanes (parallel_safe metadata), change review, failure recovery. Explicit rejections with the violated semantics named: CodexTask/ThreadAuthority, rollout JSONL as PING events, second dispatcher, computer-use memory as knowledge, self-scheduled autonomous execution. All deltas are payload-schema or projection-level; no truth/identity/event/mission/authority semantic touched. For each: CODEX BEHAVIOR to EXISTING PING OWNER to MISSING MECHANISM to HARVESTABLE PRIMITIVE to SMALLEST DELTA.

---

## POINT 13: DI-classifier evidence — complete, 2 challenges for human ruling

**Status (T9, done 18:01 UTC):** The classifier lives at `/tmp/trackb-rules.py` (sandbox scratch, deliberately not in the runtime tree). Current channel inventory: exactly ONE (static+dynamic require-consumer graph over `ping-runtime/`), which is why it went 8/14 blind.

Eight deterministic evidence channels designed, every source verified to exist on the Pig against canonical repo `/home/nolan/ping` (HEAD `1d4ea59d0`): (1) static import/require graph, widened to include `gateway/`; (2) construction sites (`new X(` repo-wide, tests/evals split out); (3) DI wiring at the production composition root (`gateway/bootstrap/gateway_runtime.js`, located via the entrypoint chain from `gateway/server.js`); (4) runtime registration (`container.register`, `WorkerRuntime.register`, `.on(`); (5) entrypoint/bootstrap evidence (server.js chain, compose.yaml 14 services, Dockerfiles, package.json scripts, `docker ps`); (6) event/database runtime evidence (per-file SQL touchpoints + live read-only counts: ping_events 739 rows, ping_missions 144 rows all completed, newest 2026-09-16; mission_executions, mission_events, event_outbox, audit_log, telemetry_metrics, canonical_events, events all 0 rows); (7) served build identity (`docker exec md5sum` per served file vs host HEAD); (8) persistence, tests, call traces (COMMISSIONING_REPORT.json, KERNEL_PIPELINE_REPORT.json, both 2026-07-28), config, deployment manifests.

Deterministic level-promotion rules: DEFINED to REFERENCED to WIRED (with WIRED-HOT / WIRED-COLD sub-state) to REACHED to EXECUTED to PERSISTED to SERVED to OBSERVED (OBSERVED-PROCESS / OBSERVED-BEHAVIORAL). A component takes the HIGHEST level whose promotion fact holds; every lower fact must also hold; DEFINED failure means UNKNOWN, never default-DORMANT. No model judgment at any step; every promotion cites file:line, md5, count, or timestamp. Deterministic disposition rules D1-D6 (LEGACY, DUPLICATE, ADAPTER, CANONICAL_AUTHORITY, DORMANT, UNKNOWN).

**Critical finding F1:** Track B's "zero require consumers" was ping-runtime-scoped and wrong for two components. `connectors/capability_registry.js` and `runtime/capability_resolver.js` are required, instantiated unguarded, AND used in the production composition root (require lines 84/38, `new` lines 296/181, post-construction uses). Both are WIRED-HOT by the deterministic definition. Their forensic DORMANT labels are challenged by new machine evidence. Projected outcome on the 14: 12/14 agreement with 2 explicit machine-evidenced challenges. The classifier must emit these as `challenge: {component, contradicts, old, new, evidence}` rather than silently overriding. **This needs human ruling, not implementation.**

**Live facts affecting the design:** served `gateway_runtime.js` and `mission_runtime.js` differ from host HEAD (staleness is a first-class signal; SERVED records per-file md5). Execution evidence is historical (newest rows 2026-09-16 predate the container start 2026-09-30). The deployment answers its own health check with HTTP 503 (`{"status":"unhealthy",...,"components":{"gateway":{"status":"healthy",...}}}`, truncated; unhealthy components unidentified). No worker-runtime container exists at all. Implementation delta specified: one new extractor module + replacing the R1-R4 rule body; no new stores, no model, no schema migration. All probes read-only.

---

## POINT 14: Six-item package survival test — queued Phase 2

The six items (from `orchestration-flywheel-phase1-archaeology-2026-10-01.md`): (1) structured mission contract, (2) outcome observation (MISSION_OUTCOME event), (3) learning candidate to promotion, (4) consult learnings at selection, (5) wire typed decision seam (Jev shadow), (6) enforce approval authorities on dispatch hot path. Each must survive CURRENT NEED to EXISTING OWNER to REACHED DEFECT to WHY EXISTING OWNER CANNOT REPRESENT IT to only then NEW PRIMITIVE. Item 1 must not be built merely because INTENT-to-MISSION was expected missing (the real proof did not demonstrate it). Phase 2 analysis.

---

## POINT 15: Commit law — honored

T4: INSPECT to OWNERSHIP to IMPLEMENT to TEST to DIFF to STAGE OWNED FILES ONLY to COMMIT to REPORT SHA. Commit `23e15f622572bc8fdca46ff42b61d6817f6423df`. No push. No blanket staging. No shared-worktree branch hopping/stashing. All other tracks read-only or design-only; nothing to commit.

---

## Carried-over items (CEO-ORDER-PROOF-PASSED-2026-10-01)

**T2 Facebook authority reconciliation (done 17:55 UTC).** The 11:26 MDT DENY-CONFLICT was a gate false positive: the `\bheld\b` regex matched the literal string "held=false" in pass-178's own authority documentation line (facebook-engagement.md line 4830) and the pass-179 re-quote (line 4851), both documenting the OWNER RELEASE (holds.json facebook held=false, set_at 2026-10-01T11:21:00Z, superseding the 05:19 MDT freeze). Authoritative chain proves ACTIVE: holds.json released by owner to AUTHORITY.json facebook ACTIVE. Chain verified independently, then the wave's conditional branch executed: recorded `reconciliation_2026_10_01` in AUTHORITY.json (2026-09-30 record preserved), advanced `tail_scan_from_line` 4644 to 4852 (the designed supersede mechanism; the gate does `lines[from_line:]` 0-indexed, so 4852 skips all current lines), verified `authority-check.py facebook` to AUTHORITY-ALLOW exit 0. Backup at `/tmp/AUTHORITY.json.bak-20261001`. Evidence: `~/workspace/outreach/authority-conflicts/reconciliation-facebook-2026-10-01.md`. No engagement pass run; the gate's matcher narrowing was proposed, not applied. PROSE IS NOT AUTHORITY stands; final clear/no-clear on new outreach is Nolan's. External actions remain under the normal gate and standing rules.

---

## Owner decisions needed (explicit, no action taken)

1. **Gateway redeploy.** Brings live: the HOLD repair (E2/E3), the held-visibility route (when built), the T4 jev fix, and tenant enforcement (repo HEAD requires tenant_id fail-closed; the live container is pre-tenant). Deployment decision; not taken unilaterally. Until then: production has no HOLD semantics (unknown goes FAILED), the jev fix is committed but not served, and INTELLIGENCE_RESEARCH cannot be dispatched.
2. **33 already-failed CLASSIFICATION_CREATE missions.** Historical truth; left as `failed`. Retry would duplicate CLASSIFICATION_CREATED events. Owner decision.
3. **acquire-url.ts activation.** Proposed caller (StaticAcquisitionAdapter) sits in the fenced Wicked Wrench FYD lane. Route through that lane's owner, or name a caller outside the fence. Not wired pending this call.
4. **F1 machine-evidenced challenges.** `connectors/capability_registry.js` and `runtime/capability_resolver.js`: forensic DORMANT vs deterministic WIRED-HOT. Human ruling required; the classifier must surface the challenge, never silently override.
5. **Gateway /health 503.** The deployment self-reports unhealthy (gateway component healthy; other components unidentified, output truncated). Investigate or accept; recorded as observed data.
6. **Service-to-DB topology.** Reconcile which service writes to `brain-postgres`/`ping_runtime` (post-tenant schema; received the 00:30 UTC failures) vs `ping-postgres`/`crx_runtime` (pre-tenant schema; per T5 the live gateway's DB). Not resolved in this wave.
7. **Facebook.** Reconciliation complete; final clear/no-clear on new outreach remains Nolan's call.
8. **MISSION_RECONCILE_HOLD registry repair (new, from P2C).** The event is emitted at `mission_scheduler.js:557` but absent from `event_registry.json`, so EventValidator fails it closed and the escalation signal never persists. Registering the type (via the generator source, not a hand-edit of the generated file) is a small repair that must land with the redeploy, before the held-visibility endpoint can show escalations.

---

## Phase 2 (complete)

All four design tracks are done and their results are in the "Phase 2 results" section above:
- P2A: EXPERIMENT_RUN vocabulary + learning-to-next-question design (points 8+9) — COMPLETE.
- P2B: Intelligence-to-software compiler design (point 10) — COMPLETE.
- P2C: Mission Control epistemic projection gaps (point 11) — COMPLETE.
- P2D: Six-item survival test (point 14) — COMPLETE (1 SURVIVES, 1 WIRE, 4 REJECT).
- Blocked pending owner calls (not designed further): INTELLIGENCE_RESEARCH dispatch (redeploy + live auth credential), acquire-url.ts activation (fenced-lane decision), held-visibility route build (redeploy).

---

## Commit log (this wave)

- `23e15f622572bc8fdca46ff42b61d6817f6423df` (`testing/ladder-2026-09-30`): `fix(jev): isolate shadow emit failure from parent mission outcome`. 19 insertions, 4 deletions, `ping-runtime/jev/shadow_worker.js` only. No push.

## Track index (all 9 Phase-1 tracks complete)

| Track | Name | Status | Result |
|---|---|---|---|
| T1 | sibling-holds | done | 4/4 truthfully resolved MANUAL_RESOLUTION via existing CLI; hold count 0 |
| T2 | facebook-recon | done | RECONCILED-ACTIVE; gate false positive documented; no pass run |
| T3 | hold-visibility | done | Premise corrected; GET /mc/missions/held designed; redeploy-gated |
| T4 | jev-trace | done | Root cause found; smallest fix committed 23e15f62; replayed + tested |
| T5 | mission-substrate-recon | done | Full substrate map; INTELLIGENCE_RESEARCH recipe; live-behind-repo found |
| T6 | acquire-url-verify | done | 95/97 hostile PASS; 2 minor v6 gaps; caller+source named; fence-blocked |
| T7 | codex-harvest | done | 10 paths: 1 ADOPT, 9 ADAPT, explicit rejections |
| T8 | vocabulary-harvest | done | Approval + contradiction deltas; honest EFFECT_* gap stated |
| T9 | di-classifier-evidence | done | 8 channels; DEFINED-OBSERVED levels; D1-D6; F1 2 challenges for ruling |
| P2A | experiment-learning | done | EXPERIMENT_RUN vocabulary + learning/promotion design; 8 build steps |
| P2B | intelligence-compiler | done | Judgment log + MODEL-REQUIRED->ASSISTED->DETERMINISTIC promotion; anti-anecdote bar |
| P2C | mc-epistemic | done | 16-question projection map; UNKNOWN contract; MISSION_RECONCILE_HOLD defect found |
| P2D | six-item-survival | done | 1 SURVIVES, 1 WIRE, 4 REJECT |

**Local/deployed distinction (standing):** remote FYD unverified (404 via connected GitHub); public piging2/PING still initial commit 81b3248; public CRX still 6c4b531. Pig-local evidence in this report is local implementation evidence, never remote canonical state.

---

## Phase 2 results (design tracks)

### P2D: Six-item survival test — COMPLETE (2026-10-01)

Each item run through CURRENT NEED -> EXISTING OWNER -> REACHED DEFECT -> concrete representation attempt -> VERDICT. Read-only; no code, no commits.

| Item | Verdict | Basis |
|---|---|---|
| 1. Structured mission contract | REJECT | No demonstrated need. T5 proved the payload is opaque JSONB with zero validation, but no track traced any observed failure to a missing contract field. The wave's own warning applies verbatim. If ever needed: a validator inside `create()`, not a new primitive. |
| 2. Outcome observation (MISSION_OUTCOME) | WIRE | T8's honest gap is real: no wired "authorized attempt -> result -> independent effect verification -> outcome"; MISSION_COMPLETED/MISSION_FAILED have zero consumers. Representation: one emit helper at the terminal branches of `_dispatch` + `_reconcileUnknown`, deriving the typed outcome from the existing closed dispatch vocabulary (failure side via `failure_record.js`, success side from MISSION_COMPLETED payload). No new runtime/authority/store/table; only event-type registration on the spine. CAVEAT: `_failMission`'s JSDoc holds `deriveFailureRecord` wiring "for a human word", so this needs the owner's word. Enabler for item 3. |
| 3. Learning candidate -> promotion | SURVIVES | Representation attempt fails on both candidate owners: `KnowledgePromoter` is contract-bound to human-only approvals (extending it would conflate approval with pattern detection); the feedback contract (`feedback/feedback_contract.js`) supplies pure gate functions with no consumer pipeline. Minimal shape: LEARNING_CANDIDATE event on the existing spine + one consumer worker running the feedback gate (identity reduction, >=10 independent tenants, materiality), emitting PROPOSALs never silent policy mutation. Design belongs to P2A; cannot run before item 2 emits outcomes. |
| 4. Consult learnings at selection | REJECT | No learnings exist; formulation contradicts the scheduler's DOC-CONTRACT (MISSION_WORKER_MAP is labeling metadata, not the routing decider; the single decider is `WorkerRuntime.dispatch()`). Revisit in P2A only if promoted learnings ever exist, redesigned through dispatch, not the map. |
| 5. Typed decision seam (Jev shadow) | REJECT | T4 already fixed the defect (23e15f62). The only provider handles claim-classification; wiring a worker-selection domain would emit noise. T4 namespace-authority residual blocks durable Jev records pending explicit owner ruling. |
| 6. Approval authorities on hot path | REJECT | Contradicts the do-not-revive order; no demonstrated need; requires durable storage + consequentiality classification (new primitives needing their own proof). Legitimate content is P2A's EXPERIMENT_RUN vocabulary. |

**Net: 1 SURVIVES (item 3), 1 WIRE (item 2), 4 REJECT.** Dependency: item 2 -> item 3 -> (item 4 redesigned, later).

### P2C: Mission Control epistemic projection — COMPLETE (2026-10-01)

16-question projection map (verified against the CEO order), each with existing owner (file:line), existing route/query, and gap. Design only; the operator surface is the `/mc` JSON API (no frontend in-repo).

Key findings:
- 8 of 16 questions have partial or full owners today.
- `CONTRADICTION_SURFACED`, `PROPOSED_ACTION`/`ACTION_APPROVED`/`REJECTED`, `CANDIDATE_CLAIM_CREATED` are registered vocabulary with ZERO live producers.
- **New defect found: `MISSION_RECONCILE_HOLD` is emitted at `mission_scheduler.js:557` but ABSENT from `event_registry.json`, so it fails closed at emit validation (`unified_event_runtime.js:206-219`).** The T3 held-visibility design relies on this event as the durable escalation signal; as the tree stands, the escalation emit is rejected and the signal never persists. This must be repaired (register the type) before the held-visibility endpoint can show escalations. Flagged as a reached defect in the HOLD path.
- Independent effect verification and deterministic promotion have no owner at all (confirms T8's honest gap).
- Contradiction slice: served via `query({eventType:'CONTRADICTION_SURFACED'})` + `getChildren`/`getDescendants` evidence links; T8 support/counterevidence metadata and SUPPORTS/CONTRADICTS edges marked VOCABULARY_NOT_IMPLEMENTED; honest caveat that wiring the detector before the rich claim producer lands yields SCHEMA_TOO_THIN, not signal.
- Authorization slice: proposal-to-decision join by `action_id` with deterministic `logical_id`s; pending proposals render AWAITING_DECISION; missing digest/version/bound-principal marked per T8.
- Outcome slice: `getTrace` evidence bundle + HOLD reconcile path as the honest proxy for effect verification; P2A EXPERIMENT_RUN fields marked.
- UNKNOWN contract: 7 machine-readable reason codes with a first-failing-check decision procedure; three-way distinction (not-yet-observed vs vocabulary-not-implemented vs owner-has-no-data).
- 10 ordered build steps with tests each: steps 1-7 pure read-only projections (redeploy-gated for serving), step 8 current-tree vocabulary repairs (includes registering MISSION_RECONCILE_HOLD), steps 9-10 gated on P2A/P2B.

### P2A: EXPERIMENT_RUN vocabulary + learning design — COMPLETE (2026-10-01)

**Structural finding:** `EXPERIMENT_RUN` is already proposed as a mission label by `ping-runtime/analysis/claim_chaining.js:40-43` (`MISSION_LABELS.EXPERIMENT_RUN`), and `ClaimMissionChainer._onClaim` already creates them via `MissionRuntime.create()` — but `MISSION_WORKER_MAP` has no entry and no worker registers the event type, so the scheduler skips them ("No worker for mission type"). The chainer's header admits "nothing executes until a research worker declares the label." This design wires exactly that gap, on existing primitives only.

**Mission-type design:**
- Payload schema (all in payload JSONB; listed columns bind to existing `ping_missions` columns): `event_type='EXPERIMENT_RUN'`, `spec_version='1'`, `hypothesis`, `deliberate_variable` (single-variable rule), `treatment`, `control_baseline`, `audience`, `channel`, `primary_metric` (name/aggregation/direction/thresholds), `guardrails[]` (metric/operator/value/on_breach, default stop_inconclusive), `observation_window` (starts_at/ends_at/min_observations; ends_at > now enforced), `stopping_condition`, `evidence_requirements`, `requires_distribution_approval` (setup requires prior ACTION_APPROVED in the causal chain when true), `created_by_spec`. Runtime state namespaced in `payload.experiment` (phase, window_until, wake_reason, design_event_id). No new columns.
- ExperimentWorker (`ping-runtime/workers/experiment_worker.js`, extends canonical BaseWorker, `eventTypes: ['EXPERIMENT_RUN']`): phase `setup` validates the spec (fail-closed; invalid spec is a proven failure into the normal fail path, never a verdict), emits `EXPERIMENT_DESIGNED`, returns `{status:'deferred', resume_at: ends_at}`. Phase `observing` emits `EXPERIMENT_WINDOW_CLOSED`, loads `OBSERVATION_CREATED` metric events by correlation_id (getTrace-shaped query; worker never fabricates observations; zero rows is legal input), evaluates deterministically (guardrails, then evidence requirements, then threshold comparison), emits `EXPERIMENT_VERDICT` + `CANDIDATE_CLAIM_CREATED`, writes the `candidate_learning` node, returns `{status:'ok'}` with the verdict in result JSONB.
- **Verdict as literals, not event types:** new vocabulary module `ping-runtime/analysis/verdict_literals.js` (frozen `EXPERIMENT_VERDICTS = {SUPPORTED, FALSIFIED, INCONCLUSIVE}`; converges the duplicated claim verdict sets in `claim_chaining.js` and `contradiction_detection.js`; also freezes T8's SUPPORTS/CONTRADICTS edge literals). Rationale: Nolan's standing line is SUPPORTED/FALSIFIED/INCONCLUSIVE as payload vocabulary; per-verdict event types would fork the vocabulary.
- **New event types (vocabulary on the spine, registry 239 -> 242):** `EXPERIMENT_DESIGNED` (authority_owner ExperimentWorker, class inference), `EXPERIMENT_WINDOW_CLOSED` (system), `EXPERIMENT_VERDICT` (inference). Plus registry correction: `CANDIDATE_CLAIM_CREATED` authority_owner ClaimWorker -> ExperimentWorker (zero existing producers, nothing breaks). This wires T8's honest gap: EXPERIMENT_DESIGNED (declared attempt, optionally preceded by ACTION_APPROVED) -> OBSERVATION_CREATED metric events (from the independent ingest producer, never the worker) -> EXPERIMENT_VERDICT (deterministic comparison) -> CANDIDATE_CLAIM_CREATED (outcome as learning). Independence is structural: the evaluation worker has no metric-producer capability.
- **Window mechanism (with failed-attempt proofs):** Attempt A (mission stays `running` across the window) fails on the stuck-running watchdog/HOLD escalation; Attempt B (block inside one `handle()`) fails on `dispatchTimeoutMs`. Therefore: new `MissionRuntime.deferWindow` (conditional running -> created in the style of parkHold; sets `retry_at = resumeAt`; honestly `created`, invisible to the watchdog which scans only running/assigned); `getPending` gains `AND (retry_at IS NULL OR retry_at <= NOW())` (safe: reaped leases set retry_at=NOW(), still pass immediately); scheduler `_dispatch` gains a `deferred` branch. Expiry needs no new ticker: the existing 5s poll picks the mission up when the gate opens; conditional claim keeps exactly-once dispatch. Early stopping: bounded subscriber `ping-runtime/analysis/experiment_stopping.js` (mirrors the chainer's bounded pattern) watches OBSERVATION_CREATED, evaluates deterministic thresholds/guardrails, calls idempotent `MissionRuntime.wakeExperiment` (conditional UPDATE, double triggers are no-ops). Manual stop via the existing mission-control surface (operator authority).
- **INCONCLUSIVE is first-class:** recorded as a COMPLETED mission with `result.verdict='INCONCLUSIVE'` (mission outcome SUCCEEDED: the machinery ran correctly; the experiment could not decide). Never enters `_failMission`. FAILED is reserved for proven failures.
- **Learning candidate:** existing `CANDIDATE_CLAIM_CREATED` (registered, zero producers) with the T8 rich-claim shape (statement, verdict, confidence + provenance, mandatory support_set AND counterevidence, applicability block, experiment/verdict event refs); durable graph residue via `KnowledgeGraph.addNode('candidate_learning', ..., {status:'candidate', ...})`; SUPPORTS/CONTRADICTS edges for learning-to-learning relations.
- **Explicit promotion (point 9 chain):** VERIFIED OUTCOMES -> PATTERN (follow-up INTELLIGENCE_RESEARCH mission or operator) -> CANDIDATE LEARNING -> SUPPORT SET -> CONFIDENCE/APPLICABILITY -> PROPOSAL -> EXISTING AUTHORIZATION BOUNDARY -> DETERMINISTIC POLICY. PROPOSAL uses existing `recordProposedAction` with ADDED `proposal_digest` (sha256 over canonical {spec_version, capability, target_identity, preview}) and `spec_version='1'`, closing T8's binding gaps. Authorization is the human operator (Nolan, CG-001) via `recordDecision` -> ACTION_APPROVED/REJECTED; no ApprovalAuthority by design. DETERMINISTIC POLICY is the artifact changed through the normal process, executed as a POLICY_UPDATE mission; the spine holds the authorization chain.
- **Anti-corruption (structural, four points):** (1) dispatch eligibility reads only MISSION_WORKER_MAP + registered eventTypes + getPending; knowledge/claims/verdicts are structurally invisible to dispatch (no code path, not a policy statement). (2) knowledge lifecycle gate: only KnowledgePromoter on human approval events recomputes status/confidence; candidates stay `candidate`. (3) approval boundary: policy-affecting execution requires ACTION_APPROVED with the exact digest. (4) Mission Control is a projection, never an authority. The only path from candidate learning to policy is CANDIDATE_LEARNING -> (human) PROPOSED_ACTION -> ACTION_APPROVED -> authorized POLICY_UPDATE, each a durable correlated spine event. Silent modification is unrepresentable.
- **Loop tail:** `ClaimMissionChainer` extended by one subscription line to `CANDIDATE_CLAIM_CREATED`; existing `needsFollowupResearch` routes INCONCLUSIVE/UNCLEAR/FALSIFIED to the next INTELLIGENCE_RESEARCH (or EXPERIMENT_RUN when `claim.experiment_hypothesis === true`). Zero new machinery.
- **8 ordered build steps** with tests each: (1) vocabulary + registry (239->242, frozen literals, existing suites green); (2) MissionRuntime temporal gate (deferWindow/wakeExperiment/getPending predicate; no reaped-lease regression); (3) scheduler wiring (MAP entry + deferred branch; other paths unchanged); (4) ExperimentWorker (spec validation fail-closed, designed/deferred, zero-observation INCONCLUSIVE, threshold SUPPORTED, guardrail INCONCLUSIVE, claim shape); (5) ExperimentStoppingChainer (pure threshold logic, idempotent wake); (6) chainer extension (INCONCLUSIVE chains, SUPPORTED does not, dedupe on replay); (7) proposal digest hardening (deterministic digest, decision-digest match enforced); (8) promotion runbook (docs only, dry-walked on one real candidate learning).
- UNKNOWNs: exact line numbers at repo HEAD 1d4ea59d0 (citations from Pig-local 23e15f62); live container scheduler match; ingest seam observation payload shape (separate track).

### P2B: Intelligence-to-software compiler — COMPLETE (2026-10-01)

**Design thesis:** not a new subsystem. Three small additions to existing owners: (1) four event types in the already-PING-owned `compiler` namespace (`event_governance.js:62`, so no governance change and no repeat of the T4 jev-namespace failure), (2) one vocabulary module plus one bounded writer behavior mirroring the forensics-fix patterns, (3) promotion state on a knowledge node via the existing `addNode` upsert path. Zero new authorities, stores, or tables.

**Judgment log schema** (the six wave fields, mapped to existing owners):
- Representation is the `ping_events` stream (new vocabulary), NOT mission results and NOT claims. Failed attempts prove it: mission `result` JSONB is written once and cannot supersede, and the worker cannot know the eventual outcome at completion; logging judgments as CLAIM_CREATED payloads would spawn one INTELLIGENCE_RESEARCH mission per judgment via `claim_chaining` ("one mission per claim event") — a real hazard.
- New types: `compiler.judgment_logged` (inference), `compiler.rule_candidate` (inference), `compiler.rule_promoted` (decision, only after human approval), `compiler.rule_rejected` (decision).
- `compiler.judgment_logged` payload: `judgment_id` (sha256 content hash), `judgment_class` (REQUIRED), `decider` (model/worker/human), `inputs_consulted[]` (kind/ref/digest; resolved by existing `EvidenceAuthority.accumulate`, the ADD-only read authority), `output` (decision literal + rationale + alternatives), `uncertainty` (scalar on the spine's confidence metadata + structured basis), `applicability_scope` (REQUIRED), `supersedes`.
- Human corrections are NEW events (`decider: "human:<principal>"`, `supersedes`, `causation_id` to the original); the "record with correction attached" is a projection assembled by the `/mc` route, never a rewrite (ADD-only stream).
- Eventual outcome links to existing homes (EXPERIMENT_RUN mission results, metric observations via POST /ingest); the honest T8 gap stands (no EFFECT_* vocabulary by deliberate forensics decision).
- Deterministic-rule-equivalence is the one new bookkeeping: `compiler.rule_candidate` (prospective sketch + scope) verified retrospectively by deterministic replay of the sketch over the support set (no model in the loop), via pure function `assessDeterministicEquivalence` (testable like `findContradiction`).
- **Anti-anecdote guard in the schema:** `judgment_class` and `applicability_scope` REQUIRED; the writer fail-closes without them. An anecdote is a judgment without class or scope; it stores only as `judgment_class: "unclassified"`, which the promoter ignores.

**Writer (one bounded behavior):** `JudgmentLogger`, mirroring `contradiction_detection.js` exactly (subscribes via `UnifiedEventRuntime.on()`, never forks the emitting worker's path, detects/logs but never decides). Subscribes to `CLASSIFICATION_CREATED`, `RECOMMENDATION_CREATED`, model-sourced `CLAIM_CREATED`. Builds payloads via pure `recordJudgment(eventRuntime, ...)` in new `ping-runtime/analysis/judgment_log.js` (mirrors `approval_events.js`); `logical_id: "judgment:{judgment_id}"` makes re-logging idempotent at the spine. Knowledge projection: add the type to `GRAPH_PROJECTION_EVENTS`; the existing loop projects it as a candidate node. Collision-aware: exactly one machine writer; disjoint from ClaimWorker (no mission spam), KnowledgePromoter (findings promotion stays human-gated), and the approval vocabulary (promotion decisions ride PROPOSED_ACTION/ACTION_APPROVED). Support sets are queries, not materialized edges (no second writer).

**Promotion mechanism:** MODEL_REQUIRED (model decides every instance; entry state) -> MODEL_ASSISTED (deterministic rule executes first, returns decision + uncertainty + abstain; model invoked iff rule abstains or uncertainty exceeds the approved threshold) -> DETERMINISTIC_DEFAULT + MODEL_ESCALATION (rule is default; model invoked iff escalation predicate holds: input outside scope, unresolved CONTRADICTION_SURFACED on the subject key, or human flag; every escalation logged as a judgment). State stored on a `judgment_class` knowledge node (`data.promotion_state`/`rule_spec`/`rule_spec_digest`/`escalation_predicate`) via `addNode` ON CONFLICT DO UPDATE; the node is the read cache, the `compiler.rule_*` event stream is the truth (ADD-only provenance law governs evidence; promotion state is explicitly mutable working state with full event history). The rule executes as code in the owning worker (no rule engine, no new runtime); inert until the promotion state permits; worker resolves state at startup and subscribes to `compiler.rule_promoted` for cache invalidation. Advance requires: bar met + rule sketch with scope/abstention/uncertainty threshold + >=1 human correction the sketch agrees with (to MODEL_ASSISTED); deterministic replay over a held-out sample + human-adjudicated disagreements + zero unresolved contradictions (to DETERMINISTIC). Authorization: the human operator (Nolan) via `recordProposedAction` (`capability: "compiler.promote_rule"`, digest-bound spec preview, evidence refs) -> ACTION_APPROVED (causation-linked) -> `compiler.rule_promoted`; the worker verifies digest match fail-closed. No new authority.

**Anti-anecdote bar** (defaults; raisable, never lowerable without fresh approval): >=12 logged judgments same class+scope; >=3 distinct correlation_id roots + >=2 distinct decider instances; >=2 human corrections where the sketch agrees with the corrected output; contradiction clearance via `findContradiction` (unresolved blocks fail-closed); >=3 outcome groundings with verdict in {SUPPORTED, FALSIFIED} (INCONCLUSIVE does not count — classes with no outcome pipeline cannot promote, by design); prospective assessment first (sketch recorded before support is counted). Enforced in pure `meetsPromotionBar` (worker-side before proposal; `/mc` projection as read-only checklist). NOT enforced in the emit path: logging stays frictionless; the bar gates promotion, never logging.

**Worked examples:** (i) Marketing: `audience_channel_experiment_worthiness` — 14 judgments over 4 weeks, 5 correlation roots, human correction (Nolan: NOT_WORTH, audience too small), outcomes from EXPERIMENT_RUN missions; bar met; PROPOSED_ACTION -> ACTION_APPROVED -> MODEL_ASSISTED; the rule scores pairings first, the model reviews only high-uncertainty pairs. (ii) Software: `component_reachability_classification` — the T9 8-channel evidence as judgment inputs; model/analyst vs deterministic-classifier disagreement as explicit data; Nolan's F1 ruling as the human-decider superseding judgment; promotion makes the deterministic 8-channel classifier run first with the model reviewing only channel disagreements.

**6 build steps** with tests: (0) vocabulary registration (compiler namespace already owned; EventValidator accepts the four, fifth unregistered type still fails closed); (1) `judgment_log.js` (fail-closed validation, idempotency, bar thresholds, contradiction block, INCONCLUSIVE exclusion); (2) JudgmentLogger + projection (replay CLASSIFICATION_CREATED; assert one row, preserved lineage, candidate node, and NO research mission spawned); (3) promotion proposal path (14 judgments -> proposal; 11 -> refusal with unmet criteria; digest mismatch -> worker refuses); (4) `GET /mc/compiler/classes` read-only projection (P2C's "promoted into deterministic behavior" slice); (5) human-correction ingress via existing `/knowledge` POST (causation-linked). Non-goals: no auto-promotion, no JudgmentAuthority, no KnowledgePromoter changes, no EFFECT_* vocabulary, no SUPPORTS-edge writer. Live divergence: targets repo HEAD; same redeploy gate as owner-decision #1. Dependencies: P2A (outcome literals, OUTCOME -> CANDIDATE LEARNING chain), P2D (verdict literal consolidation would shrink the surface later), P2C (Step 4 is the compiler's projection slice).
