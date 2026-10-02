# ASK FYD -> EVIDENCE Test Boundary

Boundary tests for the Ask FYD answer path: every claim the product makes
must be evidence-bound, and unsupported questions must be refused. The
harness drives the REAL production path only:

```
fixture graph (+ synthetic variant)
  -> applyVariant (owner variants: REAL applyOwnerCommand + applyOwnerFieldCorrections)
  -> buildAskFydContext (FYD-010 projection, field visibility, FYD-Q1 conflicts)
  -> composeAskFyd (the composer the product serves)
```

Never a reimplementation. If the product changes, the harness follows it.

## Layout

| File | What it is |
|---|---|
| `gold-set.json` | 32 questions, 8 epistemic categories x 2 real websites (Coppersmith Plumbing, Happy Place Carpentry). Each record: question, required/allowed evidence, forbidden claims, expected epistemic status, variant. |
| `gold-set-gen.py` | Generator. Variants are explicit documented mutations (conflict, visibility, private, owner-correction, drop-schema), never website truth. |
| `baseline.ts` | Harness: `loadGoldDoc`, `applyVariant`, `runGoldQuestion`, `scoreRun`, `runDigest`, `getFixtureGraph`, `runQuestionOnGraph`. |
| `baseline.test.ts` | Green regression suite: gold-set shape, per-question metrics, no forbidden claims, every claim evidenced, FYD-Q1 conflict acknowledgment, first-acceptance services question, owner-correction acceptance. |
| `known-gaps.test.ts` | RED AS DESIGNED. 4 verified product gaps (AG-001..AG-004). Each gap has a "current behavior" characterization (green) and a "REQUIRED" test (red). A gap closes only when the product changes and the REQUIRED test turns green. |
| `unsupported-claim.test.ts` | drop-schema removal, instruction-override attacks, private-handle elicitation. All green. Records finding F-001 (INFERENCE-classified negative vs literal refusal). |
| `owner-correction-state.test.ts` | fast-check model-based test over all 7 real OwnerCommand types against the real store (temp FYD_OWNER_DIR per run). Store == model after every command; projection fidelity checked. |
| `graph-properties.test.ts` | fast-check `entityGraph` over fixture-shaped graphs (random visibility, cardinalities, links). Universal invariants: totality, evidence closure, privacy (no private object in evidence refs, no private title in answer text), determinism. |
| `replay-regen-metamorphic.test.ts` | Replay equality (every gold question replays to the same digest) and owner-correction regeneration (one recorded decision, re-projected twice, same corrected answer). |
| `jev-shadow/` | JEV shadow: `jev-shadow-cassette.json` (30 recorded choice picks), `jev-shadow.test.ts` (cassette replay, zero live calls), `shadow-inputs.json`. JEV judges, tests falsify. Budget: 42/60 live calls consumed 2026-09-30; no further live calls without approval. |
| `playwright/` | Served-UI boundary spec. SEQUENCED FOLLOW-UP: skips unless ASKFYD_PLAYWRIGHT_TARGET is set (Pig WSL chromium infeasible). Config parses; failure bundle hook writes trace/screenshot/console/DOM on failure. |
| `metrics/` | Per-run metric rows written by baseline.test.ts (sha256 runDigest per run). |

## Running

```bash
npx jest --config tests/ask-fyd/jest.config.cjs
```

Expected: all suites green EXCEPT `known-gaps.test.ts`, which fails
exactly 4 tests (AG-001..AG-004 REQUIRED). Any other red is a real
regression. Any REQUIRED test turning green means a product gap closed:
move it to the green suite and record the fixed SHA.

```bash
# Playwright (only with a served FYD + working browser)
ASKFYD_PLAYWRIGHT_TARGET=https://... npx playwright test --config tests/ask-fyd/playwright/playwright.config.ts
```

## Conventions

- Every test file header carries the falsifiability questionnaire
  (WHAT INVARIANT? WHO OWNS IT? HOW CAN IT FAIL? WHAT ATTACK DISPROVES
  IT? WHAT EVIDENCE PROVES IT? CAN IT BE REPLAYED? DOES THE FAILURE
  BECOME PERMANENT REGRESSION KNOWLEDGE? WHY CAN EXISTING RUNNER +
  LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS THIS?).
- Synthetic variants are documented mutations of fixture truth, never
  presented as website truth.
- JEV stays shadow: the deterministic baseline is authoritative until
  JEV measures better on fewer-unsupported-claims / better-evidence-
  judgments without unacceptable false blocks.
- Local commits only. Never push.
