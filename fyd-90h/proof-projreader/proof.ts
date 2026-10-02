/**
 * Projection-reader seam proof (Wave 2 W5).
 * Compiles the REAL seam modules (verbatim copies) against labeled stubs
 * for modules not yet landed on the a0f3724 line, then proves:
 *   1. Consumers are interface-bound (in-memory stub reader drives
 *      getPingObjectGraph — no filesystem touched).
 *   2. The file-dump reader verifies, fails closed, and produces a
 *      deterministic snapshot identity (dumpedAt excluded).
 *   3. Sync reads fail closed for async-only readers.
 *   4. The naming law holds in the new modules.
 *   5. resetProjectionReader restores the file-dump default.
 */
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalize } from "@/lib/ping/ask-composer";
import {
  getProjectionReader,
  setProjectionReader,
  resetProjectionReader,
  isSyncProjectionReader,
  type ProjectionReader,
  type ProjectionSnapshot,
  type RegenerateResult,
} from "@/fyd/data/projection-reader";
import { FileDumpProjectionReader } from "@/fyd/data/file-dump-projection-reader";
import {
  getPingObjectGraph,
  getPingObjectGraphSync,
  listPingSiteIds,
  listPingSiteIdsSync,
} from "@/fyd/data/ping-object-source";
import { snapshotDigestOf } from "@/fyd/data/projection-verify";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ": " + detail : ""}`);
  }
}
async function throwsAsync(name: string, fn: () => Promise<unknown>, want: RegExp): Promise<void> {
  try {
    await fn();
    check(name, false, "did not throw");
  } catch (e) {
    check(name, want.test((e as Error).message), `wrong error: ${(e as Error).message}`);
  }
}
function throwsSync(name: string, fn: () => unknown, want: RegExp): void {
  try {
    fn();
    check(name, false, "did not throw");
  } catch (e) {
    check(name, want.test((e as Error).message), `wrong error: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------- fixtures
function makeSnapshotDoc(siteId: string, dumpedAt: string): Record<string, unknown> {
  const graph = {
    objects: [
      {
        id: "obj-1", schema: "business", visibility: "public", title: "Proof Shop",
        provenance: { kind: "procedural-fixture", ref: "fixture:proof" },
        fields: { tagline: "proof tagline" },
      },
      {
        id: "obj-2", schema: "service", visibility: "public", title: "Proof Service",
        provenance: { kind: "procedural-fixture", ref: "fixture:proof" },
      },
    ],
    relationships: [
      { id: "rel-1", subject: "obj-1", object: "obj-2", predicate: "offers" },
    ],
  };
  const presentationIntent = {
    directives: [
      {
        intentId: "pi-1",
        siteIntent: { kind: "reorder_sections", sections: ["hero"] },
        proposal: { proposalDigest: "p".repeat(64) },
        approval: {
          proposalDigest: "p".repeat(64),
          approvedBy: "demo-owner",
          approvedAt: "2026-09-29T00:00:00Z",
          note: "x",
          eventId: "ev-pi-1",
        },
      },
    ],
    provenance: { kind: "owner-presentation-intent", note: "n", eventIds: ["ev-pi-1"] },
  };
  const fieldVisibility = {
    decisions: [
      {
        directiveId: "fv-1", objectId: "obj-1", field: "phone", policy: "hide",
        proposalDigest: "q".repeat(64),
        approval: {
          proposalDigest: "q".repeat(64),
          approvedBy: "demo-owner",
          approvedAt: "2026-09-29T00:00:00Z",
          note: "x",
          eventId: "ev-fv-1",
        },
      },
    ],
    provenance: { kind: "owner-field-visibility", note: "n", eventIds: ["ev-fv-1"] },
  };
  const meta = {
    siteId,
    dumpedAt,
    dumperVersion: "1.2.1",
    baseDigest: "b".repeat(64),
    fixtureFileDigest: "f".repeat(64),
    fixtureHeader: "h",
    overlayEventIds: ["ev-1", "ev-2"],
    graphDigest: createHash("sha256").update(canonicalize(graph), "utf8").digest("hex"),
    generatedAt: "2026-09-29T00:00:00Z",
    presentationIntentDigest: createHash("sha256").update(canonicalize(presentationIntent), "utf8").digest("hex"),
    fieldVisibilityDigest: createHash("sha256").update(canonicalize(fieldVisibility), "utf8").digest("hex"),
  };
  return { graph, meta, presentationIntent, fieldVisibility };
}

async function main(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "w5-proof-"));
  process.env.FYD_PROJECTION_DIR = dir;
  const siteId = "proof-site";

  // ------------------------------------------------- 1. interface-bound consumers
  console.log("1. consumers are interface-bound (in-memory stub reader)");
  const stubSnapshot: ProjectionSnapshot = {
    siteId,
    snapshotDigest: "stubdigest",
    sourceDigest: "stubsource",
    canonicalBytes: "{}",
    meta: makeSnapshotDoc(siteId, "2026-09-29T00:00:00Z").meta as never,
    graph: { objects: [], relationships: [] },
    presentationIntent: null,
    fieldVisibility: null,
  };
  const stubReader: ProjectionReader = {
    kind: "remote",
    readSnapshot: async (id) => {
      if (id !== siteId) throw new Error("stub: unknown site");
      return stubSnapshot;
    },
    listSiteIds: async () => [siteId],
    regenerate: async () => {
      throw new Error("stub: RegenerateUnsupported");
    },
  };
  setProjectionReader(stubReader);
  const viaConsumer = await getPingObjectGraph(siteId);
  check("getPingObjectGraph delegates to the registered reader", viaConsumer.meta.siteId === siteId);
  check("stub reader kind visible through seam", getProjectionReader().kind === "remote");
  check("listPingSiteIds delegates", JSON.stringify(await listPingSiteIds()) === JSON.stringify([siteId]));
  throwsSync("sync read fails closed for async-only reader", () => getPingObjectGraphSync(siteId), /async contract only/);
  throwsSync("sync listing fails closed for async-only reader", () => listPingSiteIdsSync(), /sync site listing unsupported/);
  check("isSyncProjectionReader false for stub", !isSyncProjectionReader(stubReader));

  // ------------------------------------------- 2. file-dump reader: verify + determinism
  console.log("2. FileDumpProjectionReader verification and determinism");
  resetProjectionReader();
  check("default restores to file-dump", getProjectionReader().kind === "file-dump");
  const reader = new FileDumpProjectionReader();
  const docA = makeSnapshotDoc(siteId, "2026-09-29T10:00:00Z");
  const docB = makeSnapshotDoc(siteId, "2026-09-29T11:00:00Z"); // only dumpedAt differs
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(docA));
  const snapA = await reader.readSnapshot(siteId);
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(docB));
  const snapB = await reader.readSnapshot(siteId);
  check("same history, different dumpedAt -> same snapshotDigest", snapA.snapshotDigest === snapB.snapshotDigest);
  check("same history -> same sourceDigest", snapA.sourceDigest === snapB.sourceDigest);
  check("canonicalBytes byte-identical across dumpedAt variance", snapA.canonicalBytes === snapB.canonicalBytes);
  check("intent block verified through reader", snapA.presentationIntent?.directives[0]?.intentId === "pi-1");
  check("visibility block verified through reader", snapA.fieldVisibility?.decisions[0]?.policy === "hide");
  const viaDefault = await getPingObjectGraph(siteId, { ownerOverlay: false });
  check("getPingObjectGraph reads through default file-dump reader", viaDefault.graph.objects.length === 2);
  check("sync variant works on file-dump reader", getPingObjectGraphSync(siteId, { ownerOverlay: false }).graph.objects.length === 2);
  check("listSiteIdsSync works", JSON.stringify(listPingSiteIdsSync()) === JSON.stringify([siteId]));
  check("isSyncProjectionReader true for file-dump", isSyncProjectionReader(reader));

  // ------------------------------------------------- 3. fail closed
  console.log("3. fail-closed behavior");
  await throwsAsync("missing snapshot", () => reader.readSnapshot("nope"), /no snapshot/);
  const tampered = makeSnapshotDoc(siteId, "2026-09-29T10:00:00Z") as { graph: { objects: unknown[] } };
  (tampered.graph.objects[0] as Record<string, unknown>).title = "EVIL";
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(tampered));
  await throwsAsync("tampered graph", () => reader.readSnapshot(siteId), /graphDigest mismatch/);
  const wrongSite = makeSnapshotDoc("other-site", "2026-09-29T10:00:00Z");
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(wrongSite));
  await throwsAsync("siteId mismatch", () => reader.readSnapshot(siteId), /does not match requested site/);
  const noProv = makeSnapshotDoc(siteId, "2026-09-29T10:00:00Z") as { graph: { objects: Record<string, unknown>[] } };
  delete noProv.graph.objects[0].provenance;
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(noProv));
  await throwsAsync("untraceable object", () => reader.readSnapshot(siteId), /lacks provenance ref/);
  writeFileSync(join(dir, siteId + ".json"), "{not json");
  await throwsAsync("malformed JSON", () => reader.readSnapshot(siteId), /not valid JSON/);
  const badIntent = makeSnapshotDoc(siteId, "2026-09-29T10:00:00Z") as { presentationIntent: { directives: Record<string, unknown>[] } };
  badIntent.presentationIntent.directives[0].intentId = "mutated";
  writeFileSync(join(dir, siteId + ".json"), JSON.stringify(badIntent));
  await throwsAsync("tampered intent block", () => reader.readSnapshot(siteId), /presentationIntentDigest mismatch/);
  process.env.FYD_DUMP_PY = "/nonexistent/dump.py";
  await throwsAsync("regenerate without dump script", () => reader.regenerate(siteId), /RegenerateFailed/);
  delete process.env.FYD_DUMP_PY;

  // ------------------------------------------------- 4. naming law
  console.log("4. naming law in the new modules");
  const newFiles = [
    "/home/nolan/projects/ping-wave2-projreader2/fyd-product-lane/src/fyd/data/projection-reader.ts",
    "/home/nolan/projects/ping-wave2-projreader2/fyd-product-lane/src/fyd/data/projection-verify.ts",
    "/home/nolan/projects/ping-wave2-projreader2/fyd-product-lane/src/fyd/data/file-dump-projection-reader.ts",
    "/home/nolan/projects/ping-wave2-projreader2/fyd-product-lane/src/fyd/data/default-reader.ts",
    "/home/nolan/projects/ping-wave2-projreader2/fyd-product-lane/src/fyd/data/ping-object-source.ts",
  ];
  let namingClean = true;
  for (const f of newFiles) {
    const text = readFileSync(f, "utf8");
    // The ban is absolute: the phrase and its variants (ProjectionAuthority,
    // projection-authority) must not appear ANYWHERE in FYD code, comments,
    // docs, or tests — not even in negated explanations.
    const lines = text.split("\n");
    for (const line of lines) {
      if (/projection[\s_-]?authority/i.test(line)) {
        namingClean = false;
        console.log(`  naming violation: ${f}: ${line.trim()}`);
      }
    }
  }
  check("naming law holds: zero occurrences of the banned phrase", namingClean);

  // ------------------------------------------------- 5. snapshot identity helpers
  console.log("5. snapshot identity helpers");
  const doc = makeSnapshotDoc(siteId, "2026-09-29T10:00:00Z");
  check("snapshotDigestOf is deterministic", snapshotDigestOf(doc) === snapshotDigestOf(doc));
  check("volatile dumpedAt excluded from identity", snapshotDigestOf(makeSnapshotDoc(siteId, "t1")) === snapshotDigestOf(makeSnapshotDoc(siteId, "t2")));

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("PROOF CRASH:", e);
  process.exit(2);
});
