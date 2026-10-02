# SCHEMA-FUZZ REPORT

Lane: LANE-SCHEMA-FUZZ, 500-Site Factory Stress Program, schema lever.
Date: 2026-09-23. Repo: /home/nolan/projects/ping, branch fyd-factory (read-only, no repo modifications).
Pipeline under test (real functions, no mocks):
generateSiteSpec (src/fyd/proceduralize/generator.ts)
-> validateSiteSpec (src/fyd/sitespec/validator.ts)
-> buildRenderContext (src/fyd/components/renderer.tsx)
-> buildSemanticRenderModel (src/fyd/sitespec/render-model.ts, section-binding check)
Schema gates probed directly: validateAgainstSchema, eligibleComponents, relationshipRules, isAllowedPredicate, capabilityOptions, schemaRole, getSchemaDef, agentToolDescription.

Harness: [fuzz.ts](sandbox://workspace/fyd-factory/fuzz/fuzz.ts) (runs on the Pig via tsx, outside the repo). Raw results: [fuzz-results.json](sandbox://workspace/fyd-factory/fuzz/fuzz-results.json).

## Headline numbers

- Valid set: 12/12 passed. Every schema-conformant combination rendered with zero false rejections, zero invented claims (every bound object id existed in the graph in all cases), zero pipeline exceptions, byte-identical specs across repeat runs.
- Hostile set: 15/20 failed closed. No crashes in any case (20/20), no invented claims, no unsafe output. 5 cases exposed schema gaps (H4, H9, H10, H11, H17).
- Top schema gap: validateAgainstSchema is not wired into the pipeline. Schema-invalid objects render as valid sites.

## 1. Schema authority inventory

### 1a. Proof schemas (src/fyd/sitespec/schemas.ts)

Exactly three schema definitions exist. Everything else is role projection or component mapping.

**ping.social.business@1** (Business), identityBacked=true, likeable=false
- Fields: title:string (required), description:string (required), category:string, website:url, phone:string, email:string, hours:string, socials:string[]
- Relationships: provides -> [service, product], publishes -> [post, article], located_at -> [location], employs -> [person]

**ping.social.service@1** (Service), identityBacked=false, likeable=true
- Fields: title:string (required), description:string (required), price_hint:string, duration:string
- Relationships: provided_by -> [business]

**ping.social.post@1** (Post), identityBacked=false, likeable=true
- Fields: title:string (required), text:string, date:string, tags:string[], url:url
- Relationships: published_by -> [business], replies_to -> [post]

### 1b. Schema roles (site compiler reasons over roles, not ids)

business: social.business, knowledge.business | service: social.service, knowledge.service | product: social.product | location: social.location, knowledge.location | person: social.person, knowledge.person | post: social.post, knowledge.post | article: social.article, knowledge.article. knowledge.website has no role (null).

### 1c. Component eligibility (schema -> components)

- business: Hero, IdentityCard, BusinessSummary, Contact, CTA, Links, SocialProof, AskFYD, ObjectGrid, ObjectFeed
- service: Services, ObjectGrid, ObjectFeed, CTA, ObjectRail
- post / article: Posts, ObjectGrid, ObjectFeed, RecentObjects, ObjectRail
- product: Products, ObjectGrid, ObjectFeed, ObjectRail
- location: Locations, ObjectGrid, ObjectFeed
- person: People, ObjectGrid, ObjectFeed, ObjectRail
- knowledge.website: ObjectGrid, ObjectFeed
- knowledge vocab schemas resolve through schemaRole to the proof schema component lists (verified for all six)
- unknown or empty schema: GenericObjectCard only

### 1d. Relationship rules (schema -> allowed predicates)

Defined only for the three proof schemas (see 1a). product, location, person, article (social), and all knowledge schemas have NO relationship rules: isAllowedPredicate returns false for every predicate on them. The generator does not read these rules at all; it hardcodes its own predicate table (ROLE_PREDICATES): service [provides, offers], product [provides, offers], location [located_at, has_location], person [employs, has_member], post/article [publishes]. Note the mismatch: "offers", "has_location", "has_member" are matched by the generator but are NOT declared allowed by any schema's relationship rules.

### 1e. Capability model (schema -> action kinds)

Base: open, ask, reference always. follow only when identityBacked (business only). like only when likeable (service, post). reply only on post for signed-in viewers. propose_update and site_propose only when viewer controls the object. open_website only when a public URL exists. Matrix over 3 schemas x 4 viewer states: zero invariant violations. The signature is capabilityOptions(def, {viewerId, controllerId, hasWebsite}). Evidence state is NOT an input.

### 1f. Evidence states (src/fyd/ui/evidence-state.tsx)

observed, inferred, unverified, unknown, unavailable, withheld. These live on the projection layer (ClaimEvidence in object-projection.ts), not on PingObject, and no pipeline stage in this fuzz's path reads them.

## 2. Valid combinations (12/12 passed)

| ID | Combination | Result |
|----|-------------|--------|
| V1 | Minimal business, required fields only | PASS, renders |
| V2 | Full trade graph: business + 3 services + product + 2 locations + 2 persons + 3 posts + 2 articles; provides/publishes/located_at/employs/provided_by/published_by/replies_to; 2-cycle business/service; reply chain; byte-identical spec on repeat run; all 13 generator components bound | PASS, renders |
| V3 | Knowledge vocabulary only (business/service/location/person/post/article via offers/has_location/has_member/publishes) | PASS, renders via role projection |
| V4 | Mixed social + knowledge services on one owner | PASS, both predicates populate the service role |
| V5 | Provenance kinds (canonical-journal, website-derived, overlay-authored), private objects, active+inactive edge twins | PASS; private objects never bound; no within-section duplicates |
| V6 | Viewer matrix: anon, controller, stranger | PASS x3, render context builds for all |
| V7 | Scale: 421 objects, 420 relationships | PASS, full pipeline in 6 ms |
| V8 | Every eligible component x every schema as hand-written sections | PASS, validator accepts all 50 pairings, zero errors |
| V9 | Whitespace-only description | PASS, BusinessSummary skipped, still renders |
| V10 | Boundary URL values (https URL, relative path, string[] socials) | PASS, zero schema warnings |

No false rejections anywhere. Determinism confirmed (V2: two runs, byte-identical spec). Unknown-object-id bindings: 0 across all cases.

## 3. Hostile combinations (15/20 failed closed)

| ID | Hostile input | Observed behavior | Verdict |
|----|---------------|-------------------|---------|
| H1 | Unregistered schema only | No owner found, empty spec, typed validator error "A site needs at least one page", not renderable | CLOSED |
| H2 | Empty-string schema | Same typed failure; eligibleComponents falls back to GenericObjectCard | CLOSED |
| H3 | Schema id carrying markup injection | Not recognized as business (schemaRole null), typed failure, no markup reaches any output (pipeline returns data, never HTML) | CLOSED |
| H4 | Business missing required description | Pipeline RENDERS it (renderable=true); validateAgainstSchema flags 1 error but nothing in the pipeline calls it | GAP (G1) |
| H5 | Relationship to missing object id + dangling subject | Edges dropped silently; Services section still emitted for the real target; zero unknown ids bound | CLOSED |
| H6 | provides edge to a person (target-schema mismatch) | Person never bound anywhere; closed by silent omission, no finding emitted | CLOSED (see G5) |
| H7 | Active + inactive edge on same triple | Active wins, exactly 1 binding per Services section; inactive revocation intent silently lost | CLOSED (see G8) |
| H8 | Reply cycle A<->B plus self-loop | No hang, no crash; cycles pass through completely undetected | CLOSED (see G6) |
| H9 | Capability grant with zero evidence basis | capabilityOptions grants reply/like on schema flags alone; the signature has no evidence input at all | GAP (G3) |
| H10 | javascript: URL in website field | Schema emits warning only, 0 errors; spec renders | GAP (G2) |
| H11 | Wrong field types (socials as string) | Pipeline RENDERS it; validateAgainstSchema flags the error but is never called | GAP (G1) |
| H12a-d | Mutated specs: duplicate page slug, unknown component, nav to missing page, duplicate section id | Each caught with a typed validator error, not renderable | CLOSED x4 |
| H13 | Unknown schema paired with Services component | Typed error "does not accept schema", not renderable | CLOSED |
| H14 | Duplicate object ids, different schemas | Last-wins silently in generator and resolveQuery maps; hero bound once; no duplicate-id finding | CLOSED (see G6) |
| H15 | Business/service 2-cycle via provides/provided_by | Renders, no loop | CLOSED |
| H16 | Private owner only | Typed failure, not renderable | CLOSED |
| H17 | Duplicate ACTIVE edges on same triple | Same object bound TWICE inside one section (home Services, ObjectRail, services page) | GAP (G4) |

Zero exceptions across all 20 hostile cases. Zero invented claims (unknownObjectIds = 0 in every case). Zero unsafe output (no markup, no script, no javascript: URI reached rendered output in this path).

## 4. Schema gaps found

Ranked by consequence for the factory program.

**G1 (TOP GAP): validateAgainstSchema is not wired into the pipeline.** The schema lever exists as a function but nothing calls it: generateSiteSpec, validateSiteSpec, and buildRenderContext never validate object fields against their schema definitions. Proof: H4 (missing required description) and H11 (wrong field type) both produce renderable specs; the standalone gate catches them (1 error each) but the pipeline ignores it. For the 500-site factory, this means schema-invalid objects compile into live sites silently. Fix direction: run validateAgainstSchema per object during generation or as a validator layer, with error findings failing the render gate.

**G2: the url field type is warning-only and prefix-based.** "javascript:alert(1)" in a url-typed field produces a warning, not an error (S4 confirmed: 0 errors, 1 warning). The real guard is the downstream safe-link gate, but the schema layer over-permits. For factory scale, a stricter url check (error on non-http(s) schemes) belongs in the schema validator.

**G3: capability grants are evidence-blind.** capabilityOptions(def, {viewerId, controllerId, hasWebsite}) has no evidence input. reply/like/follow/propose_update are granted purely from schema flags and viewer identity. The projection layer's rule (a claim with state "unknown" must not render as fact) has no counterpart in the capability layer: an object with no evidence basis gets the same action set as a fully observed one. If the schema is to inform capability options, evidence state must become an input.

**G4: resolveQuery does not dedupe; duplicate active edges double-bind.** The generator dedupes related objects via Map, but the render path (resolveQuery, used by buildSemanticRenderModel and the renderer) pushes one binding per matching relationship. H17: two active provides edges bound s17h twice inside the same Services section, twice in ObjectRail. At factory scale this renders duplicate cards. Fix direction: dedupe by object id in resolveQuery's related branch.

**G5: relationship rules are unenforced and incomplete.** relationshipRules/isAllowedPredicate exist but no pipeline stage consults them: H6's provides-to-person mismatch is closed only by silent schema filtering in the generator, with no finding. Worse, only the 3 proof schemas have rules; product/location/person/article and all knowledge schemas return empty rule sets, and the generator matches predicates ("offers", "has_location", "has_member") that no schema declares allowed. The schema authority and the pipeline disagree about which predicates exist.

**G6: no duplicate-id detection, no cycle detection.** H14 (duplicate ids across schemas) resolves by silent last-wins in three separate Map constructions; H8 (reply cycles incl. self-loop) passes through untouched. Both fail closed today only because nothing traverses relationships recursively. Any future recursive traversal (thread rendering, graph walks) inherits these as live hazards.

**G7: schema-gate coverage is 3 schemas, not the vocabulary.** validateAgainstSchema can only check business/service/post. Product, location, person, article, and every knowledge schema skip the gate entirely ("no schema def" notes in V2, V3, V5, V7). The factory's site output renders all of these with zero field validation.

**G8: revocation semantics unenforced.** The documented rule ("inactive on the same predicate revokes") is not implemented: when active and inactive edges share a triple, the active one wins and the revocation is silently dropped (H7). If revocation is meant to be real, the generator and resolveQuery must honor it; if not, the documentation is wrong.

## 5. What held up (do not regress)

- Unknown/empty/injected schema ids can never become an owner or a section: typed validator failure, GenericObjectCard fallback, no output. (H1, H2, H3)
- Dangling relationships are dropped without invention. (H5)
- All four spec-mutation attacks caught with typed errors. (H12a-d, H13)
- Private objects never render; private-only graphs fail closed. (V5, H16)
- Capability invariants hold across the full viewer matrix (follow only identity-backed, like only likeable, reply only post+signed-in, propose_update only controller, open_website only with URL). (S2)
- Component eligibility is self-consistent: all 50 schema-declared component pairings validate. (V8)
- Deterministic: identical graphs yield byte-identical specs. (V2)
- Fast: 421 objects / 420 relationships through the full pipeline in 6 ms. (V7)
- Agent tool descriptions are deterministic and schema-derived. (S3)

## 6. Repro

On the Pig, from /home/nolan/projects/ping (branch fyd-factory):
NODE_OPTIONS="--require /mnt/c/Users/nolan/transfer/register.cjs" node_modules/.bin/tsx /mnt/c/Users/nolan/transfer/fuzz.ts
(register.cjs stubs .css imports so the renderer chain loads under Node; mirrors the repo's own jest css stub. No repo files touched.)
Master copies: ~/workspace/fyd-factory/fuzz/fuzz.ts, register.cjs, fuzz-results.json.
