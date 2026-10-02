#!/bin/bash
# dump-details.sh: on-Pig detail dump for the cohort (proceduralizer only).
cat > /home/nolan/dump-details.mts <<'EOF'
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runExtractionPipeline } from "/home/nolan/projects/ping/src/fyd/proceduralize/proceduralizer";

const rawRoot = "/home/nolan/cohort-raw";
const sites = ["bemis-electric","claire-codling","dalby-cpa","gear-junction","hand-law","suehiro","white-star"];
for (const sid of sites) {
  const dir = join(rawRoot, sid);
  const lines = readFileSync(join(dir, "manifest.jsonl"), "utf8").trim().split("\n");
  const pages = [];
  for (const l of lines) {
    let e: any; try { e = JSON.parse(l); } catch { continue; }
    if (e.page === "robots.txt" || e.page === "__blocked__") continue;
    if (typeof e.page !== "string") continue;
    const pg = String(e.page);
    let htmlFile: string | null = null;
    if (pg === "home") htmlFile = "page-00-home.html";
    else { const m = pg.match(/^subpage-(\d+)$/); if (m) htmlFile = `page-${m[1].padStart(2,"0")}.html`; }
    if (!htmlFile || e.status !== 200) continue;
    let html: string; try { html = readFileSync(join(dir, htmlFile), "utf8"); } catch { continue; }
    if (!html || html.length < 500) continue;
    pages.push({ url: e.url, sourceType: "html", discoveredAt: "2026-09-24T02:54:04Z", raw: html, ok: true, status: 200 });
  }
  const out = await runExtractionPipeline(pages as never, { sourceUrl: "https://example.com/", observedAt: "2026-09-24T02:54:04Z", controllerId: "night_cohort" } as never);
  const r = out.report as any;
  const unmapped: Record<string, number> = {};
  for (const u of r.unsupported ?? []) {
    if (u.kind === "unmapped-property") {
      const key = String((u as any).property);
      unmapped[key] = (unmapped[key] ?? 0) + 1;
    }
  }
  const predCount: Record<string, number> = {};
  for (const rel of (out.graph as any).relationships ?? []) {
    predCount[(rel as any).predicate] = (predCount[(rel as any).predicate] ?? 0) + 1;
  }
  console.log(JSON.stringify({
    site: sid, pages: pages.length,
    factsBySource: r.factsBySource,
    unmappedProperties: unmapped,
    objectSchemas: [...new Set(((out.graph as any).objects ?? []).map((o: any) => o.schema))],
    relationshipPredicates: predCount,
    droppedRelationships: (out.graph as any).droppedRelationships,
    factsDiscovered: r.factsDiscovered,
  }));
}
EOF
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/dump-details.mts
