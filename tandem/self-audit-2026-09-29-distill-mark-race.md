# Self-audit 2026-09-29 — distill-sweep.py --mark concurrent-write race (PROMOTED)

## What the agent had to reason about
Two `distill-sweep.py --mark` calls run in parallel in one turn raced on the
ledger. One died with `FileNotFoundError: distill.jsonl.new`, the other's
stdout claimed success while its entry never reached `distill.jsonl`. Manual
recovery (re-run serially, verify tail) worked, but the reasoning "serialize
ledger-mutating CLI calls by hand" is the kind of thing that should be
machinery, not agent discipline.

## The invariant (specified)
`mark_distill` must be safe under concurrent invocation: every call that
exits 0 must have its entry durably in `distill.jsonl`, with no lost updates
and no exceptions from writer-writer contention.

## Production evidence
- This pass: 2 parallel `--mark` calls sharing the fixed tmp path
  `distill.jsonl.new` → one `FileNotFoundError` on `os.replace`, one entry
  silently missing from the ledger despite exit 0 on stdout.
- Probe `/tmp/test-distill-race.sh` (15 rounds × 2 concurrent `--mark`):
  pre-patch lost 2/30 entries.

## What did NOT work (recorded so nobody re-tries it)
Wrapping read-modify-write + `os.replace` in `fcntl.flock(LOCK_EX)` with a
pid-unique tmp still lost entries (probe: 14/30 lost, both processes exit 0).
Root cause: the flock binds the *inode*, but `os.replace` swaps the inode out
from under the path. A waiter that `os.open`ed the path *before* the replace
locks the STALE inode, reads stale content, and its replace silently drops the
winner's entry. Locking the inode while renaming the path is fundamentally
the wrong pairing.

## The fix (automated in distill-sweep.py, mark_distill)
Append-under-exclusive-lock, no tmp file, no rename:
`os.open(LEDGER, O_WRONLY|O_CREAT|O_APPEND)` → `flock(LOCK_EX)` →
single `os.write` of one JSON line → `fsync` → unlock → close.
`O_APPEND` always writes at the true end of the current inode; the lock
serializes writers; there is no stale-inode window because the path is never
renamed.

## Test result
Same probe post-fix: 30/30 entries landed, 15/15 rounds clean. RACE_TEST PASS.
Ledger restored to 69 lines (probe lines removed); the two legitimate marks
from this pass (`20260929-150414-b-new-business-radar.md`,
`20260929-150700-d-segment-deep-dive.md`) verified present.

## Reasoning removed from the agent
Agents no longer need to serialize `--mark` invocations manually; concurrent
marks are now safe by construction.

## Follow-up (not promoted, needs its own evidence)
`runs.jsonl` is appended by `meta-pass.sh` — check whether that writer has the
same lost-update class before the next incident, rather than after.
