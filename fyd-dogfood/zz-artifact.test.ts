/**
 * TEMPORARY one-off: render the ping-fyd composed site to static HTML
 * artifacts for the dogfood report. Deleted after the run.
 *
 * The live /build/ping-fyd route is 404'd by the Circle-Only Product
 * Reset middleware, so these artifacts are the real renderer output
 * (same compose pipeline as the route) wrapped in a standalone HTML
 * document with the compiled Tailwind stylesheet inlined. Screenshot-ready:
 * open in a browser at 1440 / 375 / 320.
 */
import { renderToStaticMarkup } from "react-dom/server";
import * as fs from "fs";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { verifyObjectGraph } from "@/fyd/builder/object-builder";
import { planSite } from "@/fyd/builder/planner";
import { strategyForSite } from "@/fyd/builder/strategy-for-site";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import { buildRenderContext, SitePageView } from "../renderer";
import type { FYDSiteSpec } from "@/fyd/sitespec/types";

const SITE_ID = "ping-fyd";
const OUT_DIR = "/home/nolan/ping/var/fyd-dogfood-renders";
const CSS_PATH = "/tmp/fyd-site.css";

test("artifact: write ping-fyd static HTML renders", async () => {
  const projection = await getPingObjectGraph(SITE_ID);
  const verified = verifyObjectGraph({ tenantId: SITE_ID }, projection);
  const strategy = strategyForSite(SITE_ID, verified.graph);
  const planned = planSite({
    ctx: { tenantId: SITE_ID },
    graph: verified.graph,
    vector: strategy.vector,
    generatedAt: projection.meta.generatedAt,
    attestation: verified.attestation,
  });
  const spec: FYDSiteSpec = applyPresentationIntent(
    planned.spec,
    projection.presentationIntent,
    verified.graph,
  ).spec;
  const ctx = {
    ...buildRenderContext(spec, verified.graph, {
      viewerId: null,
      displayName: null,
    }),
    siteId: SITE_ID,
  };
  const css = fs.readFileSync(CSS_PATH, "utf8");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const page of spec.pages) {
    const body = renderToStaticMarkup(SitePageView({ page, ctx }));
    const nav = spec.navigation
      .map(
        (n) =>
          `<span style="display:inline-block;padding:8px 16px;border-radius:6px;font-size:14px;font-weight:500;${n.pageSlug === page.slug ? "background:#C9A227;color:#1c1917;" : "color:#555;"}">${n.label}</span>`,
      )
      .join("");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${page.title} | PING Social (FYD dogfood static render)</title>
<style>${css}</style>
</head>
<body class="bg-background">
<!--
  FYD DOGFOOD STATIC RENDER ARTIFACT
  Tenant: ping-fyd (PING Social) | strategy: TECHNOLOGY
  Produced by the real compose pipeline (projection -> verify -> strategy ->
  plan -> presentation intent -> renderer), NOT the live /build/ping-fyd
  route (404'd by the Circle-Only Product Reset middleware as of 2026-09-22).
  Evidence basis: 7 owner-asserted objects (owner:tenant-config), no scraping.
  heroMedia: null (no acquired PING media yet) -> honest typographic hero.
  Evaluation checklist: mobile layout at 375/320, contact one glance away
  (Hero tel: button), 4 services visible, Ask FYD section present and
  evidence-framed, no invented facts, gold/purple from theme tokens.
-->
<header style="border-bottom:1px solid #e5e5e5;padding:16px;">
<div style="max-width:80rem;margin:0 auto;padding:0 16px;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#C9A227;">PING SOCIAL</p>
<nav style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">${nav}</nav>
</div>
</header>
<main>${body}</main>
<footer style="border-top:1px solid #e5e5e5;margin-top:32px;padding:24px 16px;font-size:13px;color:#555;">
<div style="max-width:80rem;margin:0 auto;">
<p>Static render of the FYD-composed PING Social site. All facts are owner-asserted (owner:tenant-config); nothing scraped, nothing invented.</p>
</div>
</footer>
</body>
</html>`;
    const out = `${OUT_DIR}/ping-fyd-${page.slug}.html`;
    fs.writeFileSync(out, html);
    console.log("wrote " + out + " (" + html.length + " bytes)");
  }
}, 60000);
