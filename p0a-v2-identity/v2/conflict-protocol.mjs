/**
 * P0-A V2 — Conflict protocol (second layer; does not replace the serializer fix).
 *
 * On INSERT ... ON CONFLICT (event_id) DO NOTHING reporting rowCount 0, the
 * writer MUST NOT assume a duplicate. It retrieves the stored row and
 * compares canonical bytes UNDER THE STORED ROW'S CONTRACT:
 *
 *   bytes_equal(stored.payload, candidate.payload) -> IDEMPOTENT_DUPLICATE
 *   bytes_differ                              -> CANONICAL_ID_COLLISION (fail closed)
 *
 * Comparison is always under the stored row's contract (contractOf), never
 * the candidate's: a V1 row is compared with the frozen V1 comparator
 * (defects documented as historical), a V2 row with JCS bytes.
 *
 * Collision evidence carries digests and the contract, NEVER payload bytes:
 * diagnostic value without secret/private-payload leakage.
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { canonicalizeV2 } from './canonical-v2.mjs';
import { CONTRACT_V1, CONTRACT_V2, contractOf } from './event-identity.mjs';

const require = createRequire(import.meta.url);
const { CanonicalBytes: V1CanonicalBytes } = require('../test/fixtures/v1-canonical-authority.js');

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Canonical bytes of a payload under a given contract. */
export async function canonicalBytesUnder(contract, payload) {
  if (contract === CONTRACT_V2) {
    return (await canonicalizeV2(payload)).bytes;
  }
  if (contract === CONTRACT_V1) {
    // Frozen V1 comparator: byte-identical to the production conflict check
    // (CanonicalBytes.serializeString @20528ee18), defects included as history.
    return V1CanonicalBytes.serialize(payload);
  }
  throw new Error(`UNKNOWN_CONTRACT in conflict compare: ${contract}`);
}

/**
 * Resolve an ID conflict.
 * @param {object} args
 * @param {(eventId: string) => Promise<{ payload: any, metadata?: any } | null>} args.readStored
 *   — retrieval of the conflicting stored row (payload + metadata only).
 * @param {string} args.eventId — the conflicting event_id.
 * @param {any} args.candidatePayload — the payload that failed to insert.
 * @returns {Promise<{ verdict: 'IDEMPOTENT_DUPLICATE' | 'CANONICAL_ID_COLLISION' | 'NO_CONFLICT',
 *   contract?: string, evidence?: object }>}
 */
export async function resolveConflict({ readStored, eventId, candidatePayload }) {
  const stored = await readStored(eventId);
  if (!stored) return { verdict: 'NO_CONFLICT' }; // lost race; safe to treat as duplicate
  const contract = contractOf(stored);
  const [a, b] = await Promise.all([
    canonicalBytesUnder(contract, stored.payload),
    canonicalBytesUnder(contract, candidatePayload),
  ]);
  if (a.equals(b)) {
    return { verdict: 'IDEMPOTENT_DUPLICATE', contract };
  }
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
