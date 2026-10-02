# LANES C+G: GitHub Ingestion Pipeline + Knowledge / ContextPack / Search

**Lane report, read-only archaeology. Date: 2026-09-28.**
**Codebases inspected:** `C:\Users\nolan\research-pipeline` (Pig, via pigwsl-run.sh), `/home/nolan/ping` (Pig WSL), `/home/nolan/workspace/orca-adapter` (Pig), `~/workspace/git-ingestion/`, `~/workspace/tandem/`, `~/workspace/patch7_real_intake.py` (this VM).
**Note:** `/home/nolan/projects/ping` does not exist on this VM; the canonical PING repo on the Pig is `/home/nolan/ping`. Nothing was modified anywhere.

---

## PART C: GITHUB INGESTION PIPELINE

### Stages that EXIST (verified in code)

1. **GitHubTrendingScanner** (`research-pipeline/scanners/github_scanner.py`, 990 lines). Not an event ingester. It scrapes GitHub trending HTML per timeframe x language, runs ~35 GitHub Search API queries (PRIMARY_QUERIES + SECONDARY_QUERIES), then enriches each candidate via the GitHub REST API: topics, pinned commit SHA of the default branch, README fetched at the pinned SHA, source-structure evidence at the pinned SHA (manifests, test dirs, CI workflows). Rate-limited with exponential backoff. Each run re-queries from zero.
2. **Temporal diff** (`_load_previous_results` + `_compute_temporal_diff`, lines ~896-976). Compares `repository_id` + `observed_commit_sha` against prior local scan JSON files. Statuses: `NEW_REPOSITORY_NO_ID`, `NEW_REPOSITORY`, `SHA_MISSING`, `UNCHANGED`, `CHANGED`. `CHANGED` records `{"old_sha", "new_sha", "pushed_at_delta_hours", "evidence_level_delta"}`. That is the full extent of the delta. No diff content is fetched.
3. **ClassificationEngine** (`scanners/classification_engine.py`, 485 lines). Deterministic `batch_classify`: relevance scoring via `_calculate_relevance` (keyword matching), adoption tiers, architectural layers, constitutional concerns, evidence-aware gating. Zero per-event LLM calls.
4. **DailyBriefingGenerator** (`synthesis/engines.py`). Renders the classified items into a brief markdown file with provenance fields at top level (Patch 7 fix: evidence fields read from top level, not `metadata`).
5. **Orchestrator** (`orchestrator.py`) with `--scan-batch`, `--once`, `--continuous` modes. The continuous scheduler exists as code but **nothing runs it**: no cron, no Windows task, no daemon, no .ps1/.bat on the Pig for this pipeline. One-shot only in practice.
6. **`~/workspace/patch7_real_intake.py`** (this VM, 163 lines): a local copy of the Patch 7 intake driver (4 bounded candidate repos: scrapy/scrapy, browser-use/browser-use, in-toto/in-toto, gohugoio/hugo). Writes local `scan_results/` JSON + brief. Same machinery, second machine.
7. **`tandem/emit-observation.py` + `event-spool.py`**: the only live EXTERNAL path into PING's event spine (gateway `/events` on the Pig via SSH). Fail-closed gates, all verified: semantic-domain gate (only `^learn-` brief IDs; prospect/intel discovery briefs refused with exit 2), human-verification requirement (sidecar `accepted_by_ping` transition), duplicate-emission guard (sha256 of observation text, exit 2 unless `--force`), durable spool before POST (exit 3 on transport failure; transport availability is not work truth), probe-before-POST crash-boundary recovery, drill input identity (EXACT/ISOLATED/ABORT). Used only for outreach-engine step-7 distillations. **Nothing from GitHub flows through it.**
8. **PING-internal observation chain**: `workers/observation_worker.py` (DOCUMENT_IMPORTED -> chunked OBSERVATION_CREATED) -> `workers/claim_worker.py` (OBSERVATION_CREATED -> CLAIM_GENERATED with `'verified': False`). Claims are propositions, never truth.

### Stages that are ASSUMED / do not exist

- **No webhook receiver anywhere.** No HMAC endpoint, no X-GitHub-Delivery idempotency store, no event-type router. The J-01..J-09 D0 funnel exists only as design text in the JEV map.
- **No D1 (J-10..J-16) or D2 (J-18) code.** Jev relevance/impact/contradiction/security judgments are design only. After the 2026-09-27 routing proof invalidation (`jev-reason.ps1` asked for `typesafe/jev-router`, provider silently returned `openai/gpt-6-luna`), no D1 judgment may run outside shadow mode anyway.
- **No J-17 normalization.** Patch 7's scan output never becomes an OBSERVATION_CREATED event. The scanner writes local files; PING never sees them.
- **No Patch 8, scheduler, daemon, database, queue, or continuous crawler.** Matches the 2026-09-21 standing order's never-built list.
- **`~/workspace/git-ingestion/` is design only.** `findings/ECOSYSTEM-HARVEST.md` (438 lines: harvest verdicts, including webhook ingestion ADOPT as the incremental trigger) and `threats/GIT-INGESTION-THREATS.md` (608 lines: adversarial design, THREAT DESIGN ONLY header). No implementation.
- **System-2 cost per GitHub event is zero**, but only because there are no GitHub events. The pipeline is scan-to-brief, not event-driven.

### OBSERVATION vs canonical truth: how the distinction is enforced

Enforced by typed event chain + authority hierarchy, not by a single gate:
- Observations enter as `OBSERVATION_CREATED` (unverified chunks); claims derived from them are `CLAIM_GENERATED` with `'verified': False`.
- `authority_search.py` ranks by declared authority class: `CONSTITUTIONAL_LAW > ... > TEMPORARY_OBSERVATION` (rank 10, lowest). Qdrant-sourced candidates are stamped `TEMPORARY_OBSERVATION`, `status: retrieved_unverified`, `_source: qdrant_fallback`.
- `mechanical_verification` requires ALL checks (artifact hash, event hash, lineage intact, witness present, projection valid). Qdrant fallback candidates carry `lineage_depth: 0, witness_count: 0`, so `overall` is False by construction.
- SearchWorker constitutional constraint: "Never answers directly from vector search."
- The `emit-observation.py` gates above enforce that only human-verified step-7 distillations enter the spine from outside.
- **Enforcement gap:** the duplicate worker copies (see below) bypass the canonical path if executed. Enforcement is per-implementation, not per-authority.

### Duplicate-work instances found: 6 (plus 1 structural)

1. **WORST. Drifted duplicate workers in `/home/nolan/ping`.** Root-level `observation_worker.py` (162 lines) vs `workers/observation_worker.py` (96 lines): DIFFER. `claim_worker.py`: root vs `workers/`: DIFFER. `replay_worker.py`: root vs `workers/`: DIFFER. `constitutional_runtime.py` root (152 lines) vs `runtime/constitutional_runtime.py` (230 lines): DIFFER. Two divergent implementations producing the same event types. Running the wrong copy silently changes OBSERVATION_CREATED/CLAIM_GENERATED semantics.
2. **`scanners/github_scanner.py` vs `scanners/github_scanner.py.bak`** (966 lines, differ). A stale backup copy sitting inside the importable scanner package, drifting from the live file.
3. **Three "ContextPack" compilers, no single authority.** `runtime/cognitive/context_pack.py` (cognitive Q&A packs), `ping-runtime/context/context_compiler.js` (mission-execution packs), `tandem/build-context-pack.py` (Meta AI delegation packs). Same name, three scopes, three owners.
4. **Two retrieval paths feeding context packs.** `runtime/workers/retriever_worker.py` (Qdrant pseudo-vector search, stores into `context_packs` table) vs `runtime/tools/authority_search.py` (tiered Postgres/local/Qdrant). Overlapping responsibility.
5. **Patch 7 intake on two machines.** `~/workspace/patch7_real_intake.py` (this VM) duplicates the Pig's `research-pipeline` intake driver.
6. **Workers re-read GitHub from zero every run.** Each scan re-scrapes all trending pages, re-runs all ~35 search queries, re-enriches every repo via the API. Dedupe is only against local JSON scan files (`_load_previous_results`); there is no shared SHA index with PING, and PING never consumes the results. Every run is a from-zero re-ingestion of data that goes nowhere.
7. (Structural) `harvest_scanner.py` is a placeholder (`TODO: Actually fetch from GitHub API`), not a duplicate. Not counted.

### Incremental-ingestion verdict: ASPIRATIONAL

The claimed chain `OLD SHA -> NEW SHA -> changed files -> changed symbols -> changed dependencies -> affected knowledge -> affected missions` **does not exist**.

- What exists: `_compute_temporal_diff` compares old SHA vs new SHA and records only `pushed_at_delta_hours` and `evidence_level_delta`. The chain stops at the SHA pair.
- `grep` for `changed_files` / `changed_symbols` across the research pipeline: zero hits. The only "changed files" code in PING is `merge_gate.js` (CI validation of a PR's file list) and `scripts/constitutional_diff.py` (dev diff tool), neither is ingestion.
- `ECOSYSTEM-HARVEST.md` section 6 gives webhook push events (before/after OIDs) a VERDICT: ADOPT as "cheapest incremental path", with the explicit note that webhooks are lossy hints needing a reconciliation fetch loop. Design verdict, no implementation.
- Correction to the JEV map's shorthand: the temporal diff has five statuses (`NEW_REPOSITORY_NO_ID`, `NEW_REPOSITORY`, `SHA_MISSING`, `UNCHANGED`, `CHANGED`), not just NEW_REPOSITORY/UNCHANGED. The map's headline ("NO live GitHub event ingestion") is otherwise **verified and correct**.

---

## PART G: KNOWLEDGE COMPILER / CONTEXTPACK / SEARCH

### What ContextPack compiles today (three implementations)

**1. `runtime/cognitive/context_pack.py` — ContextPackBuilder (cognitive Q&A).**
Compiles: `question`, `highest_authority` + `authority_chain` + `supersession_chain` + `verification` (from authority findings), `supporting_documents` + `lineage` + `witness_roots` (from lineage findings; projections pass through `ProjectionSovereignty.verify_projection`), `graph_expansion` nodes/edges, `contradictions`, `repository_symbols` + `repository_relationships`. Bounds: every section optional; `confidence` = passed/6 checks; `validate()` returns violations (`missing question`, `missing authority resolution`, `no supporting evidence found` unless the source is `qdrant_fallback`, which is explicitly exempted). Cache: `context_pack_cache.py`, 24h TTL, keyed by `query_hash + authority_root`.

**2. `ping-runtime/context/context_compiler.js` — ContextCompiler (mission execution).**
Compiles from the mission's correlation group: `canonical_object_refs`, `artifact_refs`, `evidence_refs` (event IDs), `relationship_refs`, source metadata, retrieval manifest, deterministic `context_pack_id` from (missionId, query, correlationId, retrievalManifest). Different scope (bounded mission context, not Q&A), no sufficiency gate observed.

**3. `tandem/build-context-pack.py` — Meta AI delegation pack.**
Compiles: mission/positioning (parsed from `~/workspace/outreach/pitch.md`), geography (AGENTS.md targeting line), coverage negatives (`western-co-prospects.jsonl` brief-aware + `outreach/pipeline.md` staged rows). Versioned by content hash, cached in `tandem/.pack-cache`. Sufficiency is decided by the Meta AI consumer, not enforced.

### Retrieval strategies: what exists vs assumed

| Strategy | Status |
|---|---|
| Exact lookup | EXISTS: `RepositoryAuthority` Postgres queries; `authority_objects.json` local scan |
| Postgres queries | EXISTS: `AuthorityRouter.query("repository", "search_authorities")`, tier 1 in `authority_search.py` |
| Object relationships | EXISTS: `graph_expand` (depth 2), `lineage_search`, `intelligence_graph.js` |
| Git history | EXISTS but build-time only: `intelligence_graph.js` runs `git log` for churn analysis. Not a live retrieval path |
| GitHub search | EXISTS in Patch 7 scanner, but NOT wired to PING retrieval. No path from scanner output to any context pack |
| Text/lexical | EXISTS: `load_local_authorities` (substring match over `authority_objects.json`), tier 2 |
| Structured indexes | EXISTS: authority chain ordering, `authority_supersession.json` |
| Vector retrieval | DEGRADED and partly fake (see below) |
| External research | NOT wired: Meta AI tandem passes enter PING only via `emit-observation.py` step-7 distillations, never as retrieval |

### Qdrant-degradation verdict: STRUCTURE GRACEFUL, DETAIL FAIL-SILENT

- `authority_search.py` **is** a logical search capability that degrades: Tier 1 Postgres -> Tier 2 local JSON -> Tier 3 Qdrant. Each tier swallows exceptions and falls through, so Qdrant down just means Tier 3 returns None. The `qdrant_fallback` exemption in `ContextPackBuilder.validate` prevents false "no supporting evidence" violations.
- **But degradation is invisible downstream.** Every tier fails silent (`except Exception: return None`). `RetrieverWorker._qdrant_search` returns `[]` on any exception and stores a context pack with zero related events, indistinguishable from "nothing related found". There is no "reduced retrieval" indicator anywhere. The Q28 owner question (deliberately take Qdrant down, prove fail-closed, visible indicator) is unanswered; its recommended default is not implemented.
- **The vector retrieval is fake even when healthy.** `RetrieverWorker._text_to_vector` builds a 768-dim vector from a sha256-seeded PRNG (mulberry32). It is deterministic noise, not an embedding. Similarity search over it is meaningless.
- Last observed state: Qdrant DEGRADED/OFFLINE 2026-09-28 15:40 MDT (LEDGER.md: 401 on the real init path; `/healthz` green means nothing). Standing verdict: VECTOR SEARCH = UNAVAILABLE, ORCA falls back to non-vector paths, do not block FYD on Qdrant.

### Who decides retrieval SUFFICIENCY today

`CognitiveSupervisor` (`runtime/cognitive/supervisor.py`): `validate_or_raise(context_pack)` + `_enforce_authority`. Sufficiency = (a) no validation violations, (b) authority resolution present, (c) unless the source is `qdrant_fallback`, mechanical verification `overall` must be True. Confidence = mean of worker confidences. This applies only to the cognitive path. The JS mission compiler and the tandem pack have no sufficiency decider. So: sufficiency is decided per implementation, by the cognitive supervisor where it exists, and by nobody everywhere else.

---

## VERDICT LINES

**Pipeline stages that exist:** GitHubTrendingScanner (trending scrape + search API + pinned-SHA enrichment) / temporal diff by repository_id + observed_commit_sha (5 statuses, SHA-pair delta only) / ClassificationEngine (deterministic, zero LLM calls) / DailyBriefingGenerator (local files) / orchestrator (one-shot; continuous mode unrun) / emit-observation.py (only live external path into PING's event spine, fail-closed gates verified) / PING-internal observation->claim worker chain.

**Pipeline stages that are assumed:** webhook receiver + HMAC/dedupe (J-01/J-02) / D0 funnel J-03..J-09 / D1 judgments J-10..J-16 / J-17 GitHub-to-OBSERVATION_CREATED normalization / Patch 8 / scheduler / daemon / database / queue / continuous crawler. All design text, zero code.

**Duplicate-work instances found:** 6. Worst: drifted duplicate worker copies at PING repo root vs `workers/` (observation/claim/replay workers + constitutional_runtime differ across copies), so the same event types can be produced by divergent implementations.

**Incremental-ingestion verdict:** ASPIRATIONAL. Only the SHA-pair comparison exists (`old_sha`/`new_sha` + timestamp/evidence deltas). No changed-files, changed-symbols, changed-dependencies, affected-knowledge, or affected-missions stage exists anywhere. The webhook ADOPT verdict is design only.

**Qdrant-degradation verdict:** structure degrades gracefully (tiered Postgres -> local JSON -> Qdrant in `authority_search.py`), but every tier fails silent with no reduced-retrieval signal, and the "vector" retrieval is sha256-seeded noise even when healthy. Qdrant = DEGRADED/OFFLINE since 2026-09-28 15:40 MDT; vector search unavailable; the degraded path is unproven (Q28 open).

**JEV map GitHub section:** headline VERIFIED (no live GitHub event ingestion; Patch 7 is deterministic scan-to-brief with zero per-event LLM calls; formally deferred). One correction: temporal diff has five statuses including CHANGED with an old/new SHA delta, not just NEW_REPOSITORY/UNCHANGED; and the intake driver also exists as a local copy on this VM.

## Top 5 Jev-candidate judgments in this area

1. **J-07 temporal dedupe** (`repository_id`, `observed_commit_sha` -> UNCHANGED): ACTIVE / POSSIBLY_CURRENT. The one D0 piece that exists as code; deterministic; keep.
2. **J-17 OBSERVATION_CREATED normalization for GitHub**: STALE / SUPERSEDED as a claim. Never built; Patch 7 output never enters PING. Treat any plan citing it as aspirational until a wire exists.
3. **RetrieverWorker hash pseudo-vector retrieval**: IRRELEVANT (actively misleading). sha256-seeded random vectors make similarity search noise. Candidate for deletion, not for Jev judgment. Any D1 design that assumes "vector recall" from this path is built on a false premise.
4. **`authority_search.py` three-tier retrieval** (Postgres / local JSON / Qdrant): RELEVANT / ACTIVE. This is the actual logical search capability with graceful degradation. Jev's sufficiency boundary belongs here, not on the fake vector path.
5. **D1 judgments J-10..J-16** (relevance, impact, contradiction, security, triage): STALE / BLOCKED. Design only, and per the 2026-09-27 routing proof invalidation no D1 judgment may run outside shadow mode with measured cost and calibration. Nothing to activate; everything to prove first.
