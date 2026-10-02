# Falsification H1: Coppersmith EVIDENCE -> OBJECT GRAPH -> SITESPEC -> RENDER chain

Date: 2026-09-24 ~18:14 MDT. Worker: read-only subagent (no files modified, no restarts, no DB writes).

Traced service: **"Heating & Cooling"** (object id `website-business-0061cd1c2f8f4d0b-service-2dbc12c16f834186`), chosen from the live served page.

## Verdict: FIRST BROKEN LINK at the RENDER CLAIM-BADGE stage (hardcoded copy)

The core evidence chain resolves mechanically end to end. But one rendered element is NOT data-bound: the **"Website statement"** badge on every card is hardcoded copy, and the SiteSpec itself carries zero claim/evidence bindings (by design, not validated). Details below.

## Environment discrepancies (must be corrected in the sprint brief)

- :3101 is DOWN (connection refused; nothing listening). The scratch :3101 path could not be tested.
- The FYD tree is at `/home/nolan/build-edge` (not `/home/nolan/build-edge-port`), branch `fyd/edge-object-experience @ ce1da5c` (not `fyd/edge-port @ 243fb120`).
- :3100 runs `node dist/server/dev-server.js` with cwd `/home/nolan/build-edge`. There is no `/home/nolan/projects/ping` on this machine; "pure HEAD e474c89b" could not be confirmed. All findings below are against what :3100 actually serves.
- Object authority is honestly demo-grade: the fixture header says `controllerId: identity_fyd_compiler_test (demo/test controller, not a verified owner)`.

## The chain, link by link (backward from the render)

**1. Rendered DOM -> object id: MECHANICAL, PASS.**
Live page `http://127.0.0.1:3100/sites/coppersmith-plumbing` renders
`<article data-fyd-object-id="website-business-0061cd1c2f8f4d0b-service-2dbc12c16f834186">`
with `<h3>Heating & Cooling</h3>` and `<p>We maintain or repair furnaces, air conditioning units, heat pumps, mini split systems and more.</p>`.
Source: `src/fyd/components/renderer.tsx` `CardGrid` (line ~233): `data-fyd-object-id={o.id}`, `{o.title}`, `{o.description}` verbatim from the resolved PingObject. Nothing invented.

**2. SiteSpec -> card objects: MECHANICAL, PASS (but SiteSpec is evidence-blind).**
`getSiteBundle("coppersmith-plumbing")` (`src/fyd/media/site-bundle.ts`) runs fixture graph -> `generateSiteSpec` (`src/fyd/proceduralize/generator.ts`) -> `validateSiteSpec` -> bundle.
The SiteSpec carries sections with queries (`kind: "related"`, predicates `["provides","offers"]`); the renderer executes them via `resolveQuery` (`src/fyd/components/renderer.tsx:40`).
**The SiteSpec carries NO claim/evidence bindings.** `validateSiteSpec` (`src/fyd/sitespec/validator.ts`) never checks `evidence_ref`/`evidenceRef`. The binding travels a parallel path: object graph + `evidence/observations-*.json`. The SiteSpec is not the carrier, and nothing enforces that a rendered object even has an evidence ref.

**3. Object -> evidence_ref: MECHANICAL, PASS.**
Fixture `src/fyd/proceduralize/__fixtures__/coppersmith-plumbing-graph.ts`: object `fields.evidence_ref = "service-cards:elementor-cta-services:cooling"`; the `offers` relationship `rel-a8413d36554e9f2a` carries the identical `evidenceRef`. All 4 services have refs; all 4 match.

**4. evidence_ref -> observation: MECHANICAL, PASS.**
`evidence/observations-coppersmith-plumbing-2026-09-22.json` contains exactly 5 records; all 4 service refs map to observation ids `obs-coppersmith-plumbing-elementor-cta-services-{cooling,hvac,plumbing,ventilation}` (convention verified in `src/fyd/why/why-this.ts` `matchesEvidenceRef`, and the fail-closed rules there reject zero-match and multi-match).
Live test: `GET /api/why-this?site=coppersmith-plumbing&objectId=...service-2dbc12c16f834186&field=offers` -> `{"found": true, "source": "https://www.coppersmithplumbing.com/", "observedValue": "Heating & Cooling", "observationTime": "2026-09-22T15:35:00Z", "extractionMethod": "Read from the business website by service-cards.ts v2-2026-09-22, matching the \"elementor-cta-services\" pattern at a[href=\"https://coppersmithplumbing.com/services/hvac/cooling/\"]."}`. The no-field path (object.fields.evidence_ref) also returns found:true.

**5. Observation -> raw source bytes: MECHANICAL, PASS.**
Observation: `sourceUrl=https://www.coppersmithplumbing.com/`, `sourcePointer=web:sha256:2233052b4ad0da1dac9a905dd2ea4b0b54e0b30f36428bfc0c73f785904b9e57`, `sourceLocation.utf8_bytes=[67085,68336]` lands on the Elementor CTA anchor for the cooling service in `evidence/coppersmith-2026-09-22.html`; `sha256` of that file == the digest in both the observation and the object's `fields.source_digest`. The description phrase and title both exist in the raw bytes. Provenance: `kind: website-derived`, ref `website-ingestion:https://www.coppersmithplumbing.com/`.

**6. Ask FYD citations: MECHANICAL, PASS.**
Live `POST /api/ask {"site":"coppersmith-plumbing","question":"What services do you offer?"}` returns an answer with 5 evidence rows, each carrying `n`, `objectId`, `label`, real `source` URL, `basis`, `lastChecked`. No dangling citations.

**7. THE BREAK: "Website statement" badge is hardcoded copy, NOT data-bound.**
`src/fyd/components/renderer.tsx:125-129`:
```tsx
function ClaimBadge() {
  return (
    <span ...>
      Website statement
    </span>
  );
}
```
It is called with no props by `CardGrid` (and the other sections). It never reads `o.fields.claimKind`. It happens to agree with the fixture's `claimKind: "website_statement"` today, but the render is not mechanical: an object with a different claimKind would still render "Website statement". Similarly, `generateSiteSpec` hardcodes `provenance.claimKind: "website_statement"` (`generator.ts:261`) rather than deriving it from the objects.

## What a writer would need to fix

1. Bind the badge to data: pass the object into `ClaimBadge` and render from `o.fields.claimKind` (map claimKind -> label); fail closed (no badge or a neutral "unclassified claim" label) when claimKind is absent.
2. If the sprint wants the SiteSpec to be the chain's carrier, the SiteSpec must carry per-object evidence bindings (or a bindings section) and `validateSiteSpec` must verify every renderable object resolves to an evidence_ref + observation record. Today the validator is evidence-blind and the SiteSpec is a query skeleton; the binding is enforced only at `/api/why-this` query time by `why-this.ts`'s fail-closed rules.
3. Bind `generator.ts` provenance `claimKind` to the actual per-object claimKinds instead of a hardcoded constant (currently it asserts a property of the input rather than deriving it).
4. Lower priority: the fixture's `controllerId` is a demo/test controller; the sprint's "without changing authority" criterion cannot be proven on production until a verified-owner controllerId exists.

## Notes for the sprint record

- The 2026-09-22 `acquisition-chain-report.md` in the repo root is stale relative to the current branch: it says "Coppersmith has no service object at all"; the current fixture has 4 service objects and the live page renders them. Do not re-run that report's conclusions against this tree.
- Scope of this falsification: DOM -> SiteSpec -> graph -> evidence -> source (+ live /api/why-this and /api/ask). NOT tested: the edge-object expanded/sheet/traverse path, the owner proposal -> approval -> event -> projection -> regeneration -> re-observation loop, or the :3101 scratch server (down).
