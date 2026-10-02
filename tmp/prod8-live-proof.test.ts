/**
 * TEMPORARY live proof for PROD-8 (deleted after the run).
 * Runs detectOrphanedCorrections against the REAL happy-place journal
 * and the REAL current projection, and proves the journal is untouched.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { GET } from "../route";

jest.mock("@/lib/ping/session", () => ({ getPracticeIdentityId: async () => null }));

const JOURNAL = join(process.cwd(), "data", "fyd-owner", "happy-place.json");
const WARNING =
  "This correction does not apply to anything. It may reference a deleted or renamed item.";

test("live: seq-12 service-order correction surfaces as an orphan warning; journal untouched", async () => {
  delete process.env.FYD_OWNER_DIR;
  const before = readFileSync(JOURNAL, "utf8");
  const resp = await GET({} as NextRequest, {
    params: Promise.resolve({ objectId: "happy-place" }),
  });
  const body = (await resp.json()) as Record<string, unknown>;
  const orphans = body.orphanedCorrections as {
    target: string;
    reason: string;
    detail: string;
  }[];
  const order = orphans.filter(
    (o) => o.target === "services:order" && o.reason === "service-order-orphaned",
  );
  console.log("LIVE_ORPHAN_COUNT=" + orphans.length);
  console.log("LIVE_ORDER_ORPHAN=" + JSON.stringify(order[0] ?? null));
  expect(order).toHaveLength(1);
  expect(order[0].detail).toContain(WARNING);
  expect(order[0].detail).toContain("svc-decks");
  // Journal read-only: byte-identical after detection.
  expect(readFileSync(JOURNAL, "utf8")).toBe(before);
});
