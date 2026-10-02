/** TEMP DIAGNOSTIC: per-tenant planned home sections (real projections). */
import { getPingObjectGraphSync } from "@/fyd/data/ping-object-source";
import { planSite } from "../planner";
import { COPPERSMITH_VECTOR, PING_DOGFOOD_VECTOR } from "../dimensions";
import { join } from "node:path";

process.env.FYD_PROJECTION_DIR = join(
  __dirname,
  "..",
  "..",
  "object",
  "__tests__",
  "fixtures",
  "projections",
);

test("temp: real tenant home sections", () => {
  for (const [site, vector] of [
    ["coppersmith-plumbing", COPPERSMITH_VECTOR],
    ["happy-place", PING_DOGFOOD_VECTOR],
  ] as const) {
    const graph = getPingObjectGraphSync(site).graph;
    const planned = planSite({
      ctx: { tenantId: site },
      graph,
      vector,
      generatedAt: "2026-09-22T00:00:00.000Z",
    });
    const home = planned.spec.pages.find((p) => p.slug === "home")!;
    const comps = home.sections.map((s) => s.component);
    console.log(site, "->", JSON.stringify(comps));
    console.log(
      site,
      "CTA/ObjectRail eligible:",
      planned.eligibility.eligible["CTA"],
      planned.eligibility.eligible["ObjectRail"],
      "featureable:",
      planned.eligibility.counts.featureable,
    );
    for (const p of planned.spec.pages) {
      for (const s of p.sections) {
        if (!(planned.eligibility.eligible[s.component] ?? false)) {
          console.log("UNGROUNDED:", site, p.slug, s.component);
        }
      }
    }
  }
});
