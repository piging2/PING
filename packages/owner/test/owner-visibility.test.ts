/**
 * Proof 6, visibility rule: effective visibility from the four inputs
 * (source visibility / system default / owner override / effective
 * visibility), plus the public projection HIDE drives.
 */
import {
  effectiveVisibility,
  projectPublicGraph,
  type EffectiveVisibilityInput,
} from "../src/visibility";
import { factIdFor } from "../src/provenance";
import type { ObjectGraph } from "../../sitespec/src/types";

const NOW = "2026-10-02T14:00:00.000Z";

function vis(input: EffectiveVisibilityInput) {
  return effectiveVisibility(input);
}

test("owner override wins over everything", () => {
  // A HIDE assertion hides a public field under a public default.
  expect(
    vis({
      sourceVisibility: "public",
      systemDefault: "public",
      ownerOverride: "hidden",
      ownerOverrideKind: "hide_assertion",
    }),
  ).toEqual({ visibility: "hidden", decidedBy: "hide_assertion" });
  // An explicit owner show beats even a private source floor.
  expect(
    vis({
      sourceVisibility: "private",
      systemDefault: "hidden",
      ownerOverride: "public",
      ownerOverrideKind: "owner_override",
    }),
  ).toEqual({ visibility: "public", decidedBy: "owner_override" });
});

test("source floor: non-public source visibility stays hidden without an override", () => {
  expect(
    vis({ sourceVisibility: "private", systemDefault: "public", ownerOverride: null }),
  ).toEqual({ visibility: "hidden", decidedBy: "source" });
  expect(
    vis({ sourceVisibility: "internal", systemDefault: "public", ownerOverride: null }),
  ).toEqual({ visibility: "hidden", decidedBy: "source" });
});

test("system default decides when the source is public and the owner is silent", () => {
  expect(
    vis({ sourceVisibility: "public", systemDefault: "public", ownerOverride: null }),
  ).toEqual({ visibility: "public", decidedBy: "system_default" });
  expect(
    vis({ sourceVisibility: "public", systemDefault: "hidden", ownerOverride: null }),
  ).toEqual({ visibility: "hidden", decidedBy: "system_default" });
});

test("projectPublicGraph hides one array element by index", () => {
  const graph: ObjectGraph = {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "web:https://example.com/",
        visibility: "public",
        title: "Example Plumbing",
        description: "d",
        fields: { phone: "+1000", services: ["a", "b", "c"] },
        createdAt: NOW,
        updatedAt: NOW,
        provenance: { kind: "website-derived", ref: "r", derivedAt: NOW },
      },
    ],
    relationships: [],
  };
  const hideB = factIdFor("biz-1", "services", 1);
  const pub = projectPublicGraph(graph, [hideB]);
  expect(pub.objects[0].fields["services"]).toEqual(["a", "c"]);
  // Untouched input.
  expect(graph.objects[0].fields["services"]).toEqual(["a", "b", "c"]);
});

test("projectPublicGraph with no hides returns an equal, detached copy", () => {
  const graph: ObjectGraph = {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "web:https://example.com/",
        visibility: "public",
        title: "t",
        description: "d",
        fields: { phone: "+1000" },
        createdAt: NOW,
        updatedAt: NOW,
        provenance: { kind: "website-derived", ref: "r", derivedAt: NOW },
      },
    ],
    relationships: [],
  };
  const pub = projectPublicGraph(graph, []);
  expect(pub).toEqual(graph);
  expect(pub.objects[0]).not.toBe(graph.objects[0]);
});
