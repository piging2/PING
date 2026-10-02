'use strict';
// PATCH-03 step 1: prove the collision witness.
// Captures exactly what IdentityAuthority computes for an event:
// canonical bytes (the identity preimage), the full 256-bit digest,
// and the truncated event_id. Asserts whether the full digest is
// returned by generateId() anywhere in the UER persist path.
const path = require('path');
const REPO = process.env.REPO || '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { identityAuthority } = require(path.join(REPO, 'runtime/kernel/authorities/identity_authority.js'));
const { CanonicalAuthority, CanonicalBytes } = require(path.join(REPO, 'runtime/kernel/authorities/canonical_authority.js'));
const fs = require('fs');

const identityData = {
  event_type: 'REVIEW_RECEIVED',
  source: 'witness-probe',
  namespace: 'core::system',
  payload: { a: 1 },
};

const eventId = identityAuthority.generateId('event', identityData);

// Rebuild the exact preimage generateId hashed (see identity_authority.js).
const canonicalData = {
  type: 'event',
  version: identityAuthority.getIdentityVersion(),
  identity_version: identityAuthority.getIdentityVersion(),
  ...identityData,
};
const canonicalBytes = CanonicalBytes.serialize(canonicalData);
const fullDigest = CanonicalAuthority.hashBytes(canonicalBytes);

const expected = 'event_' + fullDigest.substring(0, 16);
const uerSrc = fs.readFileSync(path.join(REPO, 'ping-runtime/events/unified_event_runtime.js'), 'utf8');
const digestPersisted = /\bcanonical_hash\b/.test(uerSrc);

console.log('WITNESS-PROBE');
console.log('  canonical_bytes_hex_prefix=' + canonicalBytes.slice(0, 32).toString('hex') + '...');
console.log('  canonical_bytes_len=' + canonicalBytes.length);
console.log('  full_digest_256bit=' + fullDigest + ' (' + fullDigest.length + ' hex chars = ' + (fullDigest.length * 4) + ' bits)');
console.log('  event_id=' + eventId);
console.log('  event_id_embeds_digest_prefix=' + (eventId === expected));
console.log('  bits_retained_in_event_id=' + (eventId.split('_')[1].length * 4));
console.log('  bits_discarded=' + (256 - eventId.split('_')[1].length * 4));
const idCtx = uerSrc.slice(
  Math.max(0, uerSrc.indexOf("generateId('event'") - 400),
  uerSrc.indexOf("generateId('event'") + 400);
console.log('  generateId_returns_digest_alongside_id=' + /digest/.test(idCtx));
console.log('  digest_persisted_anywhere_in_uer=' + digestPersisted);

// Physical-column check: does ping_events DDL (or any migration) define canonical_hash?
const { execSync } = require('child_process');
const ddlHits = execSync("grep -rn 'canonical_hash' database/ ping-runtime/ runtime/ gateway/ --include='*.js' --include='*.sql' 2>/dev/null | grep -iv 'metadata' | head -20", { cwd: REPO }).toString();
console.log('  canonical_hash_mentions_in_tree:\n' + (ddlHits.trim() || '    (none)'));
