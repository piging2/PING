# P0-1 Forensics: gateway refactor crash-loop (FL-20260919-ORACLE-006)

Lane 1, 2026-09-19. Status: forensics assembled from incident evidence; exact
worktree file:line verification BLOCKED (worktree unreachable from this sandbox,
see FL-20260919-P0-LANE1-001). Every claim below is tagged VERIFIED (incident
record), REPORTED (parent orientation, not independently re-verified here), or
GAP (unverifiable from here; must be closed on the Pig/Oracle plane).

## The incident (VERIFIED, from FAILURE_LEDGER FL-20260919-ORACLE-006)

- Commits: bb63da5ec "refactor(gateway): split runtime composition planes",
  cdc295111 (composition contract test), 1f79df970.
- Image oracle-gateway:refactor-bb63da5 (2503a018e69e) built natively on ARM64.
  Build SUCCEEDED.
- On Oracle, the container crash-looped. Crash string:
  `Error: Cannot find module '../../../ping-runtime/events/legacy_ingress_adapter'`
  Health unhealthy. Rolled back to oracle-gateway:certified-20260919; canonical
  stack healthy.
- The image is preserved for forensics (oracle-gateway:refactor-bb63da5).

## Require site (VERIFIED string, GAP line number)

- Module: gateway/bootstrap/composition/core_event_spine.js (introduced by the
  refactor).
- Require string: `require('../../../ping-runtime/events/legacy_ingress_adapter')`,
  at top level of the module. The string is VERIFIED from the Oracle crash log.
- Exact line number: GAP. The worktree is unreachable from this sandbox; close
  with `grep -n "legacy_ingress_adapter" gateway/bootstrap/composition/core_event_spine.js`
  on the worktree and record the line.

## Resolved source path (REPORTED + VERIFIED existence claim)

- ping-runtime/events/legacy_ingress_adapter.js exists in the repo at bb63da5ec
  (per incident record and parent orientation). Resolved from the composition
  module, the relative require lands on this path.
- Classification per task directive: LEGACY_REQUIRED, not optional. The refactor
  requires it at top level, so it is mandatory runtime surface even though it is
  legacy compatibility surface.
- Transitive dependency chain of the missing module: GAP from this sandbox.
  The transferred MC-1-era copy (~/workspace/forensics/transfer-2026-09-19/
  legacy_ingress_adapter.js) is the WRONG ERA for this purpose (pre-refactor
  /home/nolan/ping, not the convergence worktree at bb63da5ec) and must NOT be
  used as transitive evidence. Close with a require-walk of the real file.

## Deployment snapshot / build context (VERIFIED path, GAP assembly)

- Snapshot root on Oracle (VERIFIED from FL-20260919-ORACLE-005 replay line):
  /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/
- VERIFIED: the snapshot's ping-runtime/events/ did NOT contain
  legacy_ingress_adapter.js (pruned subset; the pre-refactor snapshot's
  gateway_runtime.js never referenced it, so nothing noticed).
- Snapshot assembly mechanism: GAP. The deploy lane assembles the pruned
  snapshot; the exact pruning rules (allowlist? exclusion list? manual copy?)
  live with the deploy lane / Oracle and the snapshot compose file, which is
  the authoritative copy and is not in this worktree. The leading hypothesis is
  that the prune predates the refactor and was never re-validated against the
  refactored require graph.

## Dockerfile / .dockerignore (REPORTED, partially GAP)

- gateway/Dockerfile (REPORTED): FROM node:24-alpine; COPY gateway/package*.json;
  npm install; COPY . . from the build-context root; CMD ["node",
  "gateway/server.js"]. Consistent with RUNTIME-DISTRIBUTION-V1-MANIFEST.md
  (gateway/Dockerfile: FROM node:24-alpine).
- infrastructure/oracle/Dockerfile.gateway (REPORTED): node:18-alpine, COPYs only
  gateway/, CMD node server.js. Likely NOT the image used: the crash's relative
  require path implies the /app layout (gateway/ + ping-runtime/ siblings),
  which only the root-context COPY . . produces.
- gateway/.dockerignore (REPORTED): excludes only node_modules.
- Root .dockerignore: GAP (exists per orientation; contents unverified here).

## WHY DID THE IMAGE BUILD SUCCEED WHEN REQUIRED RUNTIME SOURCE WAS ABSENT?

Four compounding facts, each necessary:

1. **Docker builds do not execute JavaScript.** `COPY . .` copies files;
   `npm install` resolves only external package dependencies. A missing
   *local* relative module is invisible at build time. There is no stage in a
   Dockerfile that performs Node module resolution.
2. **No pipeline stage executed the code.** Codex's verification was the
   composition contract test (cdc295111, source-text only: reads files, never
   requires them) plus `node --check` (syntax only). The replay test could not
   run (express missing in WSL). The first runtime execution of the refactor
   was the Oracle container start.
3. **Node defers missing-module errors to load time.** The top-level require in
   core_event_spine.js throws MODULE_NOT_FOUND only when the module graph is
   loaded during bootstrap. Until a process actually requires the entrypoint,
   the defect does not exist in any observable form.
4. **The snapshot prune was never re-validated against the refactored require
   graph.** The prune was built for the pre-refactor gateway (whose
   gateway_runtime.js never referenced legacy_ingress_adapter). The refactor
   added a new top-level edge into ping-runtime/events/; no mechanism
   recomputed "entrypoint -> transitive local requires" against the new graph
   and the snapshot contents.

So the build succeeded because **build success was (wrongly) treated as
deployability evidence, and no rule in the pipeline connects the runtime
require graph to the distribution contents or executes the entrypoint before
promotion.**

## THE RULE DEFECT (what to fix, not just the file)

Adding legacy_ingress_adapter.js to the snapshot fixes this instance. The rule
that allowed the incomplete closure is the absence of two gates:

- **R1: deterministic closure certification.** After snapshot assembly and
  before `docker build` / image promotion, compute
  entrypoints -> transitive local requires -> classification ->
  snapshot membership, and FAIL promotion on SOURCE-REACHABLE +
  RUNTIME-REQUIRED + NOT-DISTRIBUTED, and on UNKNOWN classification.
  Implemented: closure-certify.js (P0-3).
- **R2: executable smoke test on the distribution.** After image build (or on
  the snapshot pre-build), Node must actually resolve the entrypoint, load
  the mandatory module graph, construct the runtime, initialize to a declared
  safe boundary, and shut down cleanly. Source-text checks are not a
  substitute. Implemented: gateway-smoke.js (P0-2).

## Case sensitivity

Not a factor in this incident: the module name matches on disk (the file exists
in the repo; the failure was absence from the snapshot, not a case mismatch).
Linux containers are case-sensitive throughout; the checker's path comparisons
are byte-exact and case-sensitive, matching the target runtime.

## Open gaps to close on the Pig/Oracle plane (parent)

1. Exact line number of the require in core_event_spine.js.
2. Snapshot assembly mechanism and pruning rules (deploy lane).
3. Root .dockerignore contents.
4. Transitive dependency chain of the real legacy_ingress_adapter.js at bb63da5ec.
5. Re-run closure-certify.js and gateway-smoke.js against the REAL snapshot
   and the REAL refactored source; fixture proof is a mechanism proof, not a
   distribution certification.

## Second pass: all gaps closed against the real tree (2026-09-19 ~19:22-19:45 MDT)

Execution bridge ~/workspace/pig/pigwsl-run.sh restored worktree access
(/home/nolan/worktrees/constitutional-convergence, branch
constitutional-convergence-v2, HEAD 2c656513b at run time).

1. **Require line**: gateway/bootstrap/composition/core_event_spine.js:13
   `const { LegacyIngressAdapter } = require('../../../ping-runtime/events/legacy_ingress_adapter');`
   Top level, unconditional. CLOSED.
2. **Snapshot assembly** (from PING_ORACLE_MIGRATION_REPORT.md on the Pig plus
   git forensics): snapshot = clean `git clone --depth 1` at bce92787
   (2026-09-12) into /opt/ping/releases/bce92787.../ping-oracle-clean-snapshot;
   the refactor deploy did a TARGETED `git archive` transfer of only the 8
   refactor files at bb63da5ec into that persistent snapshot directory.
   Correction to the first-pass framing: the snapshot was NOT pruned of the
   adapter. `git show bce92787:.../legacy_ingress_adapter.js` = ABSENT; the
   file was introduced 2026-09-18 by de1112454, AFTER the snapshot base. The
   defect is a stale snapshot + delta transfer that never recomputed the
   require closure, not a prune rule. CLOSED.
3. **Root .dockerignore**: verified contents (node_modules, .git, *.env,
   tests/, *.md, etc.). It does NOT exclude ping-runtime/events/; the image
   build (COPY . .) was never the filter. The filter was the deploy lane's
   snapshot staleness. CLOSED.
4. **Transitive deps of legacy_ingress_adapter.js**: ZERO requires (463-line
   self-contained MC-1 adapter). No transitive deps to transfer. CLOSED.
5. **Real-tree re-run**: DONE. See tools/distribution/README.md in the
   worktree and the lane report. CERTIFIED (189 reachable, 0 defects);
   fail-before reproduced the exact Oracle crash string; smoke PASS on the
   complete copy. CLOSED.

Also found while walking the real graph: two generated JSONs are LOAD-FATAL
(worker_state_machine.js and execution/ollama_provider.js throw at require
time if gateway/generated/state_machine_registry.json /
capability_registry.json are missing). They are declared as dynamic targets
in the certifier invocation and classified REQUIRED_RUNTIME. The deploy lane
must ensure they ship too.
