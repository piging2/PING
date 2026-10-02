/**
 * Point 9 (tenant isolation), Ask FYD: a question scoped to tenant A
 * never cites tenant B's evidence.
 *
 * Adversarial fixtures: BOTH tenants are "Corner Bakery" with the SAME
 * phone number and similar addresses. The only honest separators are the
 * tenant-scoped object ids and the per-tenant graphs. These tests prove:
 *
 * - askFyd over tenant A's graph answers with A's services only: A's
 *   service names appear, B's never do, and every cited evidence ref id
 *   belongs to A's id set.
 * - the symmetric statement for tenant B.
 * - a cross-tenant target object id (B's business id asked against A's
 *   graph) fails closed to refusal: no cross-tenant id resolution.
 * - private-state isolation: A's private object never appears in A's
 *   visitor answer, and targeting it fails closed.
 * - the two tenants' citation sets are disjoint.
 */

import { askFyd } from "../src/answer";
import type { AskInput, AskPingObject, AskPingRelationship, ObjectGraph } from "../src/types";
import { deriveObjectId } from "../../objects/src/identity";

const T = "2026-10-02T12:00:00Z";
const QUESTION = "What services does this business offer, and how do you know?";

// The attack surface, on paper: identical names, identical phones,
// near-identical addresses across the two tenants.
const SHARED_NAME = "Corner Bakery";
const SHARED_PHONE = "+13035550101";

function bizId(tenant: string): string {
  return deriveObjectId(tenant, "corner-bakery:business");
}
function svcId(tenant: string, slug: string): string {
  return deriveObjectId(tenant, "corner-bakery:service:" + slug);
}
function relId(tenant: string, slug: string): string {
  return deriveObjectId(tenant, "corner-bakery:rel:" + slug);
}

function serviceObj(
  tenant: string,
  slug: string,
  title: string,
  visibility: AskPingObject["visibility"] = "public",
): AskPingObject {
  return {
    id: svcId(tenant, slug),
    schema: "ping.social.service@1",
    controllerId: tenant,
    visibility,
    title,
    description: title + " at " + SHARED_NAME + ".",
    fields: { name: title, claimKind: "website_statement" },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery-" + tenant.slice(-1) + ".example/",
      derivedAt: T,
    },
  };
}

function offersRel(tenant: string, slug: string, objectId: string): AskPingRelationship {
  return {
    id: relId(tenant, slug),
    subject: bizId(tenant),
    predicate: "offers",
    object: objectId,
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:https://corner-bakery-" + tenant.slice(-1) + ".example/#" + slug,
  };
}

function businessObj(tenant: string, address: string, description: string): AskPingObject {
  return {
    id: bizId(tenant),
    schema: "ping.social.business@1",
    controllerId: tenant,
    visibility: "public",
    title: SHARED_NAME,
    description,
    fields: {
      name: SHARED_NAME,
      phone: SHARED_PHONE,
      address,
      claimKind: "website_statement",
    },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery-" + tenant.slice(-1) + ".example/",
      derivedAt: T,
    },
  };
}

/** Tenant A's graph: 2 public services + 1 PRIVATE service. */
const GRAPH_A: ObjectGraph = {
  objects: [
    businessObj("tenant-a", "100 Main St, Grand Junction, CO", "A neighborhood bakery in Grand Junction."),
    serviceObj("tenant-a", "sourdough", "Sourdough Loaves"),
    serviceObj("tenant-a", "croissant", "Morning Croissants"),
    serviceObj("tenant-a", "vault", "Secret Recipe Vault", "private"),
  ],
  relationships: [
    offersRel("tenant-a", "sourdough", svcId("tenant-a", "sourdough")),
    offersRel("tenant-a", "croissant", svcId("tenant-a", "croissant")),
    offersRel("tenant-a", "vault", svcId("tenant-a", "vault")),
  ],
};

/** Tenant B's graph: same name, same phone, similar address, different services. */
const GRAPH_B: ObjectGraph = {
  objects: [
    businessObj("tenant-b", "102 Main St, Grand Junction, CO", "A family-run bakery two doors down."),
    serviceObj("tenant-b", "bagel", "Plain Bagels"),
    serviceObj("tenant-b", "muffin", "Blueberry Muffins"),
  ],
  relationships: [
    offersRel("tenant-b", "bagel", svcId("tenant-b", "bagel")),
    offersRel("tenant-b", "muffin", svcId("tenant-b", "muffin")),
  ],
};

const A_IDS = new Set([
  bizId("tenant-a"),
  svcId("tenant-a", "sourdough"),
  svcId("tenant-a", "croissant"),
  svcId("tenant-a", "vault"),
  relId("tenant-a", "sourdough"),
  relId("tenant-a", "croissant"),
  relId("tenant-a", "vault"),
]);
const B_IDS = new Set([
  bizId("tenant-b"),
  svcId("tenant-b", "bagel"),
  svcId("tenant-b", "muffin"),
  relId("tenant-b", "bagel"),
  relId("tenant-b", "muffin"),
]);

const visitor = { viewerClass: "visitor" as const, viewerId: null };

function ask(graph: ObjectGraph, targetObjectId: string, question = QUESTION) {
  const input: AskInput = { targetObjectId, graph, viewerContext: visitor, question };
  return askFyd(input);
}

describe("ask scoped to tenant A never cites tenant B", () => {
  const ans = ask(GRAPH_A, bizId("tenant-a"));

  test("answers from A's evidence only", () => {
    expect(ans.refusal).toBe(false);
    expect(ans.answerState).toBe("KNOWN");
    const direct = ans.claims.filter((c) => c.classification === "DIRECT");
    expect(direct.map((c) => c.claim)).toEqual([
      "Corner Bakery offers Sourdough Loaves.",
      "Corner Bakery offers Morning Croissants.",
    ]);
  });

  test("B's service names appear nowhere in A's answer", () => {
    const text = ans.answer + JSON.stringify(ans.claims) + JSON.stringify(ans.evidenceRefs);
    for (const leaked of ["Bagel", "Muffin", "Blueberry"]) {
      expect(text).not.toContain(leaked);
    }
  });

  test("every cited evidence ref id belongs to tenant A", () => {
    expect(ans.evidenceRefs.length).toBeGreaterThan(0);
    for (const ref of ans.evidenceRefs) {
      expect(A_IDS.has(ref.id)).toBe(true);
    }
    // No B id anywhere in the serialized answer, claims, or unknowns.
    const serialized = JSON.stringify(ans);
    for (const bId of B_IDS) {
      expect(serialized).not.toContain(bId);
    }
  });

  test("the answer cites exactly A's two public services (4 refs, 3 claims)", () => {
    expect(ans.evidenceRefs).toHaveLength(4);
    expect(ans.claims).toHaveLength(3);
  });
});

describe("ask scoped to tenant B never cites tenant A", () => {
  const ans = ask(GRAPH_B, bizId("tenant-b"));

  test("answers from B's evidence only", () => {
    expect(ans.refusal).toBe(false);
    const direct = ans.claims.filter((c) => c.classification === "DIRECT");
    expect(direct.map((c) => c.claim)).toEqual([
      "Corner Bakery offers Plain Bagels.",
      "Corner Bakery offers Blueberry Muffins.",
    ]);
  });

  test("A's service names appear nowhere in B's answer", () => {
    const text = ans.answer + JSON.stringify(ans.claims) + JSON.stringify(ans.evidenceRefs);
    for (const leaked of ["Sourdough", "Croissant"]) {
      expect(text).not.toContain(leaked);
    }
  });

  test("every cited evidence ref id belongs to tenant B", () => {
    for (const ref of ans.evidenceRefs) {
      expect(B_IDS.has(ref.id)).toBe(true);
    }
    const serialized = JSON.stringify(ans);
    for (const aId of A_IDS) {
      expect(serialized).not.toContain(aId);
    }
  });
});

describe("cross-tenant object ids do not resolve", () => {
  test("asking A's graph about B's business id fails closed to refusal", () => {
    const ans = ask(GRAPH_A, bizId("tenant-b"));
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.claims).toEqual([]);
    expect(ans.evidenceRefs).toEqual([]);
  });

  test("asking B's graph about A's business id fails closed to refusal", () => {
    const ans = ask(GRAPH_B, bizId("tenant-a"));
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.claims).toEqual([]);
  });

  test("asking A's graph about A's own service id as target still refuses cleanly", () => {
    // A service id is public but is not the asked-about business; the
    // services branch finds no offers FROM the service, so refusal.
    const ans = ask(GRAPH_A, svcId("tenant-a", "sourdough"));
    expect(ans.refusal).toBe(true);
  });
});

describe("private-state isolation inside one tenant", () => {
  test("A's private service never appears in A's visitor answer", () => {
    const ans = ask(GRAPH_A, bizId("tenant-a"));
    const text = ans.answer + JSON.stringify(ans.claims) + JSON.stringify(ans.evidenceRefs);
    expect(text).not.toContain("Secret Recipe Vault");
    expect(text).not.toContain(svcId("tenant-a", "vault"));
    expect(text).not.toContain(relId("tenant-a", "vault"));
  });

  test("targeting A's private object fails closed to refusal", () => {
    const ans = ask(GRAPH_A, svcId("tenant-a", "vault"));
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.claims).toEqual([]);
  });
});

describe("citation sets are disjoint across tenants", () => {
  test("no evidence ref id is cited by both tenants' answers", () => {
    const ansA = ask(GRAPH_A, bizId("tenant-a"));
    const ansB = ask(GRAPH_B, bizId("tenant-b"));
    const citedA = new Set(ansA.evidenceRefs.map((r) => r.id));
    const citedB = new Set(ansB.evidenceRefs.map((r) => r.id));
    for (const id of citedA) {
      expect(citedB.has(id)).toBe(false);
    }
    expect(citedA.size).toBe(4);
    expect(citedB.size).toBe(4);
  });
});
