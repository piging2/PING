# SEMANTIC ASSET REGISTER - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY.
Organized around semantic behavior, not branches or filenames.
Field order per unit: SEMANTIC UNIT | CANONICAL OWNER | REACHED IMPLEMENTATION | OTHER IMPLEMENTATIONS | BRANCH/WORKTREE | HEAD | DIRTY | ACTIVE WRITER | TESTS | RUNTIME REACHABILITY | KNOWN DEFECT | STRONGEST IMPLEMENTATION | MISSING BEHAVIOR | CONVERGENCE ACTION | DELETION CANDIDATES | DEPENDENCIES | HOSTILE TEST | ROLLBACK | SPRINT PRIORITY.

CANONICAL OWNER "UNASSIGNED" means: name one convergence owner at GO; until then no writer touches the unit.

---

## 1. Tenant / caller identity

- CANONICAL OWNER: UNASSIGNED (U4)
- REACHED IMPLEMENTATION: FYD demo-owner (explicitly UNVERIFIED, demo fencing); FYD journal gateway tenant checks (tenant_required / tenant_mismatch / request_id_tenant_conflict → 400)
- OTHER IMPLEMENTATIONS: identity_authority.js x3 byte-identical (sha c05060d0); claim identity; MC dispatch identity; runtime IdentityAuthority copies; cryptographic identity work; constitutional-runtime identity semantics; P-100 bootstrap substrate (549 lines, unpushed)
- BRANCH/WORKTREE: canonical /home/nolan/projects/ping (fyd/builder-harvest-trackc-2026-09-28, f877c391); tenanos-wave/P-20260923-100-bootstrap worktree
- HEAD: f877c3919941978f07d5014909595df4751ec258
- DIRTY: canonical tree 144 entries (74 M, 70 ??); identity files among the dirty set (verify per-file at GO)
- ACTIVE WRITER: none
- TESTS: FYD tenant hostile suites (spoof ingress refusal, Postgres envelope isolation, vector isolation, worker tenant pin); f-journal-privacy, g-route-isolation, h-crash-window tests (dirty, in canonical tree)
- RUNTIME REACHABILITY: FYD gateway checks reached; MC dispatch tenant-from-body reached (the defect)
- KNOWN DEFECT: MC dispatch takes tenant from HTTP body, no authenticated caller (U1); 20 handoffs include 1 accepted-from-untrusted-input, 1 incorrectly reconstructed, 5 absent
- STRONGEST IMPLEMENTATION: FYD journal gateway enforcement (reached, fail-closed)
- MISSING BEHAVIOR: caller→tenant entitlement (U1); converged identity contract with 5 separated concepts (U4)
- CONVERGENCE ACTION: CONVERGE (contract first, then consumers)
- DELETION CANDIDATES: duplicate IdentityAuthority copies after convergence (prove deadness first)
- DEPENDENCIES: U4 → U1 → all tenant-scoped claims
- HOSTILE TEST: J-19 (Tenant A data in Tenant B context); Wave A repros 1-4
- ROLLBACK: n/a (no change yet); demo fencing stays intact throughout
- SPRINT PRIORITY: P0 (Wave 1)

## 2. Entitlement (caller → tenant)

- CANONICAL OWNER: UNASSIGNED (U1)
- REACHED IMPLEMENTATION: none. Grant issuance explicitly "future".
- OTHER IMPLEMENTATIONS: P-092 tenant-kit (556 lines, unpushed, STATE.json claims "integrated" but not in canonical tree); SLICE_TENANTS static allowlist (not entitlement)
- BRANCH/WORKTREE: tenanos-wave/P-20260923-092-tenant-kit worktree (/home/nolan/projects/ping-wave-P-20260923-092)
- HEAD: 6cbd64afd693dba616ce01ec4b12e692de282ffa
- DIRTY: worktree clean (0 entries per STEP0)
- ACTIVE WRITER: none (Jev track surgical patch HELD)
- TESTS: none for entitlement (gap)
- RUNTIME REACHABILITY: absent on all live paths
- KNOWN DEFECT: the gap itself; downstream inherits unproven labels as authoritative
- STRONGEST IMPLEMENTATION: P-092 as the only implementation cache (unverified)
- MISSING BEHAVIOR: the entire mechanism (authenticate caller → resolve binding → authorize)
- CONVERGENCE ACTION: HARVEST (inspect P-092) then BUILD only if harvest insufficient
- DELETION CANDIDATES: none
- DEPENDENCIES: U4 identity contract
- HOSTILE TEST: submit Tenant A work labeled Tenant B; assert refusal at each boundary
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 1)

## 3. Namespace propagation

- CANONICAL OWNER: UNASSIGNED (U2)
- REACHED IMPLEMENTATION: event_bridge.js → unified_event_runtime.js:237 (defaults missing namespace to core::system; the laundering defect, reached)
- OTHER IMPLEMENTATIONS: bridge-tenant.ts (integration branch, unwired, fail-open fallback hazard); gateway namespace binding ("requested wins iff bound"); EventToMissionBridge 28-type static map (the live spine, bypasses the bridge)
- BRANCH/WORKTREE: canonical tree; integration branch (unpushed)
- HEAD: f877c391
- DIRTY: canonical 144
- ACTIVE WRITER: none
- TESTS: hostile suites for envelope isolation (Postgres, vector)
- RUNTIME REACHABILITY: laundering path reached on the canonical bridge
- KNOWN DEFECT: every tenant event's namespace laundered to core::system; unwired fix would fall back unknown tenant to core::system (fail-open)
- STRONGEST IMPLEMENTATION: none yet; the reached FYD gateway pattern is the model
- MISSING BEHAVIOR: namespace preservation end to end; refusal on unknown/malformed tenant
- CONVERGENCE ACTION: CONVERGE (fix fallback to refuse, then wire; or bypass via live spine)
- DELETION CANDIDATES: the laundering default after the fix proves out
- DEPENDENCIES: U4 → U1
- HOSTILE TEST: Wave A repro 1 (bridge laundering), repro 4 (A→B projection contamination)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 1)

## 4. Capability

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: dispatch route profile LIVE + capability allowlist + broker quota; orca-adapter authorizeWorkOrder capability checks; AGENT_PROFILES.maxConstraints (adapter data)
- OTHER IMPLEMENTATIONS: MayExecutePolicy; RuleClaimDecisionProvider; capability propagation through the authority (fyd-g4, reached in build family)
- BRANCH/WORKTREE: canonical tree; Pig vendor/external_agent_adapter.js
- HEAD: f877c391
- DIRTY: canonical 144
- ACTIVE WRITER: none
- TESTS: authorizeWorkOrder 8 fail-closed checks (reached)
- RUNTIME REACHABILITY: reached on dispatch paths
- KNOWN DEFECT: capability+namespace-shape auth explicit, but no caller-to-tenant entitlement behind it (U1); authority posture is adapter data, not per-order decision (U6)
- STRONGEST IMPLEMENTATION: authorizeWorkOrder 8 checks
- MISSING BEHAVIOR: per-order authority decision; Jev ranking of eligible workers only (future)
- CONVERGENCE ACTION: KEEP (reached) + HARVEST (P-092 if relevant)
- DELETION CANDIDATES: none
- DEPENDENCIES: U1 entitlement; U6 envelope
- HOSTILE TEST: capability escalation attempt (worker claims capability outside allowlist)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1 (Wave 6)

## 5. Authority

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: authorizeWorkOrder (8 checks); orca_policy.js x3 (worktree copies); TypedDecision records in code (not journaled)
- OTHER IMPLEMENTATIONS: ExecutionAuthority/ExecutionAdapter/WorkerRuntime as named authorities (DECLARED-ONLY; functions exist under other names); constitutional authority law work
- BRANCH/WORKTREE: Pig vendor adapter; constitutional-convergence worktrees
- HEAD: various
- DIRTY: ping-constitutional worktree 12 entries
- ACTIVE WRITER: none
- TESTS: 8 fail-closed checks (reached)
- RUNTIME REACHABILITY: reached on Orca dispatch plane
- KNOWN DEFECT: declared authorities without enforcement are comments, not sovereignty; audit bypass paths before claiming
- STRONGEST IMPLEMENTATION: authorizeWorkOrder
- MISSING BEHAVIOR: journaled authority trail (U10)
- CONVERGENCE ACTION: KEEP + CONVERGE (U10 for the trail)
- DELETION CANDIDATES: declared-only authority names after proof they are unreferenced
- DEPENDENCIES: U4 identity; U10 decision records
- HOSTILE TEST: bypass-path audit (worker secretly constructing Qdrant client, direct .encode(), independent UUID minting)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 6. Approval

- CANONICAL OWNER: UNASSIGNED (directive: harvest phase1 door)
- REACHED IMPLEMENTATION: phase1/approval-door-2026-09-28 at af7d2688 (17/17, terminal-first ratified, FROZEN, tag phase1-frozen-2026-09-28, NOT pushed); FYD customize parse/approve/clear (live demo path, demo-stamped)
- OTHER IMPLEMENTATIONS: mc/approval-request branch (ApprovalRequest primitive + validator + CLI, second repo); stale-guard 409 layer (uncommitted in canonical dirty tree, claimed landed by the held convergence attempt: UNVERIFIED)
- BRANCH/WORKTREE: /home/nolan/worktrees/phase1-approval-door (af7d2688); canonical tree (dirty)
- HEAD: af7d2688 (phase1); f877c391 (canonical)
- DIRTY: phase1 worktree clean (frozen); canonical 144
- ACTIVE WRITER: none (phase1 lane frozen after green)
- TESTS: 17/17 acceptance on implementation worktree AND pristine replay checkout, byte-identical replay; full suite 2336/2363, 27 known pre-existing failures; customize 130/130 claimed by held attempt (UNVERIFIED)
- RUNTIME REACHABILITY: phase1 door proven in worktree + replay; FYD customize path proven live (TWO_SITE_VERIFICATION)
- KNOWN DEFECT: no explicit reject action in FYD customize (parse-without-approve is the implicit reject; contract question, not necessarily defect)
- STRONGEST IMPLEMENTATION: phase1 approval door (af7d2688)
- MISSING BEHAVIOR: convergence of FYD customize approval with the phase1 door (P0)
- CONVERGENCE ACTION: HARVEST (phase1 door as the human-authority door) + CONVERGE (FYD path)
- DELETION CANDIDATES: weaker duplicate approval implementation after the harvest proves out
- DEPENDENCIES: U10 (decision trail); U5 (approval → invalidation)
- HOSTILE TEST: stale-base-on-terminal (ALREADY_DECIDED, zero mutation); double-approve idempotency; 13 hostile gates script (claimed, UNVERIFIED)
- ROLLBACK: phase1 tag af7d2688 is the rollback point; do not push without Nolan's word
- SPRINT PRIORITY: P0

## 7. WorkOrder

- CANONICAL OWNER: UNASSIGNED (U6)
- REACHED IMPLEMENTATION: orca-adapter issueWorkOrder (deterministic work_order_id = sha256('workorder:'+taskId)[0:16]); mission_intent.py validate → authorize → issue → dispatch
- OTHER IMPLEMENTATIONS: E2 authority doc; E3 reference copy; E4 harvested contract; E6 unit lifecycle; E7 proposed unified spec (not implemented)
- BRANCH/WORKTREE: Pig vendor/external_agent_adapter.js (authoritative copy on Pig)
- HEAD: n/a (Pig-side)
- DIRTY: unknown (Pig-side; verify at GO)
- ACTIVE WRITER: none
- TESTS: J4 executor-routing shadow harness 37/37 (fixtures, not live dispatch)
- RUNTIME REACHABILITY: reached on Orca dispatch plane (~30 dispatches/day)
- KNOWN DEFECT: authority posture adapter-data (U6); objective fidelity unfenced
- STRONGEST IMPLEMENTATION: E1 live surface
- MISSING BEHAVIOR: per-order authority decision; objective-fidelity fencing
- CONVERGENCE ACTION: CONVERGE (E1 as reference; others as documentation)
- DELETION CANDIDATES: E2–E7 docs after convergence (archive, not silent delete)
- DEPENDENCIES: U1 entitlement; U4 identity; U3 reconciliation
- HOSTILE TEST: J-16 (worker claims success while tests fail); worker swap authority-basis test
- ROLLBACK: n/a
- SPRINT PRIORITY: P1 (Wave 6)

## 8. ResultEnvelope

- CANONICAL OWNER: UNASSIGNED (U6)
- REACHED IMPLEMENTATION: verifyResultEnvelope (8-field structural echo-binding); extractEnvelope (brace-match); recordVerifiedResult → WORKER_COMPLETED event
- OTHER IMPLEMENTATIONS: E5 outcome vocabulary; E6 unit lifecycle
- BRANCH/WORKTREE: Pig vendor adapter
- HEAD: n/a (Pig-side)
- DIRTY: unknown (verify at GO)
- ACTIVE WRITER: none
- TESTS: structural echo-binding tests (reached)
- RUNTIME REACHABILITY: reached on dispatch plane
- KNOWN DEFECT: structural only; a well-formed lie passes (J-16); VERIFICATION → OUTCOME reached but shallow
- STRONGEST IMPLEMENTATION: verifyResultEnvelope + D-08 worker-result usefulness judge (advisory, shadow)
- MISSING BEHAVIOR: semantic verification (D-08 as the bounded judge); objective-fidelity binding
- CONVERGENCE ACTION: KEEP + CONVERGE (U6)
- DELETION CANDIDATES: none
- DEPENDENCIES: U7 (evidence completeness for verification); U10 (verdict trail)
- HOSTILE TEST: J-16; structurally valid but semantically false result (Wave C fixture)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 9. Attempts

- CANONICAL OWNER: UNASSIGNED (U3 family)
- REACHED IMPLEMENTATION: MissionScheduler 5s poll (renew leases, reap expired, dispatch via MISSION_WORKER_MAP); WorkerRuntime.dispatch (first-match eventTypes, maxConcurrent guard)
- OTHER IMPLEMENTATIONS: attempt-fencing.ts; P-103 attempt-fencing; durable attempt schema
- BRANCH/WORKTREE: gateway (Pig); integration branch
- HEAD: various
- DIRTY: unknown (verify at GO)
- ACTIVE WRITER: none
- TESTS: fencing tests (zombie writes match zero rows)
- RUNTIME REACHABILITY: reached on gateway live spine
- KNOWN DEFECT: reaper gap (reapExpiredLeases resets HOLD → created → redispatch ~60s); MC dispatcher synchronous, uses none of the fencing machinery
- STRONGEST IMPLEMENTATION: attempt-fencing.ts + lease.ts fencing-token CAS
- MISSING BEHAVIOR: U3 winner wired to the dispatch path
- CONVERGENCE ACTION: CONVERGE (U3)
- DELETION CANDIDATES: none
- DEPENDENCIES: U3
- HOSTILE TEST: Wave B corpus (duplicate submission; zombie result; lease expiration after possible effect)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 2)

## 10. Run state

- CANONICAL OWNER: UNASSIGNED (U3 family)
- REACHED IMPLEMENTATION: classifyUnknownExecution (integration branch, unwired at dispatch); P-095 run-state-authority (unpushed)
- OTHER IMPLEMENTATIONS: MC display hardcodes RUNNING for inprogress dir (MOCK element)
- BRANCH/WORKTREE: integration branch; tenanos-wave/P-20260923-095-run-state worktree (clean)
- HEAD: 82ed23e67ad5373b8009c943385007b9b6a6f47a
- DIRTY: clean
- ACTIVE WRITER: none
- TESTS: classification tests (integration branch)
- RUNTIME REACHABILITY: unwired at dispatch (reached MC dispatcher is synchronous)
- KNOWN DEFECT: MC "RUNNING" claim not evidence-backed (no process liveness bound to dir listing)
- STRONGEST IMPLEMENTATION: classifyUnknownExecution (total over evidence cube)
- MISSING BEHAVIOR: wiring to dispatch; honest projection (RUN STATE UNKNOWN)
- CONVERGENCE ACTION: CONVERGE (U3)
- DELETION CANDIDATES: the hardcoded RUNNING display after honest projection lands
- DEPENDENCIES: U3; U10 (projection)
- HOSTILE TEST: stale leftover dir renders as RUNNING (must show RUN STATE UNKNOWN)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 11. UNKNOWN (state)

- CANONICAL OWNER: UNASSIGNED (U3 family)
- REACHED IMPLEMENTATION: UNKNOWN as first-class state (MC projection); VERIFICATION → OUTCOME: UNKNOWN never collapses to FAILED (reached)
- OTHER IMPLEMENTATIONS: feat/orca-unknown-outcome-port (per-class effect adapters, 590-line core + 4 classes + tests, second repo)
- BRANCH/WORKTREE: second repo /home/nolan/workspace (40+ branches)
- HEAD: various
- DIRTY: unknown (verify at GO)
- ACTIVE WRITER: none
- TESTS: per-class effect adapter tests (second repo)
- RUNTIME REACHABILITY: UNKNOWN state reached in MC projection; outcome port unwired
- KNOWN DEFECT: UNKNOWN renders as "RECONCILIATION IN PROGRESS" with no reconciler (MOCK)
- STRONGEST IMPLEMENTATION: the reached UNKNOWN-never-collapses-to-FAILED semantic
- MISSING BEHAVIOR: reconciler behind the label (U3); honest projection (U10)
- CONVERGENCE ACTION: KEEP (semantic) + CONVERGE (port)
- DELETION CANDIDATES: the MOCK label after the reconciler or honest label lands
- DEPENDENCIES: U3; U10
- HOSTILE TEST: lost-result case indistinguishable from RUNNING (must show RUN STATE UNKNOWN)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 2)

## 12. HOLD

- CANONICAL OWNER: UNASSIGNED (U3)
- REACHED IMPLEMENTATION: none reached (f01 never committed; S5 on unpushed branch)
- OTHER IMPLEMENTATIONS: f01 HOLD reaper (21/21); S5 reconcile gate; HOLD_NEEDS_RECONCILIATION (classifyUnknownExecution)
- BRANCH/WORKTREE: ~/workspace/f01-fix/; second repo mc/lane-c-reconcile-gate
- HEAD: n/a (workspace dir); branch tip (verify at GO)
- DIRTY: f01 is a workspace dir (uncommitted by design)
- ACTIVE WRITER: none
- TESTS: f01 21/21 green since 2026-09-24
- RUNTIME REACHABILITY: not reached (shipped zero times)
- KNOWN DEFECT: reaper gap (HOLD → created → redispatch)
- STRONGEST IMPLEMENTATION: f01 (most tested)
- MISSING BEHAVIOR: commit/owner decision to wire (not a rebuild)
- CONVERGENCE ACTION: WIRE (after U3 comparison) or CONVERGE
- DELETION CANDIDATES: loser implementations after the corpus comparison (archive first)
- DEPENDENCIES: U3
- HOSTILE TEST: Wave B corpus (restart with HOLD present; reconciliation crash)
- ROLLBACK: n/a (nothing wired yet)
- SPRINT PRIORITY: P0 (Wave 2)

## 13. Reconciliation

- CANONICAL OWNER: UNASSIGNED (U3)
- REACHED IMPLEMENTATION: proven lifecycle OPEN → KNOWN_PERMANENT → RESOLVED → REOPENED (13/13 tests, idempotent, auditable)
- OTHER IMPLEMENTATIONS: f01 reconciliation-only transitions; S5 reconcile gate; human-authority reconciliation (D-71)
- BRANCH/WORKTREE: test location (verify at GO)
- HEAD: n/a
- DIRTY: n/a
- ACTIVE WRITER: none
- TESTS: 13/13 lifecycle tests
- RUNTIME REACHABILITY: lifecycle proven in tests; not wired to dispatch
- KNOWN DEFECT: none in the lifecycle; the gap is wiring
- STRONGEST IMPLEMENTATION: the proven lifecycle (the yardstick)
- MISSING BEHAVIOR: dispatch-path wiring (U3 winner)
- CONVERGENCE ACTION: KEEP (lifecycle) + WIRE (winner)
- DELETION CANDIDATES: none
- DEPENDENCIES: U3
- HOSTILE TEST: Wave B corpus
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 2)

## 14. Recovery

- CANONICAL OWNER: UNASSIGNED (U3 family)
- REACHED IMPLEMENTATION: recover.ts pattern (new run with lineage, never resume in place) - integration branch, unwired
- OTHER IMPLEMENTATIONS: f01 _failMission (proven-failures-only); wake-lease design doc (BUILD or DROP per owner call)
- BRANCH/WORKTREE: integration branch; pig/incident-2026-09-28/draft-wake-lease-design.md
- HEAD: various
- DIRTY: unknown
- ACTIVE WRITER: none
- TESTS: recovery tests (integration branch)
- RUNTIME REACHABILITY: unwired
- KNOWN DEFECT: none known
- STRONGEST IMPLEMENTATION: recover.ts lineage pattern
- MISSING BEHAVIOR: owner call on wake lease
- CONVERGENCE ACTION: KEEP + WIRE (with U3)
- DELETION CANDIDATES: none
- DEPENDENCIES: U3
- HOSTILE TEST: death after effect before acknowledgement; death after result before journaling
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 15. Fencing

- CANONICAL OWNER: UNASSIGNED (U3 family)
- REACHED IMPLEMENTATION: fencing-token CAS (lease.ts); zombie writes match zero rows (attempt-fencing.ts)
- OTHER IMPLEMENTATIONS: P-103 attempt-fencing (627 lines + SQL, unpushed); claim.ts (atomic tenant claims)
- BRANCH/WORKTREE: integration branch; tenanos-wave/P-20260923-103-attempt-fencing (clean)
- HEAD: a9d1c9d8522e9a0dc0e3804a1d4f81fe2b2c347f
- DIRTY: clean
- ACTIVE WRITER: none
- TESTS: fencing tests (reached in implementation)
- RUNTIME REACHABILITY: implemented but unwired at dispatch (reached MC dispatcher is synchronous)
- KNOWN DEFECT: none in the mechanism; the gap is wiring
- STRONGEST IMPLEMENTATION: lease.ts CAS + attempt-fencing.ts
- MISSING BEHAVIOR: dispatch-path wiring
- CONVERGENCE ACTION: WIRE (with U3)
- DELETION CANDIDATES: none
- DEPENDENCIES: U3
- HOSTILE TEST: duplicate submission mints sibling mission (J-12; must not without claim/lease at ingress)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 2)

## 16. Events

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: UnifiedEventRuntime (Postgres ping_events); canonical workers emit via UnifiedEventRuntime; WORKER_COMPLETED canonical event
- OTHER IMPLEMENTATIONS: event_bridge.js (laundering); EventToMissionBridge (28-type static map, live spine)
- BRANCH/WORKTREE: gateway (Pig); canonical tree
- HEAD: various
- DIRTY: unknown (verify at GO)
- ACTIVE WRITER: none
- TESTS: event emission tests (canonical workers)
- RUNTIME REACHABILITY: reached on gateway live spine (zero LLM calls)
- KNOWN DEFECT: bridge laundering (U2); MC journal is one global JSONL (storage boundary scoped, not universal)
- STRONGEST IMPLEMENTATION: UnifiedEventRuntime + static bridge map
- MISSING BEHAVIOR: namespace preservation (U2); journaled decision records (U10)
- CONVERGENCE ACTION: KEEP + CONVERGE (U2)
- DELETION CANDIDATES: none (do not build another event bus, ever)
- DEPENDENCIES: U2
- HOSTILE TEST: tenant event through bridge (namespace preserved?)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 17. Evidence

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: Ask FYD evidence binding (binding verifier + verifyAnswerClaims SUPPORTED/DERIVED/INFERRED/UNKNOWN); why-this (claim → evidence, DIRECT support); FYD journal events carry event_id, timestamp, tenant_id, aggregate_id
- OTHER IMPLEMENTATIONS: CognitiveSupervisor validate_or_raise + _enforce_authority (cognitive path only); authority_search.py rank (CONSTITUTIONAL_LAW above TEMPORARY_OBSERVATION)
- BRANCH/WORKTREE: canonical tree (dirty: ask/binding files among the 144)
- HEAD: f877c391
- DIRTY: 144 (ask + binding-verifier files dirty; diff at GO)
- ACTIVE WRITER: none
- TESTS: 511/512 ask/proceduralize/sitespec/edge tests claimed by held attempt (UNVERIFIED; 1 documented pre-existing); binding verifier tests (reached)
- RUNTIME REACHABILITY: Ask FYD + why-this proven live (TWO_SITE_VERIFICATION)
- KNOWN DEFECT: EVIDENCE → PROCESSOR broken in ORCA (U7); Qdrant candidates stamped TEMPORARY_OBSERVATION with lineage_depth 0 (mechanical verification False by construction)
- STRONGEST IMPLEMENTATION: binding verifier at the SiteSpec/projection seam + verifyAnswerClaims
- MISSING BEHAVIOR: U7 fix; U8 quarantine; reduced-retrieval indicator (Q28)
- CONVERGENCE ACTION: KEEP + CONVERGE (U7)
- DELETION CANDIDATES: none
- DEPENDENCIES: U7; U8; U10 (trail)
- HOSTILE TEST: Wave C fixtures (objective-fidelity violation; stale/contradictory/missing evidence; reduced retrieval state)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 3)

## 18. Observations

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: observation_worker.py (DOCUMENT_IMPORTED → chunked OBSERVATION_CREATED); tandem/emit-observation.py (only live external path; fail-closed gates: semantic-domain gate, human-verification requirement, sha256 duplicate-emission guard, durable spool before POST, probe-before-POST crash recovery)
- OTHER IMPLEMENTATIONS: drifted duplicate worker copies (observation_worker 162 vs 96 lines; all DIFFER)
- BRANCH/WORKTREE: canonical tree / workers/
- HEAD: f877c391
- DIRTY: 144 (verify worker files at GO)
- ACTIVE WRITER: none
- TESTS: observation worker tests (reached)
- RUNTIME REACHABILITY: reached on gateway spine
- KNOWN DEFECT: duplicate copies diverge; running the wrong copy silently changes OBSERVATION_CREATED semantics
- STRONGEST IMPLEMENTATION: canonical workers/ copies (verify which is reached at GO)
- MISSING BEHAVIOR: per-authority enforcement (not per-implementation)
- CONVERGENCE ACTION: CONVERGE (prove reached copy, then delete drifted copies)
- DELETION CANDIDATES: drifted duplicates after reached-copy proof (blocked until then)
- DEPENDENCIES: U9 (repo binding for GitHub observations)
- HOSTILE TEST: run wrong copy, assert semantic divergence is detected
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 19. Claims

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: claim_worker.py (OBSERVATION_CREATED → CLAIM_GENERATED, verified: False; claims are propositions, never truth); RuleClaimDecisionProvider
- OTHER IMPLEMENTATIONS: drifted claim_worker copies (DIFFER)
- BRANCH/WORKTREE: canonical tree / workers/
- HEAD: f877c391
- DIRTY: 144 (verify at GO)
- ACTIVE WRITER: none
- TESTS: claim worker tests
- RUNTIME REACHABILITY: reached on gateway spine
- KNOWN DEFECT: evidence field carries zero semantic checks (D7); worker output provably unbound (B5 D8)
- STRONGEST IMPLEMENTATION: canonical claim_worker.py
- MISSING BEHAVIOR: semantic checks on evidence; objective-fidelity fencing (U6)
- CONVERGENCE ACTION: CONVERGE (dedupe copies)
- DELETION CANDIDATES: drifted duplicates after proof
- DEPENDENCIES: U7 (evidence completeness)
- HOSTILE TEST: claim with unbound output (must be flagged)
- ROLLBACK: n/a
- SPRINT PRIORITY: P1

## 20. ContextPack

- CANONICAL OWNER: UNASSIGNED (U7; directive: name one convergence owner at GO)
- REACHED IMPLEMENTATION: context_compiler.js (mission execution; deterministic context_pack_id from missionId/query/correlationId/retrievalManifest); context_pack.py (cognitive Q&A; confidence = passed/6 checks; 24h TTL cache)
- OTHER IMPLEMENTATIONS: build-context-pack.py (tandem/Meta AI); P-098 context-pack.ts (321 lines, unpushed); ContextPack v2 context-compiler.ts (API-incompatible with proven path); contextpack-wire-2026-09-28 branch (9a555021); context_pack.py x5 byte-identical (sha 1cb71d44)
- BRANCH/WORKTREE: canonical tree; /home/nolan/projects/ping-worktrees/contextpack-2026-09-28 (9a555021); tenanos-wave/P-20260923-098-context-pack (clean, 13f21b59)
- HEAD: 9a555021 (wire branch); f877c391 (canonical)
- DIRTY: wire worktree status unknown (verify at GO); canonical 144
- ACTIVE WRITER: none (freeze competing writers at GO)
- TESTS: context_pack.py validation tests; v2 6/6 claimed (UNVERIFIED)
- RUNTIME REACHABILITY: compilers reached on their respective paths; no single authority
- KNOWN DEFECT: U7 (evidence loss); no sufficiency decider on JS compiler; three scopes, three owners, one name
- STRONGEST IMPLEMENTATION: none declared; U7 comparison decides
- MISSING BEHAVIOR: one pipeline (OBJECT GRAPH + EVIDENCE + VIEWER/TENANT + QUESTION + CAPABILITIES → CONTEXT PACK → ASK FYD); sufficiency gate
- CONVERGENCE ACTION: CONVERGE (U7); do NOT write another context system
- DELETION CANDIDATES: weaker compilers after proof (archive first)
- DEPENDENCIES: U7; U8 (retrieval integrity); U1 (tenant scoping of packs)
- HOSTILE TEST: orca-run-mu6wmbzn exact reproduction; Tenant A → Tenant B ContextPack contamination (Wave A repro 3)
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 3)

## 21. Retrieval

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: lexical tier (lexical_baseline.py: path tokens 3x, content-head tokens 1x, binary per-token presence); authority_search.py Tier 1 Postgres → Tier 2 local JSON → Tier 3 Qdrant; exact lookup; Postgres queries; object relationships (graph_expand depth 2, lineage_search)
- OTHER IMPLEMENTATIONS: RetrieverWorker._qdrant_search (fail-silent []); _text_to_vector (sha256-seeded PRNG fake); SearchWorker ("never answers directly from vector search")
- BRANCH/WORKTREE: canonical tree; shadow-spike dir
- HEAD: f877c391
- DIRTY: 144
- ACTIVE WRITER: none
- TESTS: E1 baseline self-check (19/25 top-1); hostile suites (namespace-required search vs live Qdrant/Postgres)
- RUNTIME REACHABILITY: lexical/structured reached; vector tier DEGRADED (Qdrant offline since 2026-09-28 15:40 MDT)
- KNOWN DEFECT: fake vector (U8); fail-silent tiers; no reduced-retrieval indicator (Q28 unanswered)
- STRONGEST IMPLEMENTATION: lexical baseline (0.760, frozen)
- MISSING BEHAVIOR: U8 audit; FULL/DEGRADED/UNAVAILABLE exposure; Q28 degraded-mode test
- CONVERGENCE ACTION: KEEP (lexical) + quarantine audit (U8)
- DELETION CANDIDATES: the fake vector path if reached (quarantine, then remove)
- DEPENDENCIES: U8
- HOSTILE TEST: take Qdrant down deliberately; assert visible reduced-retrieval indicator and refusal rather than confabulation
- ROLLBACK: n/a
- SPRINT PRIORITY: P0 (Wave 3)

## 22. Repository identity / acquisition

- CANONICAL OWNER: UNASSIGNED (U9)
- REACHED IMPLEMENTATION: none live (no GitHub events in PING's spine)
- OTHER IMPLEMENTATIONS: GitHubTrendingScanner (990 lines); patch7_real_intake.py; tandem/emit-observation.py (live path, GitHub not flowing); ~/workspace/git-ingestion/ (design)
- BRANCH/WORKTREE: canonical tree; workspace design dir
- HEAD: f877c391
- DIRTY: 144
- ACTIVE WRITER: none
- TESTS: none for the reached slice (aspirational)
- RUNTIME REACHABILITY: absent (zero GitHub events; System-2 cost per GitHub event is zero)
- KNOWN DEFECT: the absence itself; duplicate scanner copies; every scan re-ingests from zero
- STRONGEST IMPLEMENTATION: GitHubTrendingScanner as machinery; emit-observation.py gates as the pattern
- MISSING BEHAVIOR: repo→tenant binding (U9); webhook D0 funnel; incremental chain (SHA → files → symbols → dependencies → knowledge → missions)
- CONVERGENCE ACTION: HARVEST (patterns) + BUILD only after U9 binding
- DELETION CANDIDATES: github_scanner.py .bak after dedupe proof
- DEPENDENCIES: U9
- HOSTILE TEST: ingest without authorization record; assert refusal to create OBSERVATION_CREATED
- ROLLBACK: n/a
- SPRINT PRIORITY: P2 (Wave 7)

## 23. Projection / invalidation

- CANONICAL OWNER: UNASSIGNED (U5)
- REACHED IMPLEMENTATION: FYD dump.py (clean at HEAD; deterministic re-dump); projections at /home/nolan/ping/var/fyd-projections/; MC projection layer (real projection layer, honest truth-law)
- OTHER IMPLEMENTATIONS: unverified regen-trigger.ts (held attempt; read-only reference only); SiteSpec pipeline (spec-pipeline.ts, apply-layer.ts, clean)
- BRANCH/WORKTREE: canonical tree; /home/nolan/projects/ping-fyd-converged (claimed, UNVERIFIED)
- HEAD: f877c391
- DIRTY: 144 (projection-adjacent files dirty; diff at GO)
- ACTIVE WRITER: none
- TESTS: dump determinism (base graphDigest stable across dumps, TWO_SITE_VERIFICATION)
- RUNTIME REACHABILITY: dump.py reached (manual); auto-invalidation absent
- KNOWN DEFECT: approve→serve manual re-dump (U5); served :3100 build ~21h older than inspected worktree at MC audit time
- STRONGEST IMPLEMENTATION: dump.py (deterministic)
- MISSING BEHAVIOR: generic transition → invalidation → rebuild → freshness-proof (U5)
- CONVERGENCE ACTION: CONVERGE (U5); do NOT special-case approve→re-dump
- DELETION CANDIDATES: none
- DEPENDENCIES: U5; source=build=served binding
- HOSTILE TEST: approve change; assert affected projections rebuild and freshness proof exists (or honest lag visible)
- ROLLBACK: last good projection always serves (atomic publish)
- SPRINT PRIORITY: P0 (Wave 8; U5 semantics in first 24h)

## 24. Decision records

- CANONICAL OWNER: UNASSIGNED (U10)
- REACHED IMPLEMENTATION: typed decisions produced in code at every gate (authorizeWorkOrder, reconcileGate, verifyResultEnvelope, orca_policy.js); none journaled
- OTHER IMPLEMENTATIONS: jev/shadow-recorder branch (schema + tests + MC event spec); JEV_DECISION_EVALUATED event_data v1; fyd-intel/jev-decisions.jsonl (9); shadow-decisions-2026-09-28.json (6); shadow spike per-record schema (finalized)
- BRANCH/WORKTREE: second repo /home/nolan/workspace (jev/shadow-recorder); canonical tree
- HEAD: various
- DIRTY: unknown (verify at GO)
- ACTIVE WRITER: none
- TESTS: shadow-recorder branch tests; 37/37 J4 harness (fixtures)
- RUNTIME REACHABILITY: produced but not journaled/projected
- KNOWN DEFECT: MC shows verdicts only; "RECONCILIATION IN PROGRESS" MOCK
- STRONGEST IMPLEMENTATION: none declared; U10 round-trip decides
- MISSING BEHAVIOR: journaling as first-class events; read-only MC projection
- CONVERGENCE ACTION: CONVERGE (U10)
- DELETION CANDIDATES: loser schemas after round-trip (archive)
- DEPENDENCIES: U10
- HOSTILE TEST: round-trip all 15 records through each schema; assert lossless + query support
- ROLLBACK: n/a
- SPRINT PRIORITY: P1 (Wave 4)

## 25. Worker / processor selection

- CANONICAL OWNER: UNASSIGNED (U6 family)
- REACHED IMPLEMENTATION: MISSION_WORKER_MAP static constant; WorkerRuntime first-match on eventTypes; agentId caller-supplied constant (no selection exists; the Jev-sized hole)
- OTHER IMPLEMENTATIONS: AIRuntime.selectModel() (static preference order, not intelligent routing); J4 shadow harness (37/37)
- BRANCH/WORKTREE: gateway (Pig); canonical tree
- HEAD: various
- DIRTY: unknown
- ACTIVE WRITER: none
- TESTS: J4 fixtures
- RUNTIME REACHABILITY: static map reached; selection absent
- KNOWN DEFECT: no selection authority (ABSENT); OmniRouter ABSENT
- STRONGEST IMPLEMENTATION: none (greenfield within constraints)
- MISSING BEHAVIOR: WORK → REQUIRED CAPABILITIES → DETERMINISTIC ELIGIBILITY → CANDIDATES → EMPIRICAL PERFORMANCE → COST/LATENCY → OPTIONAL JEV RANKING → SELECT → AUTHORITY REVALIDATION → DISPATCH (Jev ranks only already-eligible workers)
- CONVERGENCE ACTION: BUILD (only after U6 envelope + U1 entitlement)
- DELETION CANDIDATES: none
- DEPENDENCIES: U6; U1; U3
- HOSTILE TEST: ineligible worker must never be selected; selection record per dispatch
- ROLLBACK: n/a
- SPRINT PRIORITY: P2 (Wave 6)

## 26. Mission Control

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: dashboard with real projection layer and honest truth-law (not a control plane, not a mock); 12 of 17 causal-spine links present or partial
- OTHER IMPLEMENTATIONS: none (no competing MC)
- BRANCH/WORKTREE: canonical tree (src/app/api/mc/*); MC routes dirty in canonical tree (FREEZE per CLASSIFICATION.md unit 14; tenant-from-body gap lives here)
- HEAD: f877c391
- DIRTY: 144 (mc-dispatch + new MC routes dirty; FREEZE, do not harvest into convergence)
- ACTIVE WRITER: none (MC dispatch patch HELD)
- TESTS: autonomy questions 0/10 answered, 8 partial, 1 mock, 1 absent
- RUNTIME REACHABILITY: reached as projection; not a control plane
- KNOWN DEFECT: RUNNING overclaim (MOCK); "RECONCILIATION IN PROGRESS" MOCK; attention queue absent as a concept; projectMissions/loadJournalEvents global (no caller tenant)
- STRONGEST IMPLEMENTATION: the existing projection layer (truth-law honest)
- MISSING BEHAVIOR: U10 projection (decisions/authority/verification); honest RUN STATE UNKNOWN; tenant-scoped projection (U1)
- CONVERGENCE ACTION: KEEP (projection layer) + CONVERGE (U10); truth connections, not a dashboard redesign
- DELETION CANDIDATES: MOCK labels after honest projection lands
- DEPENDENCIES: U10; U1; source=build=served
- HOSTILE TEST: stale inprogress dir must not render RUNNING; UNKNOWN must not render RECONCILIATION IN PROGRESS
- ROLLBACK: n/a
- SPRINT PRIORITY: P1 (Wave 4)

## 27. Outcomes

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: outcome records plentiful and mostly typed (LEDGER, FAILURE_LEDGER, learnings, angle-performance, intent ledger, action-truth, HOLD/UNKNOWN register: L6–L12); VERIFICATION → OUTCOME reached (UNKNOWN never collapses to FAILED)
- OTHER IMPLEMENTATIONS: E5 outcome vocabulary
- BRANCH/WORKTREE: workspace outreach/ledger dirs; canonical tree
- HEAD: various
- DIRTY: n/a (workspace data files)
- ACTIVE WRITER: none
- TESTS: outcome vocabulary tests (E5)
- RUNTIME REACHABILITY: recorded, not yet feeding learning
- KNOWN DEFECT: the learning loop does not exist (lesson store ABSENT); outcomes do not feed back into decisions
- STRONGEST IMPLEMENTATION: E5 outcome vocabulary
- MISSING BEHAVIOR: outcome → candidate lesson → evidence → hypothesis → replay/counterfactual → falsification → promotion (Wave 9)
- CONVERGENCE ACTION: KEEP (records) + BUILD (loop, later)
- DELETION CANDIDATES: none
- DEPENDENCIES: U10 (decision records to join outcomes to)
- HOSTILE TEST: outcome without provenance must not promote a lesson
- ROLLBACK: n/a
- SPRINT PRIORITY: P2 (Wave 9)

## 28. Learning

- CANONICAL OWNER: UNASSIGNED
- REACHED IMPLEMENTATION: none (lesson store ABSENT per lane 15; self_improvement L13 is memory learning, not PING learning)
- OTHER IMPLEMENTATIONS: Jev as typed shadow signal (zero authority); D-45 priority calibration (needs label source)
- BRANCH/WORKTREE: n/a
- HEAD: n/a
- DIRTY: n/a
- ACTIVE WRITER: none
- TESTS: none
- RUNTIME REACHABILITY: absent
- KNOWN DEFECT: the absence itself; the refactor can wrap and evaluate, not yet learn
- STRONGEST IMPLEMENTATION: none
- MISSING BEHAVIOR: the full loop (Wave 9); empirical calibration corpus from FYD owner corrections and outcomes (the deeper Jev opportunity)
- CONVERGENCE ACTION: BUILD (Wave 9 only; wrap and evaluate first)
- DELETION CANDIDATES: none
- DEPENDENCIES: U10; outcomes journaled
- HOSTILE TEST: lesson promoted without replay/counterfactual evidence must fail
- ROLLBACK: n/a
- SPRINT PRIORITY: P3 (Wave 9)

---

## Cross-unit notes

- Byte-identical multi-copy units (purest CONVERGE, zero behavioral divergence): typed_decision.js x3 (fde15d42); context_pack.py x5 (1cb71d44); identity_authority.js x3 (c05060d0); orca_policy.js x3; tenant-context/envelope/mc-dispatch duplicated across every design worktree.
- Same closure, two implementations (compare on shared corpus, preserve behavior): f01 vs S5 (U3); P-103 vs attempt-fencing.ts; E1 vs E7.
- Genuinely missing (BUILD only after forest search confirms): WAITING_APPROVAL triage code primitive (zero code hits); live GitHub webhook D0 funnel (design only); wake-lease implementation (design doc only; owner call).
- The forest action tally (from JEV_DECISION_INVENTORY): KEEP 26 / CONVERGE 13 / HARVEST 10 / WIRE 5 / SUPERSEDE 3 / FREEZE 4 / DELETE-LATER 3 groups / BUILD 3.
