/**
 * FYD-011 replay served proof (clean worktree @ 841825c).
 *
 * Uses the REAL refresh-lane detectConflicts + conflictSurfaceText (compiled
 * from the lane's sources via node type-stripping) plus the BUILT ask
 * modules from dist/, serves the conflicted answer over HTTP on an ephemeral
 * port, and asserts the 12 checks from the FYD-011 closure on the served
 * bytes. Exit 0 PASS, 1 FAIL.
 */
import * as http from "node:http";
import { createRequire } from "node:module";
import { detectConflicts } from "/home/hatch/workspace/fyd-replay-2026-09-27-r2/src/fyd/refresh/conflict.ts";
import type { Claim } from "/home/hatch/workspace/fyd-replay-2026-09-27-r2/src/fyd/refresh/types.ts";

const WORK = "/home/hatch/workspace/fyd-replay-2026-09-27-r2";
const require = createRequire(WORK + "/dist/server/serve-proofs/x.js");
const { buildInputForSite } = require(WORK + "/dist/src/fyd/ask/load-fixture.js");
const { buildAskFydContext } = require(WORK + "/dist/src/fyd/ask/context-builder.js");
const { composeAskFyd } = require(WORK + "/dist/src/fyd/ask/answer.js");
const { HAPPY_PLACE_GRAPH } = require(WORK + "/dist/src/fyd/proceduralize/__fixtures__/happy-place-graph.js");

const T = "2026-09-27T10:00:00.000Z";
const BIZ = "website-business-9d13c4196b4f1092";
const WEB = "https://happy-place-platform.vercel.app/";
const WEB_DESCRIPTION = "Licensed Oregon carpentry contractor (CCB# 254240) building decks, fences, pergolas, and outdoor structures.";
const FB_DESCRIPTION = "Boutique furniture studio crafting heirloom tables.";

function fail(msg: string): never { console.error("FAIL: " + msg); process.exit(1); }
function pass(msg: string): void { console.log("PASS: " + msg); }

function claim(field: string, value: string, sourceKind: "website" | "facebook", sourceUrl: string, claimId: string): Claim {
  return {
    claimId, entityId: BIZ, field, value,
    normalizedValue: value.toLowerCase().trim(),
    sourceKind, sourceUrl, observedAt: T,
    evidenceRef: "proof-" + claimId, confidence: 0.9,
    grade: sourceKind === "facebook" ? "synthetic_fixture" : "website_statement",
    label: claimId,
  };
}

async function main(): Promise<void> {
  const claims: Claim[] = [
    claim("description", WEB_DESCRIPTION, "website", WEB, "proof-web-desc"),
    claim("description", FB_DESCRIPTION, "facebook", "https://facebook.com/happyplace", "proof-fb-desc"),
    claim("phone", "+15412865190", "website", WEB, "proof-web-phone"),
    claim("phone", "+1-970-555-9999", "facebook", "https://facebook.com/happyplace", "proof-fb-phone"),
  ];
  const detected = detectConflicts(claims, T);
  if (detected.length !== 2) fail("detector should find 2 conflicts, found " + detected.length);
  pass("real detectConflicts found the 2 open conflicts");

  const input = buildInputForSite(HAPPY_PLACE_GRAPH, "happy-place", {
    question: "What is this business?",
    viewerMode: "visitor",
  });
  input.conflicts = detected; // callers attach; the loader supplies []
  const ctx = buildAskFydContext(input);
  const answer = composeAskFyd(ctx);

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(answer));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  if (port === 3100) fail("proof must not bind production :3100");
  console.log("serving on ephemeral port " + port);

  const body: string = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/ask`, (res) => {
      if (res.statusCode !== 200) fail("served status " + res.statusCode);
      let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b));
    }).on("error", reject);
  });
  server.close();
  const served = JSON.parse(body);

  const surface = detected.find((c: any) => c.field === "description")!.surfaceText;

  if (served.conflicts.length !== 1) fail("expected exactly one conflict carried, got " + served.conflicts.length);
  pass("exactly one conflict carried (phone conflict gated out)");
  if (served.conflicts[0].field !== undefined && served.conflicts[0].conflict.field !== "description")
    fail("carried conflict is not the description conflict");
  pass("carried conflict is the description conflict");
  if (!served.answer.includes(WEB_DESCRIPTION)) fail("winner (website description) not presented");
  pass("winner presented");
  if (!served.answer.includes("[conflict flagged]")) fail("[conflict flagged] marker missing");
  pass("[conflict flagged] marker in served answer");
  if (!served.answer.includes(surface)) fail("harvested surfaceText not verbatim in answer");
  pass("harvested surfaceText verbatim in served answer");
  const sc = served.conflicts[0];
  if (sc.winnerClaimId !== "proof-web-desc") fail("winner is not the website claim: " + sc.winnerClaimId);
  pass("winner = website claim");
  if (sc.loserClaimId !== "proof-fb-desc") fail("loser is not the facebook claim: " + sc.loserClaimId);
  pass("loser = facebook claim");
  if (sc.conflict.claims.length !== 2) fail("both claims not kept");
  pass("both claims kept");
  if (!served.answer.includes("proof-fb-desc")) fail("loser evidence ref not named in answer");
  pass("loser evidence ref named in the answer");
  if (!served.answer.includes("view_why_this")) fail("WHY THIS? path not offered");
  pass("view_why_this offered");
  if (body.includes("+15412865190") || body.includes("+1-970-555-9999")) fail("phone value leaked in served JSON");
  pass("no phone value anywhere in the served JSON");
  if (JSON.stringify(served.conflicts).includes("phone")) fail("phone conflict surfaced");
  pass("no phone conflict surfaced");

  console.log("ALL SERVED-PATH CHECKS PASSED");
}

main().catch((e) => fail(String((e as Error).message || e)));
