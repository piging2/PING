# TOP 10 UNKNOWNS - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. Status: PLANNING ONLY. No implementation, no writes to product trees, no Jev calls, no clock start.
Ranked by how much resolving each changes the first 24 hours of execution, not by interestingness.
Rule: resolve with evidence, never with a design.

Format per item: UNKNOWN → WHY IT MATTERS → CURRENT EVIDENCE → COMPETING HYPOTHESES → EXACT OBSERVATION/TEST THAT RESOLVES IT → EXISTING IMPLEMENTATIONS TO SEARCH → SEMANTIC OWNER → ACTIVE WRITER/COLLISION → CONSEQUENCE IF LEFT UNKNOWN → CAN SPRINT START WITHOUT IT? → DEFAULT SAFE POSTURE.

---

## U1. Caller-to-tenant entitlement authority

UNKNOWN → No caller-to-tenant entitlement exists anywhere. The MC dispatch route takes tenant from the HTTP request body (route.ts:226), checks only the static SLICE_TENANTS allowlist (:234), with no authenticated caller. ORCA then verifies only internal consistency (namespace shape, capability allowlist). A request can be consistently labeled as Tenant B without ever proving the caller was authorized for Tenant B, and the whole downstream chain inherits that unproven label as authoritative.

WHY IT MATTERS → Every tenant-labeled action in the first 24 hours is suspect until this resolves. It is the scariest live gap in the forest inventory and the root of Wave A (tenant safety).

CURRENT EVIDENCE → JEV_DECISION_INVENTORY lane B+J hostile verdicts: "A worker capability cannot operate on B: ASSUMED (no worker/caller-to-tenant entitlement exists anywhere; grant issuance is explicitly future)"; "A Mission Control cannot project B state: ASSUMED, failing (projectMissions/loadJournalEvents are global; GET routes take no caller tenant)". tenanos-wave branch P-092 tenant-kit (556 lines) exists unpushed, not in the canonical tree.

COMPETING HYPOTHESES → H1: entitlement must be established at ingress (authenticate caller, resolve tenant binding, then authorize). H2: entitlement can be derived from existing identity work (FYD owner identity, MC dispatch identity, IdentityAuthority copies). H3: demo-only scope makes entitlement out of scope for the sprint (fail-closed demo fencing suffices).

EXACT OBSERVATION/TEST THAT RESOLVES IT → Hostile test J-19 style: submit Tenant A data and commands labeled as Tenant B through MC dispatch and every read path; record at each boundary whether a caller-entitlement check fires or the label is inherited. Resolved when the boundary-by-boundary refusal/inheritance map is recorded from a live run, not from code reading.

EXISTING IMPLEMENTATIONS TO SEARCH → P-092 tenant-kit (tenanos-wave/P-20260923-092-tenant-kit, unpushed); identity_authority.js x3 byte-identical copies (sha c05060d0); FYD journal gateway tenant enforcement (400 on tenant_required / tenant_mismatch / request_id_tenant_conflict, REACHED); FYD tenant-context + scoped stores in canonical HEAD; mc-dispatch-identity.ts and mc-tenant-gate.ts (cited in prior reports but found in zero observed repos; verify absence before citing again).

SEMANTIC OWNER → TenantOS / tenant authority. Currently UNASSIGNED. One convergence owner to be named at GO.

ACTIVE WRITER/COLLISION → None assigned. The Jev track's surgical patch for MC dispatch tenant-from-body is HELD. Collision risk: any writer touching src/app/api/mc/dispatch or the event bridge.

CONSEQUENCE IF LEFT UNKNOWN → Cross-tenant leakage or spoofing on any multi-tenant path; every tenant-scoped sprint claim is unverifiable.

CAN SPRINT START WITHOUT IT? → YES, but only on demo-fenced single-tenant paths with explicit DEMO ONLY labeling. No multi-tenant claims until resolved.

DEFAULT SAFE POSTURE → Fail closed. Required authority chain: CALLER → AUTHENTICATED IDENTITY → TENANT ENTITLEMENT → TENANT CONTEXT. Unknown or malformed tenant refuses; never maps to core::system. Demo fencing intact; no tenant identity accepted from untrusted input.

---

## U2. Event-bridge tenant preservation / laundering

UNKNOWN → The canonical event bridge launders every tenant event's namespace to core::system (event_bridge.js never passes options.namespace; unified_event_runtime.js:237 defaults it). The integration-branch fix (bridge-tenant.ts) sits unwired, and that same module falls back unknown/malformed tenant to core::system with tenant_unknown=true instead of refusing: a fail-closed boundary that would ship as fail-open visibility.

WHY IT MATTERS → Hostile isolation verdict "A evidence cannot inform B" is PARTIAL, broken at MC journal projection (reads global) and blurred at the event bridge. Wave A RED repros (event-bridge tenant namespace laundering; Tenant A to Tenant B projection contamination) depend on this resolving.

CURRENT EVIDENCE → Lane B+J (tenantos-adversary.md); CLASSIFICATION.md unit 11 (tenant isolation, FYD): the FYD journal gateway 400s today and the convergence preserves that; the bridge fix is unwired.

COMPETING HYPOTHESES → H1: wire bridge-tenant.ts after changing the fallback to refuse. H2: the bridge is legacy; the reached path (EventToMissionBridge static map, the live spine) should bypass it. H3: namespace laundering is acceptable for system events; only tenant events need preservation (requires a precise system-vs-tenant event taxonomy first).

EXACT OBSERVATION/TEST THAT RESOLVES IT → Emit a tenant-namespaced event through the bridge; read back the stored event's namespace. Assert tenant namespace preserved end to end. Separately emit unknown/malformed tenant; assert REFUSAL, not core::system mapping. Wave A repros 1 and 4 are the prepared fixtures.

EXISTING IMPLEMENTATIONS TO SEARCH → event_bridge.js; unified_event_runtime.js:237; bridge-tenant.ts (integration branch, unwired); FYD journal gateway tenant enforcement (reached pattern to mirror); EventToMissionBridge 28-type static map.

SEMANTIC OWNER → TenantOS / event authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None. Collision with any event-bridge writer; freeze competing writers per semantic unit.

CONSEQUENCE IF LEFT UNKNOWN → Tenant evidence leaks across namespaces silently; bridge output remains the weakest surface for exfiltration tests.

CAN SPRINT START WITHOUT IT? → YES on demo-only single-tenant scope. NO for any cross-tenant or multi-tenant claim.

DEFAULT SAFE POSTURE → Treat bridge output as untrusted for tenant attribution. Fail closed on unknown/malformed tenant: refuse, never core::system.

---

## U3. Which UNKNOWN/HOLD/reconciliation implementation should win

UNKNOWN → Three implementations of the same closure exist: ~/workspace/f01-fix/ (21/21 tests green since 2026-09-24, never committed), workspace-repo branch mc/lane-c-reconcile-gate (S5 reconcile gate on the dispatch path), integration-branch classifyUnknownExecution (total over the evidence cube) plus attempt-fencing.ts, recover.ts, lease.ts, claim.ts. AGENTS.md still records the Reaper-vs-HOLD design gap as OPEN: reapExpiredLeases resets HOLD to created and re-dispatches ~60s later, an automatic retry of an unknown-outcome mission. The stuck-running watchdog is explicitly held pending the design word.

WHY IT MATTERS → Determines whether dispatching anything consequential in the first 24 hours is safe. Required invariant: UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION. Never blindly redispatch an unknown consequential effect. This is Wave B (recovery).

CURRENT EVIDENCE → Reconciliation lifecycle OPEN → KNOWN_PERMANENT → RESOLVED → REOPENED proven 13/13 tests, idempotent, auditable. f01: HOLD non-dispatchable, reconciliation-only transitions, _failMission proven-failures-only. S5: P4 RETRY-AFTER-UNKNOWN closure. classifyUnknownExecution: effectProven and not effectAbsent → MARK_SUCCEEDED_FROM_EVIDENCE (reexecute=false); indeterminate → HOLD_NEEDS_RECONCILIATION (reexecute=false).

COMPETING HYPOTHESES → H1: f01 wins (most tested, never committed). H2: S5 wins (lives on the dispatch path where the reaper gap bites). H3: they are complementary, not competing (f01 = HOLD semantics, S5 = dispatch-path gate, classifyUnknownExecution = the decision function); converge, do not pick one.

EXACT OBSERVATION/TEST THAT RESOLVES IT → One shared hostile corpus for all three (Wave B): unknown external effect; lease expiration after possible effect; death after effect before acknowledgement; death after result before journaling; duplicate submission; zombie result; restart with HOLD present; reconciliation crash. Run all three implementations against the corpus. The winner never redispatches an unknown consequential effect and preserves the invariant on every case.

EXISTING IMPLEMENTATIONS TO SEARCH → ~/workspace/f01-fix/; mc/lane-c-reconcile-gate branch; integration-branch classifyUnknownExecution, attempt-fencing.ts (315 lines + SQL + test), recover.ts, lease.ts (fencing-token CAS), claim.ts (atomic tenant claims), run-state-authority.ts; P-103 attempt-fencing (627 lines + SQL, tenanos-wave, unpushed); P-095 run-state-authority; P-100 bootstrap substrate (549 lines).

SEMANTIC OWNER → Recovery / run-state authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None. Watchdog deployment HELD until resolved.

CONSEQUENCE IF LEFT UNKNOWN → Automatic retry of unknown-outcome missions (the reaper gap); duplicate external effects; the exact failure the invariant exists to prevent.

CAN SPRINT START WITHOUT IT? → YES for read-only and demo-fenced work. NO for any consequential dispatch.

DEFAULT SAFE POSTURE → HOLD is non-dispatchable; reconciliation-only transitions; never reexecute on indeterminate; human decision for the remainder. Do NOT build another reconciliation system until the existing three are compared against the proven lifecycle.

---

## U4. Which existing identity implementation should win (converge the contract; do NOT build #5)

UNKNOWN → PING has repeatedly implemented identity authority in different places. identity_authority.js exists x3 byte-identical (sha c05060d0). 20 identity handoffs inventoried: explicit 9 / inherited 4 / inferred 1 / duplicated 1 / accepted from untrusted input 1 / absent 5 / incorrectly reconstructed 1. The missing thing is a converged identity CONTRACT, not another class.

WHY IT MATTERS → Every authority decision in the first 24 hours depends on which identity semantics win. Legitimate concepts must stay separate: ENTITY ID, ACTOR ID, CRYPTOGRAPHIC IDENTITY, TENANT/OWNER BINDING, AGENT ID. Collapsing semantically different IDs because they share the word "identity" is the failure mode to avoid.

CURRENT EVIDENCE → Forest lane byte-identical copies; lane B+J handoff taxonomy (H5 double-counts: the check is explicit while the provenance it trusts is inherited; H9 splits record vs boundary); FYD owner identity (demo-owner, explicitly UNVERIFIED); claim identity; MC dispatch identity; constitutional-runtime identity semantics; cryptographic identity work.

COMPETING HYPOTHESES → H1: one semantic identity contract with separate types per concept (not a god class). H2: the byte-identical identity_authority.js is already the winner; converge consumers to it. H3 (null): identity is per-domain and no convergence is needed. H3 is disfavored by the fragmentation evidence but kept as the falsifier.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Enumerate all 20 handoff sites in a live tree; for each record which of the five concepts it carries and which implementation mints or verifies it. The winner is the implementation set covering all five concepts with zero untrusted-input acceptance and zero silent reconstruction. Any site accepting identity from untrusted input fails the audit.

EXISTING IMPLEMENTATIONS TO SEARCH → identity_authority.js x3 (sha c05060d0); FYD owner identity; claim identity; MC dispatch identity; runtime IdentityAuthority copies; cryptographic identity work; constitutional-runtime identity semantics; P-100 bootstrap substrate.

SEMANTIC OWNER → Identity authority. Currently UNASSIGNED. Do NOT create IdentityAuthority #5 or TenantOS.framework until the contract converges.

ACTIVE WRITER/COLLISION → None.

CONSEQUENCE IF LEFT UNKNOWN → Fragmented identity semantics; authority decisions built on untrusted or reconstructed identity; U1 cannot resolve.

CAN SPRINT START WITHOUT IT? → YES for demo-fenced paths with explicit UNVERIFIED labeling. NO for any real-owner or cross-tenant path.

DEFAULT SAFE POSTURE → Demo owner remains explicitly UNVERIFIED. No identity accepted from untrusted input. Document the five concepts separately; convergence goal is ONE SEMANTIC IDENTITY CONTRACT, not one god class.

---

## U5. Authoritative-state → projection invalidation semantics (including the FYD approve→serve failure)

UNKNOWN → Current failure: OWNER APPROVES CHANGE → JOURNAL UPDATED → SITE MAY REMAIN OLD → MANUAL RE-DUMP REQUIRED. No generic authoritative-transition → dependency-invalidation → deterministic-projection-rebuild → freshness-proof path exists. A prior convergence attempt built a special-case regen trigger, but that work ran against the no-write hold and is UNVERIFIED; do not bless it retroactively. The question is whether PING already has, or needs to converge, a generic invalidation path, with FYD as one consumer rather than another special-case regeneration mechanism.

WHY IT MATTERS → Probably the most important genuinely missing product seam. Determines whether the FYD owner loop can close automatically in the first 24 hours, and whether the fix is generic (PING-wide) or a special case. Do NOT wire approve→re-dump as a special case merely because it is the most visible FYD flaw.

CURRENT EVIDENCE → TWO_SITE_VERIFICATION.md known operational wrinkle (approve→serve not automatic; dump defaults to the :8080 main gateway which is 503, so default mode fails closed with WRONG_JOURNAL). CLASSIFICATION.md listed approve→auto-regen as BUILD. dump.py clean at HEAD. Projections at /home/nolan/ping/var/fyd-projections/.

COMPETING HYPOTHESES → H1: a generic invalidation path exists somewhere in the forest (projection authority, Mission Control projection layer) and FYD should become a consumer. H2: nothing generic exists; the smallest correct path is approved FYD site transition → regenerate affected SiteSpec/projection → publish, built as the generic pattern's first instance. H3: manual re-dump is acceptable for the sprint. H3 is rejected: the builder loop is not closed then.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Forest-wide search for any existing transition → invalidation → rebuild → freshness-proof implementation (search: invalidation, staleness, freshness, affected-projection logic across all 38 worktrees + second repo). If none exists, the missing behavior is confirmed and the first-24h deliverable is the generic contract (affected objects → affected projections → rebuild → atomic publish → freshness proof) with FYD as consumer #1.

EXISTING IMPLEMENTATIONS TO SEARCH → Mission Control projection layer; FYD dump.py; SiteSpec pipeline (spec-pipeline.ts, apply-layer.ts); object-overlay / projection code; the unverified regen-trigger.ts (read-only reference only; do not adopt without proof); projection authority implementations.

SEMANTIC OWNER → Projection authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None. Do NOT wire approve→re-dump as a special case.

CONSEQUENCE IF LEFT UNKNOWN → Every owner change needs manual intervention; the sprint cannot prove the closed builder loop (GATE 5: ENGLISH → PATCH → APPROVAL → visible).

CAN SPRINT START WITHOUT IT? → YES. Manual re-dump is the honest interim with the wrinkle documented. The sprint's first-24h goal is to resolve the semantics, not to ship a special case.

DEFAULT SAFE POSTURE → Approval stays committed regardless; derived truth may honestly lag with the lag visible; atomic publish (last good version serves until a fully verified new version swaps in); never serve a partially rebuilt projection as current.

---

## U6. Canonical WorkOrder/ResultEnvelope implementation and authority posture

UNKNOWN → Seven envelope implementations exist (E1 live on the Pig, E2 authority doc, E3 reference copy, E4 harvested contract, E5 outcome vocabulary, E6 unit lifecycle, E7 proposed unified spec, not implemented). The 14-field work-order envelope in / 8-field result envelope out (structural echo-binding) from orca-adapter is the live canonical surface. Authority posture gap: authority is adapter data, not a per-order authority decision (AGENT_PROFILES.maxConstraints decides what a worker runs under; swapping hermes for cloud-subagent changes the executable capability set while authorizeWorkOrder stays green). Objective fidelity is unfenced (lane B5 D8: a worker silently answering a different objective verifies valid).

WHY IT MATTERS → The dispatch contract for the worker-autonomy wave. Every work order in the first 24 hours rides this envelope. Inventory every real worker and all reported envelope implementations before converging contracts.

CURRENT EVIDENCE → lanes/workers-learning.md (35 named workers + 7 envelope implementations; live 33 / dormant 5 / mock 3); lane 14 worker-contract comparison report (the reference analysis); dispatchExecution pipeline (identity fence → authorizeWorkOrder 8 fail-closed checks → resolveTenantId → reconcileGate → issueWorkOrder with deterministic work_order_id = sha256('workorder:'+taskId)[0:16] → extractEnvelope → verifyResultEnvelope → recordVerifiedResult).

COMPETING HYPOTHESES → H1: E1 (live orca-adapter surface) wins with structural echo-binding; converge the other six as documentation. H2: E7 (proposed unified spec) should be implemented as the canonical contract. H3: authority posture must move from adapter-data to per-order authority decision before any worker-autonomy work begins.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Replay a dispatch through each envelope implementation. Assert structural echo-binding catches a well-formed lie (J-16: worker claims success while tests fail; verifyResultEnvelope is structural only today, a plausible-wrong completed passes). Assert a worker swap changes the recorded authority basis. The winner fails closed on objective mismatch.

EXISTING IMPLEMENTATIONS TO SEARCH → All 7 envelopes (E1–E7); orca-adapter dispatchExecution (vendor/external_agent_adapter.js); AGENT_PROFILES / maxConstraints; lane 14 comparison report; TypedDecision (do-not-reimplement register).

SEMANTIC OWNER → Worker/dispatch authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None.

CONSEQUENCE IF LEFT UNKNOWN → Worker-autonomy wave dispatches on a contract that verifies structure but not objective fidelity; authority changes silently with worker swaps.

CAN SPRINT START WITHOUT IT? → YES for read-only and shadow work. NO for autonomous dispatch.

DEFAULT SAFE POSTURE → E1 live surface is the reference; no new envelope; objective-fidelity checks stay human-verified until fenced. Jev may rank only already-eligible workers; selection order: WORK → REQUIRED CAPABILITIES → DETERMINISTIC ELIGIBILITY → CANDIDATES → EMPIRICAL PERFORMANCE → COST/LATENCY → OPTIONAL JEV RANKING → SELECT → AUTHORITY REVALIDATION → DISPATCH.

---

## U7. Exact cause of the ORCA ContextPack evidence-loss reproduction (orca-run-mu6wmbzn)

UNKNOWN → The witnessed first broken reached edge: EVIDENCE → PROCESSOR. In run orca-run-mu6wmbzn (2026-09-18), trimMission dropped the result field and getTrace's correlation query returned only worker-chain events (MISSION_* lifecycle events carry their own correlation_ids). The worker received a lossy ContextPack and honestly reported chain_complete: false with all four MISSION_* events as gaps, while the true chain was complete (MISSION_CREATED → ASSIGNED → STARTED → COMPLETED all present, result recorded). The failure is in evidence ASSEMBLY, not worker honesty.

WHY IT MATTERS → Any ContextPack consumer in the first 24 hours inherits the same loss class. D-26b (evidence-chain completeness check) exists to catch exactly this class. This is Wave C (evidence) core.

CURRENT EVIDENCE → orca-run-mu6wmbzn 11-edge trace (MISSION → QUESTIONS reached; QUESTIONS → DECISION UNITS reached; DECISION UNITS → EVIDENCE reached; EVIDENCE → PROCESSOR reached BUT BROKEN; PROCESSOR → AUTHORITY reached; AUTHORITY → CAPABILITY reached; CAPABILITY → WORKER reached but thin; WORKER → ATTEMPT reached; ATTEMPT → ARTIFACT reached; ARTIFACT → VERIFICATION reached but shallow; VERIFICATION → OUTCOME reached). Three ContextPack compilers with no single authority: runtime/cognitive/context_pack.py, ping-runtime/context/context_compiler.js, tandem/build-context-pack.py. ContextPack patch 9a555021 vs dirty-tree implementations: convergence pending.

COMPETING HYPOTHESES → H1: fix trimMission to preserve result (narrow). H2: fix getTrace correlation to join across correlation_id families (structural). H3: the assembler needs a sufficiency/completeness gate (CognitiveSupervisor.validate_or_raise + _enforce_authority exists only on the cognitive path; the JS mission compiler has no sufficiency decider).

EXACT OBSERVATION/TEST THAT RESOLVES IT → Exact orca-run-mu6wmbzn reproduction fixture (Wave C): replay trimMission + getTrace against the recorded run; assert the assembled ContextPack contains the result and all lifecycle events. Then apply each candidate fix and re-assert. Trace to prepare: trimMission → trace correlation → ContextPack → lifecycle events → result → worker input.

EXISTING IMPLEMENTATIONS TO SEARCH → P-098 context-pack.ts (321 lines, tenanos-wave, unpushed); ContextPack v2 (context-compiler.ts); all existing compilers (context_pack.py, context_compiler.js, build-context-pack.py); decision-fabric/contextpack-wire-2026-09-28 branch (9a555021); P-098, ContextPack v2, and all existing compilers before proposing changes. Do NOT write another context system.

SEMANTIC OWNER → ContextPack / evidence assembly. Convergence owner to be named at GO (directive names ASK FYD / ASK COMPOSER especially).

ACTIVE WRITER/COLLISION → decision-fabric/contextpack-wire worktree exists at 9a555021. Freeze competing writers for this semantic unit.

CONSEQUENCE IF LEFT UNKNOWN → Every evidence-bounded answer (Ask FYD) can silently reason from incomplete evidence; the EVIDENCE → PROCESSOR edge stays REACHED-BROKEN.

CAN SPRINT START WITHOUT IT? → YES with the RED repro prepared and the seam marked REACHED-BROKEN. First-24h work is repro + fix selection, not blind consumption.

DEFAULT SAFE POSTURE → Retrieval exposes FULL / DEGRADED / UNAVAILABLE; failure never means "no evidence". Mark the edge REACHED-BROKEN; no product claim rests on an un-reproed ContextPack.

---

## U8. Whether pseudo-vector retrieval is reached anywhere consequential

UNKNOWN → RetrieverWorker._text_to_vector builds a 768-dim vector from a sha256-seeded PRNG (mulberry32). Deterministic noise, not an embedding; similarity search over it is meaningless. Qdrant last observed DEGRADED/OFFLINE since 2026-09-28 15:40 MDT. The degradation verdict: structure graceful, detail fail-silent (except Exception: return None / return []; a zero-related-events context pack is indistinguishable from "nothing related found"; no reduced-retrieval indicator exists anywhere).

WHY IT MATTERS → If the fake vector path is reached on any live decision path, retrieval results are corrupt by construction and the E1 baseline plus any Ask FYD claim built on it are void. This is the "failure is information" constitutional test.

CURRENT EVIDENCE → lanes/ingestion-search.md; Q28 owner question unanswered (deliberately take Qdrant down, prove fail-closed with a visible reduced-retrieval indicator). Standing verdict: VECTOR SEARCH = UNAVAILABLE.

COMPETING HYPOTHESES → H1: the fake path is reached on the RetrieverWorker path and must be quarantined (VECTOR_UNAVAILABLE). H2: it is dormant (Qdrant DEGRADED means nothing flows through it); the risk is future reactivation. H3: lexical/structured tiers carry the real load and the vector tier is safely ignorable.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Reachability audit: find every _text_to_vector / _qdrant_search call site across all worker copies (noting the drifted duplicate worker copies at repo root vs workers/ vs runtime/); for each, determine reachability from a live entry point on the gateway live spine and the Orca dispatch plane. If any call site is reached, quarantine (VECTOR_UNAVAILABLE) and re-run the E1 corpus excluding the vector tier. Also run the Q28 degraded-mode test.

EXISTING IMPLEMENTATIONS TO SEARCH → RetrieverWorker (all copies); authority_search.py tier logic (Tier 1 Postgres → Tier 2 local JSON → Tier 3 Qdrant); every Qdrant client construction (sovereignty audit against declared ProjectionAuthority / EmbeddingAuthority); the duplicate worker copies (observation_worker 162 vs 96 lines, claim_worker, replay_worker, constitutional_runtime 152 vs 230 lines).

SEMANTIC OWNER → Retrieval / embedding authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None.

CONSEQUENCE IF LEFT UNKNOWN → Silent corrupt retrieval presented as evidence; service failure disguised as empty result; the exact failure the constitution forbids.

CAN SPRINT START WITHOUT IT? → YES once the reachability audit completes; the audit itself is first-24h work (read-only).

DEFAULT SAFE POSTURE → If the SHA256 pseudo-vector implementation is reached, quarantine it and report VECTOR_UNAVAILABLE. Retrieval must expose FULL, DEGRADED, or UNAVAILABLE. Failure never means "no evidence."

---

## U9. Authoritative repo-to-tenant binding before GitHub ingestion

UNKNOWN → No live GitHub ingestion exists (GitHubTrendingScanner: 990 lines, trending scrape + ~35 search API queries + pinned-SHA enrichment; every run re-queries from zero; orchestrator continuous mode that nothing runs; patch7_real_intake.py local driver; ~/workspace/git-ingestion/ design only). No repo-to-tenant binding exists anywhere. Incremental-ingestion verdict: ASPIRATIONAL (only SHA-pair comparison with 5 statuses; zero hits for changed_files/changed_symbols in the research pipeline). Webhook D0 funnel is design only.

WHY IT MATTERS → Gates the entire GitHub reached-slice wave. Without binding, any ingested repo becomes unattributed knowledge (hostile verdict: "A GitHub repo cannot silently become B knowledge: ASSUMED"). The smallest trustworthy reached slice cannot start.

CURRENT EVIDENCE → lanes/ingestion-search.md; duplicate-work instances (github_scanner.py vs .bak inside the importable package; Patch 7 intake on two machines; every scan re-ingests from zero into local files PING never consumes). The only live external path into PING's event spine is tandem/emit-observation.py (fail-closed gates verified), and nothing from GitHub flows through it.

COMPETING HYPOTHESES → H1: binding = explicit owner authorization record (D-68 repo watchlist authorization is HUMAN-AUTHORITY) mapping repo → tenant before any fetch. H2: binding can be derived from existing tenant-kit work (P-092). H3: ingestion stays out of the sprint entirely; the binding question moves to post-sprint planning.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Attempt the smallest trustworthy reached slice against a fixture repo: AUTHORIZED REPO → DELIVERY/RECONCILIATION FETCH → IMMUTABLE SOURCE OBSERVATION → COMMIT IDENTITY → CHANGE DETECTION → CHANGED FILES/SYMBOLS → DEPENDENCY IMPACT → CLAIMS/EVIDENCE → KNOWLEDGE IMPACT → MISSION IMPACT. Assert the pipeline refuses to create OBSERVATION_CREATED events without an authorization record. Do not build a GitHub platform before the binding exists.

EXISTING IMPLEMENTATIONS TO SEARCH → GitHubTrendingScanner; patch7_real_intake.py; tandem/emit-observation.py (fail-closed gates as the pattern to reuse); ~/workspace/git-ingestion/ (design); D-68 authorization shape; Crawl4AI 0.9.4 (useful acquisition machinery; security release illustrates why FYD must not casually own crawler infrastructure; adopt only where current acquisition fails, retaining FYD/PING network and secret boundaries).

SEMANTIC OWNER → Repository ingestion authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None.

CONSEQUENCE IF LEFT UNKNOWN → Ingested code becomes unattributed knowledge; no tenant can trust repo-derived claims; GitHub wave cannot start safely.

CAN SPRINT START WITHOUT IT? → YES. Ingestion is not in the first 24 hours; the binding contract is the planning deliverable.

DEFAULT SAFE POSTURE → No live ingestion until the binding exists. Design-only stays design-only. Use the escalation ladder (HTTP/structured data → HTML → crawler library → headless browser → agent discovers procedure → save procedure → deterministic replay); evaluate Crawl4AI only where current acquisition fails.

---

## U10. What durable decision record should converge from the existing four shapes

UNKNOWN → Four decision-record shapes exist: (1) jev/shadow-recorder branch (decision-record schema + tests + MC event spec, the exact store the autonomy map said "deliberately not created"); (2) JEV_DECISION_EVALUATED event_data schema v1 (design); (3) fyd-intel/jev-decisions.jsonl (9 live records: 8 choice, 1 noul); (4) ping-decision-seam/shadow-decisions-2026-09-28.json (6 samples, contract mc.authorize_work_order/v1, fields current/current_reason/evidence_digest/id/input_digest/p_grant/shadow_http/shadow_latency_ms). Highest-leverage observability gap: journal typed decision records as first-class events. Every gate already produces a typed decision in code (authorizeWorkOrder 8 checks, reconcileGate typed refusals, verifyResultEnvelope gates, orca_policy.js records). None is journaled or projected; MC shows only the verdict.

WHY IT MATTERS → One read-only projection of decision records through the existing journal answers three autonomy questions at once (what decisions it is making, what authority exists, what was verified) and unblocks three absent attention items (RECONCILIATION REQUIRED, FAILED VERIFICATION, POLICY DECISION) with no new authority and no new store. Needed for Mission Control truth in the first 24 hours. Without it, every UNKNOWN mission renders "RECONCILIATION IN PROGRESS" while no reconciler exists (the MOCK element).

CURRENT EVIDENCE → lanes/mission-control.md (10 autonomy questions: 0 ANSWERED / 8 PARTIAL / 1 MOCK / 1 ABSENT; attention queue 0 fully real / 2 partial / 2 real-backend-with-absent-projection / 6 absent; causal spine 12 of 17 links present or partial). Shadow spike per-record schema finalized: decision_id, decision_type (D-01..D-72), contract_version (systemone-v1/jev-1.13.0), input_digest, evidence_digest, current_result, current_reason, jev_result, jev_distribution, jev_latency_ms, jev_cost_usd, model, verified_label, label_source, eventual_outcome, outcome_source.

COMPETING HYPOTHESES → H1: shadow-recorder branch schema wins (has tests + MC event spec). H2: the shadow-decisions.json per-record shape wins (already implements required fields on real samples). H3: JEV_DECISION_EVALUATED event_data v1 wins (designed for the journal). Likely convergence: one schema with the union of fields, journaled as typed events through the existing journal.

EXACT OBSERVATION/TEST THAT RESOLVES IT → Replay the 9 + 6 existing records through each candidate schema; the winner round-trips all 15 records losslessly and supports the MC projection queries (decisions by authority, verification trail, reconciliation-required). No new store; journal typed records as events.

EXISTING IMPLEMENTATIONS TO SEARCH → jev/shadow-recorder branch (schema + tests + 3 demo records + MC event spec); JEV_DECISION_EVALUATED event_data schema v1; fyd-intel/jev-decisions.jsonl; ping-decision-seam/shadow-decisions-2026-09-28.json; TypedDecision (do-not-reimplement register: SEARCH FIRST); decision recorder implementations; orca_policy.js typed records.

SEMANTIC OWNER → Decision records / evidence authority. Currently UNASSIGNED.

ACTIVE WRITER/COLLISION → None.

CONSEQUENCE IF LEFT UNKNOWN → Mission Control keeps projecting verdicts without decision units; the MOCK "RECONCILIATION IN PROGRESS" persists; no verifiable decision trail.

CAN SPRINT START WITHOUT IT? → YES. Schema convergence is first-24h planning work; the read-only projection is later.

DEFAULT SAFE POSTURE → No new store and no new event bus. Journal typed decision records as first-class events through the existing journal. Tenant identity excluded from Jev state; hashes only in canonical records. Prefer RUN STATE UNKNOWN and RECONCILIATION REQUIRED over unsupported claims.

---

## Ranking rationale

U1 and U2 change every tenant-scoped action in the first 24 hours (Wave A hostile tests cannot be trusted without them). U3 gates all consequential dispatch (Wave B). U4 is the semantic precondition for U1. U5 is the most important genuinely missing product seam (the FYD loop). U6 gates worker autonomy. U7 gates evidence fidelity for Ask FYD. U8 is a corruption quarantine check. U9 gates a later wave but its contract is plannable now. U10 is observability; high leverage per unit of work but lower execution risk than the rest.
