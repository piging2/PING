# Worker E8 failure classes — 2026-09-24

New traps observed while completing P-20260923-097 / P-20260923-099 /
P-20260923-101. All three items reached terminal verified states; these
are classes for the wave ledger.

## FL-20260924-E8-01: Hunk-envelope count bug (swarm-11 class, new instance)
P-20260923-097's staged diff was semantically correct (6 added lines wiring
KG `node.status` into the `approved`/`rejected` booleans `rank()` reads)
but `git apply --check` reported `error: corrupt patch at line 36`
(exit 128): the hunk envelope `@@ -98,6 +98,11 @@` undercounted the new
side (6 context + 6 added = 12, not 11). Same envelope-bug class as the
swarm-11 corrupt diffs (RESTAGE-NOTE.md).
Rule: after any hand- or generator-written diff, recount the hunk envelope
(old = context + removed, new = context + added) and run
`git apply --check` in a scratch worktree before staging. The one-character
fix (`+98,11` -> `+98,12`) was proven necessary (original fails, fixed
passes on both the base tag and the integration tip).

## FL-20260924-E8-02: Task-premise repo misassignment (falsified by git)
The 101 work order asserted the target repo was /home/nolan/ping (gateway)
and that the "PING repo paths" note was labeling confusion. Git evidence
falsified it: 095's and 103's integration commits (db80f142, 218db490) are
reachable ONLY from /home/nolan/projects/ping's `tenanos-wave/integration`
(`git branch --contains`); /home/nolan/ping's `tenanos-wave-gateway/integration`
has no `src/tenanos/` tree at all. The "PING repo paths" note was correct.
Rule: verify the target repo via integration-commit reachability
(`git branch --contains <integration_commit>`), never from prose in the
work order. Sibling of FL-20260924-E7-03 (wrong-tree integration).
The restored diff is INTEGRATE-READY but must be applied to
/home/nolan/projects/ping, not /home/nolan/ping.

## FL-20260924-E8-03: TS strict variance trap on event payload types
In the 099 implementation, `interface TransitionEvent extends RawEvent`
failed `tsc --strict`: a fixed-shape `TransitionPayload` is not assignable
to `Record<string, unknown>` (no index signature), so the extension was
rejected (TS2430) along with every call site.
Rule: keep content-identified event shapes structurally separate and union
them (`StoredEvent = TransitionEvent | RawEvent`) instead of extending a
`Record<string, unknown>`-payload base. Narrow with an explicit type guard
(`isTransitionEvent`) rather than inheritance.

## FL-20260924-E8-04: pigwsl-run.sh inline-payload size ceiling
Embedding a ~21KB base64 payload as a pigwsl-run.sh argument fails with
"The command line is too long" (Windows cmd.exe limit on the ssh hop).
Rule: for anything over ~10KB use `pigwsl-put.sh` (chunked base64 +
sha256-verified; ~6 chunks for 16KB, seconds not hours). Verified by
matching sha256 on both ends before use.
