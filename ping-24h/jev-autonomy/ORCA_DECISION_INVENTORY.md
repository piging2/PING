# ORCA DECISION INVENTORY (final, program-level)

**Promoted:** 2026-09-28 ~17:00 MDT from `~/workspace/ping-24h/jev-autonomy/lanes/orca-inventory/report.md` (Lane 1, read-only harvest, no production wiring). Verified against canonical tree `/home/nolan/projects/ping` @ `0264d517` and the live Pig worktree policy module. This is the program's canonical Orca decision inventory; the lane report is the source of record.

# LANE 1 (ORCA DECISION INVENTORY) — report

**Date:** 2026-09-28 ~17:00 MDT. **Mode:** read-only harvest. No production wiring.
**Sources:** canonical tree `/home/nolan/projects/ping` @ `0264d517` (pig WSL, verified live this run), `~/workspace/orca-adapter/`, `~/workspace/orca-{dispatch-test,remediation,workstream-d}/`, pig worktree `/home/nolan/worktrees/orca-autonomy` (policy module), `~/workspace/pig-fb/` (copilot broker mirror, meta-ask.js), lanes A/B1/10/11 reports, `~/memory/2026-09-1*.md`.

## Headline finding

Orca's dispatcher **never calls an LLM for a decision**. Every dispatch-plane question (may this run? is this a duplicate? should I retry? is this result bound? is follow-up needed? which worker/model?) is answered by deterministic code or by a coordinator-agent procedure. The LLM enters at exactly **one** architectural point: the **worker boundary**, where the whole work order is handed to a worker agent (Hermes/copilot/cloud-subagent/ollama) that makes all its internal decisions (tool choice, what-next, self-assessment) inside its own black-box agentic loop. There is **no LLM model-routing**: "which model should handle this" is never asked; the model is a static worker-profile configuration.

This means the Jev harvest for Orca is not "replace LLM calls with Jev" (there are none on the dispatch plane) but: (a) a few bounded judgments currently executed by the coordinator LLM as procedure (triage, brief-writing, grill-20 check judgments), and (b) new advisory judges where the worker's self-report is the only signal today.

---

## 1. LLM decision points (actual)

### L-01. Whole-task worker execution (the single LLM boundary)
- **CALL SITE:** `~/workspace/orca-adapter/adapter.js:1310` (`buildWorkerPrompt(workOrder, taskBrief, tenant_id)` at `:593`) -> `:1120 dispatchHermes(promptText, timeoutMs)` -> `~/workspace/bin/prompt-hermes.sh` -> Pig `C:\Users\nolan\hermes-bridge\` -> `hermes_cli/main.py --safe-mode -z <prompt>`.
- **CURRENT MODEL:** Hermes agent CLI (multi-model; profile notes "Free model (openrouter)"). Alternate families per `vendor/external_agent_adapter.js` AGENT_PROFILES: `ollama` (default `qwen2.5-coder:1.5b`, ~3s), `cloud-subagent` (remote Muse via dispatcher spawn), `copilot` (identities 1-4, Muse models via broker). Model is per-profile config, never per-decision.
- **INPUT:** taskBrief (free text, written by the dispatching coordinator agent) + 14-field work-order envelope + binding constraints rendered into the prompt + redacted input data.
- **OUTPUT:** one 8-field JSON result envelope `{work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error}` extracted from stdout by brace-matching.
- **FREQUENCY:** per dispatch; ~30/day est (MC missions + shadow runs; laneB1 B-09).
- **LATENCY:** adapter default `timeoutMs=120000`; control-loop `DISPATCH_TIMEOUT_MS=180000`; ollama ~3s noted in profile.
- **TOKEN COST:** UNKNOWN (no cost surface on this path; copilot broker `cost-model.js` is ESTIMATE-labeled and copilot-only).
- **RISK:** worker self-report is a claim, not verification (O5). Hallucinated `completed` contained by `verifyResultEnvelope` + `effect_unknown` discipline, but a plausible-wrong output passes structural checks. Brace-matching extraction can shift if the worker prints a second JSON object.
- **CLASS:** D2 (open-ended task execution: `orchestration.review`, `dead_code.analyze`, `documentation.generate`, `text.transform`).
- **JEV CANDIDATE:** NO for the task body. The worker's internal "which tool / what next" is exactly what the archived 2026-09-26 Jev routing project tested and found did NOT generically reduce token usage (plain truncation did). See negative evidence, section 5.
- **ESCALATION:** worker `failed` with external-effect suspicion, or output contradicting structural evidence -> UNKNOWN/HOLD + human reconciliation (owner 2026-09-25 rule: never failed/retryable/auto-redispatched on unprovable outcome).

### L-02. Meta AI research delegation
- **CALL SITE:** `~/workspace/pig-fb/meta-ask.js` (Pig headed-Chrome CDP :9223, meta.ai tab); job envelopes built by `~/workspace/tandem/build-context-pack.py`.
- **CURRENT MODEL:** Meta AI (web UI, logged-in session).
- **INPUT:** research brief + context pack. **OUTPUT:** open-ended research answer + provenance sidecar.
- **FREQUENCY:** on demand (intelligence tasks). **LATENCY:** minutes (browser automation). **TOKEN COST:** UNKNOWN (no API metering; web UI).
- **RISK:** hallucinated fact entering a pitch (C2); contained by the UNVERIFIED-until-`mark-verified.sh` gate; never promoted into canonical claims.
- **CLASS:** D2. **JEV CANDIDATE:** NO (open-ended research; the verification gate is the control, not the model).
- **ESCALATION:** verification gate failure -> discard; consequential use -> human.

### L-03. Coordinator-agent procedures (Muse as the deciding LLM; no code call site)
These are standing operator procedures where the coordinator (an LLM) makes bounded judgments. They are Orca-adjacent and in-scope as "Orca asks an LLM" only in the sense that the autonomous loop is executed by an LLM agent.
- **(a) grill-20 / SI-03 gate** (R-03): per-check pass/fail judgments over 20 locked checks before any Nolan-bound question; verdict composition deterministic. ~10/day. 25-record label source (`escalation-log.jsonl`). CLASS: D2 (check judgments) + D0 (composition).
- **(b) WAITING_APPROVAL triage** (B-10): mission state -> {hold, propose, escalate}. ~5/day. No code primitive (zero hits in canonical src/); operator-executed. CLASS: D1.
- **(c) Work-order brief authoring**: the coordinator writes `taskBrief`; capability choice comes from the brief + `authorizeWorkOrder` allowlist. "Which skill/capability applies" is a coordinator-LLM judgment bounded by the profile allowlist. CLASS: D1/D2 mix.
- **(d) Outreach eligibility / prospect narratives** (B-06/R-04): outreach lane, not Orca; noted for completeness. CLASS: D1 (eligibility gates) / D2 (narratives).

---

## 2. Decisions that LOOK like LLM questions but are already deterministic (D0)

This is the largest category and the most important reuse finding: Orca's control plane was deliberately built so the dispatcher never exercises judgment.

| # | Decision question | Call site | How it is answered (deterministic) |
|---|---|---|---|
| D-01 | May this agent do this? (should I dispatch?) | `orca-adapter/vendor/external_agent_adapter.js:185` `authorizeWorkOrder` | 8 ordered fail-closed checks over `AGENT_PROFILES` registry data (registered? not blockedExternal? not PENDING_AUTH? capability in allowlist? namespace regex? constraints tighten? `no_canonical_events` + `no_mission_state_writes` hard-required). Returns GRANT/DENY + typed reason. Deterministic modulo wall clock (expiry branch). |
| D-02 | Which worker/model handles this? | `orca-adapter/adapter.js:1202` `dispatchExecution` (`transport='hermes'` default); loops hardcode `AGENT_ID='hermes'` | Caller-supplied parameter / constant. There is NO model routing and NO "which model" decision anywhere. Model = worker-profile config (hermes/openrouter, ollama/qwen2.5-coder:1.5b, cloud-subagent, copilot 1-4). |
| D-03 | Should I retry? Is this a duplicate? | `orca-adapter/adapter.js:429` `reconcileGate` (+ locked `:445`) | Idempotency key + prior-outcome lookup + artifact-exists check under cross-process index lock. Typed refusals: `duplicate_attempt`, `reconciliation_required`, `artifact_exists`, `idempotency_index_corrupt`. Never a blind second dispatch. |
| D-04 | Is this result well-formed and bound to its authorization? | `vendor/external_agent_adapter.js:306` `verifyResultEnvelope` (`:302-335` invalidResult gates) | 8-field structural verification: exact echo of `work_order_id`/`context_pack_id`/`capability`, agent binding, completed-requires-output / failed-requires-error, evidence object, `verifiedAt` ISO within deadline. Validation failure is non-retryable. |
| D-05 | Is follow-up needed? What remains? | `orca-remediation/orca_control_loop.js:924` `assessAndFollowUp` (v1: `orca-dispatch-test/orca_control_loop.js:310`) | Presence-bit logic: count of non-terminal missions, evidence-chain-verification target from last completed mission. Writes `20-assess.json`. The `followUpPolicy` *text* says "ORCA assesses" but the code is deterministic. |
| D-06 | classifyDelegation / classifyRetry / classifyFollowUp / classifyResultAcceptance / prohibitedAction | Pig `/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js:110/157/199/215` (+ `prohibitedAction`) | VERIFIED LIVE ON PIG THIS RUN: 259-line module, zero LLM calls, zero requires. Pure rule functions returning typed `decisionRecord`s (`AUTO_EXECUTE` / `REQUIRES_HUMAN_APPROVAL` / `PROHIBITED` + reason + action). classifyRetry keys on `failureKind` enum (validation-failed/auth-denied/emit-rejected -> escalate, never retry). |
| D-07 | What tier of task is this? (which model class?) | `~/workspace/pig-fb/copilot-broker/src/task-tiers.js` | Deterministic regex classifier: T0 (pure deterministic ops) / T1 (local/scriptable) / T2-T4 (copilot eligible). Conservative: T3/T4 never auto-assigned; uncertain defaults to T1 (local first). Answers "which model class" without a model. |
| D-08 | What kind of failure was this? Retryable? | `~/workspace/pig-fb/copilot-broker/src/jsonl-classifier.js` | Deterministic scan of the CLI JSON event stream: SUCCESS / EXHAUSTED / RATE_LIMITED / AUTH_FAILED / TEMPORARY_FAILURE / POLICY_BLOCKED / TOOL_FAILURE / UNKNOWN. Only RATE_LIMITED + TEMPORARY_FAILURE retryable. Unknown stays UNKNOWN, never blindly retried. |
| D-09 | Is the outcome vocabulary closed? | `~/workspace/orca-adapter/outcomes.js:24-39` | `completed \| failed \| unknown \| denied \| escalated` (+ orthogonal EFFECT_STATE). UNKNOWN never collapses to FAILED (PING-strong). |
| D-10 | Identity/tenant gating | `adapter.js:~1225` (identity_5..10 DENIED), `:89` `resolveTenantId` | Static policy constant + fail-closed namespace contradiction check. |

**Canonical-tree confirmation (pig, this run):** `grep -rl openai src tools` at `0264d517` returns only `src/lib/infrastructure/controller.ts` (a provider-type enum entry) and `src/lib/sentiment/classifier-provider.ts` (an `OpenAIClassifierProvider` that `throw`s "not yet implemented"). There are **zero live LLM API calls** in the canonical tree. The future-LLM Ask path (R-02) is not implemented; the current composer is a deterministic template (`ask-composer.ts:793`).

---

## 3. Full decision inventory (LLM-relevant rows)

| # | Decision | Call site | Current decider | In/Out | Freq | Latency | Token cost | Risk if wrong | D-class | Jev? | Escalation condition |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L-01 | Execute the whole work order (all internal tool/what-next/self-assess choices) | adapter.js:1120 dispatchHermes -> prompt-hermes.sh -> hermes_cli | Worker LLM (Hermes/openrouter; or ollama qwen2.5-coder:1.5b; cloud-subagent; copilot 1-4) | taskBrief+envelope -> 8-field result envelope | ~30/d | 3s-180s | UNKNOWN | Plausible-wrong `completed` (C3); unapproved external effect (C4, contained by read-only profiles) | D2 | NO (body). YES (narrow): independent status judge, see C-01 | External-effect suspicion or evidence contradiction -> UNKNOWN/HOLD + human |
| L-02 | Answer research question | pig-fb/meta-ask.js | Meta AI | brief+context pack -> answer+provenance | on demand | minutes | UNKNOWN | Hallucinated fact in pitch (C2) | D2 | NO | Verification-gate fail -> discard; consequential -> human |
| L-03a | grill-20 per-check judgments | agent procedure (SI-03) | Coordinator LLM | question context -> 20 pass/fail | ~10/d | agent-time | UNKNOWN | Wrong decide = owner blind spot on C4 item (C3) | D2+D0 | PARTIAL (first-pass triage, C-05) | Any C4-adjacent or low-confidence check -> full System 2 |
| L-03b | WAITING_APPROVAL triage | operator procedure (no code) | Coordinator LLM | mission state -> hold/propose/escalate | ~5/d | agent-time | UNKNOWN | Wrong hold stalls mission (C3); wrong escalate taxes owner (C2) | D1 | YES (C-02) | Outward-facing effect or ambiguity -> human |
| L-03c | Which capability/skill applies; brief authoring | coordinator writes taskBrief; adapter.js:1239 gate | Coordinator LLM, bounded by profile allowlist + authorizeWorkOrder | objective -> brief + capability | ~30/d | agent-time | UNKNOWN | Capability mismatch -> denial (safe) or wrong-skill work (C2) | D1/D2 | YES (C-04, brief quality gate) | Denial or constraint conflict -> coordinator rewrites |
| D-01..D-10 | (all deterministic rows above) | see section 2 | Deterministic code | — | — | ms | zero | see laneB1 (C2-C4) | D0 | NO (already optimal) | n/a (fail closed by construction) |

---

## 4. EXISTING PING CODE TO REUSE (deterministic helpers that already answer these)

These are the load-bearing reuses for any Jev proposal: Jev must plug into these contracts, never around them.

1. **`authorizeWorkOrder`** (`orca-adapter/vendor/external_agent_adapter.js:185`) — the 8-check fail-closed gate. Any "should this run" judgment must remain subordinate to it; Jev may *recommend*, the gate *decides*.
2. **`reconcileGate`** (`orca-adapter/adapter.js:429/:445`) — idempotency + prior-outcome + artifact-exists under cross-process lock. Already answers "should I retry / is this a duplicate" — no Jev needed.
3. **`verifyResultEnvelope`** (`vendor/external_agent_adapter.js:306`) — structural echo-binding. Stays authoritative; a Jev usefulness judge (C-01) must be advisory-only and can never override a structural FAIL.
4. **`outcomes.js`** — closed OUTCOME + EFFECT_STATE vocabulary. Jev outputs must be typed into this vocabulary, never free text.
5. **`orca_policy.js` decision records** (pig worktree, `:110/:157/:199/:215`) — the exact `{class, reason, action, evidence}` shape a Jev classifier should implement against for delegation/retry/follow-up decisions.
6. **`task-tiers.js` (T0-T4)** — conservative deterministic tier classifier; the pattern for "which model class" without asking a model. T3/T4 never auto-assigned; uncertain -> T1.
7. **`jsonl-classifier.js`** — deterministic failure taxonomy + retryability. Answers "did this work / what kind of failure" from the event stream without an LLM.
8. **`assessAndFollowUp` presence-bit pattern** (`orca-remediation/orca_control_loop.js:924`) — deterministic "is follow-up needed" from verified state.
9. **`competitive-signal-pass/signal_pass.py`** — THE architectural template: LLM generates candidates, deterministic gates decide (`TERMINAL = PASS/NO_VALUE/BLOCKED/FAILURE`, gates `:222-237`). Jev integration must copy this shape: Jev proposes, machinery disposes, never writes to PING.
10. **`ledger-selftest.js` edge sequences** — typed legal/illegal transition sequences; any Jev-suggested state change must pass these.

---

## 5. TOP 5 D1 CANDIDATES (ranked by frequency x cost x low risk)

Scoring: volume = est decisions/day; cost = 1-4 (laneB1 scale); risk-adjustment favors reversible, advisory-first, shadowable placements. All five assume the section-4 contracts stay authoritative.

| Rank | Candidate | Volume | Cost | Why it scores | Placement / risk control |
|---|---|---|---|---|---|
| 1 | **C-01 Worker-result usefulness judge** — independent second opinion on the worker's self-reported `status`: given the 8-field envelope + stdout excerpt + evidence, answer completed/failed/unknown + confidence. Today `verifyResultEnvelope` is structural only; a plausible-wrong `completed` passes. | ~30/d | 3 | Highest volume x cost on the Orca path; attacks the O5 self-report gap directly. | Advisory only: can flag `unknown` and force reconcile, can NEVER override a structural FAIL or promote to `completed`. Shadow-first against historical evidence artifacts; escalate on low confidence or contradiction with structural checks. |
| 2 | **C-02 WAITING_APPROVAL triage classifier** — mission state + owner context -> {hold, propose, escalate} + one-line rationale. Currently a coordinator-LLM procedure with no code primitive (B-10). | ~5/d | 4 | Bounded typed options; hold/propose are pure and reversible; directly reduces owner attention tax. | Escalation IS the human path: any outward-facing effect, any ambiguity, any C4-adjacent mission -> human. Never auto-approves. |
| 3 | **C-03 Evidence-chain completeness check** — given verified output + `getTrace`, answer "is the chain actually complete or did the worker claim completion with missing links?" This is the v1 t2 false-negative class (`trimMission` dropped `result`; correlation trace missed `MISSION_*` events). | ~10/d | 3 | Targets a witnessed failure mode with a known signature; deterministic presence-bits (D-05) catch shape, Jev reads content. | Advisory flag on the assessment record (`20-assess.json`); a `complete` verdict still requires the deterministic checks. Escalate: any missing-link signal -> re-verify with System 2 before closing. |
| 4 | **C-04 Work-order brief quality gate** — pre-dispatch check of the coordinator-written `taskBrief`: capability in profile allowlist, constraints present and consistent, no secret-shaped material beyond the redactor, input references resolvable. | ~30/d | 2 | Catches malformed dispatches before worker spend; pure pre-effect check; cheap to shadow against the evidence dir's historical briefs. | Fail -> return brief to coordinator (System 2) for rewrite; never edits the brief itself. |
| 5 | **C-05 grill-20 first-pass triage** — Jev pre-scores the 20 locked checks against their evidence pointers; the coordinator LLM verifies. 25-record label source exists (`escalation-log.jsonl`: 9 decide, 14 escalate, 1 resolved, 1 unparseable). | ~10/d | 4 | Volume x cost high, but risk-adjusted down: wrong "decide" = owner blind spot on C4 items. | Escalate on ANY check with <high confidence and on ALL C4-adjacent checks; Jev never emits the final verdict. 25 records are enough for a shadow baseline, not for promotion. |

## 6. Strongest NEGATIVE EVIDENCE (must NOT become D1)

**The worker's internal tool-selection / what-next decisions must stay D2.** This looks like the canonical Jev routing target ("which tool? what should I do next?"), but there is direct negative evidence: the Jev routing project **archived 2026-09-26** found that Jev-based tool-selection/compaction did **NOT** generically reduce token usage versus plain truncation. Applying Jev inside the worker loop would add a model call per decision step without the measured saving, and the worker tasks (`orchestration.review`, `dead_code.analyze`, `documentation.generate`) are open-ended generative work where a small model's judgment risks reducing success, not just cost. The KEY METRIC (System-2 calls avoided without reducing success or safety) fails here on both halves: no demonstrated avoidance, success at risk. The correct System-1 play at the worker boundary is C-01 (judge the *result*, not the *process*), outside the worker's loop.

Runner-up negative evidence: **`authorizeWorkOrder` must stay D0.** It reads like a judgment ("should this agent do this?") but it is a rule engine over registry facts; the lane-11 Jev shadow (n=6, Brier 0.0076) confirmed agreement, not superiority. A false GRANT is C4 (unapproved external effect). Its tournament value is regression-locking the 8 checks, never promotion.

## 7. Falsification

This inventory is falsified by: (1) a live LLM API call on the Orca dispatch plane that my greps missed (canonical `src/`+`tools/` at 0264d517, `orca-adapter/`, `orca-{dispatch-test,remediation,workstream-d}/`, pig `orca/control-loop/`); (2) `orca_policy.js` classify* functions calling a model in a version other than the one read on the pig today; (3) a model-routing decision (per-decision model choice) existing anywhere in the dispatch path — none was found; model is always profile config.

## 8. File map (new evidence pinned this run)

- Pig policy module (verified live 2026-09-28 ~16:55 MDT): `/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js` (259 lines; copies also in `constitutional-convergence-authority-law` and `constitutional-convergence` worktrees).
- Canonical tree LLM grep: `src/lib/infrastructure/controller.ts` (provider enum only), `src/lib/sentiment/classifier-provider.ts` (OpenAI provider throws "not yet implemented").
- Worker invocation chain: `orca-adapter/adapter.js:593/1120/1202/1310` -> `~/workspace/bin/prompt-hermes.sh` -> `hermes_cli/main.py --safe-mode -z` (multi-model CLI: openrouter/nous/openai-codex/xai/qwen-oauth/minimax flows observed in `main.py`).
- Deterministic classifiers: `~/workspace/pig-fb/copilot-broker/src/task-tiers.js`, `~/workspace/pig-fb/copilot-broker/src/jsonl-classifier.js`.
