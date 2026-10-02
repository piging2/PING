# LANE P — TRADESMAN Boundary Audit
Date: 2026-09-25 ~10:37-11:00 MDT | Auditor: Lane P (fresh instance) | Branch: fyd/sprint-integration-2026-09-24
Scope: read-mostly. No writes made to the repo. No files owned by running lanes touched.

## 1. COVERAGE AUDIT

### (a) HEALTHY — TRADESMAN provides generically, both sites instantiate

| Capability | Provider | Both sites | Evidence |
|---|---|---|---|
| 18-section component registry | src/fyd/components/registry.ts | Yes | Zero per-site branches; schema->component via SCHEMA_ROLES |
| TRADES archetype profile | src/fyd/archetypes/profiles.ts (TRADES_PROFILE) | Yes | Composition policy only; "No customer-specific values" |
| Data-driven generator | src/fyd/proceduralize/generator.ts | Yes | Sections emitted on data presence; no site conditionals |
| Q-C-01 public projection boundary | src/fyd/sitespec/public-projection.ts | Yes | Branded type; field visibility; owner corrections; capability grants |
| Binding verifier + audit tap | src/fyd/sitespec/binding-verifier.ts, sites-render-audit.ts | Yes | Observation-only; 14/14 BOUND on both sites |
| Media pipeline (rights gate, digest, derivatives, provenance) | src/fyd/media/ingest.ts, derivatives.ts | Yes | Rights gate rejects unlicensed marks (proven in manifests) |
| Owner corrections / overlays | src/fyd/object/owner-overlay.ts, owner-store.ts | Yes | Source/owner never collapsed |
| Ask FYD, CTA, ObjectRail, Gallery | registry + renderer | Yes | Gallery data-gated (CS renders, HP correctly omits) |

Rendered proof (headless, :3103): HP 9 sections, CS 11 sections; all customer facts render from graph; zero cross-site contamination.

### (b) GENUINE PLATFORM GAPS — ranked by evidence

1. **No live acquisition implementation (P0 for one-click business).** `src/fyd/acquisition/acquisition-adapter.ts` is TYPES ONLY ("No implementation in this module") with ZERO callers. A new URL cannot be onboarded through the product today. See guardrail section.
2. **No booking/quote/schedule capability.** ObjectCapability union = view, ask, follow, like, call, email, website, directions, reference (`src/fyd/object/types.ts`). CTA = "visit website or start a conversation." Every trades site's primary conversion (request a quote / book a job) has no first-class capability. Genuine TRADESMAN gap, not Coppersmith-specific.
3. **Mobile touch targets < 44px** (Lane 7 measured 2026-09-25): "Why this?" toggles 302x16, small links 22x44. Zero-overflow passes. Renderer lane owns.
4. **React hydration #418** on both sites (Lane 7, pre-existing in 28e4ba00, degraded console only).
5. **Happy Place zero acquired media** — known, accepted; typographic fallback correct.
6. **Double h1** — demo banner h1 + business-name h1. Demo-only; resolves when banner is removed.

Frozen per CEO 2026-09-25 (privacy-program expansion frozen; seams preserved, do not build):
- No FeedbackContract implementation (blessed as narrow exception, not built)
- No EXPORT/DELETE/REVOKE customer/tenant operations (only types/UI)
- No purpose/retention metadata at ingestion
- No tenant-scoped pseudonyms
- Cross-tenant learning promotion DISABLED at current N (CEO explicit)

### (c) CREEP — none in product code

Exhaustive grep for site-id conditionals across src/fyd and src/app/sites: **zero** `if siteId ===` / switch / per-site branches. Every "coppersmith"/"happy-place" hit in product code is a doc-comment example, a fixture registry entry, or a test concept ("frozen golden donor" = CLONE-PROVE test reference in sites-render-audit.ts:31, observation-only tap). The two page.tsx files differ only in SITE_ID constant and docblock.

### (d) COMMERCIAL MODEL — none inside customer objects/schema/template

- Fixtures: no subscription/billing/trial/invoice fields (grep clean).
- Schema (`src/lib/ping/types.ts`, `src/fyd/object/types.ts`): `CapabilityPlan` is agent-action planning (viewer capabilities on objects), not pricing.
- `price_range: "$$"` (HP fixture) is the BUSINESS's own published price indicator from its website structured data, consumed by the ask concierge. It is the business's commercial attribute, not PING's commercial model. Not a violation.

### (e) PII — no customer PII in template, schema, or customer objects

Both fixtures carry ONLY business-public, website-derived data with provenance (phone/email/website/hours/locality from the businesses' own sites). Person object "coppersmithplm" is a website author handle, not a customer. No customer names, numbers, addresses, or conversations exist anywhere in the demo plane.

Taxonomy layering (7-class IS x 4-class HANDLED) per finding:

| Datum | What it IS | Currently handled as | Must be handled as | Verdict |
|---|---|---|---|---|
| Business phone/email (fixtures) | PUBLIC (business-published) | PUBLIC (rendered, fixture-pinned) | PUBLIC | Correct |
| price_range "$$" | PUBLIC (business-published) | PUBLIC | PUBLIC | Correct |
| Author handle "coppersmithplm" | PUBLIC (website-derived) | PUBLIC | PUBLIC | Correct |
| Render-audit log line | OPERATIONAL (objectId/field/source-ref metadata) | Server log | OPERATIONAL, no raw values | Correct |
| Tracer liveFieldValue | Depends on field (demo: PUBLIC) | Test-only, unpersisted | If ever PII: TENANT_PRIVATE or redacted | LATENT — queued patch |
| Media derivatives cache | PUBLIC (rights-authorized) | Digest-addressed cache + provenance | PUBLIC with provenance | Correct |

**Logs/vectors/traces (Immediate Control #1):**
- LOGS: `logSitesRenderAudit` emits siteId/generatedAt/bindings(objectId, field, status, source=/reason=)/summary. No raw field values. CLEAN. (`src/fyd/sitespec/sites-render-audit.ts:289-290`)
- VECTORS: no embedding of site content in the /sites demo path (sole "vector" hit is a doc comment). CLEAN.
- TRACES: `src/fyd/lineage/tracer.ts:677,706` records raw `liveFieldValue` (and a 90-char excerpt) in trace detail. BUT the tracer has no production callers (only `verify-tracer.ts` self-test) and no traces persist to disk. LATENT mechanism risk, not an active leak. Queued as hardening patch P-LP1.

## 2. BOUNDARY DEFENSE

No surgical fixes applied: nothing is broken, and the ask files belong to Lane Q. Queued patches:

**P-LP1 (hardening, safe, conflict-free):** `src/fyd/lineage/tracer.ts:668-706` — redact `liveFieldValue` and the 90-char `excerpt` to field-name + value-hash when the traced field is not in an allowlist (title/description/claimKind), before the tracer ever gains a production caller. Exact change: replace `liveFieldValue: <raw>` with `liveFieldValueHash: sha256(canonicalize(value))` plus `field` name; keep `excerpt` to the claimKind only. Rationale: CEO "NO RAW SENSITIVE PII IN trace payloads." Safe: test-only module, no production callers, no cross-lane files.

**P-LP2 (demo cleanup, post-thaw):** double h1 — change demo banner heading to a `<p>` or remove banner in production. One-line, renderer lane owns; not applied (cross-lane).

**Standing anti-creep rule:** *No site id, business name, phone, email, address, price, or commercial term may appear in `src/fyd/**` (outside `__fixtures__`, `__tests__`, and doc comments) or in `src/app/sites/_shared/**`. Every customer fact reaches the renderer through the verified public projection and the component registry; any per-site conditional is a P0 boundary violation. The coverage audit, not a prospect's site, decides what TRADESMAN gains.*

## 3. MACHINE CRITICS (headless; :3103 build with edge-object fix)

| Critic | Happy Place | Coppersmith | Evidence |
|---|---|---|---|
| Content coverage | PASS | PASS | HP: name 19x, 5/5 services, phone, email render. CS: name 31x, 4/4 services, phone, hours, person render. Gallery correctly absent on HP (no media), present on CS (10 imgs, all with alt). |
| Binding verification | PASS 14/14 BOUND | PASS 14/14 BOUND | `[fyd:sites-render-audit]` log: 0 UNBOUND across 6 recent renders |
| No-hardcode | PASS | PASS | 8/8 facts render from graph; 4/4 cross-contamination checks pass; 0 hardcoded facts in components/_shared (1 doc-comment example only) |
| Accessibility (static) | PASS with note | PASS with note | lang="en", viewport, header/nav/main/footer landmarks, all buttons named, all imgs have alt. NOTE: 2x h1 (demo banner; demo-only). Full axe + contrast needs browser. |
| Mobile (static) | PASS with note | PASS with note | Viewport meta, zero-overflow confirmed by Lane 7 real-device test. NOTE: Lane 7 measured touch targets <44px (PARTIAL). Interactive mobile proof needs browser. |
| Screenshot diff | DEFERRED | DEFERRED | Requires live browser (generic subagent cannot operate one). Lane 7 captured desktop+mobile screenshots 2026-09-25 ~07:00 (`evidence/lane7-shots/`); recommend parent delegate the diff against those baselines. |

:3100 (stale, pre-edge-fix) vs :3103 renders are section-identical (9 vs 9, 11 vs 11); the stale build does not affect critic results.

## 4. DATAPRACTICES — KEEP / SOFTEN (new copy verified against implementation)

File: `~/workspace/goals/ping-website-build/hidden_files/pricing-page/DataPractices.tsx`

| Claim (new wording) | Verdict | Reason |
|---|---|---|
| "Names, phone numbers, addresses, and conversations stay in your business system." | SOFTEN | Mechanism (FeedbackContract) blessed but unimplemented. True only vacuously today (demo plane holds no customer data). Reframe as architecture commitment. |
| "We never pool identifiable customer records across businesses... identity-reduced patterns... aggregation and provenance controls." | SOFTEN | No cross-business learning exists; CEO explicitly disabled automatic cross-tenant promotion at current N; aggregation/provenance controls unbuilt. |
| "When the purpose expires or you ask us to delete, we remove it or render it inaccessible... Audit records may remain..." | SOFTEN | No retention metadata, no DELETE op, no crypto-shredding. Per CEO, public copy must not overclaim; internal language is "DELETE/CRYPTO-ERASE FROM SYSTEMS WE CONTROL SUBJECT TO THE DECLARED RETENTION CONTRACT." |
| "Export or delete everything, anytime... Export it, delete it, cut off our access." | SOFTEN (strongest) | Zero implementation. Reframe as commitment until EXPORT/DELETE/REVOKE exist and are tested. |
| "Every piece of data has a stated purpose..." | SOFTEN | No purpose metadata at ingestion. |
| "We learn from outcomes, not identities... Patterns, not people." | SOFTEN | No learning system; tenant learning must stay tenant-scoped per CEO. |
| "We don't sell your customer list" | KEEP | Negative policy commitment, verifiable by absence. Literally true. |
| "Your business system holds your customer truth. PING is the intelligence and execution layer..." | KEEP | Matches the accepted constitutional "commercial consequence" verbatim; stated as positioning. |

Note: "then it's gone" is confirmed killed; "we don't pool it" confirmed replaced with the precise identifiable-records form. Both edits verified in the file.

## 5. HARVEST CLASSIFICATION (CEO taxonomy)

| TRADESMAN capability | Class | Rationale |
|---|---|---|
| Archetype profiles (TRADES et al) | CORE | Composition policy over SiteSpec; the template itself |
| Component registry + generator + renderer | CORE | SiteSpec -> experience; the IR the CEO anchored optionality on |
| Q-C-01 public projection boundary | CORE | Evidence/visibility policy; the privacy seam |
| Binding verifier + render audit | CORE | Evidence |
| Media ingest (rights gate, digest, provenance) | CORE | Evidence/provenance; derivative codecs beneath are COMMODITY |
| Owner corrections / overlays / presentation intent | CORE | Owner-correction survival is the product test |
| Ask FYD widget | CORE | Concierge context; SOURCE-bounded answers |
| ObjectCapability grants (call/email/directions) | CORE | Capability-driven actions; extend with book/quote (gap #2) |
| sharp derivative generation, HTTP fetch, JSON-LD parsing | COMMODITY | Replaceable libraries; harvest, don't own |
| Cross-site protocol projections (ActivityPub/ATProto/MCP) | FUTURE OPTION | CEO: optionality comes from the IR; frozen this sprint |
| Cross-tenant learning / aggregation | FUTURE OPTION | Explicitly disabled at current N; versioned dataset later |
| Federation, campaign engines, local-first | FUTURE OPTION | Frozen; harvest concepts only |
| Second event system / second policy engine / FeedbackAuthority-as-system | REJECT | CEO explicit: do not create |
| Per-site conditionals in platform | REJECT | None found; rule above keeps it so |
| PING commercial model in customer objects | REJECT | None found; rule above keeps it so |

## 6. ONE-CLICK BUSINESS GUARDRAIL

**Fixtures sit at the customer boundary for BOTH sites.** `src/fyd/data/fyd-tenant-graph.ts` `FYD_TENANT_PINS` pins `HAPPY_PLACE_GRAPH` / `COPPERSMITH_GRAPH` (with base digests) as the base the /sites pages serve; journal overlays compose on top. The fixtures are honest (machine-generated 2026-09-21 from real acquisition, source digests in headers), and the offline pipeline (proceduralize: stored bytes -> observations -> graph) is real and re-runnable. But **no live URL->graph path exists in the product**: the acquisition adapter is types-only with zero callers. One-click onboarding of a NEW business is not possible today.

Per the CEO's qualification ("only rebuild acquisition if fixtures sit at the boundary"): they do sit at the boundary, so this is FLAGGED. Per the freeze (new adapters frozen until Nolan tests the two sites): this is the named next product gap, not a tonight rebuild. The product test Nolan will run (REAL URL -> ... ) is satisfied for THESE TWO sites by the pinned real acquisition; the gap is the third business.

Lane E's "real live chain for Coppersmith" artifact was not located in searchable evidence; the above is direct verification. Happy Place's path is identical in structure (fixture + overlays); its acquisition gap is media (zero acquired assets), not graph.

## 7. MEDIA DOCTRINE

Doctrine steps vs implementation: SOURCE URL -> FETCH -> DIGEST (sha256, `ingest.ts:137`) -> RIGHTS GATE (`ingest.ts:112`, rejects unclear/third-party marks; proven in both manifests) -> SAFE DERIVATIVE (bounded webp ladder, `derivatives.ts`) -> CACHE (digest-addressed) -> PROVENANCE (rights classification, sourceUrl, digest, observedAt). PUBLICLY ACCESSIBLE != LICENSED is enforced, not aspirational. PASS.

## Bottom line

The boundary holds: no creep, no commercial model, no customer PII in the template/schema/objects; the two sites are clean procedural instantiations of one generic TRADESMAN. Genuine gaps: live acquisition (one-click), booking/quote capability, mobile touch targets, hydration #418. DataPractices: 2 KEEP, 6 SOFTEN. Two queued patches (P-LP1 tracer redaction, P-LP2 demo h1). Screenshot diff deferred for browser delegation.
