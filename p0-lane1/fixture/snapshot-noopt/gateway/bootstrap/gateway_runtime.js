/**
 * RECONSTRUCTED FIXTURE — mirrors the composition-plane wiring introduced by the
 * refactor at bb63da5ec ("split runtime composition planes"):
 *   gateway_runtime.initialize() wires gateway/bootstrap/composition/core_event_spine.js
 *   which top-level-requires ../../../ping-runtime/events/legacy_ingress_adapter.
 *
 * Supported seam contract (what gateway-smoke.js relies on):
 *   - new GatewayRuntime(options)
 *   - initialize({ mode: 'smoke' }) wires composition but stops BEFORE listen()/DB
 *     connect. The returned boundary token names the safe boundary reached.
 *   - shutdown() releases anything initialize() acquired.
 *
 * This file is a reconstruction for mechanism proof, NOT the real source.
 * The real GatewayRuntime must expose an equivalent boundary; the harness must
 * be re-verified against it (see ../../README-lane1.md).
 */
'use strict';

const SAFE_BOUNDARY = 'composition-wired-no-listen-no-db';

class GatewayRuntime {
  constructor(options) {
    this.options = options || {};
    this.composition = null;
    this.state = 'constructed';
  }

  initialize(initOptions) {
    const mode = (initOptions && initOptions.mode) || 'serve';
    // Composition wiring. This is where the missing module detonates:
    // core_event_spine.js top-level-requires legacy_ingress_adapter.
    this.composition = require('./composition/core_event_spine');
    this.composition.wire(this);
    this.state = 'initialized';
    if (mode === 'smoke') {
      return { boundary: SAFE_BOUNDARY, state: this.state };
    }
    // Real serve path would continue to listen()/DB connect here.
    // Deliberately absent from this fixture.
    throw new Error('serve mode is not supported in the smoke fixture');
  }

  /**
   * Optional capability providers are isolated and required lazily, never at
   * top level (pattern from 6374519f8). The closure checker treats lazy
   * requires as reachable-but-classified, so OPTIONAL_RUNTIME stays optional:
   * its absence from a snapshot is a warning, never a promotion blocker.
   */
  loadOptionalProvider(name) {
    const providers = {
      example: './optional/example_optional_provider',
    };
    if (!providers[name]) {
      throw new Error('unknown optional provider: ' + name);
    }
    return require(providers[name]);
  }

  shutdown() {
    this.composition = null;
    this.state = 'shutdown';
  }
}

module.exports = { GatewayRuntime, SAFE_BOUNDARY };
