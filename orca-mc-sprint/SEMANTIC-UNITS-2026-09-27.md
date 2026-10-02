# SEMANTIC-UNIT SINGLE-OWNER REGISTRY (BASELINE)

Date: 2026-09-27 ~20:40 MDT. Registrar: read-only subagent (Mission G).
SHA: monorepo ~/workspace p0/approval b96e7d2. Worktree: main + Pig SSH reads.
Method: reality map re-verified claim by claim; [W]/[A] claims rebound to direct
source reads where cheap (Pig UER, identity authority, gateway capability graph,
lane-d dispatch, approvals route, approval_request.py, adapter.js). Anything not
confirmed is marked UNKNOWN, not inherited. Runtime/call-graph evidence preferred
over file existence. No em dashes used in this document per standing rule.

## IDENTITY -- DEFECT (2 reached claimants)

- REACHED IMPLEMENTATION: (A) /home/nolan/ping/runtime/kernel/authorities/identity_authority.js:294 generateSpineEventId(eventType, source, options). (B) /home/nolan/ping/runtime/kernel/identity/canonical-identity-service.ts CanonicalIdentityService (generateFromCanonicalHash convergence target named in deterministic_id_authority.js:7).
- CALLERS: (A) unified_event_runtime.js:200 (the live ping_events emit path). (B) mission-hierarchy.ts:8, replay/replay-event.ts, replay/event-envelope.ts, replay/replay-authority.ts, workers/lease.ts, governance/governance-authority.ts, execution/audit-hook.ts, execution/execution-context.ts, execution/telemetry-hook.ts (all in /home/nolan/ping/runtime/kernel).
- CANONICAL INPUT: (A) eventType, source, options (namespace, tenant_id). (B) canonical bytes + type.
- CANONICAL OUTPUT: (A) SHA-256 deterministic spine event_id. (B) deterministic IDs (context/witness/event/lease/span per kernel/identity/identity-authority.ts:8-15 interface).
- DURABLE STATE: IDs persisted in ping_events (A); kernel stores (B).
- EVENTS: none emitted by the authority itself.
- FAILURE SEMANTICS: (A) UER:290 ON CONFLICT (event_id) DO NOTHING; :298 semantic-collision check fails closed on same id with different payload semantics.
- REPLAY SOURCE: ping_events event_id ordering (A); replay identities (B).
- DUPLICATES: deterministic_id_authority.js (self-declares deprecated in favor of generateFromCanonicalHash, Pig runtime/kernel/authorities/) = STALE; replay_identity_authority.js (replay-session IDs, Pig runtime/kernel/authorities/) = legitimate specialization with boundary; runtime_identity_authority.js (runtime fingerprints, same dir) = legitimate specialization with boundary; runtime/constitutional/src/identity-authority.ts + dist (Pig) = UNKNOWN liveness; local copies in convergence-lane3, tenanos-wave vendor-pinned, lane-b, forensics = archaeology/DEAD; fyd-product-lane transition-id.ts fydActionId = FYD-social-domain specialization (explicitly mirrors UER, names IdentityAuthority) = not a competitor.
- RETIREMENT STATUS: open defect. Convergence intent already documented (deterministic_id_authority header). Next: caller inventory, pick one winner, migrate UER:200 call site.

## MISSION -- DEFECT (2 real claimants, 1 reached)

- REACHED IMPLEMENTATION: Pig /home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts + src/app/api/mc/dispatch/route.ts (Lane D; live on :3100).
- CALLERS: Pig :3100 MC UI; lane-p01 TS caller (mc-dispatch.ts adapterCall, per lane-d/adapter-call.js header).
- CANONICAL INPUT: POST /api/mc/dispatch body (prompt, agent, capability, tenant, constraints, deadline, idempotency key; IDEMPOTENCY_KEY_RE validated).
- CANONICAL OUTPUT: mission record (missionId derived from idempotency key as salt; taskId = missionId + ':task:1'; work_order_id = sha256('workorder:' + taskId)[0:16]) + MC_* lifecycle events into the journal.
- DURABLE STATE: the journal (JSONL); no separate store ("The journal is the state; GET /api/mc/missions re-projects it on every request" - missions/route.ts:3-4).
- EVENTS: MC_MISSION_CREATED (mc-dispatch.ts), MC_MISSION_INTENT, MC_MISSION_AUTHORIZED, MC_MISSION_DISPATCHED, MC_HOLD_RAISED (observed in fyd-journal-gateway/events.jsonl).
- FAILURE SEMANTICS: fail-closed validate; UNKNOWN first-class (deadline expiry and unverifiable results never render as FAILED); idempotency-key dedup via findPriorMission.
- REPLAY SOURCE: journal re-projection (missions route re-projects on every request).
- DUPLICATES: ~/workspace/mission-control/mission_intent.py (validate:327, authorize:468, dispatch:626, observe:998, submit:1044; bypass detection; 1386 LOC) = REAL code but ZERO production callers (only tests, falsify harnesses, frontdoor_adapters.py dry-run wrapper) = UNREACHED competitor, convergence item. mission-control/frontdoor_adapters.py = migration wrapper, only "spine-observe-dry-run" class migrated = not a competitor. Dead MissionRuntime/MissionScheduler copies = DEAD.
- RETIREMENT STATUS: open defect. Safe direction: declare lane-d the winner; harvest mission_intent.py bypass detection into it before any deletion (it holds semantics lane-d lacks).

## RUN -- single owner

- REACHED IMPLEMENTATION: Pig /home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts mission lifecycle (MISSION_TERMINAL_STATUSES, findPriorMission).
- CALLERS: /api/mc/dispatch/route.ts, /api/mc/missions/route.ts (re-projection).
- CANONICAL INPUT: mission id + lifecycle events.
- CANONICAL OUTPUT: current run status projection.
- DURABLE STATE: journal (JSONL).
- EVENTS: MC_MISSION_* lifecycle set (see MISSION).
- FAILURE SEMANTICS: UNKNOWN first-class; terminal statuses explicit.
- REPLAY SOURCE: journal re-projection.
- DUPLICATES: MissionRuntime 3 byte-identical copies (orca-finish/program/orca-{a,c}/src, orca-b/probes/vendor) = DEAD (0 live importers); MissionScheduler 5 byte-identical copies = DEAD; mission_intent.py attempt fields (_issue_work_order:565, _issuance_record:604) = unreached (same defect as MISSION, not double-counted).
- RETIREMENT STATUS: none pending (duplicates already dead; no action).

## EXECUTION -- single owner

- REACHED IMPLEMENTATION: ~/workspace/orca-adapter/adapter.js:670 dispatchHermes(promptText, timeoutMs) + :425 reconcileGate/:445 reconcileGateLocked + vendored authorizeWorkOrder (orca-adapter/vendor/external_agent_adapter.js; grant-before-issue; AGENT_PROFILES identities 1-4 allow / 5-10 deny). Live-proven 2026-09-26.
- CALLERS: mission-control/lane-d/adapter-call.js:70 (require of canonical vendor adapter; hardcoded Pig path /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js), mission-control/_adapter_shim.js, Pig lane-d dispatch via mc-dispatch.ts adapterCall.
- CANONICAL INPUT: work order (agentId, capability, namespace, constraints, prompt, idempotency key, execution.attempt).
- CANONICAL OUTPUT: dispatch record + structured executor result envelope + effectState (EFFECT_STATE.UNKNOWN first-class at adapter.js:1026).
- DURABLE STATE: evidence-dir index records (attempt/refusal/reservation appends under withIndexLock); journal terminal events.
- EVENTS: attempt/refusal/reservation records; MC terminal events via lane-d.
- FAILURE SEMANTICS: reconcile gate refuses re-dispatch of uncertain attempts without explicit caller-supplied reconciliation record ({checked, found, decidedBy}); duplicate attempt numbers refused; index corruption fails closed; eventRuntime missing fails closed (no silent ping_events write).
- REPLAY SOURCE: journal + evidence-dir records.
- DUPLICATES: orca-dispatch-test/hermes_dispatch.py + orca-remediation/hermes_dispatch.py = TEST/REMEDIATION harnesses (imported only by orca_control_loop.js test/remediation drivers; harvest donor for crash-safe rendezvous, not canonical path); orca-workstream-d/external_agent_adapter.js 405-LOC copy = STALE/DEAD; tenanos-wave/swarm-20/reference copy = reference/DEAD; orca-finish copies = probes/DEAD.
- RETIREMENT STATUS: none pending for the unit; harvest the remediation rendezvous feature per directive.

## CAPABILITY -- single owner

- REACHED IMPLEMENTATION: Pig ping-gateway container /app/gateway/constitutional_capability_graph.js (class ConstitutionalCapabilityGraph; constructor takes postgresPool + authorityRegistry). CORRECTION to reality map: the file /app/gateway/capability_authority.js does not exist; the real capability authority file is constitutional_capability_graph.js (verified via docker exec ping-gateway).
- CALLERS: Pig gateway container (Pig-side; exact authorize/evaluate function not read in this pass = line-level detail UNKNOWN).
- CANONICAL INPUT: UNKNOWN (not read).
- CANONICAL OUTPUT: UNKNOWN (not read).
- DURABLE STATE: Pig gateway (postgres-backed).
- EVENTS: UNKNOWN.
- FAILURE SEMANTICS: UNKNOWN (not read).
- REPLAY SOURCE: UNKNOWN.
- DUPLICATES: orca-adapter vendored authorizeWorkOrder = executor-edge agent-identity gate, boundary documented in adapter.js header ("The adapter never reconciles by itself"; shim owns no decision) = legitimate specialization, not a competitor; fyd-product-lane/src/lib/ping/grants.ts = viewer grants, explicitly NOT executor authority = separate domain; fyd-product-lane owner-mode/capability.ts = STUB (header forbids production use) = not real.
- RETIREMENT STATUS: none pending; needs a read of the graph's authorize path in a later pass (fields above marked UNKNOWN honestly).

## ARTIFACT -- single owner

- REACHED IMPLEMENTATION: Pig /home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts:430 publishArtifact(missionId, kind, name, content, tenant).
- CALLERS: /api/mc/dispatch/route.ts (live :3100 dispatch path).
- CANONICAL INPUT: missionId, kind, name, content, tenant.
- CANONICAL OUTPUT: { path, sha256 } + MC_ARTIFACT_PUBLISHED journal row.
- DURABLE STATE: artifact files (writeArtifact) + journal.
- EVENTS: MC_ARTIFACT_PUBLISHED (2 rows observed in local events.jsonl; lineage chain not proven end-to-end per map).
- FAILURE SEMANTICS: sha256 content addressing; PARTIAL lineage.
- REPLAY SOURCE: journal rows + artifact files by sha.
- DUPLICATES: mission-control/emit.py MC_ARTIFACT path = REAL tooling writer but scoped to the local MC stack/journal file (different deployment, not the same store) = not a same-store competitor; backfill.py/project.py = tooling.
- RETIREMENT STATUS: none pending; lineage proof is a later pass.

## EVIDENCE -- UNKNOWN (no reached implementation)

- REACHED IMPLEMENTATION: UNKNOWN. No EvidenceAuthority found anywhere in allowed paths. orca-adapter/evidence/ contains a single JSON file (result-smoke-e1-a1.json), not an authority. witness_chain.js not found in live dirs (unwired writer per map, location unconfirmed in this pass).
- All other fields: UNKNOWN.
- DUPLICATES: none (nothing claims the unit).
- RETIREMENT STATUS: n/a. NEXT-IF-UNKNOWN: needs a reached evidence primitive; do not invent one until the reached loop is proven (per NO list).

## EVENT -- DEFECT (2 live stores)

- REACHED IMPLEMENTATION: (A) ping_events (Postgres) via /home/nolan/ping/ping-runtime/events/unified_event_runtime.js (:200 generateSpineEventId, :290 ON CONFLICT (event_id) DO NOTHING, :298 semantic-collision fail-closed check, governance validation via event_governance.js). (B) fyd-journal-gateway/events.jsonl (JSONL, 34KB, last write 2026-09-27 01:47 UTC).
- CALLERS: (A) UER itself (single production writer per audit); orca-adapter/adapter.js:1025-1026 recordVerifiedResult with injected eventRuntime (fail-closed if not injected); FYD social envelopes via PING gateway (governed). (B) mission-control/emit.py:126-132 direct file append (confirmed); fyd-journal-gateway/server.mjs POST /events (called by fyd-product-lane customize route = P0 approve path); Pig lane-d mc-dispatch.ts appendDispatchEvent. The P0 replay's 15/15 WAITING_APPROVAL events went through (B), not (A).
- CANONICAL INPUT: (A) eventType, source, payload, namespace/tenant. (B) typed MC_*/FYD_* event object.
- CANONICAL OUTPUT: (A) persisted canonical event with deterministic event_id. (B) appended JSONL row.
- DURABLE STATE: (A) Postgres ping_events. (B) events.jsonl.
- EVENTS: (A) all governed event types (event_registry.json validated). (B) MC_MISSION_*, MC_APPROVAL_*, MC_ARTIFACT_PUBLISHED, MC_HOLD_RAISED, MC_GATE_RESULT, FYD_SITE_OVERLAY, MC_PASS_* (observed).
- FAILURE SEMANTICS: (A) governance rejection, ON CONFLICT no-op, semantic-collision fail-closed. (B) none (direct append; no outbox; no advisory lock).
- REPLAY SOURCE: (A) ping_events. (B) journal re-projection.
- DUPLICATES: ConstitutionalEventBus (legacy events table) = zero live instantiations = LEGACY/DEAD; convergence-lane3 UER copy = TEST-ONLY; ~10 dormant direct writers (audit) = DEAD.
- RETIREMENT STATUS: open defect, P0. Safe direction: rewire lane-d appendDispatchEvent to UER first (UER has the fail-closed semantics Store 2 lacks), then emit.py, then sanction JSONL as feeder/projection or decommission. Q-P0-04 WRONG_JOURNAL acceptance gates this.

## OBJECT PROJECTION -- UNKNOWN (no single reached projector isolated)

- REACHED IMPLEMENTATION: UNKNOWN. Candidates, none proven as the canonical projector: FYD served projection on :3100 (Ask FYD reads it; projector code not isolated in this pass); fyd-product-lane/src/fyd/object/object-projection.ts (presentational projection props for Card/Node, Lane B lab = specialization, not canonical); fyd-product-lane/src/lib/ping/ping-object-reader.ts (server-side object reader, submitProposal:1297); /home/nolan/fyd-projection-harness/harness.ts (test/attack harness over fixtures, not live).
- All other fields: UNKNOWN.
- DUPLICATES: none claiming the canonical unit.
- RETIREMENT STATUS: n/a. NEXT-IF-UNKNOWN: isolate the :3100 projector in a later pass.

## RELATIONSHIP PROJECTION -- UNKNOWN (no reached implementation)

- REACHED IMPLEMENTATION: UNKNOWN. Nothing found claiming canonical relationship projection. fyd-product-lane/src/fyd/object/related.ts selectRelatedCircles is presentational (related objects for Card/Node), not canonical.
- All other fields: UNKNOWN.
- RETIREMENT STATUS: n/a. NEXT-IF-UNKNOWN: same as OBJECT PROJECTION.

## APPROVAL -- single owner

- REACHED IMPLEMENTATION: ~/workspace/mission-control/approval_request.py (canonical_proposal_bytes:108, proposal_digest:119, ApprovalStore:162 atomic temp+rename JSON, request_approval:215, authorize_approval_transition:310 exact-digest binding, deny_approval:387, evaluate_expiry:418; 68/68 tests per worker report).
- CALLERS: approval_cli.py (record/decide/get; "the primitive stays the single canonical model"); Pig :3100 src/app/api/mc/approvals/route.ts:41 spawnSync approval_cli.py (live); P0 record p0prop-ac04480a6d1809fd APPROVED 2026-09-27 ~20:06 MDT by standing autonomy directive.
- CANONICAL INPUT: proposal + capability + actor + consequence + expires_at (validated; exact digest).
- CANONICAL OUTPUT: ApprovalRequest record (id p0prop-<sha16> via proposal_record.py:54 mint_proposal_id) + typed journal events.
- DURABLE STATE: ApprovalStore JSON file (path supplied by caller; atomic writes).
- EVENTS: MC_APPROVAL_REQUESTED, MC_APPROVAL_APPROVED, MC_APPROVAL_DENIED, MC_APPROVAL_REFUSED, MC_APPROVAL_EXPIRED (via _emit:494 into emit.py).
- FAILURE SEMANTICS: exact-digest binding (approve binds digest, not "latest"); typed denial; expiry; idempotent identical WAITING requests. KNOWN GAPS: no cross-process lock (single-writer JSON, last-writer-wins race); ApprovalRequest has no tenant field (T2 hostile proof).
- REPLAY SOURCE: journal MC_APPROVAL_* rows + store file.
- DUPLICATES: /home/nolan/projects/ping/mc-approval/ vendored copy of the same files (VENDOR-README.txt; deployment copy serving the :3100 route, same code) = not a competitor, drift risk flagged.
- RETIREMENT STATUS: none pending; tenant field + lock are P0 fixes, not ownership changes.

## RECONCILIATION -- UNKNOWN (no reached implementation)

- REACHED IMPLEMENTATION: UNKNOWN. No code implements the post-EFFECT_UNKNOWN reconciler (the locked directive names its exclusive authority: only the reconciler may determine PROVEN_OCCURRED / PROVEN_NOT_OCCURRED / MANUAL_RESOLUTION). orca-adapter/adapter.js:425 reconcileGate is a PRE-dispatch idempotency gate that REQUIRES the caller to supply a reconciliation record; it does not itself reconcile = related mechanism, not the unit. Mentions only in mission-control/STATE.md and docs.
- All other fields: UNKNOWN.
- DUPLICATES: none.
- RETIREMENT STATUS: n/a. NEXT-IF-UNKNOWN: implement or formally assign; until then HOLD cannot be exited by code (reaper-vs-HOLD gap stays open by design).

## TENANT CONTEXT -- DEFECT (2 real claimants, no verified-session owner)

- REACHED IMPLEMENTATION: (A) fyd-product-lane/src/fyd/tenant/tenant-context.ts:93 requireTenantContext (fail-closed TENANT_CONTEXT_MISSING; used at :125, :176). (B) mission-control/mission_intent.py:190 AuthenticatedContext + :222 resolve_tenant (refuses disagreeing body tenant).
- CALLERS: (A) FYD server store paths. (B) mission_intent validate/authorize path (no prod caller; see MISSION defect).
- CANONICAL INPUT: (A) TenantContext object. (B) auth context + intent body.
- CANONICAL OUTPUT: (A) tenant id string or throw. (B) resolved tenant or refusal.
- DURABLE STATE: none (constructed per request).
- EVENTS: none.
- FAILURE SEMANTICS: both fail closed on missing context. KNOWN GAPS: no verified-session production constructor (fyd-autonomy/tenant-ingress-identity-issue.md); body-supplied tenant trusted in 4 places (legacy flat ask route body siteId, journal gateway POST /events write side, Pig Lane D dispatch body tenant vs allowlist, proposal siteId); T3 hostile proof: forged tenant-victim intent issued a real work order.
- REPLAY SOURCE: n/a (request-scoped).
- DUPLICATES: the two above are the duplicate pair. TenantOS (~/workspace/tenant-os) = compose-only, spec forbids new authorities = not a claimant.
- RETIREMENT STATUS: open defect. Convergence is NOT retiring one impl: Q-P0-06 requires one verified-ingress constructor both must call. Domain split (FYD web paths vs MC intent path) is the plausible-but-unproven legitimacy argument; without the shared constructor it stays a defect.

## MISSION CONTROL VIEW -- single owner

- REACHED IMPLEMENTATION: Pig /home/nolan/projects/ping/src/app/api/mc/missions/route.ts (+ [id]/route.ts, /dispatch/route.ts, /approvals/route.ts) on :3100.
- CALLERS: MC browser UI (Pig).
- CANONICAL INPUT: journal path; request.
- CANONICAL OUTPUT: mission projections re-projected from the journal on every request ("No cache, no store").
- DURABLE STATE: none (projection only; journal is the state).
- EVENTS: reads MC_*; emits none.
- FAILURE SEMANTICS: UNKNOWN rendered as UNKNOWN (per dispatch route header: deadline expiry and unverifiable results never render as FAILED).
- REPLAY SOURCE: the journal itself.
- DUPLICATES: ~/workspace/mission-control/staging/mc (REAL Next.js app: /today /agents /graph /object /trace-forward /search, but hostile trace proved it cannot answer running/needs-me/failed/proposed for missions = distinct ops dashboard, not a claimant of the truthful MC view; boundary recorded); ~/workspace/ping-ui-contract/apps/mission-control (IMPLEMENTED but explicitly UNWIRED: "become WIRED when called with live gateway responses" = not reached).
- RETIREMENT STATUS: none pending for the unit; the two mission-control dirs remain a convergence item but are not same-unit competitors.

---

## DEFECT LIST (units with >1 REAL claimant)

1. IDENTITY: JS identity_authority.js generateSpineEventId (UER path, provably live) vs TS CanonicalIdentityService (kernel importers: mission, replay, lease, governance, execution). Both real. Audit already documents convergence intent.
2. EVENT: ping_events (UER, fail-closed) vs fyd-journal-gateway/events.jsonl (direct append, no governance). Both live writers; P0 replay went through the JSONL.
3. MISSION: Pig lane-d mc-dispatch.ts (live :3100) vs local mission_intent.py (real code, zero prod callers). Convergence item.
4. TENANT CONTEXT: fyd tenant-context.ts requireTenantContext vs mission_intent.py AuthenticatedContext/resolve_tenant. Both real, neither verified-session-backed.

## BASELINE COUNT

SEMANTIC UNITS WITH >1 REACHED IMPLEMENTATION: 4
(Units with no reached implementation: EVIDENCE, OBJECT PROJECTION, RELATIONSHIP PROJECTION, RECONCILIATION = 4. Units with exactly one reached owner: MISSION CONTROL VIEW, RUN, EXECUTION, CAPABILITY, ARTIFACT, APPROVAL = 6.)

## TOP-3 CONVERGENCE TARGETS

1. EVENT Store 2 (events.jsonl) -> rewire to UER. Evidence it is safe: UER already has the fail-closed semantics Store 2 lacks (ON CONFLICT DO NOTHING at unified_event_runtime.js:290, semantic-collision check :298, governance validation); lane-d writes are the only live canonical-path writers on Store 2 (appendDispatchEvent), and emit.py/server.mjs are rewireable call sites. Gate: Q-P0-04 WRONG_JOURNAL acceptance before any cutover. Do not delete the JSONL until lane-d and emit.py both emit through UER; then sanction it as a feeder/projection or decommission.
2. IDENTITY JS vs TS -> pick one winner. Evidence: deterministic_id_authority.js:7 already documents the convergence target (generateFromCanonicalHash, i.e. the TS CanonicalIdentityService); the TS service has the broadest real importer set (mission, replay, lease, governance, execution hooks). Safe first step is caller inventory per the locked deletion policy; the actual migration moves UER:200 off generateSpineEventId. Do not touch until the inventory is recorded.
3. MISSION front door -> declare lane-d the winner. Evidence it is safe: mission_intent.py has zero production callers (only tests, falsify harnesses, and the frontdoor_adapters dry-run wrapper); the P0 replay proved the lane-d path end to end. Harvest before any deletion: mission_intent.py's bypass detection (detect_bypass, per-class illegality in frontdoor_adapters.py) is semantics lane-d lacks.

## NEXT STEPS

- NEXT-IF-PASS: this registry is the 24h scorecard baseline for "SEMANTIC UNITS WITH >1 REACHED IMPLEMENTATION" (baseline 4; the number must decrease).
- NEXT-IF-FAIL: n/a (read-only).
- NEXT-IF-UNKNOWN: EVIDENCE, OBJECT PROJECTION, RELATIONSHIP PROJECTION, RECONCILIATION have no reached implementation; CAPABILITY's authorize path needs a direct read (fields marked UNKNOWN above).

## CORRECTIONS TO REALITY MAP (found in this pass)

- Capability authority filename: /app/gateway/capability_authority.js does not exist in the ping-gateway container; the real file is /app/gateway/constitutional_capability_graph.js (verified via docker exec).
- UER ON CONFLICT line is :290 (map said :246; audit-sourced number, now rebound).
- generateSpineEventId is identity_authority.js:294 (map's [A] claim now directly verified); UER calls it at unified_event_runtime.js:200.
- Pig :3100 approvals route shells to the vendored mc-approval/approval_cli.py (spawnSync), which delegates to the canonical approval_request.py primitive; the vendored copy is a deployment copy, not a competing authority.
- Pig lane-d dispatch route (route.ts) + mc-dispatch.ts is the live mission/dispatch implementation writing MC_* lifecycle events; mission_intent.py has no prod caller (confirmed via importer grep).
- fyd-projection-harness is a test/attack harness over fixtures, not the live projector; OBJECT PROJECTION stays UNKNOWN.
