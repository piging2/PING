import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { safeFetchPage } from "/home/nolan/projects/ping/src/fyd/net/safe-fetch.ts";
import { runExtractionPipeline, type AcquiredSource } from "/home/nolan/projects/ping/src/fyd/proceduralize/proceduralizer.ts";

const URL = "https://www.coppersmithplumbing.com/";

console.log("LINK 1: SAFE FETCH (real safeFetchPage, real DNS, real network)");
const res = await safeFetchPage(URL, { maxBytes: 2 * 1024 * 1024, timeoutMs: 25000 });
if (!res.ok) {
  console.log("FETCH FAILED: " + res.reason);
  process.exit(2);
}
console.log(`ok: fetched ${res.bytes.length} bytes, finalUrl=${res.finalUrl}, ct=${res.contentType}, hops=${res.redirectChain.length}`);

console.log("LINK 2: RAW OBSERVATION (bytes persisted + hashed, corpus-style)");
const digest = createHash("sha256").update(res.bytes).digest("hex");
mkdirSync("/tmp/lane-e/raw/coppersmith-plumbing", { recursive: true });
writeFileSync("/tmp/lane-e/raw/coppersmith-plumbing/index.html", res.bytes);
writeFileSync("/tmp/lane-e/raw/coppersmith-plumbing/SHA256.txt", digest + "  index.html\n");
console.log(`stored: /tmp/lane-e/raw/coppersmith-plumbing/index.html sha256=${digest.slice(0, 32)}...`);

console.log("LINK 3+4: EVIDENCE -> OBJECT GRAPH (real runExtractionPipeline)");
const observedAt = new Date().toISOString();
const sources: AcquiredSource[] = [{
  url: URL,
  sourceType: "html",
  discoveredAt: observedAt,
  raw: res.bytes.toString("utf8"),
  ok: true,
  status: 200,
}];
const { graph, report } = await runExtractionPipeline(sources, {
  sourceUrl: URL,
  observedAt,
  controllerId: "lane-e-falsifier",
});
console.log(`factsDiscovered=${report.factsDiscovered} DIRECT_FACT=${report.factsByClass.DIRECT_FACT ?? 0} bySource=${JSON.stringify(report.factsBySource)}`);
console.log(`graphNodesVisited=${report.graphNodesVisited} objectsGenerated=${report.objectsGenerated} relationshipsGenerated=${report.relationshipsGenerated} privateWithheld=${report.privateWithheld}`);
const biz = graph.objects.find((o: any) => o.schema === "ping.social.business@1") as any;
if (biz) {
  const fields = biz.fields as Record<string, unknown>;
  const classes = (graph as any).fieldClasses?.[biz.id] ?? {};
  console.log(`business node id=${biz.id} title=${JSON.stringify(fields["title"])} phone=${JSON.stringify(fields["phone"])} phoneClass=${classes["phone"]} titleClass=${classes["title"]}`);
  console.log(`schemas in graph: ${[...new Set(graph.objects.map((o: any) => o.schema))].join(", ")}`);
  console.log(`predicates: ${[...new Set(graph.relationships.map((r: any) => r.predicate))].join(", ")}`);
} else {
  console.log("NO business object in graph");
}
writeFileSync("/tmp/lane-e/chain-graph.json", JSON.stringify(graph, null, 2));
writeFileSync("/tmp/lane-e/chain-report.json", JSON.stringify(report, null, 2));
console.log("artifacts: /tmp/lane-e/chain-graph.json /tmp/lane-e/chain-report.json");
