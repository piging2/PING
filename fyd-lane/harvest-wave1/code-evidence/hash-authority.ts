/**
 * Constitutional Hash Authority (TypeScript Constitutional Subsystem)
 * 
 * CENTRALIZED hash generation authority for TypeScript constitutional subsystem.
 * All TypeScript constitutional hashing must use this authority to ensure algorithm consistency.
 * Currently uses SHA-256 only.
 * 
 * JURISDICTIONAL BOUNDARY:
 * - This authority is for TypeScript constitutional subsystem ONLY
 * - Python constitutional subsystem uses CanonicalHashAuthority (runtime/authorities/canonical_hash_authority.py)
 * - NO cross-language data flow between Python and TypeScript constitutional subsystems
 * - Python uses PostgreSQL for persistence, TypeScript uses in-memory Map
 * - They are separate jurisdictions with no shared state
 * 
 * Constitutional Hash Law (TypeScript Subsystem):
 * - SHA-256 only (no other algorithms)
 * - Canonical serialization before hashing (UTF-16 default sort)
 * - Envelope pattern for versioning (canonical_version, serialization_version, algorithm, payload)
 * - No direct crypto usage outside this authority
 * - HashAuthority.canonicalizeObject() is the SINGLE canonical serializer authority for TypeScript subsystem
 * 
 * This is the ONLY place where JSON.stringify is used for canonical serialization in TypeScript subsystem.
 * This is the ONLY place where Object.keys().sort() is used for canonical key ordering in TypeScript subsystem.
 * All other TypeScript constitutional code must delegate to this authority.
 * 
 * There is exactly one canonical object traversal in the TypeScript constitutional runtime.
 * Everything else delegates.
 * 
 * NOTE: This authority uses envelope pattern (versioned), which differs from Python CanonicalHashAuthority (no envelope).
 * This is acceptable because there is NO cross-language data flow between the jurisdictions.
 */

import { createHash } from 'crypto';

/**
 * Constitutional Hash Authority
 */
export class HashAuthority {
  private static readonly ALGORITHM = 'sha256';
  private static readonly CANONICAL_VERSION = '1.0.0';
  private static readonly SERIALIZATION_VERSION = '1.0.0';

  /**
   * Hash string using SHA-256
   * 
   * @param input - Input string to hash
   * @returns Hex-encoded hash
   */
  static hash(input: string): string {
    return createHash(this.ALGORITHM).update(input, 'utf8').digest('hex');
  }

  /**
   * Hash canonical object
   * 
   * @param obj - Object to hash
   * @returns Hex-encoded hash
   */
  static hashCanonical(obj: any): string {
    const canonical = this.canonicalizeObject(obj);
    const serialized = JSON.stringify(canonical);
    
    // Embed version information in hash envelope for future migration support
    const envelope = {
      canonical_version: this.CANONICAL_VERSION,
      serialization_version: this.SERIALIZATION_VERSION,
      algorithm: this.ALGORITHM,
      payload: serialized,
    };
    
    return this.hash(JSON.stringify(envelope));
  }

  /**
   * Canonicalize object to true canonical object tree
   * 
   * This is the SINGLE canonical serializer authority.
   * All canonical serialization must use this method.
   * 
   * This recursively constructs a canonical object structure,
   * NOT a recursively stringified hybrid JSON/string tree.
   * 
   * Preserves nested structure. Only sorts object keys, not arrays.
   * Arrays maintain semantic ordering.
   * 
   * @param obj - Object to canonicalize
   * @returns Canonical object (not a string)
   */
  static canonicalizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj === 'string') {
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Arrays maintain semantic ordering - do not sort
      return obj.map(item => this.canonicalizeObject(item));
    }

    if (typeof obj === 'object') {
      const sortedKeys = Object.keys(obj).sort();
      const canonicalObj: any = {};
      for (const key of sortedKeys) {
        canonicalObj[key] = this.canonicalizeObject(obj[key]);
      }
      return canonicalObj;
    }

    return obj;
  }

  /**
   * Get hash algorithm
   * 
   * @returns Hash algorithm name
   */
  static getAlgorithm(): string {
    return this.ALGORITHM;
  }

  /**
   * Get canonical version
   * 
   * @returns Canonical version string
   */
  static getCanonicalVersion(): string {
    return this.CANONICAL_VERSION;
  }

  /**
   * Get serialization version
   * 
   * @returns Serialization version string
   */
  static getSerializationVersion(): string {
    return this.SERIALIZATION_VERSION;
  }

  /**
   * Validate hash format
   * 
   * @param hash - Hash to validate
   * @returns True if valid SHA-256 hex format
   */
  static isValidHash(hash: string): boolean {
    return /^[a-f0-9]{64}$/.test(hash);
  }
}
