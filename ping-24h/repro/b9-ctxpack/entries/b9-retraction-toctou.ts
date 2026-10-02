/**
 * B9 repro 2: ContextPack patch residual  -  RETRACTION TOCTOU.
 *
 * The patch compiles the ContextPack at dispatch time (point-in-time). Evidence
 * retracted between pack compilation and mission completion is never re-checked:
 * the compiler test covers recompilation-after-retraction, not in-flight
 * invalidation.
 *
 * This repro runs the REAL dispatch-path composition from mc-context-pack.ts
 * (real getFydTenantGraph + real compileAskContext, DISPATCH_VIEWER verbatim):
 *   1. overlay adds a public claim -> compile -> PACKET P1 (the artifact)
 *   2. overlay retracts the claim (deactivate_object) -> compile -> PACKET P2
 * and shows P1 still carries the retracted claim while the live graph has moved
 * on. It then states the BOUND: the route passes only `prompt` to
 * runOllama/runBroker, never the packet, so staleness reaches audit readers,
 * not the executor.
 *
 * Run: node dist/b9-retraction-toctou.js
 */
import { getFydTenantGraph } from "../src/fyd/data/fyd-tenant-graph";
import { compileAskContext } from "../src/fyd/ask/context-compiler";

// VERBATIM from mc-context-pack.ts (ContextPack patch branch).
const DISPATCH_VIEWER = { id: null, tier: "agent", grants: [], delegatedTier: "visitor" } as const;

// The real composition from buildDispatchContextPacket(), minus the trivial wrapper.
async function buildPacket(tenant: string, question: string, reader: any) {
  const { graph, meta } = await getFydTenantGraph(tenant, { reader });
  const packet = compileAskContext({
    question,
    viewer: DISPATCH_VIEWER as any,
    siteId: tenant,
    objectId: null,
    graph: { objects: graph.objects as any[], relationships: graph.relationships as any[] },
    graphDigest: meta.graphDigest,
  });
  return { ...packet, context_pack_id: "mc-ctx-demo", dispatch: {} };
}

const CLAIM = {
  id: "claim-flash-sale",
  schema: "ping.social.post@1",
  title: "Flash sale this weekend",
  description: "Half price drain cleaning Saturday only",
  visibility: "public",
  fields: {},
};

const readerV1 = {
  queryFydSiteOverlays: async (_s: string) => [
    { eventId: "evt-add-1", timestamp: "2026-09-28T14:50:00Z", ops: [{ op: "add_object", object: CLAIM }] },
  ],
};
// Retraction arrives AFTER the pack was compiled: the claim is deactivated.
const readerV2 = {
  queryFydSiteOverlays: async (_s: string) => [
    { eventId: "evt-add-1", timestamp: "2026-09-28T14:50:00Z", ops: [{ op: "add_object", object: CLAIM }] },
    { eventId: "evt-retract-2", timestamp: "2026-09-28T14:55:00Z", ops: [{ op: "deactivate_object", objectId: CLAIM.id }] },
  ],
};

async function main() {
  const question = "drain cleaning weekend deals"; // the dispatch prompt (attacker-supplied)
  const p1 = await buildPacket("happy-place", question, readerV1);
  const p2 = await buildPacket("happy-place", question, readerV2);

  const p1Ids = p1.objects.map((o: any) => o.id);
  const p2Ids = p2.objects.map((o: any) => o.id);
  console.log("P1 (artifact, compiled pre-retraction) object ids:", JSON.stringify(p1Ids.slice(0, 12)));
  console.log("P2 (live graph, post-retraction)  object ids:", JSON.stringify(p2Ids.slice(0, 12)));
  console.log("P1 carries the retracted claim:", p1Ids.includes(CLAIM.id));
  console.log("P2 carries the retracted claim:", p2Ids.includes(CLAIM.id));
  console.log("P2 visibility.excluded:", JSON.stringify((p2 as any).visibility.excluded));
  console.log("digests.graph differ (auditor-detectable):", (p1 as any).digests.graph !== (p2 as any).digests.graph);
  console.log("digests.packet differ:", (p1 as any).digests.packet !== (p2 as any).digests.packet);

  const stale = p1Ids.includes(CLAIM.id) && !p2Ids.includes(CLAIM.id);
  console.log(`\nRESULT: ${stale ? "TOCTOU DEMONSTRATED" : "no divergence"}  -  the published context.json artifact ` +
    `still asserts a claim the live graph has retracted.`);
  console.log("BOUND (executor isolation): route.ts invokes runOllama/runBroker with the bounded `prompt` " +
    "only; the packet is serialized to the artifact and never passed to the worker, and the result envelope " +
    "carries only context_pack_id. So the stale claim reaches AUDIT READERS of context.json, not the executor.");
  console.log("FALSIFIES IF: dispatch re-verifies the packet against the live graph at execute time, or the " +
    "artifact is never published before mission completion.");
}

main().catch((e) => { console.error("HARNESS FAILURE:", e); process.exit(2); });
