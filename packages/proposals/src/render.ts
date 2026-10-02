/**
 * Deterministic re-render: SiteSpec + ObjectGraph -> semantic render
 * model digest. Used by the proofs to show that an applied proposal (or
 * a regeneration) changes what renders, and that re-rendering is
 * byte-identical across runs.
 */

import { sha256Hex } from "../../trust/src/digest";
import { buildVerifiedPublicProjection } from "../../sitespec/src/projection";
import {
  buildSemanticRenderModel,
  canonicalizeModel,
  type SemanticRenderModel,
} from "../../sitespec/src/render-model";
import type { FYDSiteSpec, ObjectGraph } from "../../sitespec/src/types";

export interface RenderReceipt {
  model: SemanticRenderModel;
  canonical: string;
  digest: string;
}

/** Build the semantic render model over the verified public projection and digest it. Pure. */
export function renderSpecDigest(spec: FYDSiteSpec, graph: ObjectGraph): RenderReceipt {
  const projection = buildVerifiedPublicProjection(graph);
  const model = buildSemanticRenderModel(spec, projection);
  const canonical = canonicalizeModel(model);
  return { model, canonical, digest: sha256Hex(canonical) };
}
