# JEV / PING AUTONOMY MAP

**Date:** 2026-09-28. **Owner order:** BRUTAL CEO MODE, JEV / PING AUTONOMY HARVEST.
**Mode:** read-only harvest + design. No production wiring, no global Jev router, no Phase 1 approval-door contact.
**Sources:** 8 lanes (`~/workspace/ping-24h/jev-autonomy/lanes/*/report.md`), canonical tree `/home/nolan/projects/ping` @ `0264d517`, dated memory logs 2026-09-21..28.

**The metric that matters:** System-2 calls avoided without reducing success or safety. If Jev adds a call and System 2 still performs the same work, reject the integration.

**Locked architecture:** System 0 deterministic software. System 1 fast bounded judgment (Jev candidate). System 2 expensive generative reasoning. Human authority where consequences require it. Jev recommends. PING policy and authorities decide what is allowed. Probabilities are evidence, never authority.

## ORCA (D0/D1/D2)

**Headline:** Orca's dispatcher never calls an LLM for a decision. Every dispatch-plane question is answered by deterministic code or by a coordinator-agent procedure. The LLM enters at exactly one point: the worker boundary (`adapter.js:1120 dispatchHermes` -> `prompt-hermes.sh` -> Hermes agent CLI), where the whole work order is handed to a worker agent that makes its internal decisions inside its own black box. Zero live LLM API calls exist in the canonical tree at `0264d517` (only a provider enum entry and an `OpenAIClassifierProvider` that throws "not yet implemented"). There is no per-decision model routing; model is static worker-profile config (Hermes/openrouter, ollama qwen2.5-coder:1.5b, cloud-subagent, copilot 1-4).

### D0: already deterministic (Jev has no place)

- `authorizeWorkOrder` (`orca-adapter/vendor/external_agent_adapter.js:185`): 8 ordered fail-closed checks (registered? not blockedExternal? not PENDING_AUTH? capability in allowlist? namespace regex? constraints tighten? `no_canonical_events` + `no_mission_state_writes` hard-required). Returns GRANT/DENY + typed reason.
- `reconcileGate` (`adapter.js:429/:445`): idempotency key + prior-outcome lookup + artifact-exists check under cross-process index lock. Typed refusals: `duplicate_attempt`, `reconciliation_required`, `artifact_exists`, `idempotency_index_corrupt`.
- `verifyResultEnvelope` (`vendor/external_agent_adapter.js:306`): 8-field structural echo-binding; validation failure is non-retryable.
- `assessAndFollowUp` (`orca-remediation/orca_control_loop.js:924`): presence-bit logic over verified state; writes `20-assess.json`.
- `orca_policy.js` classify* functions (Pig worktree, verified live 2026-09-28): pure rule functions returning typed decision records (AUTO_EXECUTE / REQUIRES_HUMAN_APPROVAL / PROHIBITED). classifyRetry keys on the failureKind enum.
- `task-tiers.js` (copilot broker): deterministic regex T0-T4 classifier; T3/T4 never auto-assigned; uncertain defaults to T1.
- `jsonl-classifier.js` (copilot broker): deterministic failure taxonomy; only RATE_LIMITED + TEMPORARY_FAILURE retryable.
- `outcomes.js`: closed vocabulary (completed | failed | unknown | denied | escalated) + orthogonal EFFECT_STATE. UNKNOWN never collapses to FAILED.
- `resolveTenantId` / copilot fence (`adapter.js:~1225`, identity_5..10 DENIED): fail-closed, per-dispatch re-evaluation.

### D1: bounded Jev judgment (the Orca candidate class), ranked by volume x cost x low risk

1. **C-01 Worker-result usefulness judge** (~30/d, cost 3): independent second opinion on the worker's self-reported `status` from envelope + stdout excerpt + evidence. `verifyResultEnvelope` is structural only today; a plausible-wrong `completed` passes. Advisory only: can flag `unknown` and force reconcile, can NEVER override a structural FAIL or promote to `completed`.
2. **C-02 WAITING_APPROVAL triage** (~5/d, cost 4): mission state -> {hold, propose, escalate} + one-line rationale. No code primitive exists today; it is a coordinator-LLM procedure. Escalation IS the human path: outward-facing effect, ambiguity, or C4-adjacent mission -> human. Never auto-approves.
3. **C-03 Evidence-chain completeness check** (~10/d, cost 3): "is the chain actually complete or did the worker claim completion with missing links?" Targets the witnessed v1 t2 false-negative class. Advisory flag; a `complete` verdict still requires the deterministic checks.
4. **C-04 Work-order brief quality gate** (~30/d, cost 2): pre-dispatch check of the coordinator-written `taskBrief` (capability allowlist, constraints present and consistent, no secret-shaped material, input references resolvable). Fail -> brief returned to the coordinator for rewrite; never edits the brief itself.
5. **C-05 grill-20 first-pass triage** (~10/d, cost 4): Jev pre-scores the 20 locked checks; coordinator LLM verifies; 25-record label source exists (`escalation-log.jsonl`). Never emits the final verdict; escalate on any low-confidence or C4-adjacent check.

### D2: stays with frontier intelligence

Whole-task worker execution (L-01); Meta AI research delegation (L-02, verification-gated); coordinator check judgments on grill-20; and the worker's internal tool-selection / what-next decisions. The last one is negative evidence, not an opportunity: the archived 2026-09-26 Jev routing project measured that Jev tool-selection/compaction did NOT generically reduce token usage versus plain truncation. Judge the result outside the loop (C-01), not the process inside it.

## TENANTOS (D0/D1/D2)

**Headline:** TenantOS is the tenant isolation / control-plane boundary, not a second authority layer. At pig HEAD `0264d517` it has no separate decision-surface code; tenant decision surfaces live in PING code. HARD RULE: Jev NEVER makes tenant authorization decisions. "Which of these already-authorized workers is best suited to this authorized mission?" is a good D1. "Jev thinks Nolan may access tenant B" is never.

### D0: deterministic (Jev rejected, authorization touch)

- Tenant context resolution (which tenant a request acts as): `adapter.js:89` resolveTenantId (fail-closed throw on namespace contradiction); `tenant-context.ts` requireTenantContext/withTenantContext (typed TenantContextError); `mc-dispatch-identity.ts:66` resolveCaller; `mc-tenant-gate.ts:45` callerScope (400/403). Client-supplied tenant selector never overrides trusted context.
- Capability grant/deny per work order: `authorizeWorkOrder` 8 deny reasons. Grant is C4 authorization; reject Jev unconditionally.
- Copilot identity fence (1-4 allowed, 5-10 denied), per-dispatch re-check. Static binding; reject.
- Authority posture per order (effect ceiling, sandbox, data classes): currently carried data in AGENT_PROFILES maxConstraints; must become an explicit CapabilityAuthority decision. Never a Jev judgment.
- Request routing to tenant stores / projections: deterministic store selection from trusted TenantContext (`scoped-stores.ts`).
- Incident severity classification: `health-rules.ts` deterministic; thresholds are human config (Jev may propose threshold tuning, advisory only).
- Mission/work prioritization and queue order: deterministic (FIFO, lease expiry). No label source, no volume case today; no Jev candidate.

### D1: bounded Jev judgment (staged after deterministic gates)

1. **Executor selection among deterministically-eligible workers.** Today the caller decides (dispatchExecution opts.agentId) and the adapter only validates; no selection authority, no rationale (lane14 R2, laneB5 D2). Jev ranks already-eligible workers only. See WORKER ROUTING.
2. **Context selection / evidence reranking for work-order input.** Rank/order/filter context items for the executor; never choose what the executor is ALLOWED to see (that stays deterministic: capability registry + tenant context). This is the standing first experiment (Ask FYD evidence reranking, shadow mode).
3. **Escalation/notification relevance scoring** for WAITING_APPROVAL triage: Jev scores/orders, a human or deterministic gate decides. 25-record grill-20 label source exists. The moment a score would AUTO-ESCALATE or AUTO-HOLD, reject (touches owner authority).
4. **Data semantic classification** (GLOBAL / PUBLIC / TENANT_PRIVATE / SHARED / DERIVED): design-time advisory only. Jev may propose labels on new state items in review; classification takes effect by human/deterministic ratification, never by Jev's say-so.
5. **Worker result triage** (CLEAN_PASS / VERIFY_MORE / NEEDS_FALSIFIER / NEEDS_DEEP_REVIEW / CONFLICTING_EVIDENCE / MALFORMED / AUTHORITY_OR_SECURITY_REVIEW): headless-result triage that only adds friction (VERIFY_MORE) or routes to deeper review; never promotes a worker claim to truth. Promotion ladder: SHADOW -> ADVISORY -> POLICY-GATED LOW RISK -> AUTONOMOUS LOW RISK.
6. **Outreach eligibility confidence** ("highest-confidence prospects"): Jev may score confidence; the never-reengage ledger gate stays deterministic code and Jev may not relax it.

### D2: stays generative or human

Novel architecture judgment; the WAITING_APPROVAL approve/deny/hold choice itself (human); prospect narratives; open-ended brief authoring beyond the quality gate.

## GITHUB INGESTION (D0/D1/D2)

**Headline:** PING has NO live GitHub event ingestion today. Nothing ingests pushes, PRs, issues, comments, reviews, files, diffs, workflow runs, releases, branches, or docs. What exists: the Patch 7 one-shot deterministic scan pipeline (2026-09-21; GitHubScanner -> temporal diff NEW_REPOSITORY/UNCHANGED by repository_id + pinned SHA -> ClassificationEngine -> DailyBriefingGenerator), design/threat work in `~/workspace/git-ingestion/`, and `tandem/emit-observation.py` (the only live path into PING's event spine, gated by human verification + semantic-domain gate + duplicate guard + durable spool). GitHub ingestion is formally DEFERRED off the product critical path.

**Does current ingestion drown System 2 in unfiltered events? NO.** No webhook receiver exists workspace-wide, and the 2026-09-21 standing order lists what was never built: no Patch 8, scheduler, daemon, database, queue, webhook, continuous crawler, automatic ingestion. The Patch 7 pipeline is fully deterministic scan-to-brief with zero per-event LLM calls. System-2 cost per GitHub event today is zero. The forward risk is that building push-event ingestion WITHOUT the D0 filter stage turns every push into a per-event System-2 task; the pipeline design puts the D0 funnel first so most events die at allowlist/noise/temporal-dedupe before Jev sees them.

### D0 (J-01..J-09, J-17; the funnel that must come first)

- J-01 ingress authenticity: HMAC verify (timing-safe), fail closed, never enqueue on mismatch.
- J-02 delivery dedupe: X-GitHub-Delivery UUID + idempotency store; store unreachable -> hold delivery, never double-process.
- J-03 ref snapshot + STALE protocol: ref set at packet start vs end; STALE -> requeue or discard, never emit a mixed packet.
- J-04 metadata sanitization: commit messages, author names, ref names, filenames (control chars stripped, ANSI neutralized, bidi isolated, length-capped with truncation markers); sanitizer exception -> quarantine.
- J-05 repo/branch allowlist + noise pre-filter: default-deny; watchlist changes are human authority.
- J-06 event-type routing: COMMIT_PATH / PR_PATH / ISSUE_PATH / RELEASE_PATH / DROP; unknown -> DROP + logged, never guessed.
- J-07 temporal dedupe: (repository_id, observed_commit_sha) seen -> UNCHANGED, emit nothing new (Patch 7 contract).
- J-08 path-rule impact labeling: deterministic prefix rules to IDENTITY/EVENTS/CAPABILITIES/EXECUTION/FYD/GATEWAY/PROJECTION/SECURITY/DEPLOYMENT/DOCS_ONLY; conflicting labels or any SECURITY/IDENTITY hit -> escalate to J-11.
- J-09 deterministic relevance pre-gate: keyword relevance floor (Patch 7 `_calculate_relevance` shape); near-floor -> forward to J-10 with flag.
- J-17 normalization + canonical field contract: OBSERVATION_CREATED payload (repository_id, owner/name, observed_commit_sha, source/source_type, evidence_level, evidence_sources, license signal, labels, confidences); schema violation -> BLOCKED, never hand-patched.

### D1 (J-10..J-16; advisory classification, never authority)

- J-10 Jev relevance-to-FYD: RELEVANT_FYD / OPERATIONAL / NOT_RELEVANT + confidence + why_ref + candidate mission; 0.60 floor; contradiction -> escalate.
- J-11 Jev semantic impact classification (uncertain commits only): closed 10-label set, per-label confidence, uncertain_files; any label confidence < 0.60 or SECURITY/IDENTITY/DEPLOYMENT -> D2 + human review before test selection is trusted.
- J-12 Jev plan contradiction: YES/NO/UNCLEAR vs current plan digest; YES at >= 0.70 -> D2 human review; contradiction is never auto-absorbed.
- J-13 Jev generated-noise likelihood: GENERATED / HUMAN / UNCERTAIN; GENERATED at >= 0.80 -> DROP path.
- J-14 Jev security relevance: YES (any confidence) -> human-authority review queue; Jev never clears a security finding.
- J-15 Jev issue triage: dedupe_candidate (pointer, never a merge), subsystem, kind (BUG/FEATURE/SECURITY/QUESTION), urgency (P0..P3/UNKNOWN), likely_stale, customer_facing, needs_architecture, needs_reproduction. Hard boundary: Jev never deletes, closes, locks, or labels anything on GitHub; all terminal actions are H-01 digest-bound human approvals.
- J-16 Jev funnel exit: EMIT_EVIDENCE / D2_ANALYSIS / HOLD_FOR_HUMAN.

### D2 (J-18) and human (J-19)

- J-18 open interpretation / root-cause / architecture judgment: bounded brief in, narrative analysis out; D2 never writes to PING; proposals are digest-bound.
- J-19 human authority: close/delete repo, authorize fetch, approve mission, publish. Silence never approves.

**Strongest negative evidence (lane 3):** the 2026-09-27 routing proof invalidation. `jev-reason.ps1` requested `typesafe/jev-router` and the provider silently returned `openai/gpt-6-luna`; Nolan stopped all Jev intelligence dispatch. A layer that LOOKED like cheap bounded judgment was actually burning System-2 cost, with no `response.model` check to catch it. Design consequence: every D1 judgment ships shadow-first with measured cost and calibration, D1 outputs are advisory only, and the D0 funnel decides routine cases with no model call at all.

## MISSION CONTROL (D0/D1/D2)

### MC triage: firehose -> classification -> attention

- **D0 (owns the funnel):** event stream folded into typed counters and a per-item attention ledger. Every event gets a terminal disposition (HANDLED / ALREADY_ATTENTIONED / SUPPRESSED_BACKGROUND); an item with a terminal disposition never re-enters the attention queue (the engagement-guard.py pattern: terminal-aware ledger, within-pass dedup on unique descriptors). Signature ledger lookup (matched signature id or NONE), commute-window / known-wedge context flags, first-seen + disposition history.
- **D1 (Jev, bounded):** each non-terminal item gets exactly one judgment: `class` = ATTENTION_OWNER / ATTENTION_QUEUE / BACKGROUND (closed choice, never free text) + confidence + why_ref (pointer to deterministic features, no new claims). A deterministic policy converts label+confidence to routing: OWNER with confidence >= 0.85 -> MC "needs your authority" card (one entry per item, ledger-deduped); QUEUE or (OWNER with confidence < 0.85) -> batched "needs attention" card; BACKGROUND -> ledger only; confidence < 0.60 -> forced QUEUE (uncertain items are queued, never dropped).
- **D2:** only when confidence < 0.60 AND the item carries uncertain external effect or first-time signature. D2 writes an analysis, never routes.
- **System-2 avoided:** from the 2847-event example, D0+D1 dispose of ~2844; only novel/uncertain items (the 2 uncertain external effects) reach D2. Without this, each anomaly burns a System-2 read of the whole firehose.

### Bounded scheduling: which mission first

- **D0 (inviolable):** constraint elimination (blocked, not in slice, capability not allowlisted, quota exhausted, deadline past, reconcile HOLD open). Survivors are the FEASIBLE set; order by earliest deadline, then declared priority, then FIFO. This default order is final unless Jev has a tie to break.
- **D1 (Jev, tie-break only):** invoked ONLY on the feasible set, ONLY to resolve ties / near-ties (deadlines within slack epsilon, equal priority). Inputs: customer impact signal, risk (novelty, recent failure history of the class), resource cost estimate. Output: ranking + one-line per-item rationale pointer. Deterministic comparator is the tiebreak-of-last-resort: if Jev abstains or errors, the D0 order stands. Jev can never make an infeasible mission feasible, can never reorder across a deadline inversion, and its ranking is advisory (`order_source=JEV_TIEBREAK` vs `order_source=DETERMINISTIC` logged per dispatch). A D2 review is never scheduled for ordering; ordering is never worth a System-2 call.

### Failure triage (experiment #1)

- **D0, always first:** feature extraction (exit code, stderr signature over a closed regex set, sentinel presence `SENTINEL=ORACLE_OK` as proof the probe executed remotely, time-of-day vs known blackout windows, pre/post-reboot state) + known-signature match. Template: `gateway-classify.sh` with its closed 10-reason vocabulary (DNS_FAILED, PROXY_FAILED, TAILNET_UNREACHABLE, SSH_FAILED, HOST_UNREACHABLE, WSL_UNREACHABLE, SERVICE_UNREACHABLE, PROBE_TIMEOUT, AUTH_FAILED, PROBE_TRANSPORT_FAILED) and its sanitize rule (anything unrecognized -> PROBE_TRANSPORT_FAILED). Deterministic-first rule: null/unparseable sensor readings become typed OBSERVATION_FAILED (exit 3) BEFORE any identity or alert classification.
- **D1 (shadow while calibrating, live-advisory after):** closed label set TRANSPORT / APPLICATION / DATABASE / AUTH / TEST / ENVIRONMENT / UNKNOWN + confidence. Mapping to action is a DETERMINISTIC policy table (Jev never picks the action): TRANSPORT -> retry per probe posture, prohibit restart/remediation; APPLICATION -> runbook lookup by signature id; DATABASE -> ATTENTION_QUEUE, never auto-remediate; AUTH -> ATTENTION_OWNER; TEST -> test-failure triage; ENVIRONMENT -> retry on alternate path, host-reboot evidence -> ATTENTION_OWNER; UNKNOWN or confidence < 0.60 -> System 2 (D2), ATTENTION_QUEUE meanwhile, no remediation.
- **D2:** only UNKNOWN / confidence < 0.60 / first-time signature / uncertain external effect.
- **Remediation gating (the E4 lesson):** a restart is authorized ONLY when the failure is observed at the process/local-service layer (sentinel present + local probe failed). Transport-layer readings can never authorize a process restart. The 2026-09-28 06:06 MDT watchdog restarted a server that was locally HTTP 200 because transport-side readings triggered it; that is the anti-pattern this rule forbids.

**Worked eval example (ground truth):** 2026-09-28 16:04-16:05 MDT commute incident. Deterministic features: exit 1 (WARN); stderr `nc: proxy read: Broken pipe / Connection closed by UNKNOWN port 65535`; `SENTINEL=ORACLE_OK` absent; signature PROXY_FAILED; adjacent to the ~16:30-17:00 commute window. `gateway_classify` -> GW_STATUS=UNKNOWN, GW_CLASS=PROXY_FAILED; consecutive-failure counter held at 0; no container claim. Shadow Jev: TRANSPORT_FAILURE, confidence 0.96; policy: no remediation. Observed behavior matched exactly: no restarts, no host changes. Classification verdict: CORRECT. Ground truth was a tunnel wedge at the hatch-egress-proxy CONNECT tunnel, a network transition, not a service failure.

**Supporting eval cases:** (a) 2026-09-27 11:11-12:47 wedge misclassified as host sleep (the wired-NIC-flap hypothesis was proposed and FALSIFIED; Modern Standby S0 idle was the forensics answer; probe failure is evidence about the probe path, not the remote host); (b) 2026-09-28 05:52 tripwire null readings misclassified as identity mismatch (fixed: envelope validation first, OBSERVATION_FAILED exit 3; classification of an absent signal is worse than abstention).

### Test-failure triage

- **D0 parser:** jest/junit output -> (suite, file, test name, stack head, counts).
- **D0b pre-existing gate (the money gate):** replay failing tests on the pristine base. Failure set byte-identical with and without the candidate changes -> PRE_EXISTING, filed/ignored per standing rule; NO Jev, NO System 2. This single gate disposed of every recent real case (mission_scheduler.retry_watchdog.test.js 7/7 fixture failure; generator.test.ts Gallery expectation; assignment-store-kv + media-authority-route; 2488 passing / 23 failures with byte-identical sets).
- **D1 (only for novel, non-pre-existing failures):** closed labels REGRESSION / FIXTURE / ENVIRONMENT / FLAKY / DEPENDENCY / UNKNOWN + confidence. REGRESSION at conf >= 0.7 -> ATTENTION_QUEUE with the diff, block the lane's green claim. Security-adjacent suites (secret-*, redteam, tenant) are UNKNOWN-first: route to D2 even at moderate confidence.
- **D2:** only UNKNOWN / high-risk / security-adjacent. Every recent "failure" that mattered was decided by byte-identity against the pristine base, not by reading stack traces; a System-2 reading of a stack trace for a pre-existing fixture failure is pure waste.

### Agent completion verification

"Done" from prose is not success; the question is whether the evidence package looks complete. Success stays with the verifier and the deterministic gates.

- **D0 gates (all must pass, machine-checkable):** every evidence ref resolves to an existing artifact (file exists, digest matches if pinned); claimed test runs have receipts (output file, exit code, command line recorded; a claimed pass with no receipt is a missing receipt, not a pass); touched-file set bounded by task scope; declared artifact list fully present. Any gate failure -> INCOMPLETE deterministically; Jev is not consulted (asking Jev whether a missing file exists is waste).
- **D0b noul evidence ladder:** per claim, four independently verifiable rungs (artifact_exists / reachable / executed / criterion_met); deterministic where checkable; "unknown" rungs passed to D1 as features.
- **D1 Jev bounded completeness judgment:** inputs = D0 gate results + noul ladder + claim text; output = ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF (the J6 vocabulary) + confidence. Jev answers only "does the evidence package look complete"; it may not upgrade a D0 failure; its ACCEPT is advisory (the verifier replays; lane self-reports are hypotheses until replayed from a clean checkout).
- **D2:** only on high-stakes VERIFY_MORE/REJECT_PROOF (canonical truth, security, external effect).
- **Eval seed:** the completion corpus (`~/workspace/jev-eval/completion-corpus/`, 16 labeled items): rs-00 REJECT_PROOF (false completion report; D0 receipt gate would have failed it deterministically), rs-03 VERIFY_MORE (task exists, execution logs absent), wr-01/ask-01/fp-01 ACCEPT_PROOF (replayed evidence). Caveat: the backlog dataset has zero UNKNOWN examples, so Jev's abstain path is uncalibrated and must be stress-tested before it is trusted.

## WORKER ROUTING

**Headline:** there is no deterministic worker selector today. The caller decides (`dispatchExecution` opts.agentId; mc-dispatch POST body.agent) and the adapter only validates (whitelist + LIVE + capability allowlist). No selection rationale is recorded anywhere (lane14 R2, laneB5 D2). The deterministic eligibility machinery exists; the selection decision itself is absent. That absence is the Jev-sized hole. Today model = worker-profile config, never a per-decision routing choice.

### The pipeline: MISSION -> REQUIREMENTS -> ELIGIBLE -> JEV RANK -> THRESHOLD -> DISPATCH/ESCALATE

- **Stage 0. Requirements extraction (D0, deterministic code).** Dispatcher assembles a Mission Requirements record from fields PING already owns on every WorkOrder (capability, constraints, namespace, deadline, input shape) plus a declared risk class (read_only | effecting | external) and environment (pig | wsl | cloud | browser). No model involvement. Emitted as an event before routing so the extraction itself is auditable.
- **Stage 1. Deterministic eligibility intersection (D0, code). All authorization lives here.** Registry membership (AGENT_PROFILES, unknown -> DENY); liveness (status == LIVE); quota/block (blockedExternal not active, fail-closed on UNKNOWN/stale broker state); capability subset (authorizeWorkOrder); posture (constraints ⊆ maxConstraints, monotonic tightening, hard no_canonical_events + no_mission_state_writes); tenant binding (resolveTenantId / requireTenantContext, fail-closed on contradiction; Jev NEVER participates); Copilot fence (identity_5..10 DENIED per-dispatch); budget (dispatcher quota check, fail-closed on unknown/stale). Empty eligible set -> HOLD with typed reason (never Jev, never silent). **The eligible set is, by construction, a set of already-authorized workers.** Selecting among authorized workers is not authorization.
- **Stage 2. Jev ranking (D1, bounded).** A single typed Jev call receives ONLY: eligible worker descriptors (id, relevant capability set, environment, availability, cost class, current load, recent success rate on this task family, declared constraints) + mission requirements + task-family tag. NO tenant identity in the payload (2026-09-26 privacy call). Output: ranking + confidence per position + one-sentence rationale per top pick.
- **Stage 3. Confidence threshold (D0, deterministic code).** Confidence >= T (T set from PING's own shadow data, never a magic number; lane-11 calibration is NOT established, so T is provisional) -> dispatch to top-ranked worker, writing the `executor_selection` record {decided_by: "ping:executor-selector", rationale: "jev-rank", confidence, at}. Confidence < T -> System-2 escalation (deep reasoner picks, or deterministic cheapest-fit fallback), logged as the routing decision, not hidden. Jev provider anomaly (timeout, malformed, 429/529 exhausted, auth/schema failure) -> fail-closed per the J7 harness: zero ALLOW outcomes; bounded retry then deterministic fallback; auth/schema failures HOLD; every recommendation remains shadow-denied.

### What this design explicitly does NOT do

Does not let Jev admit, deny, or change the posture of any worker; does not let Jev see tenant identity; does not assume Jev is cheaper (per-family measurement: deep-reasoning calls avoided, success rate, safety incidents, latency, verified decisions per dollar); does not replace the caller default silently (the `executor_selection` record makes the rationale auditable, which is absent today).

**Proven substrate to reuse:** the J4 shadow executor-routing harness (`jev-shadow-routing-domain` branch): TypedDecision / JevShadowWorker / JEV_DECISION_EVALUATED path, five routing choices (DETERMINISTIC_WORKER | HEADLESS_AGENT | DEEP_REASONER | VERIFY_MORE | HUMAN_REVIEW), seven-field whitelisted state, 37/37 tests, zero production routing changes. This is the proven shadow-recording substrate for the routing design.

## CONTEXT SIEVE

**Common sieve architecture:** raw context -> D0 protected-item filter (always retained, bypasses the sieve) -> D0 deterministic triage (truncation, dedupe, section addressing, membership tests; the truncation baseline lives here) -> D1 Jev relevance judgment (typed choice / noul) -> KEEP / DROP-FROM-WORKING-SET / POINTER / ESCALATE.
**Invariants:** canonical evidence is never destroyed (the working set is a view; every DROP/POINTER keeps the evidence ref id + content sha); protected items bypass the sieve; Jev judgment is typed and attested (failed attestation/timeout/provider error -> ESCALATE the batch, fail open toward inclusion); never silently drop (every judgment logged to `jev-decisions.jsonl` with item_id, judgment, confidence, reason_code, sieve_version, state_sha256, prompt_sha256); the sieve admits items to a working set, never destroys evidence and never summarizes canonical evidence away.

### The four drowning points (measured)

1. **Ask FYD site-wide related objects (biggest product-path waste).** A site-wide question loads ALL public objects; `buildAskContext` takes the first 8 in graph insertion order, each with title + 2000-char description + every field truncated to 500 chars, plus up to 20 relationships and the full SiteSpecSummary. Worst case ~15-18K tokens per site-wide question, selected by insertion order, not question relevance. Sieve: protected = target object, SiteSpecSummary + digest (the answer binds the digest), citation evidence refs, grants/forbidden-effects, epistemic contract. D0: keep `boundedObject` truncation, add deterministic question-term overlap rank before admission (the composer already does keyword matching downstream; move the signal earlier at zero model cost). D1: per-object relevance choice (KEEP/POINTER/DROP) beyond the D0 top-K; rest become POINTERs. **Brutal honesty:** today's composer is deterministic, so this moves answer quality, not System-2 calls, until the agent path exists. Ship the D0 re-rank now (free); gate D1 on the agent path existing.
2. **Archaeology / worker-lane standing directives (biggest worker-drowning point).** `CRX-PERPETUAL-CONVERGENCE-DIRECTIVE.md` = 33,352 chars (~8,338 tokens) + `JEV-CONTINUOUS-CONVERGENCE-DIRECTIVE.md` (~2,662 tokens) = ~11K tokens of standing law per lane dispatch, of which a single-scope lane needs ~10-20%. Frequency: 4 lanes in the Sep 22/23 wave, 6 planned in the Sep-28 wave. This is the purest waste-per-token in the program: safety prose, not task evidence. Sieve: protected = lane scope statement, read-only constraint, fail-closed rules, the one-line constitutional core. D0: section-addressable directives (scope -> section whitelist). D1: per-section KEEP/DROP vs lane scope, fail-open-to-include bias (dropping law risks violations, keeping it only costs tokens). Kill condition: any safety-relevant section dropped -> sieve rejected for directives.
3. **Meta AI context-pack negative-names list.** Measured: pack = 8,845 chars (~2,211 tokens); "already in our pipeline" section = 6,336 chars (~1,584 tokens), 162 names = 72% of the pack, growing linearly with pipeline history. Its only function is a membership test. Sieve, almost entirely D0: replace inline prose with count + town/trade-indexed shard map + POINTER to the full list; `covered_names.py::merged_covered_names` is the enforcement point. D1 role, narrow: fuzzy near-duplicate adjudication on worker-proposed candidates only (typed choice, purpose classification), never score the whole list.
4. **Mission dispatch / subagent task context (already sieved, pattern to copy).** `PROMPT_MAX = 2000` chars; subagent dispatch strips prior transcript and passes explicit references. Bounded prompt + POINTERs to versioned artifacts, never pasted prose. This is the reference pattern the other three drowning points converge toward.

### Repo sieve: experiment #3 (concrete, measurable)

**Question:** "which 40 of these files are relevant to identity authority?" Jev ranks/classifies; System 2 reads the 40.

- **Stage 1, D0 exclusions:** generated (`__pycache__`, `*.pyc`, `dist/`, backups), content-duplicates across worktrees (sha-collapse with collapse map), tests (excluded from reading but kept as relevance signals), vendored third-party, docs (signal only).
- **Stage 2, D0 module graph:** nodes = surviving source files; edges = static import/require; seed = path/name matches; expand 1-2 hops; rank by in-degree. This IS the pre-registered truncation baseline: deterministic top-40 = path-keyword match + 2-hop import neighborhood, ranked by in-degree, near-zero cost. Run first.
- **Stage 3, D1 Jev relevance sieve:** per candidate file (path, first ~40 lines, in/out degree, seed distance) a typed `choice` (KEEP / POINTER / DROP + confidence) via `jev_ask.py --purpose classification`. Only the ~150-300 candidate pool is scored, never all files. Cost bound: ~350 input tokens/call at observed ~$1.5e-05/call -> ~$0.003-0.005 per query, recorded in `spend-ledger.jsonl`.
- **Stage 4:** top 40 -> System 2 reads the 40. POINTERs on demand; DROPs logged with reason codes, never deleted.
- **Gold set (frozen):** the dated expert picks in `DEEP-CONVERGENCE-ARCHAEOLOGY.md` section IDENTITY AUTHORITY (~8-10 files: identity_authority.js PATCH_004 shim, constitutional IdentityAuthority + HashAuthority, canonical-identity-service.ts, deterministic_id_authority.js, constitutional-authorities.yaml, routes/identities.js, gateway boot wiring, emit() identity-mint site, the unmerged identity-law divergence). Metrics: recall@40 (primary), expert rating of the 40, token economics (sieve_cost + s2_read_40) vs (d0_baseline_cost + s2_read_40).
- **Pre-registered falsification:** (1) recall@40(jev) <= recall@40(d0-baseline); (2) (sieve_cost + s2_read_40) >= (d0_cost + s2_read_40) with no expert-rated quality gain; (3) safety violation: high-confidence DROP on a gold file -> immediate reject; (4) uncalibrated confidence on wrong DROP/KEEP. **Two consecutive queries where Jev loses to D0 -> the sieve stays a research tool and never ships.** The experiment also tests the cascade shape (D0 proposes 40 -> Jev verifies each pick -> System 2 reads survivors) against the pre-sieve shape, because external evidence says pre-routing is ~random while answer-then-verify works.

## MODEL ROUTING

**Headline:** there is NO global Jev tier-selection layer in front of System 2 that survives the evidence. Routing that "helps" must be proven per-decision. The archived 2026-09-26 finding is the governing constraint: Jev tool-selection/compaction did NOT generically reduce agent token usage; plain truncation did. External corroboration: Zheng (Sep 2026) found Jev pre-routing ("will Haiku get this wrong?") performed close to random while Jev cascading (answer first, check after) reached 94% of Opus accuracy at 54% of cost; on auto-model-router's 78-task replay, a heuristic beat Jev 68/78 vs 65/78 on solve rate (Jev cheaper per solved turn but solved fewer; the bar is the heuristic, not Opus); the pi-model-router study found two parallel Nouls added ~190 tokens and changed zero routes in 72 requests.

### Candidate PING shape (HYPOTHESIS ONLY, not approved for wiring)

task -> D0-eligible? (hash / schema / exact-match / arithmetic / permission / state-transition / dedupe / replay; zero model involvement) -> YES: execute software, done. -> NO: is this a CLOSED decision contract (explicit options, typed inputs, bounded criticality, fail-closed default, shadow-calibrated first)? -> NO: ABSTAIN/ESCALATE; Jev never arbitrates open-ended work; System 2 or HUMAN_REVIEW by standing policy. -> YES: Jev complexity classification FAST / BALANCED / STRONG (post-answer cascade where the artifact exists; pre-routing only inside a closed contract where misroute cost is bounded and measured). FAST -> D0-equivalent deterministic fast path; BALANCED -> Jev primary decision, System 2 spot-check sampled; STRONG -> System 2 decides, Jev observes for shadow eval. Routing decision contracts are named instances (e.g. `mc.authorize_work_order/v1`, executor selection, reconciliation triage, retry-vs-investigate), never a generic oracle.

### Kill conditions (the hypothesis dies if ANY holds)

1. Static-beats-Jev on the eval corpus: STATIC or TRUNCATE matches or beats JEV on cost per correct decision at equal-or-better success rate.
2. Preroute equivalence: Jev pre-routing statistically indistinguishable from random escalation at equal budget (the Zheng result). No preroute integration ships, ever. Cascade (verify-after) is the only surviving shape.
3. Net-negative System-2 avoidance: the Jev call does not REPLACE a System-2 call (total calls per task increase or stay equal with no success delta).
4. Determinism failure: repeat runs of the same (contract, input digest) disagree beyond tolerance (>= 99% agreement for fail-closed contracts, >= 95% elsewhere).
5. Confidence-miscalibration danger: confidently wrong above the false-safe budget (see EVAL CORPUS E11) -> shadow only.
6. Zero-cost-bleed violation: Jev answers carry no provider cost field (direct TypeSafe API; spend ledger records 0.0). Any routing proposal must include a measured cost model; "cheap" without a number is not an argument.

**The single measurement most likely to kill the hypothesis:** cost per correct decision, Jev-routed vs static-route vs truncation-only, on the 20-example corpus with the System-2-avoidance delta. If COST_PER_CORRECT(JEV) >= COST_PER_CORRECT(STATIC), the hypothesis is dead, and the corpse is the truncation baseline, which already won this fight once.

## EXISTING PING CODE TO REUSE

Do not rebuild; plug into these contracts.

| Need | Existing code | Location |
|---|---|---|
| Fail-closed authorization gate | `authorizeWorkOrder` (8 ordered checks) | `orca-adapter/vendor/external_agent_adapter.js:185` |
| Worker descriptor registry | AGENT_PROFILES (~9 entries, 4 ORCA dispatcher families) | orca-adapter vendor file |
| Idempotency / retry / duplicate decisions | `reconcileGate` (+ locked variant) | `orca-adapter/adapter.js:429/:445` |
| Structural result binding | `verifyResultEnvelope` (3-way agent binding, exact echoes, non-retryable invalid) | `vendor/external_agent_adapter.js:306` |
| Closed outcome vocabulary | `outcomes.js` (OUTCOME + EFFECT_STATE; UNKNOWN never collapses) | `orca-adapter/outcomes.js` |
| Policy decision records | `orca_policy.js` classify* (typed `{class, reason, action, evidence}`) | Pig worktree (verified live 2026-09-28) |
| Deterministic tier classifier | `task-tiers.js` (T0-T4, conservative) | `~/workspace/pig-fb/copilot-broker/src/` |
| Deterministic failure taxonomy | `jsonl-classifier.js` (SUCCESS/EXHAUSTED/RATE_LIMITED/AUTH_FAILED/TEMPORARY_FAILURE/POLICY_BLOCKED/TOOL_FAILURE/UNKNOWN) | same broker |
| LLM-generates, gates-decide template | `signal_pass.py` (gates :222-237; TERMINAL = PASS/NO_VALUE/BLOCKED/FAILURE; 57 recorded runs; cannot write to PING) | `~/workspace/skills/competitive-signal-pass/` |
| Typed decision contract + shadow-only policy | `typed_decision.js` (DecisionRequest, TypedDecision, RuleClaimDecisionProvider fail-closed, MayExecutePolicy shadow-only), `test_jev_shadow.js`, `shadow_worker.js` | `~/workspace/ping-runtime/jev/`, `~/workspace/jev-stage/` |
| Decision event already registered | `JEV_DECISION_EVALUATED` (1 of 235 gateway registry events, `event_class: inference`, owner PING) | gateway `generated/event_registry.json`; file journal is the viable write path today (gateway namespace fix built but not deployed; three scheduler missions hammer the live rejection on ~5s cadence, an open retry defect) |
| Decision record schema proposal | `JEV_DECISION_EVALUATED` event_data schema v1 (decision_unit, outcome DECIDED/ABSTAIN/UNKNOWN/ESCALATE, selection, candidates, confidence, calibration_state, model attestation, input_digest/prompt_digest, evidence_refs, why, escalated/escalated_to, result_ref, cost, shadow) | lane 8 report section 1.3 |
| Jev invocation contract | `jev_ask.py` (profile-only, purpose gating incl. classification + tool-gating, budget gate, prompt sha256 in ledger) | `~/workspace/fyd-intel/` |
| Model contract + attestation | `jev_contract.py`, `model_contract.json` (pinned jev-1.13.0, response attestation, banned-router guard) | `~/workspace/fyd-intel/` |
| Cost + decision ledgers | `spend-ledger.jsonl` (observed ~$1.3-1.6e-05/call), `jev-decisions.jsonl` (9 records; raw `instructions` must become `prompt_digest` in canonical records) | `~/workspace/fyd-intel/` |
| Shadow executor-routing harness | J4 harness (37/37 tests, zero production routing changes, five routing choices) | `jev-shadow-routing-domain` branch |
| Fail-closed provider harness | J7 harness (18/18 tests: timeout/429/529/401/422/malformed; zero ALLOW outcomes; bounded retry then deterministic fallback; auth/schema -> HOLD) | `jev-failure-mode-harness` branch |
| Failure-triage D0 template | `gateway-classify.sh` (closed 10-reason vocabulary, sentinel authority rule, sanitize whitelist, HEALTHY/UNHEALTHY/UNKNOWN) | `~/workspace/ops-watches/` |
| Watch contract + anti-flap | `check-gateway-health.sh` (+ degrades): WARN on UNKNOWN, consecutive-failure counter held at 0 on unproven readings, typed status emission | `~/workspace/ops-watches/` |
| Envelope validation before classification | `tripwire.sh`: OBSERVATION_FAILED exit 3 on null/unparseable readings; identity classification only after readings validate | `~/workspace/swarm/hidden_files/obs-trip/` |
| Deterministic ledger-backed guard | `engagement-guard.py` (terminal-aware intent ledger, within-pass dedup on unique descriptors, ALREADY_ENGAGED merge on every load) | `~/workspace/outreach/` |
| Attention ledger pattern | Intent-ledger pattern, scoped per domain (no new ledger; reuse the pattern) | outreach pipeline |
| Mission dispatch constraints | Pig MC APIs + `_lib/mc-dispatch.ts` FIXED_CONSTRAINTS (slice/agent/capability allowlists, deadlines, broker quota, reconcile gating) | Pig Mission Control |
| Dispatch reached-path boundary map | Lane B3 route trace (intent->receipt; EVIDENCE->EXECUTOR edge ABSENT) | lane reports |
| Eval corpora | `backlog-dataset/` (53 labeled items), `completion-corpus/` (16 labeled items, ACCEPT_PROOF/VERIFY_MORE/REJECT_PROOF + noul ladder) | `~/workspace/jev-eval/` |
| Labeled ask/escalate records | `escalation-log.jsonl` (25 records: 9 decide, 14 escalate, 1 resolved, 1 unparseable) | grill-20 |
| Observation emission seam | `emit-observation.py` (verified-transition gate, semantic-domain gate, duplicate-emission guard by sha256, durable fsync spool, probe-before-POST crash recovery) | `~/workspace/tandem/` |
| Mission lifecycle + idempotency | `mission_intent.py` (validate->authorize->dispatch->observe; MC_LANE_UNKNOWN; revocation) | `~/workspace/mission-control/` |
| Decision-surface inventory | Lane 11 `PING_DECISION_SURFACE.md` (42 surfaces; 10-contract tournament design; promotion discipline; U-01..U-04: Jev cost unreported, model_version unpublished, confidence null, calibration n=6 not established) | `~/workspace/ping-24h/lanes/lane11-decision-fabric/` |
| Git ingestion design anchors | `git-ingestion/threats/GIT-INGESTION-THREATS.md` (12 threats, G-01..G-16 gauntlet, 10 hard gates), `git-ingestion/findings/ECOSYSTEM-HARVEST.md` (top-5 mechanisms), Patch 7 contract (`patch7_real_intake.py`, temporal regression test) | `~/workspace/` |
| Ask working-set bound | `ask-composer.ts` ASK_LIMITS + `boundedObject` (8 related / 20 relationships / 500-char fields) | canonical tree |
| Dedupe invariant | `covered_names.py` + `build-context-pack.py` (pack names == validator rejects) | `~/workspace/tandem/` |
| Privacy envelope | `~/workspace/jev-eval/privacy-envelope.md` (exclude tenant identity, including hashed; hashes/evidence refs in canonical records) | jev-eval |
| Codex run mechanics (to harvest later) | Typed transcript, per-run budget with named exhaustion, typed interrupts, hash-bound propose/apply | convergence matrix section 3 |

**Deliberately not created:** no new event type (reuse JEV_DECISION_EVALUATED + additive vocabulary), no new decision database, no new authority, no parallel ledger, no new event bus, no new backend.

## JEV ECOSYSTEM CODE/PATTERNS TO HARVEST

Surveyed 18 projects. Strong harvest items (verbatim where it matters):

1. **Bounded recommendation contract (jev-layer, MIT):** `jev_route` (host supplies candidate capabilities it already allows -> bounded recommendation), `jev_record_execution` (attach outcome to original correlation_id; receipts -> offline replay), `jev_supervise` (bounded work-state judgments -> host decides continue/verify/retry/finish/escalate), `jev_shadow_compaction` (REPORT-ONLY keep/drop candidates; never mutates; keeps pinned evidence on provider failure). Invariants: "Jev only ever narrows or gates"; adapters fail open to the host's normal path; deterministic demo provider for offline CI; additive-only schema versioning.
2. **Per-hazard calibrated thresholds (pi-jev, MIT):** different noul thresholds per hazard class (destruction 0.90 / exfiltration 0.70 / scope 0.85); all questions in ONE request (~300ms); wording iterated against fixtures until thresholds sit in empty bands.
3. **Staged guard pipeline (jev-guard, MIT):** free heuristics -> deterministic policy -> one parallel Jev request -> noisy-OR evidence fusion -> fail-closed-on-suspicious degrade -> session risk accumulation -> human approval queue -> async event emission. Decision vocabulary: allow / flag / redact / escalate / block. Ordering is the whole design: hard denials BEFORE the allowlist on purpose.
4. **Typed escalation (jev-use, MIT):** every answer carries `{answer, confidence, confidenceFrom, escalate}`; unanswerable -> `escalate:true` + typed reason; a pre-routing layer decides what never reaches the model; credentials stripped before send.
5. **Shadow-first measurement (jev-skill-router, MIT):** every decision logs `{mode, model, question_hash, gate, shortlist, fits, suggestion, reason, usage, elapsed_ms}` with prompt hashes, never prompt text; join shadow logs against real transcripts before claiming value.
6. **Single-request batching + dedup (pi-jev):** N questions per request (latency is per-request, not per-question); identical inputs judged once per TTL; sibling calls share one in-flight request.
7. **Data minimization (pi-jev):** truncate args/outputs with explicit elision markers; file content excludable; notification text scrubbed of registered keys.
8. **Composability primitives (daf-jev):** pure functions `composite_score`, `confidence_gate`, `route`, `pick` over answers; batch Evaluator that never aborts; typed exception hierarchy.
9. **Observe -> project -> choose -> dispatch loop (jev-sts2 + WebBrain):** project state into a small decision-shaped payload; choose from a bounded legal-action list; bind the choice to the observed state and re-check before execution; report version/schema drift, never absorb it.
10. **Decision records (agy-ppt + jev-skill-router):** persist `{decision_id, question, bounded answer schema, evidence/fixture refs, result, confidence, code action, escalated?, final disposition, repository capture}`.
11. **Correctness rules from adversarial review (hermes-jev-skills, MIT):** cache keys include every dimension the decision depends on (context size!); safety checks run on the UNCLIPPED input, never the model-fitted view; partial batch failure reports `partial`, never `ok`; unparseable model output is an ERROR, never a zero (a zero would wave everything through).
12. **Eval-first posture (hermes-agent, WebBrain, jev-skill-router):** no token/speed claim without a matched-baseline measurement; the four WebBrain diagnostic questions gate every new fast-path: (1) what is the exact decision boundary? (2) how often can the small model answer without fallback? (3) does preparing/validating its input cost less than the work it replaces? (4) what happens when it is uncertain?

**Licensing caution:** Jevonian is AGPL-3.0. Harvest design only (deterministic-pre-filter-then-one-Jev-call, explicit precedence table, minConfidence ledger-marking), never code, for PING's commercial surface.

## TOP 3 EXPERIMENTS

**Experiment 1. Failure triage.** Classify failures into a closed label set before any expensive reading. Design: D0 feature extraction + signature ledger + sentinel rule (gateway-classify.sh pattern, tripwire envelope-first rule) -> D1 shadow classification (TRANSPORT/APPLICATION/DATABASE/AUTH/TEST/ENVIRONMENT/UNKNOWN + confidence; policy table maps labels to actions deterministically) -> D2 only on UNKNOWN/conf<0.60/first signature. Eval seed: the 16:04 MDT commute incident (ground truth: TRANSPORT_UNKNOWN, no restart, correct), the 2026-09-27 wedge misclassification, the tripwire null mislabel, the 06:06 watchdog wrong restart, the five test-failure D0b cases, the jev-eval corpora. Metric: System-2 triage reads avoided per 100 incidents; zero remediation authorized from a transport reading; zero pre-existing failures re-litigated. Kill condition: if Jev classification does not reduce D2 reads vs the D0-only baseline at equal-or-better safety, revert to D0-only.

**Experiment 2. Worker routing among already-authorized eligible workers.** Select, never authorize. Design: Stage 0 requirements (D0) -> Stage 1 eligibility intersection (D0; Jev never participates in tenant binding) -> Stage 2 Jev rank of eligible workers (D1, tenant-identity-free payload) -> Stage 3 confidence threshold (D0) -> dispatch or System-2 escalation; `executor_selection` record written per dispatch. Substrate: the J4 shadow harness (37/37 tests, five routing choices, zero production routing changes). Eval seed: grill-20 escalation-log (25 records), historical dispatch evidence, per task-family success rates. Metric: deep-reasoning/escalation calls avoided; per-family success rate at equal-or-better vs caller-default; verified decisions per dollar. Kill condition: per-family cost-per-correct vs deterministic cheapest-fit; two losing families -> routing stays a research tool for that family.

**Experiment 3. Repository context sieve.** Design: D0 exclusions + content-dedupe + import module graph -> D1 Jev semantic relevance choice per candidate file (KEEP/POINTER/DROP + confidence; ~$0.003-0.005/query) -> top 40 -> System 2 reads the 40. Frozen gold set from DEEP-CONVERGENCE-ARCHAEOLOGY.md (~8-10 files). Pre-registered truncation baseline (path-keyword + 2-hop import neighborhood, ranked by in-degree) runs FIRST. Metric: recall@40 primary, expert rating of the 40, token economics vs baseline. Kill conditions (pre-registered): recall@40(jev) <= recall@40(d0); sieve cost erases the System-2 saving; high-confidence DROP on a gold file (immediate reject). Two consecutive losses -> never ships. Also tests the cascade shape (D0 proposes 40 -> Jev verifies) against pre-sieve, because prerouting is ~random while verify-after works.

**FYD ingestion classification follows only after those three** (phase 2): entity-kind classification, evidence-relevance ranking per object field (same harness as the standing Ask FYD evidence-reranking experiment), schema-candidate selection (proposal only; the schema registry authority decides). Canonical entity resolution is not touched until measured; identity merge stays with PING IdentityAuthority; no D1 output writes to canonical objects; owner overlays remain the only path by which extracted facts change.

## EVAL CORPUS

**The 20 grounded examples (lane 6), each with a deterministic baseline verdict, current LLM approach, and the label a Jev classifier should produce:**

Routing (6): E1 `mc.authorize_work_order/v1` live shadow samples (6 real samples, 6/6 agreement with the 8 fail-closed checks, Brier 0.0076; n=6, calibration NOT established; the canonical "router that must not beat a checklist" case). E2 J4 shadow executor-routing harness (37/37 tests; zero production routing changes; every recommendation shadow-denied). E3 the routing proof invalidation (requested `typesafe/jev-router`, provider returned `openai/gpt-6-luna`; missing response.model check; deterministic contract with attestation would have rejected it). E4 Zheng cascade vs preroute (cascade: 94% of Opus accuracy at 54% cost; preroute: close to random; UNKNOWN, abstain from pre-routing). E5 auto-model-router replay (heuristic 68/78, Jev 65/78; the static baseline won; KILL-CONDITION-1 triggered). E6 FB builder tier quality pass 129 (regex tiers misfired; classification-for-routing, unproven until labeled).

Classification (5): E7 commute-blackout vs real outage (deterministic timestamp arithmetic handles all four cases; false-escalation cost dominates; excellent abstain-calibration case). E8 gateway health triage typing (probe failure is evidence about the probe path, not the remote host; ABSTAIN-if-null; the classic fail-closed abstention case). E9 "Move emergency plumbing to the top" (deterministic exact-match was wrong; semantic specificity won; a genuine model-win candidate, needs a labeled ambiguity corpus). E10 Alpine Tree Service chain re-verification (temporal classification; deterministic policy correct; Jev must cite the T2 evidence). E11 "refund please" (Jev wrong twice at 0.00/0.06, right once at 0.02; confidence uncalibrated; never threshold on it without calibration data).

Failure triage (9): E12 NAMESPACE_VIOLATION x963 (detector defect, not breach; a classifier must NOT conclude "attack"; abstention is the safe fallback). E13 canonical test-run triage (byte-identical failure sets with/without lane changes -> PRE_EXISTING; "diff against baseline" is the primary evidence, not red-test counts). E14 fixture discrepancy (fixture drift vs code regression; a classifier that cannot distinguish them blames every lane for pre-existing rot). E15 ingestion failure-honesty (verified:false admitted as records, never promoted, never dropped; the third state binary classifiers lack). E16 reconciliation gap triage (most checks conclude "nothing to do"; a router that escalates "nothing to do" into work is a cost leak). E17 laundering point LP-1 (hardcoded 0.85 confidence -> consensus acceptance -> registry reputation; P0-gated code-live; the canonical "confidence is evidence, never authorization" violation; a Jev probability must never cross an authorization boundary alone). E18 DISTILL closer age semantics (timestamp arithmetic; D0 problem; routing it to any model is waste; keep as a must-NOT-route negative control). E19 HPP PR #1 policy reversal (decisions that reverse prior work on authority grounds; the label needs a reason field, not just a route). E20 FB engagement guard blind spot (incomplete input coverage, not judgment; label the evidence-completeness of the input).

**Headline:** on 18 of 20 examples the deterministic baseline is already correct or authoritative. The two genuine model-win candidates are E4 (cascade verification) and E9 (semantic disambiguation). Every routing proposal must say which of these 20 examples it would handle differently and show the measured delta; otherwise it is speculation.

**Corpora to reuse:** `~/workspace/jev-eval/backlog-dataset/` (53 labeled items, closed-choice calibration; README caveat: zero UNKNOWN examples, so the abstain path is uncalibrated). `~/workspace/jev-eval/completion-corpus/` (16 labeled items, ACCEPT_PROOF/VERIFY_MORE/REJECT_PROOF with the noul evidence ladder). `~/workspace/fyd-intel/jev-decisions.jsonl` (9 records with model/version/tokens/cost/latency; raw `instructions` must become `prompt_digest` in canonical records). grill-20 `escalation-log.jsonl` (25 records). The lane-8 `JEV_DECISION_EVALUATED` schema v1 pins the record shape every experiment emits.

## BASELINE

The deterministic baseline is the incumbent, the bar, and the fallback. Contestants on every experiment: STATIC (heuristics, checklists, timestamp arithmetic, ledger-set membership, policy lookup, exact-match, failure-set diff; zero model calls), TRUNCATE (the decision point removed or replaced with a fixed cap; the 2026-09-26 winner), JEV (the hypothesis, pinned jev-1.13.0, typed output), LLM (the current System-2 approach where one exists), TRUTH (the ground-truth label).

The bar a Jev proposal must clear is the STATIC baseline, not Opus. The default answer to "should Jev route this?" is NO, with the corpus as the receipt. Truncation won once (2026-09-26 archive); the heuristic won once (auto-model-router). The WebBrain four diagnostic questions gate every new fast-path: (1) what is the exact decision boundary? (2) how often can the small model answer without fallback? (3) does preparing/validating its input cost less than the work it replaces? (4) what happens when it is uncertain? The STATIC fallback stays wired and is exercised weekly; if any metric regresses below the bar for 2 consecutive windows, the contract reverts to STATIC automatically.

## JEV

What it is: TypeSafe System One, announced 2026-09-15, model `jev-1.13.0` pinned. NOT an LLM: one endpoint `POST /v1/systemone`, unstructured `state` in, typed answers out (`noul` = P(yes), `choice` = pick + distribution, `score` = ordinal level + confidence), no text generation, ~70-500 ms per request, ~$0.042/MTok in / free out. Reference measurements: 0.33s median per decision (ayautomate), 0.213s median (skell-e-router), 334-566ms mean 422ms (PING shadow seam 2026-09-28), ~$0.02 per 1,000 judgments (jev-use).

Role: selects only; never authorizes, never executes, never establishes truth, never merges identities, never erases evidence, never weakens deterministic safety. Current PING state: shadow-only. Every call goes through `jev_ask.py` with profile-only invocation, purpose gating (classification, tool-gating), and budget gating; `typesafe/jev-router` and floating aliases are BANNED; responses are attested against the pinned model (^jev-1\.13\.0$); the direct API returns no cost field (measured at the ledger: ~$1.3-1.6e-05/call observed). Lane 11 U-01..U-04 hold: Jev cost per call not reported, model_version not published, confidence field null and never populated, calibration NOT established (n=6, Brier 0.0076 encouraging but unestablished). The promotion requirement is n >= 100 shadow decisions with measured calibration before any live-advisory use, per the adoption bar.

Provider note: TypeSafe ToS reportedly bars users from publishing benchmarks of Jev (unverified). Design the eval harness for internal use; verify ToS before any public numbers.

## SYSTEM-2 CALLS AVOIDED

Definition: (System-2 calls per 100 decisions on the no-Jev path) minus (System-2 calls per 100 decisions with Jev, counting the Jev call itself and all fallback calls), at success delta >= -2 percentage points vs STATIC on TRUTH-labeled outcomes. Both sides measured end-to-end (Jev call + fallback + System-2 calls not avoided + ledger writes), never per-decision latency anecdotes.

Per experiment: Experiment 1 (failure triage): D2 reads of the full firehose avoided per 100 incidents; the deterministic funnel disposes of the routine majority (the D0b pristine-base gate already disposes of every recent real test-failure case with zero model calls). Experiment 2 (worker routing): deep-reasoner picks and human escalations avoided when confidence >= T; success measured per task family vs caller-default. Experiment 3 (repo sieve): System-2 reads of the full file set avoided via the 40-file working set; honest note that episodic archaeology volume is lower than operational volume.

Adoption bar (proposed, not owner-approved): avoid >= 25% of System-2 calls; cost per correct decision <= 0.8x the best of STATIC/TRUNCATE/LLM; false-safe rate 0 on C4+ contracts (<= 0.5% elsewhere, each incident with a written post-mortem); no confidence laundering (the Jev probability never crosses an authorization boundary alone; every DECIDED carries the deterministic checks it shadowed); determinism >= 99% repeat-agreement on fail-closed contracts (>= 95% elsewhere, 3+ repetitions); Brier <= 0.05 with no confidently-wrong cluster; kill switch: STATIC fallback stays wired and exercised weekly, automatic revert after 2 regressed windows. If the proposal cannot name the corpus examples it beats STATIC on, it does not get a shadow window.

## FAILURES / ABSTENTIONS

Typed outcomes (lane 8): DECIDED (selection chosen from candidates at/above threshold, evidence complete; the consuming authority still runs its own gate), ABSTAIN (below threshold, conflicting evidence, out-of-vocabulary input; an honest non-decision), UNKNOWN (provider failure, unparseable output, missing input digest; terminal-but-not-success, fail-closed), ESCALATE (high-consequence choice, novelty flag, confidence below the consequential floor; names `escalated_to`).

- When Jev is wrong (ordinary miss): the DECIDED output carries selection, typed reason, evidence refs, input digest, contract version, probability, latency, cost. The owning authority re-verifies against its own evidence before any effect; the miss is contained at the proposal layer. Every miss feeds the corpus and recomputes the contract's calibration.
- When Jev abstains: ABSTAIN -> STATIC fallback executes; abstention is logged with the reason (out-of-contract input, incomplete evidence, sub-floor confidence). A contract where Jev abstains > 40% is a contract Jev does not belong in -> revert to STATIC. UNKNOWN (null/unparseable input) -> no claim; retry per probe posture (bounded, path-varied; no retries inside commute windows), then HOLD. ESCALATE -> human queue with the evidence packet: one decision, one sentence, one evidence link, APPROVE or DENY. The fallback chain is STATIC -> human, never Jev-retrying-Jev; a second Jev call on the same input is forbidden (it converts abstention into latency).
- When Jev is confidently wrong (the dangerous case, LP-1 / E11 / E3 class): caught by (1) response attestation (the Luna delegation would have been rejected), (2) the deterministic checks the decision shadows (the 8 fail-closed checks outvote any probability), (3) calibration monitoring (confident-wrong mass above the false-safe budget closes the contract), (4) the authorization boundary (a probability is evidence, never authorization). The confident-wrong envelope is preserved verbatim (prompt sha256, output, probability) in the spend ledger; a post-mortem is written; the contract's calibration floor is raised or the contract reverts to STATIC.
- Provider failure posture (J7 harness, 18/18 tests): timeout/429/529/401/422/malformed -> zero ALLOW outcomes; bounded retry then deterministic fallback; auth/schema failures -> HOLD. Every recommendation remains shadow-denied.
- Sieve abstain semantics: four typed outputs (KEEP / DROP-from-working-set / POINTER / ESCALATE); every DROP/POINTER logged with reason codes; confidence < 0.6 -> ESCALATE (retain); protected classes bypass the sieve; provider failure -> ESCALATE the batch (fail open toward inclusion, closed toward action). A sieve admits items to a working set; it never destroys evidence and never summarizes canonical evidence away.
- Standing guards: Jev stays SHADOW until calibration is established (n >= 100); UNKNOWN is never rendered as FAILED and never enters learning; never convert low confidence into an arbitrary action (the tripwire mislabel is the standing anti-pattern); UNKNOWN is a legitimate terminal state, a made-up root cause is not.

## SECURITY BOUNDARY

Non-negotiable, per standing decisions and Nolan's binding orders:

1. **Tenant authorization.** Who may act as tenant B; cross-tenant reads/writes; tenant context resolution; namespace binding; caller-to-tenant mapping. Decided ONLY by resolveTenantId, requireTenantContext, callerScope, mc-dispatch-identity, the namespace binder, and deterministic store/projection predicates. Jev sees no tenant identity at all (2026-09-26 privacy call: exclude tenant identity entirely, including hashed).
2. **Capability grants.** authorizeWorkOrder's GRANT/DENY, the identity_5..10 fence, authority posture per order, constraint ceilings. Jev never grants, never lifts a deny, never loosens a deterministic verdict.
3. **Canonical truth.** Worker output is a claim; only PING authorities promote evidence to events. Jev never establishes truth, never merges identities, never erases evidence.
4. **Owner authority.** approve/deny/hold on WAITING_APPROVAL, FYD publish, Mission Control approvals, gateway fixes. Silence never approves; Jev never fills a human's seat.
5. **Execution.** Jev never invokes transport, never dispatches, never cancels, never retries. Its recommendations are shadow-denied until a per-family promotion decision with owner approval.
6. **Deterministic safety downgrades.** No threshold, routing, or guard may weaken a standing deterministic check (never-reengage, monotonic constraint tightening, no_canonical_events, reconciled retry). Jev adds friction only.

Guard rules (from the ecosystem harvest): a Jev guard may only tighten (allow -> ask, allow -> deny, ask -> deny); it may never loosen a deterministic verdict, never grant, never lift a deny (the `user_requested` downgrade rule); `from_untrusted` (planted-instruction detection) is a standalone deny; hard rules run before the model; denials run BEFORE the allowlist on purpose (a command name says nothing about its arguments); in headless operation (no UI) an `ask` must BLOCK (HOLD), otherwise the layer is theatre; cache verdicts keyed by session id AND call hash (never bare content hash for action verdicts); safety checks run on the UNCLIPPED input.

Data rules: Jev payloads carry hashes and evidence references, never raw tenant content; canonical decision records store input_digest/prompt_digest, never raw prompts, PII, or secrets; diagnostics reveal CONFIGURED/NOT_CONFIGURED, never key material. Confidence is a concentration statistic, not a probability of correctness; it is evidence, never authorization (LP-1 was P0-gated code-live; the standing law is "confidence is evidence, never authorization").

Jev never becomes IdentityAuthority, CapabilityAuthority, EventAuthority, ExecutionAuthority, MissionAuthority, SocialAuthority, tenant authorization, or canonical truth. Every integration must earn its place through replayed benchmarks.

## RECOMMENDED FIRST PATCH

**Name:** `jev-failure-triage-shadow` (Experiment 1, shadow mode).

**Why this one, not the other two:** it has the densest eval seed with established ground truth (the 16:04 MDT commute incident, the 2026-09-27 wedge misclassification, the tripwire null mislabel, the 06:06 watchdog wrong restart, five byte-identity test-failure cases, the 20-example corpus, the jev-eval corpora), the deterministic-first machinery already exists in code (gateway-classify.sh vocabulary, tripwire envelope-first rule, the D0b pristine-base gate), zero authorization risk by construction (labels never pick actions; the policy table maps labels to actions deterministically, and transport readings can never authorize a restart), and it attacks the highest-frequency System-2 burn (every probe, every dispatch, every test run, every lane completion). Worker routing (Experiment 2) has the proven J4 substrate but must win per-family cost-per-correct battles against an already-free caller default, and executor selection sits adjacent to the falsified tool-selection finding, so it needs its own shadow measurement before promotion. The repo sieve (Experiment 3) is episodic; most of its waste is killable with D0 measures (section-addressable directives, the covered_names membership test) at zero model cost.

**What the patch builds (design only, nothing to wire in this pass):**
- Two typed decision contracts, `mc.triage_failure/v1` (closed labels TRANSPORT/APPLICATION/DATABASE/AUTH/TEST/ENVIRONMENT/UNKNOWN + confidence) and `mc.attention_classify/v1` (ATTENTION_OWNER/ATTENTION_QUEUE/BACKGROUND + confidence), implemented against the `jev-stage` typed-decision harness (DecisionRequest -> TypedDecision -> EvaluationRecord; `MayExecutePolicy` shadow-only holds).
- D0 feature extractors that already exist in code: gateway-classify.sh's 10-reason vocabulary + sentinel authority rule, tripwire.sh's envelope-validation-first ordering, the attention-ledger dedup pattern from engagement-guard.py.
- Records emitted as `JEV_DECISION_EVALUATED` (lane-8 schema v1: decision_unit, outcome DECIDED/ABSTAIN/UNKNOWN/ESCALATE, selection, candidates, confidence, calibration_state `uncalibrated-shadow`, model attestation, input_digest/prompt_digest only, evidence_refs, why, escalated, result_ref, cost, shadow=true) to the file journal via `emit.py`'s additive-vocabulary pattern. NOT the gateway (namespace fix not deployed; the retry hammer is an open defect).
- Runs in shadow against the live ops-watch streams, incident records, and test-failure streams. Never routes, never alerts, never remediates, never replays failures into lanes.

**Explicit non-goals:** no touch on `authorizeWorkOrder`, tenant code, the dispatch path, remediation wiring (no restarts, no HOLD automation), the Phase 1 approval-door worktree, or any canonical object. No new event type, store, bus, authority, or ledger.

**Eval and promotion bar (pre-registered before the first shadow run):** the seeded labeled set above plus the 20-example corpus (E1-E20) and grill-20 escalation-log; the adoption bar from SYSTEM-2 CALLS AVOIDED (>= 25% System-2 triage reads avoided, cost per correct <= 0.8x STATIC, false-safe 0 on C4+ contracts, Brier <= 0.05, determinism >= 99% on fail-closed contracts, n >= 100 shadow decisions before any live-advisory use). The STATIC fallback (D0-only triage) stays wired and exercised weekly; if any metric regresses below the bar for 2 consecutive windows, the contract reverts automatically. If Jev adds a call and System 2 still reads the same firehose, the integration is rejected at its seam and the patch is archived as a measured "do not adopt," with the eval log kept as corpus material.

---

**Lane inventory:** 8 of 8 lanes complete. All lane claims are hypotheses until independently replayed from a clean checkout. The Jev harvest must not touch the Phase 1 approval-door worktree, files, or workers.
