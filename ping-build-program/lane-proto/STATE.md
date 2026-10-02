# LANE PROTO — STATE (re-dispatched 2026-09-23 ~21:10 MDT after transient inference timeout)

**Status: PROVEN** (optionality test green, 38/38 checks + red-team)

## Verdict
Two alternate projections over the same canonical business object are built,
tested, and proven in `spike/`: (a) schema.org JSON-LD, (b) plain-text business
card. Both are read-only by construction, both trace every claim to evidence
ids, both withhold private facts at projection time, both label themselves
"projection, not authority", and a canonical change rotates the inputHash that
flags old projections stale. The website renderer is replaceable: the facts
survive without it.

## Ledger
- RESEARCHED: inventory.sh over PING repo; read-surface inventory (READ-SURFACE-INVENTORY.md,
  2026-09-21 archaeology); git history for projection/jsonld/activitypub work.
- HARVESTED: src/types/projections.ts (constitutional header discipline:
  projectionId/canonicalGraphVersion/inputHash/generatedAt);
  src/fyd/proceduralize/structured-data.ts (LITERAL_FACTS schema.org->field,
  PRIVATE_PROPERTIES={streetAddress,postOfficeBoxNumber});
  src/fyd/adapters/activitypub/webfinger.ts (Fedify WebFinger adapter);
  coppersmith JSON-LD fixture (real Rank Math bytes);
  src/app/api/fyd/projection/route.ts (existing raw-projection endpoint).
- IMPLEMENTED: spike/ (canonical.json, projection-common.js, project-jsonld.js,
  project-text.js, verify.js, run.sh).
- TESTED: run.sh — 38/38 green: coverage, cross-projection equivalence, divergence
  detection (tampered projection REJECTED), exfiltration (private street address
  absent), authority labeling, evidence traceability, JSON-LD round-trip, staleness
  (inputHash rotates on canonical change), private-flip (phone made private
  vanishes from both).
- FIXED: (1) text projector now emits explicit labeled lines per field (verifier
  enforces text-covers:* per-field equivalence); (2) spike field renamed
  logo_url -> has_logo to match PING's real LITERAL_FACTS vocabulary
  (`logo: "has_logo"` at structured-data.ts:375), so the JSON-LD writer is the
  exact inverse of PING's JSON-LD reader.
- PROVEN: optionality test — same canonical input -> equivalent factual content
  in two formats; neither projector can mutate canonical state (deep-frozen input
  byte-identical after projecting).

## Repo posture
PING repo verified via Pig (reachable; branch fyd-factory @ e48ef71/e48ef710).
No writes to PING. Spike lives in this lane dir only. Constitutional sprint WIP
untouched. Integration of the winner is specified in MINIMAL-PING-WRAPPER.md +
INTEGRATION-REQUEST-proto.md for the FYD factory lane owner; not applied.

## NEXT
1. FYD factory lane owner reviews INTEGRATION-REQUEST-proto.md.
2. Lane PROTO continues under NO-STOPPING: next gap is a third projection
   (sitemap/Atom discovery document) or a projection-diff watcher (lane O
   dependency-index convergence).
