# LANE D: Jev Deep Research Report
Read-only research lane. Research only; nothing wired, no paid spend, no credentials touched.
Date: 2026-09-28. Docs verified against https://docs.typesafe.ai (fetched live; .md pages) plus the official skill SKILL.md and community ecosystem sources.
Standing caution applied throughout: vendor performance claims are treated as HYPOTHESES to reproduce on our distribution, not architecture assumptions.

## PART 1 - OFFICIAL API

### API version
- **"v0.2.0" NOT confirmed.** No TypeSafe API version v0.2.0 exists in the official docs. The evaluation endpoint is **`POST https://api.typesafe.ai/v1/systemone`** (API is v1). Current model family is **Jev 1.13**, versioned build **`jev-1.13.0`**, released 2026-09-15. The v0.2.0 report was wrong; use v1 endpoint + jev-1.13.0.
- Versioned IDs are accepted by the `model` field **whether or not they appear in `GET /v1/models`** (docs state this explicitly). `GET /v1/models` currently lists only the aliases (`jev-latest`, `jev-preview`), which matches our contract note that the pinned build is served but unlisted. Our live usage corroborates: `jev-1.13.0` returns 200.

### Request primitives (all confirmed against docs)
- Body shape: `{"model": <string>, "state": <string|object|array>, "questions": {<id>: <Question>}}`. Confirmed: matches our tooling exactly.
- `state`: plain string, JSON object, or array of text values. Text only. Objects with named fields recommended; questions reference nested values with backticked paths (e.g. `` `ticket.messages[0].text` ``).
- Question IDs are caller-chosen, **not sent to the underlying model**, and do not influence inference. Instructions must be self-contained.
- `instructions` (and `criteria`) accept strings, objects, or arrays; structure can hold question + data with backticked field references.
- **Noul**: yes/no question. Optional `criteria`: `{true: "...", false: "..."}` descriptions of the poles.
- **Choice**: map of option label to description (null allowed when an option needs no detail). **2 to 255 options.** Each option competes; the answer picks a single winner.
- **Score**: ordered array of **2 to 10** level descriptions. Levels must describe concrete situations and stand on their own.

### Response primitives (all confirmed)
- Response: `{"model": "jev-1.13.0", "answers": {<id>: <Answer>}, "usage": {"input_tokens": N, "output_tokens": M}}`.
- **Noul answer**: `{type: "noul", noul: <0..1>}` only. No confidence field; the probability IS the belief.
- **Choice answer**: `{type: "choice", choice: <label>, probabilities: {label: p}, confidence: <0..1>}`. Probabilities sum to 1.
- **Score answer**: `{type: "score", score: <float>, legend: {"0": <level desc>, ...}, probabilities: {"0": p, ...}, confidence: <0..1>}`. Score is the probability-weighted position across levels and **can land between levels** (e.g. 1.05). `legend` maps index strings to the criteria descriptions.
- Response `model` field reports the **versioned ID that answered** (e.g. `jev-1.13.0`), not the alias. Docs explicitly advise logging it per result.

### Probability semantics
- Jev's native output is a probability distribution over a declared finite alphabet; there is no token-by-token decoding, hence the latency. Trained with a method TypeSafe calls **RLCD (Reinforcement Learning for Calibrated Decisions)**, objective: a 95% answer should be right ~95% of the time, and similar inputs return similar outputs. HYPOTHESIS until reproduced: one independent analysis (archerhume.com, cited by Towards AI) measured calibration error ~0.03 on 1,200 MMLU items, weaker on harder fresh problems, and found the same option's probability moved **0.84 to 0.96 depending on option-list position**. Treat probabilities as calibrated-but-order-sensitive; reproduce on our workloads.

### Confidence semantics
- `confidence` is a **derived statistic of the probability distribution**, not an independent model estimate. Formula published on the docs Confidence page: `(count * peak - 1) / (count - 1)`, where peak is the largest probability. 1.0 = all mass on one outcome; uniform = 0.
- The docs warn: confidence summarizes **distribution concentration, not overall workflow correctness or permission to act**. A Noul near 0.5 means yes/no are equally likely, not medium intensity. Low confidence on a choice can mean several acceptable alternatives, not a bad question.
- Official guidance pattern: three bands (act automatically / proceed with caution / do not act) with **per-action thresholds scaled to stakes** (0.6 floor catches genuine uncertainty; destructive actions demand >0.85). Docs: "The correct threshold values depend on your domain... test with your own data."

### Batching / parallel-question behavior
- All questions in one request share one state and are **evaluated in parallel and in isolation**; they cannot see each other's answers. Adding questions adds little latency. The docs cookbook shows 13 questions in one call: **12.2x cheaper, 10.0x faster** than one-question-per-call (vendor measurement; treat as hypothesis).
- **Speculative fan-out** is an official pattern: send speculative questions in the same call, state each speculative premise explicitly, and let code consume only the applicable answers. A second request is warranted only when an earlier answer is needed to fetch evidence, build new state, or choose next options.

### Latency
- Vendor-published: **70-500 ms end to end** (their region). Community measured: **p50 ~230 ms** (jev-use, live); ismaelsoilet/jev-harness reports ~80-100 ms CLI-side, ~0.5-1.0 s on free tier. HYPOTHESIS: measure on our path; budget 1s timeouts as the jev-for-all plugin does.

### Cost / pricing
- **$0.042 per million input tokens ($42/Btok); output tokens free.** No token-generation phase. TypeSafe describes the price as possibly subsidized. Our code's conservative $0.001/call budget estimate is ~30x above the measured ~$0.00003 typical call; safe margin, keep.
- Vercel AI Gateway offered Jev free through 2026-09-25 only (that window is closed); do not route through Vercel expecting free.

### Rate limits
- Published: **250,000 tokens per second / 1,200 requests per minute.** Exceeding either returns 429. **Docs state limits are adjusting dynamically and can change without notice** while demand is being served. SDK defaults: retry 408/429/5xx with backoff, honor Retry-After. Note: our jev_ask courier does NO retries today; a 429 fails closed immediately, which is safe but slower than the vendor-recommended backoff.

### Failure modes and error shapes
- Standard HTTP + JSON body: `401` (missing/invalid key), `422` (validation: missing field or malformed question; body names the offending field), `429` (rate limit), `529` (temporary overload). Retry 429/529 with exponential backoff.
- Documented model failure modes for jev-1.13 (official jaggedness page, last reviewed 2026-09-17): (1) literal reading (answers what you wrote, not what you meant; no implied conditions); (2) math/numbers (no reliable counting, arithmetic, hex/RGB nearness); score interpolation is NOT reliable; (3) date/time comparison; (4) indirection and double negatives; (5) large states full of irrelevant detail (accuracy falls; context rot); (6) adversarial content in state (state is treated as data, not hostile; injections can steer answers); (7) contradictory instructions vs criteria; (8) no structural invariants: a Noul and a yes/no Choice on the same question disagree, and P(noul) + P(not noul) = 1.19 observed (do NOT carry thresholds across primitive types; do not rely on arithmetic identities between separate questions); (9) generation is not trained (extract candidates in code or with a generative model, let Jev select).
- Per the official skill: treat cookbook thresholds and demo results as examples, not universal rules; "Typed output guarantees the interface, not truth."

### Privacy / data handling / retention
- Docs: **Jev is not trained on customer requests or responses**; not fine-tuned or LoRA-adapted per account; same weights serve every account. Domain shaping is request-side only (state + instructions/criteria).
- Zero Data Retention (ZDR) available on enterprise plans; contact sales@typesafe.ai. Legal page hosts DPA and Privacy Policy.
- Language: English is primary training language; CJK/other languages handled but worse; test non-English workloads on our own content.
- Input: text only (string, JSON object, array of text). No images/audio/video; pre-process into text in code.

### Version / change behavior
- Aliases: `jev-latest` and `jev-preview` both currently resolve to `jev-1.13.0`. `jev-preview` moves ahead of `jev-latest` when a preview build exists (none currently). **An alias moves when a new release ships; answers behind it can change without any change on your side.**
- Docs explicitly recommend: **pin the versioned ID if you tuned confidence thresholds against a specific version** (our model_contract.json already does this with jev-1.13.0; aligned), and log the response `model` field per result (our ledger records response_model; aligned).
- SDK churn is real and recent: Python SDK 0.7.0 (2026-09-18, breaking: msgspec -> Pydantic, `response_model` added); JS SDK 0.6.0 (2026-09-15, breaking: Score criteria became an ordered array). If we adopt an official SDK later, pin the version and read the migration guide; today our raw-HTTP path dodges this.

### Discrepancies between our tooling and the official docs
1. **Model string in smoke docs vs contract**: `~/workspace/skills/typesafe/SKILL.md` documents a proven smoke shape using `"model":"jev-latest"`, while `fyd-intel/model_contract.json` (the production path) pins `jev-1.13.0` and explicitly bans the alias. Both work (docs accept aliases), but the skill page presents the alias shape as the canonical example; consider aligning the skill doc to the pinned contract or noting the alias is smoke-test-only.
2. **Provider field**: our attestation expects `provider == "TypeSafe"` (only when present; the check is correctly absent-tolerant). The official API reference response example shows only `model/answers/usage`; `provider` appears to be an OpenRouter-style addition. Our absent-tolerant check handles both. No change needed.
3. **`usage.cost`**: jev_ask reads `usage.cost` from the response. The official docs response schema shows only `input_tokens`/`output_tokens` in `usage`. Cost likely comes through OpenRouter's response or is absent on direct TypeSafe calls (direct callers compute cost from input tokens x $0.042/MTok). Verify on a live direct call; if absent, compute cost locally in the ledger rather than reading `cost: 0.0`.
4. **No retry/backoff**: vendor guidance is exponential backoff on 429/529; our courier fails closed on first non-200. Fail-closed is policy-correct; a bounded retry (429/529 only) would be faster without violating policy. Optional improvement.
5. **Pig courier transport note**: `jev-decide.ps1` uses the Hermes `OPENROUTER_API_KEY`. OpenRouter serves Jev via its **Decisions API** (`/decisions`), not `/v1/systemone`. If the Pig courier path is ever used for Jev, the URL must be the OpenRouter decisions endpoint, not the TypeSafe endpoint. Today TYPESAFE_JEV goes direct from this machine, so this is dormant-but-documented.
6. **Score `legend`**: official answer includes `legend` mapping index->description. Our `_answer_summary` captures it. Aligned. Note: legend keys are strings ("0","1","2"), so downstream code must not expect integers.

## PART 2 - ECOSYSTEM HARVEST

### Hypothesis verification
- **H1 (Jev Agent Skill frames Jev as typed judgments; app retains business logic/permissions/final action): VERIFIED.** Official skill SKILL.md: "Code owns the workflow; the model supplies programmable common sense." "Choice/Score confidence summarizes distribution concentration, not overall workflow correctness or permission to act." Third-party pi-adaptative skill states it even harder: "A Jev verdict grants none of these" (credentials, destructive actions, publication, authority expansion). Also: "Put the constants (questions and thresholds) in a single place"; "don't take assertions at face value."
- **H2 (jevgrep: cheap relevance selection before an expensive agent reads): VERIFIED.** zaydmulani09/jevgrep: ripgrep keyword shortlist (~30 lines, deterministic, no index) then ONE batched Choice over candidates; per-option probabilities = ranking. ~240 ms. dzhng/jevgrep variant judges folders/files/source units with line-referenced excerpts. jgrep: one Noul per 5-60 line chunk, 16 chunks/request. Principle confirmed everywhere: deterministic recall first, Jev supplies intent ranking.
- **H3 (jev-harness filters tool results before the main model sees them): VERIFIED as a pattern family; "A/B tests" framing not found.** ismaelsoilet/jev-harness: extracts <=15-line assertion slices instead of 500-line terminal logs; zero-trust state sanitization (redacts secrets, masks injections) before any model call. talya1412/jev-harness: `pruneContext` (non-destructive context pruning), `escalateOnLowConfidence` tri-state, OMP hooks with tool_result pruning, decision logs with flip-rate comparison. jev-pruner and yoshi prune history/bash output. Nobody published a literal A/B harness, but flip-rate comparison (`compare` flip-rate) and the AutoResearch cookbook (Jev probabilities as ML features + error-driven iteration) are the eval discipline substitutes.

### Additional ecosystem patterns observed
- jev-for-all / universam1/jevselector: per-turn skill+tool subset selection, measured ~52-56% system-prompt reduction (~2,700 tokens saved/turn), cached across continuation turns; core tools always visible (`read,write,edit,bash,grep,glob`), probability floors and confidence thresholds in code; hidden skills still loadable by exact id (no global unregistration).
- Official cookbooks directly relevant: Skill suggestion (2 requests rank + re-check 182 Hermes skills), Re-ranking (30-passage BM25 -> one Jev question per query-candidate pair: top-1 5%->18%, top-10 38%->62%), Classifying RAG passages (score each, code decides what reaches the model), LLM Guardrails (threshold hazard probabilities: pass/review/block/route), Line-by-line search (218 line ids in one request: Choice per line + Noul for answer-presence), Self-consistency (route uncertain probabilities to human review, keep values visible).
- discern (Effect/TS): Jev answers become typed patterns with an explicit `Uncertain` branch; recording, replay, caching, call budgets as middleware. Matches our evidence-first posture.
- jev-use: measured p50 ~230 ms, ~$0.02 per 1,000 judgments, typed escalation back to LLM.

### Pattern verdicts for PING (10 patterns)
1. **TYPED CHOICE - ADOPT.** Core primitive; our jev_ask choice path already implements it. Keep purpose-gating (classification/routing only, never deterministic or generative work).
2. **SCORING - ADOPT.** Core primitive; score path exists. Use comparable per-item Scores for graded ranking per docs; never interpolate exact magnitudes from score expectations (official jaggedness).
3. **RANKING - ADAPT.** jevgrep + official rerank cookbook pattern: deterministic candidate generation in code (ripgrep/BM25), one batched Jev Choice over the shortlist, per-option probabilities as the rank. For PING ingestion/triage ranking: adopt the shape, adapt to our evidence types, keep candidate generation deterministic.
4. **RELEVANCE FILTERING - ADOPT.** One Noul per candidate (line, passage, tool result) in a single batched call; code sets the threshold. Directly matches the classifying-RAG-passages cookbook and our lane's tool-gating purpose.
5. **TOOL ROUTING - ADAPT.** jev-for-all/jevselector measured ~53% prompt savings; adapt with PING constraints: Jev proposes tool subsets, code owns the always-visible core set and floors, and Jev verdicts grant no permissions (per the official skill and pi-adaptative's explicit rule). Skill descriptions stay code-owned.
6. **SKILL ROUTING - ADOPT.** Same machinery as tool routing; the official skill-suggestion cookbook (rank + re-check top candidates) and universam1/jevselector's measured results support it. For PING: per-turn skill subset selection with confidence floors, thresholds in one reviewable file.
7. **RISK JUDGMENT - ADOPT.** The official confidence-gated routing pattern (0.6 floor, per-action stakes thresholds) plus jev-harness `judgeDestructive@0.5` and jev-guard deny/ask/allow map directly onto PING's approval gates. Jev judges risk; code (and the owner where required) authorizes action. Never invert this.
8. **COMPLETION JUDGMENT - ADAPT.** jev-harness `completion_status` Noul and jev-review workflows. For PING mission completion checks: use as a second opinion alongside code-owned acceptance criteria, never as the sole definition of done; low confidence routes to human review, not to auto-approval.
9. **CONTEXT FILTERING - ADAPT.** jev-pruner/yoshi/pruneContext. For PING worker context pruning: deterministic truncation first (cheap, exact), Jev refinement second; keep audit-relevant content verbatim (fast-jev-compaction lesson); adversarial-content jaggedness means prompt-injection masking (ismaelsoilet redact pattern) must precede it.
10. **MODEL ESCALATION - ADOPT.** `escalateOnLowConfidence` tri-state, jev-use typed escalation back to the LLM, JevLoop low-confidence -> arbitration. Matches PING's Jev-selects/frontier-acts architecture and jev_ask's fail-closed attestation. Escape valve must be code-owned (budget guard, max escalation depth), never model-driven recursion.

**Counts: ADOPT 5, ADAPT 5, REJECT 0.** No pattern was rejected: each maps to an existing PING decision lane with the code-in-control boundary intact. Wherever Jev touched permissions or final action, the ecosystem consistently keeps policy in code; that invariant is what makes all ten safe to consider.

### Three patterns most directly applicable to PING's decision surface
1. **RISK JUDGMENT (confidence-gated routing with per-action thresholds)** - PING's approval gates are this exact shape: a Jev risk Noul/Score, code-owned per-action thresholds scaled to stakes, owner-authority boundary for destructive actions. Official pattern, ecosystem-converged.
2. **SKILL/TOOL ROUTING (per-turn subset selection with code-owned floors)** - measured 52-56% prompt reduction; jevselector's design (always-visible core tools, hidden skills loadable by id, no global unregistration) fits PING's worker runtime without permission leakage.
3. **RELEVANCE FILTERING (one batched Noul per candidate, code thresholds)** - the direct implementation of PING's tool-gating/ambiguity-triage lane: cheap filter in front of every expensive decision, exact policy in code, calibration validated on our own data before thresholds ship.

## Sources
Official docs (fetched 2026-09-28): https://docs.typesafe.ai/api.md, /models.md, /confidence.md, /patterns.md, /patterns/confidence-routing, /model-jaggedness/jev-1.13.md, /llms.txt, /agent-skill.md; official skill SKILL.md via raw.githubusercontent.com/typesafe-ai/skills. Ecosystem: zaydmulani09/jevgrep, dzhng/jevgrep, ismaelsoilet/jev-harness, talya1412/jev-harness, emirbartu/opencode-system-one (jev-for-all), universam1/jevselector, francoischastel/jev-code, jev-use (shitianfang), discern, yoshi, jev-pruner, mrjev/awesome-jev, cobanov/awesome-jev, cellcog.ai and meetcody.ai Jev explainers (vendor-claim caveats applied).
