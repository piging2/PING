# ORCA social-retry-proof: local mirror unrunnable, replay blocked on Pig — 2026-09-27 ~14:35 MDT

Subagent: backlog-burn (parent: main agent). Read-only survey; nothing
changed.

## The finding

`~/workspace/orca/social-retry-proof/` (harness.js, retry_predicates.js,
run_proof.js, stub_providers.js + SOCIAL-RETRY-PROOF-2026-09-24.md) is a
local mirror of a Pig-side proof run (2026-09-24, "all on the Pig,
untracked scratch, not committed"). The mirror cannot run on this VM:

1. `harness.js:20` and `retry_predicates.js:20` require the adapters
   from `/home/nolan/ping/ping-runtime/orchestration/effect_adapters`
   (the old machine path). It does not exist here. The current
   adapters live at `~/workspace/orca/port/effect_adapters/`
   (adapter_core.js + class_05c/05d/09 all present).
2. Even repointed, the proof cannot run honestly: it asserts
   `foundationSource === 'sibling'` and refuses the shim. The real A6
   foundation (`ping-runtime/orchestration/effect_reconciler.js`) exists
   nowhere in this workspace (searched, excluding node_modules and
   worktrees). `~/workspace/orca/port/effect_reconciler.js` (the
   sibling slot the port layout expects) does not exist, so the local
   adapter_core would resolve to the TEST-ONLY shim — exactly what the
   proof refuses.

Verified: `node harness.js` dies at the first require with
`Cannot find module
'/home/nolan/ping/ping-runtime/orchestration/effect_adapters/adapter_core.js'`.

## Why it matters

Nolan's standing rule: lane self-reports are hypotheses until replayed
from a clean checkout. This proof's theorem (retry-safety for effect
classes 05c/05d/09 against the REAL EffectReconciler) currently cannot
be replayed anywhere except the Pig. Its claims stand as Pig-side
evidence, not as replayed truth.

## Queued

- On Pig transport recovery: copy `ping-runtime/orchestration/
  effect_reconciler.js` (and the four adapter files, or confirm the
  port copies are byte-identical to the proved revision) and re-run
  `run_proof.js` from a clean checkout. Do NOT "fix" the local mirror
  by repointing it at the shim — a shim-passing proof would be a
  weaker claim wearing the original proof's name.
- The four adapter requires are the only stale paths in the mirror;
  everything else (stubs, predicates, crash-point model) is
  path-independent.

## Constraints observed

Read-only: no file modified, no commit, no network, no Pig attempt
(transport down), no :3100/:3200, no HPP contact.
