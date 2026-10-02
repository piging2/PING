/**
 * Throwaway eval harness (not a real test): renders the golden customer
 * surface through the same server pipeline as /build/[siteId]/page.tsx
 * and writes a standalone HTML file for width evaluation. Deleted after
 * the eval run.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { verifyObjectGraph } from "@/fyd/builder/object-builder";
import { planSite } from "@/fyd/builder/planner";
import { strategyForSite } from "@/fyd/builder/strategy-for-site";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import {
  galleryMediaFor,
  heroMediaFor,
  listObjectMedia,
} from "@/fyd/media/select";
import { schemaRole } from "@/fyd/sitespec/schemas";
import {
  SitePageView,
  buildRenderContext,
} from "@/fyd/components/renderer";
import type { DisplayMedia } from "@/fyd/media/select";

const SITE = process.env.FYD_EVAL_SITE ?? "ping-fyd";

test("zz-eval render surface", async () => {
  const projection = await getPingObjectGraph(SITE);
  const { graph, meta, presentationIntent } = projection;
  const verified = verifyObjectGraph({ tenantId: SITE }, projection);
  const planned = planSite({
    ctx: { tenantId: SITE },
    graph: verified.graph,
    vector: strategyForSite(SITE, verified.graph).vector,
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
    attestation: verified.attestation,
  });
  const spec = applyPresentationIntent(
    planned.spec,
    presentationIntent,
    graph,
  ).spec;
  const heroMedia = heroMediaFor(SITE, graph, spec.ownerObjectId);
  const galleryMedia = galleryMediaFor(SITE, graph, spec.ownerObjectId);
  const objectMedia: Record<string, DisplayMedia[]> = {};
  for (const o of graph.objects.filter(
    (o) =>
      o.visibility === "public" &&
      o.id !== spec.ownerObjectId &&
      ["service", "product", "person", "location"].includes(
        schemaRole(o.schema ?? "") ?? "",
      ),
  )) {
    const list = listObjectMedia(SITE, graph, o.id).filter(
      (m) => m.role !== "logo",
    );
    if (list.length > 0) objectMedia[o.id] = list;
  }
  const homePage = spec.pages[0];
  if (
    homePage &&
    galleryMedia.length > 0 &&
    !homePage.sections.some((s) => s.component === "Gallery")
  ) {
    homePage.sections.push({
      id: `${homePage.slug}:Gallery:${homePage.sections.length}`,
      component: "Gallery",
      query: { kind: "static" },
      presentation: { heading: "Gallery" },
    });
  }
  const ctx = buildRenderContext(spec, graph, {
    viewerId: null,
    displayName: null,
  }) as Record<string, unknown>;
  ctx.siteId = SITE;
  ctx.heroMedia = heroMedia;
  ctx.galleryMedia = galleryMedia;
  ctx.objectMedia = objectMedia;
  const body = renderToStaticMarkup(
    React.createElement(
      "main",
      { className: "fyd-safe-area min-h-screen bg-background" },
      React.createElement(SitePageView, {
        page: spec.pages[0],
        ctx: ctx as never,
      }),
    ),
  );
  const absolutized = body.replaceAll(
    'src="/fyd-media/',
    'src="http://127.0.0.1:3100/fyd-media/',
  );
  const css = await fetch(
    "http://127.0.0.1:3100/_next/static/css/app/layout.css",
  ).then((r) => r.text());
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${SITE} surface eval</title><style>${css}</style></head><body>${absolutized}</body></html>`;
  mkdirSync("/tmp/fyd-eval", { recursive: true });
  writeFileSync(`/tmp/fyd-eval/${SITE}.html`, html);
  console.log("wrote", html.length, "bytes for", SITE);
}, 120000);
