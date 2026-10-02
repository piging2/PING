# WORLD-SHARD-6 LOG

## 2026-09-23 ~21:15 MDT: claimed after shard-4

Shard-6 (3000-3499) was the next unclaimed shard (0/1/2/3/4/5 existed). Claimed per the never-idle rule.

## Decisions at 80%+

- Same parameterized harness (run.sh [START] [END]); shard number derived as START/500. 5-world smoke first (3000-3004): franchise-lookalike classified IDENTITY_AMBIGUOUS as designed.

## Run

- One tsx invocation, 500/500, exit 0. No tree breakage.
- First live ACQUISITION_FAILED (48) and IDENTITY_AMBIGUOUS (18) outcomes in the factory; both typed, no untyped throws.
- Zero crashes, zero unsafe schemes, zero unbound claims, zero hidden leaks, zero validator errors.

## Post-shard

Continuing: next unclaimed is shard-7 (3500-3999), which should exercise the last untested hostile, rtl-text.
