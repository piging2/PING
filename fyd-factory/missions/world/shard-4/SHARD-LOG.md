# WORLD-SHARD-4 LOG

## 2026-09-23 ~21:10 MDT: claimed after shard-0

Shard-4 (2000-2499) was unclaimed (shard-0/1/2/3/5 existed). Claimed per the never-idle rule.

## Decisions at 80%+

- Reused the shard-0 harness verbatim, parameterized: run.sh/gen-runner.sh take [START] [END]; shard number derived as START/500 and stamped into each result record (W0_SHARD env).
- No re-validation of harness semantics needed beyond a 5-world smoke (2000-2004): outcomes and shard stamping correct.

## Run

- One tsx invocation, 500/500 missions, exit 0. No tree breakage this run.
- 1 unsafe-urls world (i=2496) exercised the hostile path end to end: neutralized, GENERATED_WITH_WARNINGS.
- Zero crashes, zero unsafe schemes in output, zero unbound claims, zero hidden leaks, zero validator errors.

## Post-shard

Shard-4 done with no new defect classes. Continuing the never-idle chain: next unclaimed is shard-6 (3000-3499).
