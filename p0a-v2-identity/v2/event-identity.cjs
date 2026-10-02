/**
 * P0-A V2 — Versioned event identity: V1 reader + V2 writer + era separation.
 * (Adapted from WS2 §4.3/§4.4; deviations documented in docs/ERA_DESIGN.md.)
 *
 * CONTRACTS
 * - ping-event-id/v1 (HISTORICAL, FROZEN): spine = sha256 over raw
 *   JSON.stringify of { eventType, source, [namespace], [tenant_id],
 *   logical_id|payload }. Byte-identical to generateSpineEventId @20528ee18
 *   (verified against the 2026-09-24 golden vectors). READ FOREVER. NEVER
 *   REMINTED. Journal eras (fyd-*, mc-*) keep their pinned schemes.
 * - ping-event-id/v2 (NEW WRITES ONLY): identity material validated against
 *   the canonical domain, canonicalized to RFC 8785 JCS bytes with era and
 *   domain INSIDE the hashed preimage:
 *       preimage = JCS({"era":"v2","domain":<domain>,"eventType":…,"source":…,
 *                        ["namespace":…],["tenant_id":…],["logical_id"|"payload":…]})
 *       event_id = "ev2:<domain>:" + hex(sha256(preimage))
 *   ':' appears in NO V1 scheme, so era parsing is unambiguous.
 *
 * ERA DETERMINABILITY (brief S4 — indeterminate => STOP, never guess):
 *   1. metadata.identity_era present ('v1'|'v2') AND event_id parses to the
 *      same era  -> that contract.
 *   2. marker absent -> eraOf(event_id).
 *   3. marker present but disagrees with the ID -> UNKNOWN (fail closed).
 *   4. eraOf cannot classify the ID -> UNKNOWN (fail closed).
 *
 * Domains (registry; new entries require an explicit decision):
 *   spine (ping_events), journal (FYD/MC journal), witness, replay, action.
 */
const crypto = require('node:crypto');
const { canonicalizeV2 } = require('./canonical-v2.cjs');

const CONTRACT_V1 = 'ping-event-id/v1';
const CONTRACT_V2 = 'ping-event-id/v2';
const KNOWN_CONTRACTS = new Set([CONTRACT_V1, CONTRACT_V2]);

const DOMAINS = new Set(['spine', 'journal', 'witness', 'replay', 'action']);

/**
 * V1 mint — frozen historical contract. Byte-identical reimplementation of
 * IdentityAuthority.generateSpineEventId @20528ee18 (golden-verified).
 * For reading/verifying pre-migration rows and proofs ONLY. Never new writes.
 */
function mintV1(eventType, source, options = {}) {
  const identity = { eventType, source };
  if (options.namespace) identity.namespace = options.namespace;
  if (options.tenant_id !== undefined && options.tenant_id !== null) {
    identity.tenant_id = options.tenant_id;
  }
  identity[options.logical_id ? 'logical_id' : 'payload'] =
    options.logical_id || options.payload;
  return crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

/** V2 preimage: era + domain + identity material, JCS-canonicalized. */
function v2PreimageBytes(eventType, source, options = {}) {
  const domain = options.domain || 'spine';
  if (!DOMAINS.has(domain)) {
    throw new Error(`UNKNOWN_DOMAIN: "${domain}" is not a registered identity domain`);
  }
  const material = { era: 'v2', domain, eventType, source };
  if (options.namespace) material.namespace = options.namespace;
  if (options.tenant_id !== undefined && options.tenant_id !== null) {
    material.tenant_id = options.tenant_id;
  }
  material[options.logical_id ? 'logical_id' : 'payload'] =
    options.logical_id || options.payload;
  return { domain, bytes: canonicalizeV2(material).bytes, json: canonicalizeV2(material).json };
}

/**
 * V2 mint — NEW writes only, after migration authorization (flag-gated).
 * @returns {{ eventId, contract, domain, canonicalJson }}
 */
function mintV2(eventType, source, options = {}) {
  const { domain, bytes, json } = v2PreimageBytes(eventType, source, options);
  const hex = crypto.createHash('sha256').update(bytes).digest('hex');
  return { eventId: `ev2:${domain}:${hex}`, contract: CONTRACT_V2, domain, canonicalJson: json };
}

/**
 * Classify an event_id string into its era. Pure function, no guessing.
 * @returns {{ era: 'v1'|'v2', family: string, domain?: string }}
 * @throws on unclassifiable input (fail closed).
 */
function eraOf(eventId) {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    throw new Error('UNKNOWN_CONTRACT: empty/non-string event_id');
  }
  let m = /^ev2:([a-z]+):[0-9a-f]{64}$/.exec(eventId);
  if (m) {
    if (!DOMAINS.has(m[1])) throw new Error(`UNKNOWN_CONTRACT: unregistered v2 domain "${m[1]}"`);
    return { era: 'v2', family: 'v2', domain: m[1] };
  }
  if (/^[0-9a-f]{64}$/.test(eventId)) return { era: 'v1', family: 'spine' };
  if (/^evt_[0-9a-f]{16}$/.test(eventId)) return { era: 'v1', family: 'evt' };
  if (/^(fyd-seed-ovl-\d+|fyd-ovl-[0-9a-z]+-[0-9a-f]{12}|mc-bf-[0-9a-f]{12}|mc-apr-[0-9a-f]{16}|mc-d-[0-9a-f]{12})$/.test(eventId)) {
    return { era: 'v1', family: 'journal' };
  }
  throw new Error(`UNKNOWN_CONTRACT: cannot classify event_id "${eventId.slice(0, 32)}…"`);
}

/** Contract id for an era classification. */
function contractForEra(eraInfo) {
  return eraInfo.era === 'v2' ? CONTRACT_V2 : CONTRACT_V1;
}

/**
 * Determine which identity contract applies to a stored event row.
 * @param {{ event_id: string, metadata?: { identity_era?: string } }} row
 */
function contractOf(row) {
  const idEra = eraOf(row.event_id);
  const marker = row.metadata && row.metadata.identity_era;
  if (marker === undefined || marker === null) return contractForEra(idEra);
  if (marker !== 'v1' && marker !== 'v2') {
    throw new Error(`UNKNOWN_CONTRACT: bad identity_era marker ${JSON.stringify(marker)}`);
  }
  const markerContract = marker === 'v2' ? CONTRACT_V2 : CONTRACT_V1;
  if (markerContract !== contractForEra(idEra)) {
    throw new Error('UNKNOWN_CONTRACT: identity_era marker disagrees with event_id era; refusing to guess');
  }
  return markerContract;
}

/** Envelope marker a V2 writer stamps on new rows. */
function v2EnvelopeMarker() {
  return { identity_era: 'v2' };
}

module.exports = {
  CONTRACT_V1, CONTRACT_V2, KNOWN_CONTRACTS, DOMAINS,
  mintV1, mintV2, eraOf, contractOf, contractForEra, v2EnvelopeMarker,
};
