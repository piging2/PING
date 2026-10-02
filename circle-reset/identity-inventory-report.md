# Circle-Only Product Reset: Identity Data Substrate Inventory

Read-only sweep complete. Nothing changed on the Pig or in the repo. Branch: `fyd/builder-composition` (uncommitted changes present; all files below were read as-is).

## (a) Canonical projection type to reuse: `ObjectProjection`

**`src/fyd/object/object-projection.ts` — `interface ObjectProjection`** (484-line module, modified in working tree). This is the existing schema-agnostic normalized identity projection, already consumed by the new single Circle component: **`src/fyd/ui/identity-object.tsx`** (new, uncommitted, 855 lines) imports `ObjectProjection` from `@/fyd/object/object-projection` and is fully data-driven over it. No new schema needed; the task's requested shape maps onto it:

| Requested field | ObjectProjection equivalent |
|---|---|
| id | `id: string` (PING object id) |
| kind | `schema: string` + `kindLabel` ("Business"/"Person"/"Service"/"Location") |
| displayName | `name: string` |
| image | `media: ObjectMediaView[]` (rights-authorized only; id/role/logo-hero-gallery/src/alt/rightsSource/rightsBasis/digest/observedAt) |
| summary | `summary: Fact \| null` |
| location | `location: Fact \| null` |
| website | `contact.website: Fact \| null` (plus phone/email) |
| highlights[] | `facts: Fact[]` (services, service area, each evidence-graded) |
| externalIdentities[] | `externalIdentities: RelatedRef[]` |
| relationshipContext | `people: RelatedRef[]` + `serviceRefs: RelatedRef[]` + `locationRef` |
| evidenceState | **Per-claim**, not global: `Fact.evidence: ClaimEvidence { state, receipt?, asOf?, steps? }` with `EvidenceState` (`src/fyd/ui/evidence-state.tsx`): `observed \| inferred \| unverified \| unknown \| unavailable \| withheld`. A claim with state `unknown` must render label-only, never the value. Top-level `provenance: { label, ref, derivedAt }`, `ownerUpdatedAt`. |
| capabilities[] | `capabilities: ObjectCapability[]` (follow/like/ask always-ish; call/email/website only when the value exists; ask only when ask-evidence exists) |

Note there is **no single global `evidenceState`** on the projection today. `identity-object.tsx` already handles this with `EvidenceStateLabel` + `WhyThis` drill-downs per claim.

**Loader seam:** `loadObjectViewBySlugOrId(id)` in `src/fyd/object/by-id.ts` → `composeObjectView` in `src/fyd/object/view.ts` → enriched by `objectViewToProjection(view, graph)` → served by `GET /api/fyd/objects/[objectId]` (also modified in working tree). Honesty gates: unknown tenant/id/non-public object → null → 404. Tenant isolation enforced.

**Binding verifier + field-visibility owner overrides:** `resolveBoundField` (`src/fyd/sitespec/graph.ts:154`, via `verifyPresentationBinding`) and `resolveFieldVisibility`/`applyFieldVisibility`/`coarsenAddress` (`src/fyd/sitespec/field-visibility.ts`) are wired at the **renderer seam** (`src/fyd/components/renderer.tsx`: `boundField`/`boundTitle`/`boundDescription`/`boundWebsite`/`safeWebsite`, socials fail-closed gate at line ~782), **not** at the ObjectView/by-id seam. `composeObjectView` reads graph fields directly plus owner-store overrides (`readOverrides`, `src/fyd/object/owner-store.ts`, persisted in `/home/nolan/projects/ping/data/fyd-owner/<objectId>.json`; only `happy-place.json` exists there today). It does honor `addressVisibility: hidden` → location Fact with evidence state `withheld`, and owner field corrections (`ownerFieldCorrections` composed in `ping-object-source.ts` via `owner-overlay.ts`, exposed as `fieldCorrections` with sourceDrifted flags). If the new Circle must have binding-verifier + field-visibility coverage, it must call `resolveBoundField`/`resolveFieldVisibility` itself; they do not ride along inside `ObjectProjection`.

## (b) Data source + loader per identity

Single canonical source for both: the digest-verified PING projection dumps read by `getPingObjectGraphSync(siteId)` in `src/fyd/data/ping-object-source.ts` (env override `FYD_PROJECTION_DIR`; default `/home/nolan/ping/var/fyd-projections/`). Verification: file exists, `meta.siteId` match, every object has non-empty provenance ref, sha256 `graphDigest` recomputed and compared. Fail closed, no fixture fallback.

- **Happy Place**: file `/home/nolan/ping/var/fyd-projections/happy-place.json` (siteId `happy-place`, dumped 2026-09-22T14:50:58Z, dumper `fyd-projection-dump@1.1.0`). Identity object id **`website-business-6fa5ebd99d72c4cb`**, schema `ping.social.business@1`, public, title "Happy Place Carpentry LLC".
- **Coppersmith**: file `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json` (siteId `coppersmith-plumbing`, dumped 2026-09-21). Identity object id **`website-business-2f1327c09d622175`**, schema `ping.social.business@1`, public, title "Coppersmith Plumbing - HVAC - Mechanical".
- Media: pipeline manifests `src/fyd/media/manifests/<siteId>.json` (committed), joined via `listObjectMedia` in `src/fyd/media/select.ts` (semantic attach: `attach.ts` — undepicted media represents the business). HP manifest: 0 media items. CS manifest: 11 items (2 logos, 1 hero, 8 gallery), rightsSource `public-demo-source`. Note: `src/fyd/preview/manifests/happy-place.json` is only a website-screenshot record (website-snapshot), not identity facts.

## (c) Real fields available per identity (no invention)

Both graphs: 8 objects, 7 active relationships each. On-disk counts: 37 field claims + 8 descriptions + 8 titles per tenant. (The "15 HP facts / 38 CS facts" from the earlier lane do not match on-disk counts; report the 37/8/8 numbers as verified.)

**Happy Place identity (`website-business-6fa5ebd99d72c4cb`):**
- title: "Happy Place Carpentry LLC"; description: "Licensed Oregon carpentry contractor (CCB# 254240) building decks, fences, pergolas, bathrooms, and custom work across Benton, Linn, Marion & Polk Counties."
- locality: "Adair Village, OR, US"; website: `https://happyplacecarpentry.com`; phone: `+15412865190`; email: `taylor@happyplacecarpentry.com`
- area_served: "Benton, Linn, Marion, and Polk Counties, Oregon"; keywords: "carpenter,deck builder,fence installer,bathroom remodel,Oregon contractor,Willamette Valley" (→ category "Carpentry", inferred); price_range: "$$"; images: `https://happyplacecarpentry.com/images/hero-background-enhanced.jpg` (observed field, not rights-cleared media)
- services (public, offers): Repairs, Fencing, Painting, Drywall, Restoration (all `ping.social.service@1`, each with a one-line description); 1 private service `website-service-51de038c1defe8bd` ("Pergola Design Consultations", visibility private → never servable)
- location object: `website-business-6fa5ebd99d72c4cb-location` ("Adair Village, OR, US", located_at)
- No person objects, no external_identity objects, no socials field on-disk. No media in pipeline manifest → Circle face must be gradient/initials fallback.
- provenance ref: `website-ingestion:https://happy-place-platform.vercel.app/`, derivedAt 2026-09-21T13:50:00Z, kind "website-derived"

**Coppersmith identity (`website-business-2f1327c09d622175`):**
- title: "Coppersmith Plumbing - HVAC - Mechanical"; description (truncated in source): "Coppersmith Plumbing & HVAC has serviced Western Colorado for over 25 years. With a proven track record of quality work and diverse skill sets, our team…" (verbatim; the dump itself truncates)
- locality: "Grand Junction, Colorado, 81501, United States"; website: `https://coppersmithplumbing.com`; phone: `970-245-3869`; hours: "Mo,Tu,We,Th,Fr 07:30-16:00"; updated_time: "2025-10-01T10:31:10-06:00"; site_name/type/locale also present
- services (public, offers): Plumbing, Heating & Cooling, HVAC, Ventilation (each with description + service_href URLs)
- location object: `website-business-2f1327c09d622175-location` (Grand Junction, postal 81501, located_at)
- person: `website-business-2f1327c09d622175-person-377048d67856`, title/name "coppersmithplm" (works_for → business; links_to → external_identity)
- external_identity: `website-business-2f1327c09d622175-ext-89604af059c2`, url `https://coppersmithplumbing.com`, platform "coppersmithplumbing.com" (linked only from the person object, not from the business)
- No socials field on-disk. Media: 11 acquired items as above (logo/hero/gallery).
- provenance ref: `website-ingestion:https://www.coppersmithplumbing.com/`, derivedAt 2026-09-21T13:50:00Z

## (d) URL-neutralization module to reuse

**`src/fyd/sitespec/safe-link.ts` — `resolveSafeLink(rawValue, capability: "navigate" | "call" | "email")`** → `{ kind: "safe"; href }` or `{ kind: "non_navigable" }`. This is the declared single place that converts data into capability: parser-based (not scheme-regex), allowlisted schemes (navigate: http/https only; javascript:/data:/blob:/file:/vbscript: → non_navigable), whitespace/control-character smuggling fails closed, relative refs non-navigable without an explicit safe base. Currently wired at the renderer seam (`boundWebsite` → `resolveSafeLink(…, "navigate")`, socials → `"navigate"`, phone → `"call"`, email → `"email"`). The new Circle should reuse exactly this for website/social hrefs. (A lighter https-only regex gate, `isSafeWebHref` in `src/fyd/preview/types.ts`, is used by `portal-circle.tsx`, `preview/pipeline.ts`, and `capabilities/runtime.ts`, but `safe-link.ts` is the canonical, stronger module.)

## Other findings

- **`PingIdentitySummary`** (`src/lib/ping/types.ts:10`: id, displayName, handle, verified, facebookConnected, followerCount, followingCount, followedByViewer?) is the Lane D practice-session contract for PING user profiles, **not** a business identity projection. No rows exist for Happy Place or Coppersmith (`data/fyd-identity/` contains only `audit.jsonl`). It is not the type to reuse.
- `ObjectView` (`src/fyd/object/types.ts`) is the intermediate read model; `CircleProjection` (same file) is the legacy compact circle shape (id, name, category, locationLabel, tagline, topFacts, background, capabilities...) now superseded for this purpose by `ObjectProjection`, which `identity-object.tsx` already consumes.
- Bridge note (durability): single quotes inside heredoc scripts sent through `pigwsl-run.sh` were intermittently stripped during this run; quote-free base64 transit (script file → base64 → `base64 -d | python3`) worked reliably. May be worth logging in `~/workspace/AGENTS.md`.