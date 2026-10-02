/**
 * Point 1: HEADLESS LOOP.
 *
 * For BOTH businesses (Happy Place, Coppersmith), prove from clean state:
 * source -> acquisition -> evidence -> objects -> relationships ->
 * SiteSpec -> render model -> Ask FYD context -> evidence-backed answer ->
 * owner correction (DEMO_OWNER_CONTEXT) -> regeneration ->
 * correction survives (twice) -> Ask over the corrected graph.
 *
 * No browser, no network, no model calls. The driving logic lives in
 * ../scripts/loop-harness.ts; this test asserts every stage.
 */

import {
  BUSINESSES,
  runHeadlessLoop,
  type LoopReport,
} from "../scripts/loop-harness";

const KEYS = ["hpp", "copper"] as const;

describe.each(KEYS)("headless loop: %s", (key) => {
  let r: LoopReport;
  beforeAll(() => {
    r = runHeadlessLoop(BUSINESSES[key]);
  });

  test("acquisition: the captured record carries objects, relationships, and offers edges", () => {
    expect(r.objectCount).toBeGreaterThan(0);
    expect(r.relationshipCount).toBeGreaterThan(0);
    expect(r.activeOffersCount).toBeGreaterThan(0);
    expect(r.acquiredRecordDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  test("slice: evidence -> SiteSpec -> binding gate -> render model", () => {
    expect(r.evidenceRecordCount).toBeGreaterThan(0);
    expect(r.evidenceDerivationDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(r.sectionCount).toBeGreaterThan(0);
    // The emission gate is fail-closed: runSlice would have thrown.
    expect(r.bindingsAllBound).toBe(true);
    expect(r.evidenceCoverageRatio).toBe(1);
    expect(r.renderModelDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(r.renderModelCanonical.length).toBeGreaterThan(0);
  });

  test("ask fyd: the services question gets an evidence-backed answer, never a refusal", () => {
    expect(r.askProjectedObjectCount).toBeGreaterThan(0);
    expect(r.askRefusal).toBe(false);
    expect(r.askAnswerState).toBe("KNOWN");
    expect(r.askClaimCount).toBeGreaterThan(0);
    // Every claim cites evidence refs that were actually served.
    expect(r.askClaimsWithEvidence).toBe(r.askClaimCount);
    expect(r.askAnswerDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  test("owner correction under DEMO_OWNER_CONTEXT applies cleanly, no conflicts", () => {
    expect(r.assertionId).toMatch(/^oa-[0-9a-f]{16}$/);
    expect(r.correctionApplied).toBe(true);
    expect(r.correctionConflicts).toBe(0);
    expect(r.correctedDescription).not.toBeNull();
    expect(r.correctedDescription as string).toContain(
      "OWNER-CORRECTED (demo):",
    );
    expect(r.correctedGraphDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  test("regeneration: the correction moves the projection checkpoint and the manifest still binds the business object", () => {
    expect(r.regenBindingsAllBound).toBe(true);
    // The corrected content is what the manifest was built over: the
    // checkpoint (graphDigest:decisionsDigest) visibly moved...
    expect(r.preCorrectionCheckpoint).toMatch(/^[0-9a-f]{64}:[0-9a-f]{64}$/);
    expect(r.regenCheckpoint).toMatch(/^[0-9a-f]{64}:[0-9a-f]{64}$/);
    expect(r.regenCheckpoint).not.toBe(r.preCorrectionCheckpoint);
    // ...and the business object is still bound in the render manifest.
    expect(r.regenBindsBusinessObject).toBe(true);
    expect(r.regenRenderModelDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(r.regenRenderModelDigest).not.toBe(r.renderModelDigest);
  });

  test("second regeneration over a fresh observation: the correction still survives, byte-identical", () => {
    expect(r.correctionSurvivesSecondRegen).toBe(true);
    expect(r.secondRegenGraphDigest).toBe(r.correctedGraphDigest);
    expect(r.secondRegenRenderModelDigest).toBe(r.regenRenderModelDigest);
  });

  test("ask over the corrected graph still answers from evidence", () => {
    expect(r.askAfterCorrectionState).toBe("KNOWN");
    expect(r.askAfterCorrectionClaimCount).toBe(r.askClaimCount);
  });

  test("the loop is deterministic across in-process runs", () => {
    const again = runHeadlessLoop(BUSINESSES[key]);
    expect(again.acquiredRecordDigest).toBe(r.acquiredRecordDigest);
    expect(again.evidenceDerivationDigest).toBe(r.evidenceDerivationDigest);
    expect(again.renderModelDigest).toBe(r.renderModelDigest);
    expect(again.renderModelCanonical).toBe(r.renderModelCanonical);
    expect(again.askAnswerDigest).toBe(r.askAnswerDigest);
    expect(again.assertionId).toBe(r.assertionId);
    expect(again.correctedGraphDigest).toBe(r.correctedGraphDigest);
    expect(again.regenRenderModelDigest).toBe(r.regenRenderModelDigest);
    expect(again.secondRegenRenderModelDigest).toBe(
      r.secondRegenRenderModelDigest,
    );
  });
});
