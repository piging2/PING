/**
 * ADVERSARIAL (Worker E, hunt 5): tenant boundary in this slice.
 *
 * What this slice HAS:
 * - the trust-kernel tenant contract (requireTenantContext /
 *   assertTenantKey / tenantScopedDir): cross-tenant references are
 *   REFUSED with a typed error, never answered empty.
 * - tenant-bound proposal ids: proposalIdOf seals the spec digest, and
 *   the spec carries ownerObjectId (the tenant id in this runtime), so
 *   the same patch drafted against two tenants' specs mints different
 *   proposal ids. A proposal cannot drift across tenants without
 *   changing its identity.
 *
 * What this slice does NOT have (documented gap, not a break): no
 * package here performs storage, so requireTenantContext has no call
 * site in these packages yet. The composition runtime that lands the
 * file-backed stores MUST call requireTenantContext / assertTenantKey
 * at its store boundary; until then the contract is tested here, not
 * enforced in a pipeline.
 */
import { proposalIdOf } from "../../proposals/src/compiler";
import {
  assertTenantKey,
  requireTenantContext,
  TenantContextError,
  tenantScopedDir,
} from "../src/tenant-context";

describe("tenant contract: refusal, never empty", () => {
  test("missing context fails closed", () => {
    expect(() => requireTenantContext(null)).toThrow(TenantContextError);
    expect(() => requireTenantContext(undefined)).toThrow(TenantContextError);
    try {
      requireTenantContext(null);
    } catch (e) {
      expect((e as TenantContextError).code).toBe("TENANT_CONTEXT_MISSING");
    }
  });

  test("invalid tenant ids fail closed (kills path traversal too)", () => {
    for (const bad of ["", "Has Space", "a/b", "../etc", "x".repeat(65)]) {
      expect(() => requireTenantContext({ tenantId: bad })).toThrow(
        TenantContextError,
      );
      expect(() => tenantScopedDir("/base", bad)).toThrow(TenantContextError);
    }
    expect(requireTenantContext({ tenantId: "acme-plumbing" })).toBe(
      "acme-plumbing",
    );
  });

  test("cross-tenant key is REFUSED, not answered empty", () => {
    const ctx = { tenantId: "tenant-a" };
    expect(assertTenantKey(ctx, "tenant-a")).toBe("tenant-a");
    try {
      assertTenantKey(ctx, "tenant-b");
      throw new Error("should have refused");
    } catch (e) {
      expect(e).toBeInstanceOf(TenantContextError);
      expect((e as TenantContextError).code).toBe("CROSS_TENANT_REFERENCE");
      // The refusal names the boundary, never the other tenant's data.
      expect((e as TenantContextError).attemptedKey).toBe("tenant-b");
    }
  });

  test("proposal ids are tenant-bound via the sealed spec digest", () => {
    const seal = (specDigest: string) =>
      proposalIdOf(
        "Hide it.",
        { kind: "hide_section", target: "Contact" },
        [],
        specDigest,
        { title: "t", before: [], after: [] },
      );
    // Two tenants, same command/intent/patch/preview, different specs
    // (ownerObjectId differs) -> different proposal ids.
    expect(seal("specdigest-tenant-a")).not.toBe(seal("specdigest-tenant-b"));
    expect(seal("specdigest-tenant-a")).toBe(seal("specdigest-tenant-a"));
  });
});
