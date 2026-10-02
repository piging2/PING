/**
 * RAIL-UNBOUND-DESCRIPTION repro.
 * Usage: node repro.cjs <fixture.json>
 * Exit 0 + prints verdicts. PROBE=1 also dumps which render path emitted it.
 *
 * Verdicts:
 *  - UNBOUND_RENDERED: description with no provenance appears in HTML (bug)
 *  - BOUND_RENDERED:   description with provenance appears in HTML (must hold)
 */
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import {
  buildRenderContext,
  SitePageView,
} from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { renderToStaticMarkup } from "react-dom/server";
import * as fs from "fs";

const fixturePath = process.argv[2];
const doc = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const graph = structuredClone(doc.graph);

const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T12:00:00.000Z" });
const viewer = { viewerId: null as string | null, displayName: null as string | null };
const ctx = buildRenderContext(spec, graph, viewer, []);
const bodies: string[] = [];
for (const page of spec.pages ?? []) {
  bodies.push(renderToStaticMarkup(SitePageView({ page, ctx }) as any) as string);
}
const html =
  `<!DOCTYPE html><html lang="en"><head>` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `</head><body>` + bodies.join("\n") + `</body></html>`;

const UNBOUND_SENTINEL = "REPRO UNBOUND CLAIM";
const BOUND_SENTINEL = "REPRO BOUND CLAIM";

const unboundRendered = html.includes(UNBOUND_SENTINEL);
const boundRendered = html.includes(BOUND_SENTINEL);

if (process.env.DUMP_HTML) fs.writeFileSync(process.env.DUMP_HTML, html, "utf8");

console.log(JSON.stringify({
  fixture: fixturePath.split("/").pop(),
  pages: (spec.pages ?? []).length,
  sections: (spec.pages ?? []).reduce((n: number, p: any) => n + (p.sections ?? []).length, 0),
  unboundRendered,
  boundRendered,
  verdict: !unboundRendered && boundRendered ? "FIXED_OK" : unboundRendered ? "BUG_PRESENT" : "INCONCLUSIVE",
}));

if (process.env.PROBE === "1" && unboundRendered) {
  const i = html.indexOf(UNBOUND_SENTINEL);
  console.log("CONTEXT: " + html.slice(Math.max(0, i - 400), i + 100).replace(/\n/g, " "));
}
