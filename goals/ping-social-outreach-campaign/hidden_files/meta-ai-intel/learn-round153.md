# LEARN — outreach-engine round 153 (2026-09-27)

## Observation: canonical-store bulk-edit hygiene — assert match count, diff distributions, keep the preflight hash as the restore anchor

VERIFIED this round: a single-row canonical JSONL update script carried a boolean-filter bug (`and`/`or` precedence in a Python row filter: `(name == X and 'Delta' in town) or business_name` evaluates TRUE for every row with a non-empty name). It marked all 305 rows of `~/workspace/your_files/western-co-prospects.jsonl` as SUPPRESS with a fabricated "closed" suppression_state. The bug was detected in the same run (the script's own debug output showed `changed: 305` against an intended 1). Recovery: the run-start preflight had re-synced the goal mirror FROM canonical before any mutation (sha256 95e1f958157f logged in the preflight output), so the mirror was byte-identical to the pre-mutation canonical. Canonical was restored from the mirror (hash verified), then the single Integrity Electric row was re-applied atomically (exact-name match, `assert len(matches) == 1`, distribution diff confirmed only that row changed: SUPPRESS 5 -> 6, WARM 90 -> 89). Zero data loss.

PATTERN (generalizable, durable rule): any bulk edit to a canonical store must (1) match on exact identity and ASSERT the match count before mutating (fail the script, not the data), (2) diff the value distributions of mutated fields before/after and abort if any row beyond the intended target changed, (3) keep the run's preflight hash as the restore anchor. The mirror-recovery worked only because the preflight log carried the exact good hash; without it the corruption would have been indistinguishable from a legitimate bulk suppression.

WHY IT MATTERS: canonical stores are the authority the send-eligibility gate and every queue trust. A silent mass-SUPPRESS would have frozen the entire outreach pipeline (300 rows suppressed = zero eligible prospects, zero sends, zero ladders) with every downstream record faithfully citing the corrupted canonical. The bug class is common in hand-written filter lambdas; the three checks above make it fail loud instead of fail corrupt.

UNCERTAIN: none material; recovery verified byte-for-byte.

SOURCE EVIDENCE: `~/workspace/outreach/prospect-mirror-preflight.py` output line ("copying canonical (sha256:95e1f958157f)" + "post-copy verification passed"); mirror at `~/workspace/goals/ping-social-outreach-campaign/files/western-co-prospects.jsonl` (hash 95e1f958157f post-restore); distribution diffs captured in round-153 run logs; Integrity Electric row AFTER state (suppression_state "closed 2026-09-27 (permanently closed: Google listing operating status + own self-description 'out of business closed'; engine reconciliation round 153)").

## Provenance

- Raw artifact: this file (learn-round153.md), written by outreach-engine round 153.
- Verification: preflight hash line from the run's preflight output; mirror hash verified 95e1f958157f before and after restore; row-count (305) and distribution diffs captured in the run transcript.
- Nothing here is a prospect row; no unverified claims; no contact info invented.
