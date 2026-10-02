# JEV DECISION INVENTORY: PING Decision Surface, Reachability, and Jev Insertion Points

**Date:** 2026-09-28 MDT. **Mode:** read-only archaeology. No product tree was modified to produce this document. The only write in the entire program is lane reports plus this synthesis file.
**Status:** 7 of 7 lanes complete. All sections are reconciled; remaining caveats are listed under UNKNOWNS.
**Hold posture:** per the 2026-09-28 hold notice, experiment #1 new code and all surgical writes to product trees are HELD until the convergence pass lands. This document is the inventory the convergence track consumes. It contains zero code changes, only findings, rankings, and a held experiment spec.

## Sources

Seven read-only lanes, each reporting into `~/workspace/ping-24h/jev-refactor/lanes/`:

| Lane | Focus | Report | Status |
|---|---|---|---|
| FOREST | 63 implementations across 38 worktrees + second repo | `lanes/forest.md` | complete |
| A+E | ORCA reached loop + 72-decision surface | `lanes/orca-decisions.md` | complete |
| B+J | TenantOS proven-vs-assumed + 19 adversarial test designs | `lanes/tenantos-adversary.md` | complete |
| C+G | GitHub ingestion + ContextPack/knowledge/search | `lanes/ingestion-search.md` | complete |
| D | Official TypeSafe/Jev API + ecosystem patterns | `lanes/jev-research.md` | complete |
| H | Mission Control real-vs-mock | `lanes/mission-control.md` | complete |
| F+I | Worker inventory + learning/outcome records | `lanes/workers-learning.md` | complete |

Lane self-reports are hypotheses until independently checked. Counts below are quoted from lane reports with the lane's own evidence citations.

## 0. FOREST INVENTORY (what exists and is worth preserving)

38 worktrees enumerated under `/home/nolan/worktrees` (36 ping-repo worktrees + `copper-v2` and `fyd-privacy-p0`, whose metadata is broken). A second git repo exists at `/home/nolan/workspace` (40+ branches, 16 stale/prunable worktrees) that no prior lane inventoried.

63 implementations inventoried across 12 focus areas. Action tally: KEEP 26 / CONVERGE 13 / HARVEST 10 / WIRE 5 / SUPERSEDE 3 / FREEZE 4 / DELETE-LATER 3 groups / BUILD 3.

**Genuinely missing (the only BUILD items in the forest):**
1. WAITING_APPROVAL triage code primitive (coordinator procedure only; zero code hits).
2. Live GitHub webhook D0 funnel (design only).
3. Wake-lease implementation (design doc only; build or drop per owner call).

**Three surprising rediscoveries:**
1. The HOLD/UNKNOWN reconciliation problem is solved twice and shipped zero times: `~/workspace/f01-fix/` (21/21 tests green since 2026-09-24, never committed) and workspace-repo branch `mc/lane-c-reconcile-gate` (S5 reconcile gate). AGENTS.md still records the gap as open.
2. The frozen repo's tenanos-wave branches are a finished implementation cache, not proposals: P-092 tenant-kit (556 lines), P-098 context-pack.ts (321 lines), P-103 attempt-fencing (627 lines + SQL), P-095 run-state-authority, P-100 bootstrap substrate (549 lines). STATE.json marks most "integrated" but they are not in the canonical tree and the branches are unpushed.
3. The second repo `/home/nolan/workspace` carries focus-unit branches the 8 prior lanes never saw: `jev/shadow-recorder` (decision-record schema + tests + MC event spec, the exact store the autonomy map said "deliberately not created"), `mc/approval-request` (ApprovalRequest primitive + validator + CLI), `feat/orca-unknown-outcome-port` (per-class effect adapters, 590-line core + 4 classes + tests), `mc/lane-c-reconcile-gate`.

## ORCA: THE REACHED LOOP

Two live loops, one dormant engine.

**Loop 1: the gateway live spine (business path).** `UnifiedEventRuntime` (Postgres `ping_events`) -> `EventToMissionBridge` (28-type static map) -> `MissionRuntime` (PG `ping_missions`) -> `MissionScheduler` 5s poll (renew leases, reap expired, dispatch via static `MISSION_WORKER_MAP`) -> `WorkerRuntime.dispatch()` (first-match on `eventTypes`, `maxConcurrent` guard) -> canonical worker `handle(event)` in-process -> worker emits the next PING event. **Zero LLM calls anywhere on this loop.** Every step is deterministic code.

**Loop 2: the Orca dispatch plane (mission plane, coordinator-driven).** `mission_intent.py`: validate -> authorize (vendored adapter) -> issue work order -> dispatch (revocation enforced) -> observe. `adapter.js dispatchExecution`: identity fence (identities 5-10 DENIED) -> `authorizeWorkOrder` (8 fail-closed checks) -> `resolveTenantId` (fail-closed) -> `reconcileGate` (idempotency + prior-outcome + artifact-exists under cross-process lock) -> `issueWorkOrder` (deterministic `work_order_id = sha256('workorder:'+taskId)[0:16]`) -> `buildWorkerPrompt` -> `dispatchHermes` -> `extractEnvelope` (brace-match) -> `verifyResultEnvelope` (8-field structural echo-binding) -> `recordVerifiedResult` -> canonical `WORKER_COMPLETED` event. The loop shell is deterministic; thinking enters at the three sites below.

**Dormant: the old ORCA ExecutionEngine.** Still instantiated at gateway boot and mounted at `/orchestration`, but nothing on the live business path calls it. Its decisions (mission compiler with 10 MISSION_TYPES, SHA-256 hash-pick worker selection, consensus engine, merge gate) are DECLARED-ONLY. `OmniRouter` has no implementation anywhere; the spec file is gone from the current tree. Status: effectively ABSENT.

**Where expensive frontier deliberation happens today (only 3 sites):**
1. The worker's internal agentic loop: one giant thinking loop per work order (~30 dispatches/day, 3s to 180s+, cost unmetered). The correct play is judging the RESULT outside the loop, not the process inside.
2. The coordinator LLM procedures: PLAN (objective -> tasks), taskBrief authoring, WAITING_APPROVAL triage (~5/day, zero code), grill-20 per-check judgments (~10/day). Latency is agent-time; cost unmetered.
3. Meta AI research delegation via the Pig: open-ended research with provenance sidecars, human `mark-verified.sh` gate before canonical use.

Correction to the prior map: `AIRuntime.selectModel()` (`ping-gateway-src/ping-runtime/ai/ai_runtime.js:127`) IS a per-call model-routing decision in code (preferProvider > preferLocal(ollama) > defaultProvider), but it is static preference order, not intelligent routing, and the canonical workers on the live business path do not use it.

**Compilation points** (where a mission could become a work graph instead of one giant thinking loop): `submit()` -> `_issue_work_order` (one intent could fan to N sub-orders); PLAN stage (the dormant `mission_compiler.js` was the automated compiler for this exact step); `dispatchExecution`'s taskBrief (single free-text artifact smuggling the whole mission); `EventToMissionBridge` (1 event -> 1 mission via the static map; REVIEW_RECEIVED already fans to two rows); `assessAndFollowUp` (already a graph edge via `causation_id`); `MISSION_WORKER_MAP` (static constant today).

## FIRST BROKEN REACHED EDGE (witnessed, not hypothesized)

**EVIDENCE -> PROCESSOR**, in run `orca-run-mu6wmbzn` (2026-09-18). The loop's `trimMission` dropped the `result` field and `getTrace`'s correlation query returned only worker-chain events (MISSION_* lifecycle events carry their own correlation_ids). The worker received a lossy ContextPack and honestly reported `chain_complete: false` with all four MISSION_* events as gaps, while the true chain was complete (MISSION_CREATED -> ASSIGNED -> STARTED -> COMPLETED all present, result recorded). The processor faithfully transmitted incomplete evidence; the failure is in evidence ASSEMBLY, not in the worker's honesty. This is the class of bug a D-26b evidence-chain completeness judge exists to catch.

Full edge trace of the operation (11 edges): MISSION -> QUESTIONS (reached), QUESTIONS -> DECISION UNITS (reached), DECISION UNITS -> EVIDENCE (reached), EVIDENCE -> PROCESSOR (reached BUT BROKEN, above), PROCESSOR -> AUTHORITY (reached), AUTHORITY -> CAPABILITY (reached), CAPABILITY -> WORKER (reached but thin: `agentId` is a caller-supplied constant, no selection exists; this is the Jev-sized hole), WORKER -> ATTEMPT (reached), ATTEMPT -> ARTIFACT (reached), ARTIFACT -> VERIFICATION (reached but shallow: structural only, a plausible-wrong `completed` passes), VERIFICATION -> OUTCOME (reached; UNKNOWN never collapses to FAILED). Bypassable edges: in the DORMANT old-engine path only, PROCESSOR -> AUTHORITY was bypassed. On the live paths, no bypass of AUTHORITY was found.

## DECISION SURFACE COUNTS

72 decision rows inventoried (D-01..D-72), yielding **73 classifications** because D-09 splits: the `buildWorkerPrompt` template is deterministic while the coordinator-written taskBrief is generative.

- **DETERMINISTIC: 57**
- **JEV-CANDIDATE: 4** (D-08, D-09 brief-gate half, D-28, D-29; D-45 and D-51 are marked future-Jev but classified DETERMINISTIC as they stand today)
- **DEEP-REASONING: 4** (D-09 brief-authoring half, D-27, D-70, D-72)
- **HUMAN-AUTHORITY: 3** (D-17 revoke, D-68 repo watchlist authorization, D-71 reconciliation authorization)
- **UNKNOWN: 5** (D-52..D-56: dormant/declared-only/absent)

Headline: the dispatch plane and the live gateway spine are already ~90% deterministic code (45 of the 51 core dispatch/spine decisions). The Jev opportunity is NOT "replace LLM calls" (there are almost none on the decision plane). It is (a) bounded advisory judges where the only signal today is a self-report (D-08) or a coordinator procedure (D-28/D-29), and (b) NEW selection/ranking decisions that are currently constants (D-02 executor selection, D-51 evidence reranking).

Absent or declared-only surfaces (verified): ExecutionAuthority/ExecutionAdapter/WorkerRuntime as named authorities (DECLARED-ONLY; the functions exist under other names); OmniRouter (ABSENT); per-decision model routing on the Orca path (ABSENT); live GitHub ingestion (ABSENT); worker selection authority (ABSENT: caller constant); WAITING_APPROVAL triage code (ABSENT).

## TENANTOS: PROVEN VS ASSUMED

Responsibilities: **1 fully reached, 3 scoped or implemented but unwired, 5 assumed.**

| Responsibility | Verdict |
|---|---|
| Tenant boundary | IMPLEMENTED but scoped, not universal: FYD journal gateway 400s (`tenant_required`, `tenant_mismatch`, `request_id_tenant_conflict`); FYD tenant-context + scoped stores in canonical HEAD; gateway namespace binding ("requested wins iff bound"), tenant registry, hostile suites (spoof ingress refusal, Postgres envelope isolation, vector isolation, worker tenant pin) |
| Workspace | ASSUMED: MC artifacts land in one shared path with no tenant directory partition |
| Resource quotas | ASSUMED: budgets.ts is pure/in-memory, no durable store, no dispatcher wiring |
| Credential references | ASSUMED: only `credentialPresent: boolean`; no issuance, no opaque resolution, no per-tenant binding |
| Worker availability | IMPLEMENTED and reached: dispatch route checks profile LIVE + capability allowlist + broker quota; ORCA `authorizeWorkOrder` fail-closed refusals typed |
| Execution environment | ASSUMED: nsjail profiles render deterministically but nsjail is "externally deployed"; the reached executor runs inline in the route |
| Network policy | ASSUMED: `no_network` is an envelope value checked at authorization, not enforced data-plane policy |
| Process lifecycle | IMPLEMENTED AS MECHANISM, UNWIRED AT DISPATCH: claim.ts (atomic tenant claims), lease.ts (fencing-token CAS), attempt-fencing.ts (zombie writes match zero rows; effect proven/absent/unknown), run-state-authority.ts `classifyUnknownExecution` (the UNKNOWN->HOLD invariant in code), recover.ts (new run with lineage, never resume in place), durable attempt schema. The reached MC dispatcher is synchronous and uses none of it. |
| Storage boundary | IMPLEMENTED but scoped: FYD scoped stores + gateway hostile suites assert isolation; NOT universal (FYD underlying stores unscoped; MC journal is one global JSONL) |

**Identity handoffs (20):** explicit 9 / inherited 4 / inferred 1 / duplicated 1 / accepted from untrusted input 1 / absent 5 / incorrectly reconstructed 1. (H5 double-counts: the check is explicit while the provenance it trusts is inherited; H9 splits record vs boundary.)

**Hostile isolation verdicts: 0 PROVEN, 3 PARTIAL, 3 ASSUMED:**
- A evidence cannot inform B: PARTIAL (enforced at FYD journal seam, Postgres envelope, Qdrant adapter; broken at MC journal projection which reads global; blurred at the event bridge)
- A ContextPack cannot enter B work: PARTIAL (integration assembler filters by namespace, but the reached work-order contract accepts `contextPackId` with zero tenant binding)
- A worker capability cannot operate on B: ASSUMED (capability+namespace-shape auth is explicit, but no worker/caller-to-tenant entitlement exists anywhere; grant issuance is explicitly "future")
- A search cannot retrieve B: PARTIAL (hostile suites assert namespace-required search against live Qdrant/Postgres; no single audit covers every surface)
- A GitHub repo cannot silently become B knowledge: ASSUMED (no live ingestion = absence of the vector, not proof of isolation; no repo-to-tenant binding anywhere)
- A Mission Control cannot project B state: ASSUMED, failing (`projectMissions`/`loadJournalEvents` are global; GET routes take no caller tenant)

**Scariest gap (live):** the MC dispatch route takes tenant from the HTTP request body (`route.ts:226`), checks only the static `SLICE_TENANTS` allowlist (`:234`), with no authenticated caller and no caller-to-tenant entitlement. ORCA then verifies only internal consistency (namespace shape, capability allowlist). A request can be consistently labeled as Tenant B without ever proving the caller was authorized for Tenant B, and the whole downstream chain inherits that unproven label as "authoritative". The tenant string is carried consistently; tenant AUTHORITY is never established.

**Second live gap (proven):** the canonical event bridge launders every tenant event's namespace to `core::system` (`event_bridge.js` never passes `options.namespace`; `unified_event_runtime.js:237` defaults it). The integration-branch fix (`bridge-tenant.ts`) sits unwired. Design hazard flagged: that same module falls back unknown/malformed tenant to `core::system` with `tenant_unknown=true` instead of refusing; if it ships as-is, a fail-closed boundary becomes fail-open visibility.

**Prior-map corrections (3):** tenanos decision-surface code exists on the integration branch but is unwired (the "no decision-surface code" claim is stale); `mc-dispatch-identity.ts:66`/`mc-tenant-gate.ts:45` do not exist in any observed repo (the tenant-resolution citations were wrong); P-088's gateway tenant-filter patches were designed but never applied (verified zero tenant references in the live gateway mission_control route).

**Adversarial tests designed: 19 (J-1..J-19), none run.** The highest-value ones: J-1 (kill after output before journaling; no crash-recovery loop on the MC path), J-12 (duplicate submission mints a sibling mission; no claim/lease at MC ingress), J-16 (worker claims success while tests fail; `verifyResultEnvelope` is structural only, a well-formed lie passes), J-19 (Tenant A data in Tenant B context; the weakest surfaces are MC projection and bridge output, exactly what an exfiltration test would target).

## GITHUB INGESTION: EXISTS VS REACHED VS BECOMES-EVIDENCE

**Exists (verified in code):** `GitHubTrendingScanner` (990 lines: trending scrape + ~35 search API queries + pinned-SHA enrichment of topics/README/source structure; every run re-queries from zero); temporal diff by `repository_id` + `observed_commit_sha` with **5 statuses** (`NEW_REPOSITORY_NO_ID`, `NEW_REPOSITORY`, `SHA_MISSING`, `UNCHANGED`, `CHANGED` with `old_sha`/`new_sha`/`pushed_at_delta_hours`/`evidence_level_delta`; SHA-pair delta only, no diff content fetched); deterministic `ClassificationEngine` (485 lines, zero per-event LLM calls); `DailyBriefingGenerator` (local markdown files); orchestrator with a continuous mode that **nothing runs** (no cron, no task, no daemon); `patch7_real_intake.py` (local copy of the intake driver, 4 bounded repos).

**The only live external path into PING's event spine:** `tandem/emit-observation.py` (fail-closed gates verified: semantic-domain gate, human-verification requirement, sha256 duplicate-emission guard, durable spool before POST, probe-before-POST crash-boundary recovery). **Nothing from GitHub flows through it**; it carries only outreach-engine step-7 distillations. PING-internal chain: `observation_worker.py` (DOCUMENT_IMPORTED -> chunked OBSERVATION_CREATED) -> `claim_worker.py` (OBSERVATION_CREATED -> CLAIM_GENERATED, `'verified': False`; claims are propositions, never truth).

**Assumed / does not exist:** webhook receiver, HMAC verification, delivery dedupe, D0 funnel, D1 judgments, GitHub-to-OBSERVATION_CREATED normalization, Patch 8, scheduler, daemon, database, queue, continuous crawler. `~/workspace/git-ingestion/` is design only. System-2 cost per GitHub event is zero because there are no GitHub events.

**Incremental-ingestion verdict: ASPIRATIONAL.** The chain OLD SHA -> NEW SHA -> changed files -> changed symbols -> changed dependencies -> affected knowledge -> affected missions does not exist. Only the SHA-pair comparison exists. Zero hits for `changed_files`/`changed_symbols` in the research pipeline. The webhook ADOPT verdict (cheapest incremental path, webhooks as lossy hints needing a reconciliation fetch loop) is design only.

**Duplicate-work instances: 6.** Worst: **drifted duplicate workers at the PING repo root vs `workers/`** (observation_worker 162 vs 96 lines, claim_worker, replay_worker, constitutional_runtime 152 vs 230 lines: all DIFFER). Two divergent implementations produce the same event types; running the wrong copy silently changes OBSERVATION_CREATED/CLAIM_GENERATED semantics. Also: `github_scanner.py` vs `.bak` inside the importable package; three "ContextPack" compilers with no single authority (see below); two retrieval paths feeding context packs; Patch 7 intake on two machines; every scan re-ingests from zero into local files PING never consumes.

**Observation vs canonical truth enforcement:** typed event chain + authority hierarchy. `authority_search.py` ranks CONSTITUTIONAL_LAW above TEMPORARY_OBSERVATION (rank 10, lowest); Qdrant candidates are stamped `TEMPORARY_OBSERVATION`/`retrieved_unverified`/`qdrant_fallback` with `lineage_depth: 0, witness_count: 0`, so mechanical verification `overall` is False by construction. SearchWorker: "Never answers directly from vector search." Enforcement gap: the duplicate worker copies bypass the canonical path if executed; enforcement is per-implementation, not per-authority.

## CONTEXTPACK AND SEARCH

**Three ContextPack compilers, one name, three scopes, three owners:**
1. `runtime/cognitive/context_pack.py` (ContextPackBuilder, cognitive Q&A): question + authority chain + supersession chain + verification + supporting documents + lineage + witness roots + graph expansion + contradictions + repository symbols. `confidence` = passed/6 checks; `validate()` returns violations unless the source is `qdrant_fallback` (explicitly exempted). Cache: 24h TTL, keyed `query_hash + authority_root`.
2. `ping-runtime/context/context_compiler.js` (mission execution): canonical object refs, artifact refs, evidence refs (event IDs), relationship refs, deterministic `context_pack_id` from (missionId, query, correlationId, retrievalManifest). No sufficiency gate observed.
3. `tandem/build-context-pack.py` (Meta AI delegation): mission/positioning, geography, coverage negatives. Versioned by content hash. Sufficiency decided by the consumer, not enforced.

**Retrieval strategies:** exact lookup, Postgres queries, object relationships (graph_expand depth 2, lineage_search), git history (build-time only), GitHub search (exists but not wired to PING), lexical, structured indexes all EXIST. Vector retrieval is **DEGRADED and partly fake** (below). External research is NOT wired (Meta AI passes enter only via emit-observation.py distillations, never as retrieval).

**Qdrant-degradation verdict: structure graceful, detail fail-silent.** `authority_search.py` degrades Tier 1 Postgres -> Tier 2 local JSON -> Tier 3 Qdrant. But every tier fails silent (`except Exception: return None`); `RetrieverWorker._qdrant_search` returns `[]` on any exception and stores a zero-related-events context pack indistinguishable from "nothing related found". **No reduced-retrieval indicator exists anywhere.** The Q28 owner question (deliberately take Qdrant down, prove fail-closed with a visible indicator) is unanswered. And **the vector retrieval is fake even when healthy**: `RetrieverWorker._text_to_vector` builds a 768-dim vector from a sha256-seeded PRNG (mulberry32). Deterministic noise, not an embedding; similarity search over it is meaningless. Last observed Qdrant state: DEGRADED/OFFLINE since 2026-09-28 15:40 MDT. Standing verdict: VECTOR SEARCH = UNAVAILABLE.

**Who decides retrieval sufficiency today:** `CognitiveSupervisor` (`runtime/cognitive/supervisor.py`): `validate_or_raise` + `_enforce_authority`. Sufficiency = no validation violations + authority resolution present + mechanical verification `overall` True (unless `qdrant_fallback`). Confidence = mean of worker confidences. This applies only to the cognitive path. The JS mission compiler and the tandem pack have no sufficiency decider. Per-implementation, not per-authority.

## JEV: OFFICIAL API AND MODEL FACTS (verified against https://docs.typesafe.ai, 2026-09-28)

- **Model: `jev-1.13.0`** (Jev 1.13 family, released 2026-09-15). "v0.2.0" does not exist in the official docs; the v0.2.0 report was wrong. **Endpoint: `POST https://api.typesafe.ai/v1/systemone`** (API v1). `jev-latest` and `jev-preview` are moving aliases that currently resolve to jev-1.13.0; both move on new releases. Versioned IDs are accepted by the `model` field whether or not they appear in `GET /v1/models` (the pinned build is served but unlisted; our live usage corroborates: 200).
- Request: `{model, state (string | object | array of text), questions: {id: Question}}`. Question IDs are caller-chosen and not sent to the underlying model. Primitives: **Noul** (yes/no, optional criteria poles), **Choice** (2-255 options, single winner), **Score** (2-10 ordered levels; score can land between levels).
- Response: `{model, answers: {id: Answer}, usage: {input_tokens, output_tokens}}`. Noul answer is `{type: noul, noul: 0..1}` **only: no separate confidence field; the probability IS the belief**. Choice/Score answers include `probabilities` and `confidence`, where confidence is a **derived concentration statistic `(count * peak - 1) / (count - 1)`**, not an independent estimate. Docs warn: confidence summarizes distribution concentration, **not workflow correctness or permission to act**. Thresholds do NOT carry across primitive types.
- **Calibration is a hypothesis until reproduced on our distribution.** Vendor trains with RLCD (a 95% answer should be right ~95% of the time); one independent analysis measured calibration error ~0.03 on 1,200 MMLU items, weaker on harder fresh problems, and found the same option's probability moved 0.84 to 0.96 depending on option-list position. Treat probabilities as calibrated-but-order-sensitive.
- **Batching:** all questions in one request share one state and are evaluated in parallel and in isolation; they cannot see each other's answers. Vendor cookbook: 13 questions in one call was 12.2x cheaper and 10.0x faster (vendor measurement; reproduce).
- **Latency:** vendor-published 70-500 ms; community-measured p50 ~230 ms. Hypothesis; budget 1s timeouts.
- **Cost: $0.042 per million input tokens; output tokens free.** Our code's $0.001/call budget estimate is ~30x above a measured ~$0.00003 typical call; safe margin, keep. Existing `custom.typesafe` credential works; no new credential or paid subscription required.
- **Rate limits:** 250,000 tokens/second / 1,200 requests/minute; limits adjust dynamically without notice. Our courier does NO retries; a 429 fails closed immediately (safe; vendor recommends exponential backoff on 429/529 only).
- **Error classes:** 401, 422 (body names the offending field), 429, 529.
- **Documented failure modes for jev-1.13 (official jaggedness page):** literal reading; math/numbers unreliable (no counting, arithmetic, hex/RGB nearness; score interpolation not reliable); date/time comparison; indirection and double negatives; large irrelevant states (accuracy falls, context rot); adversarial content in state (state is data; injections can steer answers); contradictory instructions vs criteria; no structural invariants (a Noul and a yes/no Choice on the same question can disagree; P(noul) + P(not noul) = 1.19 observed); generation is not trained (extract candidates in code, let Jev select).
- **Official guidance:** pin the versioned ID when thresholds are tuned (our model_contract.json does this; aligned); log the response `model` field per result (our ledger does; aligned); per-action thresholds scaled to stakes (0.6 floor catches genuine uncertainty; destructive >0.85); "Typed output guarantees the interface, not truth." ZDR available on enterprise plans. English is primary; test non-English workloads ourselves.
- **Tooling discrepancies found:** skill doc smoke shape uses the `jev-latest` alias while the production contract pins `jev-1.13.0` and bans the alias (align or annotate); our attestation reads `usage.cost`, which the official schema does not return on direct calls (compute cost locally from input tokens); courier has no retry/backoff (optional improvement, 429/529 only); the Pig `jev-decide.ps1` courier assumes the TypeSafe endpoint but carries an OpenRouter key, and OpenRouter serves Jev via `/decisions`, not `/v1/systemone` (dormant, but miswired if ever used).

## JEV ECOSYSTEM HARVEST (10 patterns: ADOPT 5, ADAPT 5, REJECT 0)

Hypotheses verified: the official Agent Skill keeps business logic, permissions, and final action in application code ("Code owns the workflow; the model supplies programmable common sense"); `jevgrep` uses deterministic/ripgrep shortlisting then one batched Jev Choice (per-option probabilities = ranking, ~240 ms); `jev-harness` extracts assertion slices, redacts secrets, masks injections, and prunes context before the main model sees tool results. Nobody published a literal A/B harness, but flip-rate comparison and error-driven iteration are the eval discipline substitutes.

- ADOPT: TYPED CHOICE, SCORING, RELEVANCE FILTERING (one batched Noul per candidate, code thresholds), SKILL ROUTING (per-turn subset selection, confidence floors, thresholds in one reviewable file), RISK JUDGMENT (confidence-gated routing with per-action thresholds; official pattern, ecosystem-converged).
- ADAPT: RANKING (deterministic candidate generation in code, one batched Jev Choice, per-option probabilities as the rank; adapt to our evidence types), TOOL ROUTING (Jev proposes tool subsets; code owns the always-visible core set and floors; verdicts grant no permissions), COMPLETION JUDGMENT (second opinion alongside code-owned acceptance criteria; low confidence routes to human review, never auto-approval), CONTEXT FILTERING (deterministic truncation first, Jev refinement second; adversarial-content jaggedness means injection masking must precede it), MODEL ESCALATION (tri-state escalate-on-low-confidence; the escape valve is code-owned, never model-driven recursion).
- REJECT: 0. Every pattern maps to an existing PING decision lane with the code-in-control boundary intact.

Three patterns most directly applicable: (1) RISK JUDGMENT for PING's approval gates (Jev judges risk; code and the owner where required authorize; never invert); (2) SKILL/TOOL ROUTING for the worker runtime (measured 52-56% prompt reduction in the wild); (3) RELEVANCE FILTERING as the cheap filter in front of every expensive decision (code thresholds; calibration validated on our data before thresholds ship).

## TOP 20 JEV DECISIONS (research only; ranked by frequency x cost, risk-adjusted)

1. **D-08 worker-result usefulness judge** (~30/d): independent second opinion on the worker's self-reported status. Advisory only; flags unknown / forces reconcile; can never override a structural FAIL or promote to completed. Eval: completion-corpus (16 items).
2. **D-72 skill-choice contracts** (~100s/d, speculative): typed skill-choice (which CLI/skill for this task) is the highest raw volume, but no contract, no label source, and the coordinator does it inline today; rank held pending a typed contract and shadow harness.
3. **D-51 Ask evidence reranking** (~20/d): rank/order/filter context items for the answer composer; never decides what the executor may see. Standing first experiment (shadow mode).
4. **D-02 executor selection among eligible workers** (~30/d): rank already-authorized workers (no tenant identity in payload); confidence threshold -> dispatch or System-2 escalation; `executor_selection` record per dispatch. J4 shadow harness exists (37/37 tests).
5. **D-09b work-order brief quality gate** (~30/d): pre-dispatch check of the coordinator-written taskBrief (capability allowlist, constraints consistent, no secret-shaped material, input refs resolvable). Fail -> coordinator rewrites; never edits.
6. **D-28 WAITING_APPROVAL triage** (~5/d): mission state -> {hold, propose, escalate} + rationale. Escalation IS the human path; never auto-approves. Eval: escalation-log.jsonl (25 records). No code primitive exists today.
7. **D-29 grill-20 first-pass triage** (~10/d): pre-score the 20 locked checks; coordinator verifies; escalate on any low-confidence or C4-adjacent check; never emits the final verdict.
8. **D-26b evidence-chain completeness check** (~10/d): is the chain actually complete or did the worker claim completion with missing links (the witnessed orca-run-mu6wmbzn false-negative class). Advisory flag on `20-assess.json`.
9. **D-45 priority calibration** (~claims/d): the 4-rule `_prioritize` is crude (rating<=2 -> urgent); a calibrated priority model is low-risk and high-leverage for the recommendation chain. Needs a label source first.
10. **D-55 merge validation assistance** (freq unknown): validateFile/validateGitDiff in proposal tooling; Jev pre-screens diffs, deterministic gates decide. Usage on the live path unverified; shadow-first.
11. **D-66 Ask context bounding** (per Ask query): D0 term-overlap re-rank now; D1 relevance sieve gated on the agent path. Direct instance of the relevance-filtering ecosystem pattern.
12. **D-27 PLAN objective -> tasks** (~10/d): plan triage as a bounded typed judge on the coordinator's plan (task set sane, capabilities allowed, constraints present); plan authoring stays frontier.
13. **D-30 event -> mission type/priority** (100s events/d): the 28-type static map is exact; Jev's role is limited to priority-band calibration on unmapped or low-confidence types, never remapping canonical types.
14. **D-57 task tier classification** (per broker task): regex T0..T4 today (uncertain -> T1; T3/T4 never auto-assigned); a typed Jev tier could reduce the uncertain->T1 default bucket. Advisory; T3/T4 exclusion stays code-owned.
15. **D-58 broker failure classification** (per broker run): regex JSONL stream classifier today (SUCCESS/EXHAUSTED/RATE_LIMITED/AUTH_FAILED/TEMPORARY_FAILURE/POLICY_BLOCKED/TOOL_FAILURE/UNKNOWN); Jev second-opinion on the UNKNOWN bucket only.
16. **D-44 business category** (per claim): 10-category static map; low Jev value unless the unmapped tail grows. Ranked low.
17. **D-46 recommended action/reason** (per classification): static maps; a Jev variant would need a verified-outcome label source that does not exist. Ranked low; do not build.
18. **D-48 dormancy classification** (on-demand audits): keyword/git-churn classifier today; Jev assistance for the `needs_review` bucket only; `safe_delete` stays deterministic.
19. **D-62 broker cost estimate** (per broker task): ESTIMATE-labeled model today; Jev has no advantage over a calibrated table; not recommended (deterministic wins).
20. **D-63..D-65 emission gates** (per emission): stay DETERMINISTIC. Listed to record the negative: semantic-domain, verified-transition, and duplicate-emission gates are fail-closed security boundaries and must never become probabilistic.

For every candidate: Jev may rank, judge, or propose; it may never authorize, grant, publish, mint identity, approve, or suppress a constitutionally required signal. Processor selection never grants authority. Model distribution, evidence sufficiency, empirical reliability, and criticality remain separate; no model probability authorizes consequential action.

## SHADOW RESULTS (real sample counts, read-only measurement)

Existing shadow-mode records found by measurement, not by design:

- `fyd-intel/jev-decisions.jsonl`: **9 records** (8 choice, 1 noul). Decision log from live-shadow invocation via jev_ask.py + jev_contract.py + model_contract.json (pinned jev-1.13.0, purpose gating, budget gate).
- `ping-decision-seam/shadow-decisions-2026-09-28.json`: **6 samples** (S1-S6), contract `mc.authorize_work_order/v1`, each carrying `current` / `current_reason` / `evidence_digest` / `id` / `input_digest` / `p_grant` / `shadow_http` / `shadow_latency_ms`. The per-record schema already implements the required fields (current result, Jev result, input digest, evidence digest, contract version, latency).
- Eval corpora (`~/workspace/jev-eval/`): **backlog-dataset 53 items, completion-corpus 16 items, replay-dataset 51 items** (items.jsonl line counts), each with README + build script. The completion-corpus (16) is the eval set for D-08.
- Harnesses: J4 executor-routing shadow harness 37/37 tests; J7 fail-closed provider harness 18/18 tests.
- Spend ledger: `fyd-intel/spend-ledger.jsonl` exists (budget gate wired in the contract).
- Schema inventory: `jev/shadow-recorder` branch (schema + tests + 3 demo records + MC event spec) vs JEV_DECISION_EVALUATED event_data schema v1 (design) vs the two JSONL logs above. Four decision-record shapes; CONVERGE to one.

No 5-10-decision head-to-head shadow run with verified labels and eventual outcomes has been executed yet. The shadow spike DESIGN follows; execution is read-only measurement only until the convergence pass lands.

## SHADOW SPIKE DESIGN (continued per hold notice; design + read-only measurement only)

Objective: 5-10 real reached decisions, each recorded with current result, Jev result, full distribution, input digest, evidence digest, contract version, latency, cost, verified label, eventual outcome. Shadow only: no decision changes, no authorization, no canonical writes.

Candidate set (drawn from reached decisions with existing eval material):
1. D-08 worker-result usefulness: 16-item completion-corpus as the verified-label source; Noul (completed/failed/unknown) + confidence; compare against verifyResultEnvelope's structural verdict and the eventual reconciled outcome.
2. D-45 priority calibration: backlog-dataset 53 items; Score over {urgent, high, medium, normal}; compare against the 4-rule `_prioritize`.
3. D-02 executor selection: J4 harness fixtures; Choice over eligible workers; measure against the current constant (agentId=caller) for rationale-record completeness only (no dispatch change).
4. D-28 WAITING_APPROVAL triage: escalation-log.jsonl 25 records; Choice {hold, propose, escalate} + rationale; verified label = the actual escalation outcome.
5. D-29 grill-20 first-pass: historical 20-check runs; per-check Noul pre-score; measure agreement with coordinator verdicts and low-confidence routing rate.
6. D-51 evidence rerank: replay-dataset 51 items; one batched Choice over retrieved candidates; measure top-1/top-10 lift vs the current lexical tier.
7. D-26b chain completeness: 20-assess.json history; Noul on chain completeness; verified label = manual chain audit.
8. D-09b brief quality gate: historical taskBriefs in evidence dirs; Noul per gate criterion; verified label = downstream dispatch failure/deny rate.
9. D-58 failure classification: broker JSONL logs; Choice over the failure taxonomy on the UNKNOWN bucket; verified label = operator reclassification.
10. D-57 task tier: broker task descriptions; Choice T0..T4; verified label = the coordinator's actual tier assignment.

Per-record schema (extends the existing shadow-decisions.json fields): decision_id, decision_type (D-01..D-72 reference), contract_version, input_digest, evidence_digest, current_result, current_reason, jev_result, jev_distribution (full probabilities), jev_latency_ms, jev_cost_usd, model (response model field, versioned ID), verified_label, label_source, eventual_outcome, outcome_source. Tenant identity is excluded from Jev state by standing rule; hashes only in canonical records.

Stop condition (pre-registered before any calls): if the shadow run shows no measurable lift on the primary metric (agreement with verified label) at equal or lower cost than the current path, the candidate is REJECTED at the seam and the next ranked candidate is tried. "Jev feels faster" is never evidence.

## TOP 5 JEV EXPERIMENTS (ranked by frequency x cost x reversibility x measurability)

1. **E1: D-51 Ask evidence reranking (shadow).** Freq ~20/d. Cost ~$0.00003/call, batched. Reversibility: total (shadow only, no path change). Measurability: replay-dataset 51 items with known-good outcomes; metrics = task success, files read, tokens, latency, cost; control = current lexical retrieval; treatment = deterministic index -> Jev relevance -> reduced context -> same downstream agent. Stop condition pre-registered: if Jev loses on task success per token, report where and pivot. **Spec complete below. Implementation HELD until convergence lands.**
2. **E2: D-08 worker-result usefulness judge (shadow).** Freq ~30/d. Cost one Noul per dispatch. Reversibility: total (advisory; can never override structural FAIL). Measurability: completion-corpus 16 items; metric = agreement with eventual reconciled outcome vs structural verdict alone.
3. **E3: D-02 executor selection (shadow).** Freq ~30/d. Cost one Choice per dispatch. Reversibility: total (selection != authorization; dispatch unchanged). Measurability: rationale-record completeness + low-confidence escalation rate; J4 harness 37/37 as the fixture base.
4. **E4: D-09b brief quality gate (shadow).** Freq ~30/d. Cost one Noul per dispatch. Reversibility: total (fail -> coordinator rewrites; Jev never edits). Measurability: downstream deny/failure rate on flagged vs unflagged briefs; historical briefs in evidence dirs.
5. **E5: D-28 WAITING_APPROVAL triage (shadow).** Freq ~5/d. Cost one Choice per mission. Reversibility: total (never auto-approves; escalation IS the human path). Measurability: escalation-log.jsonl 25 records; metric = triage agreement with actual escalation outcomes + rationale quality.

If E1 loses, report where and pivot to E2 without rationalization. No grand refactor is authorized by wins alone; a measured win authorizes only a bounded implementation proposal.

## FIRST EXPERIMENT SPEC (E1, implementation HELD)

**Hypothesis:** a Jev relevance filter between the deterministic index and the agent reduces context tokens and improves task success on historical repository questions.

**Corpus:** 20-50 historical repository questions with known-good outcomes (seed: replay-dataset 51 items; trim to the repository-question subset).

**Control:** current retrieval (lexical tier / existing path) -> full context -> same downstream agent.

**Treatment:** deterministic index -> one batched Jev Choice over the shortlist (per-option probabilities = ranking, jevgrep pattern) -> reduced context -> same downstream agent. Tenant identity excluded from Jev state.

**Metrics:** task success (against known-good outcome), files read, input tokens, output tokens, end-to-end latency, cost per question, top-1/top-10 retrieval lift.

**Contract:** model pinned `jev-1.13.0`; response `model` field logged per result; cost computed locally from input tokens at $0.042/MTok; per-record shadow schema as above; 429/529 fails closed (no retry) per current courier behavior.

**Pre-registered stop condition:** if treatment task-success-per-token is not strictly better than control on the corpus, Jev loses for this lane; report the loss with the numbers, name where it lost, and move to E2. No threshold tuning after the fact to rescue a loss.

**Status:** SPEC COMPLETE. Implementation is HELD per the 2026-09-28 hold notice (convergence coordinator owns FYD product writes; one writer per semantic unit). Resume on convergence landing.

## WORKERS AND CONTRACTS (F+I lane complete 2026-09-28 ~18:27 MDT)

Lane report: `lanes/workers-learning.md`. Verdicts quoted from the lane.

**Workers inventoried: 35 named workers + 7 envelope implementations.** Availability as reported: **live 33** (8 canonical pipeline + jev-shadow + hermes + cloud-subagent + ollama + 4 copilot identities + 4 Pig browser workers + 7 skill/tool workers + outreach engine + event emitter + rule provider + MayExecutePolicy + live Jev model), **dormant 5** (intelligence worker, codex owner-HOLD, opencode, local model catalog with zero callers, opencode CLI), **broken 0** (codex's stale blockedExternal is a live misconfiguration, not a broken worker), **mock/synthetic 3** (lane B5 deterministic-js, muse-as-worker, test batteries).

- Canonical pipeline workers (W1-W10): observation, claim, classification, recommendation, projection, replay, witness, lineage (all live), intelligence (dormant via empty eventTypes), jev-shadow (live, zero execution authority). All extend BaseWorker, emit via UnifiedEventRuntime, return structured results; dispatch is WorkerRuntime (eventTypes matching), not the mission label map.
- ORCA exterior workers (W11-W19): hermes, cloud-subagent (primary fleet), ollama, identity_1..4 (copilot), codex (dormant, owner HOLD), opencode (dormant). Read live from the Pig's `vendor/external_agent_adapter.js:60-220`.
- Pig browser workers (W22-W25): fb-engage + platform drivers, CDP watchdog, Meta AI research worker. Skills/tools (W26-W32): facebook-cli, gmail, messenger, instagram-cli, social.search, outreach engine, event emitter. Decision workers (W33-W35): RuleClaimDecisionProvider, MayExecutePolicy, live Jev model.
- The 17 requested worker families (repo-acquire, repo-index, git-diff, symbol-extract, dependency-map, test-run, browser, web-acquire, structured-data, database-read, log-analysis, search, evidence-extract, verification, patch, build, deploy-proof) have **zero literal implementations** workspace-wide and Pig-wide (greps completed today). The lane maps each to actual coverage (often "absent as a worker; ad-hoc or agent-executed") rather than inferring absence of capability.

**Structured vs narrative:** the bindings are structured, the worker turns are narrative. Envelopes, outcome vocabularies, typed decisions, and job result JSONs are byte-verified structured state. Worker `output` content is provably unbound (lane B5 D8: an objective rewrite verifies valid) and `evidence` carries zero semantic checks (D7). Retryability and effect state are decided by PING, never asserted by workers.

**Envelopes: 7, converging on ONE canonical WorkOrder/ResultEnvelope contract.** E1 (live on the Pig), E2 (authority doc), E3 (reference copy), E4 (harvested contract), E5 (outcome vocabulary), E6 (unit lifecycle), E7 (proposed unified spec, not implemented). No competing envelope exists. The 14-field work-order envelope in / 8-field result envelope out (structural echo-binding) from orca-adapter is the live canonical surface; lane 14's worker-contract comparison report is the reference analysis.

**Eval datasets for shadow experiments: 120 labeled decisions** (L1 51, L2 53, L3 16 = backlog/replay/completion corpora) with verified labels and documented caveats (null live-model fields; no UNKNOWN examples in L2; routing has no multi-class selection labels; 4 L1 items outcome_known:false). Plus L5 (6 shadow agreement samples, Brier 0.0076, 6/6 agreement) and L4 (9 live Jev records, toy-shaped questions). L6-L12 (LEDGER, FAILURE_LEDGER, learnings, angle-performance, intent ledger, action-truth, HOLD/UNKNOWN register) are outcome records but not decision-labeled; L13 (self_improvement) is memory learning, not PING learning.

**Three biggest worker-contract gaps:**
1. Authority posture is adapter data, not a per-order authority decision (lane 14 R1 / lane B5 D3). AGENT_PROFILES.maxConstraints decides what a worker runs under; swapping hermes for cloud-subagent changes the executable capability set while authorizeWorkOrder stays green.
2. Objective fidelity is unfenced (B5 D8): a worker silently answering a different objective verifies valid.
3. The learning loop the refactor would feed does not exist (lesson store ABSENT per lane 15). Outcome records are plentiful and mostly typed, but the target loop (outcome > candidate lesson > evidence > hypothesis > replay/counterfactual > falsification > promotion) is documented only. The refactor can wrap and evaluate, not yet learn. Jev is currently a typed shadow signal with zero authority.

**Grounding caveat (lane's own):** PING-side claims reused from lanes 5/9/11/14/B5/15 remain hypotheses until clean-checkout replay. The gateway live spine inventory above (8 canonical workers, `canonical_workers.js:690-761`) is cross-lane corroboration; treat per-worker reachability claims as cited, not independently replayed.

**Drift warning stands (from lane C):** root-level worker copies differ from `workers/`/`runtime/` copies; running the wrong copy silently changes event semantics. Enforcement is per-implementation, not per-authority. Deletion blocked until the reached copy is proven.

## MISSION CONTROL: REAL VS MOCK

Verdict: a dashboard with a real projection layer and honest truth-law, not a control plane and not a mock.

**10 autonomy questions: 0 ANSWERED / 8 PARTIAL / 1 MOCK / 1 ABSENT.**
- PARTIAL (8): what PING is trying to accomplish (no goal rollup; schedule filenames are not intent), what it knows/does not know (strongest layer: UNKNOWN is first-class, but no "missing evidence" list), what decisions it is making (verdicts projected, never decision units; one MOCK element: every UNKNOWN mission renders "RECONCILIATION IN PROGRESS" while no reconciler exists), what authority exists (verdicts yes, check trail no), what may have happened (lost-result case indistinguishable from RUNNING), what was verified (materials yes, verdict trail no), what needs me (GRILLING-BRIEF regex parse is fragile; strongest human-gate primitive has zero UI).
- MOCK (1): WHAT IS RUNNING (display): TODAY "happening now" hardcodes RUNNING for anything in the inprogress dir; a stale leftover dir renders as RUNNING. No process liveness bound to the dir listing. The raw data is real; the RUNNING claim is not evidence-backed. Sharpest overclaim on the page.
- ABSENT (1): WHY THIS WORKER (no selection exists to project; projecting one would be fabrication).

**Attention queue: 0 fully real projections / 2 partial / 2 real-backend-with-absent-projection / 6 absent.** OUTCOME UNKNOWN (partial) and SECURITY ISSUE (partial) exist; APPROVAL REQUIRED and RECONCILIATION REQUIRED are real in the backend with zero UI projection; absent: EVIDENCE REQUIRED, BUDGET ISSUE, WORKER UNAVAILABLE, CONFLICT, FAILED VERIFICATION, POLICY DECISION. The attention queue does not exist as a concept in Mission Control (zero hits for attention/attentionQueue/REQUIRES_HUMAN in the MC tree).

**Causal spine: 12 of 17 links present or partial; 5 absent.** Fully real: MISSION, EVIDENCE, ARTIFACT. Partial (9): QUESTIONS, PROCESSOR, DISTRIBUTION, AUTHORITY, CAPABILITY, WORKER, ATTEMPT, POSSIBLE EFFECT, OUTCOME. Absent: DECISION UNITS, CRITICALITY, VERIFICATION, LEARNING, NEXT ELIGIBLE WORK.

**Highest-leverage observability gap:** journal typed decision records as first-class events. Every gate already produces a typed decision in code (`authorizeWorkOrder` 8 checks, `reconcileGate` typed refusals, `verifyResultEnvelope` gates, `orca_policy.js` records). None is journaled or projected; MC shows only the verdict. One read-only projection of decision records through the existing journal would answer three autonomy questions at once (decisions, authority, verification) and unblock three absent attention items (RECONCILIATION REQUIRED, FAILED VERIFICATION, POLICY DECISION) with no new authority and no new store. The served `:3100` build was ~21 hours older than the inspected worktree at audit time; source/build/serve binding is required before any UI claim.

## RESTART AND RECONCILIATION

- f01 HOLD reaper (`~/workspace/f01-fix/`): HOLD non-dispatchable, reconciliation-only transitions, `_failMission` proven-failures-only. 21/21 tests green, never committed. WIRE: needs a commit/owner decision, not a rebuild.
- `mc/lane-c-reconcile-gate` branch: S5 reconcile gate on the dispatch path (P4 RETRY-AFTER-UNKNOWN closure). CONVERGE with f01; two implementations of the same closure.
- `classifyUnknownExecution` (integration branch): total over the evidence cube; effectProven+!effectAbsent -> MARK_SUCCEEDED_FROM_EVIDENCE (reexecute=false); indeterminate -> HOLD_NEEDS_RECONCILIATION (reexecute=false). The invariant in code form.
- attempt-fencing.ts (315 lines + SQL + test): zombie writes match zero rows; timeout/stale projects to unknown.
- recover.ts: new run with lineage, never resume old attempt in place.
- AGENTS.md still records "Reaper-vs-HOLD design gap (open, needs Nolan)": after a HOLD record, `reapExpiredLeases` resets to created and re-dispatches ~60s later, an automatic retry of an unknown-outcome mission. Do not deploy the stuck-running watchdog until the design word lands.
- Wake lease: design doc only (`pig/incident-2026-09-28/draft-wake-lease-design.md`). BUILD or DROP per owner call.

## DUPLICATION AND CONVERGENCE (overlap report for the convergence track)

These semantic units carry multiple competing implementations. Per the hold notice, overlap is REPORTED here, not written: the convergence coordinator owns the writes.

**Byte-identical multi-copy units (purest CONVERGE; zero behavioral divergence):**
- `typed_decision.js` x3 (sha fde15d42): jev-stage + ping-observations + jev-failure-harness.
- `context_pack.py` x5 (sha 1cb71d44): ping-codex-convergence + ping-observations + jev-failure-harness + ping-harvest-12h + constitutional-convergence-authority-law.
- `identity_authority.js` x3 (sha c05060d0): ping-codex-convergence + ping-observations + constitutional-convergence-authority-law.
- `orca_policy.js` x3 (worktree copies).
- Tenant-context/envelope/mc-dispatch carries duplicated across every design worktree.

**Same closure, two implementations (pick one, preserve behavior):**
- f01 HOLD reaper vs `mc/lane-c-reconcile-gate` S5.
- `mission_intent.py` MC_LANE_UNKNOWN/revocation vs reaper semantics.
- `orca/hold-verify.js` vs f01.

**Same unit, diverging lineages (newest first):**
- ContextPack: tenanos-wave P-098 `context-pack.ts` (newest, typed, 321 lines + test) vs `ping-decision-fabric/staging/mc-context-pack.ts` vs `runtime/cognitive/context_pack.py` (older lineage). Do not keep three.
- Identity: canonical-tree identity files vs tenanos-wave P-092 tenant-kit (556 lines, newer than canonical `src/fyd/tenant/tenant-context.ts`) vs JS `identity_authority.js` lineage.
- Approval: `mc/approval-request` branch (ApprovalRequest primitive + validator + CLI) vs phase1 approval-door `gate.ts` (@ af7d2688, terminal-first ratification, CLOSED lane). Compare before any new approval work; SUPERSEDE the t2-gate-ferry tarball copy.
- Decision-record schema: `jev/shadow-recorder` branch vs JEV_DECISION_EVALUATED v1 (design) vs `jev-decisions.jsonl` vs `shadow-decisions-2026-09-28.json`. Four shapes; one wins.
- Unknown-outcome port: `feat/orca-unknown-outcome-port` (per-class effect adapters) vs integration-branch `classifyUnknownExecution`. CONVERGE.

**Live hazards to resolve during convergence (not after):**
- The event-bridge namespace laundering (proven live) and the request-body tenant authority gap (live). These are not convergence aesthetics; they are the two tenant-isolation findings that must not survive the pass.
- The drifted root worker copies (observation/claim/replay/constitutional_runtime differ across copies). Convergence must prove which copy is reached before deleting any.

**Do-not-build list (already exists; any new implementation of these is a duplicate):**
- Decision-record store (exists on `jev/shadow-recorder`).
- WAITING_APPROVAL code primitive does NOT exist; this is the one genuine BUILD.
- GitHub webhook D0 funnel does NOT exist; genuine BUILD.
- TypedDecision contract exists x3; dedupe, do not rewrite.

## SURGICAL PATCH (earned candidates; all HELD)

No patch is authorized under the hold notice. If the convergence coordinator asks for the smallest earned patch after landing, the candidates are, in order:

1. **Event-bridge namespace pass-through** (`ping-runtime/events/event_bridge.js`): pass `options.namespace` through `_bridgeCanonicalEvents` instead of letting it default to `core::system`. Proven live laundering; smallest possible fix at the exact failing line. Must NOT ship the `bridge-tenant.ts` unknown->core::system fallback alongside it (fail-open hazard); refuse unknown tenants instead.
2. **MC dispatch tenant entitlement check** (`src/app/api/mc/dispatch/route.ts:226-234`): replace the allowlist-only gate with an authenticated caller-to-tenant entitlement check. Larger than (1) but it is the scariest live gap. Requires the authentication design first; do not ship a half-measure.
3. **RetrieverWorker pseudo-vector removal or quarantine**: the sha256-seeded "vector" is actively misleading. Delete or gate behind an explicit `FAKE_VECTOR` flag so no D1 design assumes vector recall from it.
4. **Decision-record journaling projection** (read-only): emit one journaled record per gate evaluation (check name, input digest, outcome, reason) and project the check trail in MC mission detail. No new authority, no new store; the highest-leverage observability gap.

None of these is executed here. They are listed so the convergence track can claim exactly one without re-deriving the evidence.

## ARCHITECTURE JEV MUST NEVER OWN

- Authority: Jev is not an authority, agent, canonical truth, execution owner, permission owner, publisher, or self-approver. A Jev decision is evidence/input to execution, never canonical permission.
- Tenant identity: excluded from Jev state by standing rule; hashes only in canonical records.
- The emission gates (D-63 semantic-domain, D-64 verified-transition, D-65 duplicate-emission): fail-closed security boundaries, never probabilistic.
- Identity fence (D-03), tenant binding (D-04), revocation (D-17), reconciliation authorization (D-71), repo watchlist authorization (D-68): human or deterministic authority only.
- Suppression: Jev may rank attention but may not suppress constitutionally required attention.
- No chain-of-thought UI: Mission Control exposes structured state, evidence, decisions, and outcomes only.
- Model distribution, evidence sufficiency, empirical reliability, and criticality stay separate. No model probability authorizes consequential action. Processor selection never grants authority.

## DELETIONS MADE POSSIBLE (only with ownership/reachability proof)

Do not delete unless ownership and reachability are proven; a duplicate-looking file may be the reached one.

- `scanners/github_scanner.py.bak` (stale backup inside the importable package; verify no import references, then delete).
- `RetrieverWorker._text_to_vector` pseudo-vector path (actively misleading; quarantine or delete after proving no live consumer depends on the noise).
- Dangling WIP commits (10 orphaned stash-like states; low harvest value; SUPERSEDE after confirming branches integrated).
- `t2-gate-ferry-2026-09-28.tgz` (SUPERSEDE by the ratified phase1 branch @ af7d2688).
- node_modules bloat in lane-e-ask/side-visual-identity/arrow6-sitepatch (build residue, not source).
- ~46 `event_queue/*.json` spill files in constitutional-convergence (runtime output, not source).
- 16 prunable workspace-repo worktrees (stale metadata; confirm no unique uncommitted work first, especially track-a pairs, mc-budget-repair, gap1-F2-absorb-floats).
- copper-v2 / fyd-privacy-p0 broken worktree metadata (inventory their full contents first; they hold an object-identity IDENTITY-LAW.md and fyd-product-lane mirrors).
- Dormant ExecutionEngine: declared-only and uninvoked, but still instantiated at boot and mounted at `/orchestration`. Deletion requires a reachability proof (container logs showing zero `/orchestration` calls from PING components), not just a code read.
- If Jev wins E1-E5: nothing on the decision plane is deleted. Jev candidates are advisory judges and new selection/ranking decisions; the deterministic gates they advise stay. What "loses" is the coordinator-procedure time, not code.

## HAND-WRITTEN CODE REQUIRED (only what the forest genuinely lacks)

1. WAITING_APPROVAL triage primitive (D1 candidate; coordinator procedure today; zero code).
2. Live GitHub webhook D0 funnel (receiver, HMAC, delivery dedupe, event-type router). Prerequisite: repo-to-tenant binding design, or the first ingestion replays the namespace-spoof class.
3. Wake-lease implementation, if still wanted (design doc only).
4. MC journal tenant partition or authenticated caller scoping (the projection gap + the authority gap are the same fix).
5. Visible reduced-retrieval indicator on the search path (Q28: take Qdrant down deliberately, prove fail-closed with a visible signal).
6. Background reconciler for RECONCILIATION IN PROGRESS (the label exists; the worker does not).
7. Claim/lease at MC ingress (duplicate HTTP submission mints sibling missions today).
8. Independent effect verification for worker output (D-08's shadow data is the prerequisite; the code is `verifyResultEnvelope` truthfulness, not structure).

Everything else on the Jev path already exists somewhere and needs convergence, wiring, or measurement, not new code.

## UNKNOWNS (exact missing evidence)

- Worker inventory and learning/evaluation records: F+I lane landed 2026-09-28 ~18:27 MDT. Provisional findings were replaced by lane verdicts in the WORKERS AND CONTRACTS section. PING-side claims reused from lanes 5/9/11/14/B5/15 remain hypotheses until clean-checkout replay (the lane's own caveat).
- Cost surface on the dispatch path: no metering exists on the worker's internal agentic loop or the coordinator procedures (cost UNKNOWN on D-08/D-09/D-27/D-28/D-29/D-72). Jev shadow costs are measurable ($0.042/MTok input); the costs Jev would replace are not.
- Canonical-tree HEAD: prior lanes pinned `0264d517`; lanes observed `f877c391` on branch `fyd/builder-harvest-trackc-2026-09-28`, still dirty (144 porcelain lines vs 146 at the dirty-mc-freeze). What moved the tree and the 2-line delta are unexplained. Do not cite a current canonical HEAD beyond `f877c391` without re-verifying.
- Which worker copy is reached (root-level vs `workers/` vs `runtime/` duplicates). Deletion blocked until proven.
- Whether the old ExecutionEngine receives any live traffic (container logs unexamined). Deletion blocked until proven.
- Label sources for D-45 (priority calibration) and D-46 (recommended action): no verified-outcome label source exists.
- Qdrant Q28: deliberately take it down, prove fail-closed, ship the visible reduced-retrieval indicator. Unanswered.
- Calibration of jev-1.13.0 on PING's distribution: vendor claims are hypotheses; the shadow spike is the first reproduction.
- The served `:3100` build lagged the worktree by ~21h at audit time; every MC claim needs source/build/serve binding before it is stated as current.
- copper-v2 and fyd-privacy-p0 contents: branch/HEAD/dirty UNKNOWN (broken metadata); inventory before cleanup.

## NEXT THREE MOVES

1. **Re-scan for decisions the 72-row surface missed.** The F+I lane landed: worker-internal and skill-routing decisions are the known blind spots (the 17 requested worker families have zero literal implementations; worker `output` is provably unbound). One targeted pass over the actual worker families and the coordinator's skill-routing path, then the inventory is closed.
2. **Run the shadow spike as read-only measurement on the 10 candidate decisions** (design above; no canonical writes, no dispatch changes). Deliverable: per-record shadow logs with verified labels and eventual outcomes, and the first calibration numbers for jev-1.13.0 on PING's distribution. Pre-registered stop conditions apply; losses are reported with numbers.
3. **Resume E1 (Ask evidence reranking) after the convergence pass lands**, unless the shadow spike reorders the ranking. The spec is complete and held; the convergence coordinator owns the write. If E1 loses, pivot to E2 without rationalization.

No grand refactor is authorized by this inventory. Only measured wins authorize a bounded implementation proposal.
