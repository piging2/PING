/**
 * Point 9 (tenant isolation), trust kernel: the tenant-context contract.
 *
 * The FYD composition runtime stores are file-backed, so the tenant
 * boundary is enforced by this contract, not by a database. These tests
 * prove the hard rules from src/tenant-context.ts:
 *
 * - no tenant context (or a malformed one) fails CLOSED: every entry
 *   point throws TenantContextError, never returns null/[]/undefined.
 * - a cross-tenant reference is REFUSED with a typed error (REJECTED),
 *   never answered with an empty result or a silent fallback.
 * - tenant-scoped store paths are disjoint per tenant and cannot be
 *   escaped with a crafted tenant id.
 *
 * Tenants here are neutral ("tenant-a"/"tenant-b"); the adversarial
 * same-name fixtures live in the ask/sitespec tenant-isolation tests.
 */

import {
  TenantContextError,
  assertTenantKey,
  requireTenantContext,
  tenantScopedDir,
  withTenantContext,
  type TenantContext,
} from "../src/tenant-context";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function ctx(tenantId: string): TenantContext {
  return { tenantId };
}

describe("requireTenantContext fails closed", () => {
  test("returns the tenant id for a valid context", () => {
    expect(requireTenantContext(ctx(TENANT_A))).toBe(TENANT_A);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["non-object", "tenant-a"],
    ["empty object", {}],
    ["empty tenant id", { tenantId: "" }],
    ["uppercase", { tenantId: "Tenant-A" }],
    ["spaces", { tenantId: "tenant a" }],
    ["path traversal", { tenantId: "../etc" }],
    ["slash", { tenantId: "a/b" }],
    ["too long", { tenantId: "x".repeat(65) }],
  ])("throws TENANT_CONTEXT_MISSING for %s", (_label, bad) => {
    let err: unknown = null;
    try {
      requireTenantContext(bad as TenantContext);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TenantContextError);
    expect((err as TenantContextError).code).toBe("TENANT_CONTEXT_MISSING");
    // Fail closed means throw, never a null/empty stand-in.
    expect(err).not.toBeNull();
  });
});

describe("assertTenantKey refuses cross-tenant references", () => {
  test("allows a key that belongs to the acting tenant", () => {
    expect(assertTenantKey(ctx(TENANT_A), TENANT_A)).toBe(TENANT_A);
  });

  test("refuses tenant B's key when acting as tenant A", () => {
    let err: TenantContextError | null = null;
    try {
      assertTenantKey(ctx(TENANT_A), TENANT_B);
    } catch (e) {
      err = e as TenantContextError;
    }
    expect(err).toBeInstanceOf(TenantContextError);
    expect(err && err.code).toBe("CROSS_TENANT_REFERENCE");
    expect(err && err.tenantId).toBe(TENANT_A);
    expect(err && err.attemptedKey).toBe(TENANT_B);
  });

  test("refusal is symmetric: B cannot reference A's key either", () => {
    expect(() => assertTenantKey(ctx(TENANT_B), TENANT_A)).toThrowError(
      TenantContextError,
    );
    try {
      assertTenantKey(ctx(TENANT_B), TENANT_A);
    } catch (e) {
      expect((e as TenantContextError).code).toBe("CROSS_TENANT_REFERENCE");
    }
  });

  test("refuses an empty key (never a silent fallback)", () => {
    expect(() => assertTenantKey(ctx(TENANT_A), "")).toThrowError(
      TenantContextError,
    );
  });

  test("refuses when there is no context at all", () => {
    expect(() => assertTenantKey(null, TENANT_A)).toThrowError(
      TenantContextError,
    );
  });

  test("the refusal message names the boundary, never the other tenant's data", () => {
    try {
      assertTenantKey(ctx(TENANT_A), TENANT_B);
      throw new Error("should have thrown");
    } catch (e) {
      const err = e as TenantContextError;
      expect(err).toBeInstanceOf(TenantContextError);
      // The message must not leak anything beyond the acting tenant id.
      expect(err.message).toContain(TENANT_A);
      expect(err.message).not.toContain("secret");
    }
  });
});

describe("tenantScopedDir isolates store paths", () => {
  const base = "/data/fyd-store";

  test("resolves <base>/<tenantId>", () => {
    expect(tenantScopedDir(base, TENANT_A)).toBe(base + "/" + TENANT_A);
  });

  test("two tenants resolve to disjoint directories", () => {
    const a = tenantScopedDir(base, TENANT_A);
    const b = tenantScopedDir(base, TENANT_B);
    expect(a).not.toBe(b);
    // Neither is a prefix-path of the other: no shared store file.
    expect(b.startsWith(a + "/")).toBe(false);
    expect(a.startsWith(b + "/")).toBe(false);
  });

  test("refuses invalid tenant ids (kills path traversal at the boundary)", () => {
    for (const bad of ["..", "../x", "a/b", "/abs", "", "UPPER"]) {
      expect(() => tenantScopedDir(base, bad)).toThrowError(TenantContextError);
    }
  });
});

describe("withTenantContext binds one execution scope", () => {
  test("runs fn with the verified tenant id", () => {
    const seen: string[] = [];
    const out = withTenantContext(ctx(TENANT_A), (id) => {
      seen.push(id);
      return "ran-" + id;
    });
    expect(out).toBe("ran-" + TENANT_A);
    expect(seen).toEqual([TENANT_A]);
  });

  test("fn NEVER executes when the context is missing (fail closed)", () => {
    let ran = false;
    expect(() =>
      withTenantContext(null, () => {
        ran = true;
        return 1;
      }),
    ).toThrowError(TenantContextError);
    expect(ran).toBe(false);
  });

  test("fn NEVER executes when the context is invalid", () => {
    let ran = false;
    expect(() =>
      withTenantContext({ tenantId: "../escape" }, () => {
        ran = true;
        return 1;
      }),
    ).toThrowError(TenantContextError);
    expect(ran).toBe(false);
  });
});

describe("per-tenant store keys never collide", () => {
  // Simulates the file-backed store layout: one scoped dir per tenant,
  // one file per record kind. The contract above is what keeps a reader
  // for tenant A from ever opening tenant B's file.
  function storeKey(tenantId: string, kind: string): string {
    return tenantScopedDir("/data/fyd", tenantId) + "/" + kind + ".json";
  }

  test("evidence and object store keys are disjoint across tenants", () => {
    const kinds = ["evidence", "objects", "owner-overrides", "private"];
    const keysA = new Set(kinds.map((k) => storeKey(TENANT_A, k)));
    const keysB = new Set(kinds.map((k) => storeKey(TENANT_B, k)));
    for (const k of keysA) {
      expect(keysB.has(k)).toBe(false);
    }
    expect(keysA.size).toBe(4);
  });

  test("a reader scoped to A is refused B's store key", () => {
    const bKey = TENANT_B; // store keys are tenant-rooted; the key IS the tenant
    expect(() => assertTenantKey(ctx(TENANT_A), bKey)).toThrowError(
      TenantContextError,
    );
    expect(assertTenantKey(ctx(TENANT_A), TENANT_A)).toBe(TENANT_A);
  });
});
