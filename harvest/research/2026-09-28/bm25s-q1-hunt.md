# BM25S Q1 Hunt: LIVE-TENANT SEARCH, 2026-09-28

**Verdict: Q1 STAYS OPEN.** No live tenant was found where a real question's
relevant object sits beyond the ask-retrieval 8-cap. The cap is harmless at
current live scale. The breakage threshold is documented below so the hunt has
a concrete trigger.

## Ground truth verified (HEAD 4a8c5f2e, branch fyd/sprint-integration-2026-09-24)

The 8-cap is real on the current branch, re-verified by fresh greps:

- `src/fyd/object/related.ts`: `PREDICATE_PRIORITY = {located_at: 0, provides: 1,
  works_for: 2, links_to: 3}`, unknown predicates rank 99. Final sort is
  `predicateRank(a.predicate) - predicateRank(b.predicate) || objectId`
  tiebreak. `selectRelatedCircles` does a deterministic BFS both directions
  over active edges, public-only, never circling back to the owner, with
  best-edge-wins dedup.
- `src/fyd/ask/visitor-answer.ts:650`: `selectRelatedCircles(publicGraph,
  targetId)` called with NO limit.
- `src/lib/ping/ask-composer.ts:37-38,190`: `ASK_LIMITS.maxRelated = 8`,
  applied as `relatedObjects.slice(0, ASK_LIMITS.maxRelated)`.
- Net effect: any object ranked 9th or beyond under predicate-priority
  ordering never reaches the composer. Zero question-relevance signal in the
  ordering. Note: the live fixtures use predicate `offers`, which is NOT in
  `PREDICATE_PRIORITY`, so all service objects rank 99 (unknown) and tiebreak
  purely by objectId.

## Search surface (what was checked)

1. **Serving tenant registry**: `src/fyd/data/fyd-tenant-graph.ts`,
   `FYD_TENANT_PINS`: exactly two live ask tenants, digest-pinned:
   `happy-place` and `coppersmith-plumbing`. `getFydTenantIds()` returns only
   these; `getSiteBundle` returns null for anything else.
2. **Live probe on :3100**: `POST /api/fyd/ask/happy-place` and
   `/api/fyd/ask/coppersmith-plumbing` both HTTP 200. A third projection,
   `happy-place-carpentry-decks-fences-remod-2f7098`, returns
   404 `{"ok":false,"error":"Unknown site."}`: it is a dump artifact, not a
   served tenant.
3. **Projection dump dir** `/home/nolan/ping/var/fyd-projections/`: 5 JSONs
   (`coppersmith-plumbing`, `happy-place`,
   `happy-place-carpentry-decks-fences-remod-2f7098`, `ping-fyd`,
   `tenant-e2e-synth`). This dir is a PING-side dump artifact, NOT the ask
   serving authority. Scanned all 5 for related-object counts anyway.
4. **Exact port of `selectRelatedCircles`** (Python, line-for-line against
   `related.ts`: canonical edge sort, BFS, best-edge-wins, final sort) run
   against both live fixture graphs
   (`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`,
   `coppersmith-graph.ts`).
5. **Test-only fixtures checked and excluded**: `happy-place-rich-graph.ts`
   and `redacted-batch-c-{consultant,cpa,dentist,lawfirm}.ts` are referenced
   only from `__tests__` or within the fixtures dir. Not live.

## Object counts (live tenants)

| tenant | objects | active rels | related pre-cap (owner) | cap binds? |
|---|---|---|---|---|
| happy-place | 7 | 6 | 6: 1 located_at (Adair Village, OR, US) + 5 offers (Repairs, Fencing, Painting, Drywall, Restoration) | NO |
| coppersmith-plumbing | 8 | 7 | 7: 1 located_at (Grand Junction, CO) + 1 works_for (person, in) + 1 links_to (external_identity, 2-hop via BFS) + 4 offers (Plumbing, Heating & Cooling, HVAC, Ventilation) | NO |

Both live tenants sit comfortably under the 8-cap. The 8-cap drops nothing on
any live tenant today. A live probe asking coppersmith-plumbing
"what services do you offer" returned SUPPORTED BY MULTIPLE EVIDENCE with all
4 services cited. (Separately observed, out of Q1 scope: happy-place refused
a services question with answerClass UNSUPPORTED even though its 6 related
objects all fit under the cap; that is an answer-class issue, not a cap
issue.)

## The near-miss (NOT live, do not claim as Q1 proof)

`happy-place-carpentry-decks-fences-remod-2f7098.json` (dump artifact, 404 on
the ask path) has 11 objects / 10 active relationships / **10 related
pre-cap**. Under the current ordering, rank 8 "Our Work" and rank 9 "Reviews"
are dropped by `slice(0, 8)`. A realistic visitor question like "do you have
reviews I can read" or "can I see examples of your past work" would be best
answered by exactly those two dropped objects. This shows the precise shape a
live Q1 occurrence would take, and it is one realistic tenant away: any live
trade business whose website extraction yields services + pages + contact
fragments as objects (as this dump does) will cross the cap.

## Breakage threshold (concrete trigger for the hunt)

`selectRelatedCircles` returns every public object reachable from the owner
via BFS (not just one hop). The cap drops objects iff the reachable public
set exceeds 8, i.e.:

**Trigger: a live tenant with 9 or more public objects reachable from the
owner object (owner + 9 others, 10+ tenant objects in the connected set).**

Realistic ways a live tenant crosses it: 9+ extracted services; services +
reviews/work/estimate pages as objects (the 2f7098 shape); services + people
+ locations + external identities. Re-run the exact-port scan
(`/tmp/exactscan2.py` logic, kept in this research dir's notes) against the
pinned fixtures whenever a tenant is added or regenerated; the moment any
tenant's pre-cap count hits 9, Q1 is provable with a real question against the
rank-8+ object.

## 12-gate impact

Q1 remains **OPEN** (no live occurrence). Q5 (proof BM25-lite is better) and
Q9 (failing test) unchanged from the 2026-09-27 record. BM25S stays BACKLOG.
No writer. No repo writes were made in this hunt (read-only greps, file reads,
and live HTTP probes only).

## Environment note

`/tmp/inspect.py` on the Pig is another agent's leftover probe script that
prints spec-digest output at import time; it shadowed stdlib `inspect` during
two crashed Python runs in this hunt and polluted their stdout. Successful
runs were unaffected. Worth cleaning to avoid confusing future agents.
