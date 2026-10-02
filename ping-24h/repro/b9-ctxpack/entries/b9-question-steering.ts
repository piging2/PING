/**
 * B9 repro 3: ContextPack patch residual  -  QUESTION = RAW PROMPT.
 *
 * buildDispatchContextPacket() passes the attacker-supplied dispatch prompt
 * verbatim as the compiler's relevance `question` over the live tenant graph.
 * The compiled packet lands in the context.json artifact (not back to the
 * caller), so this is not an exfiltration oracle  -  but the attacker steers
 * the evidence packet's composition: which claims clear the relevance gate,
 * their rank order, and which get cut by selectionCut.
 *
 * This repro runs the REAL compileAskContext with the REAL DISPATCH_VIEWER
 * over a synthetic tenant graph (2 competing public claims + 8 neutral
 * public fillers + 1 owner-private claim) under three attacker-chosen
 * questions, and verifies the steering effects and the tier bound.
 *
 * Run: node dist/b9-question-steering.js
 */
import { compileAskContext } from "../src/fyd/ask/context-compiler";

// VERBATIM from mc-context-pack.ts (ContextPack patch branch).
const DISPATCH_VIEWER = { id: null, tier: "agent", grants: [], delegatedTier: "visitor" } as const;

const FILLERS = Array.from({ length: 8 }, (_, i) => ({
  id: `o-fill-${i + 1}`,
  schema: "ping.social.post@1",
  title: `Office notice ${i + 1}`,
  description: "Our office opens at eight in the morning on weekdays",
  visibility: "public",
  fields: {},
}));

const GRAPH = {
  objects: [
    // NOTE: with objectId null (the dispatch path), the compiler resolves the
    // target as the first visible object (context-compiler.ts:490) and always
    // reserves it (+50, always selected). The target is therefore
    // question-INDEPENDENT; steering applies to the non-target evidence set.
    // o-fill-1 is the fixed target here so o-fav/o-unfav compete purely on signals.
    ...FILLERS.slice(0, 1),
    {
      id: "o-fav", schema: "ping.social.post@1",
      title: "Drain cleaning special this week",
      description: "Licensed technicians, same-day service, five star reviews",
      visibility: "public", fields: {},
    },
    {
      id: "o-unfav", schema: "ping.social.post@1",
      title: "Service complaint resolved",
      description: "A customer reported a late arrival in March, since resolved",
      visibility: "public", fields: {},
    },
    ...FILLERS.slice(1),
    {
      id: "o-owner", schema: "ping.social.note@1",
      title: "Owner profit margins",
      description: "Net margin 34 percent, do not publish",
      visibility: "owner-private", fields: {},
    },
  ],
  relationships: [],
};

function compile(question: string) {
  return compileAskContext({
    question,
    viewer: DISPATCH_VIEWER as any,
    siteId: "happy-place",
    objectId: null,
    graph: GRAPH as any,
  });
}

function main() {
  const q1 = "drain cleaning special this week";       // attacker prompt, favorable
  const q2 = "tell me about the late arrival complaint"; // attacker prompt, unfavorable
  const q3 = "xyzzy unrelated query about zebras";      // attacker prompt, no signal

  const p1 = compile(q1);
  const p2 = compile(q2);
  const p3 = compile(q3);
  const ids1 = p1.objects.map((o: any) => o.id);
  const ids2 = p2.objects.map((o: any) => o.id);
  const ids3 = p3.objects.map((o: any) => o.id);

  console.log("Q1 packet order:", JSON.stringify(ids1));
  console.log("Q2 packet order:", JSON.stringify(ids2));
  console.log("Q3 packet objects:", JSON.stringify(ids3), "notes:", JSON.stringify((p3 as any).notes));
  console.log("Q1 question echoed verbatim:", (p1 as any).question === q1);
  console.log("Q1 signals:", JSON.stringify((p1 as any).questionSignals));
  console.log("selectionCut Q1/Q2:", (p1 as any).visibility.excluded.selectionCut, "/", (p2 as any).visibility.excluded.selectionCut);
  console.log("viewerTier:", (p1 as any).viewerTier);

  const rank = (ids: string[], id: string) => ids.indexOf(id);
  const q1FavAboveUnfav = rank(ids1, "o-fav") !== -1 && (rank(ids1, "o-unfav") === -1 || rank(ids1, "o-fav") < rank(ids1, "o-unfav"));
  const q2UnfavAboveFav = rank(ids2, "o-unfav") !== -1 && (rank(ids2, "o-fav") === -1 || rank(ids2, "o-unfav") < rank(ids2, "o-fav"));
  const ownerLeaked = ids1.includes("o-owner") || ids2.includes("o-owner") || ids3.includes("o-owner");
  const q3gate = ((p3 as any).notes as string[]).includes("no_candidates_above_floor");

  console.log(`\nRESULT:`);
  console.log(`  steering Q1: favorable prompt ranks o-fav above o-unfav (or cuts o-unfav): ${q1FavAboveUnfav ? "DEMONSTRATED" : "not observed"}`);
  console.log(`  steering Q2: unfavorable prompt ranks o-unfav above o-fav (or cuts o-fav): ${q2UnfavAboveFav ? "DEMONSTRATED" : "not observed"}`);
  console.log(`  G3 gate on signal-free prompt (honest note): ${q3gate ? "DEMONSTRATED" : "not observed"}`);
  console.log(`  BOUND HOLDS (visitor tier): owner-private in any packet: ${ownerLeaked}`);
  console.log(`\nINTERPRETATION: the dispatch prompt fully determines the relevance signals ` +
    `(tokens + schema-intent boosts) that rank and cut the non-target public evidence set. An attacker can ` +
    `bury a competing public claim below selectionCut by choosing a prompt whose tokens favor their claim. ` +
    `Two hard limits: (1) the target (first visible object when objectId is null, as in dispatch) is always ` +
    `reserved regardless of the question; (2) the visitor tier excludes non-public objects in every packet, ` +
    `so steering cannot exfiltrate owner-tier data. The steering is auditable via packet.question + prompt.txt. ` +
    `Residual: nothing in the patch marks the question as dispatcher-supplied rather than tenant-supplied.`);
  console.log("FALSIFIES IF: dispatch used a fixed relevance question (not the prompt), or packet " +
    "composition were question-independent.");
}

main();
