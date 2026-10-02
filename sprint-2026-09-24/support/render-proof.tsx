/**
 * Coppersmith proof body renderer (fix lane).
 * Same proof inputs as the served build: the regenerated plan.json, the
 * pinned graph fixture, and an empty media manifest (the served proof
 * carries no bound images). The only intentional deltas from the served
 * build are the two gate fixes: phone de-duplication (planner + nav) and
 * inspectAffordances: false (no "Why this?" on the static proof).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicFamilyPage } from "@/fyd/family/family-page";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import type { FamilyRenderInput } from "@/fyd/family/types";

const LANE = "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane";

function main() {
  const plan = JSON.parse(
    readFileSync(join(LANE, "proof/coppersmith-family-2026-09-25/plan.json"), "utf8"),
  );
  const input: FamilyRenderInput = {
    plan,
    graph: COPPERSMITH_GRAPH as any,
    media: {},
    siteSlug: "coppersmith-plumbing",
    askHref: "#ask-fyd",
    // Static proof page: no ObjectView to link to; "Why this?" would be dead chrome.
    inspectAffordances: false,
  };
  const html = renderToStaticMarkup(PublicFamilyPage({ input }) as any);
  writeFileSync("/tmp/coppersmith-proof-body.html", html);
  console.log("body bytes:", html.length);
  const phones = (html.match(/\(970\) 245-3869/g) ?? []).length;
  const why = (html.match(/Why this\?/g) ?? []).length;
  console.log("visible phone occurrences:", phones);
  console.log("Why this? occurrences:", why);
}

main();
