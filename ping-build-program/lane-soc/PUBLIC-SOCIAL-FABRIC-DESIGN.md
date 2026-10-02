# PUBLIC-SOCIAL FABRIC — DESIGN (Lane SOC)

**Date:** 2026-09-23. **Status:** design + minimal spike; nothing published, nothing sent.

## Problem

PING's public presence (social page posts, profile sections, story cards) must be a **projection of canonical business objects**, never a second content system with its own facts. Today the pieces exist (in-product social journal, claim grading, dependency manifests) but there is no defined, deterministic path from a canonical business object to a public-surface draft with every claim bound to evidence.

## PING ALREADY HAS (harvested, read-only trace of /home/nolan/projects/ping @ e48ef710)

| Asset | Location | What we take |
|---|---|---|
| ObjectView (canonical public read model: name, summary, services, serviceArea, contact, capabilities, provenance, fieldCorrections) | `src/fyd/object/types.ts`, `src/fyd/object/view.ts` | The projector input. Only fields present here are projectable. |
| Claim grading SUPPORTED/DERIVED/INFERRED/UNKNOWN; "throws on non-UNKNOWN claim without cited evidence"; refused when all claims UNKNOWN | `src/fyd/ask/concierge.ts` | The claim vocabulary and refusal discipline (no second vocabulary). |
| DependencyManifest + reverseWalk(objectFieldOrClaimRef) → bindings that render it | `src/fyd/builder/manifest.ts` | Change-impact primitive for re-projection. |
| INV-03: hidden facts are ABSENT from public projections, never redacted | `src/fyd/invariants/__tests__/inv-03-hidden-no-leak.test.ts` | Leak rule for non-public fields. |
| RightsSource vocabulary (business-provided / public-demo-source / unclear-reference-only) + rights gate rejecting unlicensed media | `src/fyd/media/types.ts`, `src/fyd/media/manifests/happy-place.json` | Media eligibility for public surfaces. |
| Outbound social writes through the canonical gateway: signed envelopes, attestation gate, deterministic transition IDs | `src/fyd/social/*`, `src/app/api/fyd/social/*` | The existing write path the fabric feeds (draft → human-gated decision → existing machinery). |
| Digest law: sha256 over canonical JSON | `src/fyd/ask/envelope.ts`, `src/fyd/social/transition-id.ts` | Determinism mechanism for projections. |
| Inbound social data is OBSERVATION only (never canonical identity) | `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md` | Directional precedent: public web flows INTO PING as observations. |

What PING does NOT have: a defined object → public-surface projection function; surface field policies; an evidence-bound draft artifact; the one-way engagement boundary written down; a digest key for re-projection.

## External candidates

1. **Open Graph protocol (ogp.me)** — ADAPT. The object → social-representation pattern is the whole mechanism: a page declares og:title/og:description/og:image deterministically from its canonical data, and every platform renders the same card. Zero dependency (it is a spec + meta tags). Mechanism taken: deterministic field mapping from canonical object to surface fields.
2. **Headless CMS structured-content → omnichannel** (Contentful et al. pattern; verified via search) — ADAPT the architecture ("create once, project everywhere from one canonical store"), REJECT any vendor. PING's canonical store is the object graph; the CMS industry confirms the separation works at scale.
3. **Logic-less deterministic templating (mustache/handlebars family)** — ADAPT the concept, REJECT the dependency. PING's digest law + pure functions already give deterministic rendering; a 30-line field assembler beats a new dependency.
4. **Social schedulers (Buffer/Hootsuite pattern)** — REJECT for this lane. Scheduling/publication is a separate human-gated decision; the fabric produces drafts only. Outreach/engagement machinery is off-limits to this lane per standing directive.

## Winner: minimal PING wrapper (spike: spike/projector-spike.mjs)

`projectToSurface(objectSnapshot, surface, projectorVersion) -> DraftProjection`

### The projection law

Same object state + same projector version → byte-identical projection. Every rendered sentence carries `{grade, fields, evidence}`; a claim that cannot be graded SUPPORTED or DERIVED from object fields is refused with the exact reason, never rendered. The draft is always `publishable: false`; publication is a separate human-gated decision the projector never makes.

### Surface field policies

| Surface | Renders | Excludes (policy) |
|---|---|---|
| `page-post` | name, summary, service names, serviceArea, locality, website, media (business-provided / public-demo-source only) | contact details (phone/email) — posts are public broadcast; contact lives on the profile |
| `profile-blurb` | name, summary, service names, locality, website, phone, email, media | superlatives, testimonials, anything unbound |
| `story-card` | name, short summary, service names, locality, one hero media | all contact details (ephemeral visual surface) |

### Forbidden rules (all named in refusal)

- F-1 unverifiable superlative: "best", "#1", "top-rated", "finest", "unmatched", "guaranteed" without SUPPORTED evidence → refused.
- F-2 invented testimonial: no testimonial object/relationship in the graph → refused.
- F-3 cross-business bleed: media whose objectId ≠ target object → refused.
- F-4 unlicensed media: `unclear-reference-only` → excluded with the rights-gate reason.
- F-5 non-public field: hidden/withheld fields (HIDE corrections, addressVisibility=hidden) → ABSENT from output bytes (INV-03).
- F-6 unbound claim: grade UNKNOWN → refused, named.

### One-way boundary (engagement → observation, never → object)

Public engagement (likes, comments, replies, reviews) enters PING **only as observations** via connectors (BCQ/CONN contract), typed `social_engagement_observed` with fact class DERIVED_FACT, carrying "public reaction" evidence. Engagement observations:

- may be journaled in the observation store,
- may NOT write any canonical object field (name, summary, services, contact, media),
- are REJECTED at the boundary if they carry canonical-field write attempts, with the reason named,
- never convert directly to USER_OVERRIDE; only owner-verified, signed corrections change canonical objects (correction precedence: owner > verified source > observation > inference).

### Re-projection

`projectionDigest = sha256(canonical({surface, projectorVersion, usedFields}))`. When an object field changes, lane O's dependency index (reverseWalk on the field) marks exactly the surfaces whose bindings include that field; the spike demonstrates the digest-level invalidation locally. Projections are disposable derived artifacts, like feeds: drop and rebuild.

### CODE WE DO NOT NEED TO WRITE

- A second claim vocabulary (lane G's ConciergeGrade is reused).
- A second event authority (projections are derived, not journaled as new canonical events).
- A publishing/scheduling system (existing social machinery + human gate).
- A template engine dependency (pure functions + the digest law).
- Any connector (engagement ingestion is lanes BCQ/CONN's contract surface).

### Failure test (red-team, in spike)

Invented testimonial, superlative, cross-business media, unlicensed media, hidden-field leak, engagement-as-canonical-write, unbound claim — each refused with the exact reason; canonical snapshot digest unchanged by engagement.
