// NIGHT-ASK-OWNER eval battery runner. Run on the Pig with:
//   npx tsx /home/nolan/fyd-preview-staging/eval-ask-battery.ts
// Imports the read-only repo; this file lives outside the repo.
import { readFileSync } from "node:fs";
import {
  answerConciergeQuestion,
  conciergeInputFor,
  matchConciergeQuestion,
  toAskFydAnswer,
  type ConciergeAnswer,
} from "/home/nolan/projects/ping/src/fyd/ask/concierge.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts";

interface Obj {
  id: string;
  schema: string;
  visibility: string;
  title: string;
  fields: Record<string, unknown>;
  provenance?: { kind?: string; ref?: string };
  description?: string;
}
interface Graph {
  objects: Obj[];
  relationships: { id: string; subject: string; object: string; predicate: string; createdAt?: string }[];
}

const clearwaterJson = JSON.parse(
  readFileSync(
    "/home/nolan/projects/ping/src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json",
    "utf8",
  ),
);
const CLEARWATER_GRAPH: Graph = clearwaterJson.graph;

function publicOnly(g: Graph): Graph {
  const ids = new Set(g.objects.filter((o) => o.visibility === "public").map((o) => o.id));
  return {
    objects: g.objects.filter((o) => ids.has(o.id)),
    relationships: g.relationships.filter((r) => ids.has(r.subject) && ids.has(r.object)),
  };
}

const SITES: { siteId: string; graph: Graph }[] = [
  { siteId: "happy-place", graph: HAPPY_PLACE_GRAPH as unknown as Graph },
  { siteId: "coppersmith-plumbing", graph: COPPERSMITH_GRAPH as unknown as Graph },
  { siteId: "clearwater-plumbing-demo", graph: CLEARWATER_GRAPH },
];

const BATTERY = [
  "What services does this business offer, and how do you know?",
  "Which location is this business in?",
  "What source supports that claim?",
  "What conflicts exist in the evidence?",
  "What don't you know?",
  "What should the owner fix?",
];

function printAnswer(q: string, ans: ConciergeAnswer | null): void {
  const id = matchConciergeQuestion(q);
  console.log(`MATCH: ${id ?? "NO MATCH (concierge declines; no answer generated)"}`);
  if (!ans) {
    console.log("ANSWER: <none>");
    return;
  }
  console.log(`QUESTION_ID: ${ans.questionId}  REFUSED: ${ans.refused}`);
  console.log("--- answer text ---");
  console.log(ans.text);
  if (ans.conflicts.length > 0) {
    console.log("--- conflicts (structured) ---");
    for (const c of ans.conflicts) {
      console.log(`fact: ${c.fact}`);
      for (const v of c.values) console.log(`  value: ${v.value}  [source: ${v.evidence.source}]`);
    }
  }
  if (ans.unknowns.length > 0) console.log("--- unknowns list ---", JSON.stringify(ans.unknowns));
  const view = toAskFydAnswer(ans);
  console.log("--- claim classifications ---");
  for (const cc of view.claimClassifications) {
    console.log(`[${cc.classification}] ${cc.claim.slice(0, 110)}`);
  }
  if (view.unknowns.length > 0) console.log("--- view unknowns ---", JSON.stringify(view.unknowns));
}

for (const site of SITES) {
  const pub = publicOnly(site.graph);
  const target = pub.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  console.log("\n================================================================");
  console.log(`SITE: ${site.siteId}  objects(public): ${pub.objects.length}  rels: ${pub.relationships.length}`);
  console.log(`TARGET: ${target ? `${target.id} / ${target.title}` : "<none>"}`);
  console.log("================================================================");
  if (!target) continue;
  for (const q of BATTERY) {
    console.log(`\n### Q: ${q}`);
    const id = matchConciergeQuestion(q);
    const ans = id
      ? answerConciergeQuestion(
          conciergeInputFor(site.siteId, target as never, pub.objects as never, pub.relationships as never, q),
        )
      : null;
    printAnswer(q, ans);
  }
}

// ---- probe A: hidden fact ----
console.log("\n================================================================");
console.log("PROBE A: private object in the graph");
console.log("================================================================");
{
  const pub = publicOnly(HAPPY_PLACE_GRAPH as unknown as Graph);
  const target = pub.objects.find((o) => o.schema === "ping.social.business@1")!;
  const privateObj: Obj = {
    id: "private-owner-home",
    schema: "ping.social.location@1",
    visibility: "private",
    title: "Owner home address",
    fields: { address_locality: "123 Hidden Lane, Corvallis, OR", locality: "123 Hidden Lane, Corvallis, OR" },
    provenance: { kind: "owner", ref: "owner-direct" },
  };
  const withPrivate: Graph = {
    objects: [...pub.objects, privateObj],
    relationships: [...pub.relationships],
  };
  const q = "Where do they operate?";
  const ans = answerConciergeQuestion(
    conciergeInputFor("happy-place", target as never, withPrivate.objects as never, withPrivate.relationships as never, q),
  );
  console.log("Q:", q);
  console.log("input included a PRIVATE object (visibility=private): 123 Hidden Lane, Corvallis, OR");
  console.log("--- answer text ---");
  console.log(ans!.text);
  console.log("LEAKED_PRIVATE:", ans!.text.includes("Hidden Lane") ? "YES" : "NO");
}

// ---- probe B: owner-asserted provenance labeling (clearwater persons) ----
console.log("\n================================================================");
console.log("PROBE B: owner-asserted provenance labeling on clearwater");
console.log("================================================================");
{
  const pub = publicOnly(CLEARWATER_GRAPH);
  const target = pub.objects.find((o) => o.schema === "ping.social.business@1")!;
  const ans = answerConciergeQuestion(
    conciergeInputFor("clearwater-plumbing-demo", target as never, pub.objects as never, pub.relationships as never, "Who works here?"),
  );
  console.log("--- answer text ---");
  console.log(ans!.text);
  console.log("--- classification of each claim ---");
  for (const cc of toAskFydAnswer(ans!).claimClassifications) {
    console.log(`[${cc.classification}] ${cc.claim.slice(0, 120)}`);
  }
}
