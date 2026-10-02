1. **Event Authority is resolved only in a narrowed sense**
1. **Event Authority is resolved only in a narrowed sense** ("ping_events has exactly one writer"); CanonicalEventEnvelope remains a second effective event authority. Operator question 10 (WBD) is still open.

2. **The learning loop executes but does not learn**
2. **The learning loop executes but does not learn**: 144 missions / 18 chains, zero non-test consumers, zero approvals via KnowledgePromoter, MISSION_COMPLETED with no production subscriber.

3. **Mission Control is partially rebuilt as an honest projection**
3. **Mission Control is partially rebuilt as an honest projection** (Phase 24, worktree), but the deploy branch diverges and `/system/state` still ships misleading collectors; honest backends (`/mc/replay/stats`, `/mc/witness/stats`, `/mc/dashboard`) are live yet unwired to any UI.

4. **Live provenance is broken right now**
4. **Live provenance is broken right now**: both Oracle gateways run `candidate-3c5d280dd` while the accepted baseline is `84486f056`, `deployment_registry` has 0 rows, and two containers share one DB (latent dual-writer). Nolan's call is pending.

5. **Identity is the live minefield**
5. **Identity is the live minefield**: live mints 64-hex `JSON.stringify` IDs; worktree certifies `event_<16hex>` RFC-8785 IDs; three WorkOrder and two Mission identity schemes compete.

---

## MISSION CONTROL

**MC-01 — Phantom-surface fleet: per-surface contract map**
**MC-01 — Phantom-surface fleet: per-surface contract map**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: Phase 24 rewired 5 surfaces and quarantined 12 phantom surfaces in the worktree, but the deploy branch (`oracle/deploy-2026-09-18`) carries a divergent superset with the same phantoms byte-identical, and `mock-data/` remains imported by ~20 components.
- EVIDENCE: `~/workspace/forensics/phase24-mission-control-2026-09-19.md` (10 files changed, NotLiveInventory); `~/workspace/forensics/recon-2026-09-19/lane-m-missioncontrol-audit.md` §4 (honesty commits only touched the missions surface; command-center phantoms identical on deploy branch).
- DEPENDENCIES: MC-08 (what Mission Control is allowed to be). ACCEPTANCE: every mounted surface maps to a verified live route; every unmounted surface appears in the visible NotLiveInventory; `mock-data/` imports gone from production builds. NEXT FALSIFICATION: fetch() audit of the merged UI tree after Phase-24 merge; any fetch to a 404 route re-opens this.

**MC-02 — Mission Control must not become a second authority**
**MC-02 — Mission Control must not become a second authority**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 1
- WHY: Standing law says Mission Control observes/configures but never becomes a second permission authority; Mutation-button audit proved no UI mutation button reaches any real backend transition (approve/reject/reorder POST into the void), which is currently the good kind of broken.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` (MissionCards rewritten read-only: "Mission Control never mutates mission state"); memory/2026-09-17#L628 (Nolan: "must not become a second permission authority"); `lane-m-missioncontrol-audit.md` §3.
- DEPENDENCIES: MC-09. ACCEPTANCE: documented authority boundary (observe + propose + human-gated approval route only) enforced at the call site, not in comments. NEXT FALSIFICATION: any new mutation button merged without a witnessed backend contract.

**MC-03 — Event-count scope discrepancy across backends**
**MC-03 — Event-count scope discrepancy across backends**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: `/system/state` reports postgres.total_events=0, `/mc/dashboard` reports 45, `/mc/replay/stats` 26, `/mc/witness/stats` 26, missions.completed 191 vs PG 419 rows. CockpitDashboard displays all four side by side with a banner rather than resolving; the backend follow-up to reconcile scopes is still open.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` ("Discrepancy Handling", backend follow-up #1); `lane-m-missioncontrol-audit.md` §2 live probes.
- DEPENDENCIES: HO-08 (SystemAuthority bound to the wrong event source). ACCEPTANCE: one documented scope semantic per route, or a canonical source per metric, displayed in the dashboard. NEXT FALSIFICATION: probe each route and show two disagreeing counts for the same nominal metric.

**MC-04 — NotLiveInventory: 12 preserved-but-not-live surfaces**
**MC-04 — NotLiveInventory: 12 preserved-but-not-live surfaces**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: 12 surfaces (ConstitutionalLifecycle, NightShift, DecisionEngine, ConstitutionalMixer, ReasoningPuppetStrings, OllamaControlRoom, MCPOrchestration, TimeMachine, ConstitutionalObjects, OrganizationalHealth, etc.) are preserved in-tree but unmounted per "refactor authority, preserve mechanism." Each needs either a real backend route or permanent retirement.
- EVIDENCE: `phase24-mission-control-2026-09-19.md` (PHANTOM/UNWIRED classifications); `lane-m-missioncontrol-audit.md` §5 ordered mutation list.
- DEPENDENCIES: backend routes (gateway lane). ACCEPTANCE: each inventoried surface is either wired to a real route or deleted after deadness proof; inventory empties or becomes a deliberate "not wanted" list. NEXT FALSIFICATION: a surface quietly re-mounted without a backing route.

**MC-05 — /system/state misleading collectors**
**MC-05 — /system/state misleading collectors**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 1
- WHY: `collectReplay` counts ALL events as replay runs; `collectMissions` counts MISSION_CREATED as completed with hardcoded 0s; `collectKnowledge` caps counts at 1 via limit=1 and hardcodes witnesses to 0. UI CLAIM > BACKEND PROOF at the source.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 (REAL route, MISLEADING pockets); backlog P1 "Mission Control truthfulness".
- DEPENDENCIES: none. ACCEPTANCE: total_runs counts REPLAY_COMPLETED; completed comes from missionRuntime; knowledge counts uncapped and derived or omitted. NEXT FALSIFICATION: probe /system/state after the fix and compare against direct PG counts.

**MC-06 — Deploy-branch UI contract mismatch (`/api/*` vs real gateway routes)**
- DOMAIN: MISSION CONTROL · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The deploy-branch UI fetches `/api/{witness,observation,commands,pipeline,notifications,system/state}` which 404 on the live gateway; real routes are `/mc/*`, `/missions`, `/events`, `/knowledge`; 7 components hardcode `localhost:8080` ignoring `NEXT_PUBLIC_GATEWAY_URL`. Phase 24 fixed the worktree copy only.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §b (per-surface FAIL table, contradictions 1-2); `phase24-mission-control-2026-09-19.md`.
- DEPENDENCIES: merge decision for Phase-24 branch. ACCEPTANCE: one UI contract (the real gateway contract) on the

**MC-07 — Honest backends with zero UI callers (cheapest truthful win)**
**MC-07 — Honest backends with zero UI callers (cheapest truthful win)**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: Live-probed `/mc/replay/stats` (26 verified replays), `/mc/witness/stats` (26 attestations), `/mc/dashboard` (real business metrics, missions 417 completed/2 failed matching PG 419) are TRUTHFUL and completely unwired to any UI. Building the Replay/Witness panel is the highest-leverage honest surface.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 live probes; `recon-2026-09-19/agent-g-storage-mc-oracle.md` §b.
- DEPENDENCIES: none. ACCEPTANCE: Replay/Witness panel rendering live `/mc/replay/stats` + `/mc/witness/stats` + `/mc/replay/trace/:correlationId`. NEXT FALSIFICATION: panel shows numbers that do not match direct PG queries.

**MC-08 — Define Mission Control as identity-owned operating environment (projection model)**
**MC-08 — Define Mission Control as identity-owned operating environment (projection model)**
- DOMAIN: MISSION CONTROL · STATUS: DECISION · PRIORITY: 2
- WHY: The target model lists states (Today / Missions / Approvals / Customers-Leads / Integrations / Automations / Knowledge / Activity-Lineage / System Health) but Missions, Runs, Objects, Relationships, Feed, Capabilities, Private Context, Evidence/History as a projection model with an identity-owned operating environment is not yet pinned; Mission Control is NOT the identity domain object (per task framing) and must not invent its own CMS/auth/event store/scheduler/campaign state/knowledge graph/credential store.
- EVIDENCE: memory/2026-09-17#L628 (Nolan's standing UI principles; PING primitive is Mission→Run→Execution→Evidence); `ping-architectural-recon-2026-09-19.md` §AT (target UI model, law UI CLAIM ≤ BACKEND PROOF); memory/2026-09-21#L1482 (read-first identity archaeology, REUSE/WRAP/EXTRACT/REJECT).
- DEPENDENCIES: identity convergence (MRE-02/03). ACCEPTANCE: one written projection model naming each surface's backing route, owner, and authority boundary; public UI and Mission Control may share code but never share authority. NEXT FALSIFICATION: a surface that writes to a store Mission Control does not own.

**MC-09 — Mission mutation buttons stay hidden until a witnessed transition contract exists**
**MC-09 — Mission mutation buttons stay hidden until a witnessed transition contract exists**
- DOMAIN: MISSION CONTROL · STATUS: OPEN · PRIORITY: 2
- WHY: Approve/reject/reorder/start/edit/delete have no backend contract anywhere in the gateway; optimistic UI updates on nonexistent routes are the worst mutation pattern in the tree. The approval/effect state machine (W) is the prerequisite contract.
- EVIDENCE: `lane-m-missioncontrol-audit.md` §3 (all UNSUPPORTED) and §5 C17; `ping-architectural-recon-2026-09-19.md` §W (durable state machine design, unwired).
- DEPENDENCIES: AG-04/AG-05 (approval + effect identity wired). ACCEPTANCE: each mutation button maps to an authorized, witnessed backend transition; until then hidden, not fake. NEXT FALSIFICATION: a mutation button that POSTs to a 404.

**MC-10 — Live provenance break: baseline image replaced with no promotion record + dual-writer**
**MC-10 — Live provenance break: baseline image replaced with no promotion record + dual-writer**
- DOMAIN: MISSION CONTROL · STATUS: BLOCKED · PRIORITY: 1
- WHY: Both Oracle gateways now run `ping-gateway:candidate-3c5d280dd` (26h+, restarts=0, /health healthy) while the accepted baseline is `candidate-84486f056`; `deployment_registry` in Postgres has 0 rows; both containers share identical env → same DB (latent two-writer). The report asks Nolan: accept 3c5d280dd as the new baseline and stop :8081, or not. No green label may cover an undocumented build.
- EVIDENCE: `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` ("Baseline vs live reality", open question); memory/2026-09-21#L338 (3c5d280dd passed the 8081 battery; production 8080 still on 84486f056 at 05:55 MDT that day).
- DEPENDENCIES: Nolan's explicit decision. ACCEPTANCE: deployment_registry (or deployments.log) records the promotion with source SHA, image digest, deploy time; exactly one writer against the DB. NEXT FALSIFICATION: live image digest not present in the registry.

---

## MISSION / RUN / EXECUTION

**MRE-01 — Auditable unit: Mission → Run → Execution (never collapse)**
**MRE-01 — Auditable unit: Mission → Run → Execution (never collapse)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: The auditable unit is Mission (durable business objective) → Run (one autonomous agent attempt, one container lifetime, one worktree) → child Executions (one ExecutionAuthority.execute() invocation each). A Run may contain many Executions and must never be collapsed into one opaque execution record. The ORCA loop currently never creates MissionRuntime missions, and its recovery design references machinery it does not use.
- EVIDENCE: memory/2026-09-16#L600 (auditable unit definition); `recon-2026-09-19/agent-f-temporal-orca-approval.md` §h C7 (RESTART-RECOVERY-DESIGN references claimMission; loop never creates missions).
- DEPENDENCIES: MRE-02. ACCEPTANCE: ORCA objectives reconcile to MissionRuntime missions (or the divergence is a recorded decision); run identity is stable across restarts; Executions are individually evidenced. NEXT FALSIFICATION: one "execution" record whose internal steps cannot be independently evidenced.

**MRE-02 — Two competing mission identity schemes**
**MRE-02 — Two competing mission identity schemes**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: MissionRuntime uses content-derived `sha256(missionType:event_id)[0:16]` (idempotent); ORCA uses synthetic `orca-loop:<objective_id12>:<taskKey>`. Two identity regimes for "mission" break replay, dedup, and cross-branch result correlation.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §c and C3; `ping-architectural-recon-2026-09-19.md` §AG duplication matrix (Mission models row).
- DEPENDENCIES: none. ACCEPTANCE: one derivation pinned per identity in a contract doc with a failing-first test; other scheme classified LEGACY_INGRESS or retired. NEXT FALSIFICATION: two rows/events for one logical mission under different IDs.

**MRE-03 — Three competing WorkOrder identity schemes**
**MRE-03 — Three competing WorkOrder identity schemes**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: codex legacy `sha256('workorder:'+taskId)[0:16]`, orca caller-supplied 32-128 hex override, objective-runtime `sha256('work-order:'+objective_id+':'+task_key)` full hex. Legacy minter is task-scoped, not attempt-scoped; attempt only enters `result_id`.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e and C2; `ping-architectural-recon-2026-09-19.md` §AI-18.
- DEPENDENCIES: MRE-02. ACCEPTANCE: one scheme owned by the adapter (`stableWorkOrderId` with explicit override is the strongest shape). NEXT FALSIFICATION: duplicate WorkOrders for one logical task after restart.

**MRE-04 — Attempt identity and retry numbering**
**MRE-04 — Attempt identity and retry numbering**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 2
- WHY: `attempt_id = workOrderId + '-attempt-' + N`; retry = new attempt, same logical effect/work-order ID. MissionRuntime retries (max 3, 5s backoff, lease reclaim) and ORCA's process-local MAX_ATTEMPTS=2 are two different retry owners; Temporal's retryPolicy is unwired.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e; `agent-f-temporal-orca-approval.md` §c (A6 root causes: run-scoped derivation, in-memory issueWorkOrder); `ping-architectural-recon-2026-09-19.md` §AV (retry uses a new attempt with the same logical effect ID).
- DEPENDENCIES: MRE-11 (one retry owner). ACCEPTANCE: every retry is a numbered attempt under a stable parent ID; no retry mints a new logical identity. NEXT FALSIFICATION: a retry that creates a new work_order_id (the demonstrated A6 duplicate-delegation failure).

**MRE-05 — Mission state ≠ Object state**
**MRE-05 — Mission state ≠ Object state**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: `ping_missions` is operational state (claim/lease/retry) mirrored into durable MISSION_* canonical events; the table lacks namespace, principal, and parent_mission_id columns (namespace/correlation live only inside payload). Mission lifecycle state must never be confused with the canonical state of the business object the mission acts on.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §c (persistence, canonical event mirror, parent/child/principal gaps); memory/2026-09-16#L191 (canonical pipeline: mission execution → result/evidence).
- DEPENDENCIES: none. ACCEPTANCE: documented separation; namespace/principal/parent as first-class columns or an explicit recorded decision to keep them payload-only. NEXT FALSIFICATION: a query that reads mission status as object truth.

**MRE-06 — Execution ≠ Authorization (Python/JS boundary)**
**MRE-06 — Execution ≠ Authorization (Python/JS boundary)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: `authorizeWorkOrder` is authorization, not approval; it mandates `no_canonical_events` and `no_mission_state_writes`. The 34/34 multi-runtime proof demonstrated Python behind the worker boundary without the ability to emit canonical events. The JS→Python transport must be a localhost HTTP sidecar with bearer auth and must not create another execution authority.
- EVIDENCE: memory/2026-09-16#L1011 (multi-runtime proof); memory/2026-09-16#L663 (Nolan's sidecar directive); `agent-d-lineage-mission-workorder.md` §e (adapter gate).
- DEPENDENCIES: none. ACCEPTANCE: Python adapter with Postgres wiring, retry/dead-letter, remote transport, concurrency (all partial today) behind the sidecar; an attempted canonical emit from Python fails closed. NEXT FALSIFICATION: a Python-side write that lands in ping_events without passing the JS authority.

**MRE-07 — Worktree isolation for agent runs**
**MRE-07 — Worktree isolation for agent runs**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: The execution model requires one worktree per Run (memory definition) and one writer per mutable unit in isolated worktrees (WBD lanes). The Run's filesystem scope must be auditable as part of the Run record.
- EVIDENCE: memory/2026-09-16#L600 (one container lifetime, one worktree); `execution-wbd-2026-09-19.md` (lanes, one writer per mutable unit, isolated worktrees).
- DEPENDENCIES: MRE-01. ACCEPTANCE: every Run record names its worktree/container lifetime; concurrent Runs cannot write the same mutable unit. NEXT FALSIFICATION: two Runs with overlapping write scopes and no merge-authority record.

**MRE-08 — Retry ownership: PING vs Temporal**
**MRE-08 — Retry ownership: PING vs Temporal**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: DECISION · PRIORITY: 2
- WHY: Today PING owns durable retry (`MissionRuntime.failWithRetry`, live), lease renewal, and lease reaping; Temporal owns nothing (0 workflows ever executed; SDK absent in main repo; one scheduler provider starts a nonexistent workflow). The documented constraint "Temporal owns execution mechanics" is inverted in the running system.
- EVIDENCE: `agent-f-temporal-orca-approval.md` §a and §d (responsibility table: GAP/VIOLATION verdicts); `ping-architectural-recon-2026-09-19.md` §AI-07/AI-08.
- DEPENDENCIES: MRE-09 (A6 re-test evidence). ACCEPTANCE: explicit decision: adopt Temporal after A6 proof, or certify the PG-lease scheduler as the documented owner (target model §AO already leans here). NEXT FALSIFICATION: a durability claim that names Temporal as the mechanism while zero workflows have executed.

**MRE-09 — A6 restart resilience: remediation unproven**
**MRE-09 — A6 restart resilience: remediation unproven**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: BLOCKED · PRIORITY: 1
- WHY: The witnessed kill-9 test FALSIFIED A6 (duplicate delegation: two work_order_ids, two WORKER_FAILED for one logical task; no rediscovery/reconstruction/continuation). Remediation (stable objective/work-order/attempt IDs, startup reconciliation, crash-safe rendezvous, PG advisory-lock coordinator claim, durable budget) is WIRED_UNPROVEN. The re-test is the promotion gate.
- EVIDENCE: `agent-f-temporal-orca-approval.md` §c (A6 FALSIFIED, witnessed) and §d (smallest-change list); `ping-architectural-recon-2026-09-19.md` §AZ.
- DEPENDENCIES: supervised experiment authorization. ACCEPTANCE: witnessed kill-9 re-test with zero duplicate WorkOrders, zero lost missions, cycle state recovered, all transitions attested. NEXT FALSIFICATION: any A6 claim before that re-test runs.

**MRE-10 — Result truth: worker is not the judge of its own correctness**
**MRE-10 — Result truth: worker is not the judge of its own correctness**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: Result semantics verified as (a) worker returned bytes YES, (b) worker claims success YES, (c) execution completed PARTIAL, (d) verified outcome NO. `verifyResultEnvelope` validates binding/identity/coherence only; `recordVerifiedResult` records the validated claim, not a verified truth. The "26/26 validated" claim rests on a harness with 3 asserts, not 26 checks.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e (result-semantics verdict) and C9; backlog P1 "Result truth".
- DEPENDENCIES: none. ACCEPTANCE: machine-checkable assertion suite for the status algebra + executor binding + deadline, run in CI; output-content truth assigned a separate owner (unknown AJ-07). NEXT FALSIFICATION: a WORKER_COMPLETED event whose output content was treated as verified truth.

**MRE-11 — Durable orchestration journal: same-transaction discipline**
**MRE-11 — Durable orchestration journal: same-transaction discipline**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: DECISION · PRIORITY: 1
- WHY: Crash between side effect and ack, duplicate delivery, and worker-completes-but-PING-dies-before-result-persistence are unanswered. The harvested mechanism: mission state transition + worker result + next-mission creation commit atomically (DBOS same-transaction discipline; Hatchet terminal-release idempotency keys), not another framework.
- EVIDENCE: backlog P1 "Durable orchestration"; `recon-2026-09-19/lane-f-falsification.md:136` (same-transaction discipline); `ping-architectural-recon-2026-09-19.md` §AE (DBOS/Restate harvest rows).
- DEPENDENCIES: MRE-08. ACCEPTANCE: keyed recovery with stable idempotency keys, durable checkpoints, webhook-resumed approvals; crash windows A-E re-classified after implementation. NEXT FALSIFICATION: a crash-window test that loses a committed effect.

**MRE-12 — UNKNOWN reconciliation and envelope time-field honesty**
**MRE-12 — UNKNOWN reconciliation and envelope time-field honesty**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 2
- WHY: UNKNOWN execution states need deterministic reconciliation (re-check provider by provider_request_id before re-execution, never blind retry). Separately, the ORCA audit found worker envelope timestamps templated (startedAt/endedAt not matching the run window) - unreliable time metadata inside a provenance record.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AV (crash rule: re-check EFFECT_EXECUTING against provider); `goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md` (timestamp discrepancy, EVIDENCE_METADATA_DEFECT).
- DEPENDENCIES: AG-04. ACCEPTANCE: reconciliation path for UNKNOWN with provider request-ID check; envelope timestamps sourced from the rendezvous record, not templated. NEXT FALSIFICATION: a retry executed without a provider-state check.

**MRE-13 — Mission taxonomy collapse (20 types → 1 worker)**
**MRE-13 — Mission taxonomy collapse (20 types → 1 worker)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 3
- WHY: MISSION_WORKER_MAP routes ~20 business mission types (CUSTOMER_ONBOARD, LEAD_FOLLOWUP, INVOICE_TRACK...) all to the single 'observation' worker. The taxonomy claims domain diversity the scheduler does not execute.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §c; `ping-architectural-recon-2026-09-19.md` §N.
- DEPENDENCIES: none. ACCEPTANCE: each mission type maps to a real worker or the taxonomy is collapsed honestly. NEXT FALSIFICATION: a mission type whose dispatched worker cannot perform it.

**MRE-14 — Live vs certified identity divergence (the sharpest contradiction)**
**MRE-14 — Live vs certified identity divergence (the sharpest contradiction)**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 1
- WHY: Live container mints 64-hex SHA-256 over raw `JSON.stringify` (key-order dependent, mint-before-validate, namespace-conditional preimage); the certified worktree mints `event_<16hex>` via IdentityAuthority with RFC-8785 canonicalization and validate-before-mint. Same logical event → different IDs. Any identity/ordering certification attaches to worktree code only, not to rows the running container minted.
- EVIDENCE: `forensics/phase1-two-authority-reverify-2026-09-19.md` §211-243 (LIVE_VERIFIED/SOURCE_VERIFIED divergence table).
- DEPENDENCIES: MC-10 (which build is actually live). ACCEPTANCE: deployed artifact's identity scheme proven and pinned; certified scheme deployed or the certification scope is explicitly worktree-only. NEXT FALSIFICATION: a replay that joins live rows by event_id across the two schemes.

**MRE-15 — Empty legacy mission tables vs live mission truth**
**MRE-15 — Empty legacy mission tables vs live mission truth**
- DOMAIN: MISSION/RUN/EXECUTION · STATUS: OPEN · PRIORITY: 3
- WHY: `mission_events` and `mission_executions` tables have 0 rows on Oracle; mission truth lives in `ping_missions` + MISSION_* canonical events. The empty tables are either preserved history or dead schema that should stop being created.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §a census; `agent-d-lineage-mission-workorder.md` §c.
- DEPENDENCIES: convergence decision on event-store (BD-05). ACCEPTANCE: each empty table classified (PRESERVED_HISTORY vs dead schema) and new deploys follow the classification. NEXT FALSIFICATION: a writer found inserting into one of the "dead" tables.

---

## LEARNING LOOP

**LL-01 — The loop executes but does not learn (core finding)**
**LL-01 — The loop executes but does not learn (core finding)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: 144 missions completed and 18 full intelligence chains ran, but there are zero non-test consumers of mission results and zero approvals through the wired KnowledgePromoter path. The execution engine runs; the learning edges are dead.
- EVIDENCE: memory/2026-09-19#L1740 (product-loop finding); `ping-architectural-recon-2026-09-19.md` §AX (first business proof: "First broken arrow today").
- DEPENDENCIES: LL-02, LL-03. ACCEPTANCE: at least one production mission result consumed by a learning edge (promotion proposal, playbook revision, or knowledge update) with full evidence. NEXT FALSIFICATION: another 50 completed missions with zero learning-edge consumption.

**LL-02 — Mission-result consumers: dead ends inventory**
**LL-02 — Mission-result consumers: dead ends inventory**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: MissionScheduler discards worker dispatchResult (stores only completion metadata); MISSION_COMPLETED has no production subscriber; LINEAGE_CREATED is terminal while its projection-listener declaration is unreachable; WITNESS_REJECTED has no consumer or operator signal; recommendations are listed but have no approve/reject/act path.
- EVIDENCE: memory/2026-09-20#L865 (product-loop dead ends, verified).
- DEPENDENCIES: none. ACCEPTANCE: each dead end either wired to a consumer or explicitly classified terminal-with-reason. NEXT FALSIFICATION: a new worker result type added with no consumer.

**LL-03 — Approval event producer (highest-leverage close)**
**LL-03 — Approval event producer (highest-leverage close)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: Knowledge promotion expects approval events, but no producer or approval endpoint exists. The investigation's identified smallest close is an approval event producer on an existing route.
- EVIDENCE: memory/2026-09-20#L865; `ping-architectural-recon-2026-09-19.md` §R (ASSESSMENT: human approval events → KnowledgePromoter, WIRED_UNPROVEN).
- DEPENDENCIES: AG-05 (one durable approval gate). ACCEPTANCE: a production approval event flows into KnowledgePromoter and changes a knowledge node state with provenance. NEXT FALSIFICATION: the producer emits events the promoter never reads.

**LL-04 — Test-scoped compounding proof → production wiring**
**LL-04 — Test-scoped compounding proof → production wiring**
- DOMAIN: LEARNING LOOP · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The full loop was verified in test scope (proposal → human approval → activation → authorized mission → execution → outcome → revision proposal, with replay, witness, lineage, restart survival). Revision `194a2b85bde957ed` v1.1.0 remains PENDING_HUMAN; active v1.0.0 untouched; no auto-promotion. The mechanism exists; production wiring does not.
- EVIDENCE: memory/2026-09-16#L1069; memory/2026-09-17#L268.
- DEPENDENCIES: LL-03, AG-04. ACCEPTANCE: one production knowledge revision promoted through human approval with the same evidence chain. NEXT FALSIFICATION: an auto-promotion (active version changed without a recorded human approval).

**LL-05 — Self-certification seam: emitter must never mint VERIFIED**
**LL-05 — Self-certification seam: emitter must never mint VERIFIED**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: The 09-13 verdict traced a full emission chain where the engine named itself, self-certified via mark-verified.sh (checks file existence, never verification work), hardcoded `verification_status='verified'`, and the gateway checked bearer-only. The smallest seam: PING-owned `knowledge_state` column on ping_events; emitter claims coerced to non-canonical default; VERIFIED becomes a PING-side operation requiring a verifier principal distinct from the engine key.
- EVIDENCE: memory/2026-09-13#L728 (full verdict with T0-T6 trace; awaiting Nolan's decision on building the seam + interim rule).
- DEPENDENCIES: Nolan's decision (recorded as pending since 09-13). ACCEPTANCE: no unattended emission can carry VERIFIED; verification is POST /events/:id/verification with PASS/FAIL/INSUFFICIENT + reasons. NEXT FALSIFICATION: a VERIFIED row whose verifier principal equals the emitter.

**LL-06 — Unauthenticated knowledge write path (POST /knowledge/nodes + /edges)**
**LL-06 — Unauthenticated knowledge write path (POST /knowledge/nodes + /edges)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 1
- WHY: Both routes are public with no auth and accept caller-supplied status/confidence - a second unauthenticated write path into PING-held knowledge, independent of the event pipeline.
- EVIDENCE: memory/2026-09-13#L728 ("a second unauthenticated write path"); `ping-architectural-recon-2026-09-19.md` §AU (target security model).
- DEPENDENCIES: LL-05. ACCEPTANCE: auth on both routes; caller-supplied status/confidence coerced or rejected; audit of existing rows for injected claims. NEXT FALSIFICATION: an unauthenticated POST that lands a node with status=approved.

**LL-07 — Negative knowledge states absent as code**
**LL-07 — Negative knowledge states absent as code**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: UNKNOWN, INSUFFICIENT_EVIDENCE, CONFLICTING_EVIDENCE, STALE, UNVERIFIED, NOT_APPLICABLE have zero hits in runtime code. The system cannot distinguish "never looked" from "looked and found nothing"; `rejected` is the only negative pole.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §R; backlog P3 (knowledge/entity/freshness layer); §AP target (negative states exist as code).
- DEPENDENCIES: LL-11. ACCEPTANCE: negative states as code with transitions; Ask FYD answers "what it doesn't know" from these states. NEXT FALSIFICATION: a query returning an empty answer indistinguishable from a negative finding.

**LL-08 — Freshness, dependency edges, targeted recompile (the moat mechanism)**
**LL-08 — Freshness, dependency edges, targeted recompile (the moat mechanism)**
- DOMAIN: LEARNING LOOP · STATUS: HARVEST · PRIORITY: 2
- WHY: No dependency edges, no staleness columns; a 24h file cache can serve stale evidence silently. The harvest decision: Dagster-style asset-centric lineage + Nix-style declared-input lockfiles + Iceberg snapshot lineage → content-addressed dependency graph from source snapshots through compiler runs to claims, enabling targeted invalidation and incremental recompilation.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §S (current state), §AY (knowledge-compounding proof gate), §AE harvest rows (dbt/Dagster/Iceberg/Nix), §BC-10 (highest-confidence improvement #10: "the moat mechanism; everything else is hygiene").
- DEPENDENCIES: LL-07. ACCEPTANCE: one source snapshot with content hash → distill → claim-diff proof (AY) passes. NEXT FALSIFICATION: a claim served after its source snapshot changed with no invalidation marker.

**LL-09 — Outcome feedback: A4 observed but not wired to business events**
**LL-09 — Outcome feedback: A4 observed but not wired to business events**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: Outcome observation (ORCA A4) is proven in the control loop but not wired to business events (lead → outcome → customer knowledge update). The AX business-proof trace breaks at "outcome observed (open/reply) → evidence recorded → customer knowledge updated."
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AX (first business proof; second/third broken arrows); memory/2026-09-20#L865.
- DEPENDENCIES: LL-03, site/customer outcome instrumentation (FYD side). ACCEPTANCE: one business effect (e.g. outreach email) traced through to an observed outcome recorded as evidence and reflected in customer knowledge. NEXT FALSIFICATION: an effect with no outcome-observation path after the send.

**LL-10 — Execution feedback dataset / trajectory-level evaluation**
**LL-10 — Execution feedback dataset / trajectory-level evaluation**
- DOMAIN: LEARNING LOOP · STATUS: HARVEST · PRIORITY: 3
- WHY: Missions should be evaluated as trajectories against replay (Phoenix pattern: evals from spans to whole trajectories), with every VERIFIED claim linking to its verification trace (Langfuse pattern, self-hosted posture).
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AE (Phoenix, Langfuse rows); §TBD in BD plan (BD-16 business/knowledge proofs).
- DEPENDENCIES: MRE-01 (trajectories need stable Run identity), LL-01. ACCEPTANCE: one mission trajectory evaluated against its replay with a recorded score and trace link. NEXT FALSIFICATION: an evaluation that cannot be re-derived from the event journal.

**LL-11 — Deterministic consumers of learnings (promotion replay)**
**LL-11 — Deterministic consumers of learnings (promotion replay)**
- DOMAIN: LEARNING LOOP · STATUS: OPEN · PRIORITY: 2
- WHY: Knowledge promotion decisions must be deterministic consumers: the same evidence + policy → the same promotion decision, replayable. The compiler input_manifest / output_manifest design exists only as a minimum-metadata sketch.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §S (minimum-metadata design, no implementation); §BD-10.
- DEPENDENCIES: LL-08. ACCEPTANCE: a promotion decision re-derived from its recorded inputs reproduces byte-identically. NEXT FALSIFICATION: two identical evidence sets producing different promotion outcomes.

**LL-12 — Emitter vocabulary: OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING only**
**LL-12 — Emitter vocabulary: OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING only**
- DOMAIN: LEARNING LOOP · STATUS: DECISION · PRIORITY: 1
- WHY: The engine may create OBSERVATION/HYPOTHESIS/CANDIDATE_LEARNING/VERIFICATION_REQUEST but never VERIFIED; interim rule (no code): no unattended learn-file emissions, every mark-verified needs Nolan's explicit per-item approval. This decision has been pending since 09-13.
- EVIDENCE: memory/2026-09-13#L728 (smallest seam + interim rule, "Awaiting Nolan's decision").
- DEPENDENCIES: Nolan's explicit decision. ACCEPTANCE: vocabulary enforced at emit (coercion) or documented interim rule in force with evidence. NEXT FALSIFICATION: an unattended emission carrying a canonical truth claim.

---

## HEALTH + OBSERVABILITY

**HO-01 — /health claims healthy with zero checks registered**
**HO-01 — /health claims healthy with zero checks registered**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: `getHealth()` starts at `status:'healthy'` and iterates registered checks; with zero checks it returns healthy with empty components. The fix is one conditional: return `unknown`/`unproven` with an explicit note. Audit-only so far; belongs in the convergence lane with a fail-before test, not a hot patch.
- EVIDENCE: `~/workspace/health-truth-audit-2026-09-20.md` Finding 1.
- DEPENDENCIES: none. ACCEPTANCE: /health with no checks returns a non-healthy status naming the absence; fail-before test red, then green. NEXT FALSIFICATION: a fresh boot returning healthy before any check registers.

**HO-02 — No green labels for "not configured" (global rule)**
**HO-02 — No green labels for "not configured" (global rule)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The backlog P1 is explicit: remove or quarantine every fixture/mock/hardcoded production surface; UI claim ≤ backend proof. Phase 24 + the 09-18 cleanup commits are the mechanism; coverage is incomplete (deploy branch, latent mock-data imports).
- EVIDENCE: `forensics/convergence-backlog-2026-09-19.md` P1; `phase24-mission-control-2026-09-19.md`; `agent-g-storage-mc-oracle.md` §b.
- DEPENDENCIES: MC-01/MC-06. ACCEPTANCE: no production surface renders a health/status claim not backed by a live check. NEXT FALSIFICATION: any "Healthy"/"Ready"/"All systems nominal" string in a production build path.

**HO-03 — Recovery state classification (ladder states as evidence)**
**HO-03 — Recovery state classification (ladder states as evidence)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: The Oracle ladder (ARCHITECTURE_READY → ... → RUNTIME_PROVEN → RESTART_PROVEN → REPLAY_PROVEN → ...) requires actual evidence per rung. Current: RESTART_PROVEN never observed on Oracle (restarts=0); REPLAY_PROVEN partial (replay doesn't read the journal); BUSINESS_PATH_PROVEN is the AX trace, unbuilt. "Again" disk pressure (80% → 56% after reclamation) is the recurring operational theme.
- EVIDENCE: `oracle-migration/ORACLE-STATUS-2026-09-22.md`; WBD §O-0 ladder; memory/2026-09-21#L7 (source green ≠ build green ≠ runtime green ≠ restart green).
- DEPENDENCIES: MC-10. ACCEPTANCE: each claimed rung has a dated proof artifact; restart proof asserts event/mission counts unchanged. NEXT FALSIFICATION: a rung claimed without its proof artifact.

**HO-04 — Exact runtime/build provenance (deployments.log + digests)**
**HO-04 — Exact runtime/build provenance (deployments.log + digests)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 1
- WHY: Every running image must answer source SHA, tree hash, image digest, schema version, deployment time, target. Today: gateway digest unrecorded, `deployment_registry` 0 rows, live image ≠ accepted baseline (MC-10). Provenance manifest is mandatory per the WBD install gate.
- EVIDENCE: backlog P0 "Deployment provenance"; `oracle-migration/ORACLE-STATUS-2026-09-22.md`; `recon-2026-09-19/agent-g-storage-mc-oracle.md` §c (deployment SHA recording: "cheap, satisfies the evidence manifest at small scale").
- DEPENDENCIES: MC-10. ACCEPTANCE: append-only deployments.log (timestamp, git SHA, image digests, operator) populated for every deploy; deployment_registry or its successor non-empty. NEXT FALSIFICATION: a running container whose digest is not in the log.

**HO-05 — Qdrant truthfulness: projection event precedes the write; embeddings are pseudo-vectors**
**HO-05 — Qdrant truthfulness: projection event precedes the write; embeddings are pseudo-vectors**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: ProjectionWorker emits PROJECTION_CREATED *before* the Qdrant write; failures are swallowed (console.error, returns ok). The event means "canonical projection object created," NOT "Qdrant materialized." Separately, with Ollama absent on Oracle, the 112 vectors are SHA-256-seeded pseudo-vectors tagged `embedding:'fallback'` - nearest-neighbor over hash-derived vectors is not semantic search.
- EVIDENCE: memory/2026-09-19#L988 (contradiction resolved: PROJECTION_CREATED → Qdrant TRUE, reverse FALSE; consequence: replays attest projections whose Qdrant write may have failed silently); `agent-g-storage-mc-oracle.md` §g contradiction 4.
- DEPENDENCIES: none. ACCEPTANCE: either the emit follows a confirmed write, or the event semantics are documented and the bridge attests accordingly; the knowledge surface is labeled honestly until real embeddings exist. NEXT FALSIFICATION: a PROJECTION_CREATED event with no corresponding Qdrant point and no documented gap.

**HO-06 — Redis truthfulness: built, never live, zero requirers**
**HO-06 — Redis truthfulness: built, never live, zero requirers**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: `redis_adapter.js` is required by zero live files; Redis is BUILT_NOT_LIVE. Any health surface implying Redis as an operational dependency is fiction; the stage-1 topology is Postgres + gateway + Qdrant only.
- EVIDENCE: `recon-2026-09-19/agent-g-storage-mc-oracle.md` §a census; `ping-architectural-recon-2026-09-19.md` §AR (Redis stays unwired until a proven need).
- DEPENDENCIES: none. ACCEPTANCE: adapter deleted/quarantined with a DO_NOT_USE marker, or a proven unique need documented. NEXT FALSIFICATION: a health check reporting Redis status as meaningful.

**HO-07 — Health ≠ durability (document the boundary)**
**HO-07 — Health ≠ durability (document the boundary)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Healthy does not prove PostgreSQL is writable (proven separately via event write + readback); zero event counters after restart are runtime counters, not durability proof - durable history is in PostgreSQL, not the health payload. Callers must not treat health as durability evidence.
- EVIDENCE: `health-truth-audit-2026-09-20.md` Finding 3.
- DEPENDENCIES: none. ACCEPTANCE: documented law (HEALTH ≠ PROCESS EXISTS → HEALTH ≠ DURABILITY) referenced by every health consumer; writability proven by write+readback, not by /health. NEXT FALSIFICATION: an automation that treats a 200 /health as proof of a durable write.

**HO-08 — /system/state sees 0 events while /mc/* sees 26-45 (two backends, two truths)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: BLOCKED · PRIORITY: 1
- WHY: Lane-M's live probe: SystemAuthority's eventReadAuthority disagrees with the unifiedEventRuntime used by the /mc routes. The cockpit trusts the wrong one. Needs falsification of which event source each service is actually bound to in the deployed artifact (Lane P / W-0 territory).
- EVIDENCE: `lane-m-missioncontrol-audit.md` §2 (contradiction found) and §5 D22.
- DEPENDENCIES: deployed-artifact binding analysis. ACCEPTANCE: one documented binding per service; the wrong binding fixed or the discrepancy resolved in favor of the canonica

**HO-09 — Migration failure vs Postgres failure (distinct recovery states)**
**HO-09 — Migration failure vs Postgres failure (distinct recovery states)**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Recovery states must be classified: a failed migration is not a failed database. The Oracle deployment design calls for restart proofs asserting event/mission counts unchanged and a rehearsed restore (fresh VM → restore → schema self-heal → re-embed), not just a written procedure. Neither has been observed.
- EVIDENCE: `agent-g-storage-mc-oracle.md` §c (deployment design); `oracle-migration/ORACLE-STATUS-2026-09-22.md` (reclamation verified restarts=0, healthy - but no restart *test*).
- DEPENDENCIES: MC-10. ACCEPTANCE: controlled restart test with pre/post counts recorded; rehearsed restore, not just documented. NEXT FALSIFICATION: a restore procedure that has never been executed.

**HO-10 — Nothing watches the watcher; Pig/Oracle health divergence**
**HO-10 — Nothing watches the watcher; Pig/Oracle health divergence**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 3
- WHY: Qdrant and Vault unhealthy on Pig while Oracle Qdrant healthy; no host-level watcher curls /health (nothing pages on failure). The Pig remains the automation/dev host with its own health story.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AI-22; `agent-g-storage-mc-oracle.md` §c (health checks section).
- DEPENDENCIES: none. ACCEPTANCE: host-level /health watcher with paging; Pig vs Oracle health divergence explained or resolved. NEXT FALSIFICATION: a gateway outage with no alert fired.

**HO-11 — Era markers: Era 12 vs Era 13 witness leaves; identity eras**
**HO-11 — Era markers: Era 12 vs Era 13 witness leaves; identity eras**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: Executed witness artifacts have 12 leaves; TS source computes 13; Era-12 roots must be preserved under explicit versioning (`witness.merkle.v1-12` vs `v2-13`) and never silently recomputed; identity rows need era-marking (Era H 64-hex, TenantOS UUIDv5) so old events replay under original rules. Five-year replayability = these bindings + preserved inputs + law manifest.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §AI-03/04/05, §AW, §BD-03; WBD W-2.
- DEPENDENCIES: HO-04 (provenance). ACCEPTANCE: per-attestation binding of construction version, leaf count, engine/canonicalization/hash versions, law manifest; sanctioned pinned rebuild with golden vectors. NEXT FALSIFICATION: a rebuild that silently changes a historical root.

**HO-12 — Seed contamination: 8 fictional rows in canonical truth**
**HO-12 — Seed contamination: 8 fictional rows in canonical truth**
- DOMAIN: HEALTH+OBSERVABILITY · STATUS: OPEN · PRIORITY: 2
- WHY: `_seedBusinessEvents` inserts fictional customers ("Sarah Chen", "Mike Rodriguez", "Emily Watson") into `ping_events` on first boot; 8 rows verified live on Oracle, indistinguishable from real business data. Any UI backed by ping_events inherits the fiction at the source.
- EVIDENCE: `agent-g-storage-mc-oracle.md` §b (demo-seed contamination, PROVEN_RUNTIME) and §g.6; `ping-architectural-recon-2026-09-19.md` §AI-14, §AX target (seeder default-off, clearly tagged).
- DEPENDENCIES: Nolan's explicit word (canonical data is not deleted on agent say-so). ACCEPTANCE: seeder env-gated (default off), seeded rows tagged/filterable, Oracle 8 rows purged or quarantined by operator decision. NEXT FALSIFICATION: a fresh boot seeding rows into a production database.

---

## AGENTS

**AG-01 — Capability-gated action: READ/REASON/PROPOSE/ACT only with capability**
**AG-01 — Capability-gated action: READ/REASON/PROPOSE/ACT only with capability**
- DOMAIN: AGENTS · STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The ORCA loop's `authorizeWorkOrder` is the live, fail-closed gate: known LIVE profile, capability ∈ allowlist, namespace regex, constraints may only tighten, mandatory `no_canonical_events` + `no_mission_state_writes`. PENDING_AUTH families deny fail-closed; policy escalation blocks email.send/sms.send to human approval (exit 3). Proven in the witnessed A1-A5 runs.
- EVIDENCE: `recon-2026-09-19/agent-d-lineage-mission-workorder.md` §e and §f; `recon-2026-09-19/agent-f-temporal-orca-approval.md` §c (A1-A5 PROVEN_RUNTIME); `goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md` (live PG path, CLI proofs).
- DEPENDENCIES: AG-02 (kill the phantom twin claim). ACCEPTANCE: gate stays the single choke point; any new capability requires profile + validation harness update. NEXT FALSIFICATION: a dispatch that bypassed authorizeWorkOrder.

**AG-02 — Kill the phantom CapabilityAuthority claim**
**AG-02 — Kill the phantom CapabilityAuthority claim**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: `capabilities/registry.yaml` declares CapabilityResolution → CapabilityAuthority as `missing_implementation`, while adapter comments cite it as live at `/app/gateway/capability_authority.js:230` - a file that exists in zero of five audited branches. Phantom authorities are where bypasses hide. The de facto authority is `ExternalAgentAdapter.authorizeWorkOrder`.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §b (phantom vocabulary #1) and C1; `ping-architectural-recon-2026-09-19.md` §AI-12.
- DEPENDENCIES: none. ACCEPTANCE: registry.yaml and comments say the true owner (or the real CapabilityAuthority is produced); no source claims a live file that does not exist. NEXT FALSIFICATION: grep finding a live-path reference to the phantom file.

**AG-03 — Agent output ≠ canonical truth (envelope validates, never verifies)**
**AG-03 — Agent output ≠ canonical truth (envelope validates, never verifies)**
- DOMAIN: AGENTS · STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The ORCA adapter honestly bounds itself: `verifyResultEnvelope` checks field presence, binding equality, executor triple-match, status coherence, deadline; validation failure → `{valid:false, retryable:false}` so it never reaches canonical authority. `recordVerifiedResult` records the validated claim via the injected event runtime. Output content truth is explicitly outside the envelope's authority (MRE-10).
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §e; orca-a5 verdict (A5 recovery semantics, honest failure reporting).
- DEPENDENCIES: MRE-10 (assertion suite to keep it verified). ACCEPTANCE: the envelope remains the single choke point with CI-pinned assertions; no path writes agent output to canonical stores except through it. NEXT FALSIFICATION: a canonical event whose payload came from an unverified envelope.

**AG-04 — Proposals bind the exact proposed transition digest; approval approves that exact digest**
**AG-04 — Proposals bind the exact proposed transition digest; approval approves that exact digest**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 1
- WHY: The design exists twice, both unwired: (a) PING approval/effect state machine with `effect_id = sha256(approval_id)` and `action_id` including the payload hash (current formula omits mission/proposal/payload, so distinct emails to one customer collide); (b) the FYD owner patch loop: strong binding of tenant + actor + base digest + patch digest + approval + result digest, one-tap UI, stale base = STALE PROPOSAL. Human approval must approve *that exact transition*, not a description of it.
- EVIDENCE: `recon-2026-09-19/agent-f-temporal-orca-approval.md` §f (smallest durable machine; identity fix) and C8 (identity collision); MEMORY.md FYD owner gate (2026-09-22: strong binding, tenant+actor+base digest+patch digest+approval+result digest); backlog P0 "Approval/effect identity".
- DEPENDENCIES: AG-05. ACCEPTANCE: Postgres-wired state machine; retry re-checks `isEffectCompleted` before re-execution; a proposal whose bytes changed after approval is rejected as STALE. NEXT FALSIFICATION: an executed effect whose payload hash differs from the approved proposal's.

**AG-05 — One durable human approval gate (merge the two mechanisms)**
**AG-05 — One durable human approval gate (merge the two mechanisms)**
- DOMAIN: AGENTS · STATUS: DECISION · PRIORITY: 1
- WHY: Two approval mechanisms compete and neither is durable: `BusinessActionAuthority` (in-memory, wired to nothing) and ORCA escalation files (block + exit 3, ORCA loop only); Temporal `approvalSignal` never runs. The target: one gate - `GET /approvals/pending` + `POST /approvals/:id/decision`, durable PROPOSED → APPROVED/REJECTED/EXPIRED/SUPERSEDED, webhook-resume (HumanLayer pattern: the response arrives as a resuming event, never hold a process open).
- EVIDENCE: `agent-f-temporal-orca-approval.md` §e (approval today = phantom/experimental) and M4 (merge, not both); memory/2026-09-20#L865 (recommendations have no approve/reject/act path); `ping-architectural-recon-2026-09-19.md` §AE (HumanLayer harvest).
- DEPENDENCIES: Nolan's decision on the merge. ACCEPTANCE: exactly one approval mechanism, durable in Postgres, with the escalation path as a special case of the gate (propose → PENDING_HUMAN → expire/escalate). NEXT FALSIFICATION: a human decision recorded only in a file or in memory.

**AG-06 — Capability vocabularies: do not promote to orchestration language yet**
**AG-06 — Capability vocabularies: do not promote to orchestration language yet**
- DOMAIN: AGENTS · STATUS: HARVEST · PRIORITY: 3
- WHY: Three mutually unintelligible vocabularies (SaaS-connector operations, agent allowlist verbs, MCP matrix rows) share no schema and no enforcing registry; the registry.yaml that should unify them self-declares its authority missing. Keep capability inside the WorkOrder authorization gate where it is enforced. Harvest the A2A Agent Card / AgentSkill discovery contract shape for later.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §d (orchestration-language verdict: NO); `ping-architectural-recon-2026-09-19.md` §O and §AE (A2A row).
- DEPENDENCIES: AG-02. ACCEPTANCE: one registry owns the vocabulary before any orchestration-language claim; until then, enforced-at-the-gate only. NEXT FALSIFICATION: a capability string used in two vocabularies with different meanings.

**AG-07 — MISSION/CAPABILITY/EXECUTOR are collapsed in the WorkOrder (name it or separate it)**
**AG-07 — MISSION/CAPABILITY/EXECUTOR are collapsed in the WorkOrder (name it or separate it)**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: The WorkOrder binds capability + executor together; the executor's profile allowlist *is* the capability check; there is no independent capability-resolution step. This is honest today but must be an explicit architectural position, not an accident - otherwise a future "capability service" becomes a second authority.
- EVIDENCE: `ping-architectural-recon-2026-09-19.md` §O (collapse verdict); `agent-d-lineage-mission-workorder.md` §d.
- DEPENDENCIES: AG-06. ACCEPTANCE: documented position: capability resolution lives in the authorization gate (or a real independent step is built with one owner). NEXT FALSIFICATION: a new capability check that bypasses authorizeWorkOrder.

**AG-08 — Context-pack binding: equality is not provenance**
**AG-08 — Context-pack binding: equality is not provenance**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: The WorkOrder envelope requires `contextPackId` and the result must echo it exactly - but the binding check verifies *equality*, not *provenance*. The codex branch compiles real packs (canonicalize, dedupe, conflict-throw, tenant filter); the ORCA loop passes synthetic `orca-context-<id>` with no compilation. The check passes either way. The direct Qdrant→Ollama RAG bypass (wired in the live gateway bootstrap) routes around the pack entirely.
- EVIDENCE: `agent-d-lineage-mission-workorder.md` C4; `ping-architectural-recon-2026-09-19.md` §Q (boundary hypothesis FALSIFIED, 5 points) and §AI-09.
- DEPENDENCIES: none. ACCEPTANCE: codex-branch context work landed (canonicalization, conflict-throw, tenant filter, contextPackId binding, self-describing packs); bypass removed or governed. NEXT FALSIFICATION: a production answer synthesized without a compiled pack while the pack contract claims universality.

**AG-09 — Lineage DAG legality: no cycle detection anywhere**
**AG-09 — Lineage DAG legality: no cycle detection anywhere**
- DOMAIN: AGENTS · STATUS: OPEN · PRIORITY: 2
- WHY: Neither the dead `LineageAuthority` nor the live `LineageWorker` validates causation chains; a cyclic causation graph is accepted silently. The live worker records only the immediate parent. Cheap, reversible fix: a causation_id validator (reject self-parent, bounded chain-walk cycle detection in ping_events).
- EVIDENCE: `agent-d-lineage-mission-workorder.md` §a (DAG legality: NONE, anywhere) and top-5 #1; `ping-architectural-recon-2026-09-19.md` §AI-17.
- DEPENDENCIES: none. ACCEPTANCE: cycle/topology validation in the worker path with tests. NEXT FALSIFICATION: a cyclic causation chain persisted without rejection.

---

## SOURCES REVIEWED

1. `~/workspace/goals/ping-agent-execution-stack/GOAL.md` + `files/` (OPERATING_SPEC.md authority records; PING-RUNTIME-DISTRIBUTION-V1-MILESTONE.md; RUNTIME-DISTRIBUTION-V1-EXCLUSION.md; PING_PIG_DISK_WSL_INCIDENT_RCA.md; runtime-manifest.json) + `hidden_files/` (orca-a5-audit-verdict-2026-09-18.md; convergence-forensics runtime-manifest-v1.working.md)
2. `~/workspace/goals/fyd-social-product-build/GOAL.md` (briefs/agent_notes/hidden_files/files all empty - noted)
3. `~/workspace/health-truth-audit-2026-09-20.md` (full)
4. `~/workspace/oracle-migration/ORACLE-STATUS-2026-09-22.md` + evidence dir listing
5. `~/workspace/forensics/`: convergence-backlog-2026-09-19

1. **Identity certification scope**
1. **Identity certification scope**: worktree certifies `event_<16hex>` RFC-8785 IDs (phase1, SOURCE_VERIFIED) vs live container mints 64-hex `JSON.stringify` IDs (phase1 §§211-243, LIVE_VERIFIED). Same logical event, different IDs; certification does not describe live rows.

2. **"Exactly one effective Event Authority"**
2. **"Exactly one effective Event Authority"**: FALSIFIED by Lane F2 (CanonicalEventEnvelope is a second effective authority: own IDs, sequence, table, bypasses governance) vs OPERATING_SPEC "RESOLVED" verdict which holds only narrowed to "ping_events has exactly one writer." Operator question 10 (which authority owns emission/identity going forward) is still open - WBD unanswered-question queue #10.

3. **Replay honesty**
3. **Replay honesty**: `/mc/replay/stats` shows 26 verified replays live (lane-m probe) vs OPERATING_SPEC REPLAY PARTIAL: live replay never reads the canonical journal and re-mints identities (`evt-ping-<i>-<hash>`); PROJECTION_CREATED→REPLAY_VERIFY attests projections whose Qdrant write may have failed silently (memory 09-19#L988).

4. **ORCA certification scope**
4. **ORCA certification scope**: ORCA-ROLE.md certifies "A0 (facade)" overall vs A5-CERTIFICATION-RECORD.md closing "A5 PROVEN" - different implementations (old engine vs new control loop), role doc never scopes the claim (agent-f C1).

5. **KnowledgePromoter ADD-only**
5. **KnowledgePromoter ADD-only** (code header) vs `ON CONFLICT (node_id) DO UPDATE SET data=...` in knowledge_graph.js (recon AI-15) - policy and code disagree.

6. **EffectAuthority "Restart = same effect_id"**
6. **EffectAuthority "Restart = same effect_id"** (commit f250c19ca message) vs restart test proving in-memory state is lost on restart (agent-f C3) - the idempotency promise is void without durable storage.

7. **Mission completion counts across reports**
7. **Mission completion counts across reports**: 191 completed (memory 09-16 live PG read; phase24's /mc/dashboard snapshot) vs 417 completed / 2 failed matching 419 ping_missions rows (agent-g 09-18/19) - different epochs/scopes, not the same claim; any cross-report comparison must name its scope (MC-03's general problem).

8. **Mission Control "fixed"**
8. **Mission Control "fixed"**: Phase 24 fixed the worktree UI (09-19) vs the deploy branch carrying byte-identical phantoms plus a divergent superset (lane-m §4) - "Mission Control is truthful" is true of a branch, not of what would deploy.

9. **Health vs reality**
9. **Health vs reality**: /health healthy on both Oracle gateways (09-22) vs latent dual-writer (two containers, one DB) and an undocumented live image - "healthy" hides both.

10. **ContextPack as model boundary**
10. **ContextPack as model boundary** (claimed) vs direct Qdrant→Ollama RAG path wired in the live gateway bootstrap (recon §Q, 5 falsification points) - the boundary is wired around, live.

## Notes for the parent

- Item statuses use the requested enum; priorities follow the 1/2/3 core-loop rubric. REJECTED/SUPERSEDED/DEFERRED were not assigned to extracted items because the sources already record those decisions in the AF rejection matrix, AH deletion matrix, and falsified-premises sections (AcquisitionManager, ConstitutionalEventStore PHANTOM/FALSIFIED; IEventAuthority DORMANT; EventRepository LEGACY_UNREACHABLE; ConstitutionalEventSourcing dead switch; Temporal-as-cluster, NATS/Kafka backbone, Neo4j-primary, second witness authority all REJECTED) - re-extracting them as items would duplicate closed decisions.
- The single most decision-blocked cluster: MC-10 (accept 3c5d280dd? stop :8081?), WBD question 10 (which event authority owns emission/identity), LL-12/LL-05 (build the verification seam?), HO-12 (purge seed rows?) - all four need Nolan's explicit word; agents must not resolve them unilaterally.
- No files were created, edited, or deleted; no git commands run; no live systems touched.