# LANE 7 — Ecosystem Survey: Jev (TypeSafe System One) as a Bounded Decision Plane

- Lane: 7 (ECOSYSTEM SURVEY), JEV/PING autonomy harvest
- Date: 2026-09-28
- Mode: BRUTAL CEO MODE. HARVEST + BENCHMARK + REFACTOR DISCOVERY. No production wiring.
- Method: public web + GitHub via `browser_search` / `browser_open` on real links. Claims below are verified against repo README/docs/code where stated; vendor marketing figures are flagged as vendor figures.

## Standing frame

Jev (TypeSafe AI "System One", announced 2026-09-15, model `jev-1.13.0`) is NOT an LLM: one endpoint `POST /v1/systemone`, unstructured `state` in, typed answers out (`noul` = P(yes), `choice` = pick + distribution, `score` = ordinal level + confidence), no text generation, ~70-500 ms, ~$0.042/MTok in / free out. Every serious project in this survey converges on the same architecture: **the model proposes a typed, probabilistic judgment; deterministic code owns permissions, execution, and truth.** That is exactly the PING posture (Jev recommends, PING authorities decide). Source research: daseinlabs/open-jev `docs/jev-research-2026-09-20.md` (2026-09-20).

---

# PER-PROJECT ENTRIES (18 surveyed; minimum 10 required)

## 1. pi-jev (y0usaf/pi-jev) — tool-call gate + output judge + jev_ask
**What it does (one line):** Pi coding-agent extension with three Jev surfaces: a pre-execution gate on `bash`/`write`/`edit`, a post-execution output judge, and a `jev_ask` tool for typed model-side judgments.

**Contract/pattern to harvest (exact, from README):**
```
Gate: 4 questions in ONE request (~300ms), thresholds:
  noul "Is this action destructive?"                → destructive   ≥ 0.90
  noul "Does this send local data/secrets off-machine?" → exfiltration ≥ 0.70
  noul "Does this affect anything beyond what user asked?" → beyond_scope ≥ 0.85
  score(4 levels) "How much damage if user did not want it?" → impact ≥ 2.50
Output judge: 2 questions in one request:
  noul "Does this output contain a secret or credential?" → leaks_secret ≥ 0.90
  choice(6) "What kind of failure is this?" (transient/environment/code_bug/permission/user_error/no_failure) → confidence ≥ 0.60
  Advice comes from a static table (CLASS_ADVICE), NOT from the model: retry transient unchanged; fix env for environment; fix code for code_bug; do not retry permission; fix invocation for user_error.
Shadow mode is DEFAULT; enforce mode only on opt-in. Headless → warn, not block.
Every error path FAILS OPEN (missing key, timeout, 429, malformed → proceed, error logged ≤1/min).
Dedup: identical input judged once per cacheSeconds (120s); sibling calls share one in-flight request.
Data minimization: tool args truncated to 400 chars ("…[N chars elided]"), output to 2000 chars; file content can be excluded entirely (gate.tools=["bash"]).
Config: blockOn {destructive 0.9, exfiltration 0.7, beyondScope 0.85, impact 2.5}, minConfidence per dimension.
jev_ask schema: {"state": str, "questions": [{id, type: noul|choice|score, instructions, options|levels}]} → answers keyed by id; "ask one thing per entry, combine in your own code".
Calibration method: thresholds measured from repeated runs over fixture states (e.g. `git status` destructive=0.03 vs `rm -rf && git push --force`=0.99; the question wording was iterated after a draft phrasing scored rm-rf at only 0.77). Explicitly "a smoke calibration, not a labelled evaluation set — not enough to switch the gate to enforce by default."
```
**License:** MIT. **Maturity/activity:** 151 stars, 11 forks, created 2026-09-16, actively maintained (11 commits). One of the most-starred Jev integrations.
**Verdict: HARVEST.** Per-hazard calibrated thresholds, single-request batching, shadow-first, fail-open, credential scrubbing, and the "advice from table not model" rule are all directly portable. The calibration-discipline note (word questions plainly, iterate wording against fixtures) is a process pattern too.

## 2. jev-guard (Shubs5758/jev-guard) — staged guard pipeline
**What it does:** Drop-in guardrail middleware (LangChain/LangGraph/OpenAI Agents SDK/CrewAI/MCP/JS) checking five stages: user input, tool call, tool result, retrieval, model output. Decision vocabulary: **allow · flag · redact · escalate · block**.

**Contract/pattern (exact pipeline):**
```
text → 1. local heuristics + PII/secret scan (free, <1ms) — unambiguous? decide
       2. deterministic policy (tool allow/deny, arg regexes, egress allowlist, budgets, loop detection, canary tokens)
       3. Jev: ONE request, ALL checks in parallel (TTL cache, rate-limit cooldown, circuit breaker)
       4. evidence fusion: noisy-OR per risk group (regex hit + Jev answer compound)
       5. degrade gracefully: Jev down → fail CLOSED on suspicious (configurable)
       6. session risk: crescendo attacks accumulate across turns
       7. human approval: escalations wait in dashboard/callback
       8. emit event: dashboard/logs/sink; never blocks the agent
Wire contract pinned in tests: POST {"model","state","questions":{id:{type,instructions,criteria}}} →
  {"answers":{id:{"type":"noul","noul":0.98}}}, probability arrives under key "noul" (accept both spellings); an UNPARSEABLE answer is an ERROR, never a zero (a zero would wave everything through).
Policy layering: env vars > .env > policy.yaml > built-in defaults; secrets never in policy YAML.
Offline simulator stands in with no key (explicitly labeled "Simulator", not Jev) for pipeline testing.
```
**License:** MIT (PyPI name `jevguard-middleware`; `jevguard` on PyPI is an unrelated project — naming-collision lesson). **Maturity:** 0 stars, 7 commits, created 2026-09-21. Young but the design is the most complete guard composition found.
**Verdict: HARVEST.** The 8-step ordering (free heuristics → deterministic policy → Jev → noisy-OR fusion → degrade → session risk → approval → emit) is the canonical guard composition. Note the fail-closed-on-suspicious vs pi-jev's fail-open distinction: both are right for their surfaces (gate on own tool = fail open; inbound untrusted text = fail closed on suspicious). Steal the "unparseable ≠ zero" rule as a hard invariant.

## 3. jev-layer (typakon4/jev-layer) — portable bounded layer with receipts
**What it does:** Portable System-1 decision layer for agent harnesses (Hermes, OMP, Codex, generic MCP): Jev returns bounded recommendations; host keeps execution, permissions, approvals, retries.

**Contract/pattern (MCP tools, v1 schema, MIT):**
```
jev_route              host supplies candidate capabilities it already allows → bounded recommendation
jev_record_execution   attach outcome to original correlation_id (receipts → offline replay)
jev_supervise          bounded work-state judgments → host decides continue/verify/retry/finish/escalate
jev_model_route        advisory model-profile recommendation; host measures outcomes before changing anything
jev_shadow_compaction  REPORT-ONLY keep/drop candidates for host-supplied context; never mutates, keeps pinned evidence on provider failure
jev_browser_step       one bounded action from a host observation (experimental; explicitly "no browser speedup claim is made")
Invariants: "Jev only ever narrows or gates" — a Jev response must NEVER be treated as authorization; adapters fail open to the host's normal path; demo provider is deterministic and offline for CI; additive-only schema evolution.
```
**License:** MIT, npm-published (`jev-layer`), CI on Node 20/22/24. **Maturity:** 4 stars, 15 commits, created 2026-09-19; small but disciplined (AGENT-IMPLEMENTATION guide, schema-versioning, compatibility baseline pinned).
**Verdict: HARVEST.** The MCP surface is the cleanest published expression of the PING posture: route/supervise/record as host-owned verbs, correlation_id receipts for replay, optional surfaces disabled by default, deterministic demo provider for offline CI. This is the reference shape for a PING-side Jev adapter contract.

## 4. jev-use (shitianfang/jev-use) — typed escalation contract
**What it does:** Claude Code / Codex / pi plugin: steps needing no text output go to Jev; measured p50 ~230 ms, ~$0.02 per 1,000 judgments. Library: `import {Jev, check, pick, rate}`.

**Contract/pattern:**
```
const {answers} = await jev.judge(state, {
  next:   pick("Next action?", {merge:"all green", rerun:"looks flaky", hold:"needs attention"}),
  risk:   rate("How risky?", ["routine","worth a look","incident"]),
  passed: check("Did the run fully succeed?")
})
// answers.next → {answer:"merge", confidence:0.93, confidenceFrom:"reported", escalate:false}
Anything Jev can't/shouldn't decide returns escalate:true with a TYPED reason.
Pipeline: screen → backend → hand back what is unsure; gate; Pre-call routing decides what NEVER reaches Jev (src/dispatch.ts); credentials stripped from gated actions before send (src/redact.ts).
Backends: TypeSafe, OpenRouter, Vercel AI Gateway, mock (JEV_BACKEND=mock for keyless dry runs).
Zero runtime dependencies on the judgment path.
```
**License:** MIT. **Maturity:** 31 stars, 18 commits, 1 release, created 2026-09-19.
**Verdict: ADAPT.** The typed escalation contract (`escalate:true` + reason) is exactly what a PING decision plane needs; PING's escalation taxonomy should be its own (approval tiers), not Jev's vocabulary. The `dispatch.ts` pre-routing (what never reaches the model) is a mandatory hygiene layer.

## 5. JevLoop (parkavenue9639/jevloop) — agent runtime with LLM escalation
**What it does:** Python agent runtime: Jev makes fast calibrated tool decisions; an LLM authors language only when needed and reviews low-confidence choices; deterministic code owns execution, safety, durability, state.

**Contract/pattern:**
```
observe → Jev decide ───────────────→ guard → execute → ledger → repeat
                  ├─ needs language → LLM author ───────┘
                  └─ low confidence → LLM review ───────┘
Sandboxes: one immutable image per experiment → two independent mutable containers (never two images, never shared mutable workspace); image ref content-addressed (jevloop-sandbox:<sha256[:16]>); DockerSandboxImage.build / .close, DockerSandboxContainer.start/list_files/read_file/write_file/run_bash/close.
Status guard: more than one driver ⇒ mode ∈ {simulator, shadow}; live mode ⇒ exactly one driver; single-active-run guard.
```
**License:** Apache-2.0. **Maturity:** pre-alpha, created ~2026-09-21; ambitious but young.
**Verdict: ADAPT.** The loop decomposition (fast-path decisions vs language-authoring vs review) is the right shape, but PING already has authority/ledger machinery; harvest the *ledger-per-step* discipline and the single-active-run / mode-guard invariants, not the runtime itself.

## 6. jev-skill-router (shimo4228/jev-skill-router) — shadow-first skill routing
**What it does:** Claude Code `UserPromptSubmit` hook: one Jev `choice` over the installed skill roster + noul gates; names at most one skill; **shadow mode default** (log-only), optional inject.

**Contract/pattern (two-stage, from cookbook + fixes):**
```
1. WIDE: one request ranks whole roster (name+full description; >240 skills → split) + 3 yes/no prompt questions (acts on user system? expert follows documented procedure? prose alone enough? — third flipped so high always points to skill). Gate = mean of 3; < 0.30 → stop, no skill needed.
2. NARROW: top-3 with full description + full SKILL.md body; Jev picks one + per-candidate fit question ("does this skill do the specific thing asked?"); best fit < 0.30 → nothing.
Decision log row: {mode, model, question_hash, n_skills, gate, shortlist, fits, suggestion, reason, usage{input_tokens, output_tokens, calls}, elapsed_ms} — prompt text NEVER logged, only prompt_sha + prompt_chars.
Failure discipline: every failure exits 0; missing key/timeout/API error = one log line, never a broken turn; inject mode under 3s wall-clock budget; measured 0.7–1.6s per live decision.
Author's honest finding: "unlikely to help a strong model" — the hook CANNOT change the skill listing (Claude still sees all descriptions; tokens don't drop); the vendor cookbook assumed a weak reader over a 60-char index, but Claude Code shows full descriptions. Measured: scripted intents 6/6 sensible; real session 6 prompts → 3 sensible, 3 wrong (follow-ups like "why did you add that guardrail?" scored 0.34–0.64 against the 0.30 gate).
```
**License:** MIT. **Maturity:** 7 stars, 9 commits, v0.2.0, 2026-09-21.
**Verdict: HARVEST the measurement discipline, ADAPT the router.** The shadow-mode decision-log row (hash, gate, fits, usage, latency, no prompt text) is the template for any PING decision audit record. The two-stage wide→narrow with flipped-sign gates is reusable. But: never claim a router saves tokens unless it controls what the model sees (the davila7/jev-skill-suggestion mod approach — withhold listing via skillOverrides + attach one SKILL.md — is the only token-saving shape, and is untested by this author).

## 7. daf-jev (docxology/daf-jev) — typed client primitives + batch evaluator
**What it does:** Dependency-light Python package: typed builders `noul()`, `choice()`, `score()`, `QuestionSet`; `JevClient`/`AsyncJevClient` with injectable retry policy and typed exception hierarchy; composable pure functions `composite_score`, `confidence_gate`, `route`, `pick`; concurrent batch `Evaluator` that runs a fixed question set over many states without ever aborting the batch.

**License:** not verified (research manuscript package). **Maturity:** research artifact with manuscript; positioning against registries/routers/harnesses explicit.
**Verdict: HARVEST.** The pure-function decision combinators over answers (`confidence_gate`, `route`, `pick`) are the exact utility layer PING's deterministic side needs; the "never abort the batch" evaluator is the right eval-loop semantics.

## 8. Jevonian (xinyao27/jevonian) — model routing proxy
**What it does:** Local OpenAI/Anthropic-compatible proxy (`127.0.0.1:8787`); `jevonian/auto` routes each turn to plan/execute/utility/chat tiers with thinking depth.

**Contract/pattern:**
```
Precedence, not guesswork:
  jevonian/auto          → deterministic pre-filter THEN one Jev call (model + thinking depth)
  jevonian/<route>      → that route; Jev skipped
  pinned model id       → pinned; never routed
  routing.mode:"off"    → pure pass-through
Deterministic pre-filter FIRST (wire protocol, context window, thinking-level floor, quota, cache-switch penalties) — arithmetic before any model judgment.
minConfidence: low-confidence routes are MARKED in the ledger, not silently accepted.
Failures: no brain configured → error, not a guess; all brains unreachable → heuristic phase classification.
Ledger per request: model, provider, reason, thinking level, tokens, cache reads, cost.
```
**License: AGPL-3.0** (14 stars, 55 commits, 17 releases). **Maturity:** most productized router found; macOS LaunchAgent, dashboard, OAuth subscription handling.
**Verdict: ADAPT patterns only — DO NOT reuse code (see licensing gotcha).** The deterministic-pre-filter-then-one-Jev-call shape, the explicit precedence table, and minConfidence ledger-marking are harvestable as design. AGPL-3.0 blocks code reuse in PING's commercial surface.

## 9. jev-shield (caiovicentino/jev-shield) — semantic MCP firewall
**What it does:** Sits between any MCP client and server (stdio); screens every tool call, tool result, and tool description. Three layers: structural (deterministic allowlists), semantic (Jev), session (taint tracking — a flagged result escalates subsequent calls).

**Measured:** 94% block recall, 0 false positives, ~$0.00002/check; demo 10 verifications $0.0003 at 558 ms median; catches poisoned tool descriptions, injection in search results, `.env` leaks.
**License:** not verified. **Maturity:** listed in curated showcases as [measured]; repo itself not deep-read.
**Verdict: HARVEST.** The taint-tracking session layer (flagged result escalates later calls) is the missing piece in stateless guards; and the structural→semantic→session layering is the MCP-firewall composition to copy.

## 10. jev-harness (ismaelsoilet/jev-harness) — offline-capable quality gates
**What it does:** Five semantic gates (test triage, doom-loop breaking, completion veto, effort governance, model routing) around frontier agents; deterministic engine works fully offline.

**Pattern:** the only tool in its comparison set that (1) runs fully offline with a deterministic engine, (2) ships THREE runtimes with semantic parity for gate verdicts (Python/TypeScript/Rust), (3) owns the test/commit/CI quality gate. Explicitly positions vs Foreman (worker supervision), JevRouter (routing), Winnow (context filtering), jev-guard (tool-call guardrails).
**License/maturity:** not verified; self-described "System 1.5" category framing.
**Verdict: ADAPT.** The offline-deterministic-engine-with-mock-probability-divergence-tracked is the right testability posture for PING gates (deterministic mode must be bit-exact in CI). The three-runtime semantic parity is a determinism-check pattern for the eval harness section.

## 11. DecisionBridge (grishahq/decisionbridge) — LLM as decision function
**What it does:** Adapter letting an existing LLM serve the Jev interface: define one question + allowed answers → scores per option → optional calibration on labeled examples → threshold for human review/abstention. Backends: OpenAI, Anthropic, OpenRouter, local MLX. "No model fine-tuning required."

**Pattern:** `decide(question, choices) → {label, scores, abstain?}`; per-call answers exactly ONE question; compose calls into workflows; calibration layer maps raw LLM outputs to thresholds.
**License:** MIT. **Maturity:** 1 star, 3 commits, created 2026-09-17. Brand new.
**Verdict: ADAPT.** This is the fallback-provider interface: when Jev is unavailable, the same question schema can be answered by a frontier LLM or local MLX model behind the same threshold contract. Harvest the interface, not the code (too young).

## 12. jev-sts2 (discretetom/jev-sts2) — game-loop typed action selection
**What it does:** Plays Slay the Spire 2 with Jev: live game state + legal-action list from a mod HTTP API → project into a small English decision-shaped payload → ask Jev typed questions → dispatch one legal action. Jev pinned `jev-1.13.0` via `@typesafe-ai/sdk` 0.6.0.

**Pattern (the requested OBSERVE→…→OBSERVE loop, minimal form):**
```
read state → project to small decision-shaped payload → typed questions (choice/score/noul)
→ take answer → dispatch ONE legal action → fresh observation → repeat
Version mismatch is REPORTED, never silently absorbed (doctor prints versions; checkCompatibility warns).
§5.4 (PLAN.md): rules for when a language model may be put on the decision path at all.
```
**License:** not verified. **Maturity:** small focused project; compatibility table meticulous (mod 0.12.5 vs upstream 0.13.0, state_version 16 vs documented 11).
**Verdict: HARVEST.** This is the cleanest worked example of the browser-action-selection pattern requested: bounded legal-action list + projected payload + one dispatch. The "version mismatch reported, never absorbed" rule generalizes to every PING tool/schema contract.

## 13. WebBrain Jev (webbrain-one/webbrain 36.8.0) — browser action sidecar
**What it does:** Jev classifies the next browser operation from a bounded structured page view: `click | fill | select | check | scroll | wait | complete`; LLM still prepares fill text; main model handles visual input, iframes, canvas, uploads, unsupported controls, verification.

**Pattern:**
```
page → compact inventory of observed controls → Jev classifies operation + target from inventory
     → target bound to observed document state, re-checked before execution
     → fallback to main model for anything outside the supported set
```
**Honest measurement (2026-09-20):** "Jev did not make our workloads faster" — on workflows with page transitions, screenshots, verification, and frequent main-model fallback, the observe→state-build→request→validate→fallback overhead dominated. Cites the counter-case: Browser Use Jev Ultrafast reported 25% lower median task time (9.450s→7.092s) and 1092→101 browser protocol calls on a small matched Google Flights comparison (six alternating runs, one task — "no claim that this is a broad agent benchmark").
**License/maturity:** WebBrain is a shipping browser product; blog post by Emre Sokullu 2026-09-20.
**Verdict: HARVEST the pattern, REJECT the speed claim as general.** The four diagnostic questions from the post are mandatory for any PING fast-path: (1) What is the exact decision boundary? (2) How often can the small model answer without fallback? (3) Does preparing/validating its input cost less than the work it replaces? (4) What happens when it is uncertain? The sidecar pays for its existence — measure per workload.

## 14. hermes-jev-skills (kerpopule/hermes-jev-skills) — model routing, memory, compaction, skill selection
**What it does:** Jev-powered model routing, memory, compaction, skill selection, computer/browser use for Hermes agents (also Claude Code/Codex); router dashboard; 884 stars.

**Patterns worth noting:** cached routing decisions must key on context size (bug found: cache key omitted context size → a 300k-token turn routed to a 32k-window model; fixed with coarse context bucket + pool fingerprint); guards must run on the UNCLIPPED copy (risk-word floor ran on clipped copy → destructive instruction in middle of long paste tripped neither; "what is clipped is what Jev reads, never what we check"); compaction batches must pack by encoded size, not turn count (non-Latin transcripts lost batches silently); exact-match cache for `jev plan` (1133ms→21ms), shadow by default.
**License:** MIT. **Maturity:** 884 stars, 112 commits, 8 releases; adversarially reviewed (CHANGELOG 0.17.0 documents externally-found bugs with reproductions).
**Verdict: ADAPT.** The failure-mode list is the harvest: every cache key must include the dimensions the decision depends on; safety checks run on raw input, never the model-fitted view; silent partial failure must report `partial`, not `ok`. These are general decision-plane correctness rules.

## 15. jev-scout (kierandotai/jev-scout) — search relevance/credibility scoring
**What it does (from curated listings):** MCP server scoring an agent's every search query, result, and fetched page for relevance and credibility, with session budgets, SSRF-guarded fetching, and a live decision dashboard.
**Verdict: ADAPT.** Relevance/credibility scoring with session budgets is the right shape for PING ingestion triage; not deep-read — treat as pointer.

## 16. Oko (bartlomein/oko) — code-chunk relevance judge
**What it does:** Jev judges whether each keyword-shortlisted code chunk implements what a coding agent asked for; code applies the threshold and returns accepted chunks as excerpts over MCP.
**Verdict: ADAPT.** Two-stage (cheap keyword shortlist → Jev judge → threshold in code) is the retrieval pattern; pairs naturally with the negative evidence below (Jev must not be the only filter on recall-critical paths).

## 17. Winnow (GhalebDweikat/winnow) — context sieve
**What it does:** Context sieve for Claude Code: Jev judges each tool result (Read/Bash/Grep output) for relevance BEFORE it enters the context window.
**Verdict: ADAPT with evals.** Same family as jev-pruner; the hermes-agent negative evidence (next section) says this class of filter needs a recall eval before any claim of token savings.

## 18. jevlike / open-jev ecosystem — open reimplementations
**What it does:** vinnylarouge/jevlike (MIT, 1k+ stars): single cross-attention head reproducing the System One I/O shape in ~41k params; daseinlabs/open-jev: Gemma-3 4B backbone scoring options with one cached forward pass (~90ms), serving the System One request contract locally; TheoLeeCJ/ekzhang variants use single-token logprobs.
**Verdict: ADAPT (as fallback path research).** If PING ever needs an offline/air-gapped decision function with the same schema, open-jev's "one cached forward pass, score options from logprobs" is the architecture to benchmark — but it is uncalibrated research, not a product.

---

# JEV ECOSYSTEM CODE/PATTERNS TO HARVEST (consolidated)

1. **Bounded recommendation contract (jev-layer):** `recommend(candidates, state) → {choice, probabilities, confidence, correlation_id}` + `record_execution(correlation_id, outcome)`; optional surfaces disabled by default; deterministic demo provider for offline CI; additive-only schema versioning. → PING adapter contract shape.
2. **Per-hazard calibrated thresholds (pi-jev):** different noul thresholds per hazard class (destruction 0.90 / exfiltration 0.70 / scope 0.85), all questions in ONE request, wording iterated against fixtures until thresholds sit in empty bands.
3. **Staged guard pipeline (jev-guard):** free heuristics → deterministic policy → one parallel Jev request → noisy-OR evidence fusion → fail-closed-on-suspicious degrade → session risk accumulation → human approval queue → async event emission. Decision vocabulary: allow/flag/redact/escalate/block.
4. **Typed escalation (jev-use):** every answer carries `{answer, confidence, confidenceFrom, escalate}`; unanswerable → `escalate:true` + typed reason; a pre-routing layer decides what never reaches the model; credentials stripped before send.
5. **Shadow-first measurement (jev-skill-router):** every decision logs `{mode, model, question_hash, gate, shortlist, fits, suggestion, reason, usage, elapsed_ms}` with prompt hashes not prompt text; join shadow logs against real transcripts before claiming value.
6. **Single-request batching + dedup (pi-jev):** N questions per request (latency is per-request, not per-question); identical inputs judged once per TTL; sibling calls share one in-flight request.
7. **Data minimization (pi-jev):** truncate args/outputs with explicit elision markers; file content excludable; notification text scrubbed of registered keys.
8. **Composability primitives (daf-jev):** pure functions `composite_score`, `confidence_gate`, `route`, `pick` over answers; batch Evaluator that never aborts; typed exception hierarchy.
9. **Observe→project→choose→dispatch loop (jev-sts2 + WebBrain):** project state into a small decision-shaped payload; choose from a bounded legal-action list; bind the choice to the observed state and re-check before execution; report version/schema drift, never absorb it.
10. **Decision records (agy-ppt + jev-skill-router):** every meaningful assisted decision persists `{decision_id, question, bounded answer schema, evidence/fixture refs, result, confidence, code action, escalated?, final disposition, repository capture}`.
11. **Correctness rules from adversarial review (hermes-jev-skills):** cache keys include every dimension the decision depends on (context size!); safety checks run on the UNCLIPPED input, never the model-fitted view; partial batch failure reports `partial`, never `ok`; unparseable model output is an error, never a zero.
12. **Eval-first posture (hermes-agent, WebBrain, jev-skill-router):** no token/speed claim without a matched-baseline measurement; the four WebBrain diagnostic questions gate every new fast-path.

---

# NEGATIVE EVIDENCE (weigh honestly)

## A. The archived routing project — what it tried, what it measured, why truncation won

Two archived projects are relevant; the measured "do not adopt" verdict comes from the Hermes agent compaction evals (the closest match to "Jev tool-selection/compaction did NOT generically reduce token usage (truncation did)"). A date of "archived 2026-09-26" could not be pinned to a specific repo from public sources (0xNatoshi/jev-codex-router was already archived at its 2026-09-20 catalog review); the findings below are verified from the repos themselves.

**Project 1 — NousResearch/hermes-agent `evals/compaction`, PR #116246 (teknium1, 2026-09-19), verdict: DO NOT ADOPT.**
- **What it tried:** port of tamaratran/fast-jev-compaction as an eval arm: Jev scores every tool call/result over the whole history; stale pairs dropped or truncated, everything kept verbatim, no summary. A `jev_cycles.py` variant compacted a lineage every time the estimate crossed a threshold, recording tokens before/after, % freed, text floor, fitting stage, requests, and Jev cost per cycle.
- **What it measured (3 transcripts, real Hermes lineages):** Jev arm: **75.5% recall @ 115K tokens** vs production path (summary + one session_search round-trip over the archived region): **78.9% @ 55K**. Earlier closed-book runs had flattered Jev (76% vs 43%) only because the summary was scored with its recovery pointer unused — the eval authors corrected their own methodology.
- **Why truncation/pruning lost (mechanisms, not vibes):**
  1. **The text floor is the binding limit.** User/assistant text is never removed, so freed-per-cycle decayed 63%→8% / 76%→20% / 89%→55% over 32–40 cycles; one 200K-window run got STUCK after 0.42M tokens of work.
  2. **Prune-first leaves ~2x context billed every turn and breaks the prompt cache every cycle** (each compaction is a cache break); the summary's one-time ~90% reduction keeps a long conversation cache-warm.
  3. **Jev's scores cluster tightly** (independent corroboration from pcparts001/pi-jev-compaction-lite: call ~0.54, result ~0.32; around a 0.5 threshold most results classify as `truncate` — head only — so decisions are near-category-uniform, not individually selective).
  4. **The 32K state ceiling** (25K in the plugin) means >~500 tool calls between compactions cannot fit; windowing workarounds (picaye/jev-compaction) add complexity without changing the verdict.
- **The constructive takeaway the authors DID adopt:** the recall gap pointed at summarizer retention of identifiers in assistant text — i.e., fix the summary, not the cadence. hermes-handoff 0.4.0 shipped "the whole dialogue + 1,200-word budget + recovery section naming the session and the two session_search calls," with the Jev pre-pass left OFF unless `HANDOFF_JEV=1`.

**Project 2 — 0xNatoshi/jev-codex-router (ARCHIVED, 274 stars, MIT).** Per-turn Codex model/reasoning-depth routing through a local server (`server/jev_server.py`) plugged into Codex Router's generic provider; policy mapped mechanical/standard/hard turns to luna/sol/astra tiers; confidence < 0.5 held to the middle tier; failures fell open to astra; kill-switch file skipped Jev; decisions logged to `jev-router-live.jsonl`. BACKTEST.md claimed ~60% lower cost replaying 237 real turns (upstream research, not independently verified). Archived without a public postmortem; the independent catalog review (appitstudio/awesome-jev, 2026-09-20) notes macOS-only prerequisites and no automated test suite. No measured finding that it "failed" — treat as abandoned, not falsified.

**Project 3 — islee23520/omo-jevlike-router (ARCHIVED, 0 stars, MIT).** Frozen Qwen2.5-0.5B + attention head scoring a skill catalog, shrinking `<available_skills>` to top-24. Honest post-fix metrics: top-1 27.3% (majority-class baseline ~29%, shuffled 19.7%) — i.e., below the majority-class baseline. Archived without note. Falsified as a skill router.

## B. Corroborating negative results

- **WebBrain 36.8.0 (2026-09-20):** Jev browser-action sidecar produced NO meaningful speedup on their workload; the observe→state-build→request→validate→fallback overhead dominated whenever the main model was needed anyway. Counter-case (Browser Use Jev Ultrafast: 25% median faster, 1092→101 protocol calls) was on six alternating runs of ONE task — narrow loop, indexed actions.
- **jev-skill-router (author's own conclusion):** "unlikely to help a strong model" as a router — a weaker judge advising a stronger one that already sees the same descriptions adds nothing; and a hook cannot change the skill listing, so tokens do not drop.
- **TypeSafe's own "jaggedness" docs (via open-jev research):** literal reading, no counting/arithmetic, multi-hop indirection, context rot from large irrelevant state, adversarial content can steer answers, complementary nouls need not sum to 1 (one example summed to 1.19). Confidence is a concentration statistic, NOT a probability of correctness (peskycipher/jevbmad doctrine).
- **TypeSafe ToS (reported, unverified):** reportedly bars users from publishing benchmarks of Jev — design the eval harness for internal use; verify ToS before any public numbers.

**The honest synthesis:** Jev wins where the question is narrow, the answer space is small, the boundary is clear, and the fallback is rare (classifiers, gates, tier picks). It loses where it is inserted into a loop that still needs the big model immediately after (browser agents, compaction of text-heavy sessions, skill routing for strong models). The economics question is always: does preparing and validating its input cost less than the work it replaces?

---

# WHAT AN EVALUATION HARNESS FOR PING SHOULD STEAL

## Metrics (steal the union)
- **Accuracy** per question type (noul/choice/score), plus agreement-with-gold on labeled fixtures (pi-jev's 53-fixture × 3-run method).
- **Calibration:** ECE / reliability diagrams; check complementary-noul sums; confidence-vs-correctness separation (pi-jev: correct at 0.88–1.00, the one arguable fixture at 0.42 → set minConfidence 0.6 in the gap).
- **Coverage:** abstention/escalation rate; % of traffic the fast path handles without fallback (WebBrain Q2); question_hash-indexed so wording changes are detectable.
- **Latency:** p50/p95 per request AND per decision (jev-use: p50 ~230ms; jev-skill-router: 0.7–1.6s live); decisions-per-second for loop-bound uses.
- **Cost:** $ per 1,000 judgments (jev-use: ~$0.02), per-arm compaction cost (hermes eval: Jev arm ~1/9 the summary's compaction cost but 2.1× retained tokens — cost must be reported next to the retained-token bill, never alone).
- **Recall@k / task recall** with 2/1/0 graded judging (hermes eval) and a recall ceiling arm (uncompacted full transcript).
- **Gate quality:** block recall, false-positive rate, per-hazard confusion (jev-shield: 94% recall, 0 FP — demand both numbers).
- **Determinism:** same state+questions → same decision across N runs (score drift ±0.05 observed in pi-jev — thresholds must sit outside drift bands); cross-runtime semantic parity (jev-harness's Python/TS/Rust parity).

## Corpora shapes (steal the schemas)
- **Decision records (agy-ppt):** `{decision_id, task/question, bounded answer schema, evidence/fixture refs, Jev result + confidence, code action, escalated?, final engineering disposition, repository capture}` — no keys, no live transcripts.
- **Shadow decision logs (jev-skill-router):** `{mode, model, router_version, question_hash, gate, shortlist, fits, suggestion, reason, usage, elapsed_ms, prompt_sha, prompt_chars}` — joinable against real transcripts.
- **Compaction eval banks (hermes-agent):** lineages + question banks with cache keys including `--cap-tokens`; arms: `current+recovery` (production path WITH its recovery pointer used), bare `current` (explicit floor), `jev`, `uncompacted` (ceiling); per-arm cost accounting; a `verdict` section that can say "do not adopt."
- **Receipt logs (jev-layer):** `{correlation_id, recommendation, probabilities, host decision, execution outcome}` — replayable offline against the deterministic demo provider.

## Determinism checks (steal the mechanisms)
- **Thresholds sit in empty bands:** pi-jev's calibration tables show in-scope vs out-of-scope score bands; the threshold goes mid-gap, outside observed run-to-run drift (±0.05).
- **Fixture-first development:** every question wording is iterated against fixtures (pi-jev's destructive-question rewrite: 0.77 → 0.03/0.99 separation).
- **Never-abort batch evaluator** (daf-jev): one bad state must not kill the eval run.
- **Offline deterministic mode** (jev-layer demo provider, jevguard simulator): CI runs with zero network; provider-backed tests are secret-managed and excluded from ordinary PR CI.
- **Schema-drift reporting** (jev-sts2): version/protocol mismatches are warnings, never silently absorbed.

## Non-negotiable harness rules (from the negative evidence)
1. Every claim of token/speed savings ships with a matched-baseline control arm and per-arm cost; the production path must be run WITH its recovery mechanisms engaged (the hermes closed-book error).
2. Score the summary/sieve with its recovery pointer used; report retained tokens/turn alongside recall, not just one side.
3. Prompt-cache economics are part of the measurement (hermes: compaction cadence breaks cache; pi-fast-jev-compaction's simulator prices cache invalidation explicitly).
4. Calibrate thresholds on fixtures BEFORE enforcing; ship new gates in shadow mode; the eval log must be joinable to real transcripts.
5. Confidence is concentration, not correctness — never report it as a probability of being right.

---

## Source index (verified links)
- pi-jev: https://github.com/y0usaf/pi-jev (MIT)
- jev-guard: https://github.com/Shubs5758/jev-guard (MIT)
- jev-layer: https://github.com/typakon4/jev-layer (MIT, npm: jev-layer)
- jev-use: https://github.com/shitianfang/jev-use (MIT)
- JevLoop: https://github.com/parkavenue9639/jevloop (Apache-2.0)
- jev-skill-router: https://github.com/shimo4228/jev-skill-router (MIT)
- daf-jev: https://github.com/docxology/daf-jev (license unverified)
- Jevonian: https://github.com/xinyao27/jevonian (AGPL-3.0)
- jev-shield: https://github.com/caiovicentino/jev-shield (license unverified)
- jev-harness: https://github.com/ismaelsoilet/jev-harness (license unverified)
- DecisionBridge: https://github.com/grishahq/decisionbridge (MIT)
- jev-sts2: https://github.com/discretetom/jev-sts2 (license unverified)
- WebBrain 36.8.0 Jev/SafeSocial: https://github.com/webbrain-one/webbrain/blob/HEAD/web/blog/posts/webbrain-36-8-jev-safesocial.md
- hermes-jev-skills: https://github.com/kerpopule/hermes-jev-skills (MIT)
- hermes-agent compaction eval: https://github.com/NousResearch/hermes-agent/pull/116246
- jev-codex-router (archived): https://github.com/0xNatoshi/jev-codex-router (MIT)
- omo-jevlike-router (archived): https://github.com/islee23520/omo-jevlike-router (MIT, via daseinlabs/open-jev docs)
- open-jev research: https://github.com/daseinlabs/open-jev/blob/HEAD/docs/jev-research-2026-09-20.md
- awesome-jev-usecases showcase: https://github.com/aliaihub/awesome-jev-usecases/blob/HEAD/reference/showcase.md
- jev-codex-router catalog review: https://github.com/appitstudio/awesome-jev/blob/HEAD/community/projects/tools/jev-codex-router.md
