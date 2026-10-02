/**
 * Eval harness: renders the golden customer surface (SitePageView) for a
 * site id through the same server pipeline as /build/[siteId]/page.tsx,
 * and writes a standalone HTML file with the dev server's compiled CSS
 * inlined. Disposable: used for mobile-architecture width evaluation.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { verifyObjectGraph } from "@/fyd/builder/object-builder";
import { planSite } from "@/fyd/builder/planner";
import { strategyForSite } from "@/fyd/builder/strategy-for-site";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import {
  galleryMediaFor,
  heroMediaFor,
  listObjectMedia,
} from "@/fyd/media/select";
import { schemaRole } from "@/fyd/sitespec/schemas";
import { SitePageView, buildRenderContext } from "@/fyd/components/renderer";
import type { DisplayMedia } from "@/fyd/media/select";

const siteId = process.argv[2] ?? "ping-fyd";
const outPath = process.argv[3] ?? "/tmp/fyd-eval/surface.html";

async function main() {
  const projection = await getPingObjectGraph(siteId);
  const { graph, meta, presentationIntent } = projection;
  const verified = verifyObjectGraph({ tenantId: siteId }, projection);
  const planned = planSite({
    ctx: { tenantId: siteId },
    graph: verified.graph,
    vector: strategyForSite(siteId, verified.graph).vector,
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
    attestation: verified.attestation,
  });
  const base = planned.spec;
  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;
  const heroMedia = heroMediaFor(siteId, graph, spec.ownerObjectId);
  const galleryMedia = galleryMediaFor(siteId, graph, spec.ownerObjectId);
  const objectMedia: Record<string, DisplayMedia[]> = {};
  for (const o of graph.objects.filter(
    (o) =>
      o.visibility === "public" &&
      o.id !== spec.ownerObjectId &&
      ["service", "product", "person", "location"].includes(
        schemaRole(o.schema ?? "") ?? "",
      ),
  )) {
    const list = listObjectMedia(siteId, graph, o.id).filter(
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
  });
  (ctx as { siteId?: string }).siteId = siteId;
  (ctx as { heroMedia?: DisplayMedia | null }).heroMedia = heroMedia;
  (ctx as { galleryMedia?: DisplayMedia[] }).galleryMedia = galleryMedia;
  (ctx as { objectMedia?: Record<string, DisplayMedia[]> }).objectMedia =
    objectMedia;
  const body = renderToStaticMarkup(
    <main className="fyd-safe-area min-h-screen bg-background">
      <SitePageView page={spec.pages[0]} ctx={ctx} />
    </main>,
  );
  // Absolute media URLs so the file renders outside the app server.
  const absolutized = body.replaceAll(
    'src="/fyd-media/',
    'src="http://127.0.0.1:3100/fyd-media/',
  );
  // Compiled Tailwind from the dev server.
  const cssRes = await fetch(
    "http://127.0.0.1:3100/_next/static/css/app/layout.css",
  );
  const css = await cssRes.text();
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${siteId} surface eval</title><style>${css}</style></head><body>${absolutized}</body></html>`;
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("/tmp/fyd-eval", { recursive: true });
  writeFileSync(outPath, html);
  console.log("wrote", outPath, html.length, "bytes");
}

main().catch((e) => {
  console.error("RENDER FAILED:", e.message);
  process.exit(1);
});
