# Q26 — SECURITY RE-RUN — FYD-010 privacy probes — 2026-10-01 ~18:50 MDT

## PROPOSITION
A public (unauthenticated) viewer can retrieve a PRIVATE / PING_ONLY / OWNER
field through some public read surface. Privacy must hold at the DATA
boundary, not merely be hidden in UI.

## EXACT SHA
`/home/nolan/projects/ping-fyd-converged` @ `6405011d`
(fyd/convergence-2026-09-28). FYD-010 privacy commit `9f9b79f8`
(2026-09-26) is an ancestor of HEAD and of the served build.

## EXACT PLANE
SERVED: `next-server` on :3100, pid 46070, cwd
`/home/nolan/projects/ping-fyd-converged`, `.next` built Sep 30 17:58.
All probes read-only: curl GETs + one POST to Ask FYD. No writes, no auth
bypass attempts, no mutations.

## TARGET DATA
Real private object in the source projection
(`/home/nolan/ping/var/fyd-projections/happy-place.json`):
`website-service-51de038c1defe8bd`, `visibility: "private"`,
title "Pergola Design Consultations", fields {name, serviceType, availability}.
Coppersmith-plumbing has zero non-public objects (control).

## COMMAND / REQUEST + OBSERVED RESULT

1. PROJECTION ENDPOINT — direct object inventory
   `GET /api/fyd/projection?siteId=happy-place`
   -> HTTP 200, 7 objects, all `visibility: "public"`; the private object is
   ABSENT; no field names matching private/_internal/home_address/secret/token/
   password/ssn/dob/PING_ONLY in any object. Same for
   `siteId=coppersmith-plumbing` (8 objects, all public).
   Relationship scan: zero references to the private object id or "pergola".
   PASS.

2. DIRECT OBJECT ID — the private object
   `GET /api/fyd/objects/website-service-51de038c1defe8bd`
   -> `{"ok":false,"error":"Unknown object."}` (404-equivalent). The
   unresolvable-id shape is identical to a genuinely unknown id: no existence
   oracle. PASS.

3. RELATED-OBJECT EXPANSION
   `GET /api/fyd/edge/object?site=happy-place&objectId=website-service-51de038c1defe8bd`
   -> `{"found":false,"reason":"FYD has no record of that entry for this viewer."}`
   PASS.

4. BFF OBJECT VIEW (public object, field-level)
   `GET /api/fyd/objects/website-business-6fa5ebd99d72c4cb`
   -> ok:true; view contains only public fields
   (id/schema/name/category/locationLabel/summary/media/services/serviceArea/
   contact/capabilities/provenance). PASS.

5. ASK FYD — visitor mode, direct question about the private service
   `POST /api/fyd/ask/happy-place` {"question":"Do you offer pergola design
   consultations?","mode":"visitor"}
   -> HTTP 200, answerClass UNSUPPORTED, refusal:true:
   "I cannot answer that: nothing in the site record covers it, and I will
   not guess." The "I consulted" list names only public services. PASS —
   the visitor model context (visitor-safe-fields allowlist) did not contain
   the private object.

6. ASK FYD — hostile mode escalation as public caller
   Same question with `"mode":"owner"` (no credentials supplied)
   -> same refusal, same public-only context. The mode flag does not widen
   the data boundary for an unauthenticated caller. PASS.

7. GENERATED SITE HTML
   `GET /sites/happy-place` (200, 108363 bytes) and
   `GET /sites/coppersmith-plumbing` (200, 134900 bytes):
   zero occurrences of "pergola design consultations" or the private object id
   (case-insensitive). PASS.

8. WHY-THIS (evidence expansion)
   `GET /api/fyd/why-this?siteId=happy-place&objectId=<private-id>`
   -> `{"found":false,"reason":"FYD has no record of that entry, so it cannot
   say why it is shown."}` PASS. (Public object returns evidence normally.)

9. CLAIMS endpoint (identity/verification metadata)
   `GET /api/fyd/claims/url-100680ad546ce6a5`
   -> ok:true with viewer projection `fyd.claim-projection@1`; the fixture
   claim carries no private fields. NOTE: `viewerKind` resolved to "owner"
   for localhost curl because `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` treats
   private-network hosts as the demo owner — a DOCUMENTED demo concession
   (demo owner mode is explicitly not real authentication), not a leak.

10. SEARCH — no public search route exists under `/api/fyd/*`
    (only `/api/mc/search`, an MC-internal route). Nothing to probe. N/A.

## PASS / FAIL / UNKNOWN
**PASS.** Privacy holds at the DATA boundary on the served plane across every
probed surface: projection, direct ID, related expansion, BFF, Ask FYD
(visitor AND hostile owner-mode), generated site HTML, why-this evidence, and
claims. The private object is unresolvable, unlistable, unaskable, and
unrenderable for a public viewer; refusal shapes are existence-hiding
(identical to unknown ids).

## CAVEATS (not failures)
- The served :3100 is the Sep 30 17:58 build (pre-convergence), but the FYD-010
  privacy boundary (Sep 26) is in it — the probes tested served code, honestly.
- Demo-owner mode is ON (`NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`), so localhost
  is treated as the demo owner on owner-lane routes (customize, overrides,
  claims viewerKind). This is the documented demo posture, but it means these
  probes did NOT test a non-demo public-host configuration; on a real public
  host the private-host gate would be the deciding layer. Recommend one
  re-probe after any public-host deployment.
- Only one real private object existed in the demo data (happy-place's
  pergola service); field-level PRIVATE/PING_ONLY taxonomy on individual
  fields (e.g. `home_address` on a public object) has no live fixture data —
  the allowlist code path (`visitor-safe-fields.ts`) is covered by unit tests,
  not by these live probes. A synthetic fixture with a private field on a
  public object would strengthen the next run.
