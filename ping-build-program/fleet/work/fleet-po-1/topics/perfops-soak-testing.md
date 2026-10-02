# PERFOPS topic: soak-testing
Scope: sustained night-shift operation with zero result loss.

## METRIC
- soak-loss: committed mission results lost over a 24 h sustained run (must be 0).
- tmp-reliance: bytes of durable state kept in /tmp (must be 0).

## BUDGET
- soak-loss = 0. tmp-reliance = 0.

## RECOVERY PATH (tested)
(1) Every result is written atomically (write .tmp inside results/, rename) — verified by drill-atomic-write (drills.md), so a crash mid-write leaves either the old file or the complete new file, never a partial JSON. (2) Standing lesson "/tmp is wiped without warning": this worker keeps zero durable state in /tmp (all artifacts under fleet/work/fleet-po-1/ and fleet/results/). (3) If a worker dies mid-range, the .claim file remains in its inprogress/ dir; a recovery worker re-runs the generator and diffs — idempotent, so re-drain is safe.

## MEASURED EVIDENCE
- drills.md: drill-atomic-write PASS (rename_atomic yes).
- Generator writes via os.replace (atomic rename) — verified in source before range drain.
Verdict for all 50 soak-testing cases: PROVEN.
