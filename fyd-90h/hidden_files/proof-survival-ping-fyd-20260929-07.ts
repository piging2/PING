/**
 * Writer A interval 07: correction-survival proof for the PING tenant (ping-fyd).
 *
 * Reuses the existing harnesses, invents nothing:
 *  - getFydTenantGraph  (src/fyd/data/fyd-tenant-graph.ts) — the exact Ask
 *    seam the served runtime uses: pinned fixture base + live journal
 *    overlays via the governed PingObjectReader.
 *  - refreshSource      (src/fyd/builder/source-refresh.ts) — the source
 *    re-observation harness: source replaced wholesale, owner layer carried
 *    through, digest equality = machine-checkable survival proof.
 *
 * Owner values below are the REAL recorded demo-owner corrections from the
 * served :3100 proof sequence (2026-09-29 ~18:04 UTC):
 *  - phone: source "(970) 589-3309" -> owner "+1 555 010 1234"
 *  - address visibility: default -> hide -> show (explicit publication)
 *  - section priority: Services moved to position 0 (journal overlay
 *    fyd-ovl-mumzkn87-a211ccecf0aa, intent pi-e9431c39d99ec49a)
 *
 * Run from the served tree root:
 *   FYD_JOURNAL_GATEWAY_URL=http://127.0.0.1:18200 \
 *     npx tsx /tmp/proof-survival-ping-fyd.ts
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getFydTenantGraph, applyTenantOverlays } from "@/fyd/data/fyd-tenant-graph";
import { refreshSource, type OwnerLayer } from "@/fyd/builder/source-refresh";
import { normalizeOwnerIntent } from "@/fyd/builder/owner-intent";
import type { DependencyManifest } from "@/fyd/builder/manifest";
import type { ObjectGraph } from "@/fyd/sitespec/types";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

async function main() {
  // ---- (0) SOURCE X: the disk projection, the source layer the owner lane reads
  const proj = JSON.parse(
    readFileSync("/home/nolan/ping/var/fyd-projections/ping-fyd.json", "utf8"),
  );
  const sourceGraph: ObjectGraph = proj.graph;
  const biz = sourceGraph.objects.find((o) => o.id === "ping-fyd-business")!;
  console.log("SOURCE phone (X):", JSON.stringify(biz.fields.phone));
  console.log("SOURCE sha256:", sha(JSON.stringify(proj)).slice(0, 16));

  // ---- (d-verify) the Ask seam: journal overlays compose above the pinned base
  const { getPingObjectReader } = await import("@/lib/ping/ping-object-reader");
  const reader = getPingObjectReader();
  const rawOverlays = await reader.queryFydSiteOverlays("ping-fyd");
  console.log("ASK seam raw overlays:", rawOverlays.length, rawOverlays.map((o) => o.eventId));
  for (const o of rawOverlays) {
    console.log("  overlay", o.eventId, "ops:", JSON.stringify(o.ops).slice(0, 120));
  }
  const dbg = applyTenantOverlays(
    structuredClone((await import("@/fyd/proceduralize/__fixtures__/ping-fyd-graph")).PING_FYD_GRAPH),
    rawOverlays,
  );
  console.log("  direct applyTenantOverlays directives:", dbg.directives.length, "eventIds:", dbg.eventIds);
  const seam = await getFydTenantGraph("ping-fyd");
  console.log("ASK seam baseDigest ok:", seam.meta.baseDigest);
  const pi = seam.presentationIntent;
  console.log("ASK seam presentationIntent:", pi ? `${pi.directives.length} directive(s)` : "null");
  for (const d of pi?.directives ?? []) {
    console.log("  intentId:", d.intentId, "| siteIntent:", JSON.stringify(d.siteIntent));
    console.log("  approval.eventId:", d.approval.eventId);
  }
  const seamBiz = seam.graph.objects.find((o) => o.id === "ping-fyd-business");
  console.log("ASK seam biz phone (fixture base, owner-asserted):", JSON.stringify(seamBiz?.fields.phone));

  // ---- (e/f) the owner layer, faithfully from the recorded demo-owner state
  const ownerLayer: OwnerLayer = {
    intent: normalizeOwnerIntent({
      goals: ["PING exploratory tenant correction-survival proof"],
      priorities: ["Services"],
    }),
    assertions: [
      {
        objectId: "ping-fyd-business",
        correction: {
          field: "phone",
          label: "Phone",
          sourceValue: "(970) 589-3309",
          ownerValue: "+1 555 010 1234",
          correctedAt: "2026-09-29T18:04:04.497Z",
          actorLabel: "Demo Owner (seeded, unverified)",
          basis: "Owner correction: the owner says this is the correct phone.",
        },
      },
    ],
  };
  const manifest: DependencyManifest = {
    version: 1,
    plannerVersion: "planner@1",
    tenantId: "ping-fyd",
    bindings: [],
    notes: ["writer-A interval 07 proof"],
  };

  // ---- (f1) source re-observed, STILL X (fresh observation stamps only)
  const reobsSame: ObjectGraph = JSON.parse(JSON.stringify(sourceGraph));
  for (const o of reobsSame.objects) {
    if (o.provenance?.derivedAt) o.provenance.derivedAt = "2026-09-29T18:10:00.000Z";
  }
  const r1 = refreshSource({
    tenantId: "ping-fyd",
    currentSource: sourceGraph,
    refreshedSource: reobsSame,
    ownerLayer,
    manifest,
  });
  console.log("\n[f1] source re-observed, still X:");
  console.log("  ownerLayerIntact:", r1.ownerLayerIntact);
  console.log("  digestBefore:", r1.ownerLayerDigestBefore.slice(0, 16));
  console.log("  digestAfter: ", r1.ownerLayerDigestAfter.slice(0, 16));
  console.log("  conflicts:", JSON.stringify(r1.diff.conflicts));
  const r1biz = r1.source.objects.find((o) => o.id === "ping-fyd-business")!;
  console.log("  refreshed source phone (still X):", JSON.stringify(r1biz.fields.phone));

  // ---- (f2) source MOVED under the correction: owner still wins, drift visible
  const reobsMoved: ObjectGraph = JSON.parse(JSON.stringify(sourceGraph));
  const mBiz = reobsMoved.objects.find((o) => o.id === "ping-fyd-business")!;
  mBiz.fields = { ...mBiz.fields, phone: "(970) 555-9999" };
  const r2 = refreshSource({
    tenantId: "ping-fyd",
    currentSource: sourceGraph,
    refreshedSource: reobsMoved,
    ownerLayer,
    manifest,
  });
  console.log("\n[f2] source MOVED under the correction:");
  console.log("  ownerLayerIntact:", r2.ownerLayerIntact);
  console.log("  conflicts:", JSON.stringify(r2.diff.conflicts, null, 1).slice(0, 600));
}

main().catch((e) => {
  console.error("PROOF SCRIPT FAILED:", e);
  process.exit(1);
});
