/**
 * FYD golden customer route: /build/[siteId].
 *
 * The dynamic composition route. Same pipeline as the /sites/* demos
 * (PING-backed object graph -> object-builder verification -> site
 * planner -> owner presentation intent -> hero media -> validate ->
 * render), but the chrome is the
 * customer own: no PING marketing header/footer (the root layout treats
 * /build/* as chromeless) and no FYD demo framing. The page renders the
 * generic BuildClient composition shell: page content in the center,
 * ObjectRail in the margin, Ask FYD from the spec own sections.
 *
 * Unknown site ids 404. An invalid spec never renders (renderable gate).
 * No customer fact is hardcoded here: names, sections, and objects all
 * come from the projection through the spec.
 */

import { notFound } from "next/navigation";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { verifyObjectGraph } from "@/fyd/builder/object-builder";
import { planSite } from "@/fyd/builder/planner";
import { strategyForSite } from "@/fyd/builder/strategy-for-site";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import {
  galleryMediaFor,
  heroMediaFor,
  listObjectMedia,
} from "@/fyd/media/select";
import type { DisplayMedia } from "@/fyd/media/select";
import { schemaRole } from "@/fyd/sitespec/schemas";
import { BuildClient } from "./build-client";

function ownerName(
  graph: { objects: { schema: string; visibility: string; title: string }[] },
  fallback: string,
): string {
  const owner = graph.objects.find(
    (o) => schemaRole(o.schema) === "business" && o.visibility === "public",
  );
  const name = owner?.title?.trim();
  return name ? name : fallback;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const projection = await getPingObjectGraph(siteId).catch(() => null);
  if (!projection) return { title: "Site not found" };
  const name = ownerName(projection.graph, siteId);
  return {
    title: name,
    description: "A site composed by FYD from the business object graph.",
  };
}

export default async function BuildSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  // Fail closed on unknown sites: getPingObjectGraph throws when the
  // projection is missing, which becomes a 404, never a 500 with fiction.
  const projection = await getPingObjectGraph(siteId).catch(() => null);
  if (!projection) notFound();
  const { graph, meta, presentationIntent } = projection;
  // OBJECT BUILDER boundary: the graph is verified and attested before
  // the website builder plans anything from it. The tenant context is the
  // site id, so a cross-tenant graph cannot reach the planner.
  const verified = verifyObjectGraph({ tenantId: siteId }, projection);
  // WEBSITE BUILDER: deterministic planning from the verified graph with
  // this tenant's named site strategy (explicit pin > graph inference > neutral
  // default) resolving the composition operating point. The planner never
  // manufactures business facts: every section comes from the data-driven
  // generator, and every generated copy slot is evidence-bound and
  // verified before the spec is returned.
  const planned = planSite({
    ctx: { tenantId: siteId },
    graph: verified.graph,
    vector: strategyForSite(siteId, verified.graph).vector,
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
    attestation: verified.attestation,
  });
  const base = planned.spec;
  // PRESENTATION INTENT layer: approved owner directives applied OVER the
  // compiled spec. Facts (graph) and design system (theme) are untouched.
  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;
  // Hero media, resolved once per page load at the server render seam.
  // Null when the owner has no acquired media.
  const heroMedia = heroMediaFor(siteId, graph, spec.ownerObjectId);
  // Gallery + per-object media, resolved once per page load at the same
  // seam from pipeline-ingested manifests. DisplayMedia carries
  // FYD-served derivative URLs (never hotlinks); each item keeps its
  // sourceUrl/digest/observedAt for provenance disclosure. Empty when
  // the site has no acquired media: surfaces render honest fallbacks.
  const galleryMedia = galleryMediaFor(siteId, graph, spec.ownerObjectId);
  const cardObjects = graph.objects.filter(
    (o) =>
      o.visibility === "public" &&
      o.id !== spec.ownerObjectId &&
      ["service", "product", "person", "location"].includes(
        schemaRole(o.schema ?? "") ?? "",
      ),
  );
  const objectMedia: Record<string, DisplayMedia[]> = {};
  for (const o of cardObjects) {
    const list = listObjectMedia(siteId, graph, o.id).filter(
      (m) => m.role !== "logo",
    );
    if (list.length > 0) objectMedia[o.id] = list;
  }
  // Gallery section insertion (compose lane): the planner does not see
  // media eligibility, so the render seam adds the Gallery section to
  // the home page deterministically when (and only when) acquired
  // gallery media exists. Stable id per the validator's own formula
  // (pageSlug + ":" + component + ":" + index); static query because the
  // media arrives through render context, not the graph query. The
  // Gallery renderer still gates on non-empty media, so this never
  // renders an empty section.
  const homePage = spec.pages[0];
  // Immutable insertion: the planner's spec is never mutated in place.
  // (The old code pushed onto homePage.sections; a regenerated spec must
  // not carry mutations from a previous render.)
  const pageSpec =
    homePage &&
    galleryMedia.length > 0 &&
    !homePage.sections.some((s) => s.component === "Gallery")
      ? {
          ...spec,
          pages: [
            {
              ...homePage,
              sections: [
                ...homePage.sections,
                {
                  id: `${homePage.slug}:Gallery:${homePage.sections.length}`,
                  component: "Gallery",
                  query: { kind: "static" },
                  presentation: { heading: "Gallery" },
                } as const,
              ],
            },
            ...spec.pages.slice(1),
          ],
        }
      : spec;
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(pageSpec, knownSchemas);
  const renderable = isRenderable(findings);

  return (
    <main className="fyd-safe-area min-h-screen bg-background">
      <BuildClient
        spec={pageSpec}
        graph={graph}
        findings={findings}
        renderable={renderable}
        siteId={siteId}
        heroMedia={heroMedia}
        galleryMedia={galleryMedia}
        objectMedia={objectMedia}
      />
    </main>
  );
}
