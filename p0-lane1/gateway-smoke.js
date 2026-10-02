#!/usr/bin/env node
/**
 * gateway-smoke.js — P0-2 real executable smoke test.
 *
 * Minimum invariant, executed against a DISTRIBUTION SNAPSHOT (the exact
 * build-context directory the container image is built from), not the
 * developer worktree:
 *
 *   DEPLOYMENT ARTIFACT
 *     -> Node resolves the actual gateway entrypoint (require.resolve, real)
 *     -> all mandatory modules resolve (requiring the entrypoint's runtime
 *        module loads the real module graph; NOTHING about module resolution
 *        is mocked, stubbed, or intercepted)
 *     -> GatewayRuntime constructs
 *     -> initialization reaches an explicitly defined safe boundary
 *        (composition wired; no listen(), no DB connect)
 *     -> controlled shutdown
 *
 * It must EXECUTE code. No source-text-only substitute: the bb63da5ec
 * crash-loop (FL-20260919-ORACLE-006) passed a source-text-only contract test
 * and `node --check`, then died on Oracle with
 *   Error: Cannot find module '../../../ping-runtime/events/legacy_ingress_adapter'
 * This test reproduces exactly that failure mode on a bad distribution and
 * passes on a correct one.
 *
 * Supported seam: the runtime module must export GatewayRuntime (or a boot
 * factory) with initialize({ mode: 'smoke' }) stopping at a declared safe
 * boundary and shutdown(). That seam is part of the fixture's contract;
 * against the real codebase the seam must be verified to exist and the
 * boundary definition re-confirmed (see README-lane1.md).
 *
 * Usage:
 *   node gateway-smoke.js --snapshot <snapshotDir> [--entrypoint gateway/server.js]
 *       [--runtime-module gateway/bootstrap/gateway_runtime.js]
 *
 * Exit: 0 SMOKE PASS, 2 MODULE RESOLUTION FAILURE, 3 BOOT/SHUTDOWN FAILURE.
 */
'use strict';

const path = require('path');
const Module = require('module');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  const entrypoint = args.entrypoint || 'gateway/server.js';
  const runtimeModule = args['runtime-module'] || 'gateway/bootstrap/gateway_runtime.js';
  if (!snapshot) {
    process.stderr.write('gateway-smoke: --snapshot <dir> required\n');
    process.exit(2);
  }
  const snapAbs = path.resolve(snapshot);
  const checklist = [];

  function check(name, fn) {
    try {
      const detail = fn();
      checklist.push({ name, ok: true, detail: detail || '' });
    } catch (e) {
      checklist.push({ name, ok: false, detail: e && e.message ? e.message : String(e), code: e && e.code });
      throw e;
    }
  }

  let runtime = null;
  try {
    // 1. DEPLOYMENT ARTIFACT -> resolve the actual gateway entrypoint.
    //    require.resolve performs REAL Node resolution against the snapshot.
    let entryAbs;
    check('resolve entrypoint', () => {
      entryAbs = require.resolve(path.join(snapAbs, entrypoint));
      return entryAbs;
    });

    // 2. All mandatory modules resolve: requiring the runtime module executes
    //    the real top-level require chain (composition planes included).
    //    No Module._load patching anywhere in this file: resolution is real.
    let rt;
    check('load runtime module graph', () => {
      rt = require(path.join(snapAbs, runtimeModule));
      if (!rt || typeof rt.GatewayRuntime !== 'function') {
        throw new Error('runtime module does not export GatewayRuntime');
      }
      return 'GatewayRuntime exported';
    });

    // 3. GatewayRuntime constructs.
    check('construct GatewayRuntime', () => {
      runtime = new rt.GatewayRuntime({ smoke: true });
      return 'constructed, state=' + runtime.state;
    });

    // 4. Initialization reaches the explicitly defined safe boundary.
    //    The seam: initialize({ mode: 'smoke' }) wires composition but must
    //    NOT call listen() or open DB connections.
    check('initialize to safe boundary', () => {
      const res = runtime.initialize({ mode: 'smoke' });
      if (!res || typeof res.boundary !== 'string') {
        throw new Error('initialize did not return a safe-boundary token');
      }
      return 'boundary=' + res.boundary;
    });

    // 5. Controlled shutdown.
    check('controlled shutdown', () => {
      runtime.shutdown();
      runtime = null;
      return 'shutdown clean';
    });
  } catch (e) {
    const missing = e && e.code === 'MODULE_NOT_FOUND' ? e.message : null;
    process.stdout.write('SMOKE FAIL\n');
    for (const c of checklist) {
      process.stdout.write('  [' + (c.ok ? 'ok' : 'FAIL') + '] ' + c.name + (c.detail ? ' — ' + c.detail : '') + '\n');
    }
    if (missing) {
      process.stdout.write('  module resolution failure: ' + missing.split('\n')[0] + '\n');
    }
    // Best-effort cleanup; never mask the original failure.
    try {
      if (runtime && typeof runtime.shutdown === 'function') runtime.shutdown();
    } catch (_) { /* ignore */ }
    process.exit(e && e.code === 'MODULE_NOT_FOUND' ? 2 : 3);
  }

  process.stdout.write('SMOKE PASS\n');
  for (const c of checklist) {
    process.stdout.write('  [ok] ' + c.name + (c.detail ? ' — ' + c.detail : '') + '\n');
  }
  process.exit(0);
}

main();
