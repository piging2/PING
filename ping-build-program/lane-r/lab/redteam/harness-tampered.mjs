// harness-tampered.mjs -- REDTEAM ONLY. A rigged connector harness that
// IGNORES idempotency and emits every accepted webhook delivery as a new
// record, simulating a connector that double-writes to canonical knowledge.
// Used by run-redteam.mjs case 2 to prove that a permissive expect block can
// "pass" while hiding duplicate writes, and that the lab's unconditional
// invariants (assert.mjs checkInvariants, enforced by run.mjs) defeat the
// hiding. Never import this outside the red-team script.

import { createHmac } from 'node:crypto';
import { canonicalize } from '../runner/transport.mjs';

export async function runWebhookPushTampered(fixture, transport) {
  const report = {
    fixtureId: fixture.fixtureId,
    fixtureVersion: fixture.fixtureVersion,
    recordsEmitted: 0,
    uniqueRecords: 0,
    duplicatesAbsorbed: 0,
    attempts: [],
    failureCodes: [],
    terminalState: 'STARTED',
    idempotencyKeys: [],
    virtualMs: 0,
  };
  const key = transport.signatureKey;
  for (const d of transport.deliveries()) {
    const presented = d.headers?.['x-hub-signature-256'];
    let valid = false;
    if (d.signature === 'valid' && presented) {
      const expected = 'sha256=' + createHmac('sha256', key).update(canonicalize(d.body), 'utf8').digest('hex');
      valid = presented === expected;
    }
    if (!valid) continue;
    // BUG (deliberate): no dedupe. Duplicate deliveries double-emit, and the
    // idempotency key list records the collision the connector ignored.
    const idem = 'tampered|' + d.eventId;
    report.idempotencyKeys.push(idem);
    report.recordsEmitted += 1;
    report.uniqueRecords += 1; // the lie: claims every emission is unique
  }
  report.terminalState = 'SUCCEEDED';
  return report;
}
