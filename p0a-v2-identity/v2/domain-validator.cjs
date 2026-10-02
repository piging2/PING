/**
 * P0-A V2 — Strict canonical value domain validator (RFC 8785 conformance boundary).
 *
 * The vendored byte-layout engine (canonical-json@0.4.0) is NOT used raw:
 * it maps non-finite numbers to null and passes lone surrogates through,
 * where RFC 8785 Sections 3.2.2.2/3.2.2.3 REQUIRE termination with an error.
 * This validator enforces the MUST-terminate rules and the PING canonical
 * value domain (DOMAIN.md) BEFORE any byte is hashed.
 *
 * Rejection is fail-closed and typed: every unsupported value raises a
 * DomainError with a stable code, the JSON path of the offending value,
 * and no payload exfiltration beyond the path.
 */

const MAX_DEPTH = 64;

class DomainError extends Error {
  constructor(code, path, detail) {
    super(`[${code}] at ${path || '$'}: ${detail}`);
    this.name = 'DomainError';
    this.code = code;
    this.path = path || '$';
  }
}

// Lone surrogate: a high surrogate not followed by a low surrogate,
// or a low surrogate not preceded by a high surrogate.
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

const isPlainObject = (v) => {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Validate `value` against the canonical domain and return a normalized
 * deep copy safe for canonicalization. Never mutates the input.
 * - -0 is normalized to 0 (RFC 8785 Appendix B: identical bytes BY SPEC).
 * - Everything outside the domain throws DomainError.
 */
function validateCanonicalValue(value, opts = {}) {
  const maxDepth = opts.maxDepth ?? MAX_DEPTH;
  const ancestors = new Set();

  function walk(v, path, depth) {
    if (depth > maxDepth) {
      throw new DomainError('DOMAIN_DEPTH_EXCEEDED', path, `nesting deeper than ${maxDepth}`);
    }
    if (v === null) return null;
    const t = typeof v;
    if (t === 'boolean') return v;
    if (t === 'string') {
      if (LONE_SURROGATE_RE.test(v)) {
        throw new DomainError('DOMAIN_LONE_SURROGATE', path, 'string contains a lone surrogate');
      }
      return v; // preserved as-is: NO Unicode normalization (RFC 8785 S3.1)
    }
    if (t === 'number') {
      if (!Number.isFinite(v)) {
        throw new DomainError('DOMAIN_NON_FINITE_NUMBER', path, `non-finite number ${String(v)} rejected`);
      }
      return Object.is(v, -0) ? 0 : v; // -0 -> 0, explicit per RFC 8785 App. B
    }
    if (t === 'bigint') throw new DomainError('DOMAIN_BIGINT', path, 'encode as string explicitly (RFC 8785 App. D)');
    if (t === 'undefined') throw new DomainError('DOMAIN_UNDEFINED', path, 'undefined is not a JSON value');
    if (t === 'function' || t === 'symbol') {
      throw new DomainError('DOMAIN_NON_DATA', path, `${t} is not a JSON value`);
    }
    // t === 'object' from here
    if (ancestors.has(v)) {
      throw new DomainError('DOMAIN_CIRCULAR', path, 'circular structure is not serializable');
    }
    ancestors.add(v);
    try {
      if (Array.isArray(v)) {
        const out = new Array(v.length);
        for (let i = 0; i < v.length; i++) {
          if (!(i in v)) {
            throw new DomainError('DOMAIN_UNDEFINED', `${path}[${i}]`, 'sparse array hole is not a JSON value');
          }
          out[i] = walk(v[i], `${path}[${i}]`, depth + 1);
        }
        return out;
      }
      if (!isPlainObject(v)) {
        const tag = Object.prototype.toString.call(v);
        throw new DomainError('DOMAIN_NON_PLAIN_OBJECT', path, `${tag} must be encoded explicitly (no implicit toJSON/Date/Buffer/Map)`);
      }
      if (typeof v.toJSON === 'function') {
        throw new DomainError('DOMAIN_BEHAVIORAL', path, 'toJSON is behavior, not data; encode explicitly');
      }
      const out = {};
      for (const k of Object.keys(v)) {
        out[k] = walk(v[k], `${path}.${k}`, depth + 1);
      }
      return out;
    } finally {
      ancestors.delete(v);
    }
  }

  return walk(value, '$', 0);
}

module.exports = { MAX_DEPTH, DomainError, validateCanonicalValue };
