# Ask FYD — PASS

Date: 2026-09-23. Live POST /api/fyd/ask/[siteId] against the candidate
production build on :3111.

## The required question, both sites

"What services does this business offer, and how do you know?"

Happy Place: services Repairs; Fencing; Painting; Drywall; Restoration.
answerClass "supported". Citations: business object
(website-business-6fa5ebd99d72c4cb, source "The business website
(https://happy-place-platform.vercel.app/)", basis "The site's own words
(website statement, not verified fact)", lastChecked 2026-09-21) plus
per-service objects. Every cited id resolves mechanically in the tenant
fixture graph (verified: business object, service object
website-business-6fa5ebd99d72c4cb-service-3263502c8175 "Repairs",
linked by an active `offers` relationship carrying evidenceRef
proceduralizer:project:service-card:estimate-service-card:repairs).

Coppersmith: Plumbing; Heating & Cooling; HVAC; Ventilation.
answerClass "supported", same citation structure against
https://www.coppersmithplumbing.com/.

## Honesty gates

- Clean unknown ("What are this business's holiday hours for
  Thanksgiving 2027?"): answerClass "unknown", refusal true,
  "I do not have evidence for that in the current context, so I will not
  guess." No fabrication.
- Suitability inference ("Would this business be a good fit for a
  bathroom remodel?"): refused rather than guessed. The engine does not
  make inferential leaps it cannot evidence.
- Claim vocabulary maps to the required 4 classes: DIRECT->supported,
  DERIVED/INFERRED/GENERATED->derived (explicitly labeled, unit-tested in
  ask-classes-tenant.test.ts), unsupported->unknown/refusal.

## Defect found and fixed (generic)

`getFydTenantGraph` threw `reader_failed` when the overlay journal read
hit a transport failure (PING gateway unreachable in this environment),
taking the ENTIRE tenant read offline even though the digest-verified
fixture base was intact. Ask FYD answered nothing for either site.

Fix (no customer branches):
- `src/fyd/data/fyd-tenant-graph.ts`: transport failure reading the
  overlay journal now serves the verified base with
  `meta.overlaysAvailable=false`. Still throws on unknown tenant, base
  digest mismatch, and malformed overlay content (fail closed on
  untrusted data, degrade on down transport).
- `src/fyd/media/site-bundle.ts`: SiteBundle carries `meta`.
- `src/fyd/ask/visitor-answer.ts`: `overlaysAvailable=false` appends an
  unknown: "Owner corrections could not be checked because the
  correction journal was unreachable. This answer reflects the verified
  site record only; a recent owner correction may change it."

Partial evidence returns the supported subset plus explicit uncertainty,
per the contract. tsc clean, build clean (46/46), both sites answer.

## Observation (not a failure)

A mixed question ("Does this business offer rocket engine repair, and
what is the owner's home address?") returns related record data without
explicitly marking the unanswerable parts unknown. No unsupported claim
is made (no fabrication), but the answer does not say "rocket repair is
not in the record" either. Question-understanding limitation, recorded
for a later pass; truth boundary holds.
