/**
 * Public display facts: the dumb-data half of the presentation adapter's
 * input contract.
 *
 * HARVEST BANNER (piging2)
 * MODE: new. This file is new piging2 code, not a harvest: it defines the
 * boundary the adapted renderer needs so it never touches the object
 * graph. The source renderer (src/fyd/components/renderer.tsx) reads
 * PingObject values through a RenderContext that carries the graph, the
 * spec, and the viewer; that context is REJECTED for this package (it
 * would drag the graph back into the presentation layer).
 * TARGET OWNER: packages/react-renderer (piging2 presentation adapter)
 * DEPENDENCIES: ../../sitespec/src/projection (type-only: erased at compile)
 * PROOFS: [5]
 *
 * Boundary, stated plainly:
 * - The caller derives FactsById from a VerifiedPublicProjection (public
 *   facts only: the projection already enforced visibility). The renderer
 *   package itself can never see a raw ObjectGraph: it has no import that
 *   yields one.
 * - The semantic render model is the SOLE authority on WHAT renders:
 *   which sections, which components, in which order, bound to which
 *   object ids. factsFromProjection may carry facts for every public
 *   object; render.tsx looks up ONLY the ids the model binds. Facts for
 *   unbound ids are never rendered (the proof-5 test asserts this).
 * - No invented claims: a fact is rendered only when its value is a
 *   non-empty string present in the projection. Missing data renders
 *   nothing, never a placeholder claim.
 */

import type { VerifiedPublicProjection } from "../../sitespec/src/projection";

/**
 * The public, display-safe facts for one object. Plain data: no graph,
 * no relationships, no queries, no authority. The caller is responsible
 * for deriving this from the verified public projection (public fields
 * only); the renderer trusts the map and never looks behind it.
 */
export interface PublicObjectFacts {
  id: string;
  schema: string;
  title: string;
  description: string;
  /** Sanitized public scalar fields (strings or string arrays only). */
  fields: Record<string, string | string[]>;
  /** Claim provenance label carried on the object (e.g. "website_statement"). */
  claimKind: string;
}

/** Public facts keyed by object id. */
export type FactsById = Record<string, PublicObjectFacts>;

/**
 * Derive the facts map from a verified public projection. Pure and
 * deterministic: same projection -> same map. Only objects the
 * projection carries (visibility === "public", enforced by
 * buildVerifiedPublicProjection) appear here.
 */
export function factsFromProjection(
  projection: VerifiedPublicProjection,
): FactsById {
  const out: FactsById = {};
  for (const o of projection.graph.objects) {
    const rawClaimKind = o.fields["claimKind"];
    out[o.id] = {
      id: o.id,
      schema: o.schema,
      title: o.title,
      description: o.description,
      fields: { ...o.fields },
      claimKind: typeof rawClaimKind === "string" ? rawClaimKind : "unknown",
    };
  }
  return out;
}
