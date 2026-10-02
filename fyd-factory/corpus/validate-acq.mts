// validate-acq.mts: run every fixture's index.html through runExtractionPipeline
// and print one JSON summary per fixture. Read-only wrt the repo.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runExtractionPipeline } from "/home/nolan/projects/ping/src/fyd/proceduralize/proceduralizer";

const FIX = "/home/nolan/fyd-acq-fixtures";
const OBSERVED = "2026-09-23T18:30:00Z";
const out: unknown[] = [];

for (const slug of readdirSync(FIX, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== ".")
    .map((d) => d.name)
    .sort()) {
  const raw = readFileSync(join(FIX, slug, "index.html"), "utf8");
  const { graph, report, fields } = await runExtractionPipeline(
    [{ url: `https://${slug}.example.com/`, sourceType: "html", discoveredAt: OBSERVED, raw, ok: true, status: 200 }],
    { sourceUrl: `https://${slug}.example.com/`, observedAt: OBSERVED, controllerId: "identity_fyd_acq_corpus" },
  );
  const biz = graph.objects.find((o) => o.schema === "ping.social.business@1") as
    | { fields: Record<string, unknown> }
    | undefined;
  out.push({
    slug,
    bytes: raw.length,
    factsDiscovered: report.factsDiscovered,
    factsByClass: report.factsByClass,
    factsBySource: report.factsBySource,
    graphNodesVisited: report.graphNodesVisited,
    objectsGenerated: report.objectsGenerated,
    relationshipsGenerated: report.relationshipsGenerated,
    privateWithheld: report.privateWithheld,
    unsupportedCount: report.unsupported.length,
    unsupportedKinds: [...new Set(report.unsupported.map((u) => (u as { kind?: string }).kind ?? "unknown"))],
    businessFields: biz ? { phone: biz.fields.phone ?? null, hours: biz.fields.hours ?? null } : null,
    objectSchemas: [...new Set(graph.objects.map((o) => o.schema))],
    serviceCount: graph.objects.filter((o) => o.schema === "ping.social.service@1").length,
    personCount: graph.objects.filter((o) => o.schema === "ping.social.person@1").length,
    locationCount: graph.objects.filter((o) => o.schema === "ping.social.location@1").length,
  });
}
console.log(JSON.stringify(out, null, 2));
