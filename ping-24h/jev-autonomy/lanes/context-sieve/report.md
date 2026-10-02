# LANE 4 (CONTEXT SIEVE) — REPORT

**Date:** 2026-09-28. **Mode:** read-only harvest, no production wiring.
**Owner order:** BRUTAL CEO MODE, HARVEST + BENCHMARK + REFACTOR DISCOVERY.
**Scope:** two sieves — (1) WORKING-SET SIEVE for agent/worker context, (2) REPO CONTEXT SIEVE (program experiment #3).

## 0. CENTERING NEGATIVE EVIDENCE

The governing constraint, per the task brief and Lane 6's report
(`~/workspace/ping-24h/jev-autonomy/lanes/eval-corpus/report.md`):

- The archived 2026-09-26 Jev routing project found Jev **tool-selection/compaction
  did NOT generically cut token usage; plain truncation DID.**
- External datum (Zheng, Sep 2026): Jev **pre-routing** ("will Haiku get this
  wrong?") performed **close to random**, while Jev **cascading**
  (answer first, check after) reached 94% of Opus accuracy at 54% of the cost.
- External datum (fstandhartinger/auto-model-router, 78-task replay): a
  **heuristic beat both Jev and a local Laya classifier** on solve rate.

Consequences, all binding on this lane:

1. **Every sieve below must beat a static/truncation baseline on measured
   evidence.** Accuracy without cost framing is rejected.
2. **No global router.** Each sieve is a per-decision, per-surface proposal
   with pre-registered kill conditions.
3. The metric is **System-2 calls avoided without reducing success or safety**.
   Where a sieve cannot move that metric today, this report says so plainly
   instead of inflating (see DP1 honesty note).
4. Jev **selects only**; it never authorizes, executes, or becomes canonical
   truth. A sieve admits items to a working set; it never destroys evidence.

---

## 1. CONTEXT SIEVE

### 1.1 Common sieve architecture

```
RAW CONTEXT
  -> D0 protected-item filter (always retained, bypasses the sieve)
  -> D0 deterministic triage (truncation, dedupe, section addressing,
     membership tests — the truncation baseline lives HERE)
  -> D1 Jev relevance judgment (typed choice / noul via TYPESAFE_JEV)
  -> KEEP / DROP-FROM-WORKING-SET / POINTER / ESCALATE
```

Invariants (non-negotiable):

- **Canonical evidence is never destroyed.** The working set is a *view*.
  Every DROP/POINTER keeps the evidence ref id + content sha; the store is
  untouched. "Do NOT summarize canonical evidence away" is enforced by
  construction: the sieve outputs admission decisions, never summaries.
- **Protected items bypass the sieve entirely** (enumerated per drowning
  point below).
- **Jev judgment is typed and attested.** Purpose `classification` (relevance)
  or `tool-gating` (working-set admission) through the existing
  `jev_ask.py` contract — no new model path. Failed attestation, timeout,
  or provider error → ESCALATE the whole batch (fail open toward inclusion;
  the sieve never authorizes action, only context admission).
- **Never silently drop.** Every judgment is logged:
  `{item_id, judgment, confidence, reason_code, sieve_version, state_sha256,
  prompt_sha256}` into the existing `jev-decisions.jsonl` schema.

D-classification of the sieve itself: the *mechanism* is D0+D1; the *consumer*
of the working set may be D1 or D2. A sieve is only worth its cost when the
consumer is expensive (D2) or the working set is load-bearing noise for a D0
consumer (quality play — see DP1 note).

### 1.2 Drowning point 1 — Ask FYD site-wide related objects (biggest product-path working-set waste)

**What is stuffed into context today (evidence).**
`answerAskFyd` in `src/fyd/ask/visitor-answer.ts`:

```ts
const relatedObjects =
  requestedObjectId.length > 0
    ? oneHopRelatedObjects(publicGraph, target.id)
    : publicGraph.objects.filter((o) => o.id !== target.id);  // ALL public objects
```

Then `buildAskContext` (`src/lib/ping/ask-composer.ts`) applies the
deterministic bound:

```ts
export const ASK_LIMITS = {
  maxRelated: 8,
  maxRelationships: 20,
  maxFieldChars: 500,
  maxRelatedInAnswer: 5,
} as const;
const related = input.relatedObjects.slice(0, ASK_LIMITS.maxRelated)...
```

So a **site-wide question** (no `objectId` — the common case) hands the
composer **the first 8 public objects in graph insertion order**, each with
title (200 chars) + description (2000 chars) + every field truncated to 500
chars, plus up to 20 relationships and the full `SiteSpecSummary` (page
sections, queries, presentation copy). Worst-case working set: ~200 + 2000 +
500×F chars per object (F=10 fields → ~7.2K chars ≈ 1.8K tokens) × 9 objects
+ relationships + spec ≈ **15–18K tokens per site-wide ask, selected by
insertion order, not question relevance.**

**Estimated size / frequency:** up to ~15–18K tokens worst case, on *every*
site-wide Ask FYD question (product path — recurring, not one-shot).
The truncation exists (good), but the *selection* is arbitrary: the 8 objects
most likely to answer the question are not the first 8 in the graph.

**Sieve design.**
- **Protected (always retained):** the target object, the `SiteSpecSummary`
  + its digest (the answer binds the digest — dropping it breaks the
  contract), citation evidence refs (ids), grants / forbidden-effects list,
  the epistemic classification contract.
- **D0 first (keep and extend):** the existing `boundedObject` truncation
  stays. Add a deterministic question-term overlap rank over candidate
  objects *before* admission — the composer already does keyword matching
  downstream (`ask-composer.ts` ~line 364), so this moves an existing
  signal earlier, at zero model cost.
- **D1 Jev judgment** per candidate object beyond the D0 top-K:
  state = `{question, object_schema_label, title, provenance_kind}`,
  typed `choice`: `KEEP` / `POINTER` / `DROP`, or `noul` relevance score.
  Top-K by score enter the working set; the rest become POINTERs
  (evidence ref id retained, fields dropped from the working set).
- **D-classification:** relevance scoring = **D1**; truncation/ordering = **D0**;
  answer composition = **D0** (deterministic today).

**Honesty note (brutal mode):** today's Ask FYD composer is deterministic —
there are **no System-2 calls on this path to avoid**, so this sieve cannot
move the key metric today. Its provable win is *answer quality* (citation
precision/recall on human gold Q/A pairs) and *working-set hygiene* for the
future LLM-agent path that `context-builder.ts`'s agent boundary law already
anticipates. Ship the D0 re-ranking now (free); gate the D1 judgment on the
agent path existing.

### 1.3 Drowning point 2 — Archaeology / worker-lane standing directives (biggest worker-drowning point)

**What is stuffed into context today (evidence).** Lane prompts carry standing
directives as verbatim records:

| File | Chars | ~Tokens | Lines |
|---|---|---|---|
| `~/workspace/jev-archaeology/CRX-PERPETUAL-CONVERGENCE-DIRECTIVE.md` | 33,352 | ~8,338 | 1,752 |
| `~/workspace/jev-archaeology/JEV-CONTINUOUS-CONVERGENCE-DIRECTIVE.md` | 10,651 | ~2,662 | 523 |
| `~/workspace/jev-archaeology/DEEP-CONVERGENCE-ARCHAEOLOGY.md` (prior output, reused as input) | 31,507 | ~7,877 | 221 |

Per lane dispatch: **~11K tokens of standing law** (CRX + JEV-CONT), of which
a single-scope lane (e.g. "event authority only") needs perhaps 10–20%.
Frequency: 4 lanes in the 2026-09-22/23 wave; 6 more planned in the 2026-09-28
wave. This is the purest waste-per-token in the program: safety prose, not
task evidence.

**Sieve design.**
- **Protected (always retained):** the lane's scope statement, the read-only
  constraint, fail-closed rules, and the one-line constitutional core
  ("ONE AUTHORITY PER DECISION / MANY IMPLEMENTATIONS").
- **D0:** make directives section-addressable (split on `##` headers; each
  lane scope maps to a section whitelist — deterministic, auditable).
- **D1 Jev judgment** per section vs the lane scope: typed `choice`
  `KEEP`/`DROP`, low confidence → keep (standing law gets a fail-open-to-
  inclusion bias: dropping law risks violations, keeping it only costs tokens).
- **Measurement:** coordinator grades lane-output completeness
  (convergence-matrix coverage) with/without the sieve; tokens per lane
  from the ledger. Kill condition: any safety-relevant section dropped
  → sieve rejected for directives.

### 1.4 Drowning point 3 — Meta AI context-pack negative-names list

**What is stuffed into context today (evidence).** `build-context-pack.py`
inlines the entire covered-names list as prose. Measured for brief
`a-weak-website-hunt`: pack = 8,845 chars (~2,211 tokens); the
"Already in our pipeline, DO NOT return these" section = **6,336 chars
(~1,584 tokens), 162 names — 72% of the pack**, growing linearly with
pipeline history. Its only function is a membership test ("do not return
duplicates").

**Sieve design — almost entirely D0.**
- Replace the inline prose list with: (a) the count + a town/trade-indexed
  shard map, (b) a POINTER to the full list file, (c) the existing
  `covered_names.py::merged_covered_names` as the enforcement point
  (the self-audit invariant already holds: pack names == validator rejects).
- **D1 Jev role, narrow:** fuzzy near-duplicate adjudication on the
  *worker's proposed candidates only* ("is 'GJ Plumbing Pros' the same as
  covered 'Grand Junction Plumbing Pros'?"), typed `choice`, purpose
  `classification`. Never score the whole 162-name list.
- **D-classification:** the dedupe itself = **D0**; only genuinely ambiguous
  near-dups = **D1**.
- **Measurement:** pack tokens vs duplicate-return rate (must stay flat).

### 1.5 Drowning point 4 — Mission dispatch / subagent task context (already sieved — the pattern to copy)

**Evidence.** `~/workspace/ping-24h/repro/mc-dispatch.HEAD.ts` caps prompts at
`PROMPT_MAX = 2000` chars. Subagent dispatch in this program strips prior
transcript ("no other transcript inherited") and passes explicit references.
This is already a working-set sieve: **D0 exclusion of transcript + explicit
pointers instead of pasted history.**

**Sieve design:** none needed. This is the reference pattern the other three
drowning points should converge toward: bounded prompt + POINTERs to
versioned artifacts, never pasted prose.

---

## 2. REPO SIEVE — EXPERIMENT #3 DESIGN (concrete, measurable)

**Concrete shape:** "which 40 of these 8,000 files are relevant to *identity
authority*?" Jev ranks/classifies; System 2 reads the 40.

### 2.1 Corpus

Primary corpus: `~/workspace/fyd-product-lane` = **836 files** (508 `.ts`,
158 `.tsx`, 51 `.json`, 38 `.cjs`, 34 `.js`, remainder css/md/misc —
`node_modules` and `.git` excluded). The 8,000-file case is the union PING
tree across worktrees; the experiment runs on the primary corpus first and
states its corpus exactly (worktree mirrors are content-deduped — the 10
copies of `ask-pipeline.ts` found across worktrees collapse by content sha
before anything is scored).

### 2.2 Stage 1 — Deterministic exclusions (D0, zero model cost)

Exclude from the *reading set* (kept as POINTER/signal evidence only):

- Generated: `__pycache__/`, `*.pyc`, `dist/`, `*.backup`, `node_modules/`.
- Content-duplicates across worktrees (sha-collapse; record the collapse map).
- Tests: `__tests__/`, `*.test.ts`, `test_*` — excluded from reading, but a
  test file importing `identity_authority` is a *relevance signal* for the
  file it imports.
- Vendored third-party (`vendored mem0` et al.).
- Docs (`*.md`) — signal only, not reading material.

### 2.3 Stage 2 — Module graph (D0)

- Nodes = surviving source files; edges = static `import`/`from`/`require`
  (regex pass; no full parse for the experiment — **dynamic `require` is a
  recorded gap, not a solved problem**).
- For query Q ("identity authority"): seed nodes = path/name matches
  (`identity|authority` in path); expand 1–2 hops along import edges.
- Rank seeds+neighbors by in-degree (who depends on it) — this alone is the
  **truncation baseline** (§2.6).

### 2.4 Stage 3 — Jev semantic relevance sieve (D1)

- **Input per candidate file:** `{relative_path, first ~40 lines
  (header comment + imports), in/out degree, seed distance}`.
  Only the Stage-2 candidate pool (~150–300 files) is scored — never all 8,000.
- **Exact Jev judgment:** typed `choice` via `jev_ask.py --profile TYPESAFE_JEV
  --purpose classification --type choice`, criteria
  `{"keep": "file defines, implements, wires, or constrains identity authority",
    "pointer": "file references it but is not reading material",
    "drop": "unrelated"}`; output labels `KEEP` / `POINTER` / `DROP` +
  confidence. Failed attestation or timeout → ESCALATE (retain as POINTER).
- **Cost bound:** ~350 input tokens/call at the observed
  ~$1.5e-05/call (spend-ledger evidence) → ~150–300 files ≈ **$0.003–0.005
  per query**. Recorded per call in `spend-ledger.jsonl`; zero new plumbing.

### 2.5 Stage 4 — High-value subset → System 2

Top 40 by Jev score → System 2 (or human expert) reads the 40. POINTERs are
available on demand by ref; DROPs are logged with reason codes, never deleted.

### 2.6 Measurement and the truncation baseline (the bar to beat)

**Gold set** (human-expert picks, from the dated expert record
`DEEP-CONVERGENCE-ARCHAEOLOGY.md` § IDENTITY AUTHORITY — not invented for
this experiment): `identity_authority.js` (PATCH_004 shim),
`runtime/constitutional/src/` IdentityAuthority + HashAuthority,
`runtime/kernel/identity/canonical-identity-service.ts`,
`deterministic_id_authority.js`, `constitutional-authorities.yaml`,
`routes/identities.js`, gateway boot wiring, `unified_event_runtime.js`
`emit()` (identity-mint site), the unmerged identity-law divergence
(`ccfef91f3` vs `event_<16hex>`). ~8–10 files.

**Metrics:**
1. `recall@40` — fraction of gold files in the 40. Primary metric.
2. Expert rating of the 40 (a near-miss file that helps System 2 understand
   still has value; precision@40 alone would miss this).
3. Token economics: `(sieve_cost + s2_read_40)` vs `(d0_baseline_cost +
   s2_read_40)`, both from the spend ledger.

**Truncation baseline (pre-registered, run first):** deterministic top-40 =
path-keyword match ∪ 2-hop import neighborhood, ranked by in-degree.
No model. Near-zero cost.

### 2.7 Falsification plan (pre-registered kill conditions)

The hypothesis *"a Jev semantic sieve finds better reading sets than
truncation"* is **FALSIFIED** if any of:

1. `recall@40(jev) <= recall@40(d0-baseline)` on the gold set;
2. `(sieve_cost + s2_read_40) >= (d0_cost + s2_read_40)` with no expert-rated
   quality gain — the sieve must PROVE a token/latency win vs truncation;
3. **Safety violation:** a high-confidence DROP lands on a gold file
   (the sieve confidently discarding what the expert kept) — immediate reject;
4. Confidence is uncalibrated (high confidence on wrong DROP/KEEP at rates
   worse than the baseline's implicit ranking).

**Two consecutive queries where Jev loses to D0 → the sieve stays a research
tool and never ships.** Per the Zheng datum, the experiment ALSO tests the
**cascade shape** (D0 proposes the 40 → Jev verifies each pick
`RELEVANT`/`IRRELEVANT` → System 2 reads survivors) against the pre-sieve
shape (Jev ranks → System 2 reads top-40), because the external evidence says
pre-routing is ~random while answer-then-verify works. Both shapes share the
same gold set, baseline, and ledger.

---

## 3. EXISTING PING CODE TO REUSE (no new authority, no new store)

- `~/workspace/fyd-intel/jev_ask.py` — profile-only invocation; `ALLOWED_PURPOSES`
  already includes **`classification`** and **`tool-gating`** (the sieve's two
  judgments); `DETERMINISTIC_BLOCKED` keeps hashing/schema/dedupe/exact-match
  in D0 where they belong. Use as-is.
- `~/workspace/fyd-intel/jev_contract.py` + `model_contract.json` — pinned
  `jev-1.13.0`, response attestation, banned-router guard. Sieve decisions go
  through attestation; failure → ESCALATE.
- `~/workspace/fyd-intel/spend-ledger.jsonl` — per-call cost accounting exists
  (observed $1.3–1.6e-05/call). The sieve's token economics are measurable
  with zero new plumbing.
- `~/workspace/fyd-intel/jev-decisions.jsonl` — decision log schema
  (`question_id`, `decision_type`, `confidence`, `state_sha256`,
  `prompt_sha256`). Sieve judgments log here; DROP/POINTER audit trail included.
- `~/workspace/jev-stage/test_jev_shadow.js`, `typed_decision.js`,
  `shadow_worker.js` — the **shadow-only evaluation pattern**: run the sieve
  in shadow against the live path, promote only on a measured win. This is
  exactly how the repo-sieve experiment (§2) should run.
- `src/lib/ping/ask-composer.ts` `ASK_LIMITS` + `boundedObject` — the existing
  deterministic working-set bound (8 related / 20 relationships / 500-char
  fields). The Ask FYD sieve extends this; it does not replace it.
- `~/workspace/tandem/covered_names.py` + `build-context-pack.py` — the dedupe
  invariant (pack names == validator rejects) and versioned packs; the
  negative-names sieve reuses `merged_covered_names`, never re-lists.
- `~/workspace/jev-archaeology/DEEP-CONVERGENCE-ARCHAEOLOGY.md` — the
  gold-standard expert file picks for the repo-sieve benchmark (§2.6).

---

## 4. ABSTAIN / ESCALATE SEMANTICS (never silently drop)

Four outputs, typed: **KEEP** (in the working set) · **DROP** (from the
working set *only*) · **POINTER** (ref id + locator retained, content
dropped) · **ESCALATE** (unsure → treated as KEEP with an `UNCERTAIN` flag;
the downstream authority or human resolves).

1. **No silent drops, ever.** Every DROP/POINTER is logged with
   `{item_id, judgment, confidence, reason_code, sieve_version,
   state_sha256}`. The canonical evidence store is untouched — the working
   set is a view, not the record. Summarization of canonical evidence is
   prohibited by construction: the sieve emits admission decisions, never
   prose summaries.
2. **Confidence rule:** Jev `choice` confidence < 0.6 → ESCALATE (retain).
   High-confidence DROP on a protected-class item → contract violation,
   fail closed to ESCALATE.
3. **Protected classes bypass the sieve** (§1.2–1.4 enumerate them per
   surface: tenant context, epistemic contracts, fail-closed gates, digests
   the answer binds, standing safety law).
4. **Provider failure → ESCALATE the batch.** Attestation failure, timeout,
   or transport error retains everything as POINTER-or-better. Fail open
   toward inclusion, closed toward action: the sieve never authorizes.
5. **Stakes shape the order.** Where stakes are high (standing law, tenant
   context), prefer **D0-admit + Jev-verify** (cascade) over Jev pre-filter —
   the Zheng datum applied directly.

---

## 5. D-CLASSIFICATION SUMMARY

| Sieve | D0 (deterministic) | D1 (Jev bounded judgment) | D2 (System 2) |
|---|---|---|---|
| Ask FYD related objects | truncation (`boundedObject`, `ASK_LIMITS`), question-term pre-rank | per-object relevance `choice` → KEEP/POINTER/DROP | future agent path (not today) |
| Lane directives | section addressing, scope→section whitelist | per-section relevance `choice` (fail-open-to-include bias) | lane worker reads the kept slice |
| Context-pack negatives | membership test via `covered_names.py` (the real sieve) | fuzzy near-dup adjudication on worker-proposed candidates only | — |
| Mission dispatch | already bounded (`PROMPT_MAX`, no transcript inheritance) — pattern to copy | none needed | — |
| Repo sieve (§2) | exclusions, content-dedupe, import module graph, truncation baseline | semantic relevance `choice` per candidate file | reads the 40 |

---

## 6. OPEN QUESTIONS FOR THE PARENT / OWNER

1. DP1's D1 relevance judgment has no System-2 metric to move until the Ask
   FYD agent path exists — proceed with the D0 re-rank now and hold D1,
   or is answer-quality A/B sufficient justification to run D1 in shadow?
2. For the repo sieve, is the gold set allowed to grow beyond the
   archaeology record (expert re-picks per query), or stay frozen for
   comparability?
3. The cascade-vs-presieve comparison doubles experiment cost (~$0.01);
   approve both shapes or presieve-only first?
