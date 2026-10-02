# GRAPH ENRICHMENT GAPS — HPP source vs FYD live graph

**Date:** 2026-09-25/26 (night sprint). **Read-only analysis.** No graph writes, no code changes, no site generation.
**Sources:** HPP source repo `/home/nolan/projects/happy-place-platform` (config-first Next.js site) vs live FYD HPP graph served from `/home/nolan/ping/var/fyd-projections/happy-place.json` (fixture base `/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` + 25 `fyd-seed-ovl-*` journal overlays).

## Headline

The live HPP graph holds **8 objects** (1 business, 1 location, 6 services) and **2 relationship predicates** (`offers` x6, `located_at` x1). It was machine-extracted from a pinned 2026-09-21 snapshot of the *deployed Vercel site* (30 HTML/JSON-LD observations), not from the HPP source repo. The source repo contains a rich typed config layer — **13 services, 11 projects, 8 FAQs, 4 service-area cities, a branching estimate-question DAG, 2 named owners, 24 curated media records with service/project/city linkage, and exact trust claims** — almost none of which ever became objects. The generator is composing from a shallow graph; the semantic depth exists one directory away and was never ingested.

## Coverage summary

| Category | In source | In live graph | Status |
|---|---|---|---|
| Services | 13 typed (editorial descriptions, capabilities, estimate questions) | 6 (thin) | GAP: 7 missing, no capabilities/questions |
| Service grouping/hierarchy | Display groups hardcoded in `services/page.tsx:42-61` (6 groups) | none | GAP |
| Projects | 11 typed (story, estimate range, timeline, warranty, materials, tags, media) | 0 | GAP (largest) |
| Service areas | 4 cities + zips + county claims | 1 location ("Adair Village, OR, US") | GAP |
| Estimate funnel | 7-step wizard, branching question DAG (9 services, ~50 questions) | none | GAP (differentiator) |
| People/owners | 2 named owners w/ roles | 0 | GAP |
| Trust signals | CCB# 254240, licensed/bonded/insured, warranties | none | GAP |
| FAQ | 8 Q&As, categorized | 0 | GAP |
| Reviews | 0 (empty schema, "coming soon") | 0 | EMPTY SOURCE — do not fabricate |
| Media | 24 curated records w/ alt, service+project+city linkage, roles | manifests exist (5 items), no graph linkage | GAP: relationships missing |
| Materials | 12 (cedar, pressure-treated, composite...) | none | GAP (minor) |
| Navigation intent | 6-item nav config + homepage IA | none | GAP (compiler input) |
| SEO/JSON-LD | LocalBusiness (phone, email, address, areaServed, priceRange) | partly (via JSON-LD observations) | PARTIAL |

---

## Prioritized gaps (highest leverage first)

### 1. Projects — 11 rich project objects entirely absent
**Exists in source:** 11 projects in `website/src/config/projects.v1.json` (23 KB). Each carries: `id, title, service` (slug FK to services), `status`, `location{city,county,state}`, `completionDate`, `media{hero, after, gallery[]}` (ids FK to media registry), `story{challenge, solution, outcome, specialFeatures[]}`, `estimate{estimatedRange{low,high}, services[], materials[], timeline}`, `warranty{hasWarranty, warrantyType, warrantyYears, warrantyDetails}`, `tags[], featured, heroEligible, homepageEligible, slug`.
**In graph today:** zero project objects. The schema vocab already includes `ping.social.project@1` (`src/lib/ping/types.ts:69-78`) — it is simply unused for HPP.
**Carrier:** `ping.social.project@1` objects with relationships `depicts` (project -> media), `references` (project -> service via slug), `located_at` (project -> location), plus `warranty`/`estimate_range` as fields or typed claims. Featured/hero flags map to presentation intent, not new types.
**Caution:** all 11 list identical `completionDate: 2026-07-20`, all in Corvallis/Benton, story copy is thin/generic (e.g. challenge: "Property needed new fence installation"). Harvest structure + media + warranty + ranges; do not oversell story prose as editorial truth.

### 2. Services — 7 of 13 missing; survivors are thin
**Exists in source:** 13 services in `website/src/config/services.v1.json` (26 KB): `id, name, slug, description` (1-2 sentence editorial, craft voice), `icon, featured, homepageEligible, order, capabilities` (e.g. decks: `paintableSurface, surfaceType: wood, estimationAuthority: building`), `estimateQuestions[]` (fallback), `cardMediaId, archived`.
**In graph today:** 6 services (Repairs, Fencing, Painting, Drywall, Restoration, Pergola Design Consultations) extracted from HTML service cards — names only, no descriptions, no capabilities.
**Missing:** decks, bathrooms, finish-carpentry, historic-restoration, adus, pole-barns, flooring.
**Carrier:** existing `ping.social.service@1` objects (add the missing 7); `capabilities` as object fields; `featured`/`homepageEligible`/`order` as presentation-intent fields.

### 3. Service grouping — composition signal hardcoded, never modeled
**Exists in source:** services index page hardcodes 6 display groups (Outdoor Structures, Painting, Restoration, Repairs, Interior Services, Other) at `website/src/app/services/page.tsx:42-61`. The config JSON has **no** category/hierarchy field — this grouping is the only place it exists.
**In graph today:** nothing; services are a flat list (this is exactly the "structurally flat" verdict).
**Carrier:** no new object type needed — a `service_group` classification field or `member_of` relationship (the test-only rich fixture already uses `member_of`, unused in the served graph) on existing service objects. Alternatively a lightweight grouping intent in presentation intent.

### 4. Service areas — 4 cities + zips + counties vs 1 location
**Exists in source:** `website/src/config/cities.v1.json` — Philomath (Benton, 97370), Albany (Linn, 97321/97322), Monmouth (Polk, 97361), Independence (Polk, 97351), all `featured`, ordered. `company.v1.json` claims `serviceArea: "Benton, Linn, Marion, and Polk Counties, Oregon"` and `proof.serviceCounties: [Benton, Linn, Marion, Polk]`.
**In graph today:** one `ping.social.location@1` ("Adair Village, OR, US").
**Carrier:** additional `ping.social.location@1` objects (city-level, with county + zip fields) linked via `serves_area` from the business object. Note `ping.social.location@1` currently has **no** `FYDSchemaDef` (`src/fyd/sitespec/schemas.ts`) — schema def needed before it can be validated/rendered properly.
**Caution:** Marion County is claimed in `company.v1.json` but has no city in `cities.v1.json`; FAQ f2 lists only Benton/Linn/Polk. Source contradicts itself — harvest the 4 cities as fact, hold the Marion claim as disputed.

### 5. Estimate funnel — the true differentiator, zero graph presence
**Exists in source:** 7-step wizard (`website/src/components/estimate-wizard.tsx:39` — Service, Tell-us-about-project [skipped when intent is clear], Photos, Project Details, Property, Contact, Thank You). Live question source is TypeScript: `website/src/lib/interview-questions-v3.ts:629-643` (`SERVICE_QUESTIONS_MAP`) — 9 services, ~50 questions (select 37, number 12, textarea 1), each with `id, label, type, category` (intent/scope/material/condition) and a **`next` DAG** branching per answer plus `"*"` wildcard; measurement-typed questions (`area/length`, `square_feet/feet`). Config `estimateQuestions` in services JSON is only the fallback for services missing from the v3 map (repairs, drywall, restoration, pergolas). Submission today is a mailto to taylor@happyplacecarpentry.com via the `EstimateService` swap-point interface (`website/src/services/estimate.ts:46-90`); `/contact` is intentionally formless and redirects to the wizard.
**In graph today:** nothing. No capability, no question, no funnel object. This is Nolan's "Contact is not equivalent to Get an estimate" gap made concrete.
**Carrier:** an estimate/request capability on the business object (existing capability model) + question nodes. No fitting object type exists for interview questions today — this is the one place a new typed node (or capability-parameter structure) is genuinely warranted; do not force it into `service` fields. The `next` DAG must be preserved as structure, not flattened.
**Caution:** question trees exist in **two authorities** (v3 TS live, config JSON fallback) with visible drift (fences: config 13 vs v3 15 questions). Treat the v3 TS map as canonical; the config copy as fallback only.

### 6. People/owners — named humans absent
**Exists in source:** `company.v1.json` -> `owners[]`: **Taylor Happy** (Co-Owner, Lead Carpenter, "Bringing decades of hands-on craftsmanship to every project."), **Lanie Happy** (Co-Owner, Client Experience, "Helping every project feel clear, comfortable, and well cared for."). About page `website/src/app/about/page.tsx:83-103`: family-business narrative, owner portrait with descriptive alt. `brand.v1.json` `team: []` (no extended team).
**In graph today:** zero person objects. `ping.social.person@1` exists in vocab, unused for HPP.
**Carrier:** `ping.social.person@1` objects linked via existing `employs` predicate (already in declared vocab, `schemas.ts:62-65`) or an owner relationship; roles as fields.

### 7. Trust signals — exact claims never became claim objects
**Exists in source:** `company.v1.json` `proof` block: `ccbNumber: "CCB# 254240"` (Oregon), `insured: true`, `bonded: true`, `yearsInBusiness: "Est. 2024"`, `estimateResponse: "Most estimates scheduled within 1-2 business days"`. Per-project warranties: 10/11 are **2-year workmanship** (1/11 is 1-year). FAQ f1: licensed/insured, credentials on request; f4: permits handled; f7: workmanship + manufacturer warranties.
**In graph today:** nothing — no credential/trust objects, no warranty data.
**Carrier:** typed claim objects or fields on business/project objects with provenance (DIRECT_FACT from company config). **Do not harvest** `projectsCompleted: "125+"` — unverifiable against 11 documented projects; treat as owner claim pending evidence, never as rendered fact. No certifications, awards, or named insurer exist — do not invent any.

### 8. FAQ — 8 Q&As, structured, unused
**Exists in source:** `website/src/config/faq.v1.json` — `id, question, answer, category`; 8 entries: Credentials (CCB#/licensed/insured), Service Area, Estimates (wizard explainer), Process x2 (permits, timelines), Materials x2 (cedar/composite/vinyl; supply-your-own), Warranty. Rendered at `/faq` via `website/src/lib/faq.ts`. No lorem anywhere.
**In graph today:** zero FAQ objects; no FAQ schema exists in the object vocab.
**Carrier:** no existing object type fits cleanly — FAQ is the second genuine new-type candidate (or Ask-FYD knowledge attachments). Flag for the product call; do not shoehorn into `article`.

### 9. Reviews — empty schema; harvest structure only
**Exists in source:** `reviews.v1.json` = `{"reviews": []}`. Full schema exists (`website/src/types/reviews.ts:70`): reviewer, rating, date, body, status, `projectId` FK, source, location. `/reviews` degrades to "Google reviews coming soon." Review JSON-LD (AggregateRating) is built but dormant.
**In graph today:** zero review objects — correctly so.
**Carrier:** none needed until real reviews exist. Harvest the **schema** so the generator knows a reviews section is *eligible but empty* (renders nothing, never fakes). This is the anti-fake-reviews mechanism.

### 10. Media relationships — curated linkage exists, graph has none
**Exists in source:** `website/src/config/media.v1.json` — 24 curated records, all with `alt` + `description`; linkage: `service` on 21/24, `projectId` on 20/24, city/county/state; roles: hero 6, gallery 12, after 1, before 1, brand 3; 8 featured; variants (original/webp/avif/thumbnail) with dimensions + content hashes. `website/public/images/`: 234 files (211 project files in 15 subdirs, 7 service SVG icons, brand assets). **187 of 211 project files are NOT in the registry** — only 24 curated/linked.
**In graph today:** media manifests exist (`src/fyd/media/manifests/happy-place.json`, 5 items) consumed by `heroMediaFor`/`galleryMediaFor`, but the graph has **no** media->service or media->project relationships; selection is manifest-driven, not graph-driven.
**Carrier:** existing `ping.social.media@1` objects (24 curated) with `depicts` relationships to service/project objects and role fields (hero/gallery/after/brand). The uncurated 187 files stay out until curated.

### 11. Navigation intent — compiler input, not yet modeled
**Exists in source:** `website/src/config/navigation.v1.json` — Home `/`, Services `/services`, Our Work `/our-work`, About `/about`, Reviews `/reviews`, Get an Estimate `/estimate`. Homepage IA (`website/src/app/page.tsx`): hero -> trust strip -> services -> featured projects -> (empty) testimonials -> owner spotlight -> CTA.
**In graph today:** nothing navigational.
**Carrier:** not an object type — this is presentation-intent / template-composition input: section eligibility + ordering + the IA sequence. Feed to the template compiler as intent, not as objects.

### 12. Materials vocabulary — minor
**Exists in source:** `website/src/config/materials.v1.json` — 12 materials (cedar, pressure-treated, composite...).
**In graph today:** nothing.
**Carrier:** simple controlled-vocabulary list (not objects); useful for estimate questions and project material tags.

---

## What NOT to harvest

- **Blog:** 3 posts are explicitly placeholder (`blog/page.tsx:13` — "Placeholder blog data - will be replaced"). Exclude.
- **Reviews/before-after:** empty schemas (`reviews: []`, `pairs: []`). Harvest structure, never content.
- **"125+ projects":** unverifiable claim vs 11 documented projects. Owner-claim pending evidence; never rendered as fact.
- **Marion County:** claimed in company config, absent from cities config, contradicted by FAQ. Disputed; do not render until resolved.
- **Question-tree config copy:** fallback only; the v3 TS map is canonical. Never merge both.
- **`manifest.v1.json`'s `presentation.v1.json`:** referenced file does not exist. Dead reference; ignore.
- **Non-`*.v1.json` config variants** (`*.main.json`, `*.backup*`): merge/conflict leftovers, not loaded by `registries.ts`/`projects.ts`/`company.ts`. Ignore.

## Method notes

- HPP source structure: all semantic content under `/home/nolan/projects/happy-place-platform/website/`; loaders read `config/*.v1.json` (`website/src/lib/registries.ts:14`, `projects.ts:19`, `company.ts:15`).
- FYD object model: `PingObject`/`PingRelationship` at `/home/nolan/projects/ping/src/lib/ping/types.ts:108-187`; schema union at `types.ts:69-78`; only BUSINESS/SERVICE/POST have full `FYDSchemaDef`s (`src/fyd/sitespec/schemas.ts:109`).
- Served graph = fixture base (7 objects from pinned 2026-09-21 site snapshot) + journal overlays (6th service, presentation intent). Test identity `identity_fyd_compiler_test` is baked into live evidence — provenance hygiene issue, not tonight's job.
