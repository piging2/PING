# LANE 4: Donor Archaeology, AgentArk + Pernix
## Learning / self-improvement mechanisms and their failure modes

**Lane:** 4 (donor archaeology) | **T+0:** 2026-09-28 14:26 MDT | **Completed:** 2026-09-28
**Mode:** READ ONLY. No tree was modified. No commits, no pushes. No secrets appear in this report.

### Report status: HYPOTHESIS

This report is a **hypothesis** until its PING-relative verdicts are verified against the canonical PING tree (`/home/nolan/projects/ping`), which is not reachable from this environment. Donor-code claims below were verified against clean-checkout shallow clones (`--depth 1`) at the exact pinned SHAs, not against summaries. PING comparisons rest on `~/workspace/runtime-harvest/first-pass-findings.md` (DOCUMENTED there) and are marked accordingly.

### Verification method

- Shallow clones at pinned SHAs: `~/workspace/ping-24h/donors/agentark/` (HEAD = pinned SHA), `~/workspace/ping-24h/donors/pernix/` (HEAD = pinned SHA). Both landed exactly on the wave-1 pins.
- Every constant, threshold, and mechanism quoted was re-read from the pinned tree by this lane. Claim tags used: OBSERVED IN CODE / DOCUMENTED / DEMONSTRATED BY TEST / INFERRED / CLAIMED BY AUTHOR / SPECULATIVE.
- Raw evidence excerpts: `raw/agentark-replay-gate-evidence.txt`, `raw/agentark-canary-learning-evidence.txt`, `raw/pernix-learning-evidence.txt`.
- Built on wave-1 Lane E (AgentArk) and Lane C-sub (Pernix) reports; claims spot-re-verified, not re-derived from scratch. Divergences from wave-1 are noted inline.

### Memory taxonomy used in this report

Nothing is called just "memory". ARCHIVE = append-only evidence of what happened (turn rows, transcripts, post-mortems, traces). STANDING CONTEXT = always-present behavioral content. SEMANTIC KNOWLEDGE = falsifiable beliefs with evidence refs (dream hypotheses, consolidated procedures with counters). PROCEDURAL KNOWLEDGE = skills (capability packages, instructions for doing). MODEL PARAMETERS = weights/embeddings (neither donor touches these; all learning observed is prompt/procedure/policy-level). POLICY = durable behavioral rules the agent follows (versioned profiles, adaptive layer).

---

## DONOR CARD: AgentArk

- **Repository:** https://github.com/agentark-ai/agentark (verified canonical; distinct from the unrelated `p90-rushb/agentark` RL evaluation framework of the same name)
- **License:** MIT / Apache-2.0 dual (LICENSE-MIT + LICENSE-APACHE present; "Copyright (c) 2026 AgentArk Contributors")
- **Current SHA:** `4d2e9f5a58464f532ba0cc5f2924f284d8ffd5b5` (2026-07-29, "docs: refine README introduction and links")
- **Version:** 0.1.5 (Cargo.toml)
- **Activity:** dormant since 2026-07-29 (61 days at read time). No maintenance signal beyond pinned SHA. (DOCUMENTED via commit date; cadence not verified beyond shallow history)
- **Language:** Rust (runtime/control plane), TypeScript (frontend), Python (offline GEPA/DSPy optimizer bridge at `bridges/gepa_optimizer/`)
- **Deployment model:** self-hosted, local-first. Rust control-plane agent runtime (agent loop, channels, tools, sandboxed execution) + parallel self-improvement subsystem ("Evolve"). Storage: SeaORM over Postgres with postgres-vector. Secrets via regex redaction (`[REDACTED_*]`), Ed25519-signed skill/action bundles, SSRF tool-args guard. (OBSERVED IN CODE for redaction/signing per wave-1; deployment shape INFERRED from architecture)

### Learning mechanism (what is recorded, from what signal)

- **Signal capture (ARCHIVE):** every turn writes an `experience_run` row: `success_state` (accepted/failed/corrected/provisional), `correction_state`, `tool_sequence_digest`, exact `prompt_version` / `policy_version` / `strategy_version` in force, redacted request text, `failure_reason`, tokens/cost. `experience_edge` rows record derived_from links. (OBSERVED IN CODE: `src/storage/entities/experience_run.rs:28-36`)
- **Consolidation (SEMANTIC/PROCEDURAL KNOWLEDGE):** `learning.rs::consolidate_run`. Negative runs increment `contradiction_count` on related procedure items and write negative lessons; positive runs with procedure evidence write/increment positive procedures. Confidence: +0.05/+0.08 on support (caps 0.94/0.98), -0.12 on contradiction (floor 0.20). (OBSERVED IN CODE: `src/core/knowledge/learning.rs:648,697,702`)
- **Pattern induction:** procedures with `correction_count > support_count` become "deprecated"; `support_count >= 2` become "active"; else "draft". Patterns carry sample/success/correction counts and success_rate. (DOCUMENTED in wave-1; thresholds from pinned code)
- **Opportunity mining:** quiet-hours, single-flight CAS, 6h cooldown, max 500 runs per pass, miners sequential, drafts capped at 8, one LLM verdict call per pass on underlying intent. Dedupe horizon 200, topic similarity >= 0.6 drops near-dups, rejected drafts re-judged only after 14 days. (OBSERVED IN CODE: `src/core/self_evolve/opportunities/engine.rs:18-27,308`)

### Self-modification mechanism and guardrails

- **What mutates:** versioned prompt/policy/strategy/routing profiles in a KV store. Learning surfaces never touch source code in the pinned tree. Skills are separately managed capability packages, explicitly NOT learning artifacts.
- **Guardrails (OBSERVED IN CODE):** replay/evidence gate (`gates/replay_gate.rs`); embedded-benchmark scorer; typed promotion gate (`gates/promotion_gate.rs`); sticky live canary with typed evaluation (`runtime/strategy_runtime.rs`); 72h deployment observation window (`gates/deployment_cadence.rs:6`, `STABLE_DEPLOYMENT_OBSERVATION_WINDOW_HOURS = 72`); baseline snapshot before every mutation (rollback target; `prompt_snapshot_ring_key`); bounded JSONL lineage archive of rejected candidates with reasons.
- **Guardrail holes (OBSERVED IN CODE):** `src/core/agent/runtime/tool_execution.rs:78` records `"auto_promote_from_canary_replay"`: a production path where canary-replay results auto-promote to stable deployment without the human review queue. Cadence + canary still apply; human approval does not. Doc/code divergence: `assets/docs/arkevolve.md` describes `SelfEvolveAgent`, `security_review.rs`, `coding_guidelines.rs`, `policy_evolution.rs`; none exist in the pinned tree (`src/core/self_evolve/` contains only benchmarks, gates, mod.rs, opportunities, optimizer, prompts, routing, runtime). Claims about opt-in self-modification with blocking security review are CLAIMED BY AUTHOR, NOT OBSERVED.

### What counts as a "lesson"

A typed `learning_candidate` row (`memory_add/update/retract/merge/deprecate`, `strategy`, `workflow`, `turn_decision`, `routing_canonical`, `router_learning`) mined from `experience_run` evidence, or a consolidated procedure/pattern with support/correction counters. Confidence is arithmetic on counters, except the replay gate also thresholds on LLM-assigned candidate confidence (see failure modes).

### Promotion criteria, lesson to policy

Candidate -> replay gate (evidence bar: min 2 samples, min confidence 0.35, max correction rate 0.45, at least one accepted success) -> embedded benchmark scoring (weighted scalar) -> typed promotion gate -> review queue (human approval for high-impact) OR auto-promote-from-canary-replay path -> sticky live canary (default 20% rollout via hash bucketing, min 25 samples/arm, min success gain 0.03, one-sided sign test p <= 0.10 paired on (channel, intent_key)) -> stable promotion after the 72h observation window blocks any second stable deployment. Baseline snapshot enables rollback. (All thresholds OBSERVED IN CODE)

### Failure modes observed (AgentArk)

1. **Timeout-as-acceptance.** `finalize_stale_provisional_experience_runs` (OBSERVED IN CODE: `src/storage/repositories/experience_runs.rs:373`) flips `provisional` runs with no correction to `accepted` after the correction window. Silence becomes success evidence, and those flipped rows then satisfy the replay gate's "at least one accepted success" requirement (`replay_gate.rs:526`). Direct violation of UNKNOWN semantics and of "learning only from verified outcomes". **Verdict: REJECT.**
2. **Proposer-assigned confidence as gate input.** The replay gate thresholds on `candidate.confidence >= 0.35`, but confidence is assigned by the same LLM that proposed the candidate. Proposer-assigned confidence is not evidence. Combined with the 2-sample minimum, the evidence bar is thin. (OBSERVED IN CODE) The adversarial test this exposes (high proposer confidence + thin/correction-heavy evidence must fail the gate) is harvested in Mechanism 1.
3. **Weighted-scalar collapse.** Benchmark scoring collapses accuracy, synthesis quality, token cost, invalid-JSON rate into one scalar before gating; a candidate winning router accuracy while regressing synthesis can still win. The doc self-admits this. (DOCUMENTED) PING-relevant form: gates must be hard per-dimension invariants, never weighted compromises. **Verdict: REJECT** (the collapse pattern, not scoring itself).
4. **Doc/code divergence on self-modification safety.** "Self-modification is opt-in via SelfEvolveAgent with security review that can block and roll back" is CLAIMED BY AUTHOR in `arkevolve.md`; the files do not exist in the pinned tree. **Verdict: ASSUMPTION FALSIFIED.** Lesson for PING: verify the tree, never trust the doc. (This lane re-verified the absence.)
5. **Auto-promote coexistence.** `record_auto_stable_deployment` writes `auto_promote_from_canary_replay` records (OBSERVED IN CODE: `tool_execution.rs:66-88`), so some mutations reach stable without human review-queue approval. If PING adopts canary rollout, auto vs human approval must be explicit auditable policy per surface, not an emergent default.

---

## DONOR CARD: Pernix

- **Repository:** https://github.com/calvincs/pernix (verified canonical)
- **License:** MIT ("Copyright (c) 2025 Calvin Schultz")
- **Current SHA:** `f715753b3030cda364ab333be306afb068000074` (2026-09-03, merge PR #1 "next-3.1-testing")
- **Version:** v3.1.0 (CHANGELOG entry dated 2026-09-03)
- **Activity:** solo maintainer; tagged releases v3.0.0 (2026-08-26), v3.1.0 (2026-09-03). No activity verified beyond pinned SHA.
- **Language:** Python backend (core/, db/, api/, sessions/), JavaScript web UI (static/). Provider-agnostic LLM (Ollama/OpenRouter); SQLite; no tenant model.
- **Deployment model:** self-hosted single-user durable agent. Session/turn loop (Scout planner -> main model -> Reflect verifier -> post-hooks) plus four idle-time autonomy organs: Gates (user-authored shell checks clamping Reflect verdicts), Goals (one persistent per-session objective with budgets), Heartbeats, Session Kernel (persistent Python REPL). Idle-time organs: Dream (falsification of memory beliefs), Telos (turn-anomaly to falsifiable-question loop), Adaptive (governed promotion of machine-authored prompt/policy edits), Canary (behavioral measurement suite + skill change detection). (DOCUMENTED; organ list from wave-1, file paths verified present)

### Learning mechanism (what is recorded, from what signal)

- **Dream (SEMANTIC KNOWLEDGE candidates):** falsifiable hypotheses about memory beliefs, each with evidence refs (post-mortem refs, Candor intel refs). Validated by: counterfactual scout replay (re-plan the original failure with the failed session excluded), evidence judge, or Candor-prediction validators. Constants: `_MIN_OBSERVATIONS = 5`, `VALIDATION_PRIOR = 0.75`. (OBSERVED IN CODE: `core/dream/validate.py:33-34,43`)
- **Adaptive (POLICY):** machine-authored edits (`prompt_note` / `routing_hint` / `policy`) queued in `adaptive_proposals` with evidence refs, lint-gated (`lint_edit`), confidence >= 0.6 per the producer prompt, then a veto-window drain. The contract is explicit that the adaptive layer is "durable POLICY, distinct from memory (facts) and skills (instructions)". (OBSERVED IN CODE: `core/adaptive/contract.py` docstring)
- **Canary (PROCEDURAL KNOWLEDGE verification):** skill-embedded `verify:` blocks synced to managed canaries; change-triggered targeted sweeps. (OBSERVED IN CODE: `core/canary/skill_verify.py`)
- **Telos (ARCHIVE):** root question never completable, trace append-only, agent cannot clear alarms; humility caps. (DOCUMENTED in wave-1)

### Self-modification mechanism and guardrails

- **What mutates:** prompt/policy text edits (adaptive layer) and skill files. Never code, never model parameters.
- **Guardrails (OBSERVED IN CODE):** lint gate on every edit; `policy` kind always human-reviewed before applying (per `ADAPTIVE_EDITS_PROMPT`); veto-window auto-approve after `adaptive_auto_approve_after_hours` (default 24h) with invariant I6 carve-out (canary-suite proposals are "the one class the veto-window drain never takes", `core/adaptive/engine.py:64-67`); tripwire drift detection + confirm-rerun canary sweeps + rollback as post-hoc safety; proposals expire past TTL (`adaptive_expire_stale_proposals`, `db/models.py:3099`); goal completion gated on goal-scoped gates (`goal_complete` refused while gates fail).
- **Guardrail holes (OBSERVED IN CODE):** veto-window is fail-open (silence = consent); `goal_update` lets any agent turn reword the objective and raise token/time/continuation budgets with no owner check; `queue_producer_edits` auto-stamps `session:{id}` as admissible evidence when the model forgot refs.

### What counts as a "lesson"

A dream hypothesis (falsifiable belief with evidence refs, e.g. "lesson X is ineffective") or an adaptive edit (instruction-shaped content: what to do and when, not an observation; confidence >= 0.6; evidence refs). The producer prompt explicitly forbids capturing narrative findings, negative claims about tools without the fix, and transient failures. (OBSERVED IN CODE: `core/adaptive/contract.py`)

### Promotion criteria, lesson to policy

Dream hypothesis -> validation (counterfactual replay / evidence judge / Candor prediction; `_MIN_OBSERVATIONS = 5`) -> validated -> promoted to adaptive layer or archived; refuted -> dropped. Adaptive edit -> lint -> proposal queue -> veto window (auto-approve after 24h unless canary-class) or human approve -> applied with `baseline_version` recorded; tripwire + confirm-rerun canaries post-application; stale proposals expire rather than apply ("approving it blind is worse than letting it lapse", `db/models.py:3099-3105`).

### Failure modes observed (Pernix)

1. **Veto-window auto-approval (fail-open governance).** Pending machine-authored behavior edits self-apply on human silence after `adaptive_auto_approve_after_hours` (default 24h), guarded only by idle-window drain, tripwire, confirm-rerun canaries, rollback. Docstring openly states the belief: "the REAL validation happens over time, on observed behavior." (OBSERVED IN CODE: `core/adaptive/engine.py:109-120,432-437,594,688`) PING's constitutional rule is the opposite: models propose, deterministic policy authorizes; silence is never consent. **Verdict: REJECT.**
2. **Goal self-mutation.** `goal_update` (OBSERVED IN CODE: `core/tools/builtin/goal_tools.py:80-116`) lets any agent turn reword the live goal's objective and raise its own token/time/continuation budgets. No owner check, no notification, no audit event. User intent is enforced at creation and fully porous at update time. **Verdict: AUTHORITY BYPASS FOUND.**
3. **Harness-manufactured evidence.** `queue_producer_edits` auto-stamps `session:{id}` as admissible evidence "so an edit is never refused for a bare list when the model forgot to echo refs" (OBSERVED IN CODE: `core/adaptive/contract.py:72-77`). The harness completes evidence the model did not supply, bypassing the evidence authority the gate pretends to enforce. PING form: fail the edit, never complete its evidence. **Verdict: AUTHORITY BYPASS FOUND.**
4. **Prose rails standing in for tool authority.** "Goals come from explicit user intent, the agent never infers one" is a module docstring; `goal_create` performs zero verification of user intent (only objective length >= 10) and is callable by any turn including workers and cron sessions. (OBSERVED IN CODE: `core/tools/builtin/goal_tools.py:1-44`) Same class as POLYROB's planner rails. **Verdict: AUTHORITY BYPASS FOUND** (the rail is bypassable by construction).
5. **Post-hoc safety as primary safety.** "Ship now, measure later, roll back if the tripwire fires" is the declared model. Fine as defense-in-depth; dangerous as the only gate. (DOCUMENTED)

---

## MECHANISM CARDS

### AgentArk M1: Replay-gate evidence-only gating with hard type boundaries

- **PROBLEM:** A self-improving agent must decide which mined "lessons" may change its behavior. Persuasive user phrasing, proposer confidence, and the learner's own output must never count as evidence, and learning artifacts must never reach capability surfaces (skills), or the learner becomes a second authority source.
- **INVARIANT:** Promotion evidence is structured runtime fields only; user phrasing is never read. Unknown candidate types are blocked. Learning artifacts can never create or modify skills. (OBSERVED IN CODE)
- **MECHANISM:** `src/core/self_evolve/gates/replay_gate.rs`. Module header: "This gate deliberately relies on structured runtime evidence instead of user phrasing: candidate type, evidence references, run outcome state, correction [rates], redaction results." (lines 3-6). Defaults: min 2 evidence samples, min confidence 0.35, max correction rate 0.45, at least one accepted success (lines 25-27, 441-451, 526-536). Type dispatch: unknown candidate types blocked; `"skill_patch"` is hard-blocked with reason "Evolve learning does not create or modify skills" (lines 351-357); `memory_deprecate` requires `contradiction_count > support_count`. Secret-bearing runs are excluded from all learning evidence; PII-redacted runs are counted but flagged (`evidence.pii_redacted_runs`, lines 823-828).
- **WHY IT WORKS:** The gate never reads persuasion, only structured outcomes (success states, correction rates, pattern counters, privacy state). The type dispatch makes "what kind of thing may this change" a code decision, not a policy aspiration. The skill_patch block is the LESSON != POLICY separator made mechanical: the learning layer structurally cannot mint capability.
- **FAILURE IT PREVENTS:** silent capability mutation by the learner (learning layer minting skills = second authority source); learning from social engineering ("the user said it worked"); learning from secret-tainted or version-misattributed runs.
- **ASSUMPTIONS:** success_state values are honest (falsified by M-failure-1: timeout-as-acceptance flips provisional to accepted, which then satisfies "at least one accepted success"); confidence values are evidence-derived (falsified: the LLM proposer assigns the confidence the gate thresholds on); 2 samples suffice (thin; correlated samples pass).
- **PING EQUIVALENT:** PING's target learning loop (OUTCOME -> candidate lesson -> evidence -> hypothesis -> replay/counterfactual evaluation -> proposed change -> falsification -> promotion), per first-pass-findings (DOCUMENTED there; not re-verified against the PING tree).
- **PING STRONGER-WEAKER-DIFFERENT:** PING's loop is strictly more principled (explicit hypothesis, counterfactual evaluation, named falsification stages that AgentArk approximates with benchmarks + live canary but never names). What AgentArk adds is the mechanical type boundary: a hard-coded block on learning artifacts touching the capability/skill surface, plus evidence-typing by candidate kind. PING should state the equivalent as a structural rule, not adopt AgentArk's thin thresholds.
- **TEST WE CAN STEAL:** (1) unknown candidate types blocked; (2) `skill_patch` candidate with 0.99 proposer confidence is rejected; (3) secret-bearing outcomes excluded from consolidation, miners, and optimizer export, not just the final gate; (4) adversarial: high proposer confidence + thin/correction-heavy evidence fails the gate.
- **CODE WE ACTUALLY NEED:** none. Adopt the invariant as a stated rule; do not import the thresholds.
- **Verdict: NEW INVARIANT FOUND**

### AgentArk M2: Typed promotion reports with stable machine-routable codes + bounded lineage

- **PROBLEM:** Accept/reject decisions on learned candidates must be auditable and machine-routable. Silent rejections lose signal; free-text reasons cannot be routed on by other systems.
- **INVARIANT:** Every promotion decision emits a typed report `{outcome, reasons: [{code, label}]}`; rejected candidates land in a bounded lineage archive with their reasons; lineage is capped. No silent accept, no silent reject. (OBSERVED IN CODE)
- **MECHANISM:** `src/core/self_evolve/gates/promotion_gate.rs` (104 lines). `PromotionGateReport { outcome: Passed|Rejected, summary, reasons: Vec<PromotionGateReason{code, label}> }`; `PromotionGateCheck` trait with `code()` + `label()`; `promotion_gate_report()` builds reasons from failed checks only; `render_legacy_promotion_gate` renders `"rejected: code1, code2"`. Rejected candidates are recorded to a JSONL lineage archive capped at 400 entries with their rejection reasons. (OBSERVED IN CODE; lineage handling per wave-1 verification)
- **WHY IT WORKS:** Stable codes let other systems route on failure type (retry policy, alerting, re-mining strategy). Bounded lineage preserves negative results (which lessons failed and why) without unbounded growth. The report is the falsification verdict made structural.
- **FAILURE IT PREVENTS:** "we tried learning and it did not work" with no record of why; silent accept/reject; unbounded growth of rejection logs.
- **ASSUMPTIONS:** reason codes stay stable across versions; the 400-entry cap does not drop signal a later investigation needs.
- **PING EQUIVALENT:** the falsification stage of PING's target learning loop (DOCUMENTED in first-pass-findings).
- **PING STRONGER-WEAKER-DIFFERENT:** PING's loop names falsification but does not structurally require typed, machine-routable verdicts on every decision. This is the smaller, complete contract for that requirement.
- **TEST WE CAN STEAL:** every promotion decision (pass or reject) appends a typed, bounded lineage record; lineage pruning is deterministic (oldest-first, cap enforced); a rejected candidate's record is queryable by reason code.
- **CODE WE ACTUALLY NEED:** none. The shape is 104 lines; adopt the contract, not the code.
- **Verdict: MECHANISM BENCHMARKED**

### AgentArk M3: Version-bound paired live canary with baseline snapshot and deployment cadence

- **PROBLEM:** A lesson that passes offline gates can still regress live behavior. Promotion needs a live comparison that attributes outcomes to the exact policy version that produced them, with a rollback target and a bound on how often stable state may change.
- **INVARIANT:** Live comparison is paired on (channel, intent_key) against a frozen baseline snapshot; only same-version samples are compared; a second stable deployment is blocked inside the observation window. (OBSERVED IN CODE)
- **MECHANISM:** `src/core/self_evolve/runtime/strategy_runtime.rs`. Sticky per-conversation hash bucketing: `bucket = hasher.finish() % 100; bucket < rollout_percent` (lines 246-256), default 20% rollout. Evaluation paired on `(channel, intent_key)` with one-sided sign test (`one_sided_sign_test_p_value`, line 991), min 25 samples per arm, min success gain 0.03, max p-value 0.10 (lines 58-73). Every turn's outcome row carries the exact `prompt_version` / `policy_version` / `strategy_version` in force (`src/storage/entities/experience_run.rs:28-36`); canary evaluation only compares same-version samples (`evaluate_canary_by_policy_version`, `evaluate_experience_canary_by_prompt_version`). Baseline snapshot is pushed before every mutation as the rollback target (`push_prompt_snapshot_ring`, `prompt_snapshot_ring_key`). `STABLE_DEPLOYMENT_OBSERVATION_WINDOW_HOURS = 72` blocks any second stable deployment after a stable one (`gates/deployment_cadence.rs:6`).
- **WHY IT WORKS:** Version binding eliminates "did the lesson come from the old prompt or the new one" ambiguity. Pairing on (channel, intent_key) controls for task mix. The snapshot ring makes rollback mechanical, not aspirational. The 72h cadence bounds the rate of stable-state change.
- **FAILURE IT PREVENTS:** promotion of a lesson that regresses live behavior; cross-version evidence contamination; rapid-fire stable deployments compounding an undetected regression.
- **ASSUMPTIONS:** 25 samples/arm and p <= 0.10 give adequate power (weak for rare intents); the sign test's win/loss encoding captures what matters; the canary population is representative. Caveat: `tool_execution.rs:66-88` shows an `auto_promote_from_canary_replay` production path that reaches stable without human review-queue approval; canary + cadence still apply.
- **PING EQUIVALENT:** the evaluation stage of PING's target learning loop (DOCUMENTED in first-pass-findings).
- **PING STRONGER-WEAKER-DIFFERENT:** PING's loop names the stage; AgentArk supplies concrete statistical machinery PING can slot into it: sticky buckets, paired sign test, per-arm minimums, min gain, version-bound comparison, snapshot ring, deployment cadence. Adopt the machinery, keep PING's explicit hypothesis/falsification framing, and make auto vs human promotion an explicit auditable policy per surface.
- **TEST WE CAN STEAL:** replay comparison across mixed profile versions is refused, not averaged; canary abort restores the baseline snapshot with a typed abort reason and partial canary state never leaks into baseline; second stable promotion inside the 72h window is blocked with a named next-allowed time.
- **CODE WE ACTUALLY NEED:** none. Adapt the algorithm; PING keeps its own statistics.
- **Verdict: MECHANISM BENCHMARKED**

### Pernix M1: Counterfactual replay with decontamination

- **PROBLEM:** A "lesson" can look plausible while being ineffective. The only honest test is whether behavior on the original failure actually changes, and the test is circular if the replay can see the failure transcript.
- **INVARIANT:** A lesson is validated only by replaying the original failure scenario with the failure's own evidence excluded. The counterfactual must not remember the failure. (OBSERVED IN CODE)
- **MECHANISM:** `_validate_lesson_ineffective` (`core/dream/validate.py:301-362`). Tests the hypothesis "this lesson is ineffective" against post-mortem evidence refs. Requires exactly one user turn and a live post-mortem (lines 302-310); otherwise attempts are bumped, never counted. Re-runs the scout planner on the ORIGINAL single-user-turn request with the failed session EXCLUDED from cross-session search: "Fresh-session brief carrying the original session id: cross-session search excludes the failed session (keyed off brief.session_id), and the counterfactual is not contaminated by the failure transcript." (lines 322-329). An LLM judge (`REPLAY_JUDGE_PROMPT`) decides whether the new plan addresses the recorded failure cause; if yes, the "lesson is ineffective" hypothesis is REFUTED (the lesson works); if the plan is unchanged, it is VALIDATED (the lesson is truly ineffective). Daily-capped via `_debit_replay`.
- **WHY IT WORKS:** Decontamination via session exclusion is the portable trick: the replay planner cannot "remember" the failure, so any improvement in the new plan must come from the absorbed lesson. The hypothesis-first framing ("lesson is ineffective") is genuine falsification, not confirmation.
- **FAILURE IT PREVENTS:** ineffective lessons accumulating forever; validating a lesson against its own transcript (circular evidence); unbounded validation spend (daily cap).
- **ASSUMPTIONS:** the recorded failure cause in the post-mortem is correct; the scout planner is deterministic enough that a changed plan means the lesson was absorbed; the judge's verdict is trustworthy. The last assumption fails: the judge is an LLM (`REPLAY_JUDGE_PROMPT`, `_judge_chat`), so "verdict from a model" stands where verification should be.
- **PING EQUIVALENT:** the replay/counterfactual evaluation stage of PING's target learning loop (DOCUMENTED in first-pass-findings). POLYROB (wave-1 Lane C) had no replay-against-historical-cases at all; Pernix is the donor that fills that gap.
- **PING STRONGER-WEAKER-DIFFERENT:** PING's loop names this stage with explicit hypothesis and falsification; Pernix shows the concrete decontamination mechanism (session-exclusion keyed off `brief.session_id`) PING should steal. But PING must replace the LLM judge with deterministic pass/fail criteria: a model's verdict is not a verification gate.
- **TEST WE CAN STEAL:** the replay planner provably sees none of the failed session's artifacts (assert the exclusion); a lesson is validated only when the replay plan addresses the recorded cause with evidence; an unparseable judge verdict bumps attempts, never counts as validation.
- **CODE WE ACTUALLY NEED:** none. Adapt the decontamination pattern into PING's replay stage; replace the judge with deterministic criteria.
- **Verdict: MECHANISM BENCHMARKED**

### Pernix M2: Evidence-expiry obsolescence machinery

- **PROBLEM:** Lessons, prompts, and policies are snapshots of evidence at a moment. Cited evidence moves, tools recover, instrumentation starts late. Without expiry, the learner accumulates dead rules, usage alone keeps harmful hints alive, and instrumentation rollouts mass-retire.
- **INVARIANT:** A proposal is a snapshot of evidence at a moment; approving it blind after its evidence moved is worse than letting it lapse. Usage alone never keeps a harmful entry alive. Instrumentation rollout never mass-retires. (OBSERVED IN CODE)
- **MECHANISM:** three portable algorithms (all OBSERVED IN CODE). (a) Usage-epoch grace (`core/adaptive/retire.py:98-103,194-221`): the usage sweep stamps its first run as the epoch; nothing retires before epoch + window, "without this grace, every pre-instrumentation entry would mass-retire on [rollout]". (b) Failure-dominated retirement (`core/adaptive/retire.py:22-23,213-220`): an entry with enough attributed outcomes whose success share is failure-dominated retires even though it was used, closing the "usage alone kept harmful hint alive" loophole. (c) Evidence-recovery predicates + TTLs (`core/dream/retire.py`: 90-day `_HINT_TTL_DAYS`, Candor-evidence-recovered retires hints whose cited problem no longer exists) and `adaptive_expire_stale_proposals` (`db/models.py:3099`): "A proposal is a snapshot of evidence at a moment. Weeks later the entries it cites may have moved, the tool it complains about may have recovered, and approving it blind is worse than letting it lapse, the producer will re-raise it from current evidence if it still holds." Expiry is lapse-not-apply (fail-safe direction). Companion: the veto-window auto-approve drain (`core/adaptive/engine.py`) with invariant I6 carve-out, canary-suite proposals are "the one class the veto-window drain never takes" (lines 64-67).
- **WHY IT WORKS:** TTLs bound the blast radius of stale lessons. Retirement is decided by attributed outcome share, not usage count, so popularity cannot protect a harmful entry. Epoch grace prevents instrumentation artifacts from masquerading as signal. Lapse-not-apply keeps the fail-safe direction.
- **FAILURE IT PREVENTS:** stale-lesson accumulation (Pernix's own producer prompt warns that "X does not work" hardens into a refusal the agent cites against itself long after the problem is fixed); mass-retirement on instrumentation rollout; usage-kept-harmful hints; blind approval of moved evidence.
- **ASSUMPTIONS:** outcome attribution to entries is honest; TTL windows are tuned; producers actually re-raise from current evidence. The veto-window auto-approve that this machinery coexists with is fail-open governance PING must reject (see Pernix failure mode 1).
- **PING EQUIVALENT:** PING's planned work frontier (OBSERVATION -> DISCREPANCY -> EVIDENCE -> ELIGIBLE WORK) and Jev sensor (DOCUMENTED in first-pass-findings); PING's HOLD/SUPERSEDED work-item semantics (already stronger than POLYROB's idle-as-failure).
- **PING STRONGER-WEAKER-DIFFERENT:** PING has richer work-item lifecycle states but no stated obsolescence/retirement machinery for learned content. The three algorithms are genuinely new: usage-epoch grace, failure-dominated (attribution-based) retirement, and TTL-expiry with lapse-not-apply. Adopt all three as policy; reject the veto-window auto-approve they coexist with.
- **TEST WE CAN STEAL:** (1) newly deployed usage-based retirement sweep retires zero pre-instrumentation entries; (2) a used-but-harmful entry retires on attributed outcome share; (3) a proposal whose cited evidence moved lapses rather than applies; (4) a pending machine-authored proposal left unreviewed past TTL expires WITHOUT applying (silence is never consent).
- **CODE WE ACTUALLY NEED:** none. The algorithms are small and portable; implement in PING's learning loop as policy.
- **Verdict: NEW INVARIANT FOUND**

### Pernix M3: Skill-embedded verify blocks with change-triggered targeted sweeps

- **PROBLEM:** Skills (procedural knowledge) mutate through many paths: agent edit, API, hand edit. Without behavioral tests bound to the skill artifact, drift is invisible until it causes harm, and full-suite re-verification on every edit is a stampede.
- **INVARIANT:** Every skill carries its own behavioral acceptance test; any content change re-runs exactly the tests covering that skill; a vanished skill retires its tests. (OBSERVED IN CODE)
- **MECHANISM:** `core/canary/skill_verify.py`. A skill may embed its own behavioral test as a `verify:` block in SKILL.md frontmatter. A sha256 watermark over each SKILL.md is scanned on a schedule and "catches every mutation path including hand edits" (module docstring, lines 6-9). Each block syncs into a MANAGED canary (`skill--{name}`, `covers: [skill:{name}]`), resynced whenever the skill changes, retired when the block or the skill goes away (lines 112-121, 150-166, 191). One targeted canary sweep runs per changed skill, not a full suite. New verify-gate commands must pass the `propose.is_gate_command_safe` allowlist or are refused with notification.
- **WHY IT WORKS:** The test travels with the artifact it tests, so the promotion gate for procedures is replay, not the proposer's say-so. The content-hash watermark catches mutation paths no hook can see (hand edits, out-of-band writes). Targeted sweeps keep verification cost proportional to change. Orphan retirement keeps the suite honest.
- **FAILURE IT PREVENTS:** skill drift (a procedure silently stops working while remaining trusted); orphaned tests testing nothing; full-suite stampedes on every edit; unverified skill mutations entering the reusable procedure set.
- **ASSUMPTIONS:** verify blocks are well written (a garbage test gives false confidence); the canary gates themselves are trustworthy (in Pernix they are host-shell gates; PING must substitute deterministic gates).
- **PING EQUIVALENT:** PING's skill quarantine (owner-promote) per first-pass-findings, which has no behavioral replay; POLYROB's skill formation likewise had no replay-against-historical-cases (DOCUMENTED in wave-1 Lane C).
- **PING STRONGER-WEAKER-DIFFERENT:** PING's quarantine is stronger on authorization (owner-only promote; agent-authored skills inert until promoted). Pernix adds the missing half: behavioral verification bound to the skill artifact with change detection. The two compose: quarantine controls WHO promotes, verify blocks prove WHAT is promoted still works. Adapt with PING's deterministic gates rather than Pernix's host-shell gates.
- **TEST WE CAN STEAL:** hand-edit a SKILL.md without touching the canary system; assert the watermark sweep detects it and runs exactly the covering canaries; delete a skill; assert its canaries retire; assert a skill change with no verify block is flagged as unverified, not silently trusted.
- **CODE WE ACTUALLY NEED:** none. Adapt the pattern (watermark scan + managed covering canaries + targeted sweeps) into PING's skill lifecycle.
- **Verdict: NEW INVARIANT FOUND**

---

## Cross-donor synthesis

1. **Bounded self-modification is the universal ceiling.** Neither donor modifies MODEL PARAMETERS. AgentArk mutates versioned prompt/policy/strategy/routing profiles in a KV store; Pernix mutates prompt/policy text and skill files. No weight updates, no source-code writes by the learner (AgentArk), no self-scheduled authority rewrites. Every "self-improvement" observed in this lane is prompt/procedure/policy-level. PING's target loop should state this ceiling explicitly: the learner may propose changes to POLICY and PROCEDURAL KNOWLEDGE, never to MODEL PARAMETERS and never to its own authority layer. (INFERRED from both trees)
2. **LESSON != POLICY is enforced mechanically, not aspirationally, in both donors.** AgentArk: `skill_patch` hard-blocked at the gate; candidates and live profiles are different tables. Pernix: the contract states the adaptive layer is "durable POLICY, distinct from memory (facts) and skills (instructions)"; skill verify blocks prove procedures without promoting them. PING's loop should keep this as a structural separation with a mechanical enforcement point, not a documented intention.
3. **UNKNOWN handling diverges, and the divergence is instructive.** AgentArk converts stale `provisional` outcomes to `accepted` (OBSERVED IN CODE), feeding its own evidence gate. Pernix's dream entries carry TTLs and lapse rather than resolve. PING's doctrine (stale provisional outcomes are never converted to accepted; UNKNOWN is legitimate) is stronger than both; AgentArk is the live specimen of exactly the failure mode the doctrine exists to prevent. **Verdict on the doctrine comparison: PING ALREADY STRONGER.**
4. **Evidence bars are thin everywhere.** AgentArk: 2 samples, proposer-assigned 0.35 confidence. Pernix: LLM judges, 24h veto auto-approve. Neither donor has PING's explicit hypothesis + counterfactual + falsification staging. The harvest is never the thresholds; it is the machinery shapes (type-boundary gating, typed verdicts, paired canary, decontamination, expiry algorithms, verify blocks).
5. **Popularity/retrieval feedback loops:** neither donor has Hivekeep's anti feedback-loop invariant (other lane). Pernix's failure-dominated retirement is the closest relative: it ensures usage cannot protect a harmful entry, which is the same family of mistake (a signal that measures exposure being mistaken for a signal that measures value). AgentArk's weighted-scalar benchmark collapse is the opposite failure and is rejected.
6. **What PING should state as new invariants from this lane:** (a) learning artifacts can never mutate capability surfaces; (b) no silent verdicts in the learning pipeline, every falsification verdict carries stable machine-routable codes; (c) promotion evidence is structured runtime fields, never phrasing; (d) a lesson is a snapshot of evidence at a moment, approving it blind after its evidence moved is worse than letting it lapse; (e) usage alone never keeps a harmful entry alive; (f) instrumentation rollout never mass-retires; (g) procedural knowledge carries its own behavioral acceptance tests and any mutation re-verifies.

## Open questions / follow-ups for the parent

- PING-relative verdicts (PING ALREADY STRONGER, MECHANISM BENCHMARKED placements) need confirmation against the canonical PING tree; the PING learning-loop description used here comes from first-pass-findings, not the tree.
- AgentArk's canary auto-promote path (`auto_promote_from_canary_replay`) deserves a PING policy decision if PING adopts canary rollout: auto vs human approval must be explicit per surface.
- Pernix's veto-window auto-approve and goal self-mutation are live AUTHORITY BYPASS specimens; if PING ever considers veto-window governance, these are the falsifying exhibits.
- Neither donor was executed; all claims are from static code reading at the pinned SHAs plus existing test files (AgentArk's gates carry unit tests; several were read but not run).

---
*Report status: HYPOTHESIS until replayed from a clean checkout of the canonical PING tree for the PING-relative claims. Donor-code claims verified against clean-checkout shallow clones at the pinned SHAs above. No em dashes were used in this report.*
