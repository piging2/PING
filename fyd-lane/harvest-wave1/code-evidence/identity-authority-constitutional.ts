/**
 * Constitutional Identity Authority
 *
 * Centralized deterministic ID generation for constitutional compliance.
 * All ID generation must route through this authority to ensure replay determinism.
 *
 * Constitutional Requirements:
 * - IDs are deterministic
 * - IDs are derived from canonical bytes
 * - IDs use HashAuthority for hashing
 * - IDs include namespace for disambiguation
 * - IDs are content-addressable where applicable
 *
 * Patch 7B: generateId canonicalizes the context through
 * HashAuthority.canonicalizeObject before serialization, so nested key order
 * never affects the ID. Blast radius verified 2026-09-21: zero persisted
 * type_hash16 IDs exist in the repo and zero OBJECT_CREATED rows exist in the
 * live Oracle journal, so no persisted consumer depends on the old
 * JSON.stringify behavior.
 */

import { HashAuthority } from './hash-authority';

/**
 * Canonical ID structure
 */
export interface CanonicalID {
  authority: string;
  namespace: string;
  kind: string;
  version: string;
  hash: string;
}

/**
 * Constitutional Identity Authority
 */
export class IdentityAuthority {
  private static readonly CONSTITUTIONAL_VERSION = '1.0.0';

  /**
   * Generate deterministic ID from namespace and context
   *
   * @param namespace - Namespace for disambiguation
   * @param context - Context data (will be canonicalized)
   * @returns Canonical ID
   */
  static generateDeterministicId(namespace: string, context: string): CanonicalID {
    const canonicalInput = {
      namespace: namespace,
      context: context,
      constitutional_version: this.CONSTITUTIONAL_VERSION,
    };

    const hash = HashAuthority.hashCanonical(canonicalInput);

    return {
      authority: 'identity',
      namespace: namespace,
      kind: 'deterministic',
      version: this.CONSTITUTIONAL_VERSION,
      hash: hash,
    };
  }

  /**
   * Generate event ID
   *
   * @param eventType - Event type
   * @param aggregateId - Aggregate ID
   * @returns Event ID
   */
  static generateEventId(eventType: string, aggregateId: string): string {
    const canonicalInput = {
      event_type: eventType,
      aggregate_id: aggregateId,
      constitutional_version: this.CONSTITUTIONAL_VERSION,
    };

    return HashAuthority.hashCanonical(canonicalInput);
  }

  /**
   * Generate ID from canonical bytes
   *
   * @param canonicalBytes - Canonical byte representation
   * @param type - Type prefix
   * @returns Deterministic ID
   */
  static generateFromCanonicalHash(canonicalBytes: Buffer, type: string): string {
    const canonicalInput = {
      type: type,
      bytes: canonicalBytes.toString('base64'),
      constitutional_version: this.CONSTITUTIONAL_VERSION,
    };

    return HashAuthority.hashCanonical(canonicalInput);
  }

  /**
   * Get constitutional version
   *
   * @returns Version string
   */
  static getVersion(): string {
    return this.CONSTITUTIONAL_VERSION;
  }

  /**
   * Compatibility method: generate ID from type and context
   * Returns deterministic ID string (legacy API compatibility)
   *
   * The context is canonicalized through HashAuthority.canonicalizeObject
   * BEFORE serialization, so nested key order does not affect the ID.
   * Two semantically identical contexts always produce the same ID;
   * any semantic difference produces a different ID. Array order is
   * significant (arrays carry semantic ordering).
   *
   * Normalization note: `undefined` values canonicalize to `null`.
   *
   * @param type - Type prefix
   * @param context - Context data
   * @returns Deterministic ID string
   */
  static generateId(type: string, context: any): string {
    const canonicalContext = JSON.stringify(HashAuthority.canonicalizeObject(context));
    const canonicalId = this.generateDeterministicId(type, canonicalContext);
    // Format: type_hash16 for compatibility with existing ID format (underscore separator, not colon)
    return `${type}_${canonicalId.hash.substring(0, 16)}`;
  }

  /**
   * Compatibility method: generate deterministic ID from namespace and context
   * Returns CanonicalID object (new API)
   *
   * @param namespace - Namespace
   * @param context - Context string
   * @returns Canonical ID
   */
  static generate_deterministic_id(namespace: string, context: string): CanonicalID {
    return this.generateDeterministicId(namespace, context);
  }
}
