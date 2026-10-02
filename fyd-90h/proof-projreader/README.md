# W5 projection-reader seam proof (rerunnable)

Proves the projection-reader seam work in the Wave 2 worktree
`/home/nolan/projects/ping-wave2-projreader2` (line a0f3724).

## What it is

- `src/fyd/data/*.ts` — VERBATIM COPIES of the real seam modules from
  `fyd-product-lane/src/fyd/data/` in the worktree (projection-reader.ts,
  projection-verify.ts, file-dump-projection-reader.ts, default-reader.ts,
  ping-object-source.ts). Verified byte-identical at proof time.
- `src/lib/ping/ask-composer.ts` — TEST DOUBLE containing ONLY the real
  `canonicalize` (verbatim copy; the seam's sole dependency on that module).
- `src/lib/ping/types.ts`, `src/fyd/object/owner-overlay.ts`,
  `src/fyd/sitespec/types.ts`, `src/fyd/customize/types.ts` — TEST DOUBLES
  for modules not yet landed on the a0f3724 line (shapes mirror the tree).
- `proof.ts` — unit/contract proof: 26 checks (interface-bound consumers,
  fail-closed reads, determinism identity, sync fail-closed, naming law).
- `int-proof.js` — integration proof: 11 checks against the REAL dump.py
  and a FIXED stub-journal history (NOT the live journal). Needs the stub
  journal on 127.0.0.1:18991 and env:
  FYD_OVERLAY_JOURNAL=demo FYD_JOURNAL_GATEWAY_URL=http://127.0.0.1:18991
  FYD_PROJECTION_DIR=<outdir> FYD_DUMP_PY=<path to dump.py>

## Rerun

TSC=/home/hatch/workspace/.worktrees/l2-spec/tree/node_modules/.bin/tsc
$TSC -p tsconfig.json && node -r ./register-alias.cjs dist/proof.js
