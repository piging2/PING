/**
 * P0-A V2 — Canonical bytes (RFC 8785 JCS, adapted).
 *
 * Byte-layout engine: vendored canonical-json@0.4.0 (MIT, pinned, see VENDOR.md).
 * Conformance boundary: v2/domain-validator.mjs runs FIRST and enforces the
 * RFC 8785 MUST-terminate rules the engine lacks (non-finite numbers, lone
 * surrogates) plus the PING canonical value domain (DOMAIN.md).
 *
 * Output: UTF-8 bytes of the JCS JSON text (RFC 8785 S3.2.4).
 */
import { createRequire } from 'node:module';
import { validateCanonicalValue } from './domain-validator.mjs';

const require = createRequire(import.meta.url);
// CONFORMANCE NOTE (2026-10-01): the package's default export (index.js)
// routes the no-options case through stringify-copy.js, which re-inserts
// sorted keys into a FRESH JS OBJECT before JSON.stringify. JS engines always
// enumerate canonical-numeric keys first, so {"\r":…,"1":…} comes out as
// {"1":…,"\r":…} — violating RFC 8785 S3.2.3 (pure UTF-16 code-unit order).
// We import stringify.js (the full path) directly: it builds the output
// string from the sorted key list WITHOUT an intermediate object, which is
// conformant. Pinned by the RFC's own S3.2.3 sort vectors in tests.
let canonicalJsonSync = null;
try {
  const mod = require('../vendor/canonical-json-0.4.0/stringify.js');
  canonicalJsonSync = mod.default || mod;
} catch {
  canonicalJsonSync = null;
}

async function loadEngine() {
  if (canonicalJsonSync) return canonicalJsonSync;
  const mod = await import('../vendor/canonical-json-0.4.0/stringify.js');
  return mod.default || mod;
}

/**
 * Canonicalize a domain-valid value to JCS bytes.
 * @returns {{ json: string, bytes: Buffer }} — json is valid JCS text, bytes its UTF-8 form.
 * @throws {DomainError} for any value outside the canonical domain.
 */
export async function canonicalizeV2(value) {
  const normalized = validateCanonicalValue(value);
  const stringify = await loadEngine();
  const json = stringify(normalized);
  if (typeof json !== 'string') {
    throw new Error('canonical engine returned non-string');
  }
  return { json, bytes: Buffer.from(json, 'utf8') };
}

/** Synchronous variant; throws if require(esm) is unsupported on this runtime. */
export function canonicalizeV2Sync(value) {
  if (!canonicalJsonSync) {
    throw new Error('sync canonical engine unavailable on this runtime; use canonicalizeV2()');
  }
  const normalized = validateCanonicalValue(value);
  const json = canonicalJsonSync(normalized);
  return { json, bytes: Buffer.from(json, 'utf8') };
}
