# Instagram second-chance experiment (2026-09-23)

Nolan-approved bounded experiment: re-verify near-misses rejected for
"no post link found" after the known Pig CDP DOM defect (header innerText
empty, post grid not rendering /p/ or /reel/ anchors). Guard NOT weakened:
near-miss -> `instagram-cli user-profile` (country = precision gate) ->
deterministic eligibility -> normal guard check.

## Sample

25 near-miss handles drawn from the "no post link found" rejections in
`instagram-engagement.md` (lines 662-1709; 84 unique such handles total).
Raw profiles: `hidden_files/ig-second-chance-profiles.jsonl`.

## Totals

- NEAR-MISSES SAMPLED: 25
- PROFILE-VERIFIED (profile exists): 24 (`@deltaplumber` not found)
- ACTUALLY ELIGIBLE: 2
- FALSE NEGATIVES: 2
- STILL REJECTED: 23

## Eligible (guard-checked ELIGIBLE, no prior engagement)

1. `@electrician_egm` — EGM Electrician Clifton. US, business account,
   Clifton CO (Tier 1 core corridor), 176 posts, public.
   Post URL verified: https://www.instagram.com/p/C5mkmBPumds/
   Guard: ELIGIBLE (no prior engagement).
2. `@telluridevalleyroofing` — Craig Rogers, "40+ years of quality roofing in
   the greater San Miguel County Area". US, business account, San Miguel
   County (Tier 3 Western Slope), 1 post, public.
   Post URL verified: https://www.instagram.com/p/DLnVQsTO37S/
   Guard: ELIGIBLE (no prior engagement).

## Still rejected (23) with reason

Location gate (country field): `@j.craigelectric` (CA, Kawartha Lakes),
`@bayfield.electric` (CA), `@deltagroup_landscaping` (IE, Dublin),
`@landscapingcortez` (NI), `@riflerooftop` (TR). Not found: `@deltaplumber`.
Wrong geography (US but not Western CO): `@cortez.landscaping` (Santa Cruz CA),
`@delta_oak_landscaping` (Sacramento), `@electricaspen` (Indiana),
`@craig_roofing` (Ohio 330), `@deltaplumbinganddrain` (Arizona),
`@palisaderoofing` (Palisade, Tennessee — zip 37617),
`@palisadesroofing` (Santa Monica CA), `@roofandrifle` (Littleton CO, Denver
metro, deprioritized; also a marketplace, not a trade).
Not business accounts: `@delta.plumbing` (personal), `@delta.tree.service`
(personal, no identity), `@roofer.dad` (personal), `@theriflebakery`
(personal AND private).
Location unconfirmable (fail closed): `@aspen.electric.hvac` (US business,
9 posts), `@cortez__electric` (US creator, 33 posts), `@deltacoreelectric`
(US business, 16 posts), `@cortezfineconcrete` (US business, 2 posts).
No posts: `@deltatreeservice` (personal, 0 posts).

## Key secondary finding

23 of the 24 existing profiles HAVE posts (post_count > 0). The CDP funnel's
"no post link found" rejection was factually wrong in nearly every case,
including 100+ post accounts: `@electrician_egm` (176), `@deltaplumbinganddrain`
(138), `@palisaderoofing` (134). The post-grid extraction failure is
systematic, not genuine emptiness. The funnel's location/account-type judgment
was nevertheless mostly right: the majority fail on geography or business-type
gates independent of the post-link defect.

## Method notes

- `instagram-cli accounts` confirmed connected (`nolanpigi`); all 25
  `user-profile` calls succeeded from WSL, no Pig CDP path needed.
- Pig CDP wedge is still present per the automation health report
  (IG + Threads surfaces quarantined; needs Nolan's manual Chrome restart),
  but this experiment did not depend on the Pig, so no route verification or
  retries were required.
- No engagement actions were taken; the two eligible candidates were only
  guard-checked, not liked.

## Recommendation (not implemented)

False negatives are real but small in this sample: 2 of 25 (8%).
Durable fix, two options for the coordinator:
(a) One-time batch re-verification of the remaining ~59 near-miss handles via
`instagram-cli user-profile` + `posts` (API path works; no Pig needed), then
feed guard-eligible survivors into the normal Instagram discovery pool.
(b) Longer term: the Pig CDP discovery funnel's post-link extraction needs the
DOM fix (post grid not rendering /p/ or /reel/ anchors); until then, treat
"no post link found" as UNVERIFIED, not as empty, and route those handles to
the API verifier instead of dropping them.
Either way, keep the guard exactly as fail-closed as it is.
