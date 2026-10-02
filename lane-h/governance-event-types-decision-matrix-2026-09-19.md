# LANE H: Governance Event Types Decision Matrix

- Date: 2026-09-19
- Lane: H (GOVERNANCE EVENT TYPES DECISION MATRIX)
- Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law
- Branch: constitutional-convergence-authority-law
- HEAD: 0d3cddd4a67238e0511ae7b58718cd75dd29d8d3
- Method: code trace at HEAD + live falsification probe (no DB) + existing phase7 test assertions as receipt-path evidence. No code patched, no types registered.

## 0. Verified current set (the "six types" list: CONFIRMED but INCOMPLETE)

All six reported types are live emissions at HEAD:

| # | event type | producer module | emit site |
|---|-----------|----------------|-----------|
| 1 | review.flagged | ping-runtime/business/review_authority.js (ReviewAuthority.executeFlagReview) | line 84-96 |
| 2 | project.artifact_added | ping-runtime/business/project_authority.js (ProjectAuthority.addArtifact) | line 313-321 |
| 3 | CUSTOMER_IMPORTED | ping-runtime/business/customer_authority.js (CustomerAuthority._emitEvent) | line 155 |
| 4 | CUSTOMER_EMAIL_SYNCED | ping-runtime/business/customer_authority.js (CustomerAuthority._emitEvent) | line 206 |
| 5 | CUSTOMER_CALENDAR_SYNCED | ping-runtime/business/customer_authority.js (CustomerAuthority._emitEvent) | line 255 |
| 6 | AI_WORKSPACE_RESULT_CREATED | ping-runtime/business/ai_workspace_authority.js (AIWorkspaceAuthority, repaired writer) | line 98-108 |

CONTRADICTION (label: PROVEN): the six-type list omits TWO more unregistered receipt-path types live at HEAD:
- `review.received` - gateway/google/business_profile.js:150 (_emitReviewReceived)
- `review.replied` - gateway/google/business_profile.js:223
- Both hold a DIRECT handle on CanonicalEventEnvelope.executeEmitEvent (business_profile.js:19-22), bypassing ProducerEventPort entirely. Neither is in the governance registry (grep count 0), neither is in CANONICAL_TYPE_MAP, neither has a bridge mapping. The phase7 producer-migration covered only the four HPP business authorities, not this adapter. No test references them.

The six are the COMPLETE set of unregistered types emitted through the ProducerEventPort. The port-routed registered/mapped set (project.created -> PROJECT_CREATED, project.updated -> PROJECT_UPDATED, CUSTOMER_CREATED, CUSTOMER_UPDATED) is separate and not in scope.

## 1. Decision matrix

Legend: PROVEN = direct evidence at HEAD (code or live probe). STALE = superseded by later work.

### Type 1: review.flagged

- producer: ReviewAuthority.executeFlagReview (review_authority.js:66-100). PROVEN
- current emission path: producer -> ProducerEventPort.emitProducerEvent -> type not in governance registry -> RECEIPT seam -> CanonicalEventEnvelope.executeEmitEvent (receipt UUID, explicit receipt_semantics) -> LegacyIngressAdapter._convergeBatch (capability-bound MC-1 exception skips UER validator/governance steps) -> UER acceptance -> ping_events row with IdentityAuthority identity event_<hex>, namespace tenant::<claim>. PROVEN (code trace + tests/event-authority-convergence/producer_migration_phase7.js F1 assertions: exactly one receipt row, exactly one canonical event, receipt identity != canonical identity, canonical namespace tenant::acme, cross-reference resolvable via source_event_id)
- policy registration: NOT REGISTERED. gateway/generated/event_registry.json has 233 events; review.flagged absent. No semantic equivalent (registry has REVIEW_RECEIVED / REVIEW_RESPONDED, different types). PROVEN (registry scan at HEAD)
- dispatch registration: absent from every worker eventTypes list (canonical_workers.js BUSINESS_EVENTS + knowledge-promotion/claim/classification/recommendation/projection/replay/witness/lineage lists; intelligence worker dormant with eventTypes:[]). Absent from EventToMissionBridge.EVENT_MISSION_MAP. No uer.on() subscription anywhere. PROVEN (exhaustive grep)
- namespace: governance-derived 'review' (owner HPP per NAMESPACE_OWNERS) - moot on receipt path since governance is skipped; canonical namespace actually assigned is tenant::<tenantId> resolved at adapter authorization (F1 asserts tenant::acme). PROVEN
- consumer: none. No handler, no worker, no bridge mapping, no integration cap, no projection filter references this type. PROVEN
- needs dispatch: NO. Nothing downstream subscribes or requires routing for it. PROVEN
- receipt-only intentional: YES. In-code comment (review_authority.js:80-83): "review.flagged is a domain envelope type (unregistered, no semantic equivalent in the governance registry). The port receipts it with explicit receipt semantics; acceptance is UnifiedEventRuntime's via the allowlisted LegacyIngressAdapter." PROVEN
- absence-from-eventTypes blocks emission: NO for dispatch eventTypes (live probe: registered LEAD_CREATED with zero handlers emits status ok, event_id minted). YES for the governance/validator registry on the DIRECT path (live probe: direct uer.emit('review.flagged') rejected UNKNOWN_EVENT_TYPE before identity minting). Overall acceptance NOT blocked: the receipt seam's capability-bound exception is the documented path. PROVEN (both halves, live probe /tmp/lane-h/lane-h-emission-law.js)
- RECOMMENDATION: KEEP UNREGISTERED. Registering it would reroute emission from the receipt seam to the direct seam (constitutional identity minted at emit time instead of receipt-then-converge), a behavior change requiring an operator decision. Nothing consumes it on dispatch, so dispatch registration would be dead config.

### Type 2: project.artifact_added

- producer: ProjectAuthority.addArtifact (project_authority.js:309-321). PROVEN
- current emission path: same RECEIPT seam as Type 1 (port -> envelope receipt -> LegacyIngressAdapter -> UER acceptance -> ping_events). PROVEN (code trace + phase7 F2d assertions)
- policy registration: NOT REGISTERED (233-event registry; has PROJECT_CREATED/UPDATED/COMPLETED, no artifact type). PROVEN
- dispatch registration: absent everywhere (same exhaustive grep as Type 1). PROVEN
- namespace: governance-derived 'project' (owner HPP); canonical namespace tenant::<tenantId>. PROVEN
- consumer: none. PROVEN
- needs dispatch: NO. PROVEN
- receipt-only intentional: YES. In-code comment (project_authority.js:309-312): "project.artifact_added is a domain envelope type (unregistered; no semantic equivalent in the governance registry). The port receipts it with explicit receipt semantics; acceptance is UnifiedEventRuntime's via the allowlisted LegacyIngressAdapter." PROVEN
- absence-from-eventTypes blocks emission: same split result as Type 1 (live probe rejected direct emit with UNKNOWN_EVENT_TYPE; dispatch absence blocks nothing). PROVEN
- RECOMMENDATION: KEEP UNREGISTERED. Same rationale as Type 1.

### Type 3: CUSTOMER_IMPORTED

- producer: CustomerAuthority (customer_authority.js:155 via _emitEvent helper at :552). PROVEN
- current emission path: RECEIPT seam (port -> envelope receipt -> LegacyIngressAdapter -> UER acceptance -> ping_events). PROVEN (code trace + phase7 F3c assertions: port returns status received, seam receipt)
- policy registration: NOT REGISTERED (registry has CUSTOMER_CREATED / CUSTOMER_UPDATED only). PROVEN
- dispatch registration: absent everywhere. PROVEN
- namespace: governance-derived 'customer' (owner HPP); canonical namespace tenant::<tenantId>. PROVEN
- consumer: none. PROVEN
- needs dispatch: NO. PROVEN
- receipt-only intentional: YES. In-code comment (customer_authority.js:417-419, 541-543): "CUSTOMER_IMPORTED / CUSTOMER_EMAIL_SYNCED / CUSTOMER_CALENDAR_SYNCED are domain envelope types and take the receipt path via the same _emitEvent helper." PROVEN
- absence-from-eventTypes blocks emission: same split result (live probe rejected direct emit UNKNOWN_EVENT_TYPE). PROVEN
- RECOMMENDATION: KEEP UNREGISTERED. Same rationale.

### Type 4: CUSTOMER_EMAIL_SYNCED

- producer: CustomerAuthority (customer_authority.js:206). PROVEN
- current emission path: RECEIPT seam. PROVEN (code trace; phase7 F3 header covers EMAIL_SYNCED/CALENDAR_SYNCED as receipt)
- policy registration: NOT REGISTERED. PROVEN
- dispatch registration: absent everywhere. Note: registry has EMAIL_SENT / EMAIL_RECEIVED (connector events, different types); the bridge maps EMAIL_SENT/EMAIL_RECEIVED to EMAIL_PROCESS missions, but NOT CUSTOMER_EMAIL_SYNCED. PROVEN
- namespace: governance-derived 'customer' (owner HPP); canonical namespace tenant::<tenantId>. PROVEN
- consumer: none. PROVEN
- needs dispatch: NO. PROVEN
- receipt-only intentional: YES (same customer_authority comments as Type 3). PROVEN
- absence-from-eventTypes blocks emission: same split result. PROVEN
- RECOMMENDATION: KEEP UNREGISTERED. Same rationale.

### Type 5: CUSTOMER_CALENDAR_SYNCED

- producer: CustomerAuthority (customer_authority.js:255). PROVEN
- current emission path: RECEIPT seam. PROVEN (code trace; phase7 F3)
- policy registration: NOT REGISTERED. PROVEN
- dispatch registration: absent everywhere. PROVEN
- namespace: governance-derived 'customer' (owner HPP); canonical namespace tenant::<tenantId>. PROVEN
- consumer: none. PROVEN
- needs dispatch: NO. PROVEN
- receipt-only intentional: YES (same customer_authority comments). PROVEN
- absence-from-eventTypes blocks emission: same split result. PROVEN
- RECOMMENDATION: KEEP UNREGISTERED. Same rationale.

### Type 6: AI_WORKSPACE_RESULT_CREATED

- producer: AIWorkspaceAuthority (ai_workspace_authority.js:98-108; "repaired writer" - the previous legacy-shaped call threw on every invocation at executeValidateEvent, so this authority never emitted before Phase 7). PROVEN
- current emission path: RECEIPT seam (port -> envelope receipt -> LegacyIngressAdapter -> UER acceptance -> ping_events). PROVEN (code trace + phase7 F4 assertions)
- policy registration: NOT REGISTERED. PROVEN
- dispatch registration: absent everywhere. PROVEN
- namespace: governance-derived 'ai' (owner PING per NAMESPACE_OWNERS - the only one of the six whose governance owner would be PING rather than HPP); canonical namespace tenant::<tenantId>. PROVEN
- consumer: none. PROVEN
- needs dispatch: NO. PROVEN
- receipt-only intentional: YES. In-code comment (ai_workspace_authority.js:92-96): "AI_WORKSPACE_RESULT_CREATED is a domain envelope type (unregistered; no semantic equivalent in the governance registry): receipt with explicit receipt semantics; acceptance via the allowlisted LegacyIngressAdapter." PROVEN
- absence-from-eventTypes blocks emission: same split result. PROVEN
- RECOMMENDATION: KEEP UNREGISTERED. Same rationale.

### Types 7-8 (contradiction rows): review.received / review.replied

- producer: GoogleBusinessProfile adapter (gateway/google/business_profile.js:148-168, 223). PROVEN
- current emission path: DIRECT envelope receipt (this._events = CanonicalEventEnvelope, executeEmitEvent), bypassing ProducerEventPort. Converged by LegacyIngressAdapter like any unprocessed canonical_events row. PROVEN (code trace)
- policy registration: NOT REGISTERED (grep count 0 in registry). PROVEN
- dispatch registration: absent everywhere. PROVEN (grep)
- namespace: governance-derived 'review' (HPP); canonical namespace tenant::<tenantId> at adapter authorization. PROVEN (by the same derivation)
- consumer: none. PROVEN
- needs dispatch: NO evidence of any downstream need. PROVEN (absence of evidence, exhaustive grep)
- receipt-only intentional: UNKNOWN. No Phase 7 comment covers this adapter; it was not migrated to the port. The direct-envelope handle is a pre-Phase-7 shape.
- absence-from-eventTypes blocks emission: same split law applies (direct uer.emit would reject; envelope receipt converges). PROVEN by code path parity
- RECOMMENDATION: UNKNOWN - operator decision. Options: (a) migrate the adapter to ProducerEventPort so its types get the documented DIRECT/RECEIPT classification and fail-closed tenant-claim handling; (b) leave as-is (it converges today). This is a Phase 7 coverage gap, not a live breakage.

## 2. The emission/dispatch law: VERIFIED with a precision correction

Baseline claim: "EventGovernance gates EMISSION; registered eventTypes gate DISPATCH ROUTING (NOT emission)."

Live probe (/tmp/lane-h/lane-h-emission-law.js, UER with real EventValidator + EventGovernance, no pool, no handlers, no legacy capability):

- A: direct uer.emit of all six unregistered types -> {"status":"error","code":"UNKNOWN_EVENT_TYPE"} for all six. Rejection happens at UER.emit step 2 (EventValidator registry-membership check), before identity minting, before governance step 3, before any persistence. PROVEN
- B: uer.emit('LEAD_CREATED') with ZERO dispatch handlers -> {"status":"ok","event_id":"event_17b3180e0c296e15"}. PROVEN
- C: same with one uer.on('LEAD_CREATED') handler -> handler fired once, dispatched=1. PROVEN

Precision correction: the law as stated conflates two registries. The verified form is:
- The GOVERNANCE/VALIDATOR registry (gateway/generated/event_registry.json, 233 types) gates EMISSION on the direct canonical path: absence DOES block direct emission (UNKNOWN_EVENT_TYPE / UNREGISTERED_EVENT, fail-closed before identity minting).
- The DISPATCH eventTypes (workerRuntime.register eventTypes, uer.on subscriptions) gate DISPATCH ROUTING only: absence does NOT block emission (step 7 finds no handlers, emission still succeeds with status ok).
- The six types are accepted despite governance absence ONLY through the documented capability-bound LegacyIngressAdapter exception (MC-1): receipt row -> adapter convergence -> UER acceptance with the exact capability object. Without that capability, they cannot be emitted at all.

Do NOT invert: registering a type in dispatch eventTypes does not grant emission; emission is governed independently.

## 3. Exact decision surface for the operator

D1. Register any of the six in gateway/generated/event_registry.json? RECOMMENDED: NO. Effect of YES: ProducerEventPort reroutes from RECEIPT to DIRECT seam; emission identity becomes constitutional IdentityAuthority identity minted at emit time; receipt-then-converge path and its explicit receipt semantics are abandoned for that type; phase7 test assertions (receipt seam, receipt identity != canonical identity) would need rewriting. Behavior change, needs operator word.
D2. Add any of the six to worker dispatch eventTypes (e.g. ObservationWorker BUSINESS_EVENTS)? RECOMMENDED: NO. No consumer exists; it would route domain-envelope receipt types into the observation pipeline - behavior change with no requesting downstream.
D3. Add EventToMissionBridge mappings for any of the six? RECOMMENDED: NO. Phase7 pins "no mission triggered" for review.flagged; no mission type exists for these domain events.
D4. review.received / review.replied (adapter bypasses the port): OPERATOR DECISION. Recommend migrating to ProducerEventPort for classification parity, or an explicit keep-direct ruling.
D5. EVIDENCE_LEDGER.md:544-550 describes EventBridge._bridgeCanonicalEvents as "the only convergence path into ping_events". STALE: EventBridge is PRESERVED_INACTIVE/retired (event_bridge.js:2-4, MC-1 2026-09-18); the convergence path is LegacyIngressAdapter. Ledger needs a correction entry (left untouched - no patches in this lane).

## 4. Contradictions found (grill output)

C1. The "six types" framing is incomplete: two more unregistered receipt-path types (review.received, review.replied) are live at HEAD via a direct envelope handle that Phase 7 did not migrate. PROVEN
C2. EVIDENCE_LEDGER.md:544-550 is stale re the convergence path (names retired EventBridge). PROVEN
C3. The baseline law "absence from eventTypes blocks only DISPATCH ROUTING, not EMISSION" is true of the dispatch registry but FALSE of the governance registry, where absence blocks direct emission outright. The six types survive only via the capability-bound adapter exception. PROVEN by live probe
C4. AI_WORKSPACE_RESULT_CREATED is the only one of the six whose governance-derived owner would be PING ('ai' namespace) rather than HPP; the other five are HPP-owned namespaces. Noted for any future registration decision (owner field on the policy row would differ).

## 5. Evidence index

- Registry scan: gateway/generated/event_registry.json (233 events; none of the six present). Probe: /tmp/lane-h/registry-scan.js
- Live falsification probe: /tmp/lane-h/lane-h-emission-law.js (no DB; UER steps 1-5,7-8 exercised)
- Receipt-path proof: tests/event-authority-convergence/producer_migration_phase7.js (F1-F4; requires PGPASSWORD + PG :15439; not re-run here, assertions read at HEAD)
- Emission seam: ping-runtime/events/producer_event_port.js (DIRECT vs RECEIPT classification, CANONICAL_TYPE_MAP, fail-closed rules)
- Acceptance authority: ping-runtime/events/unified_event_runtime.js emit() steps 1-8 (validator step 2, governance step 3, capability exception, dispatch step 7)
- Governance policy: ping-runtime/events/event_governance.js (validateEvent, UNREGISTERED_EVENT, NAMESPACE_OWNERS, namespace extraction)
- Dispatch registry: ping-runtime/workers/canonical_workers.js:931-970 (BUSINESS_EVENTS + per-worker eventTypes)
- Mission bridge: ping-runtime/orchestration/event_to_mission_bridge.js:24-60 (EVENT_MISSION_MAP; none of the six mapped)
- Producers: ping-runtime/business/{review,project,customer,ai_workspace}_authority.js (emit sites + Phase 7 intent comments)
- Retired bridge: ping-runtime/events/event_bridge.js:2-17 (PRESERVED_INACTIVE)
- Extra types: gateway/google/business_profile.js:19-22,148-168,223 (direct envelope handle)
