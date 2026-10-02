/**
 * RECONSTRUCTED FIXTURE — mirrors the verified shape of the refactored gateway
 * at bb63da5ec as far as incident evidence establishes it (FL-20260919-ORACLE-006):
 *   - Docker CMD: node gateway/server.js
 *   - server.js requires ./bootstrap/gateway_runtime
 *   - boot only happens when run as main; requiring the module is side-effect-free
 *     apart from loading the module graph.
 *
 * This file is a reconstruction for mechanism proof, NOT the real source.
 * See ../../README-lane1.md for the reconstruction gap.
 */
'use strict';

const { GatewayRuntime } = require('./bootstrap/gateway_runtime');

function boot(options) {
  const runtime = new GatewayRuntime(options || {});
  runtime.initialize({ mode: 'serve' });
  return runtime;
}

if (require.main === module) {
  const runtime = boot({});
  const shutdown = () => {
    runtime.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { boot, GatewayRuntime };
