# Intelligence escalation — routing policy (bounded patch, 2026-09-27)

Source of truth: `~/workspace/fyd-autonomy/intelligence-escalation-router.md`
(Nolan, standing policy). This file is the executable summary; the doctrine
wins on any conflict.

## Tier order (always in this order)

- **Tier 0 — deterministic software ($0).** tests, builds, grep/search, AST
  inspection, schema validation, hashing, canonicalization, exact matching,
  diffing, fixtures, rendering, projection, replay, security checks, URL
  validation, data extraction, dedupe, rate limits. If code can decide it,
  code decides it.
- **Tier 1 — headless / Copilot labor (already allocated).** repo
  archaeology, code search, test writing, implementation, refactors, fixture
  generation, documentation, mechanical migrations, browser verification,
  debugging, reproduction, dependency inspection. Premium models never do
  routine implementation.
- **Tier 2 — free / near-free model.** First candidate: the free endpoint
  (currently DeepSeek V4 Flash 0731 FREE, rate-limited). Fallbacks: the cheap
  flash-tier models in model-config.json. Use for: code review, failure
  classification, summaries, repo synthesis, candidate fixes, test
  generation, routine planning.
- **Tier 3 — premium cognition (bounded reserve).** Default: MiMo V2.6 Pro;
  hardest reasoning: full GLM-5.3. Use ONLY when cheaper/headless attempts
  failed or the task's leverage justifies stronger cognition. Targets:
  architecture synthesis, cross-repo reasoning, complex debugging,
  multi-file planning, hard code review, product/technical reconciliation,
  agent-plan criticism, large-context synthesis.

## Classification (never `if task == hard: model = mimo`)

Classify on: TASK TYPE, RISK, CONTEXT SIZE, REASONING NEED, TOOL NEED,
MULTIMODAL NEED, EXPECTED VALUE, PRIOR FAILURES. Then choose tier.

## Hard rules

1. Premium models THINK (diagnosis / plan / invariants / patch spec /
   test spec / risks). Cheap agents TYPE (implementation). Tests decide
   truth; the model never declares its own work correct.
2. Premium models receive: problem, invariants, relevant code, test
   evidence, candidate hypotheses, failed attempts. NEVER the whole repo.
   1M context is capacity, not permission to be sloppy. Cheap workers
   reduce evidence first (target: compact packs, MAX_INPUT enforced).
3. OpenRouter is NOT a dependency and NOT an authority. A model is not an
   authority. Product correctness is never built around one model.
4. The $25 balance is a BOUNDED reserve, not a budget. Do not spend it
   because it exists. Logical split (~60% MiMo Pro / ~25% GLM-5.3 /
   ~15% experimental) is guidance, never a spend target. If the loop
   closes after $3, good.
5. Kimi K3: available for benchmark/research only (expensive, no free
   variant, custom non-OSI weights license). Not default.
6. Jev stays separate: a decision/routing primitive, not a general coding
   model. Future shape: task -> Jev classification -> deterministic policy
   -> tier execution.
7. Model names are routing CONFIGURATION (model-config.json), never
   constants in policy or code.

## Evidence basis

Tier defaults were seeded from the doctrine and must be re-derived from
OUR benchmark evidence (`~/workspace/fyd-autonomy/benchmark/`): the
question is "which tier produces the most verified FYD progress per
dollar", never "which model is smartest". Routing policy follows the
benchmark table, not benchmark fandom.
