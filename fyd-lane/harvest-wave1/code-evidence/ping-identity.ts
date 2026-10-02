/**
 * PING Identity and Signing
 * PATCH 5: Two Actually Independent Identities
 * PATCH 7B: canonical signing bytes, key-bound identity IDs
 *
 * Creates independent identities with signing keys for Alice and Bob.
 * Uses real Ed25519 via Node.js crypto module (no external dependency).
 *
 * Signing contract (7B): signatures are computed over the CANONICAL BYTE
 * form of the signed value, produced by HashAuthority.canonicalizeObject
 * (recursive key sort, arrays keep order) and UTF-8 encoded. Never sign
 * arbitrary JSON.stringify output whose key order is accidental.
 *
 * Identity binding (7B): the identity ID binds the display name AND the
 * Ed25519 public key. The identity IS the controller of that key, so two
 * identities with the same display name are still distinct identities.
 */

import { IdentityAuthority } from './identity-authority';
import { HashAuthority } from './hash-authority';
import * as crypto from 'crypto';

/**
 * PING Identity with signing key
 */
export interface PingIdentity {
  identity_id: string;  // Deterministic: identity_<type_hash16>, bound to display_name + public_key
  display_name: string;
  public_key: string;  // Ed25519 public key (hex)
  private_key: string;  // Ed25519 private key (hex) - DEV ONLY, NEVER PERSIST
  created_at: string;
}

/**
 * Real Ed25519 key pair generator using Node.js crypto module
 * Production: uses built-in crypto.generateKeyPairSync with ed25519
 */
export class PingIdentityGenerator {
  /**
   * Generate real Ed25519 key pair using Node.js crypto module
   */
  static generateKeyPair(): { public_key: string; private_key: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    return {
      public_key: publicKey.export({ type: 'spki', format: 'der' }).toString('hex'),
      private_key: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex')
    };
  }

  /**
   * The canonical byte form of a value: the exact bytes that get signed.
   * Recursive key sort via HashAuthority.canonicalizeObject, then JSON,
   * then UTF-8. This is the PING canonical signing serialization.
   */
  static canonicalBytes(value: any): string {
    return JSON.stringify(HashAuthority.canonicalizeObject(value));
  }

  /**
   * Sign data with private key using real Ed25519
   */
  static sign(data: string, privateKeyHex: string): string {
    const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: 'der',
      type: 'pkcs8'
    });

    const dataBuffer = Buffer.from(data, 'utf8');
    const signature = crypto.sign(null, dataBuffer, privateKey);

    return signature.toString('hex');
  }

  /**
   * Sign the canonical byte form of a value with private key using real Ed25519.
   * This is the 7B signing contract: canonical bytes in, signature out.
   */
  static signCanonical(value: any, privateKeyHex: string): string {
    return this.sign(this.canonicalBytes(value), privateKeyHex);
  }

  /**
   * Verify signature with public key using real Ed25519
   */
  static verify(data: string, signatureHex: string, publicKeyHex: string): boolean {
    try {
      const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
      const publicKey = crypto.createPublicKey({
        key: publicKeyBuffer,
        format: 'der',
        type: 'spki'
      });

      const dataBuffer = Buffer.from(data, 'utf8');
      const signatureBuffer = Buffer.from(signatureHex, 'hex');

      return crypto.verify(null, dataBuffer, publicKey, signatureBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify a canonical-byte signature with public key using real Ed25519.
   */
  static verifyCanonical(value: any, signatureHex: string, publicKeyHex: string): boolean {
    return this.verify(this.canonicalBytes(value), signatureHex, publicKeyHex);
  }
}

/**
 * PING Identity Manager
 */
export class PingIdentityManager {
  /**
   * Create a new PING identity.
   * The identity ID binds display_name AND the fresh public key, so the
   * identity is the controller of that key. Same display name, new keypair:
   * still a distinct identity.
   */
  static createIdentity(displayName: string): PingIdentity {
    const keyPair = PingIdentityGenerator.generateKeyPair();
    const identityId = IdentityAuthority.generateId('identity', {
      display_name: displayName,
      public_key: keyPair.public_key,
    });
    const createdAt = new Date().toISOString();

    return {
      identity_id: identityId,
      display_name: displayName,
      public_key: keyPair.public_key,
      private_key: keyPair.private_key,
      created_at: createdAt
    };
  }

  /**
   * Sign data as identity
   */
  static sign(identity: PingIdentity, data: string): string {
    return PingIdentityGenerator.sign(data, identity.private_key);
  }

  /**
   * Sign the canonical byte form of a value as identity (7B contract).
   */
  static signCanonical(identity: PingIdentity, value: any): string {
    return PingIdentityGenerator.signCanonical(value, identity.private_key);
  }

  /**
   * Verify signature from identity
   */
  static verify(identity: PingIdentity, data: string, signature: string): boolean {
    return PingIdentityGenerator.verify(data, signature, identity.public_key);
  }

  /**
   * Verify a canonical-byte signature from identity (7B contract).
   */
  static verifyCanonical(identity: PingIdentity, value: any, signature: string): boolean {
    return PingIdentityGenerator.verifyCanonical(value, signature, identity.public_key);
  }

  /**
   * Verify signature with public key directly (independent verification)
   */
  static verifyWithPublicKey(data: string, signature: string, publicKey: string): boolean {
    return PingIdentityGenerator.verify(data, signature, publicKey);
  }

  /**
   * Verify a canonical-byte signature with a bare public key (independent verification).
   */
  static verifyCanonicalWithPublicKey(value: any, signature: string, publicKey: string): boolean {
    return PingIdentityGenerator.verifyCanonical(value, signature, publicKey);
  }

  /**
   * Create proof structure for transition
   */
  static createProof(identity: PingIdentity, data: string): {
    verification_method: string;
    signature: string;
    public_key: string;
  } {
    const signature = this.sign(identity, data);
    return {
      verification_method: 'ed25519',
      signature,
      public_key: identity.public_key
    };
  }

  /**
   * Create proof structure over the canonical byte form of a value (7B contract).
   * The signature covers the body; the proof itself is never part of the signed bytes.
   */
  static createCanonicalProof(identity: PingIdentity, value: any): {
    verification_method: string;
    signature: string;
    public_key: string;
  } {
    const signature = this.signCanonical(identity, value);
    return {
      verification_method: 'ed25519',
      signature,
      public_key: identity.public_key
    };
  }
}
