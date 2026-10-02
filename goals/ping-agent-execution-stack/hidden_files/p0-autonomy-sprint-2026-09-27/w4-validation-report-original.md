# W4 validation report: original proposal (mc-m-c5b2c89b4ff7)

Date: 2026-09-27. Validator: `mission-control/proposal_validate.py` (branch `p0/approval`).
Source bytes: `/home/nolan/workspace/mission-control/artifacts/mc-m-c5b2c89b4ff7/result.json`
(the `proposed_patch` inside the fenced JSON block; envelope keys
`analysis`/`rationale` excluded, agent bytes otherwise untouched).
Contract: `src/fyd/sitespec/types.ts` (`FYDPresentation`) from the deployed
tree `/home/nolan/projects/ping`. Graph: `HAPPY_PLACE_GRAPH` fixture
(7 real object ids). Machine report: `w4-validation-report-original.json`.

## Verdict: FAIL (all four substantive checks fail)

| check | verdict | evidence |
|---|---|---|
| (a) anchor | FAIL | bare presentation object: no `page_slug`/`section_id`; the patch is not anchored to any page or section. Known pages: about, explore, home, services. |
| envelope | FAIL | bare presentation object; canonical envelope `{mission_id, page_slug, section_id, presentation}` required |
| (b) contract | FAIL | `objectOrder`: expected list of strings, got int (`5`). Contract says `objectOrder?: string[]` (owner-approved display order of object ids). |
| (c) references | FAIL | `featuredIds: ["Emergency Repairs"]`: `"Emergency Repairs"` is a label, not an object id; it resolves to nothing in the Happy Place graph (7 real ids, e.g. `website-business-6fa5ebd99d72c4cb-service-3263502c8175` "Repairs"). No "Emergency Repairs" service object exists. |
| (d) claims | FAIL | copy asserts `24/7` availability and `immediate` response. Neither claim exists in the ingested website graph; every fixture claim is `website_statement`, and the site never stated 24/7 emergency availability. Flagged as unverified factual claims presented as website statements. |

## What this means

The raw agent output cannot go to Nolan as-is: it names no page/section,
it breaks the `FYDPresentation` type contract, it references a nonexistent
object, and it invents a 24/7 availability fact. Per the W4 brief this is
the correct honest output. No bytes were normalized or fixed.

Next: autonomous revision (Phase 3). The revision mission gets this report
plus the contract, the real object ids, and the valid section ids, and must
return a corrected patch in the canonical envelope shape.
