import { renderToStaticMarkup } from "react-dom/server";
import { PublicFamilyPage } from "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/src/fyd/family/family-page";
import { COPPERSMITH_GRAPH as graph } from "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/src/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { planPageFromGraph } from "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/src/fyd/proceduralize/planner";
import * as fs from "fs";

function main() {
  const plan = planPageFromGraph(graph as any, { themeName: "warm-craft" });
  if (!plan) {
    console.error("planPageFromGraph returned null");
    process.exit(1);
  }
  console.log("plan sections:", plan.sections.map((s: any) => s.component).join(", "));

  const mediaManifest = { assets: [] };

  const html = renderToStaticMarkup(
    PublicFamilyPage({ input: { plan, graph: graph as any, media: mediaManifest as any, siteSlug: "coppersmith-plumbing" } })
  );
  fs.writeFileSync("/tmp/coppersmith-proof.html", "<!DOCTYPE html>" + html);
  console.log("rendered", html.length, "chars");
  const checks = {
    hasEstimate: html.includes('id="estimate"'),
    hasAskAbout: html.includes("Ask about this service"),
    hasOwnerDebug: /owner-mode|debug-panel|OwnerMode/i.test(html),
  };
  console.log(JSON.stringify(checks, null, 2));
}

main();
