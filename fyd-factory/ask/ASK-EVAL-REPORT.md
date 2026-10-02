# Ask FYD Evaluation Report

NIGHT-ASK-OWNER, 2026-09-23. Pig repo /home/nolan/projects/ping, branch
fyd-factory, read-only. No repo files were modified or committed; one
temporary test file was added, run, and removed.

## 0. Scope and the wiring seam (read first)

The concierge (`src/fyd/ask/concierge.ts`, LANE-ASK) is NOT wired into any
live path. `~/workspace/fyd-factory/patches/ask-concierge-wire.patch` is
unapplied; verified on the Pig: `grep -c concierge src/fyd/ask/answer.ts`
returns 0, and `answer.ts:8` imports only the legacy `composeAnswer` from
`../../lib/ping/ask-composer`.

The actual live chain is:

```
ask-fyd-widget.tsx --POST /api/fyd/ask--> ask-pipeline.ts (answerAskFyd, :44/:242)
  --> visitor-answer.ts:465 composeAskFyd --> answer.ts:63 composeAskFyd
  --> lib/ping/ask-composer.ts: composeAnswer (legacy composer)
```

This evaluation drove the concierge directly via tsx on the Pig, exactly as
the new preview route (`/home/nolan/fyd-preview-staging/ask/page.tsx`) will.
Every verdict below describes the concierge and the preview route, NOT the
production Ask FYD path. The preview ask page is the first serving path in
which the concierge's throw-on-ungrounded-claim invariant (a
SUPPORTED/DERIVED/INFERRED claim without evidence throws instead of
rendering) actually executes. The live path is covered by TD-002, whose
VULNERABLE verdict (2026-09-23) is folded in as section 4.

Fixture graphs: `HAPPY_PLACE_GRAPH` and `COPPERSMITH_GRAPH`
(`src/fyd/proceduralize/__fixtures__/`), and the clearwater synthetic graph
(`src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json`). All inputs
were projected to public objects only before answering, matching the preview
page's privacy boundary.

## 1. Battery verdicts, per site

Battery, verbatim per site: "What services does this business offer, and how
do you know?" / "Which location is this business in?" / "What source supports
that claim?" / "What conflicts exist in the evidence?" / "What don't you
know?" / "What should the owner fix?"

### happy-place (7 public objects, 6 relationships)

Q1 "What services does this business offer, and how do you know?"
MATCH: provenance (not services; see match-order note in section 3).
VERDICT: supported with citations. 4 SUPPORTED claims (record identity,
source "The business website (https://happy-place-platform.vercel.app/)",
derived date 2026-09-21, basis "The site's own words (website statement, not
independently verified)") plus 1 DERIVED claim listing the consulted
records: Drywall, Fencing, Painting, Repairs, Restoration services and the
Adair Village location record, each cited [1]-[7]. Direct vs derived are
distinguished per claim; no inference was needed.

Q2 "Which location is this business in?"
MATCH: where. VERDICT: supported with citations. 2 SUPPORTED claims:
"Listed location: Adair Village, OR, US" (location record + the recorded
located_at relationship, a relationship_fact citation) and "Service area on
record: Benton, Linn, Marion, and Polk Counties, Oregon" (area_served field).

Q3 "What source supports that claim?"
MATCH: provenance. VERDICT: supported, identical shape to Q1.

Q4 "What conflicts exist in the evidence?"
MATCH: conflicts. VERDICT: correctly reports none. DERIVED claim: "No
conflicting information found. I compared the name, description, location,
and contact details across 2 records and found no contradictions." Correct
for this fixture; the comparison scope is stated, not hidden.

Q5 "What don't you know?"
MATCH: unknowns. REFUSED=true. VERDICT: unsupported facts become UNKNOWN
with reason, in the required form. Three claims, e.g. "[UNKNOWN] Who works
here (names and roles): unknown. The site data has no record of it, so I
will not guess." (also Business hours, The owner's identity).

Q6 "What should the owner fix?"
MATCH: none. VERDICT: fail-closed decline. The concierge answers only its
seven canonical questions; it generated no answer rather than inventing one.

### coppersmith-plumbing (8 public objects, 7 relationships)

Q1: MATCH provenance. VERDICT: supported. Same 4+1 shape; the DERIVED
record list names HVAC, Heating & Cooling, Plumbing, Ventilation, the Grand
Junction location record, and the person record "coppersmithplm".

Q2: MATCH where. VERDICT: supported. "Listed location: Grand Junction,
Colorado, 81501, United States" (location record + located_at relationship).
No area_served field exists on this fixture, so no service-area claim is
made; nothing is invented to fill the gap.

Q3: MATCH provenance. VERDICT: supported, same shape as Q1.

Q4: MATCH conflicts. VERDICT: correctly reports none (DERIVED, comparison
scope stated).

Q5: MATCH unknowns. REFUSED=true. VERDICT: 2 UNKNOWN claims in the required
form: Pricing, The owner's identity. Note: the fixture contains a person
record "coppersmithplm", but no owns/owner_of/founded_by relationship
exists, so the owner-identity probe correctly stays UNKNOWN instead of
promoting a username to an owner.

Q6: MATCH none. VERDICT: fail-closed decline, same as happy-place.

### clearwater-plumbing-demo (25 public objects, 24 relationships, synthetic)

Q1: MATCH provenance. VERDICT: supported. 4 SUPPORTED + 1 DERIVED listing
12 service records, 2 location records (Fruita service depot, Grand Junction
shop), and 3 person records (Alex Morgan, Casey Brooks, Jordan Lee).

Q2: MATCH where. VERDICT: supported. 3 SUPPORTED claims: "Listed location:
Fruita, Colorado", "Listed location: Grand Junction, Colorado" (each with a
location record and its located_at relationship citation), and "Service area
on record: Grand Junction, Fruita, Palisade, Clifton, Loma, Mack, De Beque,
Delta."

Q3: MATCH provenance. VERDICT: supported, same shape as Q1.

Q4: MATCH conflicts. VERDICT: conflicts EXPOSED, not smoothed. Two
conflicts surfaced, each value cited with its source:
(a) business description: the object description ("Clearwater Plumbing Co.
is a family-run plumbing shop serving the Grand Junction area...") vs the
fields.description value (shorter variant); (b) location: "Fruita, Colorado"
vs "Grand Junction, Colorado" via two located_at relationships.
CAVEATS: (i) conflict (b) is arguably two real locations (a Fruita service
depot and a Grand Junction shop), not a contradiction; the scanner flags any
two distinct located_at values as conflicting, which over-detects. (ii) The
fixture's INTENDED conflict (meta.conflictPair: Saturday closing hours,
website "8:00 AM - 12:00 PM" vs Google Business Profile "8:00 AM - 2:00 PM")
was NOT detected: scanConflicts compares only name, description, location,
phone, email, and website (concierge.ts:613-691), never hours, and never
compares the business record against external_identity records. Conflict
detection is honest about what it finds but has blind spots.

Q5: MATCH unknowns. REFUSED=true. VERDICT: 2 UNKNOWN claims in the required
form: Pricing, The owner's identity. Note: Alex Morgan's role field reads
"Owner and lead plumber", but with no ownership predicate the probe stays
UNKNOWN; the role text alone is not promoted to an identity claim.

Q6: MATCH none. VERDICT: fail-closed decline.

## 2. Scoring dimensions

- supported -> answered with citations: HOLDS on all three sites. Every
  non-UNKNOWN claim carries [n] markers resolving to a labeled evidence
  list (record, source, basis, last-checked date).
- unsupported -> UNKNOWN with reason: HOLDS. The unknowns question refuses
  (refused=true) and renders each fact as "[UNKNOWN] <fact>: unknown. <reason>,
  so I will not guess." No guessing was observed in any run.
- conflict -> exposed not smoothed: PARTIAL. Found conflicts are exposed
  with both values cited (clearwater). But the conflict scan misses hours
  disagreements and cross-record (business vs external_identity)
  comparisons entirely (section 1, clearwater Q4 caveats).
- hidden fact -> withheld per projection policy: POLICY LOCATION CLARIFIED.
  The concierge performs zero visibility filtering itself: buildGraphView
  (concierge.ts:350-407) contains no `visibility === "public"` check, and
  only filters relationships on `status === "active"`. Withholding happens
  exclusively when the caller passes a public-projected graph, which the
  preview page does (its publicGraph step) and the live route does
  (publicGraphOf). My two supplemental probes were inconclusive as
  visibility tests (probe A linked the private object to nothing; probe C's
  relationship lacked `status: "active"`, so it was dropped before any
  visibility question arose); the zero-filtering conclusion rests on code
  reading plus TD-002's direct-drive proof (finding B), not on my probes.
- owner-corrected fact -> effective with explainable source history:
  PARTIAL. Clearwater's person records carry owner-asserted provenance
  (`kind: "owner-asserted"`, ref "owner-interview:synthetic"). The "Who works
  here?" answer includes all three people with citations, so the fact is
  effective. But the source history is NOT explainable: the evidence reads
  "Source: The business website. Basis: The site record." because
  sourceFor/basisFor/claimClassFor only special-case provenance kind
  "owner", not "owner-asserted" (concierge.ts:229-236, 308-330). Owner
  authorship is mislabeled as a website statement in the output.

## 3. Match-order finding

The battery's Q1 ("What services does this business offer, and how do you
know?") matches PROVENANCE, not services, because the matcher checks
provenance ("how"+"know") before services ("services"/"offer") in its fixed
order (concierge.ts:141-190). The visitor's services half is satisfied only
incidentally by the DERIVED "related records consulted" list. The canonical
"What services do they offer?" (supplemental probe D) produces the intended
shape: one SUPPORTED claim per service (object + relationship citations)
plus a DERIVED count claim ("The site data lists 5 services for Happy Place
Carpentry LLC"). Compound questions that mix a canonical topic with "how do
you know" will always take the provenance branch today.

## 4. Hostile fold-in (TD-002 verdict: VULNERABLE, 2026-09-23)

TD-002 drove the LIVE path (answerAskFyd -> legacy composer), which section
0 shows the concierge never touches. 13/13 hostile tests passed; permanent
copy at ~/workspace/fyd-factory/tournaments/td-002/td-002-hostile.test.ts.

FINDING 1 (CONFIRMED leak, live path): a street-level address in an
address-bearing field whose name does not contain "address" is served
verbatim. Mechanism: `answerAskFyd` calls `publicGraphOf`, which calls
`applyFieldVisibility(graph, [])` (visitor-answer.ts:184);
`resolveFieldVisibility` (sitespec/field-visibility.ts:72) coarsens only
fields whose name includes "address"; the legacy composer profile branch
reads `fieldOf(target, "location")` (lib/ping/ask-composer.ts:708) with no
read-time coarsening. Reproduction: "Tell me about this business" answered
"Location on record: 999 Secret Lane, Grand Junction, CO 81501." from
`street` and `location` fields, while `service_address` was correctly
coarsened to "Fruita, CO 81521". This contradicts the documented contract at
visitor-answer.ts:14-16 ("an address-bearing field is coarsened, never
leaked verbatim"). Latent for the two demo tenants (they use `address_*`
names); active for any source graph using `street`, `location`, `hq`,
`geo`, or similar names.

FINDING 2 (wiring seam): recorded in section 0. The concierge's grading
invariant protects nothing in production today; the preview ask page is the
first serving path that executes it.

FINDING 3 (owner HIDE ignored by Ask FYD): `applyFieldVisibility` honors
HIDE (field-visibility.ts:107 drops the field; proven by test), but
`answerAskFyd` hardwires `applyFieldVisibility(graph, [])`
(visitor-answer.ts:184) with no channel for owner decisions. Proven: with an
owner HIDE on the business phone field, Ask FYD still answered "Phone on
record: 970-555-0100." Currently latent (decisions have no persistence; the
demo console keeps them in memory), but the ask/render divergence is real
the moment decisions persist. Additionally, the `projectPublicFacts`
docstring (owner-mode/visibility-policy.ts:158) claims Ask FYD consumes
publicFacts; it does not.

WHAT HELD (live path): private OBJECTS (`visibility: "private"`) never
leak. Who-questions name the public person but not the private owner or the
private cell; services questions list the public service only; a private
objectId fails closed as unknown_object; relationships incident to private
objects are dropped by the both-endpoints-public filter; mode "owner" grants
nothing. Matches the existing suite's "non-public objects are never cited
or quoted" test.

My independent re-run attempt: I wrote a 5-assertion hostile jest test,
placed it temporarily at src/fyd/ask/__tests__/night-hostile-eval.test.ts,
and ran the lane jest config. It failed to load: a concurrent lane edited
src/fyd/sitespec/schemas.ts and src/fyd/components/registry.ts at
20:54-20:55 (new src/fyd/sitespec/schema-roles.ts), introducing a circular
import (schemas.ts:13 imports registry; registry.ts:19 imports SCHEMA_ROLES
from schemas, evaluated at registry.ts:72 before schemas finishes). The temp
file was removed afterward; the repo contains no night-* files and its dirty
count is unchanged by me (106 entries, all other lanes). The hostile
findings above rest on TD-002's 13/13 run plus my own line-reference
verification, not on my blocked re-run. I did not fix the cycle; those files
belong to the other lane.

## 5. DEMO_OWNER_MODE spec (preview-scoped)

This spec covers the staged owner-console preview page only. It is not a
production authorization design.

- Preview-scoped only: the page lives in /home/nolan/fyd-preview-staging/
  and is not wired into the repo. Intended mount:
  src/app/preview/owner-console/page.tsx.
- Env-gated: the route returns 404 (notFound) unless
  NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1. The DemoOwnerConsole component itself
  also renders null unless the same gate passes (belt and braces).
- Visibly marked: when enabled, a hazard-striped banner reads exactly
  "DEMO OWNER MODE, simulated authority, preview only", plus a second
  notice disclosing the HIDE divergence (section 4, finding 3) so nobody
  mistakes a console HIDE for an enforced one.
- Fail-closed outside allowed environments: no env var means no route and
  no console output; the gate has no fallback enable path.
- Cannot become production auth accidentally: the page and console use only
  the fail-closed demo identity provider (DemoIdentityProvider, verified:
  false, method "demo-seeded"); they never read real owner credentials, bind
  no real identity provider, and the demo capability verdicts derive from a
  hard-coded relationship mapping, never from the identity. The production
  seam (OwnerIdentityProvider.bindIdentityProvider) is untouched.
- Every simulated action is logged as simulated owner authority; the page
  states plainly that no real authentication, session, or credential check
  occurs.
- The owner remains the authority: nothing in the preview mutates canonical
  state; owner state stays in-memory and is never converted into durable
  owner events by this page.
- Real auth before real external customer control: any future production
  owner surface must be built as a separate, reviewed mechanism; these demo
  verdicts must not be reused, wrapped, or "upgraded".
- Honest divergence disclosure: HIDE decisions made in the console apply
  only inside the console today (in-memory, no persistence) and Ask FYD
  does not consume them.

## 6. Caveats and recommended follow-ups (for the parent, not executed)

1. TD-002 was the pending item in the original brief; its verdict is now in:
   VULNERABLE, one confirmed live-path leak (finding 1).
2. Extend the conservative default in resolveFieldVisibility beyond the
   name-contains-"address" heuristic, or coarsen at the composer read site
   (ask-composer.ts:708), so street-level detail cannot reach visitors
   verbatim regardless of field naming.
3. Thread owner visibility decisions into answerAskFyd before decisions gain
   persistence, or the ask/render divergence becomes a live leak.
4. Decide the concierge's fate: land the wiring patch (the route path feeds
   it projected data, safe) plus a defense-in-depth visibility filter inside
   buildGraphView, or document that it must never receive unprojected data.
   Do not wire it anywhere that can pass a raw graph (e.g. the lineage
   tracer path, src/fyd/lineage/tracer.ts:944).
5. Fix the projectPublicFacts docstring overclaim (visibility-policy.ts:158).
6. Widen the concierge conflict scan (hours; business vs external_identity
   cross-record comparison) or document its comparison scope as the
   "name, description, location, contact details" set it actually covers.
7. Add "owner-asserted" to the concierge's source/basis/classification
   vocabulary so owner-authored facts are labeled honestly.
8. Note on eval conditions: the Pig working tree had 106 dirty entries
   during this run; a concurrent lane's 20:54-20:55 edits broke the ask
   lane's jest module graph (circular import), blocking my hostile re-run
   as recorded in section 4.

## Artifacts

- Staging (Pig): /home/nolan/fyd-preview-staging/ask/page.tsx,
  /home/nolan/fyd-preview-staging/owner-console/page.tsx,
  /home/nolan/fyd-preview-staging/STAGING-README.md (intended mounts:
  src/app/preview/ask/page.tsx and src/app/preview/owner-console/page.tsx).
- Eval runners (Pig staging, outside the repo): eval-ask-battery.ts,
  eval-supplement.ts, eval-output.txt, eval-hostile-live.ts (superseded by
  the jest attempt; the tsx path cannot load the .css-importing chain).
- Local copies: ~/workspace/fyd-factory/ask/staging/ (page sources, runners,
  test).
