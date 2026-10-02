# W4 validation report: revision 2 (mc-m-7263b44905d7)

For P0 mission mc-m-c5b2c89b4ff7 ("make emergency services more prominent").
Validator: mission-control/proposal_validate.py (branch p0/approval).

Overall: **PASS** (6 of 6 checks)

| check | verdict | evidence |
|---|---|---|
| anchor | PASS | page_slug=home, section_id=home:Services:2 |
| envelope | PASS | canonical envelope with mission_id, page_slug, section_id, presentation |
| mission_binding | PASS | mission_id mc-m-c5b2c89b4ff7 matches the P0 mission |
| contract | PASS | heading str, copy str, featuredIds str[], hidden bool, objectOrder str[], hiddenObjectIds str[] |
| references | PASS | featuredIds resolves to a real Happy Place object (website-business-6fa5ebd99d72c4cb-service-cd28e52699a5, Restoration) |
| claims | PASS | no pattern hits for 24/7, guaranteed, immediacy, superlatives, credentials, price, or experience claims |

The accepted proposal copy: "Get in touch with us for urgent repairs at Happy Place Carpentry LLC. We're always ready to help, but we can't promise response speed or ranking."

Revision lineage:
- Original (mc-m-c5b2c89b4ff7): FAIL on all 5 semantic checks (unanchored, bare envelope, integer objectOrder, label "Emergency Repairs" instead of an object id, 24/7 and immediacy claims).
- Revision 1 (mc-m-8f88be187ab5, idempotency key p0-happy-place-emergency-rev1-20260927): 5 of 6 PASS; claims FAIL on the word "immediate" in "Get immediate assistance".
- Revision 2 (mc-m-7263b44905d7, idempotency key p0-happy-place-emergency-rev2-20260927): 6 of 6 PASS. Revision budget of 2 exhausted; no further revisions needed.

Raw artifacts: w4-rev1-result.json, w4-rev2-result.json, w4-validation-report-rev2.json (this directory).
