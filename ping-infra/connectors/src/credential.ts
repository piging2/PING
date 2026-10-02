/**
 * Credential boundary.
 *
 * Invariant: an adapter can NEVER observe a raw secret value through the
 * framework. Adapters receive CredentialRef handles (opaque, non-resolving).
 * Only the framework executor's privileged path may resolve a ref, and it
 * does so into a transport the adapter cannot read back (e.g. a child
 * process environment), never into the adapter's own JS heap.
 *
 * The vault also owns leak detection: before any adapter output or receipt
 * detail is recorded, it is scanned for registered secret values. A hit is
 * a fail-closed CredentialLeakError; the receipt records BLOCKED_LEAK and
 * the offending bytes are never persisted.
 */

import { CredentialRef, CredentialVault } from "./types";

export class CredentialLeakError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialLeakError";
  }
}

const REDACTED = "[credential:redacted]";

/**
 * Create an opaque credential handle. The handle is a frozen object with no
 * accessor to the secret; JSON.stringify yields a redacted placeholder.
 */
export function makeCredentialRef(name: string, refId: string): CredentialRef {
  const ref = {
    kind: "credential-ref" as const,
    name,
    refId,
    toJSON() {
      return { kind: "credential-ref", name, refId, value: REDACTED };
    },
  };
  return Object.freeze(ref);
}

/**
 * In-memory vault for tests and local drivers. Production vaults implement
 * the same interface backed by the Secure Vault flow; raw secrets are never
 * committed to code (system rule).
 *
 * resolve() is executor-only: it throws unless the caller presents the
 * executor's one-time capability token. Adapters never receive that token.
 */
export class InMemoryCredentialVault implements CredentialVault {
  private secrets = new Map<string, string>();
  private resolveTokens = new Set<string>();
  private seq = 0;

  /** Executor-only: mint a single-use resolve token. */
  mintResolveToken(): string {
    const t = `resolve-${Date.now()}-${this.seq++}`;
    this.resolveTokens.add(t);
    return t;
  }

  /** Load a secret (test/driver setup only; never from adapter code). */
  load(name: string, value: string): void {
    if (this.secrets.has(name)) {
      throw new Error(`credential already loaded: ${name}`);
    }
    this.secrets.set(name, value);
  }

  ref(name: string): CredentialRef {
    if (!this.secrets.has(name)) {
      throw new Error(`unknown credential: ${name}`);
    }
    return makeCredentialRef(name, `ref-${name}-${this.seq++}`);
  }

  /**
   * Resolve a ref. The executor passes its privileged token; any other
   * caller (including adapter code that somehow obtained the vault) gets
   * nothing. Single-use tokens: a token is consumed on first resolve.
   */
  resolve(ref: CredentialRef, purpose: string, executorToken?: string): string {
    void purpose;
    if (!executorToken || !this.resolveTokens.delete(executorToken)) {
      throw new CredentialLeakError(
        `credential resolve denied for ref ${ref.refId}: caller is not the executor`,
      );
    }
    const v = this.secrets.get(ref.name);
    if (v === undefined) throw new Error(`unknown credential: ${ref.name}`);
    return v;
  }

  registeredSecrets(): string[] {
    return [...this.secrets.values()];
  }

  /** Scan a value for any registered secret; throw on a hit. */
  assertNoLeak(value: unknown, where: string): void {
    const haystack = JSON.stringify(value);
    if (haystack === undefined) return;
    for (const secret of this.secrets.values()) {
      if (secret.length >= 8 && haystack.includes(secret)) {
        throw new CredentialLeakError(
          `credential leak detected in ${where}: secret value present in output`,
        );
      }
    }
  }
}

/** Redact secret values from a value for safe logging. */
export function redactSecrets(value: unknown, secrets: string[]): unknown {
  let s = JSON.stringify(value);
  if (s === undefined) return value;
  for (const secret of secrets) {
    if (secret.length >= 8) s = s.split(secret).join(REDACTED);
  }
  return JSON.parse(s);
}
