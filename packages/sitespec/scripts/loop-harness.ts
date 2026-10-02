/**
 * Headless FYD loop harness (adversarial test support, NOT product code).
 *
 * Proves the full vertical loop from clean state, with no browser, no
 * network, and no model calls:
 *
 *   acquired record (fixture = captured ingestion record)
 *     -> evidence -> objects -> relationships
 *     -> SiteSpec -> public projection -> binding gate -> render model
 *     -> Ask FYD context (visitor projection) -> evidence-backed answer
 *     -> owner correction (DEMO_OWNER_CONTEXT, explicitly unverified)
 *     -> regeneration over a FRESH observation -> correction survives
 *     -> second regeneration -> correction still survives
 *     -> Ask FYD over the corrected graph still answers from evidence
 *
 * Deterministic: every clock input (generatedAt, now, assertedAt) is pinned
 * by the caller. The fixtures are machine-generated captured records; the
 * harness never fetches anything.
 */

import { runSlice } from "../src/pipeline";
import { generateSiteSpec } from "../src/generator";
import { buildVerifiedPublicProjection } from "../src/projection";
import { buildSemanticRenderModel } from "../src/render-model";
import { askFyd } from "../../ask/src/answer";
import { projectGraphForViewer } from "../../ask/src/viewer";
import type {
  AskAnswer,
  AskInput,
  AskViewerIdentity,
} from "../../ask/src/types";
import {
  applyCorrections,
  assertCorrection,
  type OwnerAssertion,
} from "../../owner/src/corrections";
import { DEMO_OWNER_LABEL } from "../../owner/src/provenance";
import { digestCanonical } from "../../trust/src/digest";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";
import { COPPERSMITH_GRAPH } from "../fixtures/coppersmith-graph";
import type { ObjectGraph } from "../src/types";

/** Pinned clocks: the loop is byte-reproducible. */
export const PINNED_GENERATED_AT = "2026-10-02T12:00:00Z";
export const PINNED_NOW = "2026-10-02T12:00:00Z";

/** The proof-3 services question, answered mechanically (no LLM). */
export const SERVICES_QUESTION =
  "What services does this business offer, and how do you know?";

export interface LoopBusiness {
  key: "hpp" | "copper";
  graph: ObjectGraph;
  businessId: string;
}

export const BUSINESSES: Record<string, LoopBusiness> = {
  hpp: {
    key: "hpp",
    graph: HAPPY_PLACE_GRAPH,
    businessId: "website-business-6fa5ebd99d72c4cb",
  },
  copper: {
    key: "copper",
    graph: COPPERSMITH_GRAPH,
    businessId: "website-business-2f1327c09d622175",
  },
};

export interface LoopOptions {
  generatedAt?: string;
  now?: string;
}

export interface LoopReport {
  businessKey: string;
  // 1. acquisition
  acquiredRecordDigest: string;
  objectCount: number;
  relationshipCount: number;
  activeOffersCount: number;
  // 2-6. evidence -> SiteSpec -> render model
  evidenceRecordCount: number;
  evidenceDerivationDigest: string;
  sectionCount: number;
  bindingsAllBound: boolean;
  evidenceCoverageRatio: number;
  renderModelDigest: string;
  renderModelCanonical: string;
  // 7. Ask FYD context -> answer
  askProjectedObjectCount: number;
  askAnswerState: string;
  askRefusal: boolean;
  askClaimCount: number;
  askClaimsWithEvidence: number;
  askAnswerDigest: string;
  // 8. owner correction (DEMO_OWNER_CONTEXT)
  assertionId: string;
  correctionApplied: boolean;
  correctionConflicts: number;
  correctedDescription: string | null;
  correctedGraphDigest: string;
  // 9. regeneration x2: correction survives
  //
  // HONEST SCOPE (see render-model.ts): the semantic render model is a
  // SECTION-BINDING MANIFEST. It records section ids, components, bound
  // object ids, and the projection checkpoint (graphDigest:decisionsDigest).
  // It deliberately carries NO object field text: textual rendering is the
  // react-renderer package's job. So "the correction reaches the render"
  // is proven by: (a) the binding gate passes via the owner-assertion lane,
  // (b) the projection checkpoint MOVES (the corrected content is what the
  // manifest was built over), and (c) the manifest still binds the business
  // object. Asserting literal corrected text inside the canonical manifest
  // would over-claim beyond the module's documented contract.
  regenRenderModelDigest: string;
  regenBindingsAllBound: boolean;
  preCorrectionCheckpoint: string;
  regenCheckpoint: string;
  regenBindsBusinessObject: boolean;
  secondRegenRenderModelDigest: string;
  secondRegenGraphDigest: string;
  correctionSurvivesSecondRegen: boolean;
  // 10. ask over the corrected graph
  askAfterCorrectionState: string;
  askAfterCorrectionClaimCount: number;
}

function freshCopy(graph: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(graph)) as ObjectGraph;
}

const VISITOR: AskViewerIdentity = {
  id: null,
  displayName: null,
  verified: false,
};

function askAnswerDigestOf(a: AskAnswer): string {
  return digestCanonical({
    answer: a.answer,
    answerState: a.answerState,
    claims: a.claims,
    evidenceRefs: a.evidenceRefs,
    unknowns: a.unknowns,
  });
}

export function runHeadlessLoop(
  b: LoopBusiness,
  opts?: LoopOptions,
): LoopReport {
  const generatedAt = opts?.generatedAt ?? PINNED_GENERATED_AT;
  const now = opts?.now ?? PINNED_NOW;
  const { graph, businessId } = b;

  // 1. ACQUISITION. The fixture IS the captured ingestion record
  //    (machine-generated from the source bytes; provenance lives in the
  //    fixture banner). The acquired digest is over the canonical record.
  const acquiredRecordDigest = digestCanonical(graph);
  const objectCount = graph.objects.length;
  const relationshipCount = graph.relationships.length;
  const activeOffers = graph.relationships.filter(
    (r) => r.predicate === "offers" && r.status === "active",
  );

  // 2-6. EVIDENCE -> OBJECTS -> SITESPEC -> PROJECTION -> BINDING GATE ->
  //      RENDER MODEL. runSlice throws fail-closed on unbound claims.
  const slice = runSlice({ graph, generatedAt, now });

  // 7. ASK FYD CONTEXT: project for a visitor, then answer mechanically.
  //    The answerer cannot see non-public data; the context construction
  //    itself is the stage under test.
  const projected = projectGraphForViewer(graph, VISITOR);
  const input: AskInput = {
    targetObjectId: businessId,
    graph,
    viewerContext: { viewerClass: "visitor", viewerId: null },
    question: SERVICES_QUESTION,
  };
  const answer = askFyd(input);
  const served = new Set(answer.evidenceRefs.map((r) => r.id));
  const claimsWithEvidence = answer.claims.filter(
    (c) =>
      c.evidenceRefIds.length > 0 &&
      c.evidenceRefIds.every((id) => served.has(id)),
  ).length;

  // 8. OWNER CORRECTION under DEMO_OWNER_CONTEXT (verified: false, an
  //    explicit non-identity; never production authorization). CORRECT the
  //    business description, a read-seam field the binding verifier binds
  //    through the owner-assertion lane.
  const business = graph.objects.find((o) => o.id === businessId);
  if (!business) throw new Error("loop: business object missing: " + businessId);
  const sourceDescription = business.description;
  const ownerValue = "OWNER-CORRECTED (demo): " + sourceDescription;
  const assertion: OwnerAssertion = assertCorrection({
    factRef: { objectId: businessId, field: "description" },
    op: "CORRECT",
    value: ownerValue,
    provenance: {
      owner: DEMO_OWNER_LABEL,
      assertedAt: now,
      supersedes: null,
    },
    sourceValueSeen: sourceDescription,
  });

  // 9. REGENERATION: project the assertion over a FRESH observation
  //    (re-extracted from the same source bytes), twice. applyCorrections
  //    is pure: the fixture is never mutated.
  const corrected1 = applyCorrections(freshCopy(graph), [assertion]);
  const correctedObj1 =
    corrected1.graph.objects.find((o) => o.id === businessId) ?? null;
  const correctedGraphDigest = digestCanonical(corrected1.graph);
  const regen = runSlice({ graph: corrected1.graph, generatedAt, now });

  const corrected2 = applyCorrections(freshCopy(graph), [assertion]);
  const correctedObj2 =
    corrected2.graph.objects.find((o) => o.id === businessId) ?? null;
  const secondRegenGraphDigest = digestCanonical(corrected2.graph);
  const regen2 = runSlice({ graph: corrected2.graph, generatedAt, now });

  // The render-model-level proof that the correction is what the manifest
  // was built over: rebuild the manifest from the corrected graph and
  // confirm the checkpoint moved and the business object is still bound.
  const regenSpec = generateSiteSpec(corrected1.graph, { generatedAt });
  const regenProjection = buildVerifiedPublicProjection(corrected1.graph);
  const regenModel = buildSemanticRenderModel(regenSpec, regenProjection);
  const regenBindsBusinessObject = regenModel.pages.some((p) =>
    p.sections.some((s) => s.objectIds.includes(businessId)),
  );

  // 10. ASK over the corrected graph: still evidence-backed.
  const answerAfter = askFyd({
    targetObjectId: businessId,
    graph: corrected2.graph,
    viewerContext: { viewerClass: "visitor", viewerId: null },
    question: SERVICES_QUESTION,
  });

  return {
    businessKey: b.key,
    acquiredRecordDigest,
    objectCount,
    relationshipCount,
    activeOffersCount: activeOffers.length,
    evidenceRecordCount: slice.evidence.recordCount,
    evidenceDerivationDigest: slice.evidence.derivationDigest,
    sectionCount: slice.spec.sectionCount,
    bindingsAllBound: slice.bindings.allBound,
    evidenceCoverageRatio: slice.evidenceCoverage.ratio,
    renderModelDigest: slice.renderModel.modelDigest,
    renderModelCanonical: slice.renderModelCanonical,
    askProjectedObjectCount: projected.graph.objects.length,
    askAnswerState: answer.answerState,
    askRefusal: answer.refusal,
    askClaimCount: answer.claims.length,
    askClaimsWithEvidence: claimsWithEvidence,
    askAnswerDigest: askAnswerDigestOf(answer),
    assertionId: assertion.assertionId,
    correctionApplied: corrected1.applied.some(
      (a) => a.assertionId === assertion.assertionId && a.op === "CORRECT",
    ),
    correctionConflicts: corrected1.conflicts.length,
    correctedDescription: correctedObj1 ? correctedObj1.description : null,
    correctedGraphDigest,
    regenRenderModelDigest: regen.renderModel.modelDigest,
    regenBindingsAllBound: regen.bindings.allBound,
    preCorrectionCheckpoint: slice.projection.checkpoint,
    regenCheckpoint: regen.projection.checkpoint,
    regenBindsBusinessObject,
    secondRegenRenderModelDigest: regen2.renderModel.modelDigest,
    secondRegenGraphDigest,
    correctionSurvivesSecondRegen:
      correctedObj2 !== null && correctedObj2.description === ownerValue,
    askAfterCorrectionState: answerAfter.answerState,
    askAfterCorrectionClaimCount: answerAfter.claims.length,
  };
}

/**
 * CLI entry: prints the loop report as JSON (minus the large canonical
 * string) so a separate OS process can reproduce the run and a test can
 * compare digests across process boundaries.
 */
function main(): void {
  const key = process.argv[2] ?? "";
  const b = BUSINESSES[key];
  if (!b) {
    process.stderr.write("usage: loop-harness.js <hpp|copper>\n");
    process.exit(2);
  }
  const report = runHeadlessLoop(b);
  const { renderModelCanonical: _omitted, ...publicReport } = report;
  void _omitted;
  process.stdout.write(JSON.stringify(publicReport) + "\n");
}

if (require.main === module) {
  main();
}
