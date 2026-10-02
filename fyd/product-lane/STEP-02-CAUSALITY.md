# STEP 2 — GRAPH → EXPERIENCE CAUSALITY (2026-09-23)

## First broken step found: SITE PLANNER (fixed generically)

**Symptom.** The Coppersmith graph contains a real relationship:
`person(coppersmithplm) —works_for→ business`, status active, public,
evidence `website-ingestion:https://www.coppersmithplumbing.com/`.
The site generator ignored it completely for role composition: no People
section, no ObjectRail featuring, because `group()` only matched
forward predicates (`employs`, `has_member`) with `subject === owner`.

**Why it counts as broken (not a judgment call).** The codebase's own
eligibility contract (`src/fyd/builder/eligibility.ts`) states:
"person + works_for (either direction to the owner) -> People (team)
eligible" and "how website-ingested graphs record employment."
`deriveEligibility` returned People=eligible for Coppersmith while the
generator emitted no People section: the defensive filter and the
generator disagreed. The proceduralizer's PREDICATE_MAP deliberately
emits `works_for` for schema.org worksFor; the planner's predicate set
could never match it. Relationship exists → section NOT eligible →
relationship invisible to composition. That is the directive's STOP
condition, verbatim.

**Generic fix (not site-specific).** Role predicates now match in both
directions via `INVERSE_ROLE_PREDICATES`:
- person: forward employs/has_member, inverse works_for/member_of
- service/product: forward provides/offers, inverse provided_by
- post/article: forward publishes, inverse published_by/authored_by

Every inverse entry is a predicate the proceduralizer emits or the
schema defs declare (provided_by, published_by); nothing speculative.
Changed: `src/fyd/sitespec/types.ts` (optional `inversePredicates` on
FYDQuery, backward-compatible), `src/fyd/proceduralize/generator.ts`
(bidirectional `group()` + queries), `src/fyd/components/renderer.tsx`
(`resolveQuery` honors inverses, dedupes doubly-linked objects),
`src/fyd/builder/eligibility.ts` (mirrors generator exactly),
`src/fyd/object/view.ts` (structuredServices agrees with pages).
Regression tests added in `generator.test.ts` (works_for-only,
both-directions dedupe, forward employs).

## Causality table (post-fix)

| # | Graph difference (A vs B) | Planner decision | Spec difference | Visible difference |
|---|---|---|---|---|
| 1 | A: provides→service(1). B: none. | A: services=[1] → Services eligible. B: services=[] → ineligible. | A: home:Services:2 + services page. B: absent. | A renders service cards + Services nav; B does not. |
| 2 | A: located_at→location. B: located_at→location. | Both locations=[1] → eligible. | Both home:Locations. | Both render location. |
| 3 | B: person—works_for→business. A: none. | B: people=[1] via inverse → People eligible. A: people=[]. | B: home:People:3, about:People:1, home:ObjectRail:8. A: absent. | B renders People section + object rail; A does not. |
| 4 | B: 4 public objects (business/location/person feed-eligible). A: 3. | B: explore eligible (>=4 + feed schema). A: not. | B: explore page. A: absent. | B has Explore nav + feed; A does not. |
| 5 | B: person links_to ext_identity. A: none. | ext_identity has no role; Links via website field (both). | No spec delta from the identity object. | None at object level; the connection is composed via Links. |

Row 5 is an observation, not a break: the semantic fact (business ↔
coppersmithplumbing.com) IS composed through the Links section; there
is no component for external-identity objects and none is demanded.

## Evidence-quality note (not a failure)

The B person is the WordPress author handle "coppersmithplm", not a
named team member. The planner surfaces what the evidence says,
honestly labeled ("Person described in the website's structured
data", website_statement); the owner-correction lane (step 6) exists
precisely so an owner can hide it. Mechanism correctness and evidence
quality are separate concerns; the fix addresses the mechanism.

## Verdict

GRAPH → SITE CAUSALITY: PASS (after the generic planner fix).
Every object/relationship difference between the two graphs now drives
a planner decision, a spec difference, and a visible difference, or is
accounted for (row 5).
