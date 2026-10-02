# FYD intelligence-escalation benchmark

Doctrine: `~/workspace/fyd-autonomy/intelligence-escalation-router.md` (law).
This harness answers the doctrine's question: **which tier/model produces the
most verified FYD progress per dollar** — never "which model is smartest".

## Layout

- `problems/<p>/evidence.md` — byte-identical, model-agnostic evidence packs
  (problem statement, invariants, buggy code excerpts, pre-fix test evidence,
  analyst-drafted hypothesis space that does NOT contain the answer, and a
  fixed four-section task block). Pinned by `pack-manifest.json` (sha256).
- `answer-keys/<p>.key.json` — SEALED ground truth from real solved FYD
  failures (FAILURE_LEDGER.md, memory). Never shown to candidates; only the
  scorer reads them.
- `score.py` — deterministic scorer (regex/keyword checks, no LLM judge).
  100 points: correct diagnosis 40, minimality 15, test quality 15, security
  awareness 10, invented-facts penalty -20, architecture-churn penalty -15.
- `candidates.json` — routing CONFIGURATION (not constants): tiers, model
  slugs, live-catalog pricing, max input/output tokens.
- `run.py` — runner. `--candidate <id>` runs all problems for one candidate;
  scores deterministically; appends to `results.jsonl` and `cost-ledger.jsonl`;
  halts before the $5 hard cap would be exceeded.
- `run_openrouter_pig.py` — Phase-2 paid runner. RUNS ON THE PIG ONLY. Reads
  `OPENROUTER_API_KEY` from the Hermes `.env` itself; the key never leaves
  the Pig process (never printed/logged/copied/passed as an argument).
  Enforces the 11-field escalation contract per call.
- `calibration/` — reference good/bad responses used by `verify.py` to prove
  the rubric separates signal from noise.
- `verify.py` — harness self-check (Phase-1 gate): manifest pins, pack
  completeness, solution sealing, scorer calibration (good>=75, bad<=45,
  good>bad+30), runner dry-run. Zero paid calls.
- `cost-ledger.jsonl` — append-only per-call spend (schema:
  `../intelligence-router/cost-ledger.schema.json`).

## The three problems (all real, all solved, ground truth in FAILURE_LEDGER.md)

1. **p1-graph** — JSON-LD `@graph` extraction yields zero nodes/zero facts
   (misremembered `jsonld.flatten` signature + `extractGraph` not accepting
   the flattened array + missing default `@vocab`).
2. **p2-render-sink** — `javascript:` URLs rendered verbatim into `href`
   (FL-20260921-032; raw observed strings interpolated into href).
3. **p3-mobile-overflow** — 320px horizontal overflow (FL-20260921-033; Ask
   FYD Design-tokens row: `min-width:auto` flex label + `flex-1` input +
   44px-min Propose button; one-class `min-w-0` fix).

## Run it

```bash
# Phase 1: verify the harness (no model calls)
python3 verify.py

# Tier-1 headless baseline (Pig-side Hermes, free tier)
python3 run.py --candidate hermes-baseline

# Phase 2: paid runs (Pig side; $5 hard cap; contract per call)
# 1. scp run_openrouter_pig.py + candidates.json + problems/ to the Pig
# 2. ssh Pig: python3 run_openrouter_pig.py [candidate-id ...]
# 3. copy out/ back; score run files with score.py; append to results.jsonl
```

## Rules the harness enforces

- Identical evidence for every candidate (manifest-pinned sha256).
- Solutions stripped: `verify.py` fails if any sealed solution signature
  appears in a pack.
- Tests decide truth: the scorer is deterministic; the model never declares
  its own work correct.
- $25 is a bounded reserve: per-call MAX_COST, ledger running total, hard
  halt at $5 for the benchmark.
- OpenRouter is not a dependency: the harness works fully offline
  (`verify.py`, `score.py`, calibration); paid runs are one optional lane.
