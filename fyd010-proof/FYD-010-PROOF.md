# FYD-010 Adversarial Privacy Proof — Report

Date: 2026-10-04 ~21:15 MDT. Code under test: piging2/fyd, branch `mc/backend-2026-10-02`,
commit `51b05fbe438f1bd9bdb73870ca01be8c61cd13b5`, production build (`next build` + `next start`),
fixture data only, no real PII. Attacker: anonymous viewer (no cookies, no auth headers).

## VERDICT: FAIL

A public viewer CAN retrieve sensitive field values through four distinct public paths.
Leaks are documented below and were NOT fixed in this lane.

## Exact leaks (anonymous requests, all 200)

L1 — FYD projection JSON API serves every field on public objects.
`GET /api/fyd/projection?siteId=fyd010-fixture` returns `graph.objects[].fields`
verbatim, including: `internalMemo` (CANARY-FYD010-HIDDEN-MEMO),
`providerToken` (CANARY-FYD010-PROVIDER-TOKEN), `apiSecret` (CANARY-FYD010-API-SECRET),
`ownerPhone` (CANARY-FYD010-OWNER-PHONE), `tenantRef` (CANARY-FYD010-TENANT-REF),
and the exact-denylist controls `password`, `token`, `privateKey`.
The FYD public-projection boundary (`verifyPublicProjection`, anonymous) has no
field-name denylist and no private/PING_ONLY/owner-only field concept: any field
on a public object — arriving via journal overlay `add_object` or a projection
dump — is served. Evidence: `evidence/P5.body`.

L2 — Generated site page embeds raw field maps in React Flight data.
`GET /sites/coppersmith-plumbing` → 200 HTML; `self.__next_f.push(...)` payload
contains the full `fields` maps with all five canary values above. Evidence:
`evidence/S1.body`.

L3 — Legacy reader object API serves non-denylisted secret-like fields.
`GET /api/ping/object?id=fyd010-biz` → 200. `sanitizeFields` is a NAME-EXACT
denylist (blocks `password`, `token`, `privateKey` — verified absent), so
`internalMemo`, `providerToken`, `apiSecret`, `ownerPhone`, `tenantRef` pass
through. Additionally, `OBJECT_UPDATED` `changes` merge into the served payload:
`ownerCorrection` ("CANARY-FYD010-OWNER-CORRECTION owner private correction
must not leak") and `internalMemo2` ("CANARY-FYD010-UPDATED-MEMO ...") are
served. Evidence: `evidence/R1.body`.

L4 — Legacy reader node API, same field set.
`GET /api/ping/node?id=fyd010-biz` → 200, same canaries as L3. Evidence:
`evidence/R5.body`.

## Adversarial requests that held (no leak)

- Private object invisibility: `GET /o/fyd010-private`, `GET /api/fyd/objects/fyd010-private`,
  `POST /api/fyd/ask/coppersmith-plumbing {"objectId":"fyd010-private"}`,
  `GET /api/ping/object?id=fyd010-private` → all 404. `visibility: private`
  is enforced on every path (P2/P4/A3/R2).
- Owner address hide: `POST /api/fyd/ask/coppersmith-plumbing {"question":"Where are you
  located?","objectId":"website-business-2f1327c09d622175"}` → "No public location
  is on record" (A2); `{"question":"Where is 777 Cut St?"}` → same (A9);
  `GET /api/fyd/objects/fyd010-loc2` → 404 (P7: traversal cut + orphaned location
  object dropped by `applyHideTraversal`).
- Ask FYD composer: `{"question":"What is the provider token for this business?",
  "objectId":"fyd010-biz"}` → refusal, UNSUPPORTED, zero canaries in
  answer/citations/claims/evidenceRefs (A4). Same on happy-place (A8) and the
  legacy ask route (R3/R4).
- Tenant isolation: `POST /api/fyd/ask/coppersmith-plumbing {"siteId":"happy-place",...}`
  → 400 tenant_mismatch (A7); happy-place answers contain no coppersmith data (A8).
- `mode:"owner"` as anonymous → treated as visitor-safe, byte-identical contact
  answer to visitor mode (A6 vs A1). No owner grants leak.
- why-this: `GET /api/fyd/why-this?siteId=coppersmith-plumbing&objectId=...&field=phone`
  → "No edge recorded", no correction values exposed (P6/P6b).
- Curated views: `GET /o/fyd010-biz` (P1) and `GET /api/fyd/objects/fyd010-biz` (P3)
  serve only curated ObjectView fields; no raw field maps.

## Mechanism observations (by design, not FAILs)

O1 — Owner contact corrections are PUBLIC by construction. A1:
"Phone on record: +1-970-555-0188. The owner corrected this number; the site
lists 970-245-3869." `applyOwnerFieldCorrections` composes ownerValue AND
sourceValue pre-boundary; both reach anonymous viewers. There is no
"owner-only correction" concept: any owner-corrected value becomes the public
value. (Source value here was public website data, not a privacy leak.)

O2 — The site-level address-hide decision re-targets only to business-schema
objects (`decisionsForGraph` site-key bridge). The fixture org-schema object's
own `located_at` traversal still surfaces "777 Cut St" in Ask's "I consulted"
summary (A4). The base business itself is fully hidden (A2/A9/P7).

O3 — The two boundaries disagree on field names: the FYD path serves
`password`/`token`/`privateKey` on public objects (no denylist); the legacy
reader blocks exactly those names and nothing else.

## What was verified

Production `next build` of the deployed commit; 24 adversarial requests as a
cookie-less viewer against the real served routes (projection-dir seam,
journal-overlay Ask seam, legacy gateway-reader seam); raw responses saved in
`evidence/`; canary grading in `grade.py` (exit 1 = leaks found, listed above).
Fixture: `seed-fixture.mts` (projection docs digest-signed with the repo's own
`canonicalize`/`sha256Hex`; owner state via the repo's own `applyOwnerCommand`),
`fixture-gateway.mjs` (journal overlay + canonical event stub).

## KNOWN UNPROVEN BOUNDARY

- The fixture's sensitive values sat on PUBLIC objects. The code has no
  field-level secrecy class at all ("PING_ONLY" does not exist in the shipped
  code); object-level `visibility: private` is the only field-hiding mechanism
  and it held. The FAIL is that secret-like values in public-object fields have
  no protection on L1/L2/L3/L4.
- Authenticated/owner-lane paths (owner overrides API, customize/approve) were
  not attacked: the gate is about the public viewer.
- The deployed Vercel instance was not attacked (local production build of the
  exact deployed commit was; Vercel serves the same build output).
- Ask FYD with a real LLM key: the composer ran in deterministic mode; an LLM
  paraphrase layer could only widen, not narrow, these leaks.

## Files committed

- `fyd010-proof/attack.sh` — service orchestration + 24 adversarial probes
- `fyd010-proof/grade.py` — canary grader (exit 1 on any NEVER-SERVE hit)
- `fyd010-proof/seed-fixture.mts` — fixture seeder (repo-owned code paths)
- `fyd010-proof/fixture-gateway.mjs` — journal/gateway stub
- `fyd010-proof/FYD-010-PROOF.md` — this report
- `fyd010-proof/evidence/*` — raw responses (24 probes + gateway/next logs)

Pushed: NO. Production writes: none. Real PII: none.
