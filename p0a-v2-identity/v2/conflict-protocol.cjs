/**
 * P0-A V2 — Conflict protocol (second layer; does not replace the serializer fix).
 *
 * Covers BOTH historical comparators (WS2 §1b/§1c):
 *  - deployed line:  whitelist(o) = JSON.stringify(o, Object.keys(o).sort())
 *    (top-level-key whitelist; blind to nested differences — DOCUMENTED DEFECT)
 *  - integrated line: CanonicalBytes.serializeString (blind to [1,2] vs [12])
 *
 * Forward protocol: on INSERT ... ON CONFLICT DO NOTHING with rowCount 0,
 * retrieve the stored row and compare canonical bytes UNDER THE STORED ROW'S
 * CONTRACT (contractOf — era dispatch, never guessing):
 *   equal   -> IDEMPOTENT_DUPLICATE
 *   differ  -> CANONICAL_ID_COLLISION (fail closed)
 * V2 rows compare with JCS deep bytes. V1 rows compare with their pinned
 * historical comparator (documented as history, not fixed).
 *
 * Collision evidence carries digests and the contract, NEVER payload bytes.
 */
const crypto = require('node:crypto');
const { canonicalizeV2 } = require('./canonical-v2.cjs');
const { CONTRACT_V1, CONTRACT_V2, contractOf } = require('./event-identity.cjs');
const { CanonicalBytes: V1CanonicalBytes } = require('../test/fixtures/v1-canonical-authority.js');

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Deployed-line historical comparator (frozen; blind to nested keys). */
function deployedWhitelistCanon(o) {
  return Buffer.from(JSON.stringify(o, Object.keys(o).sort()), 'utf8');
}

/** Integrated-line historical comparator (frozen; [1,2]≡[12]). */
function integratedCanonicalBytes(o) {
  return V1CanonicalBytes.serialize(o);
}

/**
 * Canonical bytes of a payload under a contract + historical line.
 * @param {'deployed'|'integrated'} line — which V1 comparator pin to use.
 */
function canonicalBytesUnder(contract, payload, line = 'integrated') {
  if (contract === CONTRACT_V2) return canonicalizeV2(payload).bytes;
  if (contract === CONTRACT_V1) {
    return line === 'deployed' ? deployedWhitelistCanon(payload) : integratedCanonicalBytes(payload);
  }
  throw new Error(`UNKNOWN_CONTRACT in conflict compare: ${contract}`);
}

/**
 * Resolve an ID conflict.
 * @param {object} args
 * @param {(eventId: string) => Promise<{ payload: any, metadata?: any } | null>} args.readStored
 * @param {string} args.eventId
 * @param {any} args.candidatePayload
 * @param {'deployed'|'integrated'} [args.line='integrated']
 */
async function resolveConflict({ readStored, eventId, candidatePayload, line = 'integrated' }) {
  const stored = await readStored(eventId);
  if (!stored) return { verdict: 'NO_CONFLICT' };
  const contract = contractOf({ event_id: eventId, metadata: stored.metadata });
  const a = canonicalBytesUnder(contract, stored.payload, line);
  const b = canonicalBytesUnder(contract, candidatePayload, line);
  if (a.equals(b)) return { verdict: 'IDEMPOTENT_DUPLICATE', contract };
  return {
    verdict: 'CANONICAL_ID_COLLISION',
    contract,
    evidence: {
      event_id: eventId,
      contract,
      stored_payload_sha256: sha256hex(a),
      candidate_payload_sha256: sha256hex(b),
      stored_bytes: a.length,
      candidate_bytes: b.length,
    },
  };
}

module.exports = {
  deployedWhitelistCanon, integratedCanonicalBytes, canonicalBytesUnder, resolveConflict,
};
