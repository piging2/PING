/**
 * Point 9 (tenant isolation), object kernel: object and relationship
 * identity across adversarial tenants.
 *
 * The isolation claim: two tenants holding records for the SAME business
 * (same name, same phone, similar address) must never have those records
 * merge, resolve, or cross-reference. Object ids are deterministic and
 * content-addressed, so the tenant MUST be part of the id derivation
 * input (namespace or key). These tests prove:
 *
 * - tenant-scoped derivation: identical business fields in tenant A and
 *   tenant B mint disjoint id sets (no shared object id resolves across
 *   tenants).
 * - the attack, documented honestly: WITHOUT tenant scoping, identical
 *   fields mint the IDENTICAL id. The test asserts the collision to pin
 *   the precondition: tenant isolation holds if and only if callers
 *   tenant-scope id derivation. An unscoped derivation is the cross-entity
 *   resolution bug, demonstrated, not hidden.
 * - relationship ids are tenant-scoped the same way.
 * - a tenant-scoped lookup never resolves the other tenant's id.
 */

import {
  deriveObjectId,
  isWebsiteObjectId,
  websiteObjectId,
  websiteRelationshipId,
} from "../src/identity";

// Adversarial fixtures: the same business on paper, two tenants.
const SAME_NAME = "Corner Bakery";
const SAME_PHONE = "+13035550101";
const ADDRESS_A = "100 Main St, Grand Junction, CO";
const ADDRESS_B = "102 Main St, Grand Junction, CO"; // deliberately similar

/** The distinguishing key a caller builds from source-stable fields. */
function businessKey(address: string): string {
  // deriveObjectId forbids whitespace in its parts (pinned contract), so
  // the caller slugifies; the distinguishing content (name/phone/address)
  // is preserved, only the encoding changes.
  return [SAME_NAME, SAME_PHONE, address].join("|").replace(/\s+/g, "_");
}

describe("tenant-scoped derivation isolates identical businesses", () => {
  test("same name/phone/similar address mint different ids per tenant", () => {
    const idA = deriveObjectId("tenant-a", businessKey(ADDRESS_A));
    const idB = deriveObjectId("tenant-b", businessKey(ADDRESS_B));
    expect(idA).not.toBe(idB);
    expect(idA).toMatch(/^obj:[0-9a-f]{16}$/);
    expect(idB).toMatch(/^obj:[0-9a-f]{16}$/);
  });

  test("tenant in the namespace alone is enough to separate identical keys", () => {
    const idA = deriveObjectId("tenant-a:website", "corner-bakery");
    const idB = deriveObjectId("tenant-b:website", "corner-bakery");
    expect(idA).not.toBe(idB);
  });

  test("derivation stays deterministic within one tenant", () => {
    expect(deriveObjectId("tenant-a", businessKey(ADDRESS_A))).toBe(
      deriveObjectId("tenant-a", businessKey(ADDRESS_A)),
    );
  });
});

describe("the unscoped-derivation attack (precondition, pinned)", () => {
  test("WITHOUT tenant scoping, identical fields collapse to one id", () => {
    // This is the cross-entity resolution bug, demonstrated deliberately:
    // a caller that derives ids from business fields alone merges two
    // tenants' records for the same business. The equality below is the
    // proof that tenant scoping is load-bearing, not decorative.
    const idA = deriveObjectId("website", businessKey(ADDRESS_A));
    const idB = deriveObjectId("website", businessKey(ADDRESS_A));
    expect(idA).toBe(idB);
  });

  test("website ids need a tenant-scoped key: same key collides", () => {
    const idA = websiteObjectId("business", "corner-bakery");
    const idB = websiteObjectId("business", "corner-bakery");
    expect(idA).toBe(idB);
    expect(isWebsiteObjectId(idA)).toBe(true);
  });

  test("website ids with tenant-scoped keys stay apart", () => {
    // The web: scheme forbids colons in its parts (unparseable ids), so
    // callers encode the tenant into the key without a colon. The
    // isolation mechanism is the same: the tenant is inside the key.
    const idA = websiteObjectId("business", "tenant-a-corner-bakery");
    const idB = websiteObjectId("business", "tenant-b-corner-bakery");
    expect(idA).not.toBe(idB);
    expect(idA).toBe("web:business:tenant-a-corner-bakery");
  });
});

describe("no shared object id resolves across tenants", () => {
  // Simulate per-tenant object stores keyed by id.
  function tenantStore(tenant: string): Map<string, string> {
    const store = new Map<string, string>();
    const biz = deriveObjectId(tenant, businessKey(tenant === "tenant-a" ? ADDRESS_A : ADDRESS_B));
    const svc = deriveObjectId(tenant, "service:sourdough|" + tenant);
    store.set(biz, SAME_NAME + " (" + tenant + ")");
    store.set(svc, "service of " + tenant);
    return store;
  }

  test("the two tenants' id sets are disjoint", () => {
    const a = tenantStore("tenant-a");
    const b = tenantStore("tenant-b");
    const idsA = new Set(a.keys());
    for (const id of b.keys()) {
      expect(idsA.has(id)).toBe(false);
    }
  });

  test("a tenant-scoped lookup returns undefined for the other tenant's id", () => {
    const a = tenantStore("tenant-a");
    const b = tenantStore("tenant-b");
    const bBizId = [...b.keys()][0];
    // Resolving B's id against A's store finds nothing: fail closed, no
    // cross-tenant record, no null masquerading as an answer.
    expect(a.get(bBizId)).toBeUndefined();
  });

  test("each tenant resolves its own ids", () => {
    const a = tenantStore("tenant-a");
    const aBizId = [...a.keys()][0];
    expect(a.get(aBizId)).toBe(SAME_NAME + " (tenant-a)");
  });
});

describe("relationship identity is tenant-scoped the same way", () => {
  test("same predicate+key mint different relationship ids per tenant", () => {
    const relA = websiteRelationshipId("offers", "tenant-a-corner-bakery-svc-1");
    const relB = websiteRelationshipId("offers", "tenant-b-corner-bakery-svc-1");
    expect(relA).not.toBe(relB);
  });

  test("unscoped relationship keys collide (same precondition)", () => {
    const relA = websiteRelationshipId("offers", "corner-bakery-svc-1");
    const relB = websiteRelationshipId("offers", "corner-bakery-svc-1");
    expect(relA).toBe(relB);
  });

  test("content-addressed relationship ids separate by tenant namespace", () => {
    const relA = deriveObjectId("tenant-a:rel", "offers|svc-1");
    const relB = deriveObjectId("tenant-b:rel", "offers|svc-1");
    expect(relA).not.toBe(relB);
  });
});
