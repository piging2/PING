# ANALYSIS.md - BM25S defect-proof fixture (vein 7 follow-up)

Checkout keyed to: `fyd/sprint-integration-2026-09-24` @ `c93a7ced`
(2026-09-26 verified state; Pig unreachable 2026-09-27, re-verify before trusting).

## The re-audit (CRITICAL checkout lesson applied)

The 2026-09-26 vein-7 researcher read the STALE checkout
`/home/nolan/fyd-wave2-clean` @ `e48ef710` (DETACHED, missing the 2026-09-24
ask fix 3dfa164d and 2026-09-25 ask work 00fc3813). The falsifier re-audited
the ask path against the CURRENT integration branch with fresh greps and
CONFIRMED all machinery cited below. **The "8-cap" EXISTS on the current
branch.** There is no stale-claim correction to record: the cap is real.

Verified on the current branch (falsifier, 2026-09-26):
- `PREDICATE_PRIORITY = {located_at: 0, provides: 1, works_for: 2, links_to: 3}`
  in `src/fyd/object/related.ts`; final sort
  `predicateRank(a.predicate) - predicateRank(b.predicate) || objectId` tiebreak;
  deterministic BFS both directions over active edges, public-only.
- `ASK_LIMITS.maxRelated = 8` (`src/lib/ping/ask-composer.ts:33`), applied as
  `relatedObjects.slice(0, 8)` at `ask-composer.ts:196`.
- The truncation happens downstream in `buildAskContext` (selectRelatedCircles
  is called without a limit at `visitor-answer.ts:364`) - same net effect.
- Zero qdrant / BM25 / rerank / LLM hits in the ask path (confirmed).
- No question-relevance signal anywhere in the ordering.

## The fixture and what it proves

`fixture.json`: one target LocalBusiness + 10 one-hop neighbors
(2 located_at, 5 provides, 1 works_for, 2 links_to), modeled on a realistic
trade-business graph. Question: "do you offer financing for emergency sewer
repair?"

`bm25_sim.py` part 1 runs the verified current ordering:
predicate-priority sort puts both `links_to` pages last; `slice(0, 8)` drops
`pag-001` (rank 8) and `pag-002` (rank 9). `pag-002` ("Financing Options",
the only object answering the question) never reaches the composer. The ask
path must then refuse via `noEvidenceAnswer` or answer from less-relevant
objects, even though the evidence exists in the authorized graph.
**Defect class demonstrated deterministically on the fixture.**

`bm25_sim.py` part 2 runs a standard BM25 scorer (k1=1.2, b=0.75, plain loops,
lowercase alnum tokenization) over neighbor name+description text:
`pag-002` scores 7.89, next-best `svc-004` 3.45. A `rankRelatedByQuery(question,
objects)` step applied BEFORE the truncation keeps the relevant object in the
surviving set. The BACKLOG mechanism resolves the fixture defect.

## Honest limits of this proof

- Q1 (concrete failure): FIXTURE-DEMONSTRATED, not observed on a live tenant.
  The drop is deterministic given the verified machinery; whether a real
  tenant graph has >8 one-hop neighbors with a question-relevant object past
  the cap is UNKNOWN. A real trade business with 9+ services plus a financing
  or reviews page would hit it, but no live tenant has been shown to.
- Q5 (proof it is better): UNKNOWN. No benchmark on real data. The fixture
  shows the mechanism resolves the demonstrated drop; it does not measure
  retrieval quality against the current ordering on a corpus.
- Q9 (failing test): PARTIAL. The fixture + simulation exist in research
  space. The repo-side jest test (graph fixture -> assert the named object
  survives in relatedObjects) is NOT written; it needs the real related.ts
  object shapes at writer time.

## 12-question gate verdict for BM25S (updated 2026-09-27)

1. Concrete current PING/FYD failure? **PARTIAL** - defect demonstrated on a
   fixture modeled exactly on verified machinery; live-tenant occurrence UNKNOWN.
2. Live product path? YES - ask-composer buildAskContext (visitor-answer.ts:364
   -> ask-composer.ts:196).
3. Existing PING mechanism that owns it? YES - selectRelatedCircles in
   `src/fyd/object/related.ts` + ASK_LIMITS caps in `src/lib/ping/ask-composer.ts`.
4. Exact external mechanism that is better? YES - BM25 scoring math (TS port,
   plain loops, no dependency).
5. Proof it is better? **UNKNOWN** - no benchmark run.
6. Can existing PING be adapted instead? n/a - no question-relevance signal
   exists to adapt.
7. Can the algorithm be extracted without the architecture? YES - BM25 is
   public-domain math (Robertson/Spärck Jones 1976); the bm25s donor is
   reference only; the Python package is never depended on.
8. What code gets deleted/simplified? None; additive scorer (~40 lines, carried
   estimate from the 2026-09-26 record; still no compared implementation, so
   the exact LOC stays UNKNOWN).
9. What test fails before and passes after? **PARTIAL** - fixture + simulation
   in research space; repo test not written.
10. What authority remains sovereign? buildAskFydContext / answerAskFyd;
    predicate priority stays as tiebreak. No new authority.
11. Pinned donor SHA? `xhluca/bm25s` @
    `e21ca718464054fbdaf5ce51160399e496f878f4` - **re-verified 2026-09-27 via
    the GitHub commits API: still the current main HEAD** (commit 2026-09-18,
    merge PR #198). Full 40-char pin stands.
12. Exact file license? MIT (GitHub SPDX, verified 2026-09-26; license
    correction from assumed Apache-2.0 confirmed by the falsifier). The
    shipped mechanism would be a clean-room math port, so the license burden
    is a donor citation in the candidates record, not a code transplant.

**Gate result: NO WRITER (Q1 partial, Q5 UNKNOWN, Q9 partial). BM25S stays
BACKLOG.** Next research step, not a patch: find a live tenant (or a
realistic tenant-shaped fixture with real object text) where a real question's
relevant object sits beyond the 8-cap under predicate-priority ordering, then
run a before/after retrieval-quality comparison.
