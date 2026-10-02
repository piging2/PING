# ADDENDUM: DELETION DOCKET (RESCAN ONLY)

**Critic:** CRITIC-ARCHDELETION (fresh pass) | **2026-09-24 ~04:50 MDT**
**Scope:** re-verification of program/critic-archdel/DELETION-DOCKET.md
against the CURRENT tree. Docket-only. No deletions, no edits, no
commits. Read-only Pig SSH inspection.
**Method:** re-ran program/critic-archdel/gc12-regrep.sh against the live
tree; re-checked rejected/live claims R-1 through R-9 and the Python
execution plane. No em dashes used.

## Tree state at rescan

- Path: /home/nolan/ping @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`
- Branch: `refactor/runtime-authority-convergence`
- Dirty count: 17
- This is the same HEAD and dirty count the original docket was built on.
  The rescan compares like with like.

## Result: NO STATUS CHANGES

All 24 PROVEN-DEAD verdicts still stand. No dead claim was resurrected.
No REJECTED candidate became dead. The GC-12 re-grep remediation
(24/24 survive, completed 2026-09-24 ~03:35 UTC per WAVE-LEDGER.md) is
confirmed by this rescan: the quoting blind spot produced zero new live
callers in the tracked tree.

Entry-by-entry notes (exceptions and confirmations only; the full docket
is unchanged):

- D-2, D-3, D-7: hits remain ONLY in the untracked
  `worktrees/oracle-assembly/oracle-assembly-patches/` staging copy.
  Not the live path. Do not apply that patch bundle without re-review
  (it would resurrect requires of D-2/D-3/D-7 and instantiate
  FilesystemAuthority).
- D-22: still only its known dead requirer plus the preserved worktree
  copy. 0 temporal mentions in live gateway/bootstrap/gateway_runtime.js.
- D-24: `/home/nolan/crx/app/main.py:95` still contains
  `print(app.routes)`.
- R-1: witness authority remains live through `dead_letter_authority.js`.
- R-2: replay witness authority remains live through the double-quoted
  require and instantiation (the GC-12 case).
- R-3: identity authority remains live through dead-letter authority.
- R-4: deterministic ID authority retains its live chain.
- R-5/R-6: merge gate and ExecutionEngine remain live.
- R-7: CapabilityResolver remains live.
- R-8: Python ExecutionAuthority remains an internally-wired parallel
  plane (6 importing modules + test); no JS invoker. "Unwired" is still
  inaccurate; "internally-wired, no JS invoker" stands.
- R-9: worker_port.js remains a live registry; scoped deletions only.
- M-1: competing IdentityAuthority callers unchanged.

## Standing orders (unchanged)

- NO DELETIONS ARE AUTHORIZED. The docket is a decision input, not a
  work order.
- Deletions require Nolan's explicit word. That word has not been given.
- The next rescan trigger: any commit, branch move, or HEAD change on
  /home/nolan/ping, or any new deadness claim from a lane.

## Attestation

No files were deleted. No source was edited. No commits were made. The
rescan was read-only. This addendum changes no docket status; it records
that the docket survived re-verification against the current tree.
