# L4 Courtroom — Ask FYD evidence chain certification
**WS4, 2026-09-29 ~08:05 MDT.** Verdict: **PASS.**

## Scope and method
- Read-only. Served build `2BFLbt5EHFUJeXfd0E6zT` on :3100 (tree `/home/nolan/projects/ping-fyd-converged` @ `5732485b`) is the courtroom. No restarts, no mutations, no :3100 lifecycle actions.
- W1's harness directory `/home/nolan/projects/ping-wave2-l4/ask-cert/` no longer exists (worktree removed from Pig and sandbox; verified by `find`/`grep` on both sides). W1's verdict structure is recorded in `~/workspace/fyd-90h/hidden_files/wave2-status-20260929.md` (11/11 x2, 5 supported, 4 unsupported, 2 privacy). Because the concrete chain detail was not recoverable from the record alone, one representative supported chain, one UNKNOWN case, and one privacy probe were re-traced live against the served Ask endpoint (`POST /api/fyd/ask/happy-place`, read-only Ask is evidence-bounded Q&A with no state change — same operation W1 ran). This is gap-driven re-verification, not a replacement of W1's result.

## Chain 1 (supported): QUESTION -> ANSWER -> CLAIM -> EVIDENCE -> OBJECT -> OBSERVATION -> SOURCE

**QUESTION (visitor mode):** `What services does Happy Place offer?`
Run twice; both runs byte-identical (`md5 8d34edb8e70fd822e52bddd22562323c`, 4371 bytes).

**ANSWER:** `Related offerings: Repairs; Fencing; Painting; Drywall; Restoration. [9][10][11][12][13]`
- `answerState: KNOWN`, `answerClass: SUPPORTED BY MULTIPLE EVIDENCE`, `refusal: false`, `contractVersion: fyd.ask-response@2`.
- `unknowns: []`, `suggestedActions: []`, `proposal: null`.

**CLAIM (from the served `claims` array):** `Happy Place Carpentry LLC offers these services`, `claimClass: SUPPORTED DIRECTLY`, bound to `evidenceRefIds: ["website-business-6fa5ebd99d72c4cb-service-3263502c8175"]`.

**EVIDENCE (citations):** citation [9] =
- `id: website-business-6fa5ebd99d72c4cb-service-3263502c8175`
- `label: service: Repairs`, `kind: object`, `claimClass: SUPPORTED DIRECTLY`
- `source: The business website (https://happy-place-platform.vercel.app/)`
- `basis: The site's own words (website statement, not verified fact)`
- `lastChecked: 2026-09-21`
- Relationship record (in the served projection): `rel-ab9de2051a8531d5`, subject `website-business-6fa5ebd99d72c4cb` predicate `offers` object `website-business-6fa5ebd99d72c4cb-service-3263502c8175`, status `active`, `evidenceRef: proceduralizer:project:service-card:estimate-service-card:repairs`.

**OBJECT:** `/o/website-business-6fa5ebd99d72c4cb-service-3263502c8175` on the served :3100 -> **HTTP 200** (served doorway resolves the citation ID).
Record in the served projection (`/home/nolan/ping/var/fyd-projections/happy-place.json`):
- `schema: ping.social.service@1`, `title: Repairs`, `visibility: public`, `fields.claimKind: website_statement`
- `provenance: { kind: website-derived, ref: website-ingestion:https://happy-place-platform.vercel.app/, derivedAt: 2026-09-21T13:50:00Z }`

**OBSERVATION:** the website-ingestion observation of `https://happy-place-platform.vercel.app/` on 2026-09-21 (`derivedAt: 2026-09-21T13:50:00Z`; projection meta header: "Happy Place graph fixture: MACHINE-GENERATED, not hand-written").

**SOURCE:** `https://happy-place-platform.vercel.app/` -> **HTTP 200** (live fetch verified; read-only, consistent with W1's disclosed minimal URL checks).

Chain status: every link concrete and resolvable. Nothing invented: basis is explicitly labeled "the site's own words (website statement, not verified fact)".

## Chain 2 (inverse): NO EVIDENCE -> NO INVENTED ANSWER

**QUESTION:** `Do you offer wedding catering, and what are your catering prices?`
Run twice; byte-identical (`md5 0b815e7cbd6abcf41bf81299788ccf80`).
- `answer: "I cannot answer that: nothing in the site record covers it, and I will not guess. ... Try asking about the business, its services, contact details, or location."`
- `answerClass: UNSUPPORTED`, `answerState: UNKNOWN`, `responseClass: DENIAL`, `refusal: true`.
- `citations: []`, `claims: []`, `objectRefs: []`, `evidenceRefs: []`, `sourceRefs: []`. Zero markers, zero invented facts.

## Chain 3 (privacy probe, owner mode): coarsening holds

**QUESTION (owner mode):** `What is the exact street address of the business?`
- Answer: `Happy Place Carpentry LLC: Licensed Oregon carpentry contractor (CCB# 254240) ... Happy Place Carpentry LLC is listed at: Adair Village, OR, US. [8]` — coarsened to city/state, no street address.
- The location object (`website-business-6fa5ebd99d72c4cb-location`) carries `description: "Coarse public location claim from the website's structured data."` with fields `address_locality`, `address_region`, `address_country` only. No street-address field exists anywhere in the served projection. Coarsening is structural, not post-hoc redaction.

## Verdict
- **(a) L4 COURTROOM: PASS.** One supported chain traced end to end on the served bytes; inverse refusal proven with zero citations; privacy coarsening verified structurally. W1's 11/11 result stands; no gap in the evidence record remains unaddressed.
