# GW-BUILD resume document — 2026-09-24 ~17:15 MDT

## State: Phase A COMPLETE and verified. Blocked on Pig SSH outage (proxy->Pig leg down since ~16:35 MDT).

### What is done (on the Pig, persists)
- New clean worktree: `/home/nolan/ping/worktrees/gw-repair-build`
  - Branch: `gateway/auth-repair-20260924`, at `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
  - `git status`: 4 modified + 1 new file, exactly the GW-REP patch set
- Patch applied via `/tmp/gw-build/apply_patches.py` (R pointed at the worktree)
  plus `/tmp/gw-build/apply_patch_d.py` for Patch D (see incident below).
- Verified: per-file diff bodies of all 4 patched files are IDENTICAL to
  `~/workspace/gw-rep/repair.diff` (70/27/58/22 body lines).
- `gateway/exterior_auth_middleware.js`: sha256
  `3d5b736d832b322709c57871fbb581b9c280902ad22481ebcd66abfe89f978b1`,
  byte-identical to `constitutional-convergence-v2:gateway/exterior_auth_middleware.js`.
- jev-surgical worktree NOT touched (only read-only `git status`/`git diff`).

### Anchor incident (resolved, for the record)
- GW-REP's `apply_patches.py` Patch D `ns-helper` anchor used a 2-space indent;
  committed `fffe99f7a` has 1-space (matches `repair.diff` context lines).
  The applicator correctly aborted (fail-closed). Fixed anchor, applied Patch D.
- My first Patch-D-only extraction script dropped the `open(p,'w').write(s)` line
  (transcription error): it printed ok without writing. Caught by grep
  verification, fixed, re-applied, verified. A debug `// MARKER_TEST_LINE`
  was added then fully reverted via `git checkout --` before the real apply.

### What remains (all on the Pig; runbook scripts ready)
Local runbook: `~/workspace/gw-build/pig-phase{C,D,E,F,G}.sh`
Local gates: `~/workspace/gw-build/gates/` (adapted .mjs x2, gate-auth-posture.sh, README.md)
Base64 transfers pre-encoded: /tmp/grc.b64 /tmp/rwr.b64 /tmp/htb.b64 (original harnesses),
/tmp/grc2.b64 /tmp/rwr2.b64 /tmp/gap.b64 /tmp/grm.b64 (gate files for commit).

1. Transfer harnesses to /tmp/gw-build on the Pig (base64 decode).
2. Run `pig-phaseC.sh`: node --check x5, tsc constitutional (isolated /tmp/tsc-check),
   repro-witness-remint (expect exit 0), gate-replay-converge (expect exit 0),
   ht-bridge-laundering (expect 4/4 PASS, exit 0). JEV_SURGICAL=<worktree>.
3. Run `pig-phaseD.sh`: commit the 5 repair files (message in script). NO PUSH.
4. Run `pig-phaseE.sh`: `docker build -f infrastructure/oracle/Dockerfile.gateway`
   -t `ping-gateway:repair-cert-20260924` from the clean committed tree.
5. Run `pig-phaseF.sh`: scratch network `gw-build-scratch`, scratch postgres
   `gw-build-pg`, gateway `gw-build-gw` on 127.0.0.1:18098 with env-file
   test-only keys (shredded after). Proofs: 7 routes 401 unauth + 401 wrong-key,
   authed GET /events 200, namespace tenant::hpp 200 / bogus rejected,
   forged WITNESS_CREATED (authed) -> 500 verdict_not_authorized,
   journal pollution 0. Cleanup removes containers/network/secrets (trap).
6. Run `pig-phaseG.sh`: install gateway/regression-gates/ (3 gates + README),
   add npm scripts, commit (message in script), leakage audit. NO PUSH.

### Pig access
`ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s' < script.sh`
(stdin-fed; avoids CMD quoting traps). Proxy `hatch-egress-proxy:3130` was UP;
the proxy->100.79.154.43 leg was down (broken pipe). Production `ping-gateway`
container was healthy before the outage; DO NOT touch it.

### If the worktree is gone on return
Recreate: `git -C /home/nolan/ping worktree add -b gateway/auth-repair-20260924
/home/nolan/ping/worktrees/gw-repair-build fffe99f7a`, re-copy the middleware
from the branch, re-run the applicators in /tmp/gw-build (they persist on the Pig).
