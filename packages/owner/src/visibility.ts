/**
 * Effective visibility: which facts may appear on the public site.
 *
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/owner-mode/visibility-policy.ts (resolveFactVisibility,
 *         VisibilitySource, the explicit-owner-decision > HIDE-assertion
 *         > conservative-default precedence)
 * TARGET OWNER: packages/owner (piging2 owner corrections)
 * MODE: ADAPT. The source resolves per-FACT visibility over SiteFacts with
 * a fact-kind conservative default. piging2 resolves per-FIELD effective
 * visibility from four explicit inputs - source visibility / system
 * default / owner override / effective visibility - because the object
 * graph already carries source visibility and the conservative default is
 * a pipeline input, not a fact-kind lookup. Precedence is preserved:
 * explicit owner override first, then the source floor (a non-public
 * source visibility stays hidden), then the system default. HIDE
 * assertions feed the owner-override input via the hiddenFactIds that
 * applyCorrections (./corrections.ts) returns.
 * projectPublicGraph is the projection the rule drives: hidden facts are
 * ABSENT from the public projection, never redacted in place.
 * DEPENDENCIES: ./corrections (extractGraphFacts),
 *               ../../sitespec/src/types (type-only)
 * PROOFS: [6]
 *
 * Pure, deterministic, browser-safe.
 */

import type { ObjectGraph } from "../../sitespec/src/types";
import {
  applyFieldVisibilityDecisions,
  type FieldVisibilityDecision,
} from "../../sitespec/src/projection";
import { extractGraphFacts } from "./corrections";

/** Per-field visibility. There is no third state. */
export type FieldVisibility = "public" | "hidden";

/** Which input decided the effective visibility. */
export type VisibilityDecidedBy =
  | "owner_override"
  | "hide_assertion"
  | "source"
  | "system_default";

export interface EffectiveVisibilityInput {
  /** What the source record says about this field's object. */
  sourceVisibility: "public" | "private" | "internal";
  /** The pipeline's conservative default when nothing else decides. */
  systemDefault: FieldVisibility;
  /** Owner override for this fact; null when the owner said nothing. */
  ownerOverride: FieldVisibility | null;
  /** Where the override came from, for the audit trail. */
  ownerOverrideKind?: "owner_override" | "hide_assertion";
}

export interface EffectiveVisibility {
  visibility: FieldVisibility;
  decidedBy: VisibilityDecidedBy;
}

/**
 * Resolve one field's effective visibility from the four inputs.
 *
 * Precedence (highest first):
 *   1. owner override (explicit decision or HIDE assertion),
 *   2. source floor: a non-public source visibility stays hidden,
 *   3. the system default.
 *
 * Pure and deterministic.
 */
export function effectiveVisibility(
  input: EffectiveVisibilityInput,
): EffectiveVisibility {
  if (input.ownerOverride !== null) {
    return {
      visibility: input.ownerOverride,
      decidedBy: input.ownerOverrideKind ?? "owner_override",
    };
  }
  if (input.sourceVisibility !== "public") {
    return { visibility: "hidden", decidedBy: "source" };
  }
  return { visibility: input.systemDefault, decidedBy: "system_default" };
}

/**
 * Convert hidden fact ids (the HIDE-assertion output of applyCorrections)
 * into enforceable FieldVisibilityDecisions for the public projection
 * boundary. One decision per hidden fact; array elements carry their
 * index so the boundary hides exactly the element the owner hid.
 * Pure and deterministic.
 */
export function hiddenFactIdsToDecisions(
  graph: ObjectGraph,
  hiddenFactIds: string[],
): FieldVisibilityDecision[] {
  if (hiddenFactIds.length === 0) return [];
  const hidden = new Set(hiddenFactIds);
  const out: FieldVisibilityDecision[] = [];
  for (const f of extractGraphFacts(graph)) {
    if (!hidden.has(f.factId)) continue;
    const d: FieldVisibilityDecision = {
      objectId: f.objectId,
      field: f.field,
      policy: "hidden",
    };
    if (f.field !== "title" && f.field !== "description") d.index = f.index;
    out.push(d);
  }
  return out;
}

/**
 * Project the public graph: drop every hidden fact's value from a graph
 * copy. Hidden facts are ABSENT from the projection, never redacted in
 * place; the input graph is never mutated. Array elements hide by index;
 * title/description hide to "" (required keys cannot be deleted).
 *
 * Delegates to the boundary's applyFieldVisibilityDecisions: field
 * hiding has ONE implementation, shared with buildVerifiedPublicProjection.
 */
export function projectPublicGraph(
  graph: ObjectGraph,
  hiddenFactIds: string[],
): ObjectGraph {
  const decisions = hiddenFactIdsToDecisions(graph, hiddenFactIds);
  return {
    objects: applyFieldVisibilityDecisions(graph.objects, decisions),
    relationships: graph.relationships.map((r) => ({ ...r })),
  };
}
