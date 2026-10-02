/**
 * C1 foundation — canonical serialization.
 *
 * HARVESTED PATTERN (not copied code):
 *   SOURCE: /home/nolan/ping, runtime/constitutional/src/hash-authority.ts
 *           (HashAuthority.canonicalizeObject, Patch 7B fix, verified 2026-09-21)
 *         + runtime/constitutional/src/ping-identity.ts (PingIdentityGenerator.canonicalBytes)
 *   EVIDENCE: ~/workspace/fyd-lane/harvest-wave1/code-evidence/{hash-authority.ts,ping-identity.ts}
 *   HEAD: /home/nolan/ping @ 4c098334c (refactor/runtime-authority-convergence)
 *
 * Harvest rule applied: the legacy JS spine (UnifiedEventRuntime.emit) hashed
 * plain JSON.stringify output — insertion-order fragile. Patch 7B fixed this in
 * the constitutional subsystem by canonicalizing FIRST (recursive key sort),
 * then serializing. FYD adopts the fixed pattern directly: canonicalize first,
 * always. The harvest-report key-order flag is resolved HERE, not deferred.
 *
 * Rules (match the harvested authority):
 *  - objects: keys sorted (default UTF-16 code-unit order, same as Object.keys().sort())
 *  - arrays: order is SEMANTIC, never sorted
 *  - undefined -> null (normalization, same as PING)
 *  - non-finite numbers, functions, symbols, bigint: THROW (fail closed — never
 *    guess bytes for values that cannot serialize deterministically)
 *
 * LICENSE: UNKNOWN (no LICENSE file found at either repo root; see ingestion index).
 * These modules are fresh FYD code implementing a harvested pattern, not copied text.
 */

/** Recursively canonicalize a value into a key-sorted plain structure. */
export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('canonicalize: non-finite number cannot serialize deterministically');
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj).sort()) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  throw new Error(
    `canonicalize: unsupported type '${typeof value}' — refusing to guess canonical bytes`
  );
}

/**
 * The canonical byte form of a value: canonicalize, then JSON, then UTF-8 string.
 * This is what gets hashed and (later) signed. Never hash raw JSON.stringify
 * output whose key order is accidental.
 */
export function canonicalBytes(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
