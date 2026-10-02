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
 * Project the public graph: drop every hidden fact's value from a graph
 * copy. Hidden facts are ABSENT from the projection, never redacted in
 * place; the input graph is never mutated. Array elements hide by index;
 * title/description hide to "" (required keys cannot be deleted).
 */
export function projectPublicGraph(
  graph: ObjectGraph,
  hiddenFactIds: string[],
): ObjectGraph {
  const copyObject = (o: ObjectGraph["objects"][number]) => ({
    ...o,
    fields: { ...o.fields },
  });
  if (hiddenFactIds.length === 0) {
    return {
      objects: graph.objects.map(copyObject),
      relationships: graph.relationships.map((r) => ({ ...r })),
    };
  }
  const hidden = new Set(hiddenFactIds);
  const hiddenByObject = new Map<string, Array<{ field: string; index: number }>>();
  for (const f of extractGraphFacts(graph)) {
    if (hidden.has(f.factId)) {
      const list = hiddenByObject.get(f.objectId);
      if (list) list.push({ field: f.field, index: f.index });
      else hiddenByObject.set(f.objectId, [{ field: f.field, index: f.index }]);
    }
  }
  const objects = graph.objects.map((o) => {
    const hides = hiddenByObject.get(o.id);
    if (!hides || hides.length === 0) return copyObject(o);
    const next = copyObject(o);
    for (const h of hides) {
      if (h.field === "title") {
        next.title = "";
        continue;
      }
      if (h.field === "description") {
        next.description = "";
        continue;
      }
      const v = next.fields[h.field];
      if (Array.isArray(v)) {
        const arr = [...v];
        arr.splice(h.index, 1);
        if (arr.length === 0) delete next.fields[h.field];
        else next.fields[h.field] = arr;
      } else {
        delete next.fields[h.field];
      }
    }
    return next;
  });
  return {
    objects,
    relationships: graph.relationships.map((r) => ({ ...r })),
  };
}
