/**
 * P0-A V2 — Versioned event identity: V1 reader + V2 writer + era separation.
 *
 * CONTRACTS
 * - ping-event-id/v1 (HISTORICAL, FROZEN): sha256 over raw JSON.stringify of
 *   the identity material { eventType, source, [namespace], [tenant_id],
 *   logical_id|payload }. Byte-identical to generateSpineEventId @20528ee18
 *   (verified against the 2026-09-24 golden vectors in tests). READ FOREVER.
 *   NEVER REMINTED. Defects are documented, not fixed: insertion-ordered
 *   keys, NaN/±Infinity -> null, -0 -> 0, no domain separator.
 * - ping-event-id/v2 (NEW WRITES ONLY): identity material validated against
 *   the canonical domain, canonicalized to RFC 8785 JCS bytes, then hashed
 *   with an explicit era/version domain separator:
 *       sha256( "PING-EVENT-ID" || 0x00 || "v2" || 0x00 || jcs_bytes )
 *   The separator makes cross-era ID confusion cryptographically impossible:
 *   no V1 ID can be re-derived as V2 and vice versa.
 *
 * ERA DETERMINABILITY (brief S4: if the contract for an event cannot be
 * determined -> STOP; that is the next broken invariant):
 *   stored metadata.identity_contract present -> that contract.
 *   absent (all pre-migration rows)               -> ping-event-id/v1
 *   (historical default; every row minted before the migration ran V1).
 * Any other marker value -> UNKNOWN_CONTRACT (fail closed, never guessed).
 *
 * The event_id column stays 64-char hex in both eras (VARCHAR(64) PK
 * untouched). Era is ALSO recorded in the envelope (metadata.identity_contract)
 * so readers never infer it from bytes.
 */
import crypto from 'node:crypto';
import { canonicalizeV2 } from './canonical-v2.mjs';

export const CONTRACT_V1 = 'ping-event-id/v1';
export const CONTRACT_V2 = 'ping-event-id/v2';
export const KNOWN_CONTRACTS = new Set([CONTRACT_V1, CONTRACT_V2]);

const ERA_TAG = Buffer.from('PING-EVENT-ID', 'utf8');
const SEP = Buffer.from([0x00]);

/**
 * V1 mint — frozen historical contract. Reimplementation of
 * IdentityAuthority.generateSpineEventId @20528ee18 (verified byte-identical
 * against golden vectors). Used ONLY for (a) reading/verifying pre-migration
 * rows, (b) historical-compatibility proofs. NEVER for new writes.
 */
export function mintV1(eventType, source, options = {}) {
  const identity = { eventType, source };
  if (options.namespace) identity.namespace = options.namespace;
  if (options.tenant_id !== undefined && options.tenant_id !== null) {
    identity.tenant_id = options.tenant_id;
  }
  identity[options.logical_id ? 'logical_id' : 'payload'] =
    options.logical_id || options.payload;
  return crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

/** Build the V2 identity material: same logical fields as V1, JCS-canonicalized. */
async function v2IdentityBytes(eventType, source, options = {}) {
  const material = { eventType, source };
  if (options.namespace) material.namespace = options.namespace;
  if (options.tenant_id !== undefined && options.tenant_id !== null) {
    material.tenant_id = options.tenant_id;
  }
  material[options.logical_id ? 'logical_id' : 'payload'] =
    options.logical_id || options.payload;
  const { bytes } = await canonicalizeV2(material);
  return bytes;
}

/**
 * V2 mint — for NEW writes only, after migration authorization.
 * @returns {{ eventId, contract, canonicalJson }} — canonicalJson is the
 *   JCS text that was hashed (audit/debug; never persisted as identity).
 */
export async function mintV2(eventType, source, options = {}) {
  const jcsBytes = await v2IdentityBytes(eventType, source, options);
  const id = crypto
    .createHash('sha256')
    .update(ERA_TAG)
    .update(SEP)
    .update('v2', 'utf8')
    .update(SEP)
    .update(jcsBytes)
    .digest('hex');
  return { eventId: id, contract: CONTRACT_V2, canonicalJson: jcsBytes.toString('utf8') };
}

/**
 * Determine which identity contract applies to a stored event row.
 * @param {object} row — persisted row shape { metadata?: { identity_contract? } }
 * @returns {string} contract id
 * @throws on unknown marker (fail closed; the caller must STOP).
 */
export function contractOf(row) {
  const marker = row && row.metadata && row.metadata.identity_contract;
  if (marker === undefined || marker === null) return CONTRACT_V1; // historical default
  if (KNOWN_CONTRACTS.has(marker)) return marker;
  throw new Error(`UNKNOWN_CONTRACT: cannot determine identity contract (marker=${JSON.stringify(marker)}); refusing to guess`);
}

/** Envelope marker a V2 writer stamps on new rows. */
export function v2EnvelopeMarker() {
  return { identity_contract: CONTRACT_V2 };
}
