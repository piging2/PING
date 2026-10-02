/**
 * P0-A V2 — Canonical bytes (RFC 8785 JCS, adapted).
 *
 * Byte-layout engine: vendored canonicalize@2.1.0 (Apache-2.0, pinned, see
 * VENDOR.md) — the RFC author's own 40-line implementation. It is NOT used
 * raw: it drops undefined-valued keys and maps undefined array elements to
 * null (JSON semantics), where the PING domain REQUIRES fail-closed
 * rejection. v2/domain-validator.mjs runs FIRST and enforces the RFC 8785
 * MUST-terminate rules plus the PING canonical value domain (DOMAIN.md)
 * BEFORE any byte is hashed.
 *
 * Output: UTF-8 bytes of the JCS JSON text (RFC 8785 S3.2.4).
 */
const serialize = require('../vendor/canonicalize-2.1.0/lib/canonicalize.js');
const { validateCanonicalValue } = require('./domain-validator.cjs');

/**
 * Canonicalize a domain-valid value to JCS bytes.
 * @returns {{ json: string, bytes: Buffer }} — json is valid JCS text, bytes its UTF-8 form.
 * @throws {DomainError} for any value outside the canonical domain.
 */
function canonicalizeV2(value) {
  const normalized = validateCanonicalValue(value);
  const json = serialize(normalized);
  if (typeof json !== 'string') {
    throw new Error('canonical engine returned non-string');
  }
  return { json, bytes: Buffer.from(json, 'utf8') };
}

module.exports = { canonicalizeV2 };
