/**
 * FYD-010 PRIVACY GATE, wiring half (Worker P2).
 *
 * - owner HIDE assertions -> enforceable FieldVisibilityDecisions
 *   (packages/owner converter)
 * - the shipping slice (runSlice) accepts owner assertions and applies
 *   them: every owner HIDE is enforced on the rendered site (P0 #4)
 * - cross-tenant references are refused under an explicit tenant scope
 *   (attack 6)
 */

import { applyCorrections, assertCorrection } from "../../owner/src/corrections";
import { demoProvenance } from "../../owner/src/provenance";
import { hiddenFactIdsToDecisions } from "../../owner/src/visibility";
import { runSlice } from "../src/pipeline";
import { buildVerifiedPublicProjection } from "../src/projection";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";

const T = "2026-10-02T12:00:00Z";
const NOW = "2026-10-02T13:00:00Z";
const GEN_AT = "2026-10-02T12:00:00Z";
const PHONE = "+13035550101";

function bizObject(tenant: string, id: string, title: string): PingObject {
  return {
    id,
    schema: "ping.social.business@1",
    controllerId: tenant,
    visibility: "public",
    title,
    description: title + " in Grand Junction.",
    fields: {
      name: title,
      phone: PHONE,
      address: "100 Main St, Grand Junction, CO",
      claimKind: "website_statement",
    },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery.example/",
      derivedAt: T,
    },
  };
}

function offersRel(
  subject: string,
  object: string,
  id: string,
): PingRelationship {
  return {
    id,
    subject,
    predicate: "offers",
    object,
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:https://corner-bakery.example/#" + id,
  };
}

function singleTenantGraph(): ObjectGraph {
  return {
    objects: [bizObject("tenant-a", "obj-biz-a", "Corner Bakery")],
    relationships: [],
  };
}

describe("HIDE assertions become enforceable decisions", () => {
  test("hiddenFactIdsToDecisions converts a phone HIDE to one decision", () => {
    const a = assertCorrection({
      factRef: { objectId: "obj-biz-a", field: "phone" },
      op: "HIDE",
      provenance: demoProvenance(null, () => T),
    });
    const corrected = applyCorrections(singleTenantGraph(), [a]);
    expect(corrected.hiddenFactIds).toHaveLength(1);
    expect(hiddenFactIdsToDecisions(corrected.graph, corrected.hiddenFactIds)).toEqual([
      { objectId: "obj-biz-a", field: "phone", policy: "hidden", index: 0 },
    ]);
  });

  test("no hides -> no decisions", () => {
    expect(hiddenFactIdsToDecisions(singleTenantGraph(), [])).toEqual([]);
  });

  test("the converted decision actually hides at the boundary", () => {
    const a = assertCorrection({
      factRef: { objectId: "obj-biz-a", field: "phone" },
      op: "HIDE",
      provenance: demoProvenance(null, () => T),
    });
    const corrected = applyCorrections(singleTenantGraph(), [a]);
    const decisions = hiddenFactIdsToDecisions(
      corrected.graph,
      corrected.hiddenFactIds,
    );
    const p = buildVerifiedPublicProjection(corrected.graph, { decisions });
    expect(
      p.graph.objects.find((o) => o.id === "obj-biz-a")?.fields["phone"],
    ).toBeUndefined();
  });
});

describe("P0 #4: the shipping slice wires owner assertions", () => {
  test("a HIDE on description drops the binding: the site no longer publishes it", () => {
    const hideDescription = assertCorrection({
      factRef: { objectId: "obj-biz-a", field: "description" },
      op: "HIDE",
      provenance: demoProvenance(null, () => T),
    });
    const base = runSlice({
      graph: singleTenantGraph(),
      generatedAt: GEN_AT,
      now: NOW,
    });
    const hidden = runSlice({
      graph: singleTenantGraph(),
      generatedAt: GEN_AT,
      now: NOW,
      assertions: [hideDescription],
    });
    expect(hidden.bindings.total).toBe(base.bindings.total - 1);
    expect(hidden.bindings.allBound).toBe(true);
    expect(hidden.projection.checkpoint).not.toBe(base.projection.checkpoint);
  });

  test("no assertions -> byte-identical receipt to the pre-wiring slice", () => {
    const base = runSlice({
      graph: singleTenantGraph(),
      generatedAt: GEN_AT,
      now: NOW,
    });
    const empty = runSlice({
      graph: singleTenantGraph(),
      generatedAt: GEN_AT,
      now: NOW,
      assertions: [],
    });
    expect(empty.projection.checkpoint).toBe(base.projection.checkpoint);
    expect(empty.renderModelCanonical).toBe(base.renderModelCanonical);
  });
});

describe("FYD-010 attack 6: cross-tenant reference", () => {
  function mixedGraph(): ObjectGraph {
    return {
      objects: [
        bizObject("tenant-a", "obj-biz-a", "Corner Bakery"),
        bizObject("tenant-b", "obj-biz-b", "Other Bakery"),
      ],
      relationships: [offersRel("obj-biz-a", "obj-biz-b", "rel-cross")],
    };
  }

  test("a tenant-scoped projection refuses the foreign object and edge", () => {
    const p = buildVerifiedPublicProjection(mixedGraph(), {
      tenantId: "tenant-a",
    });
    const ids = p.graph.objects.map((o) => o.id);
    expect(ids).toContain("obj-biz-a");
    expect(ids).not.toContain("obj-biz-b");
    expect(p.graph.relationships).toHaveLength(0);
    expect(JSON.stringify(p.graph)).not.toContain("Other Bakery");
  });

  test("an object with no tenant identity never matches a scope (fail closed)", () => {
    const graph = mixedGraph();
    graph.objects.push({
      ...bizObject("tenant-a", "obj-nc", "No Controller Bakery"),
      controllerId: "",
    });
    const p = buildVerifiedPublicProjection(graph, { tenantId: "tenant-a" });
    const ids = p.graph.objects.map((o) => o.id);
    expect(ids).toContain("obj-biz-a");
    expect(ids).not.toContain("obj-nc");
  });

  test("the tenant scope is pinned in the viewer policy digest", () => {
    const a = buildVerifiedPublicProjection(mixedGraph(), {
      tenantId: "tenant-a",
    });
    const b = buildVerifiedPublicProjection(mixedGraph(), {
      tenantId: "tenant-b",
    });
    const none = buildVerifiedPublicProjection(mixedGraph());
    expect(a.provenance.tenantId).toBe("tenant-a");
    expect(a.provenance.viewerPolicyDigest).not.toBe(
      b.provenance.viewerPolicyDigest,
    );
    expect(a.provenance.viewerPolicyDigest).not.toBe(
      none.provenance.viewerPolicyDigest,
    );
  });

  test("without a scope the boundary keeps its legacy contract", () => {
    const p = buildVerifiedPublicProjection(mixedGraph());
    expect(p.graph.objects.map((o) => o.id).sort()).toEqual([
      "obj-biz-a",
      "obj-biz-b",
    ]);
  });
});
