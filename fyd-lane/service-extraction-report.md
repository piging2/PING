# Service Extraction Report: EVIDENCE -> SERVICE RESOLUTION -> Service objects -> relationships

Date: 2026-09-21. Lane: FYD "Keep Prompting" builder, branch `fyd/sitespec-generator`.
Commits (local only, no push): `3fb4d12` then `55c6ce6` (HEAD).

## REACHABILITY

Separate lane. This lane did not touch reachability and duplicates none of it.

## MOBILE FIX SHA

`8a99742` (fyd(mobile): prevent 320px overflow in Ask FYD design-token row).
Already committed before this lane started; not recommitted, not modified.

## CANONICAL GATE

Clean detached worktree `/tmp/fyd-canon2` at `55c6ce6`, `npm ci` fresh,
exact commands from `~/workspace/fyd-lane/gate-rerun-8a99742.md`:

| Suite | Command | Pass | Fail |
|---|---|---|---|
| ask | `npx jest --config src/fyd/ask/jest.config.cjs` | 36/36 | 0 |
| activitypub | `npx jest --config src/fyd/adapters/activitypub/jest.config.cjs` | 9/9 | 0 |
| proceduralize + sitespec + components | `npx jest --config /tmp/fyd-temp.config.cjs` | 80/89 | 9 |
| refresh | `node --test src/fyd/refresh/__tests__/*.test.ts` | 21/21 | 0 |
| TOTAL | | 146/155 | 9 |

Baseline at `8a99742` was 138/147 with the same 9 failures. Delta: +8 new
tests (the new service-extraction suite), all passing. Zero regressions.

The 9 failures are the inherited renderer-boundary set from `c5188f9`,
unchanged by this lane and reported separately, not adopted:
- `sitespec/__tests__/safe-link.test.ts`: suite fails to run, module
  `../safe-link` was never committed.
- `sitespec/__tests__/bindings.test.ts`: verifyPresentationBinding cases
  fail, they need the uncommitted `safe-link` / `field-visibility` modules.
- `sitespec/__tests__/render-model.test.ts`, `components/__tests__/render.test.ts`,
  `components/__tests__/projection-boundary.test.ts`: same missing-module root cause.
- `proceduralize/__tests__/generator.test.ts`: 9 binding failures because the
  committed Coppersmith fixture contains only a Business object and no Location.

Renderer work is frozen; HPP untouched.

## SERVICE HARVEST

Reference: `~/workspace/fyd-lane/service-semantics-harvest.md`. Reused as-is,
nothing reinvented:

- Schemas `ping.social.service@1`, `ping.social.product@1`,
  `ping.social.offer@1` already existed in `src/lib/ping/types.ts`.
- Business-to-Service predicate is `offers`.
- Deterministic Service ID: `${businessId}-service-${sha256Hex(entityKey).slice(0, 12)}`.
- Deterministic relationship ID: `rel-${sha256Hex(subject + "|" + predicate + "|" + object).slice(0, 16)}`.
- Fact classes: DIRECT_FACT, DERIVED_FACT, INFERENCE, GENERATED_COPY, USER_OVERRIDE.
- `PingRelationship` already supports `evidenceRef`.
- `jsonld` pinned at 9.0.0; canonicalization must pin algorithm/version
  explicitly because jsonld@9.0.0 changed defaults to RDFC-1.0.

## STRUCTURED SERVICE EXTRACTION

Tier 1 (direct JSON-LD) extraction, all in the existing machine path:

`src/fyd/proceduralize/structured-data.ts` (+4 lines):
- literal `serviceType -> service_type`
- relation `provider -> provided_by`, `itemOffered -> item_offered`,
  `offers -> offers`

`src/fyd/proceduralize/proceduralizer.ts` (project stage):
- Service objects keep `service_type` and `area_served` as DIRECT_FACT
  fields when the JSON-LD carries them.
- Offer entities now project as `ping.social.offer@1` objects with
  deterministic IDs `${businessId}-offer-${sha256Hex(entityKey).slice(0, 12)}`.
  An Offer projects when it has a name, a description, or an itemOffered
  link; a bare node with none of those is dropped as noise. An unnamed
  offer gets the fallback label "Offer" classified DERIVED_FACT, never a
  direct fact.
- Generic structured relationships now flow through the entity->object
  map, so Business `makes_offer` Offer, Offer `item_offered` Service, and
  Service `provided_by` provider project as real PingRelationships.
  Unmapped endpoints are dropped and counted, never half-emitted.

No ServiceAuthority / OfferAuthority / ClaimAuthority was created. The
renderer is untouched.

## SERVICE OBJECTS A/B

A (before, real sources): 0 Service objects from both real captures, and the
refusal was (correctly) returned.

B (after, machine measurement via `runExtractionPipeline` over the real
captures, temporary probe, since removed):
- Coppersmith (`src/fyd/proceduralize/raw/coppersmith-plumbing/index.html`):
  4 objects, 0 services, 0 offers.
- Happy Place (`src/fyd/proceduralize/raw/happy-place-platform/index.html`):
  2 objects, 0 services, 0 offers.

The machinery is proven by the committed synthetic tests
(`src/fyd/proceduralize/__tests__/service-extraction.test.ts`, 8 tests):
direct `@type: Service` with `serviceType`/`provider`/`areaServed`,
`Service.offers`, `Offer.itemOffered -> Service`,
`Organization.makesOffer -> Offer -> Service`, and
`hasOfferCatalog -> OfferCatalog -> Offer -> itemOffered -> Service` all
project. Tier 1 coverage on the real captures is genuinely zero, so zero
Service objects there is the correct, evidence-first outcome.

## SERVICE RELATIONSHIPS A/B

A (before): only the Business `offers` summary edge for Service/Product.

B (after, synthetic): Business `makes_offer` Offer (>=1), Offer
`item_offered` Service (2), Service `provided_by` Business (1), Business
`offers` reaching every Service (3/3). Real captures: Coppersmith edges are
`links_to, located_at, works_for`; Happy Place `located_at`. No service
edges exist because no service evidence exists.

## DETERMINISTIC SERVICE IDS

Committed test: same payload with reversed `@graph` order produces
identical service IDs; an unrelated business ingested first in the same
process does not change them. IDs derive from `${businessId}` plus the
content-hash entity key; no module-level counters, no insertion-order
dependence. Business ID itself derives from source URL + controller, so
cross-source stability holds by construction.

## PROVENANCE

`buildAskContext` now carries `fieldClasses` (per-object, per-field fact
classes from the projected graph) and `sourceUrls` (deduped, sorted URLs
extracted from `website-ingestion:<url>` provenance refs, with a generic
URL fallback). Every claim classification carries `evidenceRefIds` pointing
into the answer's own `evidenceRefs`, which carry object id, schema, title,
and detail.

## ASK FYD A/B

Exact unchanged question, both runs through `buildAskContext` +
`composeAnswer`:

"What services does this business offer, and how do you know?"

A (before, real graphs): frozen refusal, no services named. Correct then,
correct now.

B (after):
- Synthetic graph WITH services: `partial: false`. Answer names only the
  service/product objects, e.g. "Related offerings: Drain Cleaning;
  Emergency Plumbing." with citation `[n]`. Offer node titles are NOT
  presented as services (fixed in `55c6ce6`: offers are evidence-chain
  scaffolding, not services).
- Real Coppersmith graph: `partial: true`, frozen refusal, unknowns
  `["services offered by this business"]`, sourceUrls
  `["https://www.coppersmithplumbing.com/"]`.
- Real Happy Place graph: `partial: true`, frozen refusal, unknowns
  `["services offered by this business"]`, sourceUrls
  `["https://happy-place-platform.vercel.app/"]`.

Observed claim objects (synthetic, 2-service probe):
`{"claim":"Acme Test Plumbing offers Drain Cleaning","classification":"DIRECT_FACT","evidenceRefIds":["website-business-...-service-..."]}` etc.

## UNKNOWN/REFUSAL TEST

Committed test asserts: no services in the graph -> `partial: true`, answer
starts with the frozen sentence "I do not have evidence for that in the
current context, so I will not guess.", `unknowns` equals
`["services offered by this business"]`, `claimClassifications` is `[]`.
The refusal wording itself was not modified anywhere; the composer appends
its standard consulted-context line after the frozen sentence, which the
test documents as outside the frozen wording.

## CLAIM CLASSIFICATIONS

`AskAnswer.claimClassifications: AskClaimClassification[]` (new, in
`src/lib/ping/types.ts`). Each entry: `claim` (text as stated),
`classification` (the pipeline FactClass vocabulary when the ask context
carries field classes, else the object's own claim kind; never invented),
`evidenceRefIds` (ids into the answer's evidenceRefs).

Observed distribution on the synthetic fixture: 3 claims, all
DIRECT_FACT (named services from JSON-LD literals). The unnamed catalog
offer's fallback label is DERIVED_FACT in the graph's field classes, and
is not stated as a claim in the answer at all.

`src/fyd/ask/answer.ts` `baseFields` (site-patch envelopes/refusals only)
supplies honest empty defaults for `claimClassifications`/`unknowns`;
the evidence-backed path flows through `composeAnswer` untouched.

## SOURCE URLS

`AskAnswer.sourceUrls: string[]` (new). Deduped and sorted, extracted only
from object provenance refs (`website-ingestion:<url>` preferred, generic
URL match as fallback). Observed: `["https://example.test/"]` on synthetic,
the real site URLs on real captures. Never synthesized from question text.

## FIRST BROKEN STEP

Two, in order encountered:

1. The lane's own Ask contract edit left `src/lib/ping/types.ts` in an
   incomplete compile state: new required `AskAnswer` fields were added
   before all constructors and context wiring were updated. Fixed by
   completing the wiring in the same lane (`ask-composer.ts`:
   `AskContextInput.fieldClasses`, `buildAskContext` attaches
   `fieldClasses` + `sourceUrls`; every `composeAnswer` return path
   populates the three new fields; `src/fyd/ask/answer.ts` `baseFields`
   updated). `tsc --noEmit` clean, ask 36/36, proceduralize 69/69.
   Ledger: FL-20260921-202, FL-20260921-203 (stale temp file on retry),
   FL-20260921-201 (bridge chunking), FL-20260921-204 (unexplained
   `SEGMENTS:` stdout, still OPEN/observational), FL-20260921-205 (test
   violated the parseRich raw-payload contract).

2. The loop's next first-broken-step is Tier 2 determination, and it is
   NOT a code problem: Coppersmith's homepage carries "Service, Repair &
   Installation" and "Popular Product Installations" headings (~40
   "service" mentions) but no deterministic Tier 2 structure (no explicit
   services nav, no service list with labels+links, no service-page URLs
   corroborated by visible labels). Marketing prose was deliberately not
   promoted to Service objects. The sitemap index points at
   page-sitemap.xml and installs-sitemap.xml, which were never captured;
   fetching and measuring those is the next evidence step, owned by the
   acquisition side, not this lane.

## NEXT

- This lane is closed: Tier 1 extraction, relationships, deterministic
  IDs, Ask contract (classifications/unknowns/source URLs), refusal
  preservation, tests, gate, and this report are done at `55c6ce6`.
- If Tier 2 evidence is wanted: capture Coppersmith's page-sitemap.xml /
  installs-sitemap.xml, run the same `runExtractionPipeline` measurement,
  and only then decide whether explicit service pages meet the
  deterministic Tier 2 bar. Do not lower the bar to prose.
- Fixture regeneration (`__fixtures__/*.ts`) belongs to the lane that
  owns those dirty files; this lane did not touch them.
- The 9 inherited gate failures stay with the renderer-boundary lane.
