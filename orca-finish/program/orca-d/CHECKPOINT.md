# ORCA-D Checkpoint (FINAL)

Lane: ORCA-D (tranche 2 of the 4,000-mission ORCA adversarial program).
Focus: ack/effect ordering matrix + unknown-execution residuals + retry/result
classification + schema drift.
Date: 2026-09-24 MDT. Read-only on repos; no commits; scratch harnesses only.
Status: COMPLETE. Verdicts in `VERDICTS.md` (11 records, D1-D11).

## Scope pinned

- A5 branch: `/home/nolan/worktrees/orca-autonomy` @ `ae55b77ff`
  (`feature/orca-autonomy`) — all TEST evidence is against this commit.
- State worktree: `/home/nolan/ping-orca-state` @ `30a750f`.
- Vendor copies in `probes/` (sha256 verified 2026-09-24):
  - `vendor-orca_control_loop.js` `4abc75ee506c1eadffc5c7b018d0857648634bf15193e3d4b0dfa2176e407e4c`
  - `vendor-objective-runtime.js` `c9247b5d37a0969c83f0298fc425f365b6a3f09db38e0687ea97f1111af59698`
  - `vendor-policy_orca_policy.js` `5a42d8fb51356d840eba25504b17adaa162a6d07b89e7d333921ed3cc4991101`
  - `vendor-policy_recovery_decisions.js` `edcdb20067235139f648488286ca2c4a8f44d72fa3824c8418a6f979362a009`
  - `vendor-policy_orca_status_model.js` `473d52d23a80d23b594b5cb409312a294eec71b56908a8faec07ae57d5ff307d`
  - `vendor-external_agent_adapter.js` `b32ad888aa8e5404a1ec0ae54361c0379d301d3f840f4e4d1cea78625e410c9f`
  - `vendor-hermes_dispatch.py` `b1c68aa6726f3c9874f878ee787d7ac34c234f3cffbeb0bd2e5044aec2d2bcf2`
  - `probes/vendor-ping-runtime/` holds identical adapter/loop copies plus a
    documented minimal canonicalization shim (the real branch canonicalization
    service does not export `NAMESPACE_RE`; the shim matches the adapter's
    fallback behavior).
- H5 wiring state (rechecked 2026-09-24): the h5-wire lane HAS landed as
  UNCOMMITTED working-tree changes in the same worktree
  (`M orca/control-loop/orca_control_loop.js`,
  `M orca/control-loop/policy/orca_status_model.js`,
  `?? orca/control-loop/orca_unknown_block.js`; branch tip still `ae55b77ff`).
  It wires the timeout branch to OUTCOME_UNKNOWN + blocked (no failed
  envelope, no classifyRetry, no auto-retry) and deliberately leaves the
  DISPATCH_LOST restart path untouched. ORCA-D verdicts are baselined at
  `ae55b77ff`; each record notes where H5 changes the assessment.

## Artifacts (this lane)

- `VERDICTS.md` — 11 shared-format records (D1-D11), verdict table with
  counts, harvest specs HD1-HD10, open UNKNOWNs, failure pipeline.
- `CHECKPOINT.md` — this file.
- `probes/h-retry-classify.js` — retry classifier adversarial (D1).
- `probes/h-envelope-adversarial.js` — partial/malformed/wrong-attempt
  envelopes (D8).
- `probes/h-stale-rendezvous.js` — T5/T6 stale-result poisoning (D2).
- `probes/h-commit-inflight.js` — effect-before-ack, commit-in-flight,
  emit throw/reject (D6, D7).
- `probes/h-schema-drift.js` — older/newer/corrupt durable records (D9).
- `probes/h-timeout-effect.js` — timeout-during-effect V1/V2/V3 (D3, D5).
- `probes/u1/` — Pig Windows timing experiment: `u1-driver.js` (node, WSL),
  `u1-dispatcher-stub.py` + `u1-worker-stub.py` (Windows python, mirror
  `hermes_dispatch.py` topology), `u1-pid-probe.js`, `u1-env-probe.js`
  (D4 U1, D3 T2). Pig-side artifacts cleaned up after the runs.
- `probes/vendor-*.js`, `probes/vendor-ping-runtime/` — read-only vendor
  copies (hashes above).

## Final results, by mission

1. effect-before-ack: canonical layer converges via spine dedup (D6, PING
   STRONGER); worker layer duplicates non-idempotent effects on retry (D5).
2. ack-before-effect: envelope channel unauthenticated; first-object-wins
   extraction enables precedence forgery; wrong-attempt replay accepted (D8).
3. timeout-after-effect: T2 race confirmed LIVE on the Pig (successful drop
   discarded, false FAILED, auto-retry) (D3); T5/T6 stale poisoning TEST-proven
   (D2); emit-throw window unclassified FATAL with sound dedup recovery (D7).
4. U1 live race: CLOSED. No orphaned Windows worker survives dispatcher death
   (3 kill modes: coordinator-style SIGKILL, taskkill /F without /T,
   dispatcher self-abort); no late drop possible (D4, REJECT).
5. ambiguity enumeration: 11 paths graded (D10); only "dispatcher alive + no
   result" is fully sound.
6. retry classification: fail-open default on unknown kinds, 57 adversarial
   grants (D1).
7. partial/malformed results: structural validation strong, semantic
   completeness unchecked, no attempt binding (D8).
8. schema drift: older misread as dead (fail-open re-dispatch), newer
   under-counts budget, corrupt record permanently bricks the objective (D9).

## Open items for the parent

- U4 (D11): drill D2(b) vs DISPATCH_LOST re-delegation — still OPEN, needs the
  drill owner's decision; cost now TEST-proven (D5 V2).
- H5 working tree is uncommitted; ORCA-D did not touch it (read-only lane).
  HD2/HD8/HD9 (stale results, envelope binding, schema versions) are
  untouched by H5 and remain open harvest.
- No live timeout has fired through the H5-wired path yet (per h5-wire);
  first live post-boundary timeout is the LIVE-grade proof of HD3.

## Coordination notes

- Did not duplicate the H5 wiring lane: ORCA-D built adjacent harnesses only,
  no loop/policy edits, no commits.
- orca-b U1 is now CLOSED by D4 (their "still static-only" note is
  superseded); orca-b U4 remains open per D11.
- Lesson added to `~/workspace/AGENTS.md`: WSL node `spawn()` does not
  forward custom env vars to Windows interop processes (proven by
  `u1-env-probe.js`); pass Pig-experiment parameters via argv.

## Failure pipeline (summary)

All LOCAL ACCIDENT (harness/infra), no generic classes: Pig SSH flakes,
SCP/CMD quoting corrections, one wrong vendor file (hash-caught), two
U1-harness bugs (WSL-invisible marker dir; env not crossing the spawn
boundary), two h-timeout-effect harness bugs (`updateWorkOrder` takes a
partial object; `classifyRetry` returns `decisionClass` / takes
`failureKind`). Full log in `VERDICTS.md`. No repository writes or commits;
no deletions of user data (Pig experiment artifacts in `C:\Windows\Temp`
cleaned up after the runs).
