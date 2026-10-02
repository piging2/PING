# Phase 1 approval-door: FROZEN 2026-09-28

Status: CLOSED. No further architecture waves in this lane.

## Ratification applied

Owner (Nolan, 2026-09-28) ratified terminal-first, replacing the old gate-order
policy question. Decision pipeline now locked:

lookup proposal -> verify identity/access sufficient to inspect the decision
-> if TERMINAL, return the immutable terminal result with ZERO MUTATION
-> otherwise capability -> digest -> base/current-state -> transition rules
-> authorize/apply -> canonical event -> projection

- A terminal APPROVED/REJECTED decision is immutable historical truth.
- A later stale-base observation cannot reinterpret terminal history as
  SUPERSEDED. STALE_SUPERSEDED applies only while a proposal is still pending.
- ALREADY_DECIDED applies after crossing the terminal boundary.
- Capability, digest, base checks decide whether a PENDING proposal may
  transition. A terminal proposal has no transition left to authorize.

## What changed (commit af7d2688, branch phase1/approval-door-2026-09-28)

1. `src/fyd/approval/gate.ts`: module docstring (the brief) restated as the
   ratified pipeline; terminal guard comment references the ratification.
   No behavior change: the gate already evaluated the terminal check first.
2. `src/fyd/approval/__tests__/acceptance-door.test.ts`: test 8 renamed to
   "terminal-first: every gate check is observable in the owner's binding
   order before effect". The stale-base-on-terminal block now asserts
   ALREADY_DECIDED with zero mutation (no journal write, no object event).
   Added a terminal+wrong-capability block asserting ALREADY_DECIDED
   (capabilities never consulted for terminal proposals). The terminal/expiry
   probe now makes its proposal terminal via DENY instead of APPROVE so the
   ordering probe leaves the object untouched for later tests.
3. `src/fyd/approval/queue.ts`: real defect found while greening test 8.
   `renderMcTerminalCard` (and `renderMcWaitingCard`) dereferenced
   `evidence_refs[0]` unconditionally and crashed on a proposal legitimately
   denied for missing evidence. Both renderers now fall back to
   "Evidence: none recorded" when there is no primary ref. A denied-for-
   missing-evidence proposal is a legitimate terminal outcome and must
   still project in Mission Control.

## Evidence

- Implementation worktree `/home/nolan/worktrees/phase1-approval-door`:
  acceptance suite 17/17 PASS (commit af7d2688).
- Pristine replay checkout `/home/nolan/worktrees/phase1-replay-check`
  (detached HEAD, clean except node_modules), checked out at af7d2688:
  acceptance suite 17/17 PASS.
- Byte-identical replay: PROPOSAL_DIGEST, BASE_DIGEST, PRE_HASH, POST_HASH,
  CANONICAL_EVENT_ID, and REPLAY_DIGESTS lines from both runs compared with
  diff: identical. Digest file sha256
  b6b9b115960beb420591f615e640144d02f1a3b495cd454c2f536e0f98f43d95 on both.
- Full suite (impl worktree): 212 suites, 2336/2363 tests pass. The 27
  failures are all in the TESTING.md known-failing list (proceduralize,
  object views, builder/components dogfood, claim attack-verifier, lib
  media-authority/assignment-store, invariants) and are unrelated to the
  approval door. Zero approval-area failures.

## Freeze

- Local annotated tag `phase1-frozen-2026-09-28` on af7d2688. NOT pushed
  (no pushes without Nolan's word).
- Dirty canonical Mission Control untouched (still frozen per
  dirty-mc-freeze-2026-09-28.md). Canonical tree
  /home/nolan/projects/ping not modified by this lane.
- Lane rule going forward: the approval gate is closed to architecture
  changes. Bug fixes against the frozen behavior go through Nolan first.
