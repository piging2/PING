# VEIN-3 Q1 Hunt: 2026-09-30

**Verdict: Q1 STILL OPEN. No live duplicate entity or single-field entity collapse at HEAD ed3ff708.**

Head: `ed3ff708` on `fyd/builder-harvest-trackc-2026-09-28`, working tree CLEAN (verified). Prior hunts (2026-09-28) found NONE. This pass widened scope to the ingestion edge and outreach prospect dedup (in scope per this pass's orders).

## What Q1 needs

A live code path at current HEAD that merges or collapses two distinct
entities into one on the basis of a single shared field (phone, email,
name alone, or URL), or that duplicates the same real-world entity into
two persisted identities. Hard-law counterexamples do not count:
`findByVerifiedEmail` flagging `emailCollision=true` without merging is
the honored law, not the defect.

## (c) resolve/spike MATCH rules: still not wired

Files read: `src/fyd/resolve/spike/{resolve.ts,matchers.ts,normalize.ts,
types.ts,demo.ts}`, `__tests__/resolve.test.ts`.

- The spike carries exactly three EXACT-tier rules:
  `exact-url`, `exact-phone`, `exact-name-address` (matchers.ts:31-58).
  `exact-phone` IS a single-field collapse rule: two entities sharing a
  normalized phone produce a merge decision. This is the standing
  nearest-miss.
- The spike is byte-identical to its birth commit
  `29cdd274 fyd: entity-resolution spike` (git diff 29cdd274..HEAD shows
  only a test-file touch-up in 810284b5; resolve.ts and matchers.ts
  unchanged). No wiring commit since 4a8c5f2e.
- Zero production consumers: grepped `resolveCandidate`, `buildIndex`,
  `exactRuleFor` across `src app components services lib`
  (ts/tsx/js/mjs/cjs), excluding the spike dir: no hits. The recursive
  import grep for `resolve/spike` outside the spike dir also returned
  nothing.
- `src/fyd/edge/resolve.ts` is a different module (edge-object sheet
  builder); it does not import the spike and merges nothing.
- The one vendored consumer, `src/fyd/proceduralize/structured-data.ts`,
  vendors only `normalize.ts` functions (comment at :27-40), not the
  matcher/decision layer.
- Even inside the spike, the AMBIGUOUS tier cannot merge:
  `AmbiguousDecision` carries no matchedIds (enforced in resolve.ts);
  candidates are isolated for review.

Finding: exact-phone exists as a merge rule only in a spike with no
callers. NOT LIVE.

## (a) FYD ingestion/acquisition edge: no collapse, and no cross-run merge

Code traced: `src/fyd/acquisition/acquisition-adapter.ts` (types-only),
`static-adapter.ts` (L1 HTTP fetch), `live-loop.ts` (full loop),
`src/fyd/proceduralize/proceduralizer.ts` (`deriveBusinessId`,
`canonicalEntityUrl`, `project()`), `structured-data.ts` sameAs path.

- Business object identity: `deriveBusinessId(entityUrl)` =
  `"website-business-" + sha256Hex(canonicalEntityUrl(entityUrl)).slice(0,16)`
  (proceduralizer.ts:687-689). entityUrl = websiteClaim when it parses as
  http(s) with a hostname, else sourceUrl (proceduralizer.ts:795-805).
  `canonicalEntityUrl` normalizes scheme/www/query/fragment/port
  (entity-identity.test.ts:58-67).
- Same business ingested twice via different URLs (or a claimed website
  that fails the probe) mints TWO distinct `website-business-*` ids.
  That is a duplicate, not a collapse, and there is no downstream step
  that merges them: `project()` emits fresh objects per run; tenant
  graphs are independent per tenant; no upsert keyed on phone/name
  exists in tenant/builder/data (grep for `upsert|mergeObject` in those
  dirs returned only empty upsert lists in object-builder.ts:129-131).
- Acquisition adapters fetch observations; they perform no resolution.
- sameAs path (proceduralizer.ts:959-988): site-declared social URLs
  become `links_to` relationship candidates and intake-declared socials
  mint `ping.social.external_identity@1` objects with ids
  `ownerId + "-ext-" + sha256Hex(url).slice(0,12)` (live-loop.ts:469-508).
  Link candidates only; no entity merge.

Finding: ingestion can over-generate (duplicate objects per distinct
URL), which is the inverse defect. It never collapses on a single field.

## (b) Outreach prospect dedup: blocking guards, name-keyed merges, no single-field collapse

Pipeline lives in `~/workspace/outreach` (local machinery, outside the
ping repo). Files read/grepped: `check-prospect-collision.py`,
`merge-round134.py`, `jsonl-merge-round31.py`, `jsonl-merge-round53.py`,
`send-eligibility.py`, `engagement-guard.py`,
`research-scratch-round106-dedupe.txt`, plus a phone-keyed-merge grep
across `*.py`.

- `check-prospect-collision.py`: MANDATORY pre-merge guard. Blocks merges
  on exact normalized-name match against the canonical JSONL, pipeline.md
  rows, and prospect-archive.jsonl. The SUSPECT tier uses token overlap
  only to flag for human judgment; the docstring says it "never replaces
  the exact-match collision check" and never auto-merges. Preventive, not
  collapsive.
- `merge-round134.py` (canonical store maintenance): keyed on exact
  `business_name` (`by_name` dict). Archives by name; inserts staged rows
  after collision-guard clearance. No phone/email key anywhere in the
  merge scripts (`by_phone`/phone-key grep: no hits).
- `send-eligibility.py`: "dedup" is touch-marker counting within a rung
  (`collapsed` tuples at :203-272): same-rung redescriptions counted once.
  Per-prospect touch accounting, not entity collapse.
- `engagement-guard.py`: within-pass dedup keys on the action `page`
  string; never-reengage guard merges terminal-aware ledger post IDs
  (`post:<id>`) to BLOCK re-engagement. Both strip or block actions;
  neither merges two prospects into one.
- `research-scratch-round106-dedupe.txt`: a discovery name list, no
  mechanism.

Finding: the outreach pipeline errs on the side of refusing merges. No
phone/email single-field collapse exists.

## (d) Tenant fixtures and ask-path identity minting: unchanged, hard law intact

- `src/fyd/data/fyd-tenant-graph.ts:103`: `FYD_TENANT_PINS` still exactly
  two tenants (`happy-place`, `coppersmith-plumbing`). No new tenant, no
  regeneration at HEAD.
- `src/fyd/identity/principal.ts`: `deriveIdentityId` =
  `uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:" + providerAccountId)`
  (:57-59), i.e. deterministic on provider::issuer::subject. Email is
  documented "Attribute only. Never used as a key." (:67-69).
- `signInOrSignUp` (:161-193): unknown provider account -> derives and
  binds ONE new identity; email collision sets `emailCollision=true` and
  is "flagged, never merged" (docstring :152-157).
- `linkProviderAccount` (:216-231): refuses `ACCOUNT_BOUND_ELSEWHERE`;
  refuses to steal an account bound to a different identity.
- Ask/tenant/onboarding dirs: no `uuid`/`randomUUID` identity minting
  (grep clean). No identity minting on the ask path at all.

## Bounded negative: search surface actually covered

Pig repo (HEAD ed3ff708, clean tree), read-only probes:
1. `src/fyd/identity/` (principal.ts:52-260, file-store.ts:88): full
   signInOrSignUp + linkProviderAccount read.
2. `src/fyd/resolve/spike/` all 8 files read; import/wiring grep across
   repo (all extensions) for `resolveCandidate|buildIndex|exactRuleFor`;
   `git log -- src/fyd/resolve/` + `git diff 29cdd274 HEAD --stat`.
3. `src/fyd/proceduralize/proceduralizer.ts` :640-720 and :795-815 read;
   `canonicalEntityUrl` test read; `upsert|mergeObject` grep in
   tenant/builder/data.
4. `src/fyd/acquisition/` (adapter, static-adapter header, live-loop
   :420-560), `src/fyd/media/ingest.ts` listed, `src/fyd/edge/resolve.ts`
   header (different resolve, unrelated).
5. `src/fyd/data/fyd-tenant-graph.ts` :55-124 (pins).
6. Outreach: collision guard (full header + main), merge-round134.py
   header + keying, send-eligibility dedup section, engagement-guard
   dedup surfaces (from AGENTS.md standing law + code greps),
   round106 scratch, phone-key merge grep across outreach/*.py.
7. Donor registry `~/workspace/harvest/candidates.json`: decision fields
   read for dedupe/splink/recordlinkage/zentity.

Not covered (explicitly out of scope or duplicate coverage): PING
runtime DB stores (the hunt targets code paths, not live data), the
`var/fyd-projections` dumps (yesterday's paper already established the
dump dir is not the ask authority), `src/fyd/social` and
`src/fyd/lineage` (no entity-resolution code per the resolve greps).

## Nearest misses, honestly recorded

1. `exact-phone` in spike matchers.ts: a true single-field collapse
   rule, but with zero production callers. If it ever gets wired in, Q1
   fires the same day.
2. Double ingestion via different URLs mints duplicate
   `website-business-*` objects: failure-to-dedup, the inverse of Q1.
   Worth noting for a future over-generation hunt, not a Q1 hit.

## Donor citation (do not re-audit)

From the registry, rows relevant to Q1:
- `python-dedupe`: BACKLOG ("gated on live duplicate/collapse defect proof").
- `splink`: BACKLOG ("gated on defect proof").
- `python-recordlinkage`: BACKLOG (unmaintained upstream).
- `zentity`: REJECT (ES-plugin architecture incompatible).

With Q1 not found, all three stay BACKLOG and the 12-gate is not run:
the gate decides whether a donor mechanism may address a live Q1, and
there is no live Q1 to address. Whole-library DEPEND stays rejected for
all three per registry.

## Verdict

Q1 STAYS OPEN at HEAD ed3ff708. No repo writes made; Pig working tree
untouched (all probes read-only). No subagents spawned.
