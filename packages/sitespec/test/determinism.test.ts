/**
 * The determinism invariant, tested:
 *
 *   SAME ObjectGraph version + SiteSpec version + ViewerContext class +
 *   Renderer version -> SAME SEMANTIC RENDER MODEL.
 *
 * Proven over canonical bytes: byte-identical canonical forms of the
 * section-binding manifest, compared by digest.
 */
import { sha256Hex } from "../../trust/src/digest";
import { runSlice } from "../src/pipeline";
import type { ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";

const GRAPH = HAPPY_PLACE_GRAPH;
const GEN_AT = "2026-10-02T12:00:00Z";
const NOW = "2026-10-02T12:00:00Z";

function canonicalOf(graph: ObjectGraph, generatedAt: string): string {
  return runSlice({ graph, generatedAt, now: NOW }).renderModelCanonical;
}

test("same inputs -> same canonical render model (byte-identical)", () => {
  const a = canonicalOf(GRAPH, GEN_AT);
  const b = canonicalOf(GRAPH, GEN_AT);
  expect(b).toBe(a);
  expect(sha256Hex(b)).toBe(sha256Hex(a));
});

test("generatedAt is not in the semantic model: volatile stamps do not change it", () => {
  const a = canonicalOf(GRAPH, GEN_AT);
  const b = canonicalOf(GRAPH, "2026-10-03T00:00:00Z");
  expect(b).toBe(a);
});

test("different graph content -> different semantic render model", () => {
  const smaller: ObjectGraph = {
    objects: GRAPH.objects.slice(0, GRAPH.objects.length - 1),
    relationships: GRAPH.relationships.filter(
      (r) => r.subject !== GRAPH.objects[GRAPH.objects.length - 1].id &&
        r.object !== GRAPH.objects[GRAPH.objects.length - 1].id,
    ),
  };
  const a = canonicalOf(GRAPH, GEN_AT);
  const b = canonicalOf(smaller, GEN_AT);
  expect(b).not.toBe(a);
  expect(sha256Hex(b)).not.toBe(sha256Hex(a));
});

test("input object order does not change the semantic render model", () => {
  const shuffled: ObjectGraph = {
    objects: GRAPH.objects.slice().reverse(),
    relationships: GRAPH.relationships.slice().reverse(),
  };
  const a = canonicalOf(GRAPH, GEN_AT);
  const b = canonicalOf(shuffled, GEN_AT);
  expect(b).toBe(a);
});

test("the model carries semantic identity, never wall-clock identity", () => {
  const model = JSON.parse(canonicalOf(GRAPH, GEN_AT)) as Record<string, unknown>;
  const text = JSON.stringify(model);
  // No ISO wall-clock stamps leak into the canonical model.
  expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  expect(model.checkpoint).toMatch(/^[0-9a-f]{64}:[0-9a-f]{64}$/);
  expect(model.rendererVersion).toMatch(/^renderer-components@[0-9a-f]{16}$/);
  expect(model.designTokenVersion).toMatch(/^tokens@[0-9a-f]{16}$/);
});
