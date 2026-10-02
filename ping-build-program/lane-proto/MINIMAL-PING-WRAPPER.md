# MINIMAL PING WRAPPER — protocol projections integration design (NOT APPLIED)

Winner: JSON-LD + plain-text projectors, proven in this lane's `spike/`.
This file specifies the smallest possible integration into the PING website
repo. It is a design spec only; nothing here has been written into PING.

## Boundary compliance
Follows the decided boundary in src/app/api/fyd/READ-SURFACE-INVENTORY.md:
FYD UI -> BFF routes (src/app/api/fyd/) -> PingObjectReader -> projections.
New read needs become NEW thin routes under src/app/api/fyd/ whose logic lives
in pure, unit-tested modules under src/fyd/. No writes; no new dependencies.

## Components
1. `src/fyd/projections/fact-list.ts` (pure): PingObject -> fact list
   `{ canonicalId, canonicalGraphVersion, facts: [{field, value, evidence,
   inferred, visibility}], services: [...] }`. Visibility from
   PingObjectReader.visibleTo()/sanitizeFields(); private facts carried with
   visibility:"private" (never stripped here — projectors withhold them).
2. `src/fyd/projections/project-jsonld.ts` (pure): fact list -> schema.org
   @graph. Field->property map is the programmatic INVERSE of LITERAL_FACTS in
   src/fyd/proceduralize/structured-data.ts (verified field-for-field; has_logo
   included). Withholds PRIVATE_PROPERTIES {streetAddress, postOfficeBoxNumber}
   at projection time. Adds pingProjection meta node: projectionId,
   canonicalId, canonicalGraphVersion, inputHash (sha256 over canonicalized
   fact list), generatedAt, isProjectionNotAuthority=true, isAuthority=false,
   evidenceManifest, privateFactsWithheld, "Projection only... do not write
   edits against this document."
3. `src/fyd/projections/project-text.ts` (pure): fact list -> labeled
   plain-text card. Every public field as an explicit labeled line (verifier
   enforces per-field equivalence with the JSON-LD). Evidence section lists
   field <- evidence ids. Footer banner: "THIS IS A PROJECTION, NOT THE
   AUTHORITY." + inputHash.
4. Route `GET /api/fyd/projection/alternate?siteId=&kind=jsonld|text` (thin):
   getPingObjectReader().getNode(siteId) -> fact-list -> projector ->
   Response with Content-Type application/ld+json or text/plain; charset=utf-8.
   kind absent/invalid -> 400. No owner overlay (SOURCE SAYS X, same as the
   existing /api/fyd/projection route).

## Invariants (enforced by construction)
- Projectors are pure functions over a frozen fact list; canonical mutation is
  impossible (no object references escape; deep-freeze in tests).
- inputHash rotates on any canonical change; consumers compare against the
  current canonical to detect STALE (no push/invalidation channel needed).
- A verify script (lane O can own it) re-runs the spike's 38 checks against the
  real fact list: coverage, cross-projection equivalence, divergence injection,
  exfiltration scan, label presence.

## Cost
~400 lines TS + ~120 lines tests. Zero new dependencies (Node crypto only;
JSON-LD is written as compact doc, no jsonld expansion library needed).
