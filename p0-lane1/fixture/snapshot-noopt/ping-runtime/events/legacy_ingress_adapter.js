/**
 * RECONSTRUCTED FIXTURE — stands in for ping-runtime/events/legacy_ingress_adapter.js.
 *
 * Classification: LEGACY_REQUIRED (not optional). The refactor requires it at
 * top level, so the distribution must contain it. It is a legacy compatibility
 * surface; its transitive local dependency (ingress_types.js) inherits required
 * status through the reachability walk.
 *
 * The 'pg' driver is required lazily inside connect() (deferred until DB use),
 * which the smoke path never reaches. The closure checker still records it as
 * EXTERNAL_NPM so the package manifest can be audited separately; laziness
 * does not hide it from the static walk.
 */
'use strict';

const ingressTypes = require('./ingress_types');

const ADAPTER_NAME = 'LegacyIngressAdapter';

function normalize(row) {
  if (!ingressTypes.isKnownKind(row && row.kind)) {
    throw new Error('unknown ingress kind: ' + (row && row.kind));
  }
  return { kind: row.kind, payload: row.payload || null };
}

function connect(config) {
  // Deferred: only executed on a real DB path, never in smoke mode.
  const { Client } = require('pg');
  return new Client(config);
}

module.exports = { ADAPTER_NAME, normalize, connect };
