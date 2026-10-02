'use strict';
/**
 * JCS FROM SPEC — PING P0-A evaluation harness (UNEVALUATED, NOT WIRED).
 *
 * A clean-room implementation of RFC 8785 (JSON Canonicalization Scheme)
 * written directly from the RFC's rules, for EVALUATION ONLY. It is not
 * imported by any production path. Purpose: prove the SCHEME satisfies
 * PING's adversarial requirements, independent of any library's claims.
 *
 * RFC 8785 rules implemented:
 *  - §3.1: I-JSON subset (no duplicate member names — a parse-level concern;
 *    this value-level serializer operates on already-parsed values where
 *    duplicates cannot exist; raw-text duplicate detection belongs in the
 *    admission parser, documented in DOMAIN.md).
 *  - §3.2.1: UTF-8 output, no insignificant whitespace.
 *  - §3.2.2.1: null/true/false literals.
 *  - §3.2.2.2: strings per ECMAScript JSON.stringify escaping
 *    (quote, backslash, U+0000-U+001F escaped; U+007F NOT escaped;
 *    everything else literal UTF-8). Lone surrogates -> ERROR.
 *  - §3.2.2.3: numbers per ECMAScript Number::toString; -0 -> "0";
 *    NaN / ±Infinity -> ERROR (not representable, not coerced).
 *  - §3.2.3: object properties sorted by UTF-16 code units, recursively.
 *  - Arrays: element order preserved, boundaries explicit.
 *
 * PING profile decisions (stricter than bare RFC where noted):
 *  - Non-finite numbers REJECTED (RFC: error). Never coerced to null.
 *  - undefined, functions, symbols, BigInt REJECTED (no JSON value).
 *  - Non-plain objects (Date, Map, Buffer, class instances) REJECTED:
 *    canonicalization must not silently bless ambient object state.
 *  - Nesting depth capped at 64 (fail closed on hostile depth).
 */

const MAX_DEPTH = 64;

// Lone surrogate detection: a high surrogate not followed by a low
// surrogate, or a low surrogate not preceded by a high surrogate.
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;

function assertNoLoneSurrogate(s, what) {
  if (LONE_SURROGATE_RE.test(s)) {
    throw new Error(`JCS: lone surrogate in ${what} rejected`);
  }
}

function canonicalizeString(s) {
  assertNoLoneSurrogate(s, 'string');
  // JSON.stringify escaping is exactly the RFC 8785 §3.2.2.2 rule:
  // escapes ", \, and U+0000-U+001F (with \b \f \n \r \t short forms);
  // leaves U+007F and all non-ASCII as literal UTF-8.
  return JSON.stringify(s);
}

function canonicalizeNumber(n) {
  if (typeof n !== 'number') throw new Error('JCS: not a number');
  if (!Number.isFinite(n)) {
    throw new Error('JCS: non-finite number rejected (NaN/Infinity have no canonical form)');
  }
  // ECMAScript Number::toString. In V8/Node, String(n) implements it exactly:
  // integer-valued -> decimal, -0 -> "0", large/small -> exponent form.
  return String(n);
}

function isPlainObject(v) {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error(`JCS: nesting depth exceeds ${MAX_DEPTH}`);
  }
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') return canonicalizeNumber(value);
  if (t === 'string') return canonicalizeString(value);
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new Error(`JCS: value of type '${t}' has no canonical form (rejected)`);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((el) => canonicalize(el, depth + 1)).join(',') + ']';
  }
  if (t === 'object') {
    if (!isPlainObject(value)) {
      throw new Error('JCS: non-plain object rejected (Date/Map/Buffer/class instance have no canonical form)');
    }
    // Default Array.prototype.sort() compares UTF-16 code units — exactly
    // the RFC 8785 §3.2.3 ordering. No locale. Recursive by construction.
    const keys = Object.keys(value).sort();
    const parts = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      assertNoLoneSurrogate(k, 'object key');
      parts[i] = JSON.stringify(k) + ':' + canonicalize(value[k], depth + 1);
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`JCS: unsupported value (type '${t}')`);
}

module.exports = { canonicalize, MAX_DEPTH };
