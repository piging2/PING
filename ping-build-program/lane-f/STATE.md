# LANE F: Object Search / Index

Status: PROVEN (wave 2: ladder re-proven on the real factory fixture graph; 2 fixes shipped + verified; all suites green)

## Standing constraints (do not drop)
- DUP lane R-14: the spike's normalize.ts is a DOCUMENTED ADAPTED copy of
  src/fyd/resolve/spike/normalize.ts. At wiring/port time it must CONSUME
  the canonical module, never ship as a twin. (Port blocked: Pig SSH down
  2026-09-23 ~20:15 MDT, broken pipe; repo unreachable from this sandbox.
  No repo writes attempted.)
- Commit policy: no commits to shared branches; worktrees/uncommitted diffs
  only; constitutional sprint WIP untouchable. Repo path recorded as
  /home/nolan/projects/ping (on the Pig; not present in this sandbox).

## Ledger
- RESEARCHED: 2026-09-23: OWNERSHIP.md charter; lane scope P1.
- RESEARCHED: 2026-09-23: PING repo read-only (Pig WSL, /home/nolan/projects/ping). Findings:
  - No database of any kind. No Postgres FTS, no pg_trgm, no pgvector, no Qdrant,
    no embedding pipeline, no SQLite usage in app code. Only data store besides
    files is @upstash/redis (cache/rate-limit role, not a search store).
  - Retrieval today = direct object read (target) + relationship traversal
    (relatedObjects) + gateway event query route as read path.
    Ask FYD: src/fyd/ask/context-builder.ts pure buildAskContext(viewer, target,
    relatedObjects, relationships, plan). No text search anywhere.
  - Reusable deterministic pieces found:
    - src/fyd/resolve/spike/normalize.ts: dependency-free URL/phone/name/address
      normalization + matchers.ts EXACT tiers (exact-url, exact-phone,
      exact-name-address). Proven on 328 candidates vs 318-row corpus, 255 ms.
    - src/lib/ping/feed-rank.ts: deterministic ordering convention
      (score desc, eventTime desc, id asc). No randomness, now pinned.
    - src/lib/ping/grants.ts: grantsForViewer viewer-gating semantics.
    - src/fyd/ask/__tests__/graph-read-route.test.ts: authorized read boundary,
      journal overlays compose above the read seam, never cross tenants.
  - git log: no prior search-index work in history (only unrelated "search" hits).
- RESEARCHED: 2026-09-23: lane-g STATE.md: G consumes a compiled packet; my
  retrieval contract feeds it (query shape, ranking signals, visibility,
  determinism).
- WRITTEN: 2026-09-23: OBJECT-SEARCH-DESIGN.md (deterministic layer spec, infra
  evaluation with ADOPT/ADAPT/REJECT per option, retrieval contract for lane G,
  benchmark plan + results).
- WRITTEN: 2026-09-23: HARVEST-REPORT.md (7 external systems evaluated:
  Tantivy, Meilisearch, Typesense, SQLite FTS5, Postgres FTS/trigram,
  pgvector/Qdrant, hybrid; licenses; decision per candidate).
- IMPLEMENTED: 2026-09-23: spike/ deterministic layer in plain erasable TS,
  run with node 24 directly (no new dependency): normalize, in-memory index,
  Tier 0 exact + Tier 1 graded-presence scoring, visibility filter, synthetic
  corpus (684 objects, 3 tenants), benchmark, red-team tests.
- TESTED: 2026-09-23: benchmark green: Tier 0 9/9 at rank 1; recall@1=1.0,
  recall@3/5/10=0.9 (one honest no-stemming miss, documented); negatives 2/2
  empty; latency p50 0.003 ms, p99 0.125 ms; determinism (same order, same
  digest on rebuild) holds.
- TESTED: 2026-09-23: red-team 5/5 pass (poisoning, stale index, tenant
  leakage, visibility matrix, cross-tier confusion).
- FIXED: 2026-09-23: RT1 caught the first implementation's BM25-style tf
  scoring letting a poisoned object outrank the real business via cross-field
  keyword stuffing. Shipped graded presence scoring (max field grade per
  token, no tf); verified by re-run. The benchmark re-ran green and
  recall@1 improved 0.8 → 1.0 as a side effect.
- NOTED: 2026-09-23: Nolan's standing decisions (connector credentials
  queued for morning; vendor veto). No impact on lane F: no connectors, no
  vendors adopted, zero new dependencies. The veto gate answers for the
  adopted design: removes commodity code (no FTS engine written), improves
  the URL-to-trusted-FYD loop (Ask FYD gets ranked retrieval), removable
  (pure projection, rebuilds from canonical state), PING remains the
  authority (index owns nothing), owns no data, disappears harmlessly
  (callers fall back to direct read + traversal), cost flat at any scale
  (in-process, O(n) memory).
- INTEGRATION: 2026-09-23: filed lane-g/INTEGRATION-REQUEST-f.md offering
  the SearchRequest/SearchResponse contract to lane G's context compiler.
  Lane G ACCEPTED (defense-in-depth: G filters at projection too).
- IMPLEMENTED: 2026-09-24 (wave 2): spike/realgraph.ts (read-only adapter:
  9 factory fixture files -> 116 SearchableObjects + 3 labeled test-only
  injections), spike/trigram.ts (in-process trigram rung, pure, zero-dep),
  spike/proof.ts (Q1-Q5 query suite with per-rung latency), spike/redteam2.ts
  (RT6 oracle a/b/c, RT7 injection).
- TESTED: 2026-09-24: proof suite on the factory fixture graph —
  Q1 exact-id 0.009 ms; Q2 realistic typos ranked #1 by Tier 1 (14/14, the
  cheaper rung suffices); Q2b trigram thr=0.25: 100% rescue recall, 0 FP;
  Q3 semantic answered by Tier 1 (tokens suffice, vector unjustified);
  Q3b paraphrase miss documented (vector would be the correct escalation,
  stays rejected: no embedding infra, kill criteria hold); Q4 relationship:
  12 services via provides (+12 more edges), 0.02 ms; Q5 forbidden viewer:
  zero invisible leaks, cross-tenant scoped.
- FIXED: 2026-09-24: proof Q4 caught relationship expansion not running on
  Tier-0 exact seeds ("services of X" failed on exact-name match). Tier 0
  seeds now feed the one-hop expansion; verified (24 relationship hits).
- FIXED: 2026-09-24: redteam2 RT6a caught a search-as-oracle leak — a hidden
  object's Tier-0 exact-name match suppressed Tier-1 visible hits (response
  differed from the no-hidden case). Fix: all-filtered Tier 0 falls through
  to Tier 1. Re-ran: RT6a/b/c + RT7 all pass. RT6c residual documented (idf
  score floats shift with corpus docCount; hit set/order/counts identical —
  not a practical oracle).
- TESTED: 2026-09-24: wave-1 suites re-ran green after both fixes
  (benchmark: Tier 0 9/9, recall@1=1.0, negatives 2/2, determinism holds;
  redteam w1 5/5; redteam2 all pass). No regressions.
- DECIDED: 2026-09-24: trigram rung ADOPTED as Tier 3 fallback-only
  (structural fire condition: Tier 0+1 zero candidates; thr=0.25; labeled
  tier "fuzzy" rule "trigram-candidate"). Layer version -> object-search-v2
  (digest changes, lane G's digests.searchIndex stays valid). Vector rung:
  never fires, stays rejected with measured justification.
- INTEGRATION: 2026-09-24: addendum appended to
  lane-g/INTEGRATION-REQUEST-f.md (fuzzy tier, v2 digest, Tier-0 seed
  expansion, RT6a fall-through — all additive, no G action needed).
- INTEGRATION: 2026-09-24: filed lane-o/INTEGRATION-REQUEST-f.md — search
  index as a derived consumer of lane O's invalidation plane; rebuild-only
  mutation; indexDigest as the staleness observable; interim contract
  (mutator rebuilds before next query batch) until O's propagation reaches
  the ask path.

## Current position
PING has no search infrastructure at all, and no database to hang one on.
The retrieval layer is now: Tier 0 exact identity (ADAPTED resolve-spike
normalization) -> Tier 1 in-process FTS token index (graded presence, no
tf) -> Tier 3 trigram fuzzy fallback (fires only on zero hits, labeled) ->
Tier 2 one-hop relationship expansion (explicit opt-in). Visibility gate
inside the scan loop, feed-rank total ordering, indexDigest per response.
Zero new dependencies, zero new services, zero new authorities. Lane G
has the contract; lane O has the invalidation request. Lane F owns the
spike until the coordinator approves a port to src/ (port must consume
the canonical normalize module per R-14; blocked on Pig SSH recovery).

## NEXT
1. Await lane O's response to INTEGRATION-REQUEST-f.md (invalidation
   signal for the search index as a derived node).
2. If coordinator approves: port spike/ to src/ as PING-owned code
   (file move + PingObject type alignment + consume canonical
   src/fyd/resolve/spike/normalize.ts instead of the ADAPTED copy; no new
   deps). Until then: lane dir only, nothing committed.
3. Optional (not started): plural-folding as a labeled signal (never
   silent conflation) if the recall@10 gap matters to G; source-trust
   ranking signal owned by lane M's source registry, not invented here.
