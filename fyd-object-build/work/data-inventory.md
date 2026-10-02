# Data Inventory: Happy Place vs Coppersmith Object Experience

Read-only inventory, compiled 2026-09-22. No source file was modified.

## Sources inventoried

| # | Source | What it is |
|---|--------|-----------|
| 1 | `~/workspace/fyd-lane/repo/happy-place-rich-graph.ts` | Lane B 9-object / 10-relationship RICH fixture (`ping.knowledge.*` vocabulary). Generator/renderer testbed, NOT the production graph. |
| 2 | `~/workspace/fyd-lane/repo/graph.ts`, `render-model.ts` | Presentation-binding verifier and semantic render model (website builder layer). No per-object UI contract here. |
| 3 | `~/workspace/fyd-build/evidence/observations-{happy-place,coppersmith-plumbing}-2026-09-22.json` | Raw website observations (service cards + business fields) extracted 2026-09-22 by `service-cards.ts v2-2026-09-22`. Not graph objects yet. |
| 4 | Pig `/home/nolan/ping/var/fyd-projections/{happy-place,coppersmith-plumbing}.json` | CANONICAL production projections: digest-verified, machine-generated `ping.social.*` vocabulary. This is the data the React UI consumes. |
| 5 | Pig `/home/nolan/projects/ping/src/fyd/object/{types,view,object-projection}.ts` + `/home/nolan/projects/ping/src/fyd/components/object-rail.tsx` | Existing projection adapter layer and rail component. |
| 6 | Pig `/home/nolan/projects/ping/data/fyd-owner/happy-place.json` | Owner store (owner-attested corrections/order). No coppersmith owner store exists. |

Sandbox `grep -ril coppersmith` found only self_improvement memory reconciliations, no graph fixture. **No Coppersmith fixture exists in this sandbox; the Pig projection is the only source.**

### Vocabulary note

Two graph vocabularies exist and are NOT interchangeable:
- `ping.knowledge.business@1` (lane B rich fixture, 9 objects: business, website, location, 4 services, 2 people). Display-only; never served to production.
- `ping.social.business@1` (production projections on the Pig). The UI data contract consumes these.

---

## 1. HAPPY PLACE (production projection)

**Path:** Pig `/home/nolan/ping/var/fyd-projections/happy-place.json` (also readable on the website repo via `ping-object-source.ts` read seam). 8 objects, 7 relationships. dumpedAt 2026-09-22T14:50:58Z.

### Object types present

| Object | Schema | Title | Fields |
|--------|--------|-------|--------|
| `website-business-6fa5ebd99d72c4cb` | `ping.social.business@1` | Happy Place Carpentry LLC | description, area_served ("Benton, Linn, Marion, and Polk Counties, Oregon"), email (taylor@happyplacecarpentry.com), images ("https://happyplacecarpentry.com/images/hero-background-enhanced.jpg"), keywords, phone (+15412865190), price_range ($$), title, website (https://happyplacecarpentry.com), locality ("Adair Village, OR, US") |
| `website-business-6fa5ebd99d72c4cb-location` | `ping.social.location@1` | Adair Village, OR, US | address_locality, address_region (OR), address_country (US), locality, claimKind |
| 5 services | `ping.social.service@1` | see services list | name, description, service_href (`/estimate?service=<slug>`), claimKind |
| 1 service | `ping.social.service@1` | Pergola Design Consultations | name, description (no href) |

**No person objects. No external_identity objects. No website objects. No media objects.**

### Relationships (7)

- business `--offers-->` service: Repairs, Fencing, Painting, Drywall, Restoration
- business `--located_at-->` location (Adair Village, OR, US)
- business `--provides-->` service: Pergola Design Consultations

All status `active`, createdAt 2026-09-21T13:50:00Z, evidenceRef e.g. `proceduralizer:project:service-card:...`.

### Services list (clickable as objects)

1. Repairs: "Small problems usually tell you about a bigger one. Fix them early and they're repairs. Wait too long and they become replacements." -> /estimate?service=repairs
2. Fencing: "A fence should stay straight, the gate should close without dragging, and it should still look good after a few Oregon winters." -> /estimate?service=fences
3. Painting: "Most paint failures start before the first coat goes on. We clean, sand, repair damaged areas, and prime everything first..." -> /estimate?service=painting
4. Drywall: "From small hole repairs to full installations, we handle drywall work that's smooth, seamless, and ready for paint." -> /estimate?service=drywall
5. Restoration: "Bring worn surfaces back to life. We refinish fences, decks, and other woodwork..." -> /estimate?service=restoration
6. Pergola Design Consultations (predicate `provides`, not `offers`): "On-site pergola design consultations covering shade, structure, and materials for your yard." (no href)

### Evidence / provenance

Every object: `provenance = { kind: "website-derived", ref: "website-ingestion:https://happy-place-platform.vercel.app/", derivedAt: "2026-09-21T13:50:00Z" }`. Every field carries `claimKind: "website_statement"`. Owner overlay active: `meta.overlayEventIds` is non-empty; owner store at `/home/nolan/projects/ping/data/fyd-owner/happy-place.json` carries phone correction/revert events and a service order override (`svc-decks, svc-fences, svc-pergolas, svc-bathrooms, svc-custom-work`).

### Media

Contract supports media (`ObjectMediaView`: id, role logo|hero|gallery, src, alt, rightsSource, rightsBasis, sourceUrl, digest, observedAt), joined via `Business represented_by Media` relationships in the manifest. **But:** no media objects and no `represented_by` relationships exist in the projection. The business has only a raw `fields.images` URL (external hotlink, NOT rights-authorized). So the media array in the UI projection is currently empty for Happy Place. Media files: nothing local, nothing in the projection.

---

## 2. COPPERSMITH (production projection)

**Path:** Pig `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`. 8 objects, 7 relationships. dumpedAt 2026-09-22T14:50:47Z, dumper `fyd-projection-dump@1.1.0`, generatedAt 2026-09-21T12:01:10.844Z. `overlayEventIds: []` (no owner store).

### Object types present

| Object | Schema | Title | Fields |
|--------|--------|-------|--------|
| `website-business-2f1327c09d622175` | `ping.social.business@1` | Coppersmith Plumbing - HVAC - Mechanical | description, hours ("Mo,Tu,We,Th,Fr 07:30-16:00"), locale (en_US), phone (970-245-3869), site_name, title, type ("website"), updated_time (2025-10-01T10:31:10-06:00), website (https://coppersmithplumbing.com), locality ("Grand Junction, Colorado, 81501, United States") |
| `website-business-2f1327c09d622175-ext-89604af059c2` | `ping.social.external_identity@1` | coppersmithplumbing.com | url (https://coppersmithplumbing.com), platform ("coppersmithplumbing.com"), claimKind. Description: "External profile linked from the website's structured data." |
| `website-business-2f1327c09d622175-location` | `ping.social.location@1` | Grand Junction, Colorado, 81501, United States | address_locality (Grand Junction), address_region (Colorado), postal_code (81501), address_country (United States), locality, claimKind. Description: "Coarse public location claim from the website's structured data." |
| `website-business-2f1327c09d622175-person-377048d67856` | `ping.social.person@1` | coppersmithplm | name ("coppersmithplm"), claimKind. Description: "Person described in the website's structured data." |
| 4 services | `ping.social.service@1` | see services list | name, description, service_href (https://coppersmithplumbing.com/services/...), claimKind |

### Relationships (7)

1. business `--offers-->` service "Heating & Cooling" (evidenceRef `proceduralizer:project:service-card:elementor-cta-services:cooling`)
2. person "coppersmithplm" `--works_for-->` business (evidenceRef `proceduralizer:structured:worksFor`)
3. person "coppersmithplm" `--links_to-->` external_identity "coppersmithplumbing.com" (evidenceRef `proceduralizer:project:sameAs:https://www.coppersmithplumbing.com/author/coppersmithplm/`)
4. business `--offers-->` service "Ventilation" (evidenceRef `...:ventilation`)
5. business `--located_at-->` location (evidenceRef `proceduralizer:project:postal-address`)
6. business `--offers-->` service "HVAC" (evidenceRef `...:hvac`)
7. business `--offers-->` service "Plumbing" (evidenceRef `...:plumbing`)

### Services list (clickable as objects)

1. Plumbing: "Are you working on new construction for residential homes or commercial buildings?" -> https://coppersmithplumbing.com/services/plumbing/
2. Heating & Cooling: "We maintain or repair furnaces, air conditioning units, heat pumps, mini split systems and more." -> https://coppersmithplumbing.com/services/hvac/cooling/
3. HVAC: "We set up complete heating, cooling, and ventilation systems. Get your HVAC needs done." -> https://coppersmithplumbing.com/services/hvac/
4. Ventilation: "Building a new office complex or need the current system assessed? Our specialists can help." -> https://coppersmithplumbing.com/services/hvac/ventilation/

### Evidence / provenance

Every object: `provenance = { kind: "website-derived", ref: "website-ingestion:https://www.coppersmithplumbing.com/", derivedAt: "2026-09-21T13:50:00Z" }`. Claim kind `website_statement`. Freshest evidence refs are proceduralizer-level (e.g. `proceduralizer:project:sameAs:https://www.coppersmithplumbing.com/author/coppersmithplm/`, `proceduralizer:structured:worksFor`).

### Media

Same gap as Happy Place: no media objects, no `represented_by` relationships, no `images` field on the business. Media array in the UI projection is empty for Coppersmith. No local media files.

---

## 3. THE VISIBLE DIFFERENCE (product proof requirement)

**Coppersmith has exactly this that Happy Place does not:**

1. A `ping.social.person@1` object: "coppersmithplm" (name field; from the site's structured data / author archive URL).
2. A `ping.social.external_identity@1` object: "coppersmithplumbing.com" (platform = "coppersmithplumbing.com", url https://coppersmithplumbing.com).
3. Relationship person `--works_for-->` business.
4. Relationship person `--links_to-->` external_identity.

Happy Place has nothing in the person or external_identity slots. Its relationship predicates are only `offers`, `located_at`, `provides`. If the UI renders the expanded object view as identity + relationships + actions, the Coppersmith expansion shows a People section (coppersmithplm, Works for) and an external-identity link (coppersmithplumbing.com, linked profile), and the Happy Place expansion shows neither. That is the structural difference the proof must make visible.

Caveat for UI honesty: "coppersmithplm" is an author-archive handle from the site's structured data, not a named human. Label it as claimed/website-derived, not as a verified employee.

---

## 4. Existing UI data contract (yes, it exists)

There is a full existing chain on the Pig (all read-only for this lane):

1. **Source:** `PingProjection` from `/home/nolan/projects/ping/src/fyd/data/ping-object-source.ts`: digest-verified `ObjectGraph` + `meta` (ProjectionMeta: siteId, dumpedAt, dumperVersion, graphDigest sha256, overlayEventIds) + `ownerOverlay` + `presentationIntent`. Reads `/home/nolan/ping/var/fyd-projections/<siteId>.json` (env `FYD_PROJECTION_DIR` for tests). Hard-fails on missing/tampered projection, never falls back to fixtures.
2. **Read model:** `loadObjectView(slug)` in `/home/nolan/projects/ping/src/fyd/object/view.ts` -> `ObjectView` (id, schema, name, category, locationLabel, summary, media[], services[], serviceArea[], contact, capabilities[], provenance, ownerUpdatedAt, sampleQuestions, fieldCorrections). Also `loadCircleProjection(slug)` -> `CircleProjection` (id, name, category, locationLabel, tagline, topFacts[], background image|gradient, capabilities, provenanceLabel, provenanceDetail, sampleQuestions).
3. **Card/Node prop:** `objectViewToProjection(view)` in `/home/nolan/projects/ping/src/fyd/object/object-projection.ts` -> `ObjectProjection`: id, schema, kindLabel ("Business"|"Person"|"Service"), name, category: Fact|null, location: Fact|null, summary: Fact|null, facts: Fact[], people: RelatedRef[], contact, capabilities[], provenance, sampleQuestions, ownerUpdatedAt, media[].
4. **Evidence shape:** there is NO `EvidenceSummary` type. The existing equivalent is per-claim: `Fact { label, value, evidence: ClaimEvidence }`, `ClaimEvidence { state: observed|inferred|unverified|unknown|unavailable|withheld, receipt, asOf, steps: EvidenceStep[] }`, `RelatedRef { id, name, kindLabel, relation, evidence }`, `ProvenanceProjection { label, ref, derivedAt }`.
5. **Capabilities:** `ObjectCapability = view | ask | follow | like | call{href,label} | email{href,label} | website{href,label}`. Only rendered when the underlying value exists. `buildCapabilities` in view.ts.
6. **Rail component:** `ObjectRail` in `/home/nolan/projects/ping/src/fyd/components/object-rail.tsx`: margin rail on wide viewports, drawer/sheet on narrow, built from ObjectCard elements over `ObjectProjection`. Server builds cards; client only places them.
7. **Core graph types:** `PingObject` in `/home/nolan/projects/ping/src/lib/ping/types.ts` (id, schema, controllerId, visibility, title, description, fields: Record<string, string|string[]>, createdAt, updatedAt, provenance, ownerFieldCorrections?); `ObjectGraph` and `ViewerContext { viewerId, displayName }` in `/home/nolan/projects/ping/src/fyd/sitespec/types.ts`.

### GAP the object experience build must close

`objectViewToProjection` currently hardcodes `people: []` and does not surface `external_identity` objects at all. The relationship data EXISTS in the projections (Coppersmith works_for/links_to) but never reaches the React UI contract. The object experience build needs to populate `people: RelatedRef[]` (and an external-identity equivalent) from the real `ObjectGraph` relationships, then the Happy Place vs Coppersmith difference becomes visible in the rail/expanded view. Media (`ObjectMediaView` with rights fields) is fully typed but has zero data for either business; both will render media-empty until a manifest attaches `represented_by` media.

### Exact import paths for a React component

```ts
import { loadObjectView, loadCircleProjection } from "@/fyd/object/view";
import { objectViewToProjection } from "@/fyd/object/object-projection";
import type { ObjectProjection, RelatedRef, Fact } from "@/fyd/object/object-projection";
import type { ObjectView, ObjectCapability } from "@/fyd/object/types";
import type { ObjectGraph, ViewerContext } from "@/fyd/sitespec/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";
// projection file: /home/nolan/ping/var/fyd-projections/<happy-place|coppersmith-plumbing>.json
// (server-only read seam: src/fyd/data/ping-object-source.ts, FYD_PROJECTION_DIR for tests)
```
