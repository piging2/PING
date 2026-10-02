#!/usr/bin/env node
/**
 * gateway-smoke.js — P0-2 real executable smoke test, adapted to the REAL tree.
 *
 * SEAM VERIFICATION (2026-09-19, read-only inspection of
 * gateway/bootstrap/gateway_runtime.js @ constitutional-convergence-v2):
 *   - The fixture's assumed seam `initialize({ mode: 'smoke' })` DOES NOT
 *     EXIST on the real GatewayRuntime. The real lifecycle is:
 *         const runtime = new GatewayRuntime(pool?);
 *         await runtime._initializeServices();  // wires composition planes;
 *                                               // degrades gracefully without PG
 *         runtime._mountRoutes(services);       // pure express wiring
 *         await runtime.start(port);            // above + _app.listen(port)
 *         await runtime.shutdown();             // kernelAdapter only (no-op unless set)
 *   - gateway/server.js (the container CMD) does: new GatewayRuntime() then
 *     runtime.start(port). The Oracle MODULE_NOT_FOUND crash fires during
 *     require('gateway/bootstrap/gateway_runtime') at line 13:
 *     require('./composition/core_event_spine') ->
 *     require('../../../ping-runtime/events/legacy_ingress_adapter').
 *   - This script therefore loads the runtime module FIRST (real Node
 *     resolution, nothing mocked): that single step reproduces the Oracle
 *     crash signature on a bad distribution.
 *   - Safe boundary for smoke: construct + _initializeServices +
 *     _mountRoutes WITHOUT start()/listen() (no port bound, no seed writes:
 *     seeding only runs when PG is reachable, and degraded mode skips the
 *     core spine). Controlled shutdown: runtime.shutdown() + pg pool end so
 *     the process exits cleanly.
 *   - FUTURE SEAM (Lane 2 is changing gateway startup): if the runtime ever
 *     exposes initialize({ mode: 'smoke' }) returning a boundary token, this
 *     script prefers it. The probe keeps this script working pre- and
 *     post-Lane-2 without editing gateway runtime source.
 *
 * Usage:
 *   node gateway-smoke.js --snapshot <snapshotDir> [--entrypoint gateway/server.js]
 *       [--runtime-module gateway/bootstrap/gateway_runtime.js] [--timeout-ms 90000]
 *
 * Exit: 0 SMOKE PASS, 2 MODULE RESOLUTION FAILURE, 3 BOOT/SHUTDOWN FAILURE.
 */
'use strict';

const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function main() {
  const args = parseArgs(process.argv);
  const snapshot = args.snapshot;
  const entrypoint = args.entrypoint || 'gateway/server.js';
  const runtimeModule = args['runtime-module'] || 'gateway/bootstrap/gateway_runtime.js';
  const timeoutMs = parseInt(args['timeout-ms'] || '90000', 10);
  if (!snapshot) {
    process.stderr.write('gateway-smoke: --snapshot <dir> required\n');
    process.exit(2);
  }
  const snapAbs = path.resolve(snapshot);
  const checklist = [];
  let runtime = null;

  function ok(name, detail) {
    checklist.push({ name, ok: true, detail: detail || '' });
  }
  function fail(name, err) {
    checklist.push({ name, ok: false, detail: err && err.message ? err.message : String(err), code: err && err.code });
  }
  function report(passed, exitCode, extra) {
    process.stdout.write(passed ? 'SMOKE PASS\n' : 'SMOKE FAIL\n');
    for (const c of checklist) {
      process.stdout.write('  [' + (c.ok ? 'ok' : 'FAIL') + '] ' + c.name + (c.detail ? ' — ' + c.detail : '') + '\n');
    }
    if (extra) process.stdout.write(extra + '\n');
    process.exit(exitCode);
  }

  try {
    // 1. Resolve the actual container entrypoint against the snapshot.
    const entryAbs = require.resolve(path.join(snapAbs, entrypoint));
    ok('resolve entrypoint', entryAbs);

    // 2. Load the runtime module: executes the REAL top-level require chain
    //    (gateway_runtime -> composition planes -> legacy_ingress_adapter).
    //    No Module._load patching anywhere: resolution is real. This is the
    //    step that reproduces the Oracle crash signature on a bad snapshot.
    const rt = require(path.join(snapAbs, runtimeModule));
    if (!rt || typeof rt.GatewayRuntime !== 'function') {
      throw new Error('runtime module does not export GatewayRuntime');
    }
    ok('load runtime module graph', 'GatewayRuntime exported');

    // 3. Construct. Constructor builds the express app + middleware only.
    runtime = new rt.GatewayRuntime();
    ok('construct GatewayRuntime', 'express app + middleware, no listen, no DB');

    // 4. Initialize to the declared safe boundary.
    //    Preferred: a declared initialize({mode:'smoke'}) seam if Lane 2 (or
    //    later work) adds one. Fallback: the real _initializeServices +
    //    _mountRoutes pair, which wires composition without binding a port.
    let boundary;
    if (typeof runtime.initialize === 'function') {
      const res = await withTimeout(
        runtime.initialize({ mode: 'smoke' }), timeoutMs, 'initialize({mode:smoke})'
      );
      boundary = (res && res.boundary) || 'initialize-smoke';
      ok('initialize to safe boundary', 'via initialize({mode:smoke}); boundary=' + boundary);
    } else {
      const services = await withTimeout(
        runtime._initializeServices(), timeoutMs, '_initializeServices'
      );
      runtime._mountRoutes(services);
      const pgDegraded = !services.eventReadAuthority;
      boundary = 'services-initialized+routes-mounted;no-listen;pgDegraded=' + pgDegraded;
      ok('initialize to safe boundary', 'via _initializeServices+_mountRoutes; ' + boundary);
    }

    // 5. Controlled shutdown: declared shutdown() plus pg pool teardown so the
    //    process exits instead of hanging on idle pool sockets.
    try {
      if (typeof runtime.shutdown === 'function') {
        await withTimeout(runtime.shutdown(), 15000, 'shutdown');
      }
    } finally {
      if (runtime._pool && typeof runtime._pool.end === 'function') {
        await runtime._pool.end().catch(() => {});
      }
    }
    runtime = null;
    ok('controlled shutdown', 'shutdown() + pool end; process can exit');
  } catch (e) {
    fail(checklist.length ? 'step-' + (checklist.length + 1) : 'bootstrap', e);
    const missing = e && e.code === 'MODULE_NOT_FOUND' ? e.message : null;
    const extra = missing
      ? '  module resolution failure: ' + String(missing).split('\n')[0]
      : null;
    try {
      if (runtime) {
        if (typeof runtime.shutdown === 'function') await runtime.shutdown().catch(() => {});
        if (runtime._pool && typeof runtime._pool.end === 'function') await runtime._pool.end().catch(() => {});
      }
    } catch (_) { /* never mask the original failure */ }
    report(false, e && e.code === 'MODULE_NOT_FOUND' ? 2 : 3, extra);
    return;
  }

  report(true, 0, null);
}

main().catch((e) => {
  process.stderr.write('gateway-smoke: unexpected: ' + (e && e.stack || e) + '\n');
  process.exit(3);
});
