/**
 * ADVERSARIAL (Worker E, hunt 10): site compiler purity.
 *
 * The invariant: same ObjectGraph + generatedAt (+ now for the
 * evidence-freshness reference instant) + generator version yields the
 * same semantic SiteSpec, byte for byte. Falsification axes:
 * - two runs over the same graph: byte-identical spec;
 * - input object/relationship ORDER shuffled: identical spec (no
 *   insertion-order or database-order dependence);
 * - the generator version is recorded on the spec (so a formulation
 *   change is visible, never silent);
 * - the full slice receipt (evidence derivation, projection checkpoint,
 *   binding verdicts, render-model digest) is stable across runs.
 */
import { generateSiteSpec, GENERATOR_VERSION } from "../src/generator";
import { runSlice } from "../src/pipeline";
import { COPPERSMITH_GRAPH } from "../fixtures/coppersmith-graph";
import type { ObjectGraph } from "../src/types";

const GEN_AT = "2026-10-02T16:30:00.000Z";
const NOW = "2026-10-02T17:00:00.000Z";

function clone(g: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(g)) as ObjectGraph;
}

function shuffled(g: ObjectGraph): ObjectGraph {
  return {
    objects: [...g.objects].reverse(),
    relationships: [...g.relationships].reverse(),
  };
}

describe("site compiler purity", () => {
  test("same graph + generatedAt -> byte-identical spec", () => {
    const a = JSON.stringify(
      generateSiteSpec(clone(COPPERSMITH_GRAPH), { generatedAt: GEN_AT }),
    );
    const b = JSON.stringify(
      generateSiteSpec(clone(COPPERSMITH_GRAPH), { generatedAt: GEN_AT }),
    );
    expect(b).toBe(a);
  });

  test("input order is irrelevant: shuffled graph -> identical spec bytes", () => {
    const a = JSON.stringify(
      generateSiteSpec(clone(COPPERSMITH_GRAPH), { generatedAt: GEN_AT }),
    );
    const b = JSON.stringify(
      generateSiteSpec(shuffled(clone(COPPERSMITH_GRAPH)), {
        generatedAt: GEN_AT,
      }),
    );
    expect(b).toBe(a);
  });

  test("the generator version is recorded on the spec", () => {
    const spec = generateSiteSpec(clone(COPPERSMITH_GRAPH), {
      generatedAt: GEN_AT,
    });
    expect(spec.generator.version).toBe(GENERATOR_VERSION);
    expect(spec.generator.generatedAt).toBe(GEN_AT);
  });

  test("the full slice receipt is stable across runs", () => {
    const run = () =>
      runSlice({
        graph: clone(COPPERSMITH_GRAPH),
        generatedAt: GEN_AT,
        now: NOW,
      });
    const a = run();
    const b = run();
    expect(b.evidence.derivationDigest).toBe(a.evidence.derivationDigest);
    expect(b.projection.checkpoint).toBe(a.projection.checkpoint);
    expect(b.bindings).toEqual(a.bindings);
    expect(b.renderModel.modelDigest).toBe(a.renderModel.modelDigest);
    expect(b.renderModelCanonical).toBe(a.renderModelCanonical);
  });

  test("shuffled input -> identical slice digests", () => {
    const a = runSlice({
      graph: clone(COPPERSMITH_GRAPH),
      generatedAt: GEN_AT,
      now: NOW,
    });
    const b = runSlice({
      graph: shuffled(clone(COPPERSMITH_GRAPH)),
      generatedAt: GEN_AT,
      now: NOW,
    });
    expect(b.renderModel.modelDigest).toBe(a.renderModel.modelDigest);
    expect(b.projection.checkpoint).toBe(a.projection.checkpoint);
  });
});
