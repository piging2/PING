# SPRINT 02: MISSION CONTROL WIRING (100 hours)
## Revision 2, filed 2026-09-30 ~18:50 MDT, under CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30 (binding)
## Planner: read-only plan. No code, no commits, no installs, no execution.

This revision restructures the prior plan (Revision 1, the 8-deliverable MC projection plan) under the master directive: six VERTICALS OVER ONE PING SEMANTIC/CONTROL PLANE, plus the seventh integrated proof. The decomposition from Revision 1 survives; the change is structural. The P0 of this sprint is no longer "project the journal"; it is the locked architecture call (a): FINDING-SET PERSISTENCE IS THE IMMEDIATE SHARED DEPENDENCY, ABOVE UI WORK. The concrete break is proven: successful worker findings are dropped by the scheduler result persistence seam (`mission_scheduler.js:388-392`). Until that seam is lossless, ORCA chaining, JEV judgment, Mission Control inspection, and evidence-driven follow-up are partly fictional. This sprint implements the already-specified smallest wiring delta D1-D6 (typed research contract, deterministic stateless route compiler, losslessness gate, finding-set persistence by digest/reference, extended plan validator, typed executor briefs) from `worker-contract-readability-2026-09-30.md`, fixes the trace tenant projection (payload carrying tenant while trace displays UNKNOWN is unacceptable), and then wires the full IDENTITY to OUTCOME chain into Mission Control as a projection over governed state. Revision 1's projection deliverables (journal+Postgres dual projection, stuck detector, epistemic chain, headers, divergence policy, /events traversal consumer, approval/intent projection, WITNESS/REPLAY consumer) fold into P1 as the full chain projection. Nothing in this sprint replaces the canonical dispatcher. Nothing invents a second routing authority.

---

## 1. PRODUCT ARROW

Mission Control is THE IDENTITY-OWNED OPERATING SURFACE of one tenant's PING life: it shows, from governed semantic state, exactly what the tenant's identity set in motion and what came back. Domain question: CAN A HUMAN SEE AND CONTROL WHAT THEIR PING IDENTITY IS DOING? The arrow: a real user creates a mission, watches it route and execute, reads why it was routed, inspects its persisted findings, understands the judgment placed on those findings, approves an effect when one is required, and sees verification and outcome, all without reading logs or database tables. Mission Control is the surface, never the authority: it projects; it does not own mission truth, routing truth, judgment truth, or approval truth. Readability is separated from actuation: the ability to read a chain leg never implies permission to act on it.

---

## 2. CURRENT VERIFIED STATE (grounded; pig-local evidence over remote claims)

Truth states in this section use the standing vocabulary: PROVEN / SUPPORTED / REPORTED / INFERRED / UNKNOWN / CONFLICTING.

- **PROVEN (pig-local, read-only read 2026-09-30, worker-contract lane):** `mission_scheduler.js:388-392` persists only `{worker, completed_at}` into `mission.result` on success. The worker's `findingSet` (findings, contradictions, unresolvedQuestions, knowledgeCandidates, nextMissionCandidates, sourceAcquisition) is DROPPED at the completion boundary. The bounded-chaining seam is broken by exactly these lines.
- **PROVEN (same read):** the research worker returns a typed `findingSet` (`research_worker.js:511-685`); acceptance mission `72dc09886ad305ea` completed with 2 real GitHub HTTPS acquisitions (SSRF-defended, sha256 digests, `observed_at`), 2 `OBSERVATION_CREATED` + 2 `CLAIM_CREATED` via canonical ingress, both claims UNCLEAR with `contradiction_found:true`, and a 23-event downstream correlation cascade. Real findings exist and are lost.
- **PROVEN (P0 executor report 2026-09-30):** trace projection renders `tenant_id: "UNKNOWN"` while the payload and the mission row carry the real tenant (example: `ping-ops`). The row's `tenant_id` is immutable (Lane B); the loss is projection-side, out of the worker lane's write scope. This is the tenant projection fix this sprint owns.
- **PROVEN (worker-contract inventory, read-only):** `WorkerRuntime.dispatch()` (`worker_runtime.js:93-130`) matches `event.event_type` against `worker.eventTypes`; `MISSION_WORKER_MAP` (`mission_scheduler.js:56-88`) is labeling/assignment metadata only per its own `[DOC-CONTRACT]` comment; worker `capabilities` are name tokens (`canonical_workers.js:905-915`, e.g. `['research']`); no `compileRoute` selector exists between mission and event_type. `MissionRuntime.create` requires `options.tenant_id` fail-closed; mission_id is deterministic `hash(tenant:missionType:event_id|canonical_payload)` (`mission_runtime.js:110-136`).
- **PROVEN:** `GET /missions/:id/trace` (`mission_runtime.getTrace`) is the canonical trace contract (mission + correlation_id + all events sharing it). No new trace store is needed by anyone.
- **SUPPORTED (Revision 1 recon, served state 2026-09-30):** Mission Control is served at `:3100` (branch `fyd/builder-harvest-trackc-2026-09-28`, blessed restart `/home/nolan/start-3100.sh`); the Missions feed projects the dispatch journal at `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` via `projectMissions()` in `src/app/api/mc/_lib/mc-dispatch.ts`; tenant-scoped reads already implemented (`x-mc-tenant`); approvals flow through `mc-approval/approval_request.py` + `approval_cli.py` with digest-bound decisions and the approver derived from the authenticated caller key.
- **REPORTED (Revision 1, not re-verified this turn):** the journal currently projects 16 dispatch missions (15 SUCCEEDED, 1 UNKNOWN); the auth-gated `/events` traversal API (children/descendants/ancestors/correlation-group) exists but its location was not found by light grep of `src/app/api` on 2026-09-30; `WITNESS_CREATED` / `REPLAY_COMPLETED` vocabulary is emitted with zero consumers.
- **INFERRED (direct from the PROVEN drop):** unresolved claims and next-mission candidates can today reach ORCA only via journal archaeology, not via mission state; any "ORCA chains on findings" behavior is currently fictional.
- **UNKNOWN:** the live divergence rate between journal terminal states and `ping_missions` terminal states; the true current stuck-mission population under a stabilized stuck definition.
- **CONFLICTING:** none asserted.

---

## 3. FIRST BROKEN EDGE

The scheduler result persistence seam is the first broken edge, and it overrides the schedule. Successful worker findings are dropped at completion, so the whole downstream chain this plan is supposed to project (execution to findings to judgment to proposal to verification to outcome) has an empty middle in production. Concretely: mission `72dc09886ad305ea` produced a real, typed, contradiction-carrying finding set and the durable record of it is `{worker, completed_at}`. Everything downstream of RESULT in the lifecycle currently projects either nothing or journal archaeology. Therefore the 20-60 block starts with finding-set persistence (D4), not with Mission Control UI chain work. The second edge, in the same block, is the tenant projection loss (F2): a trace that shows UNKNOWN for a tenant the system knows is a lie at the identity surface, and it poisons every tenant-scoped view downstream. Candidates 3 and 4 from Revision 1 survive unchanged in priority order behind them: the Postgres read path from `:3100` will be the first infrastructure break (degraded mode specified up front: UNKNOWN with the missing boundary named, never a credential baked into MC code), and the stuck detector will false-positive on the first long-lease mission if the horizon is a placeholder (mitigation: horizon as a named contract parameter, inputs rendered beside every STUCK_SUSPECT).

---

## 4. SEMANTIC OWNER (existing authorities this sprint extends; nothing invented)

This sprint extends and consumes existing semantic owners; it creates none.

- **Route contract, brief contract, result/finding contract:** the existing mission/worker seam (`mission_runtime.js`, `mission_scheduler.js`, `worker_runtime.js`, `canonical_workers.js`, `research_worker.js`). This sprint is the mutation owner of these three contracts (see section 5) and implements the D1-D6 delta on the existing code paths: `_validatePlan` extended not replaced, `WorkerRuntime.dispatch()` untouched, scheduler `complete()` extended to persist the bounded finding set, `compileRoute` added as a pure recorded selector.
- **Mission contract:** MissionRuntime (mission truth, lifecycle vocabulary, leases, retry-to-dead-letter, emission-gated completion). Read-only; this sprint never edits mission runtime code.
- **Event transition contract:** UnifiedEventRuntime, the sole production writer to `ping_events`. Read-only; MC never writes there.
- **Tenant contract:** the TenantOS lane (tenant identity, immutable `tenant_id`, machine-observable decision authority). Read-only for this sprint; the tenant fix is projection-side truthfulness, not tenant semantics.
- **Judgment contract:** the JEV lane (verdict taxonomy, dimensions, evidence refs). Consumed read-only; MC renders JEV verdicts as REPORTED while JEV is shadow, never as PROVEN.
- **Capability contract:** the capability registry lane (operator caller registry, digest-bound proposals, 403 gate). Read-only; D7 renders capability legs from existing `MC_AGENT_AUTHORIZED` payloads as REPORTED until the registry is machine-readable.
- **Verification/outcome contract:** the shared verification semantics (emission-gated completion, replay/witness vocabulary). Consumed read-only; D8-style replay consumer lives in MC as a reader.
- **The MC projection surface:** this sprint owns the projection code (`src/app/api/mc/**`, `src/app/mission-control/**`) but does NOT own any underlying contract it projects.

---

## 5. MUTATION OWNER

Shared contract names per the master directive: tenant contract, mission contract, route contract, brief contract, result/finding contract, judgment contract, capability contract, SiteSpec contract, event transition contract, verification/outcome contract.

- **THIS SPRINT OWNS (proposes and merges; single writer each):** route contract, brief contract, result/finding contract. These three are the D1-D6 delta: typed research contract v1 schema, deterministic stateless `compileRoute`, losslessness gate `validateContract`, finding-set persistence by digest/reference, extended plan validator, typed executor briefs (researcher v1 with L0-L4 progressive disclosure).
- **THIS SPRINT READS AND PROPOSES (one writer merges elsewhere):** tenant contract (TenantOS lane), mission contract (MissionRuntime owner), judgment contract (JEV lane), capability contract (capability registry lane), SiteSpec contract (FYD lane), event transition contract (UnifiedEventRuntime owner), verification/outcome contract (shared; tests lane hostile-tests it).
- **MC projection surface:** this sprint owns the projection code and the trace tenant truthfulness rule; it consumes but never mutates the underlying contracts. A projection that needs a contract change files a proposal to that contract's owner; it never edits the contract through the projection.

Writer map (max 3 writers; read-only helpers are not writers):

- **Writer 1: seam writer.** Mutation surfaces: `mission_scheduler.js` (finding-set persistence in `complete()`, `contract_rejected` path), `research_worker.js` (validator extension to contract v1), new pure `compileRoute` + `validateContract` module, typed contract/brief JSON schemas, `canonical_workers.js` registration-table capability tokens (real tokens like `web.fetch`, `text.extract`, `claim.evaluate` replacing name tokens). Owns the route, brief, and result/finding contracts. Does NOT touch `WorkerRuntime.dispatch()`.
- **Writer 2: MC projection writer.** Mutation surfaces: `src/app/api/mc/_lib/mc-dispatch.ts`, `src/app/api/mc/missions/**`, `src/app/api/mc/approvals/route.ts` (projection-only additions), `src/app/mission-control/**` (chain legs, epistemic headers, contradiction sections, UX consequence tiers). Owns the trace tenant fix and the full chain projection. Feed wiring and minimal functional additions only; no new tab, no shell redesign.
- **Writer 3: verification/test writer.** Mutation surfaces: the MC-side consumer of the `/events` traversal API (location re-verified first; if unreachable, recon report plus documented UNKNOWN), the WITNESS/REPLAY consumer (first consumer of `WITNESS_CREATED` / `REPLAY_COMPLETED`), and the contract/hostile/replay test suite for D1-D6 and the projection. Owns the proof that the seam is lossless and the projection is replay-safe.
- Commit discipline: auditable commits on the serving branch per the website-build goal's contract; FYD lane owns commits on the branch; MC files stay namespaced; rebuild/restart only via `/home/nolan/start-3100.sh`. No push without Nolan's explicit word.

---

## 6. INPUT CONTRACT

- A mission row in `ping_missions` with immutable `tenant_id` (fail-closed at create), `created_by` principal, deterministic `mission_id`, and a `payload.research_contract` v1 object for INTELLIGENCE_RESEARCH missions (schema frozen in the 10-20 block).
- Registered workers declaring REAL capability tokens via `WorkerRuntime.register(name, worker, {eventTypes, capabilities})`; `WorkerRuntime.getStats()` as the readable capability surface.
- The canonical scheduler path: `_poll` to `getPending()` to `complete(mission_id, result)`; `WorkerRuntime.dispatch()` as the single dispatch decider, unchanged.
- Canonical ingress for worker-emitted events (`OBSERVATION_CREATED`, `CLAIM_CREATED`); UnifiedEventRuntime as sole writer to `ping_events`.
- The MC journal (`/home/nolan/workspace/fyd-journal-gateway/events.jsonl`) as the dispatch/operator record, distinct from mission truth.
- The existing approval primitive (`approval_request.py` / `approval_cli.py`) for decisions; digest-bound, approver derived from the authenticated caller key.
- `compileRoute(mission)` is a pure deterministic function of (`required_capabilities` from the contract, worker capabilities from `getStats()`, mission constraints); its `route_decision {event_type, eligible_workers[], selected, reason}` is recorded as assignment metadata beside `assigned_to`. It is NOT a dispatch authority.

---

## 7. OUTPUT CONTRACT (good-form statements)

- Worker finding set survives scheduler persistence and can be consumed losslessly by JEV and Mission Control.
- Trace projection shows the mission's true tenant; no mission renders tenant UNKNOWN when the row carries one.
- `compileRoute` selects only from workers whose real capabilities cover the contract's `required_capabilities`, and records the decision with its reason; `WorkerRuntime.dispatch()` remains the single canonical decider, unchanged.
- `validateContract` guarantees REQUIRED SEMANTICS LOST = 0 across tenant, principal, capability, semantic owner, mutation scope, authorization state, effect boundary, evidence requirement, success condition, stop condition, correlation_id, causation_id; any safety-critical field unrepresentable means DO NOT ROUTE (mission stays `created` with `contract_rejected`, no silent defaulting).
- A mission's full chain (mission, plan, route decision with reason, selected worker, execution, findings, judgment, proposed effect, approval requirement, verification, outcome, evidence/history) renders in Mission Control from governed state; a real user completes the loop without reading logs or database tables.
- Stale or superseded briefs fail closed: a brief compiled from a non-current contract version cannot route.
- While JEV runs in shadow, Mission Control renders its verdicts as REPORTED judgments with evidence links, never as production truth.

---

## 8. DEPENDENCIES

- **TenantOS lane (hard, for P1 chain projection):** immutable tenant semantics already PROVEN on the row; this sprint needs the tenant contract's machine-observable decision authority (who can approve what, who can delegate, what defaults to the tenant owner) before the MC approval-requirement leg can render anything stronger than REPORTED. Trace tenant truthfulness does not wait on this: projecting the row's tenant is this sprint's own projection-side fix.
- **ORCA lane (sequenced):** ORCA P0 starts AFTER this sprint's seam preserves finding sets (master directive). ORCA must read `mission.result.finding_set.nextMissionCandidates` (mission state), not journal archaeology; this sprint confirms that read path and hands it over.
- **JEV lane (sequenced):** JEV shadow needs persisted finding sets as judgment input; this sprint delivers them. JEV keeps baseline authority; MC renders shadow verdicts as REPORTED.
- **FYD lane (integration):** FYD missions must carry the same contract shape when they route intelligence work; the integrated proof (section 20, seventh deliverable) needs the FYD SiteSpec proposal leg.
- **Tests lane (continuous):** hostile tests attack this sprint's seams (section 14); this sprint's fixtures feed the integrated harness.
- **Hard gate for traversal consumer only:** `/events` traversal API location + auth-gated reachability from the `:3100` service boundary. First 4 hours re-verify; if unreachable, the consumer reduces to its recon report plus documented UNKNOWN, and no substitute traversal is built.
- **Hard constraint:** Postgres read access from `:3100` goes through the approved runtime read surface only; no credential in MC code, files, or chat. Degraded mode (UNKNOWN with the missing boundary named) is an acceptable partial outcome, never a reason to invent a store.
- **Must not collide with (standing law, max 3-4 writers):** the FYD lane owns commits on the serving branch; the testing-ladder coordinator owns test infrastructure (MC tests are namespaced, no framework changes); the worker-contract seam writer from the P0 program is succeeded by this sprint's Writer 1 (no parallel writes to `mission_scheduler.js`, `worker_runtime.js`, `canonical_workers.js`, `research_worker.js`).

---

## 9. HARVEST CANDIDATES (from `harvest-map-2026-09-30.md`, read 2026-09-30)

UNWIRED GOLD this sprint consumes, never rebuilds:

- **Auth-gated `/events` traversal API (lane 10):** the lineage query surface (children/descendants/ancestors/correlation-group) wired into the MC mission detail view as a read-only consumer. Location re-verified first.
- **`WITNESS_CREATED` / `REPLAY_COMPLETED` vocabulary (lane 10):** emitted with zero consumers; this sprint builds the first consumer (on-demand replay verification of one mission's projection: fresh projection hash vs witnessed hash, rendered VERIFIED or FAILED with hash, event range, code version).
- **TracePort/MetricsPort abstract seams (lane 10):** kept as the wrap point if observability (section 16) needs a backend; no backend built in this sprint.
- **Durable-interrupt pattern (lane 3, pattern gold):** `awaiting_approval` lease-exempt checkpointed missions; the shape the stuck detector must respect (a mission awaiting owner decision is lease-exempt, never STUCK_SUSPECT). Adopted as the detector's exclusion rule, not as new mission semantics.
- **Typed receipts (lane 3, pattern gold):** each mission_type declares its result schema; `complete()` validates. This is the direct harvest for the finding-set bounded shape and the extended plan validator; tens of lines, no new authority.
- **Typed approval requests (lane 3, pattern gold):** approval request as a canonical event with request_id; response referencing it with the authenticated approver principal. The shape the MC approval/intent projection renders.
- **`schema_version` in prod metadata (lane 10):** the hook for contract envelope versioning and upcasting (research contract v1 to v2 migration path); present but unconventioned, conventioned in the 10-20 freeze.
- **Macaroon attenuation + RFC 8693 delegation chains (lane 4, pattern gold):** ADAPT references for the capability legs the projection will render once the registry lane delivers; no capability machinery built here.
- **CloudEvents envelope discipline (lane 10):** additive type versioning for the finding-set and route-decision metadata; no SDK, no column renames.
- **OTel span links (lane 10):** optional `links` array in event metadata for non-parent associations (retried-then-superseded chains) that a single causation_id cannot express; used only if the chain projection needs it.
- **Duplication threads to watch, not to execute:** T2 (event writers/spine), T6 (Pig-plane append-only gap); this sprint opens no new writer and touches no event spine.

---

## 10. OWN / RENT / WRAP / ISOLATE / REJECT DECISIONS

- **OWN (only what compounds):** routing policy (the `compileRoute` selector and losslessness gate semantics); brief semantics (typed research contract v1, researcher brief v1, L0-L4 progressive disclosure); finding-set persistence semantics (the bounded shape, digest/reference discipline); the MC chain projection (how the identity-to-outcome chain renders from governed state); trace tenant truthfulness (projection must carry the row's tenant); the `contract_rejected` fail-closed semantics. All owned items live on existing code paths; no new store, no new authority.
- **RENT:** UI primitives (the existing Next.js MC surface; no new framework), container runtime (existing `:3100` serve path), search engine (no new index for the chain view; projections query existing surfaces).
- **WRAP:** the `/events` traversal API (consumer, not owner); WITNESS/REPLAY vocabulary (consumer, not emitter owner); MCP/WebMCP as future projection surfaces of the same semantic state (not in this sprint's build scope).
- **ISOLATE:** any experimental route-selection policy beyond the deterministic selector (shadow-measured only, never production routing); novel security primitives near the approval leg (flagged for TenantOS, not built here).
- **REJECT:** a second routing authority of any kind (compileRoute is a recorded selector, dispatch() stays canonical); a BriefStore or PromptAuthority (briefs are disposable deterministic projections of the contract; the mission row is the authority); replacing `MISSION_WORKER_MAP`'s labeling role with routing authority; the tandem `build-context-pack.py` as a parallel context compiler (it becomes a renderer of the typed brief, an adapter, never a second compiler); name-token capability theater (replaced by the real-token registration table, a table change not a new system); any credential embedded in MC code.

---

## 11. P0 / P1 / P2

**P0 (finding-set seam + trace tenant projection; above all UI work; first broken edge overrides the schedule):**

- P0.1 Finding-set persistence: `complete(mission_id, {worker, completed_at, finding_set: <bounded>})` where `<bounded>` = questions, findings, contradictions, unresolvedQuestions, knowledgeCandidates, nextMissionCandidates, sourceAcquisition summaries (digests + URLs + `observed_at` only; NO full text). Closes the `mission_scheduler.js:388-392` drop. Typed-receipt discipline: `complete()` validates the bounded shape before accepting.
- P0.2 Trace tenant projection fix: the trace/MC projection must carry the mission row's immutable `tenant_id`; rendering UNKNOWN for a known tenant is a defect. Projection-side fix, no tenant semantics changed.
- P0.3 Typed research contract v1: `payload.research_contract` JSON schema frozen (objective, questions, claims_to_verify with epistemic headers, evidence_requirements, output_schema, required_capabilities, constraints, known_facts with `plane`, contradictions_unresolved, sovereignty map, may/may_not, anti_goals, success/evidence/stop conditions, mutation_scope, effect_boundary, authorization_state, correlation/causation, tenant_id, principal).
- P0.4 Deterministic stateless `compileRoute(mission)`: pure function emitting `route_decision {event_type, eligible_workers[], selected, reason}`, recorded as assignment metadata beside `assigned_to`. `dispatch()` untouched.
- P0.5 Losslessness gate `validateContract(mission, brief)`: REQUIRED SEMANTICS LOST = 0 over the twelve fields (section 7); unrepresentable safety-critical field = DO NOT ROUTE with `contract_rejected`.
- P0.6 Extended plan validator + typed executor briefs: `_validatePlan` extended to contract v1 (fail-closed as proven on the stale mission); researcher brief v1 as deterministic projection answering the ten questions in fixed order, with L0-L4 progressive disclosure.

**P1 (full identity-to-outcome chain projection; Revision 1's D1-D8 folded here):**

- P1.1 Real PING mission state in the Missions feed: journal + `ping_missions`/`ping_events` dual projection with explicit `source:` provenance per item and CONFLICTING rendering (both sides quoted, event ids, timestamps) on terminal-state divergence; no silent reconciliation.
- P1.2 Stuck-work detector as deterministic pure projection: non-terminal status + no progress event past the contract's stuck horizon + no consumer-claim event = STUCK_SUSPECT with count, common state, first missing edge, age, affected objects, responsible subsystem, evidence links; `awaiting_approval` lease-exempt; NEVER retries, NEVER mutates.
- P1.3 Epistemic chain per mission: observation to evidence to claim to decision to effect, each leg typed (OBSERVED, DERIVED, INFERRED, PROPOSED, APPROVED, EXECUTED, VERIFIED, FAILED, UNKNOWN) with event id, timestamp, source; missing legs render UNKNOWN with the leg named; JEV shadow verdicts render as REPORTED with evidence links.
- P1.4 Epistemic header on every projected item: {status, claim/state, source, observed_at, freshness, support_set} from the PROVEN/SUPPORTED/REPORTED/INFERRED/UNKNOWN/CONFLICTING vocabulary; contradiction sections first-class.
- P1.5 Divergence policy contract tests pinned on fixtures reproducing the live journal-vs-Postgres shape.
- P1.6 `/events` traversal consumer in the mission detail view (children, ancestors to initiating intent, correlation-group fan-out), after reachability re-verification.
- P1.7 Approval/intent projection: full IDENTITY to AUTHENTICATION to CAPABILITY to PROPOSAL to APPROVAL to EFFECT chain per approval, with approver-principal derivation, proposal digest match status, decision events; zero new approval logic.
- P1.8 WITNESS/REPLAY consumer: on-demand replay verification of one mission's projection, hash-pinned.

**P2 (UX consequence tiers + epistemic chain presentation):**

- P2.1 Human consequence tiers wired to the approval requirement leg: LOW consequence = fast action / undo; MEDIUM = preview / confirm; HIGH = explicit approval. Safe operation is never made bureaucratic; the tier comes from the proposal's authorization_state and effect boundary, never invented by the UI.
- P2.2 Epistemic chain presentation tuned for the operator: evidence adjacent to claims, contradiction sections readable at a glance, missing legs named, no log or DB reading required to answer "why did this happen."
- P2.3 Readability-routing projections beyond HTML: from the same governed chain state, agent-targeted Markdown/JSON projections of mission state (projections, not new truth stores), per the master directive's readability posture.

---

## 12. EXPLICIT NON-GOALS

- No mock Mission Control. Every projected value traces to a journal line, a Postgres row, or an event; unreachable sources render UNKNOWN with the boundary named.
- No tab sprawl, no shell redesign, no Mission Control prettyfication. Functional, not pretty. Feed wiring and minimal functional additions to the existing Missions surface only (binding correction 2026-09-30).
- No new authority, store, scheduler, event store, workflow engine, tenant model, routing authority, BriefStore, PromptAuthority, or AgentBrain. `compileRoute` is a pure recorded selector; `dispatch()` is canonical and untouched.
- No changes to the journal write path, the gateway, or PING runtime internals beyond the specified seam writer's surfaces. MC stays read-only; the one existing write (approval decision through the canonical transition) is unchanged.
- No mutation of missions, no approval logic, no retry-from-MC. STUCK_SUSPECT is a question for the owner, not an action.
- No silent reconciliation of journal/Postgres divergence, no coerced UNKNOWN, no invented certainty.
- No push without Nolan's explicit authorization.

---

## 13. ACCEPTANCE TESTS (integration-truth terms)

The ladder every deliverable climbs: OWNER REQUEST to REACHED (served at `:3100`, operator-openable, not a recap) to DURABLE (reproducible after restart; no in-memory-only state) to EXECUTED (real rows, real journal lines, real finding sets projected, not fixtures in production) to VERIFIED (contract tests green; replay hash matches) to EXPLAINABLE (every truth state shows its chain and header; a senior engineer traces any mission value to its event) to RESTART-PROVEN (kill `:3100`, relaunch via the blessed path, same projection bytes).

- **A1 (P0.1):** a mission whose worker returns a full typed findingSet completes; `mission.result.finding_set` contains the bounded shape with digests (no full text); JEV's shadow consumer and the MC chain view read the same persisted finding set. Falsifier: complete a mission, read the row; if `finding_set` is absent or contains full source text, the claim fails.
- **A2 (P0.2):** a mission whose row carries `tenant_id = ping-ops` renders `ping-ops` in every trace and MC view; zero missions render tenant UNKNOWN when the row carries one. Falsifier: the acceptance mission's trace.
- **A3 (P0.4/P0.5):** a mission with a valid v1 contract routes with a recorded `route_decision` naming the selected worker and its reason; a mission missing a safety-critical field stays `created` with `contract_rejected` and never dispatches. Falsifier: a contract missing `evidence_requirements` that dispatches anyway.
- **A4 (P0.6):** the stale-mission behavior replays: a contract-less mission fails closed with the refusal reason recorded, exactly as proven on `3b0f430a06a41357`; a brief compiled from a superseded contract version cannot route.
- **A5 (P1.1/P1.5):** a fixture mission with journal SUCCEEDED and Postgres CREATED renders CONFLICTING with both sides quoted (event ids, timestamps); a schema test asserts every projected object carries its epistemic header.
- **A6 (P1.2):** the 25 historical CLAIM_GENERATE stuck missions reproduce as STUCK_SUSPECT from their timelines; a mid-lease healthy mission does not; an `awaiting_approval` mission never flags.
- **A7 (P1.3/P1.7):** every chain leg and approval leg renders principal, digest match status, and event id; a leg missing any of the three fails the contract suite.
- **A8 (P1.8):** re-project one mission from its event range; the fresh hash equals the witnessed hash (VERIFIED); tamper the range and it reads FAILED.
- **A9 (P2.1):** a LOW-consequence proposal completes in one operator action with undo; a HIGH-consequence proposal cannot execute without an explicit recorded approval; the tier is traceable to the proposal's authorization_state.

---

## 14. HOSTILE TESTS

- **Lost finding sets:** worker returns `{status:'ok'}` with no `findingSet`; scheduler must mark the result INCOMPLETE (never a clean `completed` with an empty result masquerading as success). Worker returns a findingSet exceeding the bounded shape (full text smuggled in); `complete()` rejects or truncates to digests, never persists unbounded blobs.
- **Stale briefs:** brief compiled from contract v0 presented against a v1 mission; must fail closed with `contract_rejected`, mission stays `created`. Contract schema drifted without a version bump; the `schema_version` hook catches it.
- **Trace/projection drift:** projection served at `:3100` hashed and compared against a fresh projection from the same event range after restart; any byte difference without an event-range change is a defect. Witnessed hash mismatch renders FAILED, never silently re-witnessed.
- **Tenant projection mismatch:** row tenant vs projected tenant compared across the full mission table; any mismatch is a blocking defect; cross-tenant traversal attempts return zero foreign events.
- **Capability theater regression:** a worker registering name-token capabilities (`['research']`) against a contract requiring `web.fetch`; `compileRoute` must find it ineligible and record the reason, never match on the name.
- **Divergence coercion:** divergent fixtures through the dual projection; any render that picks one side silently fails the suite.
- **Stuck false positives:** long-lease, renewing, and `awaiting_approval` fixtures through the detector; any flag on them fails the suite.
- **Injection via findings:** a finding set carrying prompt-injection content renders as data with its epistemic header, never as instruction; the projection layer treats finding text as untrusted.

---

## 15. REPLAY/RECOVERY TEST

- **Projection replay:** re-project any mission's chain from its pinned event range; byte-identical output or a named, explained difference. The WITNESS/REPLAY consumer (P1.8) is the standing proof.
- **Restart recovery:** kill `:3100`, relaunch via `/home/nolan/start-3100.sh`, confirm the demo-owner flag is live in process env, probe the approve path, re-hash the Missions projection: identical bytes.
- **Scheduler crash mid-completion:** kill the scheduler between worker return and `complete()`; the mission must not read `completed` without its finding set persisted and without the `MISSION_COMPLETED` event accepted by the event authority (emission-gated completion; a partial write is UNKNOWN, never FAILED, never silently retried).
- **Contract rejection recovery:** a `contract_rejected` mission is re-presentable with a corrected v1 contract and routes cleanly; the rejection reason stays in history as evidence.

---

## 16. OBSERVABILITY

Projected from existing surfaces, no new backend in this sprint:

- `route_decision` records (selected, eligible, reason) visible per mission in the detail view; a mission that never routed shows its `contract_rejected` reason.
- Losslessness gate rejections logged with the exact unrepresentable field; a rejection is an event, not a log line that scrolls away.
- STUCK_SUSPECT list with rendered inputs (last progress event, horizon, lease state) so a false positive is diagnosable.
- Finding-set persistence rate: missions completed with vs without a bounded finding set; a completed mission without one is INCOMPLETE, surfaced, never silent.
- Epistemic header coverage: any projected object missing its header is a build-blocking metric, not a cosmetic gap.
- Existing seams kept: TracePort/MetricsPort as the wrap point if a backend is ever needed; spans remain a side channel, never truth.

---

## 17. DEMO

A real user, in the served Mission Control at `:3100`, without reading logs or database tables: creates an INTELLIGENCE_RESEARCH mission with a typed v1 contract; watches the route decision appear with the selected worker and its reason; watches execution complete; opens the persisted finding set (findings, contradictions with both sides preserved, unresolved questions, next-mission candidates); reads the JEV shadow verdict rendered as REPORTED with its evidence links; where a proposed effect requires approval, sees the approval requirement with its consequence tier, previews (MEDIUM) or explicitly approves (HIGH); then sees verification and outcome with the epistemic chain behind every state. The demo runs against the real scheduler, the real worker, and the real projection, and the whole chain is re-projectable from its event range afterward.

---

## 18. ROLLBACK

- Finding-set persistence is additive to `mission.result` (new `finding_set` key beside `worker`/`completed_at`); rollback removes the writer call, leaving old rows readable. The bounded shape is versioned (`contract_version`); v1 rows stay valid under the v2 reader via the `schema_version` upcasting hook.
- `compileRoute` writes only assignment metadata; rollback deletes the metadata writer. `dispatch()` was never touched, so routing behavior reverts to the prior string-match behavior with zero code risk.
- `_validatePlan` extension is fail-closed by construction; rollback restores the prior validator, which still refuses contract-less missions (the proven stale-mission behavior).
- MC projection changes are read-only; rollback is a redeploy of the prior `:3100` build via the blessed path. No state to unwind.
- No migration is destructive; no event is rewritten; the append-only log is never touched by this sprint.

---

## 19. DELETE/FREEZE LIST

- **Freeze:** any attempt to make `compileRoute` authoritative over `dispatch()`; any second routing authority proposal; any BriefStore/PromptAuthority/AgentBrain proposal; any parallel context compiler (tandem `build-context-pack.py` is frozen as a renderer of the typed brief, an adapter, never a compiler).
- **Delete after deadness proven:** name-token capability registrations in `canonical_workers.js` once real tokens (`web.fetch`, `text.extract`, `claim.evaluate`, ...) land and `compileRoute` routes on them; the MC journal as the sole mission-truth source once the dual projection is live (the journal remains the dispatch/operator record; it stops being mistaken for mission truth).
- **Retire:** prose-dumped context packs into research sweeps (replaced by L0-L4 progressive disclosure from the typed brief); any MC code path that coerces UNKNOWN into a value or silently reconciles divergence.
- Standing: no file is deleted on age or appearance; discover, understand, classify, consolidate, verify, archive, then delete only after deadness is proven.

---

## 20. DEPENDENCIES ON OTHER FIVE SPRINTS

- **01 TenantOS (WHAT DOES IT MEAN FOR ONE TENANT TO OWN AND OPERATE PING SAFELY?):** NEEDS: the machine-observable decision authority (who can approve what, who can delegate/revoke, what defaults to the tenant owner) before P1.7/P2.1 can render approval requirement stronger than REPORTED; the capability registry's machine-readable grants before capability legs graduate from REPORTED to PROVEN. GIVES: truthful tenant projection on every trace (P0.2) proving the boundary at the identity surface; the `contract_rejected` and STUCK_SUSPECT projections as evidence for TenantOS isolation testing.
- **03 ORCA (CAN PING TURN A MISSION INTO USEFUL BOUNDED INTELLIGENCE WITHOUT FABRICATING WORK?):** NEEDS: ORCA to read `mission.result.finding_set.nextMissionCandidates` (mission state, not journal archaeology) when its P0 starts after this sprint's seam lands. GIVES: the lossless finding-set seam and typed contract/brief machinery ORCA executes against; confirmation that the chaining read path is mission state.
- **04 Website building / FYD (CAN FYD TURN EXISTING DIGITAL REALITY INTO A TRUSTED, EDITABLE, INTELLIGENT PRESENCE?):** NEEDS: FYD intelligence missions to carry the same contract v1 shape; the SiteSpec proposal leg for the integrated proof. GIVES: the full chain projection that makes FYD mission states (acquisition, Ask FYD, regeneration) operator-visible; the approval-requirement rendering for SiteSpec proposals.
- **05 JEV (HOW DOES PING JUDGE WHETHER A RESULT IS GOOD ENOUGH TO BECOME ACTION?):** NEEDS: persisted finding sets as judgment input (P0.1 delivers); the Ask FYD gold set overlap confirmed as shared evaluation material. GIVES: lossless, typed judgment input; MC rendering of shadow verdicts as REPORTED with evidence links; the judgment leg of the chain projection ready for the day a convergence decision grants JEV influence.
- **06 Tests (CAN WE FALSIFY THE SYSTEM AT ITS SEMANTIC OWNERS?):** NEEDS: hostile coverage of this sprint's seams per section 14 (lost finding sets, stale briefs, trace/projection drift, tenant mismatch, divergence coercion); the integrated harness around the finding-set/contract/route seams as the highest-priority shared gate. GIVES: contract fixtures (divergent fixtures, stuck positive/negative fixtures, contract_rejected fixtures), the replay harness (P1.8), and the falsifiability questionnaire answers for every P0 claim.

**Seventh deliverable contribution:** this sprint wires the middle of the integrated proof (MISSION CONTROL to MISSION to ROUTER to FINDING SET, and the return leg PROPOSAL to OWNER APPROVAL to VERIFICATION to OUTCOME to MISSION CONTROL). The concrete scenario ("Research whether my site accurately represents my current commercial services and propose improvements") runs on: typed contract creation in MC, `compileRoute` recording the ORCA worker selection with its reason, the persisted finding set, JEV's shadow verdict rendered REPORTED, the FYD SiteSpec proposal with its approval requirement and consequence tier, owner approval through the canonical transition, governed transition recorded, regeneration, verification of the rendered result, and the outcome back in Mission Control, every leg carrying its epistemic header and evidence links.

---

## Hour budget (planning budgets; FIRST BROKEN EDGE OVERRIDES THE SCHEDULE)

- **0-10 ARCHAEOLOGY + FALSIFICATION:** re-verify the scheduler seam lines (`mission_scheduler.js:388-392`), replay the acceptance mission `72dc09886ad305ea` evidence, confirm the trace tenant loss is projection-side, inventory capability tokens in `canonical_workers.js`, re-verify `/events` traversal reachability, confirm no parallel routing authority exists anywhere in repo + worktrees (standing law). Output: falsification record for each P0 claim.
- **10-20 CONTRACT + ACCEPTANCE FREEZE:** freeze research contract v1 schema, researcher brief v1 shape, bounded finding-set shape, `route_decision` shape, losslessness gate field list, `schema_version` upcasting convention, trace tenant truthfulness rule, the acceptance test list (section 13), and the writer map. No implementation starts until the freeze is signed.
- **20-60 IMPLEMENT HIGHEST-LEVERAGE WIRING:** finding-set persistence (P0.1) FIRST, then trace tenant fix (P0.2), then contract v1 + validator (P0.3/P0.6), then `compileRoute` + losslessness gate (P0.4/P0.5), then the MC chain projection legs (P1). The first broken edge overrides: if the seam resists, nothing downstream starts.
- **60-80 INTEGRATION WITH ADJACENT DOMAINS:** ORCA reads `result.finding_set`; JEV shadow consumes persisted finding sets; FYD mission states project; approval-requirement wiring against TenantOS decision authority as it lands.
- **80-95 HOSTILE TEST / REPLAY / FAILURE RECOVERY:** section 14 hostile battery, section 15 replay/recovery proofs, restart-proven `:3100`, crash-mid-completion behavior.
- **95-100 DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF:** section 17 demo against the real system, evidence packaged per claim, delete/freeze list executed (section 19), handoff notes to ORCA/JEV/Tests lanes with the exact read paths they consume.
