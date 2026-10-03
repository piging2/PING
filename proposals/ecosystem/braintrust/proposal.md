# Harvest Proposal: Braintrust — evidence/evaluation objects

**Verdict: ADAPT** — take the mechanisms (trace-as-DAG-of-spans, canonical Score receipt,
experiment-as-immutable-evaluation-record) and reimplement in PING semantics. Do not copy
SDK code; no upstream code is reused. Zero dependencies.

## What was read (official sources only, no marketing)

1. `https://github.com/braintrustdata/autoevals` @ commit `38228ee43be9fd666080d03a2fddc7ffc925aeba`
   (README.md, SCORERS.md, LICENSE) — scorer contract, Score result object, custom scorers.
2. `https://www.braintrust.dev/docs/instrument/advanced-tracing` — span underlying format,
   ID scheme, background logging / retry semantics, durability guarantee.
3. `https://braintrust.dev/docs/annotate/datasets` — dataset structure and versioning.
4. `https://www.braintrust.dev/docs/evaluate/run-in-code` — `Eval()` contract, experiments,
   trial counts, summarize(), origin links to dataset rows.
5. `https://www.braintrust.dev/docs` (Python SDK API reference) — `Eval` signature,
   `EvalCase`, `EvalScorerArgs -> Score`.
6. `https://raw.githubusercontent.com/braintrustdata/braintrust-sdk-python/main/LICENSE`
   — Apache-2.0. autoevals LICENSE — MIT.
7. Corroboration only (third party): `braintrustdata/braintrust-cookbook` tracing example,
   `braintrustdata/eval-library` trace-structure convention.

SOURCE_SHA inputs are the 8 items above, concatenated in `braintrust-sources.txt`
(`sha256:bf1155ef758eb3f7a2e6a5a1c2ac29876c9fb886d8e5d54776e206586588aa8f`).

## Object model (re-derived, clean room)

### Trace
A trace is a directed acyclic graph (DAG) of spans. In practice almost all traces are trees;
multiple parents are permitted by the model. Each span carries:

- identity: `id` (unique within the container), `span_id`, `root_span_id`, `span_parents` (list)
- payload: `input` (optional), `output` (optional), `expected` (optional ground truth),
  `scores` (map of scorer-name -> number in [0,1], validated by SDK), `metadata`
  (string keys, JSON-serializable values), `metrics` (raw numbers not normalizable to
  [0,1]: tokens, latency, cost), `error` (exception info, auto-captured in traced blocks),
  `created` (ISO 8601 timestamp), `tags` (top-level spans only)
- rendering: `span_attributes` = `{name, type}` where `type` is one of
  `llm | score | function | eval | task | tool | review`
- container binding: `project_id` / `experiment_id` / `dataset_id` / `log_id` — assigned by
  the SDK/platform, never by user code; they address the trace to the right container
  (project logs, experiment, dataset).

Convention from docs: one root span (`type: "task"`) holds overall input/output and
whole-call metadata; one named child span per stage (retrieval, generation, tool call)
with its own input/output plus metrics; errors surfaced on the root so classifiers cluster
on failures.

### Dataset
A versioned collection of test cases. Every change is tracked; experiments can pin to a
specific version. A record has four top-level fields: `input` (required, recreates the
example), `expected` (optional ground truth, recommended), `metadata` (key-value,
filtering/grouping), `tags` (labels). Datasets can be built from production logs,
user feedback, traces, or generated (Loop). Eval cases can carry an `origin` field that
links an experiment's trace row back to its source dataset row.

### Eval / Experiment
`Eval(name, data, task, scores, ...)` where:
- `data` returns an iterator of `EvalCase` rows,
- `task` runs the evaluated unit on a single input (a `hooks` object attaches metadata),
- `scores` is a list of scorers: a `Scorer` object or a function taking `EvalScorerArgs`
  and returning a `Score`.
- `experimentName` optional (auto-generated), `trialCount` repeats per input (averaging +
  variance for non-deterministic tasks), `metadata` (JSON), `tags`, `public` flag,
  `reporter` (evaluator + result -> report), `timeout` (seconds).

Running produces an **experiment**: the stored record of one eval run — per-row outputs,
scores, metrics, traces, and summary metrics (improvements / regressions / diffs via
`summarize()`). Baselines are explicit: "set as baseline", most-recent-on-same-branch
auto-selection, per-row delta columns; aggregation is a simple mean of averages.

### Scorer
A scorer is a pure-ish function `(input, output, expected, ...params) -> Score`.
The public result surface is the **Score object**:

- `name`: the scorer name
- `score`: number in [0,1], or `None`/`null` when the evaluation is skipped
- `metadata`: scorer-specific details (rationale text, chosen option) — keys are NOT
  shared across scorer types; consumers must not assume a schema
- `error`: deprecated, retained for backward compat

Crucially, the Score object does NOT carry the inputs, expected values, model prompts,
or runtime context — those must be stored separately. Scorer families observed:
LLM-as-a-judge (Factuality, Battle, ClosedQA, Moderation, Security, Summarization, SQL,
Translation, Humor), RAG (ContextRelevancy/Recall/Precision/EntityRecall, Faithfulness,
AnswerRelevancy/Similarity/Correctness), heuristic (Levenshtein, ExactMatch, NumericDiff,
JSONDiff), embedding (cosine similarity). Model-per-scorer override is supported
(`Factuality(model="...")`), and custom scorers are plain functions returning `Score`.

## ID scheme
- `id`: opaque, unique within the container (experiment or project logs). The caller MAY
  set it explicitly; doing so **overwrites** the existing span — this is the documented
  idempotency/overwrite mechanism.
- `span_id` / `root_span_id` / `span_parents`: SDK-generated; reconstruct the DAG/tree.
- `experiment_id`, `project_id`, `dataset_id`, `log_id`: container scoping, SDK-assigned.
- Scorer identity: by `name` only (no version field in the Score object — a gap).
- Dataset identity: named dataset + immutable version (experiments pin versions).

## State transitions
- Span: created on span entry → mutated via `span.log(...)` (merge semantics on
  metadata) → ended on context exit; `updateSpan(span_id, ...)` allows post-hoc update
  (async outputs, cross-service) via an exported span slug.
- Eval: defined → run (per-case trials) → scored → experiment stored → summarized
  (improvements/regressions/diffs against baseline) → optionally promoted to dataset
  rows ("production traces become eval datasets").
- Dataset: mutable working copy → snapshot versions (immutable; experiments pin).
- Experiment: append-only record; new runs create new experiments, never mutate old ones.

## Authority boundary
The platform owns container binding (`project_id/experiment_id/dataset_id`), span tree
wiring, and validation (scores in [0,1], JSON metadata). The caller owns payload
content and scorer *code*. Redaction happens at ingestion (post-receive, pre-store) and/or
pre-upload (SDK masking) — sensitive fields never have to reach the store. No Braintrust
call is on the application's critical path: logging runs in a background thread and a
logging failure must not affect the application.

## Persistence semantics
- Durability guarantee begins when the ingestion API returns success; the SDK buffers in
  memory, sends in batches, retries a few times, then gives up with loud warnings
  (never throws into the app). Manual `flush()` + `atexit` hook control shutdown.
- Overwrite-by-`id` gives idempotent writes (retry-safe import/update).
- Experiments and dataset versions are immutable once stored; comparison and
  regression detection are derived from immutable records.

## Evidence / receipts
- Every evaluation row is a first-class receipt: input, output, expected, per-scorer
  scores, metrics, and the full trace DAG — queryable, diffable, permalink-able
  (`Span.permalink`, exportable slug for deep links and cross-service updates).
- `origin` links each experiment row back to its source dataset row — a provenance edge
  from evidence to ground truth.
- Score metadata carries the rationale (why the judge scored as it did).

## Retries / failures
- Ingest: background thread, bounded retries, give up + warn; failure never propagates
  to the application. Per-case task failures are recorded on the span (`error` field,
  surfaced on the root for clustering), not hidden.
- Eval-level: `timeout` per run; `trialCount` averages over flakiness; skips are first-class
  (`score: None`).

## Revocation model
Not present in the read material: no per-record deletion/retract primitive was documented
in the trace/score model. Redaction at ingestion is destructive masking, not revocation.
Access control (project membership, RBAC, SSO, audit logs, hybrid deployment) is product
surface, not a kernel primitive. PING must add its own revocation story; nothing to
harvest here.

## Tests
The evaluation model itself is test-shaped: scorers are validated on the [0,1] range,
skips are typed (`None`), and the `bt eval` CLI + CI integration give per-PR regression
gates. autoevals ships its own test suite (`pytest` from repo root). We are not adopting
code, so no upstream tests are ported; the contract (range validation, skip typing,
immutable experiment records, overwrite-by-id) is what travels.

## Verdict: ADAPT

Take three mechanisms, rewrite to PING semantics, zero copied code:

1. **Trace-as-DAG-of-spans with typed span fields.** PING missions already have journal
   events; the missing shape is a *structured execution trace* (named spans, per-stage
   input/output, metrics vs scores distinguished, error surfaced on root). This is what
   proofs 9-14 need as the substrate a verifier reads.
2. **The Score result object as a canonical evaluation receipt.** The exact gap for
   proof 11/13: today a worker's "success" is a claim in prose; Braintrust shows the
   receipt must be `{scorer-name, score in [0,1] | None, metadata}` kept SEPARATE from
   the inputs — and that the scorer's identity and version must be bound to it.
   Braintrust's Score lacks a version field and keeps no digest of inputs; our ADAPT
   adds both.
3. **Experiment as an immutable evaluation record with baseline comparison.** Maps to
   proof 3 (evidence-backed, deterministic graphs) and gives the failure-injection
   loop a place to live: run N, inject bad result, scorer receipts reject, rerun,
   compare — all from immutable records.

Do not adopt: the hosted platform, the SDK, autoevals' scorer implementations (prompt
templates are Braintrust IP-adjacent and model-specific), the gateway, prompt versioning,
Loop, Topics. None is needed for the kernels.

## SMALLEST MISSING PRIMITIVE

**`EvaluationReceipt`** — a canonical, hashable object PING does not have:

```
EvaluationReceipt {
  subject_digest:   sha256 of the evaluated artifact's canonical bytes
                    (worker result, rendered page, SiteSpec — links the receipt to proof 10)
  scorer_id:        name + VERSION of the scorer (Braintrust's Score has no version;
                    without it, a judge upgrade silently rewrites history)
  score:            number in [0,1] | null (skip is typed, never 0)
  input_digests:    sha256 of the exact inputs/expected the scorer consumed
                    (Braintrust keeps these out of the Score object; the receipt binds them)
  evidence_refs:    pointers to the trace spans / journal events backing the score
  rationale:        free-form scorer metadata (judge's why)
  created_at:       ISO 8601
  verifier_binding: the identity of the independent verifier that must consume this
                    receipt before a mission can become VERIFIED
}
receipt_id = sha256(canonical(subject_digest, scorer_id, score, input_digests))
```

Why this is the smallest: everything else Braintrust proves valuable (spans, datasets,
experiments, summarize) is already covered by PING's journal/objects/projections once
phrased in PING terms. What PING cannot do today is *prove* that a specific numeric
judgment, made by a specific scorer version, about a specific artifact digest, was
recorded before verification consumed it — the exact object proof 11 (reject the
injected bad result) and proof 13 (VERIFY only after independent verification) require.
The receipt's id scheme also gives PING Braintrust's overwrite-by-id semantics for free:
re-scoring the same artifact with the same scorer version is idempotent by construction.

## Dependency analysis
DEPENDENCIES: []. Zero-dependency. The harvest is a mechanism description plus one new
PING-native object shape; no upstream code, no libraries, no network calls. Every
candidate dependency fails the proof_id test and is rejected: autoevals (no proof needs
LLM-as-a-judge prompts), braintrust SDK (no proof needs their client), gateway (no proof
needs their proxy).

## License finding
- `braintrustdata/autoevals`: MIT (verified in repo LICENSE via README page).
- `braintrustdata/braintrust-sdk-python`: Apache-2.0 (verified raw LICENSE file,
  copyright 2023 Braintrust Data LLC).
- Braintrust core platform: closed-source. No proprietary code was copied or read;
  all mechanisms above are re-derived from public docs and the two open-source repos.
- Nothing copyleft. Nothing to flag for Nolan beyond noting the closed core was not
  touched.

## proof_id mapping
- **11** (injected bad result is rejected): the receipt separates scorer judgment from
  worker claim; a deterministic scorer (ExactMatch/JSONDiff-shaped) rejects the injected
  artifact, and the rejection is recorded as a receipt, not a log line.
- **13** (mission VERIFIED only after independent verification): `verifier_binding`
  makes the verifier a first-class consumer of receipts; the mission state machine may
  not transition to VERIFIED without a receipt consumed by the bound verifier.
- Secondary, not in manifest: 3 (receipts are evidence edges on the object graph),
  10 (the receipt's subject_digest is the worker's returned result, hash-addressed).

## Authority owner
`object-kernel` — the receipt is an object with identity (content hash), schema, and
evidence references; it lives on the object graph, is produced by the event-kernel
(mission/score events), and is consumed by the capability-kernel (verifier authorization).
Single owner: object-kernel.
