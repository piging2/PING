/**
 * Evidence-driven regeneration.
 *
 *   new observation -> evidence diff -> affected objects ->
 *   affected SiteSpec paths -> generator re-runs for affected pages only
 *   -> owner assertions re-apply -> presentation overrides re-apply ->
 *   new SiteSpec version.
 *
 * The generator is whole-spec, so "affected paths only" is implemented at
 * page granularity: pages whose bound objects changed (or that newly
 * appear/disappear) take fresh generator output; every other page keeps
 * its current sections verbatim. Presentation overrides and owner
 * assertions then compose over the merged spec/graph, so both survive
 * regeneration by construction. A changeless observation short-circuits
 * to a byte-identical no-op.
 *
 * Pure and deterministic. No filesystem access.
 */

import { digestCanonical } from "../../trust/src/digest";
import { deriveEvidence } from "../../sitespec/src/evidence";
import { generateSiteSpec } from "../../sitespec/src/generator";
import { resolveQuery } from "../../sitespec/src/query";
import type {
  FYDPage,
  FYDSiteSpec,
  ObjectGraph,
} from "../../sitespec/src/types";
import { applyAssertionsToGraph } from "./assertions";
import { applyOverrides } from "./proposal";
import type {
  EvidenceDiff,
  OwnerAssertion,
  RegenerateInput,
  RegenerateResult,
} from "./types";

/** Evidence diff: new vs old evidence records, by content-digest id. */
export function diffEvidence(
  oldGraph: ObjectGraph,
  newGraph: ObjectGraph,
): EvidenceDiff {
  const oldDerivation = deriveEvidence(oldGraph, "captured-record");
  const newDerivation = deriveEvidence(newGraph, "captured-record");
  const oldIds = new Set(oldDerivation.records.map((r) => r.evidenceId));
  const newIds = new Set(newDerivation.records.map((r) => r.evidenceId));
  const added = newDerivation.records.filter((r) => !oldIds.has(r.evidenceId));
  const removed = oldDerivation.records.filter((r) => !newIds.has(r.evidenceId));
  const affected = new Set<string>();
  for (const r of [...added, ...removed]) affected.add(r.objectId);
  return {
    added,
    removed,
    affectedObjectIds: [...affected].sort(),
  };
}

/**
 * Map affected object ids to spec paths. A section is affected when:
 *   - the set of objects its query binds DIFFERS between the old and new
 *     graph (covers added/removed objects and relationships), or
 *   - its bound set intersects the affected ids (covers value-only
 *     changes, e.g. a description edit, where the bound set is stable).
 * Binding resolves through the real query seam on both graphs. Paths are
 * per-section for the report; regeneration splices at page granularity.
 */
export function affectedSpecPaths(
  spec: FYDSiteSpec,
  oldGraph: ObjectGraph,
  newGraph: ObjectGraph,
  affectedObjectIds: string[],
): string[] {
  const affected = new Set(affectedObjectIds);
  const paths: string[] = [];
  const boundIds = (g: ObjectGraph, section: { query: import("../../sitespec/src/types").FYDQuery }, ownerId: string) =>
    new Set(resolveQuery(section.query, g, ownerId).map((o) => o.id));
  const sameSet = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((x) => b.has(x));
  for (const page of spec.pages) {
    for (const section of page.sections) {
      const before = boundIds(oldGraph, section, spec.ownerObjectId);
      const after = boundIds(newGraph, section, spec.ownerObjectId);
      const membershipChanged = !sameSet(before, after);
      const valueChanged = [...after].some((id) => affected.has(id));
      if (membershipChanged || valueChanged) {
        paths.push("pages." + page.slug + ".sections." + section.id);
      }
    }
  }
  return paths;
}

/** Page slugs re-generated: slugs with affected sections, plus newly appearing or disappearing slugs. */
function freshPageSlugs(
  oldSpec: FYDSiteSpec,
  freshSpec: FYDSiteSpec,
  affectedPaths: string[],
): string[] {
  const slugs = new Set<string>();
  for (const p of affectedPaths) {
    const slug = p.split(".")[1];
    if (slug) slugs.add(slug);
  }
  const oldSlugs = new Set(oldSpec.pages.map((p) => p.slug));
  const freshSlugs = new Set(freshSpec.pages.map((p) => p.slug));
  for (const s of freshSlugs) if (!oldSlugs.has(s)) slugs.add(s);
  for (const s of oldSlugs) if (!freshSlugs.has(s)) slugs.add(s);
  return [...slugs].sort();
}

/**
 * Regenerate the spec over a fresh observation. Steps:
 *   1. evidence diff (source-level: old graph vs new observation)
 *   2. project owner assertions over the fresh observation (asserted graph)
 *   3. assertion-touched objects join the affected set
 *   4. no changes at all -> byte-identical no-op (the input spec is returned untouched)
 *   5. fresh generator run over the asserted graph; affected pages spliced in
 *   6. presentation overrides re-applied
 */
export function regenerate(input: RegenerateInput): RegenerateResult {
  const { graph, newObservation, spec, assertions, presentationOverrides, generatedAt } = input;

  const evidenceDiff = diffEvidence(graph, newObservation);

  const assertionResult = applyAssertionsToGraph(newObservation, assertions);
  const assertedGraph = assertionResult.graph;

  const affectedIds = new Set<string>([
    ...evidenceDiff.affectedObjectIds,
    ...assertionResult.changedObjectIds,
  ]);
  const affectedPaths = affectedSpecPaths(spec, graph, assertedGraph, [...affectedIds].sort());

  const nothingChanged =
    evidenceDiff.added.length === 0 &&
    evidenceDiff.removed.length === 0 &&
    assertionResult.changedObjectIds.length === 0 &&
    assertionResult.conflicts.length === 0;

  if (nothingChanged) {
    const specDigest = digestCanonical(spec);
    return {
      spec,
      graph: assertedGraph,
      noOp: true,
      evidenceDiff,
      affectedPaths: [],
      freshPages: [],
      assertions: {
        applied: assertionResult.applied,
        orphaned: assertionResult.orphaned,
        conflicts: assertionResult.conflicts,
      },
      hiddenFactIds: assertionResult.hiddenFactIds,
      overridesReapplied: 0,
      specDigest,
    };
  }

  const freshSpec = generateSiteSpec(assertedGraph, { generatedAt });
  const freshSlugs = new Set(freshPageSlugs(spec, freshSpec, affectedPaths));

  const freshBySlug = new Map<string, FYDPage>(freshSpec.pages.map((p) => [p.slug, p] as const));
  const mergedPages: FYDPage[] = [];
  for (const page of freshSpec.pages) {
    if (freshSlugs.has(page.slug)) {
      mergedPages.push(page);
    } else {
      const oldPage = spec.pages.find((p) => p.slug === page.slug);
      // The slug exists in both (it is not new); keep the current page verbatim.
      mergedPages.push(
        oldPage ?? page,
      );
    }
  }
  const merged: FYDSiteSpec = { ...freshSpec, pages: mergedPages };

  const { spec: finalSpec, reapplied } = applyOverrides(merged, presentationOverrides);

  return {
    spec: finalSpec,
    graph: assertedGraph,
    noOp: false,
    evidenceDiff,
    affectedPaths,
    freshPages: [...freshSlugs].sort(),
    assertions: {
      applied: assertionResult.applied,
      orphaned: assertionResult.orphaned,
      conflicts: assertionResult.conflicts,
    },
    hiddenFactIds: assertionResult.hiddenFactIds,
    overridesReapplied: reapplied,
    specDigest: digestCanonical(finalSpec),
  };
}

/** Re-export for callers that need the assertion shape without the owner package. */
export type { OwnerAssertion };
