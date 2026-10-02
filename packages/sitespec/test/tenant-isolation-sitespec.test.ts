/**
 * Point 9 (tenant isolation), SiteSpec slice: per-tenant evidence,
 * objects, specs, and owner overrides never cross the tenant boundary.
 *
 * Adversarial fixtures: BOTH tenants are "Corner Bakery" with the SAME
 * phone and similar addresses; only tenant-scoped ids and per-tenant
 * graphs separate them. These tests prove:
 *
 * - evidence isolation: deriveEvidence over A's graph yields records that
 *   reference only A's object ids and A's provenance; the derivation
 *   digests differ per tenant.
 * - object/relationship isolation: the tenants' id sets are disjoint and
 *   a lookup in A's graph never resolves B's ids.
 * - SiteSpec isolation: generateSiteSpec over B's graph never includes
 *   A's content (serialized spec contains none of A's unique strings).
 * - owner override isolation: an owner correction for A's business phone
 *   applies to A's graph and is orphaned (no-op) on B's graph, using an
 *   explicit DEMO_OWNER_CONTEXT (demoProvenance), never fake production
 *   auth. The attack variant pins the precondition: with UNSCOPED
 *   (colliding) object ids, A's correction DOES leak into B's graph.
 * - private-state isolation: A's private objects never enter A's public
 *   projection or spec.
 */

import { deriveEvidence } from "../src/evidence";
import { generateSiteSpec } from "../src/generator";
import { buildVerifiedPublicProjection } from "../src/projection";
import { resolveQuery } from "../src/query";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";
import { deriveObjectId } from "../../objects/src/identity";
import { applyCorrections, assertCorrection } from "../../owner/src/corrections";
import { DEMO_OWNER_LABEL, demoProvenance } from "../../owner/src/provenance";

const T = "2026-10-02T12:00:00Z";
const GEN_AT = "2026-10-02T12:00:00Z";

const SHARED_NAME = "Corner Bakery";
const SHARED_PHONE = "+13035550101";
const OWNER_PHONE = "+13035550999"; // the owner's corrected value for tenant A

function bizId(tenant: string): string {
  return deriveObjectId(tenant, "corner-bakery:business");
}
function svcId(tenant: string, slug: string): string {
  return deriveObjectId(tenant, "corner-bakery:service:" + slug);
}
function relId(tenant: string, slug: string): string {
  return deriveObjectId(tenant, "corner-bakery:rel:" + slug);
}
function siteUrl(tenant: string): string {
  return "https://corner-bakery-" + tenant.slice(-1) + ".example/";
}

function businessObj(tenant: string, address: string, description: string): PingObject {
  return {
    id: bizId(tenant),
    schema: "ping.social.business@1",
    controllerId: tenant,
    visibility: "public",
    title: SHARED_NAME,
    description,
    fields: { name: SHARED_NAME, phone: SHARED_PHONE, address, claimKind: "website_statement" },
    createdAt: T,
    updatedAt: T,
    provenance: { kind: "website-derived", ref: "website-ingestion:" + siteUrl(tenant), derivedAt: T },
  };
}

function serviceObj(tenant: string, slug: string, title: string): PingObject {
  return {
    id: svcId(tenant, slug),
    schema: "ping.social.service@1",
    controllerId: tenant,
    visibility: "public",
    title,
    description: title + " at " + SHARED_NAME + ".",
    fields: { name: title, claimKind: "website_statement" },
    createdAt: T,
    updatedAt: T,
    provenance: { kind: "website-derived", ref: "website-ingestion:" + siteUrl(tenant), derivedAt: T },
  };
}

function privateServiceObj(tenant: string): PingObject {
  return {
    id: svcId(tenant, "vault"),
    schema: "ping.social.service@1",
    controllerId: tenant,
    visibility: "private",
    title: "Secret Recipe Vault",
    description: "Internal recipe development, not for the public site.",
    fields: { name: "Secret Recipe Vault", internal_code: "VAULT-7" },
    createdAt: T,
    updatedAt: T,
    provenance: { kind: "website-derived", ref: "website-ingestion:" + siteUrl(tenant), derivedAt: T },
  };
}

function offersRel(tenant: string, slug: string, objectId: string): PingRelationship {
  return {
    id: relId(tenant, slug),
    subject: bizId(tenant),
    predicate: "offers",
    object: objectId,
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:" + siteUrl(tenant) + "#" + slug,
  };
}

function buildGraph(
  tenant: string,
  services: [string, string][],
  address: string,
  description: string,
  withPrivate: boolean,
): ObjectGraph {
  const objects: PingObject[] = [businessObj(tenant, address, description)];
  const relationships: PingRelationship[] = [];
  for (const [slug, title] of services) {
    objects.push(serviceObj(tenant, slug, title));
    relationships.push(offersRel(tenant, slug, svcId(tenant, slug)));
  }
  if (withPrivate) {
    objects.push(privateServiceObj(tenant));
    relationships.push(offersRel(tenant, "vault", svcId(tenant, "vault")));
  }
  return { objects, relationships };
}

const GRAPH_A = buildGraph(
  "tenant-a",
  [["sourdough", "Sourdough Loaves"], ["croissant", "Morning Croissants"]],
  "100 Main St, Grand Junction, CO",
  "A neighborhood bakery in Grand Junction.",
  true,
);
const GRAPH_B = buildGraph(
  "tenant-b",
  [["bagel", "Plain Bagels"], ["muffin", "Blueberry Muffins"]],
  "102 Main St, Grand Junction, CO",
  "A family-run bakery two doors down.",
  false,
);

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

describe("evidence isolation", () => {
  test("A's derivation references only A's object ids", () => {
    const ev = deriveEvidence(GRAPH_A, "captured-record");
    expect(ev.records.length).toBeGreaterThan(0);
    for (const r of ev.records) {
      expect(A_IDS.has(r.objectId)).toBe(true);
    }
  });

  test("A's derivation carries only A's provenance refs", () => {
    const ev = deriveEvidence(GRAPH_A, "captured-record");
    for (const r of ev.records) {
      expect(r.provenanceRef).toContain(siteUrl("tenant-a"));
      expect(r.provenanceRef).not.toContain(siteUrl("tenant-b"));
    }
  });

  test("B's derivation references only B's object ids", () => {
    const ev = deriveEvidence(GRAPH_B, "captured-record");
    for (const r of ev.records) {
      expect(B_IDS.has(r.objectId)).toBe(true);
    }
  });

  test("the derivation digests differ per tenant", () => {
    const a = deriveEvidence(GRAPH_A, "captured-record");
    const b = deriveEvidence(GRAPH_B, "captured-record");
    expect(a.derivationDigest).not.toBe(b.derivationDigest);
  });
});

describe("object and relationship isolation", () => {
  test("the tenants' id sets are disjoint", () => {
    for (const id of B_IDS) {
      expect(A_IDS.has(id)).toBe(false);
    }
  });

  test("resolving B's ids against A's graph finds nothing", () => {
    const byId = new Map(GRAPH_A.objects.map((o) => [o.id, o] as const));
    expect(byId.get(bizId("tenant-b"))).toBeUndefined();
    expect(byId.get(svcId("tenant-b", "bagel"))).toBeUndefined();
    const rels = new Map(GRAPH_A.relationships.map((r) => [r.id, r] as const));
    expect(rels.get(relId("tenant-b", "bagel"))).toBeUndefined();
  });

  test("each tenant's projection digest is its own", () => {
    const pa = buildVerifiedPublicProjection(GRAPH_A);
    const pb = buildVerifiedPublicProjection(GRAPH_B);
    expect(pa.provenance.graphDigest).not.toBe(pb.provenance.graphDigest);
    expect(pa.provenance.checkpoint).not.toBe(pb.provenance.checkpoint);
  });
});

describe("SiteSpec isolation", () => {
  // The spec is DATA, not rendered content: sections carry queries bound
  // to the tenant's own object ids, plus the owner title. Service names
  // appear only when queries resolve against a projection (next test).
  test("A's spec is owned by A's business and its queries reference only A's ids", () => {
    const spec = generateSiteSpec(GRAPH_A, { generatedAt: GEN_AT });
    expect(spec.ownerObjectId).toBe(bizId("tenant-a"));
    const s = JSON.stringify(spec);
    expect(s).toContain(bizId("tenant-a"));
    for (const bId of B_IDS) {
      expect(s).not.toContain(bId);
    }
    // The business NAME is the same string in both tenants; the tenant
    // separator is the id, never the name.
    expect(s).toContain("Corner Bakery");
  });

  test("B's spec is owned by B's business and its queries reference only B's ids", () => {
    const spec = generateSiteSpec(GRAPH_B, { generatedAt: GEN_AT });
    expect(spec.ownerObjectId).toBe(bizId("tenant-b"));
    const s = JSON.stringify(spec);
    expect(s).toContain(bizId("tenant-b"));
    for (const aId of A_IDS) {
      expect(s).not.toContain(aId);
    }
  });

  test("resolving A's spec queries against A's projection yields A's content only", () => {
    const spec = generateSiteSpec(GRAPH_A, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(GRAPH_A);
    const titles: string[] = [];
    for (const page of spec.pages) {
      for (const section of page.sections) {
        for (const o of resolveQuery(section.query, projection.graph, spec.ownerObjectId)) {
          titles.push(o.title);
        }
      }
    }
    expect(titles).toContain("Sourdough Loaves");
    expect(titles).toContain("Morning Croissants");
    expect(titles).not.toContain("Plain Bagels");
    expect(titles).not.toContain("Blueberry Muffins");
    expect(titles).not.toContain("Secret Recipe Vault");
  });

  test("resolving B's spec queries against B's projection yields B's content only", () => {
    const spec = generateSiteSpec(GRAPH_B, { generatedAt: GEN_AT });
    const projection = buildVerifiedPublicProjection(GRAPH_B);
    const titles: string[] = [];
    for (const page of spec.pages) {
      for (const section of page.sections) {
        for (const o of resolveQuery(section.query, projection.graph, spec.ownerObjectId)) {
          titles.push(o.title);
        }
      }
    }
    expect(titles).toContain("Plain Bagels");
    expect(titles).toContain("Blueberry Muffins");
    expect(titles).not.toContain("Sourdough Loaves");
    expect(titles).not.toContain("Morning Croissants");
  });

  test("generating B's spec never mutates or reads A's graph", () => {
    const before = JSON.stringify(GRAPH_A);
    generateSiteSpec(GRAPH_B, { generatedAt: GEN_AT });
    expect(JSON.stringify(GRAPH_A)).toBe(before);
  });
});

describe("owner override isolation (explicit DEMO_OWNER_CONTEXT)", () => {
  // DEMO_OWNER_CONTEXT: demoProvenance carries DEMO_OWNER_LABEL, an explicit
  // non-identity. No production owner auth is faked anywhere here.
  function phoneCorrection() {
    return assertCorrection({
      factRef: { objectId: bizId("tenant-a"), field: "phone" },
      op: "CORRECT",
      value: OWNER_PHONE,
      provenance: demoProvenance(null, () => T),
      sourceValueSeen: SHARED_PHONE,
    });
  }

  test("the assertion is recorded under the demo owner label", () => {
    const a = phoneCorrection();
    expect(a.provenance.owner).toBe(DEMO_OWNER_LABEL);
  });

  test("A's correction applies to A's graph", () => {
    const corrected = applyCorrections(GRAPH_A, [phoneCorrection()]);
    const biz = corrected.graph.objects.find((o) => o.id === bizId("tenant-a"));
    expect(biz && biz.fields["phone"]).toBe(OWNER_PHONE);
    const rec = biz && (biz.ownerFieldCorrections ?? []).find((c) => c.field === "phone");
    expect(rec && rec.ownerValue).toBe(OWNER_PHONE);
    expect(rec && rec.actorLabel).toBe(DEMO_OWNER_LABEL);
    expect(corrected.applied).toHaveLength(1);
    expect(corrected.orphaned).toHaveLength(0);
  });

  test("A's correction is orphaned (no-op) on B's graph", () => {
    const corrected = applyCorrections(GRAPH_B, [phoneCorrection()]);
    const biz = corrected.graph.objects.find((o) => o.id === bizId("tenant-b"));
    // B's phone is untouched: the shared source value stays.
    expect(biz && biz.fields["phone"]).toBe(SHARED_PHONE);
    expect(biz && (biz.ownerFieldCorrections ?? [])).toHaveLength(0);
    expect(corrected.applied).toHaveLength(0);
    expect(corrected.orphaned).toHaveLength(1);
  });

  test("ATTACK PINNED: with unscoped (colliding) ids, A's correction leaks into B", () => {
    // A caller that forgets tenant scoping mints B's objects with A's ids.
    // The correction then addresses B's record: the leak is real, which is
    // why tenant-scoped identity is the isolation precondition.
    // Force the collision: B's business carries A's business id.
    const unscopedB: ObjectGraph = {
      objects: GRAPH_B.objects.map((o) =>
        o.id === bizId("tenant-b") ? { ...o, id: bizId("tenant-a") } : o,
      ),
      relationships: GRAPH_B.relationships,
    };
    const corrected = applyCorrections(unscopedB, [phoneCorrection()]);
    const biz = corrected.graph.objects.find((o) => o.id === bizId("tenant-a"));
    expect(biz && biz.fields["phone"]).toBe(OWNER_PHONE);
    expect(corrected.applied).toHaveLength(1);
  });
});

describe("private-state isolation", () => {
  test("A's private objects never enter A's public projection", () => {
    const p = buildVerifiedPublicProjection(GRAPH_A);
    const ids = new Set(p.graph.objects.map((o) => o.id));
    expect(ids.has(svcId("tenant-a", "vault"))).toBe(false);
    const s = JSON.stringify(p.graph);
    expect(s).not.toContain("Secret Recipe Vault");
    expect(s).not.toContain("VAULT-7");
  });

  test("A's private objects never enter A's spec", () => {
    const spec = generateSiteSpec(GRAPH_A, { generatedAt: GEN_AT });
    const s = JSON.stringify(spec);
    expect(s).not.toContain("Secret Recipe Vault");
    expect(s).not.toContain("VAULT-7");
  });

  test("A's private ids never appear in B's projection", () => {
    const p = buildVerifiedPublicProjection(GRAPH_B);
    const s = JSON.stringify(p.graph);
    expect(s).not.toContain(svcId("tenant-a", "vault"));
  });
});
