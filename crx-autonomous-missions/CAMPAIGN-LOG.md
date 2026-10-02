# CRX Autonomous Missions — Campaign Log

## 2026-09-23 ~10:05 MDT — Campaign opened, ORCA lane CLOSED

**ORCA lane: COMPLETE (first deliverable).**
- Source: https://github.com/orca-cli/orca @ 5beeefc (2026-05-08; 4.5 months stale, week-1 skeleton, 29 Go files).
- Headline falsification: README is v1.0 vision, code is a skeleton. MCP server, runner/claiming, pod lifecycle, constraint engine, TUI, 11 of 12 CLI commands — all stubs or absent. Falsified claims recorded in comparison doc.
- Real mechanisms harvested (O-1..O-10): durable run row (closes CRX audit gap #3, highest value), pure state-transition table, per-run worktree create/archive (REUSE), dependency edges as data, Decision enum vocabulary, agent-driven rehydration protocol (design only — highest leverage idea), constraint gates as typed events, FTS5 logs (WATCH), short-ref (WATCH), UUIDv7 (PATTERN via IdentityAuthority).
- NOT harvested: MCP server design (doesn't exist), pod/decomposition vision (unimplemented), SQLite as system journal (competing authority — forbidden), TUI/CLI surface.
- Cross-refs routed to orchestrator-survey lane: alex2481kobe/orca (active, Apache-2.0), Orca desktop app v1.4.198 (shipped DAG+dispatch).
- Deliverables: `orca-crx-comparison.md`, `mechanisms.jsonl` (O-1..O-10), `repos/orca/` (clone, third-party, not committed anywhere).

**Parallel harvest wave dispatched (9 lanes, falsification-first briefs, mechanisms.jsonl mandatory):**
1. `lanes/orka/` — Task-as-durable-resource; infra scheduling as agent scheduling.
2. `lanes/omniroute/` — router-only; MODEL REQUEST → POLICY → ROUTE → PROVIDER → RECEIPT seam; routing never becomes decision authority.
3. `lanes/openai-agents-sdk/` — minimum-provenance question vs 10-slot CRX trace model.
4. `lanes/durable-execution/` — own-vs-infrastructure boundary table (headline deliverable).
5. `lanes/orchestrator-survey/` — mechanisms not checklists; orca-family prioritized.
6. `lanes/memory/` — what memory operations actually improve autonomous engineering.
7. `lanes/mcp-execution/` — six-link chain; MCP stays adapter.
8. `lanes/observability/` — negative observability detection table (headline deliverable).
9. `lanes/software-factory/` — work packet → post-merge verification; one-writer enforcement.

**Pending (phase B, after harvest lanes land):** red-team agent (attacks every promising harvest), cross-pollination agent (read-only mechanism combinations, may propose experiments only), mechanism library merge, token-economics accounting.

**Rules in force:** research only; no CRX builds; no FYD/Jev/Pig touch; no pushes/deploys; no credentials in output; README != implementation; no second orchestration universe.

**Token economics (so far):** deep source archaeology (orca, full file reads) + falsification (README vs source diff) + structured extraction (16-field schema). No repeated repo summaries. Token spend concentrated where the directive says: searching, comparing, falsifying, mechanism extraction.

## 2026-09-23 ~10:10 MDT — openai-agents-sdk lane CLOSED (5/9)

Source: openai/openai-agents-python @ 32edd3c (2026-09-22), MIT. 16 mechanisms in lanes/openai-agents-sdk/mechanisms.jsonl.
Headline: strongest TOOL ATTEMPT provenance seen so far — canonical tool-invocation identity (SHA-256 semantic fingerprint separate from provider call ID) + run-owned invocation ledger {_ToolInvocationRecord{executed, completed}} serialized in RunState. Directly addresses CRX's no-per-attempt-identity gap. Approval-scope fingerprints durable across serialization (narrows but does not close CRX's action-level authorization gap). Guardrail tripwire records even on halt (record-before-raise).
Ten-slot verdict: TOOL ATTEMPT yes/strongest; AUTHORIZATION yes at invocation scope; TOOL RECEIPT partial (receipt not consequence); MODEL CALL/TASK yes; MISSION/EXECUTION/VERIFICATION partial; MEMORY RETRIEVAL no (sessions are raw item stores — CRX's gap is shared); DURABLE EFFECT no, deliberately delegated to Dapr/Temporal/Restate (pointer recorded for durability lane).
Falsifications: (1) tool args/output traced only when trace_include_sensitive_data=true; (2) "durable" false natively — approve_unsafe_replay can repeat provider-side work; (3) handoff input_filter is not redaction (source says so); (4) only first handoff per turn honored, extras fail-closed with SpanError.
Top ADAPT: oa-tool-invocation-identity, oa-approval-scope-fingerprint, oa-tool-invocation-ledger, oa-tool-output-join, oa-trace-span-taxonomy (vocabulary only), oa-guardrail-tripwire-audit, oa-tool-origin-provenance (3-valued trust domain), oa-approval-interruption-resume, oa-runstate-durable-snapshot, oa-mcp-tools-span. PATTERN: handoff-as-tool-call, replay-safety-bound, sensitive-data-trace-gating (default CLOSED unlike SDK), usage-per-request-accounting, max-turns-typed-failure. WATCH: nested-run registry.

## 2026-09-23 ~10:17 MDT — orka lane CLOSED (7/9)

Source: orka-agents/orka @ cb73ac8019117c4e86d04fcfd3237ac65f56662a (2026-09-23), 19 mechanisms (9 PATTERN, 8 ADAPT, 1 WATCH, 1 REJECT).
Central question answered: TASK AS DURABLE RESOURCE is cleaner, with a split — Orka persists work authority as the durable record (immutable TaskSpec intent, write-once AgentExecutionBinding, per-attempt PromptAttempt identity/outcome, authority revocations); coordinator keeps no durable private state; conversation demoted to payload projection ("sessions are a read model derived from task events"). Recovery = classification over records, not memory. Transfer recommendation: durable per-attempt Run identity (write-once binding + honest OutcomeUnknown) into the existing event journal, not a second store.
Top ADAPT: orka-outcome-unknown-fail-closed (post-side-effect-boundary failure → terminal OutcomeUnknown with unique durable marker, never replayed — 1:1 with CRX typed-failure rule); orka-write-once-execution-binding (canonical per-attempt Run binding: mission, attempt, worker profile, input digest, auth snapshot); orka-authority-revocation-ledger (stale-worker writes rejected, never adopted); orka-identity-fenced-job-authority (authority binds immutable UID, never names; same-name impostors refused and deleted); orka-single-control-authority (stores commit behind fences, never a second control authority — the guardrail against second-universe proposals).
Falsifications: "each task is an isolated Kubernetes Job" FALSE for agent tasks (pooled RuntimePool supervisors, no Job fallback — recorded as REJECT); "nine Orka CRDs" actually 27 across 4 API groups; "durable record" is lifecycle-scoped (finalizer deletes results/events/locks/revocations on task deletion); experimental, not production-ready.
Convergence note: three independent lanes (Orca O-1, OpenAI SDK oa-tool-invocation-identity/ledger, Orka write-once binding) now agree on durable per-attempt execution identity as the highest-value harvest — triangulated, not single-source.

## 2026-09-23 ~10:20 MDT — memory lane CLOSED (8/9)

30 mechanisms, machine-validated. Coverage: Letta 5, Graphiti 4, mem0 6, LangGraph 1, LangMem 2, MemoryBank 1, Cognee 3, LightRAG 2, GraphRAG 1, Memary 1, Memori 1, chamnan 2, OpenAI 1 (docs-only WATCH). No framework adoptions recommended.
Top-value harvests vs CRX's proven gaps: LETTA-GIT-MEMORY (correction survival — audit gap: addNode ON CONFLICT demotes approved→candidate on re-emission); GRAPHITI-BITEMPORAL-INVALIDATE (contradiction/supersession with bi-temporal validity); MEM0-EXPIRATION + MEMORYBANK-EBBINGHAUS (no-forgetting gap — audit gap #10); CHAMNAN-REDACTOR (untrusted-input trust gate — audit gap: reviews/commits projected into memory with no trust gate); MEM0-HISTORY (audit trail of memory writes); COGNEE-FEEDBACK-WEIGHTS (outcome-driven authority ranking).
Note: worker reports 15 required fields but schema is 16 — spot-check on merge; harmless either way since merge will validate.

## 2026-09-23 ~10:21 MDT — durable-execution lane CLOSED (4/9)

31 mechanisms, all source-pinned. HEADLINE (the lane's critical question): CRX owns meaning, infrastructure owns mechanics. Own: identity, vocabulary, classification, policy, evidence, replay, human-approval record, UNKNOWN_OUTCOME labeling, compensation record. Adopt: sleep/wake, timers, leases, machine-death detection. Split: durable state, retries, idempotency, signals, continuation, process/worker death, reconciliation (CRX owns schema/policy/classification; infra owns record mechanics). Do not build Temporal inside CRX.
Strongest harvests: Restate invocation-ID shape → per-attempt Run identity (mission_id, attempt_seq, uuid7); LangGraph typed interrupts → approval gates with checkpoint-resident replay; DBOS step recording → honest UNKNOWN_OUTCOME; Temporal heartbeat timeouts → subagent liveness; Prefect CRASHED-vs-FAILED vocabulary; Inngest unified Pause record with mandatory expiry; Dapr lazy overdue re-drive on status read.
Falsifications: Temporal has NO engine-level saga/compensation (repo-wide grep, zero hits — user-space pattern); Inngest is SSPL-1.0 not Apache; Restate runtime is BSL-1.1 not Apache/MIT (both PATTERN-only, never embed). REJECT for CRX threat model: bearer-token approval models (Restate awakeable HTTP, Trigger waitpoint URLs) — approval resolution must be authenticated, typed, evidence-linked.
Priority order: per-attempt Run identity → typed approval interrupts → step journal → heartbeat liveness → CRASHED/FAILED vocabulary → suspend record → atomic-claim recovery → lazy reconciliation → retry classifier → claim-with-attach idempotency. (Converges with Orca/OA/Orka on Run identity as #1.)

## 2026-09-23 ~10:22 MDT — orchestrator-survey lane CLOSED (2/9)

40 mechanism records (26 new + 14 orca-family). 13 repos cloned with sparse checkouts, commits pinned, source read.
Strongest: PAI-01 runtime-enforced usage limits (cheapest missing safety rail); OH-01 frozen immutable event log with events_to_messages as single projection (independent validation of CRX's event-sourcing bet); OH-02 LLM-predicted per-action security risk stored on the action event (closest production shape to CRX's missing action-level authorization); LG-02 interrupt() with namespace-hashed deterministic ids + Command(resume=...) (cleanest pause/resume primitive); AG-01 eleven composable termination conditions; ORCA-14 THE WAKEUP INCIDENT — durable pull-only events left a real orchestrator idle; durability without a wakeup path is a liveness bug (P0-class lesson for mission design: every durable queue needs a push/wakeup or a poller with teeth).
Falsified: orca-cli README (MCP/DAG/claiming absent in source); AutoGen snapshots imply durability the runtime never provides; LangGraph checkpointing != exactly-once task bodies; OpenHands risk scores are predictions not proofs; CrewAI no cycle detection; no surveyed SDK implements auth at the orchestration layer.
Skips stated: Orca desktop app, Devin, Jules, Claude Code internals closed (no mechanism records); MetaGPT, OpenCode not inspected.
Note: lane's mechanisms.jsonl contains 14 orca-family records alongside the 26 new — reconcile against root mechanisms.jsonl O-1..O-10 at merge to avoid duplication.

## 2026-09-23 ~10:22 MDT — software-factory lane CLOSED (9/9)

21 mechanisms, validated (ADAPT/PATTERN only; AGPL sources pattern-only).
Top harvests: AIOS (MIT) — task packet with mandatory acceptance criteria + validated model-generated IDs + DAG scheduler; per-task worktree manager with detached merge checkout; serial merge queue with git update-ref CAS ("the queue is the only writer"); rebase path with ReReview-on-diff-change and ReVerify-on-rebased-tree hooks; coder/reviewer round loop with stall detection. bors-ng (Apache-2.0, archived) — preflight gate checklist with approval bound to current commit; :race vs :conflict stale-head distinction; test-the-exact-synthesized-batch-commit then land that exact SHA; batch failure bisection. Fountain (AGPL pattern-only) — tested-tree witness (fail-closed probe table, tree-equality shortcut). SWE-agent — content-derived problem IDs, durable per-instance patch artifacts, independent evaluator receipts, separate reviewer with triple-budget retry. Claude Squad (AGPL pattern-only) — worktree-per-mutation from immutable HEAD SHA.
Honest gaps (falsified, not promoted): no verified silent auto-revert in any inspected source; no post-merge runtime probing; Mergify engine source unavailable; OpenHands HEAD pivoted (old claims falsified); mini-SWE-agent license unverified (PATTERN with license-pending note).
Correction recorded: /tmp filled to 100% mid-lane; agent cloned to shared _src/ (boundary violation), extracted evidence, deleted entire _src/ and verified gone; documented in lane README. No third-party code committed or pushed.
Convergence: "the queue is the only writer" (bors/AIOS) + Orca single-writer SQLite + Orka single-control-authority = fourth independent confirmation of the one-writer invariant.

## 2026-09-23 ~10:22 MDT — mcp-execution lane CLOSED (3/9)

36 mechanisms, machine-validated (10 REUSE, 16 ADAPT, 7 PATTERN, 1 WATCH, 2 REJECT). Sources: modelcontextprotocol/python-sdk, registry, docker/mcp-gateway, fastmcp, mcp-scan agent-scan rewrite.
Top harvests: FastMCP per-tool authorization — filter at discovery, re-check at execution, fail closed, ambiguous denial (M26); registry immutable (name, version) + exact-version pinning (M11/M12); bidirectional secret blocking (M18); cancel-on-abandon and layered timeouts as the typed lifecycle CRX lacks (M04/M06); DNS-pinned SSRF-safe fetch (M29). CRITICAL GAP CONFIRMED: nothing in the ecosystem verifies world-state effects after execution — RECEIPT and EFFECT VERIFICATION must stay separate links in CRX.
Falsified (5): no rug-pull hashing/proxy in current mcp-scan; no default OAuth audience checks in SDK; intentional STDIO auth skip in FastMCP; registry _meta capped at 4 KB.
REJECTs: M35 annotation-trusting authorization, M36 generic blind tool-call retry.
2 lanes still running: omniroute (1/9), observability (6/9).

## 2026-09-23 ~10:38 MDT — omniroute lane CLOSED (1/9)

28 mechanisms (5 ADAPT, 15 PATTERN, 3 REUSE, 5 REJECT). Source: OmniRoute @ 18bbb10198 (release/v3.8.51, MIT).
Question answered: yes — CRX eventually needs MODEL REQUEST → POLICY → ROUTE → PROVIDER → RECEIPT as a replaceable execution seam; OmniRoute's ProviderExecutionPolicy/sendProviderAttempt/typed-outcome pipeline is the closest existing implementation. Harvest conditional: OmniRoute assumes an authorized candidate set enters the router; CRX must make that a verified invariant.
Boundary held ("routing decides WHERE/HOW, never WHETHER"): 5 REJECTs including emergency billing fallback (router invents an unauthorized provider on keyword match), nondeterministic exploration (Math.random() + empty-pool resurrection), semantic complexity routing, ACP/MCP/A2A/pipeline orchestration surfaces.
Strongest: execution-policy pipeline (ADAPT — the seam itself); STRICT_ZERO_COST filter (hard constraints as pure pre-dispatch gates, verified==dispatched by construction); pure circuit breaker + typed failure classification (REUSE verbatim); operational/semantic quality split (PATTERN — never manufacture quality); routing-event receipt shape (ADAPT — needs CRX durability + lineage).
Falsifications: routingLogger docstring claims SQLite routing_decisions table — implementation is in-memory only; 5 lane-hint paths do not exist at this commit; OMNIROUTE_ROUTING_POLICY.md is an 11-line pointer not a spec. Two sharpened CRX requirements: quota enforcement is explicitly fail-open (CRX must invert to fail-closed); auto-combo reintroduces all candidates when exclusions empty the pool (CRX must gate on health-only exclusions).
1 lane still running: observability (6/9).

## 2026-09-23 ~10:50 MDT — mechanism library merged (phase A complete)

All 9 lane libraries validated (exact 16-field schema, allowed classes, no dupes) and merged into mechanisms.jsonl: 262 unique records (10 ORCA + 252 lanes). Classes: ADAPT 117, PATTERN 96, REUSE 25, WATCH 11, REJECT 13, REPURPOSE 0. Pre-merge snapshot kept as mechanisms.jsonl.orca-snapshot. Orchestrator-survey ORCA-01..14 confirmed to describe a different Orca (Claude Code desktop orchestrator, lanes/daemons) — no semantic overlap with O-1..O-10.
All 9 lane BOUNDARIES CLOSED. Zero lane blockers. Proceeding to red-team phase (adversarial review of promising candidates), then read-only cross-pollination.

## 2026-09-23 ~10:55 MDT — red-team CLOSED (10/10)

23 candidates attacked against 9 adversarial classes. Verdicts: SURVIVES 1 (orka-single-control-authority — defeats both attacks by construction), FAILS 0, NEEDS-HARDENING 22.
5 load-bearing (verbatim adoption = live vulnerabilities): GRAPHITI-BITEMPORAL-INVALIDATE (timestamp invalidation without trust gate is a poisoning amplifier); oa-approval-scope-fingerprint ("same scope fingerprint implies same authorization target" is false — cached grants authorize argument smuggling, bypass revocation); MEMORYBANK-EBBINGHAUS (destructive coin-flip deletion of evidence-grade records; retrieval-reinforcement amplifies poison); oa-tool-invocation-ledger (executed flag records a planning transition, not the side-effect boundary — recovery misled into duplicates or lost work; worker-recorded completions vouch fabricated evidence); MEM0-EXPIRATION (unparseable dates fail OPEN; any writer gets soft-delete over others' memories).
21 library-invariant corrections recorded in redteam/README.md section 4 (drop-in replacements for mechanisms.jsonl INVARIANT fields — red team did not edit the library, read-only).
Cross-cutting: no harvested mechanism verifies worker claims against independent evidence (all verify paperwork completeness, never truth); privilege escalation concentrates at mint time (every authz mechanism assumes a trusted minter); tenant binding assumed-not-specified nearly everywhere; SDK-lane falsified native durability, so oa-* mechanisms need CRX's PG journal as substrate.
Deliverables: redteam/README.md, redteam/verdicts.jsonl (23 records, validated).

## 2026-09-23 ~11:00 MDT — cross-pollination CLOSED (11/11). CAMPAIGN PHASE COMPLETE.

9 combinations produced against CRX gaps, all absorbing red-team hardening verbatim. Headline combos: COMBO-DURABLE-RUN (gap a: attempt identity + lease/fencing CAS + frozen binding + one-writer journal); COMBO-STEP-JOURNAL (gap b: kill-reconstruction core — dispatched-not-completed settles to evidence-citing OutcomeUnknown, never blind retry); COMBO-ACTION-AUTH (gap c); COMBO-CONTRADICTION-RESOLUTION (answers red-team finding A: evaluator-recorded receipts + CAS-verified publication + verified-vs-claimed grading; losers stay as contested candidates); COMBO-PATCH-LANDING; COMBO-CAUSATION-OBSERVABILITY (gaps e,g + explain requirement); COMBO-NEXT-TASK-CLAIM; COMBO-TRUSTED-MEMORY (gaps d,f,h,i, all 5 memory hardenings); COMBO-PROVIDER-FAILOVER. First-mission shortlist: 9 combos in dependency order, memory partial (correction-survival + trust gate; forgetting deferred), INV-1 stubbed via deterministic fake provider behind the real journal interface.
Invention-required (5, explicitly not solved): live MCP transport in WorkerRuntime; domain evidence-comparison policy; work discovery sources; erasure path for append-only memory; deterministic explanation narrator.
Residuals: mint-time trust unaddressed by every combination; lying provider acks; time-as-trust-input; combination 7 (causation-observability) highest unreviewed risk — none of its 5 mechanisms were red-teamed.
Final artifact inventory verified: 262-record library, 23 red-team verdicts, 9 combinations, 10 lane READMEs, campaign log, token economics.
