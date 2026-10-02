# Ask FYD Vertical Proof: services question on both sites

Date: 2026-09-24. Worker: Ask FYD Vertical Proof (factory).
Question asked on both sites: "What services does this business offer, and how do you know?"
Repo: /home/nolan/projects/ping, HEAD e48ef710 (working tree has uncommitted Wave 1 changes).
Dev server probed: http://localhost:3100 on the Pig (next-server v15.5.24, pid 87920).

## 0. What "the wired ask path" is (verified by code read, no concierge)

The concierge wire patch is NOT applied (coordinator decision; `src/fyd/ask/concierge.ts`
and `context-compiler.ts` exist as untracked, unwired files; zero concierge references in
`answer.ts` or `ask-pipeline.ts`). The actual wired path:

1. `POST /api/fyd/ask/[siteId]` -> `handleAskRequest` (`src/app/api/fyd/ask/ask-pipeline.ts`).
   Tenant comes from the route path only, server-side via `requireTenantContext`
   (DNS-safe slug; path traversal killed). A body-supplied tenant id that disagrees
   with the route is refused 400 tenant_mismatch.
2. `loadBundleWithOwnerOverlay(siteId)` -> `getSiteBundle` (`src/fyd/media/site-bundle.ts`)
   -> `getFydTenantGraph` (`src/fyd/data/fyd-tenant-graph.ts`): pinned fixture base graph
   (sha256 digest-pinned per tenant; mismatch throws, never serves partial) + journal
   overlays via the governed `PingObjectReader.queryFydSiteOverlays(siteId)` over HTTP to
   the FYD journal gateway. Then owner field corrections are applied above the read seam
   (fail closed: on overlay failure the raw bundle is served, never an invented value).
3. `answerAskFyd` (`src/fyd/ask/visitor-answer.ts`):
   - `publicGraphOf`: `applyFieldVisibility(graph, [])` first, then keep only
     `visibility === "public"` objects and only active relationships whose subject and
     object are both public.
   - target = the tenant's business object (`spec.ownerObjectId`); related = all other
     public objects.
   - `buildAskFydContext`: viewer `{id: null}` (anonymous), grants `[]`, plan null,
     SiteSpecSummary (section queries resolved against the public graph + sha256 digest
     of the spec), question.
   - `composeAskFyd` -> deterministic `composeAnswer` (`src/lib/ping/ask-composer`):
     no LLM, no embeddings, no vector search anywhere in this path.
   - `buildCitations`: [n] markers in the answer text are matched 1:1 to the
     composer-produced evidenceRefs and resolved against the snapshot's objects and
     relationships. Refusal (answerClass unknown) when no cited evidence.
4. Route reduces to the 3-class contract: `supported` / `derived` / `unknown`;
   every citation carries `claimClass`.

Authorization audit of the ask path (grep over the full import chain):
- No database access: zero matches for pg/postgres/knex/prisma/drizzle in
  ask-composer, ping-object-reader, visitor-answer, answer, context-builder,
  ask-pipeline, fyd-tenant-graph, site-bundle. The only network read is the
  journal overlay HTTP fetch; the only disk read is the in-process fixture.
- No arbitrary RAG: zero matches for openai/anthropic/embedding/qdrant. The composer
  is deterministic template matching over the tenant's own public graph.
- No raw Postgres, no full tenant memory: the ContextBundle contains only the
  request tenant's public-projected graph (one tenant, public objects only), the
  SiteSpec summary + digest, anonymous viewer, empty grants, and the question.
  Journal history, other tenants, and non-public objects never enter it.

### The AUTHORIZED ContextBundle (what the model-equivalent composer sees)

- ViewerContext: `{ id: null, displayName: null }`, mode visitor, grants `[]`
  (no proposal/draft/mutation capability exists in this pipeline).
- GraphSnapshot: the tenant's public-projected ObjectGraph (public objects only,
  active relationships with both ends public), digest-verified at the base layer.
- Allowed Fields: object fields after `applyFieldVisibility` (address-bearing fields
  coarsened by conservative default; owner `hide` decisions drop the field).
- Evidence Bindings: object provenance (`kind`, `ref`, `derivedAt`) carried on each
  object; citation source labels derived from `website-ingestion:<url>` refs.
- Relevant Owner Assertions: owner field corrections applied above the read seam
  (happy-place: `tagline = "Built right. Built to last."` from the journal overlay;
  cited as owner-set, never merged into the website's record).
- Question: the raw question string (max 2000 chars).

## 1. WIRED-PATH RESULT ON THE LIVE :3100 SERVER (the truth first)

Both sites return HTTP 503 via the real route on the running server:

```json
{"ok":false,"kind":"projection_unavailable",
 "error":"I could not load this site's data, so I cannot answer your question. The answer is unknown.",
 "attempted":"load the site's verified data projection","answerUnknown":true}
```

This is the honest fail-closed behavior working as designed: the bundle cannot be
built, so no answer is attempted. The per-site ANSWER blocks below (section 2) were
produced by driving the IDENTICAL route handler code (`POST /api/fyd/ask/[siteId]`)
in the lane's jest harness with the lane's stub FYD journal standing in for the
journal authority. That substitution is the ONLY non-production element: fixture pin,
digest check, overlay application, owner overlay, field-visibility projection,
context builder, composer, and citation resolver are the real production code path.
The stub serves the 7 canned happy-place overlay events that mirror the real FYD
demo journal (pergola add, offers relationship, presentation intents, then
deactivate pergola + tagline set_field).

## 2. PER-SITE RESULTS (machinery proof, same route code as section 1)

### Happy Place (/sites/happy-place)

ANSWER: Related offerings: Repairs; Fencing; Painting; Drywall; Restoration. [9]

I answer from the site record for Happy Place Carpentry LLC (business). [1]

The record's stated source is https://happy-place-platform.vercel.app/. [1]

The record was derived on 2026-09-21. [1]

Basis: the site's own words (website statement, not independently verified). [1]

(Response: ok true, answerClass "supported", refusal false, unknowns [], suggestedActions [], proposal null, tenantId "happy-place".)

CLAIMS:
1. Happy Place Carpentry LLC offers five services: Repairs, Fencing, Painting, Drywall, Restoration.
2. The business record is for Happy Place Carpentry LLC (a business object).
3. The record's stated source is https://happy-place-platform.vercel.app/.
4. The record was derived on 2026-09-21.
5. The basis is the site's own words (website statement, not independently verified).

EVIDENCE (object -> field/edge -> evidence ref -> source URL):
1. `website-business-6fa5ebd99d72c4cb` -[offers, active x5]-> service objects
   `website-business-6fa5ebd99d72c4cb-service-3263502c8175` (Repairs),
   `-service-340c39513223` (Fencing), `-service-7f1139c11dab` (Painting),
   `-service-c63c87ed8420` (Drywall), `-service-cd28e52699a5` (Restoration);
   field `title` on each; evidence ref [9] (representative marker; the other four
   services are enumerated from the same public snapshot) -> https://happy-place-platform.vercel.app/
2. `website-business-6fa5ebd99d72c4cb`, field `title` = "Happy Place Carpentry LLC";
   evidence ref [1] -> https://happy-place-platform.vercel.app/
3. `website-business-6fa5ebd99d72c4cb`, provenance `ref` =
   `website-ingestion:https://happy-place-platform.vercel.app/`; evidence ref [1] ->
   https://happy-place-platform.vercel.app/
4. `website-business-6fa5ebd99d72c4cb`, provenance `derivedAt` = 2026-09-21;
   evidence ref [1] -> https://happy-place-platform.vercel.app/
5. Citation basis text carried on [1]: "The site's own words (website statement,
   not verified fact)"; evidence ref [1] -> https://happy-place-platform.vercel.app/

SOURCE URLS: https://happy-place-platform.vercel.app/

CLASSIFICATION (per claim): 1 DIRECT, 2 DIRECT, 3 DIRECT, 4 DIRECT, 5 DIRECT.
(All five restate snapshot evidence: object titles, active `offers` edges, and
provenance fields. No computation beyond listing; nothing generated.)

HIDDEN FIELD LEAK: NO
UNSUPPORTED CLAIM: NO

### Coppersmith (/sites/coppersmith-plumbing)

ANSWER: Related offerings: Plumbing; Heating & Cooling; HVAC; Ventilation. [12]

I answer from the site record for Coppersmith Plumbing - HVAC - Mechanical (business). [1]

The record's stated source is https://www.coppersmithplumbing.com/. [1]

The record was derived on 2026-09-21. [1]

Basis: the site's own words (website statement, not independently verified). [1]

(Response: ok true, answerClass "supported", refusal false, unknowns [], suggestedActions [], proposal null, tenantId "coppersmith-plumbing".)

CLAIMS:
1. Coppersmith Plumbing - HVAC - Mechanical offers four services: Plumbing, Heating & Cooling, HVAC, Ventilation.
2. The business record is for Coppersmith Plumbing - HVAC - Mechanical (a business object).
3. The record's stated source is https://www.coppersmithplumbing.com/.
4. The record was derived on 2026-09-21.
5. The basis is the site's own words (website statement, not independently verified).

EVIDENCE (object -> field/edge -> evidence ref -> source URL):
1. `website-business-2f1327c09d622175` -[offers, active x4]-> service objects
   `website-business-2f1327c09d622175-service-139408827c27` (Plumbing),
   `-service-2dbc12c16f83` (Heating & Cooling), `-service-78962f315c55` (HVAC),
   `-service-a2008c93fb04` (Ventilation); field `title` on each; evidence ref [12]
   (representative marker; the other three are enumerated from the same public
   snapshot) -> https://www.coppersmithplumbing.com/
2. `website-business-2f1327c09d622175`, field `title` =
   "Coppersmith Plumbing - HVAC - Mechanical"; evidence ref [1] ->
   https://www.coppersmithplumbing.com/
3. `website-business-2f1327c09d622175`, provenance `ref` =
   `website-ingestion:https://www.coppersmithplumbing.com/`; evidence ref [1] ->
   https://www.coppersmithplumbing.com/
4. `website-business-2f1327c09d622175`, provenance `derivedAt` = 2026-09-21;
   evidence ref [1] -> https://www.coppersmithplumbing.com/
5. Citation basis text carried on [1]: "The site's own words (website statement,
   not verified fact)"; evidence ref [1] -> https://www.coppersmithplumbing.com/

SOURCE URLS: https://www.coppersmithplumbing.com/

CLASSIFICATION (per claim): 1 DIRECT, 2 DIRECT, 3 DIRECT, 4 DIRECT, 5 DIRECT.

HIDDEN FIELD LEAK: NO
UNSUPPORTED CLAIM: NO

## 3. FIRST BROKEN STEP (wired path on :3100)

The graph does NOT lack evidence-bound Service objects: happy-place has 5 public
`ping.social.service@1` objects with 5 active `offers` edges; coppersmith-plumbing
has 4 with 4 active `offers` edges; every one carries provenance
`website-derived` / `website-ingestion:<business URL>`. Acquisition, normalization,
and schema mapping of the base are all healthy: the pinned fixture digest check
passes for both tenants (baseDigest eacaa6113180 / 8eaf11fc761a).

FIRST BROKEN STEP: the journal overlay read inside the authorized bundle load.
`getFydTenantGraph` -> `PingObjectReader.queryFydSiteOverlays` fetches
`GET /events/FYD_SITE_OVERLAY` from the FYD journal gateway, which defaults to
`http://127.0.0.1:18199` (`FYD_JOURNAL_GATEWAY_URL` is unset in the :3100 server
environment). Nothing listens on 127.0.0.1:18199 (verified via ss). Result:
`reader_failed` ("PING gateway unreachable: fetch failed") -> `getFydTenantGraph`
throws per its fail-closed contract -> route returns 503 `projection_unavailable`
with the honest unknown wording. Note the main gateway at :8080 DOES expose
`/events/FYD_SITE_OVERLAY` but answers 401 (missing auth), and the reader sends no
auth header on the FYD journal path, so pointing the env var at :8080 would not
work without a code change. The FYD journal gateway deployment is effectively
missing.

NEXT (coordinator decision required; not applied by this worker):
- Option A: deploy/restore the FYD journal gateway at the configured URL (or set
  `FYD_JOURNAL_GATEWAY_URL` to the real journal authority and restart the :3100
  server). Then the wired path serves the section-2 answers live with zero code
  changes.
- Option B: add a designed, labeled fallback (serve the digest-pinned fixture base
  with zero overlays and mark answers base-only). This changes the authorized-read
  contract and needs an explicit product decision; it was NOT implemented here.
- Follow-up hardening found during this proof: `buildCitations` degrades an
  unresolvable citation id to source "Site record" instead of failing closed
  (out-of-range markers are skipped). No dangling refs occurred in either answer,
  but a truly dangling ref would be emitted with degraded labeling, not refused.

## 4. TEST RESULTS

DANGLING REF TEST: PASS. Every citation id in both responses resolves against the
exact served snapshot (happy-place: 2/2, coppersmith: 2/2, 0 dangling). Every [n]
marker in each answer text has exactly one matching citation ([1],[9] and [1],[12]).

PUBLIC/HIDDEN TEST: PASS.
- `applyFieldVisibility` with a `hide` decision structurally drops the field from
  the projected graph (verified: happy-place `tagline` present before, absent from
  the rebuilt fields record after; the source graph object is untouched, never
  mutated). Hidden is NOT PRESENT to the composer, not prompt-guarded.
- The one non-public object in the served bundle (`website-service-51de038c1defe8bd`
  "Pergola Design Consultations", visibility=private after the journal's
  deactivate_object op) is excluded by the public projection and appears in neither
  the answer text nor the citations (leak check: false).
- Address-bearing fields default to `coarse` (street detail dropped) by the
  conservative default table.

## 5. SCORECARD

- ASK FYD HAPPY PLACE (wired, :3100): FAIL (503 projection_unavailable; journal gateway unreachable). Honesty behavior: PASS (refused instead of guessing).
- ASK FYD COPPERSMITH (wired, :3100): FAIL (503 projection_unavailable; same cause). Honesty behavior: PASS.
- ASK FYD HAPPY PLACE (machinery, identical route code + stub journal): PASS (200, supported, 2 citations, 0 unknowns).
- ASK FYD COPPERSMITH (machinery, identical route code + stub journal): PASS (200, supported, 2 citations, 0 unknowns).
- SERVICE OBJECTS: present (happy-place 5, coppersmith-plumbing 4; all public, all evidence-bound to the business website URL).
- EVIDENCE RESOLUTION: PASS (all citation ids resolve; markers match citations 1:1).
- DANGLING REF TEST: PASS (0 dangling; mechanism caveat documented in section 3).
- PUBLIC/HIDDEN TEST: PASS (hide drops structurally; private object excluded; no leak).

## 6. ARTIFACTS AND METHOD NOTES

- Temporary jest probes (`zz-vertical-proof*.tmp.test.ts`) were created under
  `src/app/api/fyd/ask/__tests__/`, run with the lane config
  (`npx jest --config src/fyd/ask/jest.config.cjs`), and DELETED afterward.
  `git status` on the test dir is clean; no repo residue.
- Live :3100 probes: `POST /api/fyd/ask/happy-place` and `/sites/happy-place`
  (200) via curl through `~/workspace/pig/pigwsl-run.sh`.
- Snapshot digests observed: happy-place base eacaa6113180, coppersmith-plumbing
  base 8eaf11fc761a (digest pin check passes for both).
- Citation granularity note: the services-list claim carries one representative
  [n] marker (the first service object); the remaining services are enumerated
  from the same public snapshot and carry identical provenance bindings. All
  claims are DIRECT restatements of snapshot evidence.
