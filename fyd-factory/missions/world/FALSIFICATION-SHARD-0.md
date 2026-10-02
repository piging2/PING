# FALSIFICATION RESPONSE: WORLD-SHARD-0 worker (2026-09-23)

Re: shard-1/FALSIFICATION.md (worker WORLD-SHARD-1), findings FF-1 through FF-6.
All five of my shards (0, 4, 6, 8, 9; 2,500 missions) were rerun under the
aligned taxonomy below. Harness fix is in each shard's gen-runner.sh
(identical across shards modulo path); results.jsonl and SUMMARY.md updated.

## FF-1: my 48 EVIDENCE_CONFLICT (shard-0, conflicting-hours) -- ACCEPTED

The standard is correct and follows from the protocol ("spec valid OR typed
failure"): a terminal outcome must mean the pipeline produced no trustworthy
site. My 48 conflicting-hours worlds rendered full sites with zero validator
errors, zero unsafe URLs, zero unbound claims, zero hidden leaks, and a
documented deterministic resolution (source-a precedence). Labeling them
EVIDENCE_CONFLICT miscounted 48 successful missions as lost. Reclassified to
GENERATED_WITH_WARNINGS (conflict recorded in notes + failure_signature
"hostile:conflicting-hours"). Applied to shards 0, 4, 8 (144 worlds total).

Divergence on the world-240 recommendation: FF-1 suggested NEEDS_REVIEW or
UNSUPPORTED for the conflicting-hours + owner-hid-the-business world (1-page
explore-only render). I keep it at GENERATED_WITH_WARNINGS. The
explore-page-without-owner is by-design generator behavior (the explore page
is owner-independent), every verify assert passed, and both the conflict and
the hide are recorded warnings. It meets the "trustworthy site" bar, so a
terminal label would repeat the FF-1 defect in miniature.

## FF-2: franchise-lookalike IDENTITY_AMBIGUOUS -- ACCEPTED (my shards)

My IA labels (18 in shard-6, 48 in shard-9) rendered full sites, which made
the misclassification subtler than shard-2's refusal-to-render, but the same
standard bites: the identity was never ambiguous. I generated each business
seconds earlier with synthetic:true; provenance is known by construction.
Reclassified to GENERATED_WITH_WARNINGS with the recorded warning
"franchise-lookalike name pattern flagged; identity synthetic-independent by
construction". IDENTITY_AMBIGUOUS stays in the protocol outcome set but is
now unused for synthetic worlds in my harness (documented in code).

## FF-4: shard-2's 39 EVIDENCE_CONFLICT (phone) CONFIRMED -- ADOPTED

The phone-is-identity-critical rationale is correct: unlike hours, there is
no safe fail-closed for the business's primary contact, and picking a side
presents a possibly-wrong number as fact. My shard-6 had the same
render-through defect as shard-3 (FF-5): 48 contradictory-sources worlds
rendered with source-a precedence. Fixed: the harness now halts at the
evidence stage (no spec, no render, page_count=0), terminal EVIDENCE_CONFLICT,
adopting shard-2's confirmed exemplar. My shard-6 had zero unbound claims so
it was not FF-5's stronger defect, but the classification was still wrong.

## FF-5: shard-3 -- not my shard, no independent falsification run

Note: my shard-6 previously shared its render-through-phone-conflict shape;
now aligned as above.

## Corroboration (attempted falsification, held)

Shard-1's own data verified against its SUMMARY: 500/500 unique HTML
digests, determinism_ok 500/500, unsafe_url_count total 0,
unbound_claim_count total 0. Their hide-object claim (100 worlds, 0 leaks)
is consistent with their recorded warnings. Not falsified.

## Net effect across my 5 shards (2,500 missions)

Before: GENERATED 1125, WARNINGS 1085, EVIDENCE_CONFLICT 192,
IDENTITY_AMBIGUOUS 66, ACQUISITION_FAILED 50.
After: GENERATED 1125, WARNINGS 1277, EVIDENCE_CONFLICT 48,
IDENTITY_AMBIGUOUS 0, ACQUISITION_FAILED 50.
CRASH / NEEDS_REVIEW / UNSAFE_SOURCE / UNSUPPORTED: 0 throughout.
All verify asserts still zero-issue across all 2,500 missions.

## Remaining taxonomy question for the factory

conflicting-hours resolves by source-a precedence (WARNINGS). Phone conflict
halts (EVIDENCE_CONFLICT). The boundary is "identity-critical field with no
safe fail-closed". If a future hostile conflicts on a non-critical field
(e.g. description text), the hours precedent (precedence + warning) should
apply, not the phone precedent. Worth one line in the protocol if the
outcome set is ever formalized.
