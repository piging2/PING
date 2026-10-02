/**
 * Proof 2: Coppersmith Plumbing & HVAC through the IDENTICAL pipeline slice.
 *
 * Same machinery as pipeline.test.ts (proof 1, Happy Place), different
 * captured-record graph, no special cases. The assertions are the same
 * shape as proof 1's; the values asserted at the evidence/spec stages are
 * the OBSERVED outputs of runSlice() on COPPERSMITH_GRAPH (60 records,
 * 4 pages, 14 sections, 8 projected objects, 14/14 bindings), recorded
 * from a probe run before this test was written.
 */
import { runSlice } from "../src/pipeline";
import { COPPERSMITH_GRAPH } from "../fixtures/coppersmith-graph";

const GEN_AT = "2026-10-02T12:00:00Z";
const NOW = "2026-10-02T12:00:00Z";

test("the full slice runs: evidence -> spec -> gate -> render model", () => {
  const r = runSlice({
    graph: COPPERSMITH_GRAPH,
    generatedAt: GEN_AT,
    now: NOW,
  });

  // Evidence stage attests.
  expect(r.inputKind).toBe("captured-record");
  expect(r.evidence.recordCount).toBe(60);
  expect(r.evidence.derivationDigest).toMatch(/^[0-9a-f]{64}$/);

  // Spec stage: the Coppersmith business compiles to four pages.
  expect(r.spec.kind).toBe("fyd.sitespec@1");
  expect(r.spec.ownerObjectId).toBe("website-business-2f1327c09d622175");
  expect(r.spec.pages).toEqual(["home", "about", "services", "explore"]);
  expect(r.spec.sectionCount).toBe(14);

  // Projection stage: the public boundary.
  expect(r.projection.viewerKind).toBe("anonymous");
  expect(r.projection.objectCount).toBe(8);
  expect(r.projection.checkpoint).toBe(
    r.projection.graphDigest + ":" + r.projection.decisionsDigest,
  );

  // Binding gate: every factual claim bound to evidence, none invented.
  expect(r.bindings.total).toBeGreaterThan(0);
  expect(r.bindings.allBound).toBe(true);
  expect(r.bindings.bound).toBe(r.bindings.total);

  // Evidence coverage: the product metric.
  expect(r.evidenceCoverage.ratio).toBe(1);

  // Render model: versioned, digested, canonical.
  expect(r.renderModel.rendererVersion).toMatch(/^renderer-components@/);
  expect(r.renderModel.designTokenVersion).toMatch(/^tokens@/);
  expect(r.renderModel.modelDigest).toMatch(/^[0-9a-f]{64}$/);
  expect(r.renderModel.canonicalBytes).toBe(r.renderModelCanonical.length);
});

test("the slice is deterministic across runs", () => {
  const a = runSlice({
    graph: COPPERSMITH_GRAPH,
    generatedAt: GEN_AT,
    now: NOW,
  });
  const b = runSlice({
    graph: COPPERSMITH_GRAPH,
    generatedAt: GEN_AT,
    now: NOW,
  });
  expect(b.renderModelCanonical).toBe(a.renderModelCanonical);
  expect(b.renderModel.modelDigest).toBe(a.renderModel.modelDigest);
  expect(b.evidence.derivationDigest).toBe(a.evidence.derivationDigest);
  expect(b.projection.checkpoint).toBe(a.projection.checkpoint);
});

test("the slice fails closed when evidence is stripped", () => {
  const stripped = JSON.parse(JSON.stringify(COPPERSMITH_GRAPH));
  stripped.objects[0].provenance.ref = "";
  expect(() =>
    runSlice({ graph: stripped, generatedAt: GEN_AT, now: NOW }),
  ).toThrow(/Binding verification refused/);
});
