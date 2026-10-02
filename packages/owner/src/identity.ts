/**
 * The owner identity seam: where real authentication binds identity to
 * owner capabilities.
 *
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/owner-mode/owner-identity.ts (OwnerIdentity,
 *         OwnerIdentityProvider, DemoIdentityProvider,
 *         bindIdentityProvider, identityProvider, resolveOwnerIdentity,
 *         hasVerifiedOwner)
 * TARGET OWNER: packages/owner (piging2 owner corrections)
 * MODE: ADAPT. The seam is preserved exactly; two additions the proof
 * requires:
 *   1. The demo context is typed DEMO_OWNER_CONTEXT with `verified` as
 *      the LITERAL type `false`. No demo value can inhabit a
 *      `verified: true` position: it is a compile-time error
 *      (not assignable to VerifiedOwnerIdentity) and a runtime refusal
 *      (requireVerifiedOwner throws). Structural, not a comment.
 *   2. A fail-closed requireVerifiedOwner guard (+ OwnerAuthorizationError
 *      + isDemoContext) for callers that need a verified owner.
 * Nothing in the demo chain derives authority from the identity:
 * authentication alone never authorizes a mutation. A production provider
 * returns verified: true only after a real verification step the demo
 * does not perform; the interface prescribes the honesty, not the
 * mechanism.
 * DEPENDENCIES: none
 * PROOFS: [6]
 *
 * Pure except for the module-level binding, which is the seam itself.
 * Browser-safe.
 */

/** Who is asking, and whether anyone actually checked. */
export interface OwnerIdentity {
  /** Stable id for the identity within its provider's namespace. */
  identityId: string;
  /**
   * True ONLY when the provider performed a real verification step.
   * The demo provider always returns false.
   */
  verified: boolean;
  /** How the identity was established, e.g. "demo-seeded", "sso". */
  method: string;
  /** Human-readable note about what verification did or did not happen. */
  note: string;
}

/**
 * The explicitly-unverified demo owner context.
 *
 * `verified` is the literal type `false`: a DEMO_OWNER_CONTEXT value is
 * STRUCTURALLY incapable of passing a `verified: true` check. Assigning
 * one where a VerifiedOwnerIdentity is required is a compile-time error;
 * requireVerifiedOwner() rejects one at runtime. This is what keeps the
 * demo context from ever becoming production authorization by accident.
 */
export interface DEMO_OWNER_CONTEXT extends OwnerIdentity {
  /** Discriminator: this is the demo context, never a verified identity. */
  readonly contextKind: "DEMO_OWNER_CONTEXT";
  readonly verified: false;
}

/**
 * The production binding point. Implement this interface with the real
 * auth mechanism and register it via bindIdentityProvider(). The demo
 * never implements this beyond the explicitly-unverified demo below.
 */
export interface OwnerIdentityProvider {
  /** Provider name for audit trails, e.g. "demo-seeded", "ping-sso". */
  readonly name: string;
  /**
   * Resolve the current caller's owner identity, or null when there is
   * no caller identity to resolve (anonymous). Implementations must not
   * throw for the anonymous case; they return null.
   */
  resolveIdentity(): Promise<OwnerIdentity | null>;
}

/**
 * DEMO ONLY. Resolves to the seeded demo actor as a DEMO_OWNER_CONTEXT
 * (verified: false, literal). The note says exactly what did not happen.
 * Nothing here may be consulted for a real authorization decision.
 */
export class DemoIdentityProvider implements OwnerIdentityProvider {
  readonly name = "demo-seeded (unverified)";

  async resolveIdentity(): Promise<DEMO_OWNER_CONTEXT> {
    return {
      contextKind: "DEMO_OWNER_CONTEXT",
      identityId: "demo-owner",
      verified: false,
      method: "demo-seeded",
      note:
        "DEMO ONLY: no identity was verified. The seeded demo actor is a " +
        "label, not a person. Production must bind a real provider via " +
        "bindIdentityProvider() before any owner capability is trusted.",
    };
  }
}

/**
 * An identity a real verification step produced. Only this shape
 * authorizes owner capabilities.
 */
export interface VerifiedOwnerIdentity extends OwnerIdentity {
  readonly verified: true;
}

/**
 * Thrown when an owner capability is requested without a verified owner
 * identity. Fail-closed: the demo context always throws here.
 */
export class OwnerAuthorizationError extends Error {
  readonly code = "OWNER_NOT_VERIFIED" as const;
  constructor(detail?: string) {
    super(
      "Owner authorization refused: no verified owner identity." +
        (detail ? " " + detail : "") +
        " The demo context (DEMO_OWNER_CONTEXT) never satisfies this check.",
    );
    this.name = "OwnerAuthorizationError";
  }
}

/**
 * Fail-closed guard: returns the verified identity, or throws
 * OwnerAuthorizationError. A DEMO_OWNER_CONTEXT argument is rejected at
 * runtime here, and is a compile-time error at any call site typed for
 * VerifiedOwnerIdentity (its `verified` is the literal `false`).
 */
export function requireVerifiedOwner(
  identity: OwnerIdentity | null,
): VerifiedOwnerIdentity {
  if (identity === null || identity.verified !== true) {
    throw new OwnerAuthorizationError(
      identity === null
        ? "No identity resolved."
        : "Identity '" + identity.identityId + "' is not verified.",
    );
  }
  // Sound: verified === true was just established above.
  return identity as VerifiedOwnerIdentity;
}

/** True when the identity is the explicit demo context. */
export function isDemoContext(
  identity: OwnerIdentity | null,
): identity is DEMO_OWNER_CONTEXT {
  return (
    identity !== null &&
    (identity as Partial<DEMO_OWNER_CONTEXT>).contextKind ===
      "DEMO_OWNER_CONTEXT"
  );
}

let bound: OwnerIdentityProvider = new DemoIdentityProvider();

/**
 * THE SEAM: production calls this once at startup with its real
 * OwnerIdentityProvider. Until then (and in every demo), the demo
 * provider stays bound and every identity resolves unverified.
 */
export function bindIdentityProvider(provider: OwnerIdentityProvider): void {
  bound = provider;
}

/** The currently bound provider. The demo default is unverified by design. */
export function identityProvider(): OwnerIdentityProvider {
  return bound;
}

/** Resolve the caller's owner identity through the bound provider. */
export function resolveOwnerIdentity(): Promise<OwnerIdentity | null> {
  return bound.resolveIdentity();
}

/**
 * Fail-closed helper for callers: true only when a verified owner identity
 * resolved. The demo provider can never return true.
 */
export async function hasVerifiedOwner(): Promise<boolean> {
  const identity = await resolveOwnerIdentity();
  return identity !== null && identity.verified === true;
}
