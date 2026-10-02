# MC-1 harness — transfer status (written 2026-09-18 ~16:10 MDT)

This directory is a LOCAL MIRROR of the harness, built from the original
2026-09-18 cert script (~/workspace/mc1-evidence/02-mc1-cert.js, attested
85/85). It is NOT yet in the repo working tree.

## Why it is still here

The Pig (WSL, holds /home/nolan/worktrees/constitutional-convergence) went
unreachable ~15:56 MDT (SSH egress proxy reports broken pipe; proxy itself is
up, so the Pig is down/asleep — consistent with the ~4pm commute blackout).
Per task instructions: waited 10 minutes, attempted exactly one retry at
~16:07 MDT (failed), did not hammer.

## What remains (do on the Pig when it returns)

1. Confirm the harness is faithful to current adapter sources:
   - ping-runtime/events/legacy_ingress_adapter.js (M9/M10 repairs present?)
   - ping-runtime/events/unified_event_runtime.js (initialize() creates ping_events?)
   - gateway/generated/event_registry.json (233 types; suite asserts == 233)
   - node --version on the Pig; fill the __NODE_VERSION_TBD__ placeholder in README.md
2. Copy tests-mc1-legacy-ingress/ into the repo working tree at
   /home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/
   (working tree only; COMMIT FROZEN — do not stage or commit).
3. On the Pig: provision scratch DB (setup.sh), run `node run-cert.js`
   (expect CERT_PASS 85 assertions), then ./teardown.sh and verify TEARDOWN_OK.
4. If the suite passes, fill in the run result here and hand to the parent.

## Verified locally (no Pig needed)

- node --check passes on run-cert.js.
- diff vs the original cert: assertion logic byte-identical; only the header,
  REPO resolution, env-driven PG config, stable assertion IDs, and the
  setup/teardown split changed.
- Assertion inventory: 51 ok() call sites; 13 in the T1 loop (x3 rows) and 2
  in the T4 loop (x5 rows) -> 36 + 39 + 10 = 85 deterministic invocations.
- No credential values anywhere in these files (only env-var names and
  interactive read -rsp prompts).
