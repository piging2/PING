/**
 * PATCH-10 — Routing Law Version Guard (unit test, no DB).
 *
 * The routing law (EVENT_MISSION_MAP) is mutable code with no historical
 * version record. Reconciliation therefore derives never-derived obligations
 * under the CURRENT law only, with the law version pinned. This test fails
 * when the map's canonical serialization changes without a version bump:
 * changing the map requires bumping ROUTING_LAW_VERSION in the same commit
 * AND updating the pins below (the drain checklist in the zoom report
 * section M applies when a change removes routings).
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');

const {
  EVENT_MISSION_MAP,
  ROUTING_LAW_VERSION,
  canonicalRoutingLaw,
} = require('../event_to_mission_bridge.js');

// Pinned 2026-09-19: update ONLY together with a ROUTING_LAW_VERSION bump.
const EXPECTED_LAW_VERSION = '2026-09-19.1';
const EXPECTED_LAW_HASH = 'ac862aa6c04d2b9aeecd4f7b610ae0b7788d8a181c398cbb9b265235ec7ba4ce';

function run() {
  assert.strictEqual(
    ROUTING_LAW_VERSION,
    EXPECTED_LAW_VERSION,
    `ROUTING_LAW_VERSION changed to ${ROUTING_LAW_VERSION}: update EXPECTED_LAW_VERSION deliberately`
  );

  const law = canonicalRoutingLaw();
  assert.ok(law.length > 0, 'canonicalRoutingLaw() is non-empty');
  // Determinism: two serializations of the same law are byte-identical.
  assert.strictEqual(canonicalRoutingLaw(), law, 'canonicalRoutingLaw() is deterministic');

  const hash = crypto.createHash('sha256').update(law).digest('hex');
  assert.strictEqual(
    hash,
    EXPECTED_LAW_HASH,
    'EVENT_MISSION_MAP changed without a ROUTING_LAW_VERSION bump: bump the version in the same commit and update EXPECTED_LAW_HASH'
  );

  // Every map entry still has the shape the reconciler depends on.
  for (const [type, m] of Object.entries(EVENT_MISSION_MAP)) {
    assert.ok(typeof m.missionType === 'string' && m.missionType.length > 0, `${type} has missionType`);
  }

  console.log(`routing-law guard: PASS (version=${ROUTING_LAW_VERSION}, entries=${Object.keys(EVENT_MISSION_MAP).length})`);
}

run();
