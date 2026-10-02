# FIRST 20 READY TASKS - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. Tasks are PREPARED, not started.
Each task is independently executable at GO. One writer per semantic unit.
Field order: WHY | OWNER | BASE SHA | WORKTREE | SEMANTIC UNIT | EXISTING IMPLEMENTATIONS SEARCHED | RED REPRO | EXPECTED SMALLEST CHANGE | TEST | HOSTILE TEST | FALSIFIER | DEPENDENCIES | ROLLBACK | AUTHORITY BOUNDARY | DONE EVIDENCE.

EXISTING IMPLEMENTATIONS SEARCHED is a machine-visible structured field (JSON). Every task begins by searching the do-not-reimplement register (03).

Worktrees marked CUT AT GO are created at GO from the named base SHA; no worktree is created during prelaunch.

---

## T-01: RED repro - event-bridge tenant namespace laundering

- WHY: Wave A safety. The canonical bridge launders tenant namespaces to core::system (reached defect). No tenant-safety claim is trustworthy until this repro exists.
- OWNER: UNASSIGNED (Wave A safety; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-waveA-bridge
- SEMANTIC UNIT: namespace propagation (U2)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03-DO-NOT-REIMPLEMENT-REGISTER.md#18","locations":[{"path":"event_bridge.js","verdict":"SEARCHED, laundering confirmed at code level"},{"path":"unified_event_runtime.js:237","verdict":"SEARCHED, default-to-core::system confirmed"},{"path":"bridge-tenant.ts (integration branch)","verdict":"SEARCHED, unwired, fail-open fallback hazard noted"}],"winner":"none, repro only"}
- RED REPRO: emit event with tenant namespace T-A through the bridge; read stored event; assert namespace == core::system (the bug). Fixture only, no fix.
- EXPECTED SMALLEST CHANGE: none (repro task; no product change)
- TEST: the repro script itself, run twice, deterministic result
- HOSTILE TEST: emit with malformed tenant; record whether refused or mapped to core::system
- FALSIFIER: if the stored event preserves the tenant namespace, the defect hypothesis is falsified (record and close)
- DEPENDENCIES: none (read-only)
- ROLLBACK: n/a (no writes)
- AUTHORITY BOUNDARY: read-only; no bridge code touched; no events emitted to production stores (use isolated test namespace)
- DONE EVIDENCE: repro script at fixed path + run log showing laundering (or falsification) + entry in Wave A evidence file

## T-02: RED repro - MC caller-to-tenant authority gap

- WHY: Wave A safety. MC dispatch takes tenant from the HTTP body with no authenticated caller (the scariest live gap). Repro proves the gap is real and measurable.
- OWNER: UNASSIGNED (Wave A safety; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-waveA-entitlement
- SEMANTIC UNIT: entitlement (U1)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#9","locations":[{"path":"src/app/api/mc/dispatch/route.ts:226,234","verdict":"SEARCHED, tenant-from-body + SLICE_TENANTS allowlist confirmed"},{"path":"P-092 tenant-kit (tenanos-wave, unpushed)","verdict":"SEARCHED, exists, not in canonical tree"},{"path":"FYD journal gateway tenant 400s","verdict":"SEARCHED, reached pattern, FYD-only"}],"winner":"none, repro only"}
- RED REPRO: submit Tenant A command labeled as Tenant B through MC dispatch; assert the dispatch proceeds on the unproven label (the gap). Fixture only.
- EXPECTED SMALLEST CHANGE: none (repro task)
- TEST: repro script, deterministic
- HOSTILE TEST: J-19 full variant (Tenant A data in Tenant B context across read paths)
- FALSIFIER: if any boundary demands caller entitlement, record which boundary and how (partial falsification; map the boundary)
- DEPENDENCIES: none (read-only)
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: test tenant labels only; never touch real tenant state; demo/fixture scope
- DONE EVIDENCE: repro script + boundary-by-boundary refusal/inheritance map + Wave A evidence entry

## T-03: RED repro - Tenant A to Tenant B ContextPack contamination

- WHY: Wave A safety. Integration assembler filters by namespace, but the reached work-order contract accepts contextPackId with zero tenant binding (PARTIAL verdict).
- OWNER: UNASSIGNED (Wave A safety; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-waveA-contextpack
- SEMANTIC UNIT: ContextPack (U7) + namespace propagation (U2)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#3","locations":[{"path":"work-order contract (contextPackId field)","verdict":"SEARCHED, zero tenant binding confirmed"},{"path":"integration assembler namespace filter","verdict":"SEARCHED, filters but contract does not bind"},{"path":"context_compiler.js","verdict":"SEARCHED, deterministic id, no tenant check observed"}],"winner":"none, repro only"}
- RED REPRO: craft work order for Tenant B referencing Tenant A's contextPackId; assert the pack is accepted/assembled (the gap).
- EXPECTED SMALLEST CHANGE: none (repro task)
- TEST: repro script, deterministic
- HOSTILE TEST: cross-tenant pack with sensitive fixture content; assert whether content crosses
- FALSIFIER: if the contract or assembler refuses, record the refusing layer
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: fixture packs only; no real tenant data
- DONE EVIDENCE: repro script + accept/refuse map + Wave A evidence entry

## T-04: RED repro - Tenant A to Tenant B Mission Control projection contamination

- WHY: Wave A safety. projectMissions/loadJournalEvents are global; GET routes take no caller tenant (ASSUMED, failing).
- OWNER: UNASSIGNED (Wave A safety; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-waveA-mcproj
- SEMANTIC UNIT: Mission Control projection + namespace propagation (U2)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#18","locations":[{"path":"projectMissions","verdict":"SEARCHED, global read confirmed"},{"path":"loadJournalEvents","verdict":"SEARCHED, global read confirmed"},{"path":"MC journal (one global JSONL)","verdict":"SEARCHED, unscoped confirmed"}],"winner":"none, repro only"}
- RED REPRO: seed fixture missions for Tenant A and Tenant B; query MC projection as Tenant B context; assert Tenant A missions visible (the gap).
- EXPECTED SMALLEST CHANGE: none (repro task)
- TEST: repro script, deterministic
- HOSTILE TEST: exfiltration-shaped query (the J-19 weakest surface)
- FALSIFIER: if projection is tenant-scoped, record the scoping layer
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: fixture missions only; isolated journal copy, never the live MC journal
- DONE EVIDENCE: repro script + visibility map + Wave A evidence entry

## T-05: Shared hostile corpus for HOLD/recovery comparison (Wave B)

- WHY: Wave B recovery. All three HOLD/reconciliation implementations must be compared on one shared corpus; otherwise the comparison is rigged.
- OWNER: UNASSIGNED (Wave B; name at GO)
- BASE SHA: n/a (corpus is new fixture material under prelaunch/)
- WORKTREE: n/a (fixtures live in ~/workspace/ping-24h/prelaunch/waveB-corpus/ at GO)
- SEMANTIC UNIT: HOLD / reconciliation / recovery (U3)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#5,03#6,03#7,03#8","locations":[{"path":"~/workspace/f01-fix/","verdict":"SEARCHED, 21/21 green, never committed"},{"path":"mc/lane-c-reconcile-gate (second repo)","verdict":"SEARCHED, S5 gate"},{"path":"classifyUnknownExecution (integration branch)","verdict":"SEARCHED, decision function"},{"path":"proven lifecycle 13/13 tests","verdict":"SEARCHED, the yardstick"}],"winner":"none, corpus only"}
- RED REPRO: n/a (this task BUILDS the corpus)
- EXPECTED SMALLEST CHANGE: 8 fixture scenarios: unknown external effect; lease expiration after possible effect; death after effect before acknowledgement; death after result before journaling; duplicate submission; zombie result; restart with HOLD present; reconciliation crash. Each fixture: setup, trigger, expected invariant (UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION).
- TEST: each fixture is self-describing (setup/trigger/assert)
- HOSTILE TEST: the corpus IS the hostile test
- FALSIFIER: if any scenario cannot be constructed against the current code, record why (missing hook) rather than faking it
- DEPENDENCIES: none
- ROLLBACK: n/a (new fixtures)
- AUTHORITY BOUNDARY: fixtures only; no dispatch-path changes
- DONE EVIDENCE: 8 fixtures at fixed paths + a runner that executes all three implementations against them (runner written in T-06)

## T-06: HOLD/reconciliation three-way comparison on the Wave B corpus

- WHY: U3. Pick the winner with evidence, not preference. The watchdog deployment and all consequential dispatch wait on this.
- OWNER: UNASSIGNED (single convergence owner for U3 at GO)
- BASE SHA: n/a (comparison harness, new)
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-u3-compare
- SEMANTIC UNIT: HOLD / reconciliation (U3)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#5","locations":[{"path":"~/workspace/f01-fix/","verdict":"SEARCHED"},{"path":"mc/lane-c-reconcile-gate","verdict":"SEARCHED"},{"path":"classifyUnknownExecution","verdict":"SEARCHED"}],"winner":"to be decided by this task"}
- RED REPRO: T-05 corpus
- EXPECTED SMALLEST CHANGE: none (comparison only; no wiring)
- TEST: run f01, S5, classifyUnknownExecution against all 8 fixtures; scorecard: never-redispatch-unknown-consequential-effect (binary per fixture), invariant preservation, human-decision routing
- HOSTILE TEST: the corpus
- FALSIFIER: if two implementations tie, record H3 (complementary, not competing) as the leading hypothesis
- DEPENDENCIES: T-05 corpus complete
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only comparison; no dispatch-path wiring; no watchdog deployment
- DONE EVIDENCE: scorecard + winner recommendation (or complementary-convergence recommendation) + preserved behavior notes for losers

## T-07: Reaper-gap verification (reapExpiredLeases HOLD → created → redispatch)

- WHY: U3. AGENTS.md records the gap as open and blocks the stuck-running watchdog. Verify it is real before designing around it.
- OWNER: UNASSIGNED (U3 family; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-u3-reaper
- SEMANTIC UNIT: run state + HOLD (U3)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#8","locations":[{"path":"reapExpiredLeases","verdict":"SEARCHED, HOLD→created→redispatch path described in AGENTS.md"},{"path":"MissionScheduler 5s poll","verdict":"SEARCHED, renew/reap/dispatch"}],"winner":"none, verification only"}
- RED REPRO: place mission in HOLD with an expired lease; run the reaper; assert it resets to created and redispatches ~60s later (the gap).
- EXPECTED SMALLEST CHANGE: none (verification only)
- TEST: repro script with controlled clock/lease
- HOSTILE TEST: HOLD on a consequential-effect mission; assert whether redispatch would cause a duplicate external effect
- FALSIFIER: if the reaper does NOT reset HOLD missions, the gap is closed or misdescribed (record which)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: isolated scheduler instance; no production missions touched
- DONE EVIDENCE: repro log + gap confirmed/falsified + watchdog unblock recommendation

## T-08: orca-run-mu6wmbzn exact reproduction fixture (Wave C)

- WHY: U7. The first broken reached edge (EVIDENCE → PROCESSOR). The fix cannot be selected until the loss is reproducible.
- OWNER: UNASSIGNED (U7; name at GO; freeze competing ContextPack writers)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-u7-repro
- SEMANTIC UNIT: ContextPack / evidence assembly (U7)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#3","locations":[{"path":"trimMission","verdict":"SEARCHED, result-field drop described"},{"path":"getTrace correlation query","verdict":"SEARCHED, worker-chain-only correlation described"},{"path":"P-098 context-pack.ts","verdict":"SEARCHED, unpushed cache"},{"path":"context-compiler.ts (v2)","verdict":"SEARCHED, API-incompatible with proven path"},{"path":"context_pack.py, context_compiler.js, build-context-pack.py","verdict":"SEARCHED, three scopes three owners"}],"winner":"none, repro only"}
- RED REPRO: replay trimMission + getTrace against the recorded orca-run-mu6wmbzn data; assert the assembled ContextPack is missing the result and lifecycle events (the bug). Trace: trimMission → trace correlation → ContextPack → lifecycle events → result → worker input.
- EXPECTED SMALLEST CHANGE: none (repro task)
- TEST: fixture asserts the lossy pack byte-for-byte against the recorded lossy pack
- HOSTILE TEST: feed the lossy pack to the D-26b completeness judge; assert it flags the chain
- FALSIFIER: if the replay produces a complete pack, the defect is fixed or misdescribed (record which)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: recorded run data only; no live missions
- DONE EVIDENCE: fixture + replay log + loss confirmed/falsified + candidate-fix test plan (H1/H2/H3)

## T-09: Pseudo-vector reachability audit (U8)

- WHY: U8. If the sha256-seeded PRNG "embedding" is reached, retrieval is corrupt by construction. Read-only audit; no code changes.
- OWNER: UNASSIGNED (retrieval authority; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: none (read-only audit across trees; report only)
- SEMANTIC UNIT: retrieval (U8)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#16","locations":[{"path":"RetrieverWorker._text_to_vector","verdict":"SEARCHED, sha256-seeded PRNG confirmed at code level"},{"path":"RetrieverWorker._qdrant_search","verdict":"SEARCHED, fail-silent [] confirmed"},{"path":"authority_search.py tiers","verdict":"SEARCHED, Tier1→Tier2→Tier3 with silent failures"},{"path":"duplicate worker copies (root vs workers/ vs runtime/)","verdict":"SEARCHED, all DIFFER confirmed"}],"winner":"none, audit only"}
- RED REPRO: n/a (audit)
- EXPECTED SMALLEST CHANGE: none
- TEST: call-site graph: every _text_to_vector / _qdrant_search call site × reachability from live entry points (gateway spine, dispatch plane, Ask paths)
- HOSTILE TEST: Qdrant-degraded run; assert whether any live path consumes the fake vector
- FALSIFIER: if zero call sites are reachable, H2 (dormant) is supported; record the reactivation risk anyway
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only; no Qdrant writes; no retrieval-path changes
- DONE EVIDENCE: call-site × reachability matrix + quarantine recommendation (VECTOR_UNAVAILABLE if reached)

## T-10: Q28 degraded-mode test preparation (retrieval FULL/DEGRADED/UNAVAILABLE)

- WHY: Q28 owner question unanswered. Retrieval must expose FULL, DEGRADED, or UNAVAILABLE; failure never means "no evidence".
- OWNER: UNASSIGNED (retrieval authority; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: CUT AT GO /home/nolan/worktrees/prelaunch-u8-degraded
- SEMANTIC UNIT: retrieval (U8)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#16","locations":[{"path":"authority_search.py","verdict":"SEARCHED, no reduced-retrieval indicator anywhere confirmed"},{"path":"RetrieverWorker zero-related-events pack","verdict":"SEARCHED, indistinguishable from 'nothing found' confirmed"}],"winner":"none, test prep only"}
- RED REPRO: take Qdrant down in the test environment; run Ask FYD; assert current behavior (silent empty vs visible indicator). Record, do not fix.
- EXPECTED SMALLEST CHANGE: none (observation only)
- TEST: the degraded run + behavior log
- HOSTILE TEST: degraded retrieval on a question with known evidence; assert refusal rather than confabulation (or record the failure)
- FALSIFIER: if a reduced-retrieval indicator already exists somewhere, record its location (falsifies "nowhere")
- DEPENDENCIES: T-09 audit (know which paths to exercise)
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: test environment only; Qdrant is already DEGRADED in observed state
- DONE EVIDENCE: degraded-behavior log + indicator gap confirmed/falsified + spec for the FULL/DEGRADED/UNAVAILABLE exposure

## T-11: Decision-record schema round-trip (U10)

- WHY: U10. One schema must round-trip all 15 existing records losslessly before any journaling/projection work.
- OWNER: UNASSIGNED (decision records; name at GO)
- BASE SHA: n/a (read-only test)
- WORKTREE: none (test script under prelaunch/ at GO)
- SEMANTIC UNIT: decision records (U10)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#10","locations":[{"path":"jev/shadow-recorder branch (second repo)","verdict":"SEARCHED, schema + tests + MC event spec"},{"path":"JEV_DECISION_EVALUATED event_data v1","verdict":"SEARCHED, design"},{"path":"fyd-intel/jev-decisions.jsonl (9 records)","verdict":"SEARCHED"},{"path":"shadow-decisions-2026-09-28.json (6 records)","verdict":"SEARCHED"}],"winner":"to be decided by this task"}
- RED REPRO: n/a
- EXPECTED SMALLEST CHANGE: none
- TEST: replay all 15 records through each candidate schema; assert lossless round-trip + support for MC projection queries (decisions by authority, verification trail, reconciliation-required)
- HOSTILE TEST: record with tenant identity in Jev state (must be excluded); record with hash-only canonical refs (must pass)
- FALSIFIER: if no schema round-trips all 15, record the lossy fields per schema (convergence, not selection)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only; no journal writes; no new store
- DONE EVIDENCE: round-trip matrix + schema recommendation + field-union spec for the converged schema

## T-12: 20-handoff identity audit (U4)

- WHY: U4. The converged identity contract needs the full handoff map; 1 accepted-from-untrusted-input and 1 incorrectly reconstructed are live hazards.
- OWNER: UNASSIGNED (identity authority; name at GO; do NOT create a new class yet)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: none (read-only audit; report only)
- SEMANTIC UNIT: identity (U4)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#2","locations":[{"path":"identity_authority.js x3 (sha c05060d0)","verdict":"SEARCHED, byte-identical"},{"path":"FYD owner identity (demo-owner UNVERIFIED)","verdict":"SEARCHED"},{"path":"claim identity; MC dispatch identity","verdict":"SEARCHED"},{"path":"cryptographic identity work; constitutional-runtime semantics","verdict":"SEARCHED"},{"path":"P-100 bootstrap substrate","verdict":"SEARCHED, unpushed"}],"winner":"none, audit only"}
- RED REPRO: n/a (audit)
- EXPECTED SMALLEST CHANGE: none
- TEST: enumerate all 20 handoff sites; per site: concept carried (ENTITY/ACTOR/CRYPTO/TENANT-BINDING/AGENT), minting implementation, verifying implementation, trust basis (explicit/inherited/inferred/duplicated/untrusted/absent/reconstructed)
- HOSTILE TEST: the untrusted-input acceptance site (attempt to mint authority from it)
- FALSIFIER: if the audit finds fewer than 20 sites or different taxonomy, update the map (the map is the deliverable, not the count)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only; no identity code touched
- DONE EVIDENCE: handoff map (20 rows) + concept-separation recommendation + converged-contract draft (types, not a god class)

## T-13: P-092 tenant-kit harvest inspection (U1)

- WHY: U1. P-092 is the only implementation cache for tenant-kit; STATE.json claims "integrated" but it is not in the canonical tree. Inspect before any entitlement design.
- OWNER: UNASSIGNED (U1; name at GO)
- BASE SHA: 6cbd64afd693dba616ce01ec4b12e692de282ffa
- WORKTREE: existing /home/nolan/projects/ping-wave-P-20260923-092 (read-only inspection; do not modify)
- SEMANTIC UNIT: entitlement + tenant kit (U1)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#9","locations":[{"path":"P-092 tenant-kit (556 lines)","verdict":"INSPECTING in this task"},{"path":"FYD tenant-context + scoped stores","verdict":"SEARCHED, reached"},{"path":"gateway namespace binding + tenant registry","verdict":"SEARCHED"}],"winner":"none yet"}
- RED REPRO: n/a
- EXPECTED SMALLEST CHANGE: none
- TEST: read all 556 lines; map each export to (U1 entitlement | tenant context | registry | other); flag anything that accepts tenant from untrusted input
- HOSTILE TEST: apply the Wave A repros conceptually against P-092's checks (would they refuse?)
- FALSIFIER: if P-092 duplicates the reached FYD patterns with no new behavior, record HARVEST-NOTHING (still valuable)
- DEPENDENCIES: T-12 (identity concepts inform the inspection)
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only; the worktree is clean and stays clean
- DONE EVIDENCE: export map + harvest verdict per export (ADOPT/ADAPT/REJECT) + entitlement-design input notes

## T-14: bridge-tenant.ts fallback fix design (evidence only, no wiring) (U2)

- WHY: U2. The unwired fix has a fail-open fallback (unknown tenant → core::system with tenant_unknown=true). The fix must be corrected on paper before anyone wires it.
- OWNER: UNASSIGNED (U2; name at GO)
- BASE SHA: integration branch tip (record exact SHA at GO)
- WORKTREE: none (design document only, under prelaunch/)
- SEMANTIC UNIT: namespace propagation (U2)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#18","locations":[{"path":"bridge-tenant.ts","verdict":"SEARCHED, fail-open fallback confirmed at code level"},{"path":"FYD journal gateway 400s","verdict":"SEARCHED, the fail-closed pattern to mirror"}],"winner":"none, design only"}
- RED REPRO: T-01 repro (laundering) as the baseline
- EXPECTED SMALLEST CHANGE: none (design doc only; NO wiring in prelaunch)
- TEST: design review checklist (does the design refuse unknown/malformed tenant at every entry? does it preserve namespace end to end? does it avoid the core::system fallback?)
- HOSTILE TEST: walk the design against Wave A repros 1 and 4 on paper
- FALSIFIER: if the live spine (EventToMissionBridge) makes the bridge irrelevant, record H2 as leading (bypass, not fix)
- DEPENDENCIES: T-01 (repro baseline)
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: document only; no bridge code touched
- DONE EVIDENCE: corrected design doc + explicit REFUSE semantics + wiring preconditions (U1/U4)

## T-15: Envelope comparison E1 vs E7 + J-16 well-formed-lie test (U6)

- WHY: U6. The dispatch contract must catch a well-formed lie before worker autonomy begins. E7 is a proposed spec; E1 is live. Compare with evidence.
- OWNER: UNASSIGNED (U6; name at GO)
- BASE SHA: n/a (Pig-side adapter; record exact file SHAs at GO)
- WORKTREE: none (comparison report under prelaunch/ at GO)
- SEMANTIC UNIT: WorkOrder / ResultEnvelope (U6)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#11","locations":[{"path":"E1 orca-adapter (14-field in / 8-field out, echo-binding)","verdict":"SEARCHED, live"},{"path":"E7 proposed unified spec","verdict":"SEARCHED, not implemented"},{"path":"E2/E3/E4/E5/E6","verdict":"SEARCHED, docs/vocabularies"},{"path":"lane 14 worker-contract comparison report","verdict":"SEARCHED, reference analysis"}],"winner":"to be decided"}
- RED REPRO: J-16: worker claims success while tests fail; feed through verifyResultEnvelope; assert it verifies valid (the gap).
- EXPECTED SMALLEST CHANGE: none (comparison only)
- TEST: E1 vs E7 field-by-field; J-16 through both; worker-swap authority-basis check
- HOSTILE TEST: objective-fidelity violation (worker silently answers a different objective; B5 D8)
- FALSIFIER: if E1 already catches the lie, record which check fires (gap misdescribed)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: read-only; no dispatch-path changes; no live dispatches
- DONE EVIDENCE: comparison matrix + J-16 result + canonical-contract recommendation + authority-posture fix spec (per-order vs adapter-data)

## T-16: Repo-to-tenant binding contract (U9)

- WHY: U9. No live ingestion until the binding exists. The contract is plannable now; the slice comes later.
- OWNER: UNASSIGNED (U9; name at GO)
- BASE SHA: n/a (contract document)
- WORKTREE: none (document under prelaunch/ at GO)
- SEMANTIC UNIT: repository identity/acquisition (U9)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#15","locations":[{"path":"GitHubTrendingScanner","verdict":"SEARCHED, machinery only"},{"path":"tandem/emit-observation.py gates","verdict":"SEARCHED, fail-closed pattern to reuse"},{"path":"D-68 repo watchlist authorization (HUMAN-AUTHORITY)","verdict":"SEARCHED, authorization shape"},{"path":"~/workspace/git-ingestion/ (design)","verdict":"SEARCHED, design only"}],"winner":"none, contract only"}
- RED REPRO: n/a
- EXPECTED SMALLEST CHANGE: none (contract document)
- TEST: contract review checklist (authorization record shape; repo → tenant mapping; refusal without authorization; commit identity; audit trail)
- HOSTILE TEST: walkthrough: unauthorized repo presented for ingestion; assert the contract refuses OBSERVATION_CREATED
- FALSIFIER: if P-092 or existing tenant-kit already defines the binding, record it (contract becomes harvest, not design)
- DEPENDENCIES: T-12/T-13 (identity/tenant concepts)
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: document only; no ingestion code touched; no live ingestion
- DONE EVIDENCE: binding contract + the smallest trustworthy reached-slice checklist (AUTHORIZED REPO → … → MISSION IMPACT) with the binding as gate 0

## T-17: Projection-invalidation semantics search + generic contract spec (U5)

- WHY: U5. The most important genuinely missing product seam. Determine whether the forest already has a generic path; if not, spec it with FYD as consumer #1. Do NOT special-case approve→re-dump.
- OWNER: UNASSIGNED (projection authority; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: none (search + spec document under prelaunch/ at GO)
- SEMANTIC UNIT: projection/invalidation (U5)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"03#18","locations":[{"path":"FYD dump.py","verdict":"SEARCHED, deterministic, manual"},{"path":"MC projection layer","verdict":"SEARCHED, real projection layer"},{"path":"SiteSpec pipeline (spec-pipeline.ts, apply-layer.ts)","verdict":"SEARCHED, clean"},{"path":"regen-trigger.ts (held attempt)","verdict":"SEARCHED, read-only reference, UNVERIFIED, do not adopt without proof"}],"winner":"none, search+spec only"}
- RED REPRO: T-05-style: approve change → assert projection stale until manual re-dump (the gap, already evidenced in TWO_SITE_VERIFICATION; re-confirm byte-level)
- EXPECTED SMALLEST CHANGE: none (spec only)
- TEST: forest-wide search for invalidation/staleness/freshness/affected-projection logic (all 38 worktrees + second repo); the spec: AUTHORIZED TRANSITION → AFFECTED OBJECTS → AFFECTED PROJECTIONS → REBUILD → ATOMIC PUBLISH → FRESHNESS PROOF
- HOSTILE TEST: mid-rebuild failure; assert last good version still serves (atomic publish)
- FALSIFIER: if a generic path already exists, record it (U5 becomes WIRE, not BUILD)
- DEPENDENCIES: none for the search; U10 for the freshness-proof record shape
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: document only; no projection code touched; no approve→re-dump wiring
- DONE EVIDENCE: search report (locations × verdicts) + generic contract spec + FYD-as-consumer-#1 mapping

## T-18: Source = build = served binding seam spec

- WHY: Constitutional for the sprint. Every served FYD experience must expose or make mechanically verifiable: SOURCE SHA, BUILD ID, SITESPEC VERSION/DIGEST, OBJECT GRAPH/PROJECTION VERSION. Until true, no product claim based on a screenshot counts as final proof.
- OWNER: UNASSIGNED (build/serve binding; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: none (spec document under prelaunch/ at GO)
- SEMANTIC UNIT: build/serve binding (cross-cutting)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"n/a (binding seam)","locations":[{"path":".next/BUILD_ID (DqZQX-gQgkpciv6rpLgG3, built 2026-09-27 21:00, served from Sep 28 06:38 process)","verdict":"SEARCHED, skew confirmed: served build predates branch HEAD"},{"path":"demo diagnostics surface","verdict":"SEARCHED, no build-identity seam exists today"},{"path":"/api/readyz (claimed by held attempt, UNVERIFIED)","verdict":"SEARCHED, read-only reference only"}],"winner":"none, spec only"}
- RED REPRO: record the current skew byte-level (served BUILD_ID vs branch HEAD vs served asset digests)
- EXPECTED SMALLEST CHANGE: none (spec only)
- TEST: spec review checklist (CLEAN SOURCE → BUILT SOURCE → SERVED SOURCE; every UI certification ships pinned HEAD + build digest + served-asset digest or it is not a claim)
- HOSTILE TEST: hand-restart without the demo flag (must 403 the customize approve path; the 2026-09-24 lesson)
- FALSIFIER: if a binding seam already exists somewhere, record it
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: document only; :3100 NOT restarted during prelaunch (healthy, demo flag verified live)
- DONE EVIDENCE: binding spec + current-skew record + the canonical test command for the sprint

## T-19: 195-test floor reinstatement assessment (read-only)

- WHY: The floor was not rerun after the last round of live changes (2026-09-28). The sprint re-establishes it as a gate: no surface change is called proven until the floor is green on the served tree.
- OWNER: UNASSIGNED (verification; name at GO)
- BASE SHA: f877c3919941978f07d5014909595df4751ec258
- WORKTREE: none (assessment only; no test runs during prelaunch)
- SEMANTIC UNIT: verification (cross-cutting)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"n/a","locations":[{"path":"195-test floor definition","verdict":"SEARCHED, referenced in SPRINT_100H_PRIORITIES P18"},{"path":"phase1 suite 2336/2363 (27 known pre-existing failures, TESTING.md)","verdict":"SEARCHED, parity proven on phase1 lane"}],"winner":"none, assessment only"}
- RED REPRO: n/a
- EXPECTED SMALLEST CHANGE: none
- TEST: inventory: what the floor covers, what the 27 known failures are, what command runs it, how long it takes, whether it can run against the served tree without restart
- HOSTILE TEST: n/a
- FALSIFIER: if the floor is already green on the served tree, record the evidence (assessment becomes certification input)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: no test runs during prelaunch (read-only assessment); the rerun itself is a GO task
- DONE EVIDENCE: floor inventory + rerun runbook + gate definition (red floor blocks certification)

## T-20: E1 corpus integrity re-verification (no Jev calls)

- WHY: The frozen 0.760 baseline must be rerunnable before any treatment wave is trusted. Re-verify without spending a single Jev call.
- OWNER: UNASSIGNED (Jev track; shadow only)
- BASE SHA: n/a (frozen artifacts)
- WORKTREE: none
- SEMANTIC UNIT: Jev experiments (E1)
- EXISTING IMPLEMENTATIONS SEARCHED: {"register":"n/a","locations":[{"path":"~/workspace/ping-24h/jev-refactor/shadow-spike/e1-corpus.json (sha f59eaf79...2765ec)","verdict":"SEARCHED, frozen"},{"path":"lexical_baseline.py (sha dadf1d81...5e290e3)","verdict":"SEARCHED, frozen"},{"path":"HOLD_STATUS_2026-09-28.md","verdict":"SEARCHED, self-check 19/25 recorded"}],"winner":"frozen baseline"}
- RED REPRO: n/a
- EXPECTED SMALLEST CHANGE: none
- TEST: sha256sum e1-corpus.json (expect f59eaf79078041b869a1825a18631a3a0900ce64c6e4e1dde64dc7039d2765ec) + python3 lexical_baseline.py (expect top1 19/25 = 0.760 exactly)
- HOSTILE TEST: n/a (deterministic; any deviation is a corpus-integrity incident)
- FALSIFIER: if the rerun does not reproduce 19/25 exactly, the corpus or script moved (freeze violated; investigate before any E1 work)
- DEPENDENCIES: none
- ROLLBACK: n/a
- AUTHORITY BOUNDARY: zero Jev calls; read-only rerun; no corpus/prompt/threshold tuning
- DONE EVIDENCE: rerun log with exact 19/25 + sha256 confirmations + release-condition checklist status (retrieval seam / verification seam / contracts / corpus / baseline)

---

## Task → unknown → wave map

| Task | Unknown | Wave |
|------|---------|------|
| T-01..T-04 | U1, U2 | Wave A (safety) |
| T-05..T-07 | U3 | Wave 2 (recovery) |
| T-08 | U7 | Wave C (evidence) |
| T-09, T-10 | U8 | Wave 3 (evidence) |
| T-11 | U10 | Wave 4 (observability) |
| T-12, T-13 | U4, U1 | Wave 1 (tenant safety) |
| T-14 | U2 | Wave 1 |
| T-15 | U6 | Wave 6 (worker autonomy) |
| T-16 | U9 | Wave 7 (GitHub) |
| T-17 | U5 | Wave 8 (projection) |
| T-18 | cross-cutting | Wave 0/1 (binding gate) |
| T-19 | cross-cutting | Wave 0 (verification gate) |
| T-20 | E1 | Wave 5 (Jev, frozen) |

Stop rules (Nolan, standing): stop when the current PING passes the hostile test, a stronger implementation exists, an active writer owns the surface, ownership is unresolved, evidence cannot distinguish designs, authority is missing, or work adds architecture without closing a reached edge. "No change" and PASS EXISTING are valid outcomes.
