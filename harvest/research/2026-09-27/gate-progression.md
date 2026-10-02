# GATE-PROGRESSION working paper - 2026-09-27

Researcher: gate-progression (harvest pass 2026-09-27).
Scope: RESEARCH ONLY. Fixtures and working papers in
`~/workspace/harvest/research/2026-09-27/` only. No PING repo writes, no
branches, no commits. The repo working tree was never touched.

## 0. Checkout verification (what was actually checked)

The Pig was UNREACHABLE from this sandbox on 2026-09-27 (~03:22-03:25 MDT):
two SSH attempts via `ssh -F /home/hatch/.ssh/pig-config pigwsl` both failed
with `nc: proxy read: Broken pipe / Connection closed by UNKNOWN port 65535`
(transient-looking transport failure, retried once, same result).

Per the task's fallback rule, ALL claims below are keyed to the
2026-09-26 VERIFIED checkout state, not to a fresh read:
- Repo: `/home/nolan/projects/ping` (FYD app repo)
- Branch: `fyd/sprint-integration-2026-09-24`
- HEAD: `c93a7ced` (2026-09-26 verified; may have advanced since)

Sources for the keyed claims (all falsifier-verified 2026-09-26):
- `src/fyd/proceduralize/structured-data.ts` (670 LOC): `discoverStructuredData`
  (line 74) extracts exclusively `<script type="application/ld+json">` blocks
  via regex; no microdata/RDFa/itemscope parsing anywhere in the file.
- `src/fyd/object/related.ts`: `PREDICATE_PRIORITY = {located_at: 0, provides: 1,
  works_for: 2, links_to: 3}`; sort `predicateRank(a.predicate) -
  predicateRank(b.predicate) || objectId` tiebreak.
- `src/lib/ping/ask-composer.ts`: `ASK_LIMITS.maxRelated = 8` (line 33),
  `relatedObjects.slice(0, 8)` (line 196); selectRelatedCircles called without
  a limit at `visitor-answer.ts:364`.
- Test runner: jest 29 + ts-jest, colocated `__tests__` dirs (FYD lane runs
  from /home/nolan/projects/ping; e.g. `src/fyd/ask/__tests__/contract.test.ts`;
  proceduralize suite 69 tests green 2026-09-21).
- amicomechanical.com: falsifier re-fetch 2026-09-26 - zero ld+json blocks;
  live schema.org/LocalBusiness microdata record with name "Amico Plumbing &
  Mechanical Inc.", streetAddress "595 N. Westgate Drive", addressLocality
  "Grand Junction", addressRegion "Colorado", postalCode "81505",
  telephone "970-241-6258".

Any writer acting on these fixtures must re-verify HEAD/branch first.

## 1. DELIVERABLE A - extruct failing-test fixture (Q9)

Location: `~/workspace/harvest/research/2026-09-27/extruct-fixture/`

Files:
- `amicomechanical-microdata.html` - fixture HTML: zero ld+json blocks (matches
  the live page), one schema.org/LocalBusiness microdata record modeled on the
  verified amicomechanical.com record (six asserted field values; two extra
  realistic properties, openingHours and url, not asserted).
- `structured-data-microdata.test.ts` - jest test in repo conventions
  (intended repo path: `src/fyd/proceduralize/__tests__/structured-data-microdata.test.ts`).
  Asserts the stage yields one LocalBusiness-typed record containing all six
  field values. The record finder is deliberately shape-tolerant (searches
  @type/type/itemtype markers) so the test does not guess the writer's
  normalization choice; the writer pins the selector at placement.
- `simulate-current-behavior.py` - soundness check, RUN green: mirrors the
  verified current behavior (ld+json-regex-only extraction) over the fixture
  -> 0 records, so `expect(businesses).toHaveLength(1)` FAILS with received 0
  ("fails before" proven). A minimal stdlib microdata prototype (~70 lines)
  yields the correctly shaped record and all six assertions pass ("passes
  after" satisfiable without the extruct architecture).
- `FAILURE-MODE.md` - exact failing assertion, why it fails (file/line cites),
  the five-point spec for the minimal TS microdata parser (walk itemscope,
  content/href/src precedence, nested scopes, schema.org TYPE FILTERING - the
  2026-09-26 corpus showed 73/311 RDFa noise statements on pages 05/09, so no
  blind dump - and feed through RAW OBSERVATION -> EVIDENCE -> SEMANTIC
  EXTRACTION), plus a writer handoff checklist.

### extruct: all 12 writer-gate questions, re-answered

1. Concrete current PING/FYD failure? YES - amicomechanical.com's typed
   LocalBusiness record (name/address/telephone) is unobtainable through the
   structured-data stage; zero structured facts yielded (the phone exists only
   as unstructured og:description prose).
2. Live product path? YES - acquire -> UNDERSTAND -> proceduralize
   structured-data stage.
3. Existing PING mechanism that owns it? YES -
   `src/fyd/proceduralize/structured-data.ts` (670 LOC), `discoverStructuredData`
   line 74.
4. Exact external mechanism that is better? YES - extruct multi-syntax typed
   extraction as a TS ADAPTATION (extruct is Python - wrong stack; the package
   is never depended on; algorithm/reference only).
5. Proof it is better? ANSWERED - falsifier-confirmed page-level proof
   (2026-09-26 re-fetch).
6. Can existing PING be adapted instead? YES - write PING's own TS
   microdata/RDFa parser; adaptation is the plan (preference order favors
   ADAPT over HARVEST).
7. Can the algorithm be extracted without the architecture? YES -
   itemscope/itemprop parsing is portable; prototype in research space.
8. What code gets deleted/simplified? None; additive. Net LOC UNKNOWN (no
   compared TS implementation exists; fiction is not evidence).
9. What test fails before and passes after? ANSWERED-BY-FIXTURE - test +
   fixture written in repo jest conventions; "fails before" proven by
   simulation of the verified current behavior; "passes after" shown
   satisfiable by the minimal parser. NOT yet placed in the repo; writer must
   place it, reconcile the shape selector against the real signature, and
   confirm red.
10. What authority remains sovereign? The structured-data stage; no new
    authority.
11. Pinned donor SHA? `scrapinghub/extruct` @
    `a31daaadb82ec684b7d468d3b15734b8ae3b7265` (pinned 2026-09-25; carried,
    not re-verified this pass per task instruction).
12. Exact file license? BSD-3-Clause (GitHub SPDX, per 2026-09-25/26 records).
    Attribution required; no copyleft. TS adaptation = attribution in NOTICE,
    no code transplanted.

**Gate verdict: 12/12 answered against the 2026-09-26 verified checkout.**
extruct is the closest-to-READY candidate. Recommended next step: a writer is
authorized for place-and-confirm-red-then-patch ONLY after re-verifying the
checkout HEAD (Pig was unreachable today), placing the fixture test, and
confirming it fails red against the real stage. No branch exists; nothing was
committed. Writer dispatch is the pass coordinator's call.

## 2. DELIVERABLE B - BM25S defect-proof fixture (vein 7 follow-up)

Location: `~/workspace/harvest/research/2026-09-27/bm25s-fixture/`

Files:
- `fixture.json` - one target LocalBusiness + 10 one-hop neighbors
  (2 located_at, 5 provides, 1 works_for, 2 links_to) modeled on a realistic
  trade-business graph; question: "do you offer financing for emergency sewer
  repair?"
- `bm25_sim.py` - simulation, RUN green. Part 1: the verified current ordering
  (predicate-priority sort + object-id tiebreak, then slice(0, 8)) drops
  pag-001 (rank 8) and pag-002 (rank 9); pag-002 ("Financing Options", the only
  object answering the question) never reaches the composer - the defect is
  demonstrated deterministically. Part 2: a standard BM25 scorer (k1=1.2,
  b=0.75, plain loops, lowercase alnum tokenization) ranks pag-002 first
  (7.89 vs 3.45 next-best), so a `rankRelatedByQuery(question, objects)` step
  applied BEFORE truncation keeps it. The BACKLOG mechanism resolves the
  fixture defect.
- `ANALYSIS.md` - full writeup: the re-audit, the proof, honest limits, and
  the 12-gate verdict.

### BM25S: verdict and gate

**The 8-cap EXISTS on the current branch** (falsifier fresh greps 2026-09-26
on fyd/sprint-integration-2026-09-24; the stale-checkout lesson produced no
correction - the cap is real, not a stale claim). Zero qdrant/BM25/rerank/LLM
in the ask path; ordering is question-agnostic.

Gate (key deltas vs 2026-09-26): Q1 PARTIAL (defect demonstrated on a fixture
modeled exactly on verified machinery; live-tenant occurrence UNKNOWN);
Q2/Q3/Q4/Q7/Q10/Q12 YES; Q5 UNKNOWN (no benchmark); Q6 n/a; Q8 none/additive;
Q9 PARTIAL (fixture + simulation in research space; repo test not written);
Q11 `xhluca/bm25s` @ `e21ca718464054fbdaf5ce51160399e496f878f4` - RE-VERIFIED
2026-09-27 via the GitHub commits API, still the current main HEAD (commit
2026-09-18, merge PR #198); Q12 MIT (GitHub SPDX, verified 2026-09-26; the
shipped mechanism would be a clean-room math port, donor cited in the record).

**Gate verdict: NO WRITER (Q1 partial, Q5 UNKNOWN, Q9 partial). BM25S stays
BACKLOG.** Next research step, not a patch: find a live tenant (or realistic
tenant-shaped fixture with real object text) where a real question's relevant
object sits beyond the 8-cap under predicate-priority ordering, then run a
before/after retrieval-quality comparison.

## 3. Files written (all under ~/workspace/harvest/research/2026-09-27/)

- `gate-progression.md` (this paper)
- `extruct-fixture/amicomechanical-microdata.html`
- `extruct-fixture/structured-data-microdata.test.ts`
- `extruct-fixture/simulate-current-behavior.py` (run: green)
- `extruct-fixture/FAILURE-MODE.md`
- `bm25s-fixture/fixture.json`
- `bm25s-fixture/bm25_sim.py` (run: green)
- `bm25s-fixture/ANALYSIS.md`

Both simulation scripts were executed and their outputs are as documented.
No em dashes in any written file (verified by grep).

## 4. Open items / gaps for the pass report

- The Pig was unreachable from this sandbox (SSH transport failure, retried).
  All checkout claims are keyed to the 2026-09-26 verified state
  (c93a7ced); HEAD may have advanced.
- extruct: Q9 answered-by-fixture; the writer placement checklist is in
  FAILURE-MODE.md. One writer per mutable semantic unit applies.
- BM25S: pin re-verified today (unchanged); license MIT confirmed by record.
- No new candidates.json rows proposed (no new unique repositories; both
  candidates already have rows).
- No security findings, no license blocks, no new-dependency proposals.
