/**
 * Owner assertions for regeneration: a thin adapter over the owner
 * package's assertion algebra (packages/owner/src/corrections.ts).
 *
 * COORDINATION (2026-10-02): the sibling packages/owner worker landed
 * while this package was being built. The provisional OwnerAssertion
 * shape this package defined first has been RETIRED in favor of the
 * owner package's canonical shape and algebra: there is exactly one
 * assertion authority. This module owns only the proposals-side need:
 * applying assertions to an ObjectGraph inside regenerate(), plus the
 * changed-object set the affected-path computation needs.
 *
 * Semantics (from the owner package, unchanged here):
 *   - assertions are append-only; only chain heads apply
 *   - REGENERATION projects assertions over freshly extracted facts
 *   - a CORRECT keeps the owner's value when the source drifts, and the
 *     drift surfaces as an explicit conflict (never a silent win)
 *   - CORRECT on a non-read-seam field is orphaned (kept, not applied,
 *     not dropped): projecting it without the read-seam record would
 *     launder owner authorship as direct evidence
 *   - HIDE does not change values; hiddenFactIds go to the visibility layer
 *
 * Pure and deterministic. The owner package owns the algebra; this
 * module never re-implements it.
 */

import {
  applyCorrections,
  extractGraphFacts,
  type AppliedAssertion,
  type CorrectionConflict,
  type OrphanedAssertion,
  type OwnerAssertion,
} from "../../owner/src/corrections";
import type { ObjectGraph } from "../../sitespec/src/types";

export interface AssertionApplication {
  /** The projected graph: fresh object records, owner values composed over the source. */
  graph: ObjectGraph;
  applied: AppliedAssertion[];
  orphaned: OrphanedAssertion[];
  conflicts: CorrectionConflict[];
  /** factIds hidden by HIDE assertions, for the visibility layer. */
  hiddenFactIds: string[];
  /** Object ids whose effective values changed (drives affected-path computation). */
  changedObjectIds: string[];
}

/**
 * Project assertions over a freshly extracted graph. Delegates to the
 * owner package's applyCorrections; derives the changed-object set from
 * the applied CORRECT heads.
 */
export function applyAssertionsToGraph(
  graph: ObjectGraph,
  assertions: OwnerAssertion[],
): AssertionApplication {
  const corrected = applyCorrections(graph, assertions);
  const factToObject = new Map(
    extractGraphFacts(graph).map((f) => [f.factId, f.objectId] as const),
  );
  const changed = new Set<string>();
  for (const a of corrected.applied) {
    if (a.op !== "CORRECT") continue;
    const objectId = factToObject.get(a.factId);
    if (objectId) changed.add(objectId);
  }
  return {
    graph: corrected.graph,
    applied: corrected.applied,
    orphaned: corrected.orphaned,
    conflicts: corrected.conflicts,
    hiddenFactIds: corrected.hiddenFactIds,
    changedObjectIds: [...changed].sort(),
  };
}

// Re-export the canonical algebra for callers: one authority, no forks.
export {
  applyCorrections,
  assertCorrection,
  assertionFactId,
  chainHeads,
  extractGraphFacts,
  normalizeFactRef,
} from "../../owner/src/corrections";
export type {
  AppliedAssertion,
  AssertCorrectionInput,
  CorrectionConflict,
  CorrectionOp,
  CorrectedGraph,
  FactRef,
  GraphConfirmation,
  GraphFact,
  OrphanedAssertion,
  OwnerAssertion,
} from "../../owner/src/corrections";
export type { OwnerProvenance } from "../../owner/src/provenance";
