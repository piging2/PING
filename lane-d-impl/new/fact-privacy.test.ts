/**
 * Lane D item 4: versioned privacy mask and fact-level enforcement.
 *
 * Pins: mask derivation parity, fail-closed digest verification,
 * applyFactPrivacy dropping masked facts/objects everywhere they appear,
 * hide traversal via located_at edges, and that the source graph is never
 * mutated.
 */
import {
  applyFactPrivacy,
  derivePrivacyMask,
  digestPrivacyMask,
  emptyPrivacyMask,
  normalizeFactValue,
  readOwnerFieldVisibilityDecisions,
  verifyPrivacyMask,
  type PrivacyMask,
} from "@/fyd/data/fact-privacy";
import { applyHideTraversal } from "@/fyd/sitespec/field-visibility";

function makeGraph() {
  return {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        title: "Acme Plumbing",
        description: "Family shop",
        visibility: "public" as const,
        fields: {
          address: "412 Main St, Adair Village, OR",
          locality: "Adair Village",
          phone: "(541) 555-0100",
        },
      },
      {
        id: "loc-1",
        schema: "ping.social.location@1",
        title: "412 Main St, Adair Village, OR",
        description: null,
        visibility: "public" as const,
        fields: { address: "412 Main St, Adair Village, OR" },
      },
      {
        id: "svc-1",
        schema: "ping.social.service@1",
        title: "Drain cleaning",
        description: "Our shop at 412 Main St handles drains",
        visibility: "public" as const,
        fields: {},
      },
    ],
    relationships: [
      { id: "r1", subject: "biz-1", predicate: "located_at", object: "loc-1", status: "active" as const },
      { id: "r2", subject: "biz-1", predicate: "offers", object: "svc-1", status: "active" as const },
    ],
  };
}

describe("normalizeFactValue", () => {
  test("NFC + whitespace collapse + lowercase; null for empties", () => {
    expect(normalizeFactValue("  412  Main\tSt ")).toBe("412 main st");
    expect(normalizeFactValue("")).toBeNull();
    expect(normalizeFactValue("   ")).toBeNull();
    expect(normalizeFactValue(null)).toBeNull();
    expect(normalizeFactValue(undefined)).toBeNull();
  });
});

describe("derivePrivacyMask", () => {
  test("deactivated object facts become suppressed facts; ids recorded", () => {
    const mask = derivePrivacyMask({
      graph: makeGraph(),
      deactivatedObjectIds: ["loc-1"],
      hiddenSectionIds: ["hours"],
      directiveIds: ["intent-9"],
    });
    expect(mask.version).toBe(1);
    expect(mask.objects).toEqual(["loc-1"]);
    expect(mask.sections).toEqual(["hours"]);
    expect(mask.directiveIds).toEqual(["intent-9"]);
    expect(mask.facts).toContain("412 main st, adair village, or");
    expect(mask.facts).not.toContain("family shop");
  });
});

describe("verifyPrivacyMask", () => {
  test("accepts a correctly digested mask; rejects tampering", () => {
    const mask: PrivacyMask = derivePrivacyMask({
      graph: makeGraph(),
      deactivatedObjectIds: ["loc-1"],
      hiddenSectionIds: [],
      directiveIds: ["intent-9"],
    });
    const digest = digestPrivacyMask(mask);
    expect(verifyPrivacyMask(mask, digest)).toEqual({ ok: true, mask });
    const tampered = { ...mask, facts: [...mask.facts, "injected"] };
    const bad = verifyPrivacyMask(tampered, digest);
    expect(bad.ok).toBe(false);
    expect(verifyPrivacyMask(mask, "deadbeef")).toEqual({
      ok: false,
      reason: "mask digest mismatch",
    });
    expect(verifyPrivacyMask(null, digest).ok).toBe(false);
    expect(verifyPrivacyMask({ ...mask, version: 99 }, digestPrivacyMask({ ...mask, version: 99 })).ok).toBe(false);
  });
});

describe("applyFactPrivacy", () => {
  test("masked object dropped; its fact values suppressed everywhere", () => {
    const graph = makeGraph();
    const mask = derivePrivacyMask({
      graph,
      deactivatedObjectIds: ["loc-1"],
      hiddenSectionIds: [],
      directiveIds: ["intent-9"],
    });
    const out = applyFactPrivacy(graph, mask, []);
    // loc-1 dropped
    expect(out.objects.map((o) => o.id)).not.toContain("loc-1");
    // the hidden street fact cannot resurface through another object.
    // (Whether the surviving business shows a coarsened locality or
    // nothing is the conservative-default policy's call; the guarantee
    // pinned here is that the hidden street fact is gone from public
    // bytes.)
    const hay = JSON.stringify(out).toLowerCase();
    expect(hay).not.toContain("412 main st");
    const biz = out.objects.find((o) => o.id === "biz-1")!;
    expect(biz.fields["phone"]).toBe("(541) 555-0100");
    const svc = out.objects.find((o) => o.id === "svc-1")!;
    expect(svc.description).toBeNull();
    // relationships touching loc-1 dropped; offers edge survives
    expect(out.relationships.map((r) => r.id)).toEqual(["r2"]);
    // source graph untouched
    expect(graph.objects.find((o) => o.id === "loc-1")).toBeDefined();
    expect(graph.objects.find((o) => o.id === "biz-1")!.fields["address"]).toBeDefined();
  });

  test("null mask with no decisions is a pass-through of the field projection", () => {
    const graph = makeGraph();
    const out = applyFactPrivacy(graph, null, []);
    expect(out.objects).toHaveLength(3);
    expect(out.relationships).toHaveLength(2);
  });
});

describe("applyHideTraversal (Lane E adoption)", () => {
  test("HIDE on Business.address drops address fields, located_at edge, orphaned Location", () => {
    const graph = makeGraph();
    const decisions = [
      {
        objectId: "biz-1",
        field: "address",
        policy: "hide" as const,
        decidedBy: "owner" as const,
        decidedAt: "2026-09-24T00:00:00.000Z",
        source: "owner_override" as const,
        version: 1,
      },
    ];
    const out = applyHideTraversal(graph, decisions);
    const biz = out.objects.find((o) => o.id === "biz-1")!;
    expect(biz.fields["address"]).toBeUndefined();
    expect(biz.fields["locality"]).toBeUndefined();
    expect(biz.fields["phone"]).toBe("(541) 555-0100");
    // located_at edge cut; orphaned loc-1 dropped
    expect(out.relationships.find((r) => r.predicate === "located_at")).toBeUndefined();
    expect(out.objects.find((o) => o.id === "loc-1")).toBeUndefined();
    // offers edge and svc-1 survive
    expect(out.objects.find((o) => o.id === "svc-1")).toBeDefined();
  });

  test("full applyFactPrivacy composes hide traversal with mask suppression", () => {
    const graph = makeGraph();
    const decisions = [
      {
        objectId: "biz-1",
        field: "address",
        policy: "hide" as const,
        decidedBy: "owner" as const,
        decidedAt: "2026-09-24T00:00:00.000Z",
        source: "owner_override" as const,
        version: 1,
      },
    ];
    const out = applyFactPrivacy(graph, emptyPrivacyMask(), decisions);
    // no address-family value of biz-1 survives anywhere public
    const haystack = JSON.stringify(out).toLowerCase();
    expect(haystack).not.toContain("adair village");
    expect(haystack).not.toContain("412 main st");
  });
});

describe("readOwnerFieldVisibilityDecisions", () => {
  test("missing override files yield no decisions and never throw", () => {
    expect(readOwnerFieldVisibilityDecisions(["no-such-object-xyz"])).toEqual([]);
  });
});

describe("three layers stay separate (CEO ADDRESS DECISION)", () => {
  test("conservative default is policy, never deletion: source graph keeps the fact", () => {
    const graph = makeGraph();
    // No directives, no owner decisions: the mask is empty ...
    const mask = derivePrivacyMask({
      graph,
      deactivatedObjectIds: [],
      hiddenSectionIds: [],
      directiveIds: [],
    });
    expect(mask.facts).toEqual([]);
    expect(mask.objects).toEqual([]);
    // ... and enforcement never mutates the source graph. The fact
    // (observed value) survives; only the public projection is shaped.
    const out = applyFactPrivacy(graph, mask, []);
    expect(out).not.toBe(graph);
    expect(graph.objects.find((o) => o.id === "biz-1")!.fields["address"]).toBe(
      "412 Main St, Adair Village, OR",
    );
  });

  test("mask derives only from directives, never from defaults or overrides", () => {
    const graph = makeGraph();
    const mask = derivePrivacyMask({
      graph,
      deactivatedObjectIds: ["loc-1"],
      hiddenSectionIds: [],
      directiveIds: ["intent-9"],
    });
    // The mask names the directive that hid the object ...
    expect(mask.directiveIds).toEqual(["intent-9"]);
    // ... and carries no trace of conservative defaults: biz-1 was never
    // deactivated, so its facts are not mask facts even though the
    // address-family default would coarsen them in the field projection.
    expect(mask.facts).not.toContain("family shop");
  });
});
