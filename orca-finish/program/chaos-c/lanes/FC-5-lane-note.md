# Lane note: FC-5 — stale checkpoint from a deposed worker becomes newest

**To:** impl lanes (checkpoint / resume) | **From:** CHAOS-C Q3 | **Date:** 2026-09-24

## The class
Checkpoint rows carry no writer identity. `restore` takes
`max(checkpoint_id)` blindly. A slow checkpoint from a worker that has since
been deposed (supervisor timeout + reclaim) can commit after the recovery's
own checkpoint and become the newest row. A subsequent restore then
resurrects pre-reclaim state and hides the recovery's progress: silent
LOST-STATE with a perfectly healthy-looking checkpoint chain.

## Evidence (TEST, conf 0.93)
- Probe `probe-3731b5d8` (LOST-STATE): worker-A starts a 5s checkpoint;
  supervisor reclaims to worker-B at 1s; B checkpoints `{"phase":"B-done"}`;
  A's stale `{"phase":"slow-C2"}` commits last and wins max(checkpoint_id).
  Latest checkpoint is the deposed worker's stale state; B's checkpoint is
  buried but still present (forensics can see it, restore will not).
- Repro fixture: `fixtures/fc5-stale-checkpoint-newest.py` (exit 0).
- Kills are clean: SIGKILL mid-slow-checkpoint rolls the partial row back
  (probe-fc4c4be5 SURVIVED). The window needs the writer to SURVIVE, not die.

## What held vs what broke
- HELD: checkpoint atomicity under kill, digest verification on restore,
  stale-checkpoint refusal (`checkpoint_id < max` rejected).
- BROKE: restore's selection rule. "Newest" is not "current" once writers can
  be deposed mid-write. Digests prove integrity, not currency.

## Fix direction
Stamp every checkpoint with the writer's claim: `(writer_id, claim_fencing /
attempt_seq)` columns on the checkpoint row. Restore accepts only
checkpoints whose fencing matches the packet's current claim; a checkpoint
from a deposed writer is detectable (quarantine, don't trust). Optionally,
the slow writer's commit can be made to fail closed with the same
`WHERE claimed_by=? AND attempt_seq=?` predicate as FC-4 — one fencing
discipline covering both classes.

## Counterexample
Digest verification does not help: the stale checkpoint is perfectly
well-formed and digest-valid. The defect is selection, not corruption.
