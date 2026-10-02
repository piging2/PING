/**
 * CANONICAL JSON (RFC-8785)
 *
 * Pure TypeScript implementation of RFC-8785 JSON Canonicalization Scheme (JCS).
 *
 * Requirements:
 * - lexicographic property ordering
 * - deterministic numeric rendering
 * - exact string preservation (no Unicode normalization)
 * - RFC-8785 semantics
 * - no infrastructure dependencies
 *
 * CONSTITUTIONAL RULE: This is the sole canonicalization authority.
 * All other canonicalization must delegate to this implementation.
 *
 * F7 identity domain (D1, ruled 2026-09-18):
 * LEGAL-INJECTIVE: arrays (flat/nested, grouping significant), strict cross-type
 *   distinction, null, empty object/array/string mutually distinct, Unicode
 *   preserved as supplied (NFC != NFD).
 * NORMALIZED-EQUIVALENT: object key order, -0 == 0, 1.0 == 1.
 * REJECTED fail-closed (typed deterministic error, before identity minting):
 *   NaN, +Infinity, -Infinity, undefined anywhere, sparse arrays, circular
 *   references, Buffer, functions, symbols, bigint.
 * Maximum canonicalization depth: 64.
 *
 * BUILD (F7/D2): this file is the authoritative source for the compiled runtime
 * artifact at gateway/replay/kernel/canonical_json.js. Rebuild ONLY via the
 * pinned command in scripts/rebuild-canonical-json.sh. Never hand-edit the
 * compiled artifact.
 */

import { DeterministicFailureFactory } from './deterministic_failure';

// Node.js Buffer is referenced for the toBuffer() convenience and the Buffer
// rejection boundary. Declared ambiently (value and type): this source carries
// no @types/node dependency, and the Buffer checks degrade gracefully where
// Buffer is undefined.
type Buffer = any;
declare const Buffer: any;

// Constitutional nesting depth limit to prevent stack overflow
const MAX_NESTING_DEPTH = 64;

export class CanonicalJson {
  /**
   * Canonicalize a value according to RFC-8785 JCS
   */
  static canonicalize(value: unknown): string {
    return JSON.stringify(this.canonicalizeValue(value));
  }

  /**
   * Alias for canonicalize (used by CanonicalEventEnvelope).
   * Preserved so the compiled artifact keeps its existing public surface.
   */
  static stringify(value: unknown): string {
    return this.canonicalize(value);
  }

  /**
   * Reject a value outside the F7/D1 identity domain with a typed error.
   * Fail-closed: no canonical bytes are produced for rejected values, so no
   * identity can be minted from them.
   */
  private static reject(reason: string): Error {
    return DeterministicFailureFactory.toError(
      DeterministicFailureFactory.create(
        'CANONICALIZATION_ERROR' as any,
        'CANONICALIZATION' as any,
        { reason }
      )
    );
  }

  /**
   * Canonicalize a value recursively
   */
  private static canonicalizeValue(value: unknown, visited = new Set<object>(), depth: number = 0): unknown {
    // F7/D1 identity-domain boundary: reject values with no canonical JSON
    // identity BEFORE any canonicalization. Never silently coerce:
    // JSON.stringify would drop undefined/functions/symbols and throw untyped
    // errors on bigint.
    if (value === undefined) {
      throw this.reject('undefined is not in the canonical identity domain');
    }
    const valueType = typeof value;
    if (valueType === 'function' || valueType === 'symbol' || valueType === 'bigint') {
      throw this.reject(`${valueType} is not in the canonical identity domain`);
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
      throw this.reject('Buffer is not in the canonical identity domain');
    }

    // Constitutional depth guard to prevent stack overflow
    if (depth > MAX_NESTING_DEPTH) {
      throw DeterministicFailureFactory.toError(
        DeterministicFailureFactory.executionLimitExceeded(
          'MAX_NESTING_DEPTH',
          MAX_NESTING_DEPTH,
          depth
        )
      );
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return this.canonicalizeNumber(value);
    }

    if (typeof value === 'string') {
      return this.canonicalizeString(value);
    }

    if (Array.isArray(value)) {
      // Check for circular reference
      if (visited.has(value)) {
        throw DeterministicFailureFactory.toError(
          DeterministicFailureFactory.create(
            'CANONICALIZATION_ERROR' as any,
            'CANONICALIZATION' as any,
            { reason: 'Circular reference detected in array' }
          )
        );
      }
      visited.add(value);

      // Reject sparse arrays constitutionally
      if (value.length !== Object.keys(value).length) {
        throw DeterministicFailureFactory.toError(
          DeterministicFailureFactory.create(
            'CANONICALIZATION_ERROR' as any,
            'CANONICALIZATION' as any,
            { reason: 'Sparse arrays are not supported in canonicalization' }
          )
        );
      }

      const result = value.map(item => this.canonicalizeValue(item, visited, depth + 1));
      visited.delete(value);
      return result;
    }

    if (typeof value === 'object') {
      // Check for circular reference
      if (visited.has(value as object)) {
        throw DeterministicFailureFactory.toError(
          DeterministicFailureFactory.create(
            'CANONICALIZATION_ERROR' as any,
            'CANONICALIZATION' as any,
            { reason: 'Circular reference detected in object' }
          )
        );
      }
      visited.add(value as object);

      // Pass depth unchanged: the object itself was already depth-checked at
      // this level on entry. canonicalizeObject charges one depth unit per
      // nesting level for the child values, exactly like the array branch.
      // One container level = one depth unit, uniformly across arrays/objects.
      const result = this.canonicalizeObject(value as Record<string, unknown>, visited, depth);
      visited.delete(value as object);
      return result;
    }

    return value;
  }

  /**
   * Canonicalize a number according to RFC-8785
   * Handles -0, scientific notation, and edge cases
   */
  private static canonicalizeNumber(value: number): number {
    // Handle -0 vs 0
    if (value === 0) {
      return 0; // Always use positive zero
    }

    // Handle NaN and Infinity
    if (!Number.isFinite(value)) {
      throw DeterministicFailureFactory.toError(
        DeterministicFailureFactory.create(
          'CANONICALIZATION_ERROR' as any,
          'CANONICALIZATION' as any,
          { reason: 'Cannot canonicalize NaN or Infinity' }
        )
      );
    }

    // Handle scientific notation
    // Convert numbers in scientific notation to their full representation
    // if they are within safe integer range
    if (value.toString().includes('e') || value.toString().includes('E')) {
      if (Number.isSafeInteger(value)) {
        return value; // Let JSON.stringify handle it
      }
      // For large numbers, keep as-is to avoid precision loss
      return value;
    }

    return value;
  }

  /**
   * Canonicalize a string according to RFC-8785
   * RFC-8785 preserves string values exactly - no normalization
   */
  private static canonicalizeString(value: string): string {
    return value;
  }

  /**
   * Canonicalize an object according to RFC-8785
   * Sorts properties lexicographically
   */
  private static canonicalizeObject(obj: Record<string, unknown>, visited: Set<object>, depth: number = 0): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort(this.lexicographicCompare);

    for (const key of keys) {
      result[key] = this.canonicalizeValue(obj[key], visited, depth + 1);
    }

    return result;
  }

  /**
   * Lexicographic comparison for property ordering
   * Uses UTF-16 code unit comparison as per RFC-8785
   */
  private static lexicographicCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Serialize to Uint8Array for hashing
   * Uses TextEncoder for UTF-8 encoding (runtime-neutral)
   */
  static toUint8Array(value: unknown): Uint8Array {
    const canonical = this.canonicalize(value);
    return new TextEncoder().encode(canonical);
  }

  /**
   * Serialize to Buffer for hashing (Node runtime convenience).
   * Preserved so the compiled artifact keeps its existing public surface.
   */
  static toBuffer(value: unknown): Buffer {
    const canonical = this.canonicalize(value);
    return Buffer.from(canonical, 'utf8');
  }
}
