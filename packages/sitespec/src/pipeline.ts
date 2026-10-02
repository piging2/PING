/**
 * The vertical slice: EVIDENCE -> OBJECTS -> SITE SPEC -> RENDER MODEL.
 *
 * NEW FYD CODE (piging2), not a harvest. This module wires the harvested
 * stages into the first end-to-end proof:
 *
 *   ObjectGraph (captured ingestion record)
 *     -> deriveEvidence            (evidence.ts: explicit digested claims)
 *     -> generateSiteSpec          (generator.ts: deterministic SiteSpec)
 *     -> buildVerifiedPublicProjection (projection.ts: public boundary)
 *     -> deriveSpecBindings        (factual bindings the spec publishes)
 *     -> assertSpecBindingsVerified (binding-verifier.ts: FAIL-CLOSED gate)
 *     -> buildSemanticRenderModel  (render-model.ts: section-binding manifest)
 *     -> canonicalizeModel + digest (the determinism invariant artifact)
 *
 * The pipeline is pure and deterministic: the same graph + generatedAt +
 * now yields byte-identical receipts. `now` pins the evidence-freshness
 * reference instant (tests pin it; production callers pass the current
 * instant so the freshness rule is always enforced).
 *
 * No spec is emitted with unbound factual claims: the binding gate
 * throws BindingVerificationError before the render model is built.
 */

import { sha256Hex } from "../../trust/src/digest";
import type { ObjectGraph } from "./types";
import {
  deriveEvidence,
  evidenceCoverage,
  type EvidenceDerivation,
  type EvidenceRecord,
} from "./evidence";
import { generateSiteSpec, GENERATOR_VERSION } from "./generator";
import {
  buildVerifiedPublicProjection,
  type VerifiedPublicProjection,
} from "./projection";
import { resolveQuery } from "./query";
import {
  buildSemanticRenderModel,
  canonicalizeModel,
  DESIGN_TOKEN_VERSION,
  RENDERER_VERSION,
  type SemanticRenderModel,
} from "./render-model";
import {
  assertSpecBindingsVerified,
  ownerAssertionsFromGraph,
  type PresentationBinding,
  type SpecBindingReport,
} from "./binding-verifier";

export interface SliceInput {
  /** The object graph. For this slice: a captured ingestion record. */
  graph: ObjectGraph;
  /** Pinned by the caller so runs are reproducible. */
  generatedAt: string;
  /**
   * Reference instant for the evidence-freshness rule. Defaults to the
   * current instant (production behavior: the rule is always enforced);
   * tests pin it.
   */
  now?: string;
  inputKind?: EvidenceRecord["inputKind"];
}

/**
 * The factual bindings a spec publishes. One "direct" (verbatim website
 * statement) binding per bound object per non-empty identity field
 * (title, description). Only non-empty values are claimed: an empty
 * description is missing data, and missing data means no claim, never
 * an unverifiable one. Sections with presentation.hidden publish
 * nothing.
 */
export function deriveSpecBindings(
  spec: import("./types").FYDSiteSpec,
  projection: VerifiedPublicProjection,
): PresentationBinding[] {
  const seen = new Set<string>();
  const out: PresentationBinding[] = [];
  const push = (objectId: string, field: "title" | "description", value: string) => {
    if (value.trim() === "") return;
    const key = objectId + "\u0000" + field;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ objectId, field, classification: "direct" });
  };
  for (const page of spec.pages) {
    for (const section of page.sections) {
      if (section.presentation.hidden) continue;
      const objects = resolveQuery(section.query, projection.graph, spec.ownerObjectId);
      for (const o of objects) {
        push(o.id, "title", o.title);
        push(o.id, "description", o.description);
      }
    }
  }
  return out;
}

export interface SliceReceipt {
  inputKind: EvidenceRecord["inputKind"];
  generatedAt: string;
  evidence: {
    recordCount: number;
    derivationDigest: string;
  };
  spec: {
    kind: string;
    ownerObjectId: string;
    generatorVersion: string;
    pages: string[];
    sectionCount: number;
  };
  projection: {
    checkpoint: string;
    graphDigest: string;
    decisionsDigest: string;
    viewerKind: string;
    objectCount: number;
  };
  bindings: {
    total: number;
    bound: number;
    allBound: boolean;
  };
  evidenceCoverage: {
    covered: number;
    total: number;
    ratio: number;
  };
  renderModel: {
    rendererVersion: string;
    designTokenVersion: string;
    modelDigest: string;
    canonicalBytes: number;
  };
  /** The canonical render-model bytes: the determinism invariant artifact. */
  renderModelCanonical: string;
}

/**
 * Run the slice. Throws BindingVerificationError (fail-closed) when any
 * factual binding the spec publishes does not verify against evidence.
 */
export function runSlice(input: SliceInput): SliceReceipt {
  const now = input.now ?? new Date().toISOString();
  const inputKind = input.inputKind ?? "captured-record";

  // 1. Evidence: explicit, digested claims from the input graph.
  const evidence: EvidenceDerivation = deriveEvidence(input.graph, inputKind);

  // 2. SiteSpec: deterministic compile of the graph.
  const spec = generateSiteSpec(input.graph, { generatedAt: input.generatedAt });

  // 3. Public projection: the authorized public surface.
  const projection = buildVerifiedPublicProjection(input.graph);

  // 4. Factual bindings the spec publishes, resolved through the real
  //    query seam against the projected (public) graph.
  const bindings = deriveSpecBindings(spec, projection);

  // 5. The emission gate: fail closed on any unbound factual claim.
  const ownerAssertions = ownerAssertionsFromGraph(projection.graph);
  const report: SpecBindingReport = assertSpecBindingsVerified(
    bindings,
    projection.graph,
    ownerAssertions,
    { now },
  );

  // 6. Semantic render model + canonical bytes + digest.
  const model: SemanticRenderModel = buildSemanticRenderModel(spec, projection);
  const canonical = canonicalizeModel(model);
  const modelDigest = sha256Hex(canonical);

  // 7. Evidence coverage: the product metric.
  const coverage = evidenceCoverage(evidence, bindings);

  return {
    inputKind,
    generatedAt: input.generatedAt,
    evidence: {
      recordCount: evidence.records.length,
      derivationDigest: evidence.derivationDigest,
    },
    spec: {
      kind: spec.kind,
      ownerObjectId: spec.ownerObjectId,
      generatorVersion: GENERATOR_VERSION,
      pages: spec.pages.map((p) => p.slug),
      sectionCount: spec.pages.reduce((n, p) => n + p.sections.length, 0),
    },
    projection: {
      checkpoint: projection.provenance.checkpoint,
      graphDigest: projection.provenance.graphDigest,
      decisionsDigest: projection.provenance.decisionsDigest,
      viewerKind: projection.provenance.viewerKind,
      objectCount: projection.graph.objects.length,
    },
    bindings: {
      total: report.verdicts.length,
      bound: report.bound.length,
      allBound: report.allBound,
    },
    evidenceCoverage: coverage,
    renderModel: {
      rendererVersion: RENDERER_VERSION,
      designTokenVersion: DESIGN_TOKEN_VERSION,
      modelDigest,
      canonicalBytes: canonical.length,
    },
    renderModelCanonical: canonical,
  };
}
