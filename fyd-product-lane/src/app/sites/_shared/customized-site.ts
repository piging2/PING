/**
 * Shared server pipeline for the FYD demo site pages (Lane D).
 *
 * ONE generic pipeline for every site, no per-customer branching:
 *   projection -> VISIBILITY (owner policy + viewer context) ->
 *   generateSiteSpec -> PRESENTATION INTENT (approved directives) ->
 *   hero media (owner override honored) -> validated spec.
 *
 * The public pages always render the PUBLIC viewer projection:
 * SOURCE VALUE + VISIBILITY POLICY + OWNER OVERRIDE + VIEWER CONTEXT ->
 * PROJECTED VALUE. Source facts are never rewritten; the owner preview
 * (role "owner") sees source values verbatim.
 *
 * SERVER ONLY. Never import from a client component.
 */

import { loadCustomizedSite } from "@/fyd/customize/server";
import { heroMediaWithOverride, type DisplayMedia } from "@/fyd/customize/hero-media";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { clientGraph } from "./client-graph";

export interface PublicSite {
  siteId: string;
  spec: Parameters<typeof validateSiteSpec>[0];
  graph: ReturnType<typeof clientGraph>;
  findings: ReturnType<typeof validateSiteSpec>;
  renderable: boolean;
  heroMedia: DisplayMedia | null;
  /** Owner visibility decisions in force (for the demo panel). */
  visibilityDecisions: { objectId: string; field: string; policy: string }[];
}

export async function loadPublicSite(siteId: string): Promise<PublicSite> {
  // Public viewer: the page the world sees.
  const site = await loadCustomizedSite(siteId, {
    viewerId: null,
    displayName: null,
    role: "public",
  });
  // Hero media honoring an approved owner override ("use this project
  // photo as the hero"); the media lane still resolves the asset.
  const heroMedia = heroMediaWithOverride(siteId, site.projectedGraph, site.spec);
  const knownSchemas = new Set(site.projectedGraph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(site.spec, knownSchemas);
  return {
    siteId,
    spec: site.spec,
    graph: clientGraph(site.projectedGraph),
    findings,
    renderable: isRenderable(findings),
    heroMedia,
    visibilityDecisions: site.visibilityDecisions.map((d) => ({
      objectId: d.objectId,
      field: d.field,
      policy: d.policy,
    })),
  };
}

export function ownerName(
  graph: { objects: { schema: string; visibility: string; title: string }[] },
  siteId: string,
): string {
  const owner = graph.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  const name = owner?.title?.trim();
  return name ? name : siteId;
}
