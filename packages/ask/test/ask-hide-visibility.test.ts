/**
 * P0#2 (FYD-010 privacy gate), ask-path residual: owner HIDE decisions
 * must be enforced on the Ask FYD projection for visitor-class viewers.
 *
 * THE BREAK: projectGraphForViewer took no FieldVisibilityDecision[]
 * input, so an owner-HIDE'd field survived into the projected graph the
 * anonymous answerer reasons over: the HIDE reached the anonymous
 * answer. The fix wires the decisions through the ONE shared boundary
 * implementation (packages/sitespec applyFieldVisibilityDecisions),
 * enforced for visitors only.
 *
 * Verified owners keep seeing their own hidden fields (owner-lane
 * semantics: applyCorrections leaves HIDE'd values in place for the
 * owner; enforcement lives where decisions are consumed, and the ask
 * boundary does not consume them against a verified owner).
 */

import { projectGraphForViewer } from "../src/viewer";
import type { FieldVisibilityDecision } from "../../sitespec/src/projection";
import type { ObjectGraph } from "../src/types";

const SECRET_TITLE = "Secret Midnight Service";
const SECRET_PHONE = "+15557654321";

function testGraph(): ObjectGraph {
  const provenance = {
    kind: "website-derived",
    ref: "website-ingestion:https://example.com/",
    derivedAt: "2026-10-02T00:00:00Z",
  };
  return {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "owner-1",
        visibility: "public",
        title: "Test Business",
        description: "A test business.",
        fields: { name: "Test Business", phone: "+15551234567" },
        createdAt: "2026-10-02T00:00:00Z",
        updatedAt: "2026-10-02T00:00:00Z",
        provenance,
      },
      {
        id: "svc-secret",
        schema: "ping.social.service@1",
        controllerId: "owner-1",
        visibility: "public",
        title: SECRET_TITLE,
        description: "A service the owner hid from the public record.",
        fields: { name: SECRET_TITLE, phone: SECRET_PHONE },
        createdAt: "2026-10-02T00:00:00Z",
        updatedAt: "2026-10-02T00:00:00Z",
        provenance,
      },
    ],
    relationships: [],
  };
}

const HIDE_TITLE: FieldVisibilityDecision[] = [
  { objectId: "svc-secret", field: "title", policy: "hidden" },
];
const HIDE_PHONE: FieldVisibilityDecision[] = [
  { objectId: "svc-secret", field: "phone", policy: "hidden" },
];

const verifiedOwner = { id: "owner-1", displayName: null, verified: true };

function serviceOf(graph: ObjectGraph) {
  const svc = graph.objects.find((o) => o.id === "svc-secret");
  if (!svc) throw new Error("svc-secret missing from projection");
  return svc;
}

describe("ask projection enforces owner HIDE decisions (P0#2)", () => {
  test("FALSIFIES THE BREAK: an owner-HIDE'd service title never reaches the anonymous projection", () => {
    const projected = projectGraphForViewer(testGraph(), null, HIDE_TITLE).graph;
    // The shared boundary blanks title/description to "": the key stays
    // for the render binding, the value never reaches the answerer.
    expect(serviceOf(projected).title).toBe("");
  });

  test("a HIDE'd non-title field is deleted from the anonymous projection", () => {
    const projected = projectGraphForViewer(testGraph(), null, HIDE_PHONE).graph;
    expect("phone" in serviceOf(projected).fields).toBe(false);
  });

  test("the verified owner still sees their own hidden fields", () => {
    const projected = projectGraphForViewer(
      testGraph(),
      verifiedOwner,
      HIDE_TITLE,
    ).graph;
    expect(serviceOf(projected).title).toBe(SECRET_TITLE);
    const projectedPhone = projectGraphForViewer(
      testGraph(),
      verifiedOwner,
      HIDE_PHONE,
    ).graph;
    expect(serviceOf(projectedPhone).fields["phone"]).toBe(SECRET_PHONE);
  });

  test("fail-closed default: no decisions means the existing identical projection for both classes", () => {
    const graph = testGraph();
    const asVisitor = projectGraphForViewer(graph, null);
    const asOwner = projectGraphForViewer(graph, verifiedOwner);
    expect(asVisitor.graph).toEqual(asOwner.graph);
    expect(serviceOf(asVisitor.graph).title).toBe(SECRET_TITLE);
  });

  test("unknown policies hide fail-closed through the shared boundary", () => {
    const weird: FieldVisibilityDecision[] = [
      { objectId: "svc-secret", field: "title", policy: "bogus-future-policy" },
    ];
    const projected = projectGraphForViewer(testGraph(), null, weird).graph;
    expect(serviceOf(projected).title).toBe("");
  });

  test("decisions naming unknown objects are ignored, never fatal", () => {
    const stray: FieldVisibilityDecision[] = [
      { objectId: "no-such-object", field: "title", policy: "hidden" },
    ];
    const projected = projectGraphForViewer(testGraph(), null, stray).graph;
    expect(serviceOf(projected).title).toBe(SECRET_TITLE);
  });

  test("the input graph is never mutated", () => {
    const graph = testGraph();
    projectGraphForViewer(graph, null, [...HIDE_TITLE, ...HIDE_PHONE]);
    expect(serviceOf(graph).title).toBe(SECRET_TITLE);
    expect(serviceOf(graph).fields["phone"]).toBe(SECRET_PHONE);
  });
});
