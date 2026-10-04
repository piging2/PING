# Self-audit 2026-10-04: adherence gate must not match on trade-descriptor tokens alone

## What the agent had to reason about
The 20261004-210608 d-segment-deep-dive and 20261004-210828 a-weak-website-hunt
answers named 24 businesses. The answer-adherence gate (check_answer_negatives.py,
built 2026-10-04) classified 18 as RE-SERVED and 6 as NOVEL. Independent web
verification of all 24 (3 parallel auditors, evidence-graded) proved THREE of
the gate's RE-SERVED classifications were cross-entity misattributions — the
fuzzy matcher collapsed genuinely distinct businesses because their names
share only generic trade-descriptor tokens:

1. "B & B Plumbing & Heating" (Rifle; rifleplumber.com, (970) 625-3370, 1831
   Railroad Ave, family-owned since 1974) matched "Sanders & Johnson Heating,
   Cooling & Plumbing [brief-negatives]". Shared tokens after norm: {plumbing,
   heating} — the "B & B" initials vanish (single-char fragments are dropped),
   leaving only descriptors. Sanders & Johnson is a Denver-area company.
2. "ASAP Sewer & Septic Services" (Clifton; 3236 Downey Cir E) matched
   "B & R Septic Services, Inc. [pipeline]" (BBB: 603 Handy Dr Carbondale,
   (970) 963-3814). Shared tokens: {septic, service} — pure descriptors.
   Different town, different company.
3. "Midnight Plumbing & Heating" (HQ 779 24 Rd Grand Junction, (970) 241-5894,
   locally owned since 1995) matched "S & R Plumbing & Heating [brief-negatives]"
   (206 W Main St Montrose, (970) 249-9212, owner Norman Ryser). Shared tokens:
   {plumbing, heating} — descriptors. Different town, phone, address, owner.

A false RE-SERVED is the expensive direction for this gate: the business never
enters the verification queue, so a genuinely new prospect is silently missed
(Rifle B&B is a real family shop the gate hid). A false NOVEL only costs a few
searches. The gate's purpose (stop verification spend on re-serves, built for
the 2026-10-04 100%-re-serve spike) is preserved; only descriptor-only matches
lose their auto-RE-SERVED privilege.

## Invariant (now machinery-owned)
A name-token subset match counts as RE-SERVED only if the shared token set
contains at least one distinctive (non-trade-descriptor) token. A subset
relation on generic trade descriptors alone ("plumbing heating", "septic
service", "sewer drain cleaning") NEVER auto-classifies RE-SERVED.

TRADE_DESCRIPTORS (singular forms; norm already singularizes): plumbing,
plumber, heating, hvac, septic, sewer, drain, electric, electrical,
electrician, roofing, roofer, roof, landscape, landscaping, lawn, concrete,
fence, fencing, appliance, repair, service, clean, cleaning, construction,
contractor, mechanical, air, conditioning, cooling, pump, drill, drilling,
excavate, excavation, paint, painting, painter, garage, door, pest, control,
solar, chimney, sweep, carpet, tree, move, moving, haul, hauling, junk,
removal, remodel, remodeling, handyman, inspect, inspection, rooter.

Exact normalized equality keeps its existing behavior (unchanged).

## Fix
- tandem/check_answer_negatives.py: TRADE_DESCRIPTORS frozenset added;
  names_match() subset branch now requires bool(small - TRADE_DESCRIPTORS).
- Self-test cases added: the 3 production misattributions (must be False)
  plus distinctive-token positive controls (must stay True).

## Test
`python3 tandem/check_answer_negatives.py --self-test` -> all checks passed
(includes the 3 new production cases + 2 positive controls).
`python3 tandem/covered_names.py --self-test` -> unchanged, passed.
`python3 tandem/distill-sweep.py --select --cap 5` -> runs; adherence output
recomputed under the tightened rule.

## Boundary / not claimed
- Same-name distinct entities (Rifle B&B vs Delta B&B: identical normalized
  names, fully distinct businesses) are NOT solved here — that needs
  contact-route (phone/address/domain) corroboration, i.e. entity resolution,
  not name matching. The gate's exact-equality branch still fires on those;
  verification (not the gate) is where identity confusion gets resolved, as
  it was this pass.
- Descriptor-only NOVEL classifications now enter the verification queue;
  slight verification-spend increase is accepted (missed prospect > wasted
  searches, per the expanding-pool law).
- The pipeline-text substring tier (norm_substr) is untouched.
