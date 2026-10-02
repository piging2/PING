# Worker E7 failure classes — 2026-09-24

New traps observed while evaluating P-20260923-081 / P-20260923-088.
Execution succeeded; these are classes for the wave ledger.

## FL-20260924-E7-01: Integrated-but-unimportable kit
P-20260923-092 ("tenant kit") is INTEGRATED in STATE.json, but its files are
TypeScript in the integration worktree (`src/tenanos/tenant/*`) and are NOT
importable by the gateway JS runtime that must enforce the boundary
(`/home/nolan/ping` has no `src/tenanos` at all). "Integrated" described the
file existing, not the capability reaching its consumer.
Rule: a cross-repo capability audit must verify the import graph, not just
the file's existence. Fix pattern used here: thin JS adapter
(`gateway/lib/tenant-context.js`) porting the identical contract, with the
canonical TS definition named in the header so divergence is a bug in the
port, never a competing definition.

## FL-20260924-E7-02: Phantom modification masquerading as action
`MissionControlHeader.tsx` showed as git-modified (`M` in status), which a
surface reading would take as "the sprint acted on P-20260923-081". The
change is line-ending-only (`git diff --ignore-all-space` is empty) with a
2026-07-28 mtime — it predates the proposal by two months.
Rule: always diff with `--ignore-all-space` (and check mtime) before
declaring that another party acted on a proposal. A bare `git status`
is not evidence of action.

## FL-20260924-E7-03: Integration-worktree base drift
The integration worktree (`/home/nolan/projects/ping-wave-integration`,
branch `tenanos-wave/integration`) has origin `git@github.com:piging2/fyd.git`
and contains no `gateway/` or `ping-runtime/` directories — it is not a
checkout of the gateway repo the Mission Control backend lives in. The
canonical tenant mapping therefore lives in a tree that cannot be the
application surface for this proposal.
Rule: when a proposal's spec cites a foundation "integrated", confirm which
tree it landed in and whether that tree is the one the proposal must run on.
This is the concrete instance that produced FL-20260924-E7-01.
