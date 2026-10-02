# FYD cumulative clean-checkout replay #2 — FYD-011..026b stack

Date: 2026-09-27 ~11:15-11:50 MDT. Replay agent: Pigi (subagent, depth 1).
Task: second cumulative clean-checkout replay of the backlog-burn defect
stack before it is treated as canonical. Lane self-reports are hypotheses
until replayed; every item below was replayed from a CLEAN checkout, never
from a lane's own tree.

## The object under test

Repo: ~/workspace/fyd-build. Clean worktree:
`~/workspace/fyd-replay-2026-09-27-r2`, detached HEAD
`841825c49fb3c41a36e13b21056793e04105bd0c` (FYD-026b). Worktree `git
status` clean before, during, and after (build artifacts, serve-proofs,
and the node_modules symlink were removed afterwards; the worktree is
left pristine at the stack tip).

The "eleven branches" are one linear stack, zero merges:

```
b0cef74 (base)
 -> ba1bbc1  FYD-011: surface open conflicts in Ask FYD answers
 -> d827d31  FYD-016: owner address override survives changed-source regen
 -> c6e35d3  FYD-014: WHY THIS? visible interaction in the browser
 -> 5cd20d5  FYD-024: Ask FYD answers versioned against graph snapshot
 -> a8e1878  FYD-022: per-value regeneration provenance
 -> 8937576  FYD-013: stale/superseded evidence policy
 -> c3736c9  FYD-017: per-field observed/visibility/presentation triple
 -> eb20998  FYD-018: explicit owner correction record
 -> 590c640  FYD-026: claim classifications enforced at write time
 -> 1cf65d9  FYD-025: semantic determinism as permanent regression
 -> 841825c  FYD-026b: OWNER_AUTHORED wiring at overlay/claim boundary
```

Branch-tip verification (2026-09-27): fyd-011-conflict-surfacing=ba1bbc1
MATCH; fyd-013-superseded-evidence=8937576 MATCH; fyd-017-field-triple=
c3736c9 MATCH; fyd-018-correction-record=eb20998 MATCH;
fyd-026-claim-classifications=590c640 MATCH. fyd-016-correct-survival tip
is a8e1878 (FYD-022 stacked on it; the FYD-016 commit d827d31 is in its
history) and fyd-025-semantic-determinism tip is 841825c (FYD-025's own
commit 1cf65d9 is its parent) — both expected from the linear-stack
design, not mismatches.

## Whole-stack verification (clean worktree, node_modules symlinked)

- `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.
- `npx jest --config jest.config.cjs`: **42 suites / 320 tests, ALL PASS.**
  (Run in the non-canonical worktree path
  `~/workspace/fyd-replay-2026-09-27-r2`, which also re-proves the
  FYD-012 lint checkout-location hardening from b0cef74: the integration
  replay's location-coupled failure does not recur.)
- `npm run test:refresh` (node --test): 21 pass, 0 fail.

## Per-item replay verdicts

| Item | Replay verdict | Evidence |
|---|---|---|
| FYD-011 conflict surfacing | REPLAY_PASS | conflict-surfacing.test.ts 10/10 in-tree; served proof (real refresh-lane detectConflicts via node type-stripping + BUILT dist ask modules over HTTP, ephemeral :41369): 12/12 checks PASS — 200, winner presented, [conflict flagged], surfaceText verbatim, exactly one conflict carried (phone gated out), winner=website claim, loser=facebook claim, both kept, loser evidenceRef named, view_why_this offered, no phone value in served JSON, no phone conflict. Script: fyd-cumulative-replay-011-serve-proof.mts (this dir). |
| FYD-013 superseded evidence | REPLAY_PASS | fyd-013-superseded.test.ts + fyd-013-serve-proof.test.ts PASS in-tree (fail-closed superseded_evidence on both binding surfaces, ephemeral-port served proof). |
| FYD-014 WHY THIS? visible (+FYD-015 machine-walkable hops) | REPLAY_PASS | why-this-visible.test.ts 5/5 in-tree; served proof: rebuilt dist from the clean tree, served /sites/happy-place on ephemeral :34217 — 8 server-rendered Why this? affordances, drywall chain hops in served bytes (value->field->evidence->observation), /api/why-this returned 6 typed chain hops. Script: fyd-cumulative-replay-014-proof.cjs (this dir). |
| FYD-016 owner correction survival | REPLAY_PASS | correct-regen.test.ts 9/9 in-tree; adapted serve-proof (imports rebound to the clean tree, dist built from it, ephemeral :45633): 6/6 PASS — owner routes show corrected phone/address, observed routes show source values, Demo addition badge. |
| FYD-017 field triple | REPLAY_PASS | field-triple.test.ts 7/7 + field-triple-served.test.ts 2/2 in-tree (ephemeral port; visitor bytes contain neither observed nor corrected phone). |
| FYD-018 correction record | REPLAY_PASS | owner-correction-record.test.ts 5/5 in-tree; adapted serve-proof (clean tree, ephemeral :44645): owner view served bytes carry explicit target/before/after/classification/timestamp/actor (before=+15412865190, after=+1-970-555-0199); visitor view 403 with no owner values. |
| FYD-022 regen provenance | REPLAY_PASS | fyd-022-provenance.test.ts + fyd-022-serve-proof.test.ts PASS in-tree (source/owner/generated causes + unknown fail-closed; visitor sees redacted owner record, no corrected address). |
| FYD-024 answer snapshot/stale-mark | REPLAY_PASS | fyd-024-snapshot.test.ts + fyd-024-serve-proof.test.ts PASS in-tree (pin on every answer, stale notice in served bytes on v1 answer vs v2 graph, conflict flag + stale notice compose). |
| FYD-025 semantic determinism | REPLAY_PASS | render-model.test.ts 5/5 in-tree (two separate probe processes -> byte-identical canonical models; served HTML byte-stable across renders; zero Date.now/Math.random/new Date hits on the render path). |
| FYD-026 claim classifications | REPLAY_PASS | claim-classification.test.ts 17/17 in-tree (five-member standing vocabulary write-time gate; DIRECT admission rule incl. the two real findEvidence bugs the gate exposed; FYD-038 bridge). |
| FYD-026b OWNER_AUTHORED wiring | REPLAY_PASS | owner-authored-wiring.test.ts 4/4 in-tree; adapted serve-proof (clean tree, ephemeral :35941): 7/7 PASS — owner route serves corrected phone + Demo addition badge + data-claim-classification="OWNER_AUTHORED"; observed route keeps DIRECT + Website statement badge. Served HTML dump: fyd-cumulative-replay-026b-served.html (this dir). |

## Overall

**OVERALL: REPLAY PASS.** All eleven items hold on the clean-checkout
stack tip at source (tsc clean), built (dist compiled from the clean
tree), and served (ephemeral-port HTTP, assertions on served bytes)
layers. No item was falsified; no silent fixes were applied.

## Incidents during the replay (process, not lane falsifications)

1. The FYD-014 proof script's first run used a guessed drywall objectId
   and /api/why-this correctly returned found:false. Root cause: the
   proof script's regex (mine), not the lane. Re-ran resolving each
   served affordance's objectId through the API: Drywall resolved,
   6/6 typed hops asserted. The honest fail-closed response was correct
   lane behavior.
2. A `pkill -f ...dev-server.js` matched the invoking shell itself and
   killed it (classic pattern-in-argv footgun). Recovered by PID-scoped
   `kill 6367`; verified no dev-server process remained and the dist
   PORT const was restored to 3100. Standing lesson: kill temp servers
   by PID only, and never let a pkill pattern appear in its own shell
   command line.
3. The first tsc throwaway-compile attempt for the FYD-016 serve-proof
   emitted .js files into the worktree src/ (rootDir violation). Removed
   all 24 untracked .js artifacts with git clean; worktree verified
   pristine afterwards (`git status` clean, no diff vs HEAD).

## Boundaries honored

No pushes (all commits local-only), no production :3100 touch
no HPP original repo/site contact of any kind, no credential use or
exposure, no destructive git/data actions, no paid model calls ($0).
(Ephemeral ports used: 34217, 41369, 45633, 44645, 35941; all stopped.)
The demo journal container (ping-test-pg) was not started; nothing in
this replay required it.

## NEXT

This was replay #2 of the FYD-011..026b stack (replay #1: the lanes'
own closures + the coordinator's first verification). On the
coordinator's word: promote the stack to canonical, or triage the next
layer deeper. The clean worktree remains at
~/workspace/fyd-replay-2026-09-27-r2 (detached HEAD 841825c, pristine)
for any third replay or falsification probe.
