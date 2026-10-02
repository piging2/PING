# CLAIM LOCK TEST EVIDENCE

Mechanism: ~/workspace/fyd-factory/missions/claim.sh
Tested: 2026-09-24 ~05:20 MDT. Result: 29 passed, 0 failed.

## Design under test

- Atomic primitive: the claim marker is built complete (owner file with worker
  id, pid, host, claimed_at, lease_sec, expires_at) in a private staging dir,
  then published with a single `mv -T` (rename semantics). The marker is never
  visible half-written.
- `claim` wins if no marker exists, takes over if the lease is stale
  (now > expires_at, default lease 6h), and fails loudly (exit 1, message to
  stderr) if a fresh lease exists.
- `renew` (owner only), `release` (owner only), `status` (read-only).
- Takeovers are recorded in `.claim/history`; the owner file carries a
  `takeover-from` note.

## What was tested

All tests ran against an isolated scratch missions root
(`/tmp/fyd-claim-test/missions` via `FYD_MISSIONS_DIR`); the real missions tree
was never touched (verified: no `.claim*` leftovers afterward).

- T1: 20 rounds of two concurrent `claim` calls on the same shard. Every
  round: exactly one exit 0, the other nonzero, and `.claim/owner` names the
  winner.
- T2: stale lease (2s lease, 3s wait) taken over by a second worker; owner
  becomes worker-B, `note=takeover-from=worker-A`, history entry recorded.
- T3: fresh lease blocks a second claim (loud failure); non-owner `release`
  refused; owner release removes the marker; re-claim after release succeeds.
- T4: `renew` extends the lease past the original expiry (second worker still
  blocked); non-owner `renew` refused.
- T5: `status` reports CLAIMED / UNCLAIMED correctly.

## Bugs the tests caught (both fixed, suite re-run green)

1. Half-written marker misread as stale. First implementation did
   `mkdir .claim` then wrote the owner file inside. A concurrent loser could
   observe the marker before the owner file existed, classify it "stale"
   (missing expiry), and steal a brand-new claim. Fixed by stage-then-publish:
   the marker appears atomically, complete.
2. `mv` without `-T` reported success when the target existed. `mv staged
   .claim` with an existing `.claim` dir moves the staged dir INSIDE it and
   exits 0. The post-publish ownership check caught it ("published marker is
   not ours"), which is how the test surfaced it. Fixed with `mv -T`
   (rename semantics: fails over an existing non-empty marker).

## Residual risk (documented, not hidden)

The stale-takeover path has an irreducible microsecond race: a rival can
publish a fresh marker between our staleness check and our removal. The code
shrinks this with an identity re-check before removal and a rival-publish
check after; the protocol backstop is the re-list-before-write rule (a worker
taken over mid-flight sees the foreign `.claim` on its next pre-write check
and must stop, never write).

## Full test log

```
PASS: round 1: winner=worker-A, loser exited nonzero, owner file agrees
... (rounds 1-20, all PASS; winners split across worker-A and worker-B)
PASS: stale takeover: worker-B owns it, note=takeover-from=worker-A, history recorded
PASS: fresh lease blocked worker-B (loud failure)
PASS: non-owner release refused
PASS: marker removed on release
PASS: re-claim after release succeeded
PASS: renewed lease still blocks worker-B past original expiry
PASS: non-owner renew refused
PASS: status shows CLAIMED
PASS: status shows UNCLAIMED after release
RESULT: 29 passed, 0 failed
```

Test script: /tmp/run-claim-tests.sh (ephemeral; the assertions above are the
durable record).
