/** Temporary probe: real captures -> services -> Ask. Deleted after measurement. */
import { readFileSync } from "fs";
import { join } from "path";
import { runExtractionPipeline } from "../proceduralizer";
import { buildAskContext, composeAnswer } from "../../../lib/ping/ask-composer";

const Q = "What services does this business offer, and how do you know?";
const RAW = join(__dirname, "..", "raw");

async function probe(dir: string, url: string) {
  const html = readFileSync(join(RAW, dir, "index.html"), "utf-8");
  const out = await runExtractionPipeline(
    [{ url, sourceType: "html", discoveredAt: "2026-09-21T12:00:00Z", raw: html, ok: true, status: 200 }],
    { sourceUrl: url, observedAt: "2026-09-21T12:00:00Z", controllerId: "probe" },
  );
  const g = out.graph;
  const services = g.objects.filter((o) => o.schema === "ping.social.service@1");
  const offers = g.objects.filter((o) => o.schema === "ping.social.offer@1");
  const business = g.objects.find((o) => o.schema === "ping.social.business@1");
  const relPreds = g.relationships.map((r) => r.predicate).sort();
  console.log(`DIR=${dir} objects=${g.objects.length} services=${services.length} offers=${offers.length}`);
  console.log(`  service titles: ${services.map((s) => s.title).join(" | ") || "(none)"}`);
  console.log(`  rel predicates: ${[...new Set(relPreds)].join(",")}`);
  if (business) {
    const ctx = buildAskContext({
      viewer: { id: null, displayName: null },
      target: business,
      relatedObjects: g.objects.filter((o) => o.id !== business.id),
      relationships: g.relationships,
      plan: null,
      fieldClasses: g.fieldClasses ?? {},
    });
    const a = composeAnswer(ctx, Q);
    console.log(`  ask partial=${a.partial} unknowns=${JSON.stringify(a.unknowns)}`);
    console.log(`  ask answer: ${a.answer.slice(0, 300)}`);
    console.log(`  claims: ${JSON.stringify(a.claimClassifications)}`);
    console.log(`  sourceUrls: ${JSON.stringify(a.sourceUrls)}`);
  }
}

describe("probe", () => {
  test("measure", async () => {
    await probe("coppersmith-plumbing", "https://www.coppersmithplumbing.com/");
    await probe("happy-place-platform", "https://happy-place-platform.vercel.app/");
  });
});
