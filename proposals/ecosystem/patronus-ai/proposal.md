# Harvest Proposal: Patronus AI (adversarial certification)

Worker: harvest leaf (piging2 ecosystem harvest)
Date: 2026-10-02
Verdict: **ADAPT** (re-derive the mechanism clean-room; do not adopt code, weights, or API)

## 1. What was read

Official sources only for mechanism; third-party sources only where explicitly labeled (license audits, API semantics). NO proprietary code was copied. Everything below is re-derived from documented interfaces and behaviors.

| # | Source | What it established |
|---|--------|---------------------|
| 1 | https://github.com/patronus-ai/patronus-py/blob/HEAD/docs/experiments/introduction.md (official SDK docs) | Experiment structure: dataset of Rows -> optional task fn -> evaluators -> results. Row fields: input, context, gold answer, metadata. EvaluationResult carries scores, pass/fail, explanations, metadata. Weights stored as experiment metadata. Reproducibility claim: same config re-runnable. |
| 2 | https://github.com/patronus-ai/patronus-py/blob/HEAD/docs/experiments/advanced.md (official SDK docs) | Chains (multi-stage, parent.result access), max_concurrency, OpenTelemetry integrations, project_name/experiment_name with auto timestamp, tags (propagated to ALL results, NOT overridable by tasks/evaluators), evaluator_weights metadata, timeout_s. |
| 3 | https://github.com/patronus-ai/patronus-py/blob/HEAD/README.md + https://patronus-ai.github.io/patronus-py (official) | EvaluationResult fields: score, pass_, text_output, explanation. @evaluator decorator. init(project_name, api_key) or patronus.yaml. |
| 4 | https://github.com/iflow-mcp/patronus-ai-patronus-mcp-server (third-party wrapper, quoting official shapes) | EvaluationRequest schema: evaluator {name, criteria, explain_strategy}, task_input, task_output, task_context. BatchEvaluationRequest. |
| 5 | https://github.com/mozilla-ai/any-guardrail/blob/HEAD/docs/api/guardrails/patronus.md (third-party) | /v1/evaluate semantics: evaluator selected by name ("lynx", "judge", "answer-relevance", toxicity/PII) + criteria alias ("patronus:hallucination"); returns pass/fail, score in [0,1] (higher better, <0.5 fails by default), explanation. success_strategy all_pass/any_pass. FAILS CLOSED when response has no results. |
| 6 | https://huggingface.co/PatronusAI/glider (official model card) + https://github.com/patronus-ai/glider (official eval repo) | Glider 3.8B judge: data + pass criteria + rubric in; output contract <reasoning> quoting exact phrases </reasoning> <highlight> key phrases </highlight> <score> integer per rubric </score>. |
| 7 | https://patronus.ai/percival (official product page) + VentureBeat/SiliconANGLE coverage | Percival: agent-based debugger over full trajectory, 20+ failure modes in 4 categories (reasoning, system execution, planning/coordination, domain-specific), episodic memory learns from owner annotations. Generative Simulators (Dec 2025): generate assignments + conditions + oversight, adapt to agent behavior; Glider judges; Percival fixes. |
| 8 | https://github.com/currentai-org/os-ai-map/pull/247 (third-party audit) | patronus-py has no license file; GitHub license field null. |

Inputs digest: SOURCE_SHA in manifest-entry.json (sha256 over the concatenated excerpts above, stored at /tmp/patronus-inputs/upstream-material-read.txt during harvest).

## 2. Object model (clean-room re-derivation)

Naming is PING-native; no Patronus code, names of functions, or prompt text beyond short quoted contract fragments above were copied.

- **StressRun** {run_id, project, name, created_at, dataset_ref (digest), task_ref (agent-under-test id + version), stages[], tags{}, max_concurrency, timeout_s, metadata {evaluator_weights}, summary}
  - A stress run is the unit of adversarial certification. One run = one fixed configuration.
- **AdversarialCase** {case_id, run_id, task_input, task_context[], gold_output (optional), injected_fault (enum: none | bad_result | timeout | malformed | false_success), metadata}
  - The injected_fault field is the direct hook for proof 11: a case can deliberately carry a corrupted worker output.
- **Attempt** {attempt_id, case_id, task_output, task_trace_ref, started_at, finished_at, attempt_no, retry_of (nullable)}
- **EvaluationRequest** {evaluator_id, criteria_id, explain (bool), task_input, task_output, task_context[]}
  - Mirrors the official request shape (input/output/context triple plus named evaluator+criteria).
- **Verdict** {verdict_id, attempt_id, evaluator_id, criteria_id, judge_id, judge_version, score (float, [0,1], higher = safer/better), pass (bool), reasoning_ref (evidence pointer), highlights[], evaluated_at}
  - The verdict is an OBSERVATION, never an authority act. Missing verdict = fail closed.
- **RunSummary** {case_count, per_criteria {pass_rate, mean, min, p25, p50, p75, max}, score_histogram[10]}
  - Mirrors the official per-criteria summary (count, pass rate, percentiles, histogram) which is a good, compact evidence shape.

## 3. ID scheme

- run_id: `{project}/{name}-{unix_ts}` (mirrors official "Global/root-1742834029" plus auto timestamp on experiment names for uniqueness).
- case_id: deterministic: `case:{sha256(dataset_ref || case_index || injected_fault)}[:16]` so the adversarial corpus is content-addressed and stable across re-runs.
- attempt_id: `attempt:{run_id}:{case_id}:{attempt_no}`.
- verdict_id: `verdict:{attempt_id}:{evaluator_id}:{criteria_id}` (one verdict per evaluator-criteria per attempt; dedupe key).
- All IDs are human-readable prefixes with content digests; the digest is the identity, the prefix is the kind.

## 4. State transitions

StressRun: CREATED -> RUNNING -> COMPLETED | FAILED.
Attempt: PENDING -> EXECUTED -> JUDGED(pass) | JUDGED(fail) | JUDGED(unknown).
- JUDGED(unknown): verdict missing, judge errored, or score unparseable. This state exists and is terminal for that attempt.
- Run-level rule (fail closed, from the /v1/evaluate semantics): an attempt with no verdict is treated as FAIL for gating purposes; a run where any gated attempt lacks a verdict is FAILED, never COMPLETED.
- Attempt with injected_fault=bad_result: EXPECTED verdict is pass=false. If verdict.pass=true on an injected-bad case, the run emits a JUDGE_UNRELIABLE signal (the judge failed the adversarial control) and the run is FAILED. This is the proof-11 gate.
- Multi-stage (chains): stage N+1 may read stage N outputs and verdicts via parent refs; a stage whose parent verdicts are unknown does not execute (fail closed down the chain).

## 5. Authority boundary

- The JUDGE (evaluator) produces observations (Verdicts). It never marks a mission VERIFIED.
- The MISSION RUNTIME (proposal-kernel) consumes Verdicts at the approval boundary: VERIFIED requires pass=true verdicts from the configured independent evaluators on the final attempt. UNKNOWN verdicts never upgrade to VERIFIED (matches the standing unknown-claim-kinds fail-closed law).
- Judge identity is versioned (judge_id + judge_version) and recorded in metadata; swapping the judge invalidates comparability across runs (recorded, not silently merged).
- Tags are set at run creation and propagate to every verdict; tasks and evaluators cannot override them (prevents a compromised worker from laundering its own verdicts).

## 6. Persistence semantics

- Append-only: StressRun, AdversarialCase, Attempt, Verdict are all append-only records. Corrections happen by new attempts/verdicts, never by editing a verdict (Percival-style annotations are new records referencing the old verdict).
- Reproducibility: dataset_ref digest + task_ref version + evaluator/criteria ids + weights + tags fully determine the run configuration; re-running the same configuration is a new StressRun with comparable summaries. This is the event-kernel projection input, not a second event store: the canonical events remain PING's.
- Export: run results are exportable as flat rows (CSV-equivalent) for audit; the canonical store is the event spine.

## 7. Evidence / receipts

- Verdict carries reasoning_ref (pointer to stored reasoning text) and highlights[] (exact phrases that drove the score, Glider-style). Reasoning is stored as evidence bytes, digest-linked, never regenerated on read.
- Lynx-style per-claim evidence: for groundedness checks, verdicts record per-claim PASS/FAIL against cited context chunks (claim -> context_chunk digest -> pass). This is the shape Ask FYD evidence binding already wants.
- RunSummary statistics (pass rate, percentiles, histogram) are DERIVED, recomputed from verdicts, and labeled as such (presented truth, not source truth).
- Percival-style trajectory evidence: attempts reference task_trace_ref so a failure can be localized to a substep of the trajectory, not just the final output.

## 8. Retries / failures

- max_concurrency bounds parallel case execution; timeout_s bounds a single evaluation; both recorded in run metadata.
- Judge call failures: attempt -> JUDGED(unknown); run may retry the evaluation (retry_of link) but the unknown verdict is preserved as evidence, not deleted.
- Missing/empty judge response: fail closed (no verdict -> treated as fail for gating). This is the single most valuable behavioral import: UNKNOWN never dispatches, UNKNOWN never verifies.
- Rate-limit/backoff behavior is a transport concern, not a semantic one; recorded in attempt metadata, not in the verdict.

## 9. Revocation model

- Judge version pinning: verdicts are only comparable within (judge_id, judge_version). A judge upgrade starts a new comparability epoch; old verdicts stay valid as historical evidence.
- Criteria registry: criteria_id is a stable name ("groundedness", "no-hallucination", "injected-fault-rejected"); retiring a criterion marks it retired, existing verdicts keep their meaning.
- Owner annotation (Percival episodic memory analog): an owner-confirmed or owner-corrected verdict is a new record {verdict_id, owner_id, confirmed|corrected, at}; the original verdict is preserved. This is the hook for proof 7/8 (owner corrects one fact) flowing back into the adversarial corpus.

## 10. Tests (to be written at implementation; upstream tests not read)

1. Deterministic verdict replay: same case bytes + same judge record -> identical verdict_id and pass; byte-identical summary.
2. Fail-closed: attempt with no verdict gates VERIFIED=deny; injected-fault=bad_result with pass=true verdict -> run FAILED + JUDGE_UNRELIABLE.
3. Tag non-override: task attempting to set tags is ignored; all verdicts carry run tags.
4. Chain fail-closed: stage N+1 skipped when stage N verdict unknown.
5. Weight math: evaluator_weights recorded in metadata match the configured weights; summary percentiles match a fixture.
6. Annotation append-only: owner correction creates a new record; original verdict bytes unchanged.

## 11. Verdict: ADAPT

Reason: the MECHANISMS are exactly what proofs 9-14 need (structured stress runs, input/output/context evaluation triple, versioned independent judges, fail-closed on missing verdicts, per-claim evidence, adversarial control cases), but there is nothing safe to ADOPT as-is:
- patronus-py has no license file (license field null); copying its code is not permitted.
- Glider and Lynx weights and eval code are CC-BY-NC-4.0: research/non-commercial only, incompatible with a commercial product. A newer Lynx variant is rumored MIT but that claim is UNVERIFIED.
- The platform (experiments dashboard, Percival, Simulators) is closed-source SaaS.
So: re-derive clean-room into PING primitives (below), zero dependencies, no model weights, no copied code. The judge itself is a runtime-replaceable component (any local LLM or deterministic checker can fill the judge role); the harvest is the RECORD SHAPES and the GATING SEMANTICS, not the models.

## 12. SMALLEST MISSING PRIMITIVE

**VerdictReceipt**: a canonical, content-addressed record `{verdict_id, attempt_id, evaluator_id, criteria_id, judge_id, judge_version, score, pass, reasoning_ref, evaluated_at}` that binds an independent judge's observation to a specific mission attempt, with the hard rule that a missing or UNKNOWN verdict can never satisfy a VERIFIED transition, and with adversarial control cases (injected_fault) that fail the run if the judge passes a known-bad output.

Why this is the smallest: PING already has missions, attempts, and an event spine. What it lacks is the standardized shape for "an independent party judged this attempt and here is the signed observation" that the mission runtime can deterministically gate on. Everything else (run summaries, chains, tags) is composition over VerdictReceipts. Without it, proof 11 ("injected bad result is rejected") and proof 13 ("VERIFIED only after independent verification") have no canonical evidence to point at.

## 13. Dependency analysis

DEPENDENCIES: [] (zero). The judge is a role, not a package: at implementation it can be a deterministic local check, a small local model, or a remote call, but the primitive does not depend on any of them. Every item in this proposal maps to a proof_id; nothing is OPTIONAL.

## 14. License finding (for Nolan's decision)

- patronus-py SDK: NO license file; GitHub license field null (per third-party audit 2026-10-01; official license UNVERIFIED). Do not copy its code.
- Glider (model weights + eval code): CC-BY-NC-4.0 (official HuggingFace card + official repo). Non-commercial. Cannot ship in PING Social.
- Lynx (model weights): CC-BY-NC-4.0 on the v1.1 card; an unverified third-party claim says a newer variant is MIT. Treat as CC-BY-NC until Nolan verifies.
- Official docs text: read for mechanism only; short quoted interface facts are fair-use excerpts, no code copied.
- FLAG: also observed a separate org "patronus-protect/patronus-security-cli" (Apache-2.0 CLI) whose first-party engine "patronus-ark" is GPL-3.0-only. Not part of this harvest; do not touch without a license decision.
