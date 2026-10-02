/**
 * SCRATCH E2E (not for commit): exercises the real approve/clear route
 * handlers against the LIVE demo gateway (127.0.0.1:18199) with demo-owner
 * mode enabled in-process. Uses a temp projection dir seeded from the real
 * happy-place projection. Leaves one journaled directive for the dump
 * E2E; the clear step is run separately after the dump verifies.
 *
 * Run with: npx jest --config src/fyd/customize/jest.config.cjs __tests__/approve-live
 * DELETE AFTER USE.
 */
process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";

import { copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJ_DIR = join(tmpdir(), "lane-d-e2e-projections");
mkdirSync(PROJ_DIR, { recursive: true });
copyFileSync(
  "/home/nolan/ping/var/fyd-projections/happy-place.json",
  join(PROJ_DIR, "happy-place.json"),
);
process.env.FYD_PROJECTION_DIR = PROJ_DIR;

import { GET, POST } from "@/app/api/fyd/customize/route";

const TEXT = "Make the services section the first thing people see";

function post(body: unknown): Request {
  return new Request("http://127.0.0.1/api/fyd/customize", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("approve E2E (live demo gateway)", () => {
  let proposal: Record<string, unknown>;

  test("parse returns a digest-bound proposal", async () => {
    const res = await POST(post({ action: "parse", siteId: "happy-place", text: TEXT }));
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { ok: boolean; proposal: Record<string, unknown> };
    expect(doc.ok).toBe(true);
    proposal = doc.proposal;
    expect(typeof proposal.proposalDigest).toBe("string");
  });

  test("approve without demo mode is 403", async () => {
    delete process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
    const res = await POST(post({ action: "approve", siteId: "happy-place", text: TEXT, proposal }));
    const doc = (await res.json()) as { ok: boolean; code: string };
    expect(res.status).toBe(403);
    expect(doc.code).toBe("demo_owner_mode_required");
    process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";
  });

  test("approve with demo mode journals the directive", async () => {
    const res = await POST(post({ action: "approve", siteId: "happy-place", text: TEXT, proposal }));
    const doc = (await res.json()) as {
      ok: boolean;
      intentId?: string;
      eventId?: string;
      note?: string;
    };
    expect(res.status).toBe(200);
    expect(doc.ok).toBe(true);
    expect(typeof doc.eventId).toBe("string");
    expect(typeof doc.intentId).toBe("string");
    expect(doc.note).toContain("DEMO OWNER MODE - not real authentication");
    (global as { __intentId?: string }).__intentId = doc.intentId;
  });

  test("tampered proposal is 409, nothing applied", async () => {
    const bad = { ...proposal, propsDiff: { moveFrom: 2, moveTo: 5 } };
    const res = await POST(post({ action: "approve", siteId: "happy-place", text: TEXT, proposal: bad }));
    expect(res.status).toBe(409);
    const doc = (await res.json()) as { ok: boolean; code: string };
    expect(doc.code).toBe("proposal_altered");
  });

  test("unsupported text cannot be approved", async () => {
    const res = await POST(
      post({ action: "approve", siteId: "happy-place", text: "make the site blue", proposal }),
    );
    expect(res.status).toBe(400);
  });
});
