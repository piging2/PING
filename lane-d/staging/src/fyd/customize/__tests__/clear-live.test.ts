/**
 * SCRATCH (not for commit): clears the journaled Lane D test directive.
 * DELETE AFTER USE.
 */
process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";
process.env.FYD_PROJECTION_DIR = "/tmp/lane-d-e2e-projections";

import { POST } from "@/app/api/fyd/customize/route";
import { readFileSync } from "node:fs";

test("clear the journaled test directive", async () => {
  const doc0 = JSON.parse(
    readFileSync("/home/nolan/ping/var/fyd-projections/happy-place.json", "utf8"),
  );
  const intentId: string = doc0.presentationIntent.directives[0].intentId;
  const req = new Request("http://127.0.0.1/api/fyd/customize", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "127.0.0.1" },
    body: JSON.stringify({ action: "clear", siteId: "happy-place", intentId }),
  });
  const res = await POST(req);
  const doc = (await res.json()) as { ok: boolean; intentId?: string; eventId?: string };
  expect(res.status).toBe(200);
  expect(doc.ok).toBe(true);
  console.log("cleared", doc.intentId, "event", doc.eventId);
});
