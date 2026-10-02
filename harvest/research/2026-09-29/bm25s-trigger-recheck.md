# BM25S Trigger Re-check: 2026-09-29

**Verdict: TRIGGER DID NOT FIRE. Q1 STAYS OPEN.**

## What changed since yesterday's hunt

- Live HEAD moved: was `4a8c5f2e` on `fyd/sprint-integration-2026-09-24`,
  now `f877c391` on `fyd/builder-harvest-trackc-2026-09-28`
  (trackc commits: staged SitePatch pipeline, typed 10-op vocabulary,
  hardening, plus merged harvest/2026-09-28 microdata extraction).
- The working tree is heavily dirty (74 files), but the files that matter
  for this check differ from HEAD by import refactor only (see below).
- No new ask tenant. No tenant regenerated.

## Cap logic re-verified at live HEAD (working tree)

- `src/lib/ping/ask-composer.ts:38`: `ASK_LIMITS.maxRelated = 8`
  (unchanged; `maxRelatedInAnswer = 5` also present, unchanged).
- `src/lib/ping/ask-composer.ts:190`:
  `input.relatedObjects.slice(0, ASK_LIMITS.maxRelated)` (unchanged).
- The working-tree diff vs HEAD for ask-composer.ts and
  `src/fyd/data/fyd-tenant-graph.ts` is import-only: `createHash` from
  `node:crypto` and the local `canonicalize`/`sha256Hex` helpers moved to
  `@/lib/ping/digest`. No behavioral change to the cap or the tenant pins.
- `src/fyd/object/related.ts`: unmodified, `PREDICATE_PRIORITY` unchanged
  (`located_at: 0, provides: 1, works_for: 2, links_to: 3`, unknown = 99).
- Note: `src/fyd/ask/visitor-answer.ts` now calls
  `selectRelatedCircles(publicGraph, targetId)` (no limit) inside a new
  `oneHopRelatedObjects` wrapper that further restricts to one-hop edges
  (:638-653). The pre-cap trigger math (full BFS count vs the 8-cap) is
  unaffected; the default no-object visitor path (:756-757) uses all public
  objects minus the owner, still sliced to 8 by the composer. If anything
  the live surface is slightly smaller than yesterday.

## Tenant registry (unchanged)

`FYD_TENANT_PINS` still exactly two tenants, pins byte-identical to
yesterday (digests `eacaa611...` and `8eaf11fc...`, generatedAt
2026-09-21). `getFydTenantIds()` returns only `happy-place` and
`coppersmith-plumbing`.

## Exact-port scan results (re-run 2026-09-29 ~03:30 MDT)

Port of `selectRelatedCircles` (canonical edge sort, bidirectional BFS,
best-edge-wins dedup, predicate-priority + objectId final sort), no limit,
owner = the `ping.social.business@1` object. Fixture files unchanged
(happy-place-graph.ts mtime 2026-09-24; coppersmith-graph.ts mtime
2026-09-25; both git-clean).

| tenant | objects | active rels | pre-cap related (owner) | cap binds? |
|---|---|---|---|---|
| happy-place | 7 | 6 | 6: 1 located_at + 5 offers | NO |
| coppersmith-plumbing | 8 | 7 | 7 (full BFS): 1 located_at + 1 works_for + 1 links_to + 4 offers; 6 under one-hop restriction | NO |

Identical to yesterday, object for object. The cap drops nothing on any
live tenant today.

## Projection dumps (non-authoritative, checked for completeness)

`/home/nolan/ping/var/fyd-projections/happy-place.json` (regenerated
2026-09-28 18:44, AFTER yesterday's paper) and
`coppersmith-plumbing.json` (2026-09-28 17:04) were rescanned by drilling
into their `graph` key. Counts: happy-place dump 6 pre-cap,
coppersmith dump 7 pre-cap. Same as the pinned fixtures; the dump
regeneration changed nothing material. The dump dir remains NOT the ask
serving authority (yesterday's finding stands). The 2f7098 near-miss dump
(10 pre-cap, 404 on the ask path) is unchanged and still not live.

## Trigger status

Trigger (any ask tenant added/regenerated since 2026-09-28, or any
tenant's pre-cap related count hitting 9+): **NOT fired**. Nearest
approach is coppersmith-plumbing at 7, two objects under the threshold.
No new tenants, no regenerated fixtures, cap logic unchanged.

Q1 remains **OPEN** (no live occurrence). BM25S stays BACKLOG.
No writer. No repo writes were made in this check (read-only greps, file
reads, one /tmp scan script on the Pig; the Pig working tree was not
touched).

## Method note (SSH quoting)

With the `ssh -F <config> pigwsl 'wsl -- bash -c "<cmd>"'` pattern, CMD
honors the inner double quotes as grouping and passes `>`, `&&` through
literally to bash. Do NOT caret-escape them inside double quotes (the
carets survive as literals, e.g. `echo <b64> ^> /tmp/f.b64` writes a
trailing ` ^` into the file). Single base64 chunk under 8191 chars:
`echo <b64> > /tmp/f.b64`, then `base64 -d ... && ...` in a second call.
