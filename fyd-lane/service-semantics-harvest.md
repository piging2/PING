# Service/Offer Semantics Harvest (code archaeology lane)

Survey date: 2026-09-21. Repos: `/home/nolan/projects/ping` (website, branch `fyd/sitespec-generator`, read-only via Pig bridge) and `/home/nolan/ping` (PING runtime, reachable; surveyed only where relevant). No code invented below; every claim has a file+line pointer.

## 1. Service/Offer semantics: what exists

### Known schema ids (substrate layer)
`src/lib/ping/types.ts:66-80` — `KNOWN_OBJECT_SCHEMAS` includes:
- `ping.social.service@1`, `ping.social.product@1`, **`ping.social.offer@1`**

`ping.social.offer@1` is a KNOWN schema id only. It has NO `FYDSchemaDef` in `src/fyd/sitespec/schemas.ts` and nothing emits objects of that schema. Status: dormant name, zero emission.

### Full schema defs (site-compiler layer)
`src/fyd/sitespec/schemas.ts`:
- `SERVICE_SCHEMA` (id `ping.social.service@1`), lines 71-87. Fields: `title` (required), `description` (required), `price_hint`, `duration`. Rendered as cards in Services sections. Relationship: `provided_by` -> `ping.social.business@1`. `identityBacked: false`, `likeable: true`.
- `BUSINESS_SCHEMA` (lines 44-70) declares Business -> Service/Product via predicate **`provides`**, meaning "Services or products the business offers."
- There is no PRODUCT_SCHEMA or OFFER_SCHEMA def in this file (product schema `ping.social.product@1` is referenced but has no def; same for `ping.social.offer@1`).

### Service emission (the live path)
`src/fyd/proceduralize/proceduralizer.ts:848-876` — the ONLY live Service/Product emission:
- Iterates JSON-LD `EntityCandidate`s; `isService = e.types.includes("Service")`, `isProduct = e.types.includes("Product")`.
- Skips entities without a `title` field.
- Creates `ping.social.service@1` / `ping.social.product@1` objects with fields `name`, `description` (+ `claimKind: "website_statement"`), both tagged `DIRECT_FACT`.
- Emits relationship via `mkRel(businessId, "offers", objId, \`proceduralizer:project:${kind}:${e.key}\`)` (line 874).

**Predicate inconsistency (recorded, not judged):** the schema declares `provides`; the proceduralizer emits **`offers`**; the generator accepts both (`src/fyd/proceduralize/generator.ts:66-67`, `service: ["provides", "offers"]`, first = primary). A future lane should not invent a third predicate.

### schema.org property mappings
`src/fyd/proceduralize/structured-data.ts:376-394` — `PREDICATE_MAP`:
- `makesOffer` -> `makes_offer` (line 391)
- `areaServed` -> `serves_area` (line 392)
- Also present: `location`/`address` -> `located_at`, `worksFor` -> `works_for`, `employee` -> `has_employee`, `containsPlace` -> `contains_place`, etc.

Mechanism (`structured-data.ts:519-530`): for every `@id` reference on an entity property, a `StructuredRelation` is emitted with `predicate = PREDICATE_MAP[property] ?? "references"`. So a real JSON-LD `makesOffer` @id ref DOES produce a `makes_offer` PingRelationship (`proceduralizer.ts:878-889`, the generic structured-relation loop), when both endpoints project to objects.

**Latent gap:** the generator's service-role grouping (`generator.ts:66`) only matches `provides`/`offers`. A `makes_offer` relationship reaches the graph but never populates the Services section. Likewise `serves_area` has no consumer.

### `areaServed` literal path
`structured-data.ts:338` — `areaServed` -> `area_served` fact field. Fixture usage only (`fixtures-structured.ts:54`: `areaServed: "Mesa County, Colorado"`). No rendering consumer observed.

### Ask lane
`src/lib/ping/ask-composer.ts:399-411` — the service-answer branch matches questions with words service/services/offer/offers/provide/do, reads a `services` field on the target, and collects related objects whose schema is in `["ping.social.service@1", "ping.social.product@1", "ping.social.offer@1"]`, citing evidence refs. So the dormant `ping.social.offer@1` schema id is already handled at answer time; emission is the missing piece.

### No OfferCatalog / itemOffered / serviceType anywhere
- Grep for `OfferCatalog`, `itemOffered`, `makesOffer` (as schema emission), `serviceType` across `src/` finds NO implementation. `makesOffer`/`areaServed` appear only as the two PREDICATE_MAP entries and in comments/docs.
- `git log --oneline -S` for `OfferCatalog`, `itemOffered`, `serviceType` -> zero commits. No removed implementation.
- `git log -S ping.social.service` -> commits `750c40e` (FYD sitespec: finish schema-namespace map; deterministic project ids), `651e916` (FYD site builder), `f59da64` (fyd/ask), `3cdc8ec` (Lane A object substrate). All introduced service as current machinery, never removed.
- `src/fyd/proceduralize/STRUCTURED-DATA.md:167` lists `makesOffer` as an *unsupported-property* gap ("terms we have no PING field for yet") — the doc lags the code: PREDICATE_MAP maps it, but no render path consumes `makes_offer`.
- Test fixture with schema.org Service/Product exists: `src/fyd/proceduralize/__fixtures__/fixtures-structured.ts:185-212` (`FIXTURE_SERVICE_PRODUCT`: Organization + Service "Furnace repair" + Product, with `provider: @id` backlink).

## 2. Deterministic ID law (website lane)

The website lane deliberately does NOT use PING runtime identity. Per `proceduralizer.ts:544-557` (Grill 28 verdict): `IdentityAuthority.generate_id()` is non-deterministic by design (UUIDv7) and would break re-projection dedup; `generate_deterministic_id()` is "semantically identical to this hash but would couple a browser-safe lane to the Python runtime." When a website-derived business is promoted via the proposal path, the runtime mints the canonical id (`src/lib/ping/ping-object-reader.ts:500`).

Proven deterministic mechanism, all SHA-256 hex via pure-TS `sha256Hex` (`src/fyd/proceduralize/sha256.ts`, browser-safe, no node:crypto):

1. **Business id** — `deriveBusinessId(sourceUrl, controllerId, scalar)` (`proceduralizer.ts:558-571`):
   `"website-business-" + sha256Hex(canonical).slice(0,16)`, where `canonical = JSON.stringify({url: sourceUrl, controller: controllerId, fields: sorted [k, v] pairs})`. Same website+fields+controller -> same id; re-projection dedupes.
2. **Relationship id** — `deriveRelationshipId(subject, predicate, object)` (`proceduralizer.ts:573-576`):
   `"rel-" + sha256Hex("subject|predicate|object").slice(0,16)`. No counters, no allocation order.
3. **Service/Product object id** — `proceduralizer.ts:858`:
   `` `${businessId}-service-${sha256Hex(entityKey).slice(0,12)}` `` where `entityKey` is the JSON-LD node `@id` or `blank:` + sha256 of canonicalized node (from `entityCandidates`, `structured-data.ts:253-272`; identical blank nodes merge).
4. **Blank-node entity keys** — `entityCandidates` (`structured-data.ts:253-272`): `blank:` + sha256Hex(canonicalJson(node minus @id)); canonical JSON sorts keys recursively (`canonicalJson`, lines 230-244).

**Reuse point (a):** a Service-extraction lane emits service objects as
`` `${businessId}-service-${sha256Hex(entityKey).slice(0,12)}` `` and Business->Service relationships as `rel-` + sha256(subject|predicate|object), predicate `offers` (live) or `provides` (schema-declared; generator accepts both). Determinism contract: `STRUCTURED-DATA.md` section 8 — same source bytes + observedAt -> byte-identical facts, entity keys, object IDs, relationships.

Runtime-repo identity for reference: `/home/nolan/ping/OBJECT_IDENTITY_SPEC_FINAL.md` — CanonicalHash = SHA-256 of canonical serialization; IdentityAuthority is the event-identity owner. Not invoked by the website lane.

## 3. Relationship predicates (general primitive)

- **General primitive:** `PingRelationship` (`src/lib/ping/types.ts:114-124`): `{id, subject, predicate, object, status: "active"|"inactive", createdAt, evidenceRef}`. `evidenceRef` = "Canonical event id this projection was derived from." Revocation vocab: `inactive` on same predicate revokes.
- **No predicate enum.** Predicates are free strings; the de-facto vocabulary is `PREDICATE_MAP` (`structured-data.ts:376-394`) plus lane-emitted predicates. Full current list: `located_at`, `has_logo`, `has_image`, `published_by`, `authored_by`, `works_for`, `about`, `part_of`, `main_entity_of`, `primary_image_of`, `contains_place`, `has_department`, `has_sub_organization`, `parent_organization`, `member_of`, `founded_by`, `has_employee`, `has_brand`, `makes_offer`, `serves_area`, `provides`, `offers`, `links_to`, `has_website`, `publishes`, `employs`, `has_member`, `has_location`.
- **Business->Location:** `located_at` (schema-declared, `schemas.ts:63`); generator also matches `has_location` as alternate (`generator.ts:68`).
- **Business->Person:** `employs` (schema-declared, `schemas.ts:64`); generator also matches `has_member` (`generator.ts:69`).
- **Business->Service:** schema-declared `provides` (`schemas.ts:60`); live emission uses **`offers`** (`proceduralizer.ts:874`); generator matches both, `provides` first (`generator.ts:66-67`); reverse `provided_by` declared on the service schema (`schemas.ts:83`).
- **Emission helper:** `mkRel(subject, predicate, object, evidenceRef)` (`proceduralizer.ts:727-738`) — builds deterministic `rel-` id, `status: "active"`, evidence ref string like `proceduralizer:project:service:<entityKey>`.
- **Role grouping:** `ROLE_PREDICATES` in `generator.ts:60-70` is the consumer contract a Service lane must satisfy: `service: ["provides", "offers"]`, `product: ["provides", "offers"]`, `location: ["located_at", "has_location"]`, `person: ["employs", "has_member"]`, `post/article: ["publishes"]`.

**Reuse point (b):** use predicate `offers` (matches the single live emitter) for Business->Service; `provides` is equally accepted by the generator. Do NOT use `makes_offer` for graph edges the renderer must consume: it exists in PREDICATE_MAP but is invisible to section grouping. `located_at` / `employs` are the settled analogues.

## 4. Evidence/provenance types

- **FactClass** (`proceduralizer.ts:58-63`): `"DIRECT_FACT" | "DERIVED_FACT" | "INFERENCE" | "GENERATED_COPY" | "USER_OVERRIDE"`. JSON-LD literal facts are `DIRECT_FACT` (`structured-data.ts:499`). Every projected object carries `fieldClasses: Record<objectId, Record<fieldName, FactClass>>` (Grill 7), populated in `mkObject` (`proceduralizer.ts:702-724`).
- **Visibility** (`proceduralizer.ts:71`): `"public" | "private"`; classified at extraction (`visibilityForProperty`), private withheld before projection (Grill 19). `streetAddress`/`postOfficeBoxNumber` are private by policy (`structured-data.ts:352`).
- **ParsedFact** (`proceduralizer.ts:76-93`): `{name, value, sourceType, inferred, claimKind?, evidenceDetail?, factClass?, visibility?, property? (compact schema.org property), entityId? (node @id or blank key)}`.
- **UnsupportedEvidence** (`structured-data.ts:299-310`): `{kind: "malformed-block" | "expansion-failed" | "unmapped-property" | "unmapped-node-type" | "site-chrome-node", blockIndex, entityKey?, property?, reason, detail?}` — the honest-gap record.
- **ObjectProvenance** (`types.ts:94-99`): `{kind: "canonical-journal" | "website-derived", ref, updatedRefs?, derivedAt}`. Website-derived objects get this in `mkObject` (the `provenance` closure value).
- **StructuredRelation** (`structured-data.ts:287-294`): `{subjectKey, predicate, objectKey, property (compact schema.org property), blockIndex}` — relationship-level provenance before projection.
- **Ask lane evidence:** `AskEvidenceRef` (`types.ts:204-209`): `{kind: "object" | "relationship" | "field", id, label, detail?}`; `AskAnswer` (`types.ts:310-319`): `{answer, evidenceRefs, relatedObjects, suggestedActions, proposal, partial}` — every factual sentence cites `[n]`. `AskFydAnswer` extends it (`src/fyd/ask/types.ts:72`).
- **Binding classifications** for presentation (`src/fyd/sitespec/graph.ts`): `"direct" | "derived" | "generated" | "owner_authored"`, enforced by `verifyPresentationBinding` at the projection seam.

**Reuse point (c):** service fields emit as `ExtractedField`s with `factClass: "DIRECT_FACT"`, `sourceType: "json-ld"`, `property: <schema.org property>`, `entityId: <entityKey>`; relationships carry `evidenceRef` strings (`proceduralizer:project:service:<entityKey>` pattern) and the `property`/`blockIndex` survive on `StructuredRelation`. The Ask lane cites object/relationship/field refs automatically once service objects exist.

## 5. Extraction pipeline (where a Service lane hooks in)

Pipeline stages, all in `src/fyd/proceduralize/proceduralizer.ts` (comments list them, lines 140-516):
1. DISCOVER (140) — candidate sources from seed URL.
2. ACQUIRE (166) — fetch raw bytes; the impure boundary.
3. PARSE (190) — raw text -> structured facts. Deterministic.
4. NORMALIZE (286) — cleaned facts.
5. EXTRACT (322) — candidate fields with classification.
6. PROVENANCE (370) — what/source/observed/evidence attachment; the emission choke point (`provenance()`).
7. RESOLVE (412) — one canonical value per field.
8. RELATE (491) — fields -> relationships between emitted objects.
9. PROJECT (516) — resolved fields + entities -> PingObject graph (`mkObject`/`mkRel`, lines 702-738).

JSON-LD ingestion: `extractStructuredData` (`structured-data.ts:442`) -> `expandJsonLdBlocks` (172; uses `jsonld.flatten`, line 193) -> `entityCandidates` (253; deterministic blank-node keys) -> fact/relationship extraction (477+; `PREDICATE_MAP`, `LITERAL_FACTS`) -> feeds `project()` via `ProjectOptions.entities/entityFields/relationships`.

Service emission sits inside Stage 9 (`proceduralizer.ts:848-876`), consuming `opts.entities` + `opts.entityFields` and the business id from `deriveBusinessId`. **A future Service-extraction lane hooks exactly here:** extend the Service/Product block (or the property mappings that feed it) — e.g. map `makesOffer` @id refs, `OfferCatalog` item lists, `provider` backlinks, and `serviceType`/`areaServed` literal properties into the existing `ping.social.service@1` object shape + `offers` relationship. Do not invent a new object id scheme.

## 6. Dependencies

`package.json` line 31: `"jsonld": "9.0.0"`. No schema.org-specific or extraction libraries beyond jsonld. SHA-256 is hand-rolled (`sha256.ts`) to stay browser-safe.

## 7. Dormant code inventory (answer to checklist item 6)

- `ping.social.offer@1` — known schema id (`types.ts:78`) + Ask-time handling (`ask-composer.ts:402`); no schema def, no emission. Dormant by omission, not removed.
- `makes_offer` / `serves_area` — mapped in PREDICATE_MAP and emitted from real JSON-LD @id refs, but no section/grouping consumer. Half-wired.
- `FIXTURE_SERVICE_PRODUCT` fixture — Service/Product nodes covered in structured-data tests; projection covered via generator tests ("Services" section).
- No OfferCatalog / itemOffered / serviceType implementation ever existed (git -S clean).

## Summary of reuse points

| # | Reuse point | Location |
|---|---|---|
| (a) Deterministic identity | `deriveBusinessId` / `deriveRelationshipId` / `${businessId}-service-${sha256Hex(entityKey).slice(0,12)}`; pure-TS `sha256Hex`; blank-node keys `blank:+sha256(canonicalJson)` | `proceduralizer.ts:558-576,858`, `structured-data.ts:230-272`, `sha256.ts` |
| (b) Business->Service predicate | `offers` (live emitter) / `provides` (schema-declared; generator primary). Generator `ROLE_PREDICATES` | `proceduralizer.ts:874`, `schemas.ts:60`, `generator.ts:60-70` |
| (c) Evidence/provenance | `FactClass` (DIRECT_FACT for JSON-LD), `ParsedFact{property,entityId}`, `StructuredRelation{property,blockIndex}`, `PingRelationship.evidenceRef`, `ObjectProvenance`, `UnsupportedEvidence`, `AskEvidenceRef` | `proceduralizer.ts:58-93`, `structured-data.ts:287-310`, `types.ts:94-124,204-209` |
| Hook-in point | Stage 9 PROJECT, Service/Product block | `proceduralizer.ts:848-876` + `PREDICATE_MAP` (`structured-data.ts:376-394`) |
| Schema to emit | `ping.social.service@1` (SERVICE_SCHEMA: title, description, price_hint, duration) | `schemas.ts:71-87` |
| jsonld | v9.0.0, `jsonld.flatten` at `structured-data.ts:193` | `package.json:31` |
