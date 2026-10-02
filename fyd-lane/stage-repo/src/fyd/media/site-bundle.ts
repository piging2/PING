/**
 * FYD site bundle: the read-only seam between the PING-backed site
 * projections and the server-side Ask FYD visitor API.
 *
 * A SiteBundle joins one demo business's object graph (the canonical
 * projection written by the PING-side dump) with the SiteSpec the generator
 * produces from it, exactly as the public /sites pages render it (same
 * projection, same generator inputs), plus the validator findings and a
 * renderability verdict.
 *
 * No customer fact is hardcoded here: the graph, the spec compile pins, and
 * the business name all come from the PING-backed projection. This keeps
 * Ask FYD answers and the rendered pages on the same facts: both read the
 * same projection.
 *
 * This module owns this contract. The visitor route codes against it; the
 * media lane owns the contents of mediaManifest (null until it ships).
 */
import {
  getPingObjectGraphSync,
  listPingSiteIdsSync,
} from "../data/ping-object-source";
import { generateSiteSpec } from "../proceduralize/generator";
import { isRenderable, validateSiteSpec } from "../sitespec/validator";
import type { FYDFinding, FYDSiteSpec, ObjectGraph } from "../sitespec/types";

/** One media item in the bundle manifest. Minimal until the media lane ships. */
export interface SiteBundleMediaItem {
  id: string;
  sourceUrl: string;
  digest: string | null;
}

/** Media manifest for a site. Null until the media lane produces manifests. */
export interface MediaManifest {
  siteId: string;
  items: SiteBundleMediaItem[];
}

export interface SiteBundle {
  siteId: string;
  businessName: string;
  graph: ObjectGraph;
  spec: FYDSiteSpec;
  findings: FYDFinding[];
  renderable: boolean;
  mediaManifest: MediaManifest | null;
}

function businessNameFor(graph: ObjectGraph, spec: FYDSiteSpec, siteId: string): string {
  const owner = graph.objects.find((o) => o.id === spec.ownerObjectId);
  if (owner && owner.title.trim().length > 0) return owner.title;
  const business = graph.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  if (business && business.title.trim().length > 0) return business.title;
  return siteId;
}

function buildBundle(siteId: string): SiteBundle {
  const { graph, meta } = getPingObjectGraphSync(siteId);
  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
  const findings = validateSiteSpec(spec, new Set(graph.objects.map((o) => o.schema)));
  return {
    siteId,
    businessName: businessNameFor(graph, spec, siteId),
    graph,
    spec,
    findings,
    renderable: isRenderable(findings),
    // The media lane owns this value; until it ships, the bundle carries null.
    mediaManifest: null,
  };
}

/**
 * Return the bundle for a known site id, or null for unknown ids.
 *
 * Deliberately uncached: the bundle is rebuilt from the current projection
 * on every call, so a PING-side regen is visible to Ask FYD immediately.
 * The graphs are tiny; freshness outranks the memo.
 */
export function getSiteBundle(siteId: string): SiteBundle | null {
  if (!listPingSiteIdsSync().includes(siteId)) return null;
  return buildBundle(siteId);
}

/** Site ids this bundle module can serve: the PING projections on disk. */
export function listSiteIds(): string[] {
  return listPingSiteIdsSync();
}
