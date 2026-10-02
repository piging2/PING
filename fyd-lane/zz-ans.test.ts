import { readFileSync } from "fs";
import { join } from "path";
import { runExtractionPipeline } from "../proceduralizer";
import { buildAskContext, composeAnswer } from "../../../lib/ping/ask-composer";

test("print", async () => {
  const raw = readFileSync(join(__dirname, "zz-ans.json"), "utf-8");
  const out = await runExtractionPipeline(
    [
      {
        url: "https://example.test/",
        sourceType: "json-ld",
        discoveredAt: "2026-09-21T12:00:00Z",
        raw,
        ok: true,
        status: 200,
      },
    ],
    {
      sourceUrl: "https://example.test/",
      observedAt: "2026-09-21T12:00:00Z",
      controllerId: "x",
    },
  );
  const g = out.graph;
  const b = g.objects.find((o) => o.schema === "ping.social.business@1");
  if (!b) throw new Error("no business");
  const ctx = buildAskContext({
    viewer: { id: null, displayName: null },
    target: b,
    relatedObjects: g.objects.filter((o) => o.id !== b.id),
    relationships: g.relationships,
    plan: null,
    fieldClasses: g.fieldClasses ?? {},
  });
  const a = composeAnswer(
    ctx,
    "What services does this business offer, and how do you know?",
  );
  console.log("ANSWER>>>" + a.answer + "<<<");
  console.log("CLAIMS>>>" + JSON.stringify(a.claimClassifications) + "<<<");
  console.log("URLS>>>" + JSON.stringify(a.sourceUrls) + "<<<");
});
