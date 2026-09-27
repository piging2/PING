# lane-p01/vendor provenance

## What was vendored
- `_adapter_shim.js` — copied 2026-09-27 from the Pig
  (`/home/nolan/workspace/mission-control/_adapter_shim.js`), md5
  `a02ae803f2ea880af9384dcd458489d9` verified byte-identical after copy.
  57 lines. Thin transport to the EXISTING ExternalAgentAdapter
  (authorizeWorkOrder / issueWorkOrder); owns no decision.

## What is MISSING (do not paper over)
- The file the P0 brief asked for,
  `/home/nolan/workspace/mission-control/lane-d/adapter-call.js`,
  does NOT exist on the Pig as of 2026-09-27 ~13:10 MDT. Verified:
  `lane-d/` contains only `LANE-C-NOTE-DECISION.md`; a
  `find /home/nolan/workspace /home/nolan/worktrees/orca-autonomy -maxdepth 4`
  for `*adapter-call*` returned nothing; `/home/nolan/projects/ping`
  (the :3100 served repo) also has no copy, yet its
  `src/app/api/mc/_lib/mc-dispatch.ts` still points `ADAPTER_SHIM` at that
  missing path. The lane-D acceptance doc (LANE-D-DISPATCH.md) describes it
  as the transport the acceptance ran against, so it existed on 2026-09-26
  and is now absent. This is a live discrepancy on the Pig: the served
  dispatch route's `adapterCall()` would 503 (`adapter_shim_spawn_failed`
  / non-zero exit) on any POST today.
- `_adapter_shim.js` is NOT a drop-in substitute: its calling convention
  is `node _adapter_shim.js <adapter_dir> <authorize|issue> <request.json>`,
  while `mc-dispatch.ts::adapterCall()` invokes
  `node <SHIM> <op> [payload-json]` with ops
  `profiles|authorize|issue|verify` and stdout JSON parsed directly.
  It is vendored here as the closest surviving artifact with a documented
  lineage note ("Same shape as the lane-D adapter-call.js support glue."),
  NOT as a working replacement.

## Action needed (outside this writer's scope)
Reconstruct or restore `lane-d/adapter-call.js` on the Pig, or repoint
`ADAPTER_SHIM` to a verified transport, before any live dispatch is trusted.
Do not deploy the p0/front-door-idempotency branch to :3100 until the
adapter transport it depends on is proven present again.
