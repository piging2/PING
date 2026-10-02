import { planSite, type PlannedSite } from "../planner";
import { SITE_STRATEGIES, SITE_STRATEGY_NAMES } from "../strategies";
import { makeObject, makeRelationship } from "./fixtures";

const graph = {
  objects: [
    makeObject("biz-strategy", "ping.social.business@1", {
      title: "Acme Strategy Fixture",
      description: "A minimal fixture for strategy composition tests.",
      fields: { phone: "555-0300" },
    }),
    makeObject("svc-one", "ping.social.service@1", {
      title: "Only Service",
      description: "The single service.",
    }),
  ],
  relationships: [makeRelationship("rel-1", "biz-strategy", "provides", "svc-one")],
};

test("probe: section orders per strategy", () => {
  for (const name of SITE_STRATEGY_NAMES) {
    const p: PlannedSite = planSite({
      ctx: { tenantId: "probe" },
      graph,
      vector: SITE_STRATEGIES[name].vector,
      generatedAt: "2026-09-22T17:00:00.000Z",
    });
    const home = p.spec.pages.find((pg) => pg.slug === "home")!;
    console.log("PROBE " + name + " home: " + home.sections.map((s) => s.component).join(","));
    console.log(
      "PROBE " + name + " pages: " + p.spec.pages.map((pg) => pg.slug + "=" + pg.sections.length).join(" "),
    );
  }
});
