/**
 * ADVERSARIAL (Worker E, hunt 6): evidence deletion / stale source.
 *
 * The question: a claim that WAS supported loses its evidence. Is it
 * still presented as fact?
 *
 * Answer in this slice: NO. The emission gate (assertSpecBindingsVerified)
 * and the render-model gate (buildVerifiedRenderModel via
 * classifyRenderAtom) both fail closed:
 * - provenance ref deleted/emptied -> "no evidence ref" -> UNBOUND ->
 *   BindingVerificationError. No spec is emitted.
 * - derivedAt past the 365-day freshness horizon -> "stale evidence" ->
 *   UNBOUND -> BindingVerificationError.
 *
 * These tests pin that behavior: the gate refuses; the pipeline never
 * publishes an unevidenced claim as fact.
 */
import { generateSiteSpec } from "../src/generator";
import { buildVerifiedPublicProjection } from "../src/projection";
import {
  assertSpecBindingsVerified,
  BindingVerificationError,
  ownerAssertionsFromGraph,
  verifyBinding,
} from "../src/binding-verifier";
import { deriveSpecBindings } from "../src/pipeline";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";
import type { ObjectGraph } from "../src/types";

const GEN_AT = "2026-10-02T16:30:00.000Z";
const NOW = "2026-10-02T17:00:00.000Z";

function freshGraph(): ObjectGraph {
  const g = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
  for (const o of g.objects) {
    if (o.provenance) {
      o.provenance = {
        ...o.provenance,
        kind: "website-derived",
        ref: "website-ingestion:https://example.com/",
        derivedAt: "2026-09-21T13:50:00Z",
      };
    }
  }
  return g;
}

function verifiedOrThrow(graph: ObjectGraph, now: string = NOW) {
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const projection = buildVerifiedPublicProjection(graph);
  const bindings = deriveSpecBindings(spec, projection);
  const ownerAssertions = ownerAssertionsFromGraph(projection.graph);
  return { spec, projection, bindings, ownerAssertions, now };
}

describe("evidence deletion: the gate refuses, never publishes", () => {
  test("fresh evidence: the gate passes", () => {
    const { bindings, projection, ownerAssertions } = verifiedOrThrow(
      freshGraph(),
    );
    expect(bindings.length).toBeGreaterThan(0);
    const report = assertSpecBindingsVerified(
      bindings,
      projection.graph,
      ownerAssertions,
      { now: NOW },
    );
    expect(report.allBound).toBe(true);
  });

  test("provenance ref deleted: BindingVerificationError, no spec emitted", () => {
    const graph = freshGraph();
    const { spec, projection } = verifiedOrThrow(graph);
    // A previously supported claim loses its evidence: the object's
    // provenance ref is emptied after the spec was generated.
    const owner = projection.graph.objects.find(
      (o) => o.id === spec.ownerObjectId,
    );
    if (!owner || !owner.provenance) throw new Error("owner missing");
    owner.provenance.ref = "";
    const bindings = deriveSpecBindings(spec, projection);
    const ownerAssertions = ownerAssertionsFromGraph(projection.graph);
    let err: unknown = null;
    try {
      assertSpecBindingsVerified(bindings, projection.graph, ownerAssertions, {
        now: NOW,
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BindingVerificationError);
    expect((err as Error).message).toContain("no evidence ref");
  });

  test("stale evidence: derivedAt past the horizon is UNBOUND", () => {
    const graph = freshGraph();
    const { spec, projection } = verifiedOrThrow(graph);
    const owner = projection.graph.objects.find(
      (o) => o.id === spec.ownerObjectId,
    );
    if (!owner || !owner.provenance) throw new Error("owner missing");
    owner.provenance.derivedAt = "2024-06-01T00:00:00.000Z";
    const bindings = deriveSpecBindings(spec, projection);
    const ownerAssertions = ownerAssertionsFromGraph(projection.graph);
    // Unit level: UNBOUND with the named reason, never a silent pass.
    const titleBinding = bindings.find(
      (b) => b.objectId === owner.id && b.field === "title",
    );
    if (!titleBinding) throw new Error("no title binding");
    const verdict = verifyBinding(titleBinding, projection.graph, ownerAssertions, {
      now: NOW,
    });
    expect(verdict.status).toBe("UNBOUND");
    if (verdict.status === "UNBOUND") {
      expect(verdict.reason).toContain("stale evidence");
    }
    // Gate level: the pipeline refuses to emit.
    expect(() =>
      assertSpecBindingsVerified(bindings, projection.graph, ownerAssertions, {
        now: NOW,
      }),
    ).toThrow(BindingVerificationError);
  });

  test("re-ingested evidence restores the binding (the rule is reversible)", () => {
    const graph = freshGraph();
    const { spec, projection } = verifiedOrThrow(graph);
    const owner = projection.graph.objects.find(
      (o) => o.id === spec.ownerObjectId,
    );
    if (!owner || !owner.provenance) throw new Error("owner missing");
    owner.provenance.derivedAt = "2024-06-01T00:00:00.000Z";
    const bindings = deriveSpecBindings(spec, projection);
    const staleAssertions = ownerAssertionsFromGraph(projection.graph);
    expect(() =>
      assertSpecBindingsVerified(bindings, projection.graph, staleAssertions, {
        now: NOW,
      }),
    ).toThrow(BindingVerificationError);
    // Fresh re-ingest: the binding verifies again.
    owner.provenance.derivedAt = "2026-10-01T00:00:00.000Z";
    const report = assertSpecBindingsVerified(
      bindings,
      projection.graph,
      ownerAssertionsFromGraph(projection.graph),
      { now: NOW },
    );
    expect(report.allBound).toBe(true);
  });
});
