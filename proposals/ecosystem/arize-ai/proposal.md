# Harvest Proposal: Arize AI (Phoenix) — trace → evaluation → evidence

## What was read (official docs and source only)

Repo: https://github.com/Arize-ai/phoenix (primary source). Commit HEAD observed in all reads: `9212a42a512d08de7e2a8e81b15821f4483812ce`.

1. **LICENSE** — `https://github.com/Arize-ai/phoenix/blob/HEAD/LICENSE` @ 9212a42a (read in full; Elastic License 2.0, see License section below).
2. **db/models.py** — `https://github.com/Arize-ai/phoenix/tree/HEAD/src/phoenix/db/models.py` @ 9212a42a (1261 lines read; SQLAlchemy async ORM: type aliases for roles, auth methods, evaluator kinds, experiment status/log taxonomy, JSONB helpers, TraceRetentionCronExpression/TraceRetentionRule, OpenInference span-attribute path constants).
3. **Annotation shape (GraphQL)** — in-repo agent skill docs mirrored verbatim: `src/phoenix/server/agents/prompts/skills/phoenix-graphql/resources/annotations.md` and `references/annotations.md` (via ranafaraznaru/phoenix and stars1233/phoenix mirrors of the same HEAD tree); TypeScript client annotation patterns (graycodeai/hawk-community-skills, corroborating, not authoritative); annotation batch-write packet (cephalization/jev-oxlint mirror).
4. **Project/Span/Trace query surface** — `src/phoenix/server/agents/prompts/skills/phoenix-graphql/references/project-spans-traces.md` (via stars1233/phoenix mirror): OTel-hex trace lookup, span field list, no `traces` connection on Project, annotation rollup fields, filterCondition DSL.
5. **Eval machinery** — official package docs `https://arize-phoenix.readthedocs.io/projects/evals/api/evals.html` (phoenix-evals 3.9.0: `Score` class contract, failure semantics); `evals/pxi/README.md` (via stars1233/phoenix mirror: online evaluator function contract, EvaluatorSpec, checkpointing, test requirements); pytest-plugin PR `https://github.com/Arize-ai/phoenix/pull/13874` (test suite → dataset, test case → dataset example, assertion → reserved `pass` annotation; public `Experiments.log_run` / `log_evaluation`); REST annotation payload verified in PR `https://github.com/Arize-ai/phoenix/pull/13060` (POST /v1/span_annotations, POST /v1/trace_annotations); evaluation granularity model (span/trace/session grouping) via vivekbahl/arize-skills (community doc, consistent with docs); dataframe eval upload via `docs/phoenix/tracing/how-to-tracing/feedback-and-annotations/evaluating-phoenix-traces.mdx` (via stars1233/phoenix mirror); release notes `https://github.com/arize-ai/phoenix/blob/HEAD/docs/phoenix/release-notes.mdx` (code evaluators 05.21.2026, OTel GenAI semconv auto-conversion 05.15.2026).
6. **Span schema** — `src/phoenix/trace/schemas.py` dataclasses as reflected in `span_json_encoder.py` (via glama.ai mirror of Arize-ai/phoenix @ d0cbe7f): Span{name, context(SpanContext{trace_id, span_id}), span_kind, parent_id, start_time, end_time, status_code, status_message, attributes, events, conversation}.
7. **DB table inventory** — dlt Phoenix export doc `https://github.com/dlt-hub/dlt/blob/HEAD/docs/website/docs/examples/arize_phoenix_export.md` (projects, traces, spans, span_annotations, trace_annotations, datasets, dataset_examples, dataset_versions, experiments, experiment_runs; tables are created lazily on first use).
8. **License separation evidence** — `https://github.com/open-telemetry/community/issues/3467` (CNCF donation proposal: OpenInference Apache-2.0); `https://github.com/conda-forge/openinference-semantic-conventions-feedstock` (Package license: Apache-2.0); `https://github.com/conda-forge/arize-phoenix-evals-feedstock` (Package license: Elastic-2.0).

SOURCE_SHA: `sha256:460f2bcb9ef4bbf63dab71cc82bb3f48b72259207c96c2a7cc61be460814315b` over the concatenated excerpts of sources 1-8 above (saved during research at /tmp/arize-sources/01..05; content identical to what was read above).

## Object model (as observed in Phoenix source)

**Observation layer (OTel-derived, OpenInference semconv):**
- `Project` — workspace container grouping traces, datasets, experiments, evaluations.
- `Trace` — one complete run of the application. Identified by OTel 128-bit hex `trace_id`. No server-side trace object guarantee: Phoenix derives traces by grouping spans on `context.trace_id`; fragmented traces (multiple roots) are possible and acknowledged in the docs.
- `Span` — one timed operation (LLM call, retriever call, tool call, evaluator run). Fields: `name`, `context {trace_id, span_id}` (OTel 64-bit hex span id), `span_kind`, `parent_id`, `start_time`, `end_time`, `status_code`, `status_message`, `attributes` (OpenInference semantic attributes: `input.value`, `output.value`, `llm.*` messages/tokens, `retrieval.documents`, `metadata`, `user_id`, `session.id`), `events [{name, attributes, timestamp}]`, `conversation {conversation_id}`.
- Evaluation executions themselves are recorded as spans (each code-evaluator run appears as a span; each save creates a version).

**Judgment layer (the harvested mechanism):**
- `Annotation` (uniform shape across `SpanAnnotation`, `TraceAnnotation`, `ProjectSessionAnnotation`, `ExperimentRunAnnotation`): `{name, label, score, explanation, annotatorKind (HUMAN|LLM|CODE), metadata, identifier, createdAt, updatedAt}`. `ExperimentRunAnnotation` adds `error` and uses `startTime/endTime`.
- `Score` (phoenix-evals, the producer-side record): `{name, score, label, explanation, metadata, direction='maximize', kind}`. "Represents the result of an evaluation." Score is produced, then logged as an annotation bound to a span/trace.
- Binding: a `Score` becomes a `SpanAnnotation{spanId}` or `TraceAnnotation{trace}` via `log_span_annotations_dataframe` / `logSpanAnnotations` / REST POST `/v1/span_annotations` / `/v1/trace_annotations`. REST envelope: `{name, annotator_kind, result: {label, score}, metadata}`.
- `Dataset` → `DatasetExample` → `Experiment` → `ExperimentRun`: test fixtures versioned via `dataset_versions`; each run gets output plus per-evaluation annotations. A pytest suite maps directly onto this: suite→dataset, case→example, assertion→reserved `pass` annotation.

## ID scheme

- Spans/traces: OTel hex ids minted client-side by instrumentation (`trace_id` 128-bit, `span_id` 64-bit). Server never mints them; identity is client-asserted. Proven by the PXI phantom-trace bug fix (PR #14557): minting an id does not create a record; only DB write does.
- Annotations: relational row id (server-generated). Identity semantics are in the composite natural key, not the row id.
- Notes: `identifier` = fresh UUIDv4 per write (append-only by construction).
- Online evaluators: versioned identifier = evaluator id + `provider:model` suffix for LLM judges (checkpoint identity).

## State transitions

- **Annotations have no state machine.** They are CRUD records with upsert semantics, not transitions. The only lifecycle is: create/overwrite (structured) or append (notes).
- **Experiments have a state machine:** `RUNNING → COMPLETED | STOPPED | ERROR` (`ExperimentStatus`). Experiment logs are categorized `TASK|EVAL|EXPERIMENT` at `ERROR|WARN|INFO`.
- **Traces have no state machine** (insert-only, then deleted by retention policy cron).
- **Eval failures:** an evaluator exception is recorded explicitly, not silently: failure details go to an `execution_details` column and the `Score.score` is `None`. `ExperimentRunAnnotation.error` carries the error string. This is fail-open for the eval pipeline but fail-explicit for the record, the right primitive.

## Authority boundary

- Server trusts the key holder. API key / Bearer token (`PHOENIX_API_KEY`) plus role (`SYSTEM|ADMIN|MEMBER|VIEWER`), auth methods `LOCAL|OAUTH2|LDAP`.
- `annotatorKind` (HUMAN/LLM/CODE) is **client-asserted** in every write path. There is no cryptographic binding between the claimed judge and the annotation; the server trusts whoever holds the key. The PXI online-eval runner validates judge credentials at startup, but that is runner-local, not a property of the stored record.
- Trust boundary shape: instrumented app → OTLP/REST → Phoenix server → SQL. All judgment records inside are authority-by-key, not authority-by-signature.

## Persistence semantics

- SQLAlchemy async ORM over SQLite (local) or Postgres (self-hosted). JSONB for attributes/metadata.
- **Not an append-only journal.** Annotations upsert; there is no content digest, no idempotency key beyond the natural key, no hash chain. Deduplication is by identity (`(name, spanId, identifier)`), not by content.
- Upsert rule (the key mechanism): writing `(name, spanId, identifier)` that already exists **overwrites**; writing with a new identifier (notes: fresh UUIDv4) **appends**. This gives two accumulation modes from one table.
- Trace retention is deletion by cron (`TraceRetentionCronExpression`), not tombstoning. No revocation receipt exists.
- Tables are created lazily on first feature use.

## Evidence / receipts

- The evidence carrier is the `metadata` bag (example from production code path: `{evaluator: "<model>", input, output}`; human feedback: `{assistant_message_id, feedback, root_span_id, session_id, trace_id}`). It is free-form JSON, unvalidated, unsigned.
- What Phoenix does well: every judgment is **addressable by the thing it judges** (span_id/trace_id), queryable (see below), and attributed (annotatorKind + metadata). The trace→eval→evidence chain is traversable: `Trace.traceAnnotations`, `Span.spanAnnotations`, project-level rollups (`spanAnnotationSummary`, `documentEvaluationNames`), and a filter DSL (`annotations['relevance'].score > 0.8`).
- What Phoenix lacks (and PING must add): no canonical bytes, no digest, no signature, no tamper evidence, no typed evidence references (metadata is a bag, not refs to evidence objects). A hostile or buggy writer can silently overwrite a judgment and nothing in the record can prove it.

## Retries / failures

- Eval runner: per-item failure → `execution_details` + `score=None` (explicit failure record, pipeline continues). Experiment-level: `ExperimentStatus=ERROR`, run-level `error` field, categorized log rows.
- Online evals: sampling rate + versioned checkpoint identifier (`name` + `provider:model`) allow resume/skip semantics; tests must assert failure, not-applicable, sampling, and checkpoint behavior.
- No retry-with-backoff machinery in the eval path observed; retries are expressed as **new spans in the same trace** (attempts are siblings/children, each annotatable separately), which is exactly the shape proofs 10-14 want.

## Revocation model

- None for judgments. Structured annotations are overwritten in place (no history). Notes accumulate but cannot be retracted. Traces disappear via retention cron with no receipt. For PING semantics, this is a gap: verdicts that gate mission VERIFIED status need append-only history, not destructive overwrite.

## Tests (as observed in Phoenix source)

- `tests/unit/pxi/evals/online_evals/`: runner tests assert the **exact persisted annotation shape** plus failure, not-applicable, sampling, and checkpoint behavior.
- The pytest plugin (PR #13874): turns the test suite itself into the eval harness; per-case `pass` annotation is reserved; public `Experiments.log_run` / `log_evaluation` (sync + async).
- Code evaluators execute in sandboxes (WASM/Deno bundled; E2B/Daytona/Vercel/Modal for network), each execution recorded as a span, each save versioned.

## Verdict: ADAPT (clean-room re-derivation; FLAG ELv2)

**Do not ADOPT the code.** The whole Phoenix monorepo, including the `arize-phoenix-evals` package, is **Elastic License 2.0** (verified by reading the LICENSE file; corroborated by conda-forge feedstock "Package license: Elastic-2.0"). ELv2 Limitation 1 forbids providing the software to third parties as a hosted or managed service, which is exactly what FYD/PING is. Code copied or depended upon would contaminate the product. (Third-party community SKILL.md wrappers that label phoenix-evals "Apache-2.0" are wrong; they describe community docs, not the upstream package.)

**Do ADAPT the mechanism, re-derived clean-room:** the span-evaluation binding shape (judgment record bound to span by id, annotator kinds, upsert-by-natural-key vs append-only notes, granularity grouping by trace_id/session.id, explicit failure records with score=None, verdict-as-annotation-on-experiment-run). The separable **OpenInference semantic conventions are Apache-2.0** (CNCF donation proposal; conda-forge package license Apache-2.0) and safe to reference as a spec; OpenTelemetry itself is Apache-2.0. Zero Phoenix code or packages enter piging2.

## SMALLEST MISSING PRIMITIVE

**A judgment attestation bound to a span (span-evaluation binding).** PING already has: events, evidence objects, object identity, capabilities, missions, workers, verifiers. What it does not have is a primitive that records *a judge's verdict on a specific unit of work* as a bound, queryable, tamper-evident receipt.

Concretely: an object `{span_ref: (trace_id, span_id), name, result: {label, score, explanation}, annotator_kind, annotator_identity, evidence_refs: [...], digest}` where:
- `digest` = canonical-bytes hash over (span_ref, name, result, evidence_refs, annotator_identity) — what Phoenix lacks and PING's trust-kernel owns;
- `evidence_refs` = references to PING evidence objects (Phoenix's metadata bag is free-form; ours is typed refs);
- accumulation modes mirror Phoenix's proven two-mode design: upsert by (span_id, name, identifier) for judge verdicts, append-only for notes;
- failures recorded explicitly with score=None (Phoenix's execution_details semantics);
- attempts are spans in one trace, each independently annotatable — the exact shape proofs 11-13 need (bad attempt rejected, fallback attempt succeeds, VERIFIED only when an independent verifier's attestation exists).

This is the **trace → eval → evidence** chain made into a first-class PING primitive instead of a product feature. It maps to proof_ids 3, 10, 11, 12, 13, 14: it is the receipt that lets an independent verifier's judgment (proof 13) reject a bad worker result (proof 11), record fallback success (proof 12), and make the whole chain replayable (proof 14) over evidence-backed graphs (proof 3).

AUTHORITY_OWNER: **trust-kernel** — the primitive's missing value is verifiable judgment (digest-bound verdict + judge provenance), which is trust-kernel territory (canonical bytes, digest, verification). It cross-links object-kernel (typed evidence refs) and event-kernel (appended, replayable), but ownership of the receipt lives in trust.

## Dependency analysis

- **Zero dependencies proposed.** Clean-room re-derivation; no Phoenix packages, no ELv2 code, no copied source.
- The OpenInference semantic convention *attribute names* (Apache-2.0) may be referenced as a spec for span attribute naming; this is spec-reference, not a code dependency, and carries no proof_id requirement beyond the proofs themselves.
- Every line of the new primitive is new PING code. Nothing to vendor.

## License finding (for Nolan's decision)

- **Phoenix (server, phoenix-evals, phoenix-client, TS packages): Elastic License 2.0. FLAGGED.** Not OSI open source. Hosted-service prohibition is a hard conflict with a commercial FYD product. Recommendation: never vendor, never depend on, never copy code from the Phoenix repo. Mechanism-level re-derivation (ideas, shapes, field names as concepts) is the only safe use.
- **OpenInference (Arize-ai/openinference): Apache-2.0.** Safe to reference the semantic-convention spec and attribute vocabulary.
- No GPL/copyleft/SSPL/BSL found in the harvested surface.

## Queryability of the chain (how trace → eval → evidence is traversed, re-derived)

- By id: `trace(trace_id)` lookup; span → its annotations; trace → its annotations; session → its annotations.
- By discovery: project-level name/summary rollups (which eval names exist) before drilling in.
- By filter: span filter DSL referencing `annotations['<name>'].{label,score,explanation}`; eval granularity grouping by `trace_id` (trace-level) and `session.id` (session-level).
- Export: REST list-traces with cursor pagination; per-span annotation attachment; annotation dataframes indexed by span_id.
- For piging2: the attestation table is the join point. Query pattern: given a trace, list spans; given a span, list attestations; given an eval name, list all spans carrying it with score/label distributions. This is a projection over the event kernel (projection-kernel consumer), not a new store.
