/**
 * Proof 6 test (f): the demo owner context.
 *
 * The demo provider resolves verified:false; the DEMO_OWNER_CONTEXT type
 * makes that STRUCTURAL (literal false, not assignable to verified:true);
 * and the requireVerifiedOwner guard rejects it at runtime for anything
 * requiring a verified owner.
 */
import {
  bindIdentityProvider,
  DemoIdentityProvider,
  hasVerifiedOwner,
  identityProvider,
  isDemoContext,
  OwnerAuthorizationError,
  requireVerifiedOwner,
  resolveOwnerIdentity,
  type DEMO_OWNER_CONTEXT,
  type OwnerIdentity,
  type OwnerIdentityProvider,
  type VerifiedOwnerIdentity,
} from "../src/identity";

test("(f) the demo provider resolves an explicitly unverified context", async () => {
  const ctx = await new DemoIdentityProvider().resolveIdentity();
  expect(ctx.verified).toBe(false);
  const demoCtx: DEMO_OWNER_CONTEXT = ctx;
  expect(demoCtx.contextKind).toBe("DEMO_OWNER_CONTEXT");
  expect(demoCtx.identityId).toBe("demo-owner");
  expect(isDemoContext(ctx)).toBe(true);
  expect(isDemoContext(null)).toBe(false);
});

test("(f) DEMO_OWNER_CONTEXT is structurally incapable of passing a verified:true check", async () => {
  const ctx = await new DemoIdentityProvider().resolveIdentity();
  // @ts-expect-error - structural incapability: DEMO_OWNER_CONTEXT's
  // `verified` is the literal `false`; it can never inhabit a
  // VerifiedOwnerIdentity position. If this line ever compiles, the
  // guarantee is broken and ts-jest fails the suite on the unused
  // directive.
  const impossible: VerifiedOwnerIdentity = ctx;
  // Runtime: the value is still the demo one; only the TYPE rejects it.
  expect(impossible.verified).toBe(false);
  // Runtime guard: the same value is refused for verified-only callers.
  expect(() => requireVerifiedOwner(ctx)).toThrow(OwnerAuthorizationError);
  expect(() => requireVerifiedOwner(null)).toThrow(OwnerAuthorizationError);
  await expect(
    resolveOwnerIdentity().then((id) => requireVerifiedOwner(id)),
  ).rejects.toThrow(OwnerAuthorizationError);
  await expect(hasVerifiedOwner()).resolves.toBe(false);
});

test("the seam swaps: a verified provider passes the guard; demo default is restored after", async () => {
  const verifiedProvider: OwnerIdentityProvider = {
    name: "test-verified",
    async resolveIdentity(): Promise<OwnerIdentity> {
      return {
        identityId: "owner-1",
        verified: true,
        method: "test-double",
        note: "Test seam double: the designed extension point, not auth.",
      };
    },
  };
  bindIdentityProvider(verifiedProvider);
  try {
    expect(identityProvider().name).toBe("test-verified");
    await expect(hasVerifiedOwner()).resolves.toBe(true);
    const id = await resolveOwnerIdentity();
    const owned = requireVerifiedOwner(id);
    expect(owned.identityId).toBe("owner-1");
    expect(isDemoContext(id)).toBe(false);
  } finally {
    bindIdentityProvider(new DemoIdentityProvider());
  }
  await expect(hasVerifiedOwner()).resolves.toBe(false);
});
