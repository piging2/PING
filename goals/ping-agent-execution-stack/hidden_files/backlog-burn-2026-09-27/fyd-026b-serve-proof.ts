/**
 * FYD-026b served-path proof (ephemeral port; production :3100 untouched).
 *
 * Runs the REAL owner lane (interpretRequest -> applyIntent -> applyProposal
 * -> regenerate -> presentationGraphV2 with the FYD-016 overlay), then serves
 * REAL rendered bytes over HTTP on an ephemeral port:
 *
 *   /owner/why-this-phone    - the WHY THIS? chain for the business object's
 *                              phone field, rendered through the live
 *                              renderer with the owner-view presentation
 *                              graph (demo_owner viewer).
 *   /observed/why-this-phone - the same chain from the OBSERVED V2 graph
 *                              (no owner overlay).
 *
 * Asserts on the SERVED BYTES:
 *   - owner route: the corrected phone value, the "Demo addition" FYD-038
 *     badge, AND data-claim-classification="OWNER_AUTHORED" (the FYD-026
 *     vocabulary, now wired); the source phone is absent (owner view shows
 *     the correction, never the overridden observed value).
 *   - observed route: data-claim-classification="DIRECT" with the
 *     WEBSITE_STATEMENT badge (the source classification, untouched).
 *
 * Exit 0 with PASS lines, or non-zero with FAIL lines.
 * Run from the repo root (loadObservations resolves evidence/ from cwd):
 *   npm run build:server && node dist/serve-proofs/fyd-026b-serve-proof.js
 */

import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HAPPY_PLACE_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-graph";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import {
  WhyThis,
  type RenderContext,
} from "@/fyd/components/renderer";
import { demoOwnerViewer, enterDemoOwnerMode } from "@/fyd/owner/demo-owner";
import { interpretRequest } from "@/fyd/owner/interpret";
import { applyIntent, applyProposal } from "@/fyd/owner/apply";
import { regenerate } from "@/fyd/regen/regenerate";
import { loadObservations } from "@/fyd/why/load-observations";
import type { Viewer } from "@/fyd/visibility/policy";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import type { PingObject } from "@/lib/ping/types";

const SLUG = "happy-place";
const EVIDENCE = "/home/hatch/workspace/fyd-build/evidence/happy-place-2026-09-22.html";
const BUSINESS_ID = "website-business-9d13c4196b4f1092";
const CORRECTED_PHONE = "+1-970-555-0100";
const SOURCE_PHONE = "+15412865190";
const OWNER_VIEWER: Viewer = {
  id: "demo-owner",
  displayName: "Demo Owner",
  mode: "demo_owner",
};
// Where the served owner-route HTML is dumped for the ledger.
const DUMP = process.env.DUMP_HTML ?? "";

function fail(msg: string): never {
  console.error("FAIL: " + msg);
  process.exit(1);
}
function pass(msg: string): void {
  console.log("PASS: " + msg);
}

async function main(): Promise<void> {
  // Observed world: fixture graph, with the business object's fields bound
  // to the real business observation record so the WHY THIS? chain
  // resolves (test scaffolding; the correction lane is unchanged).
  const graphV1 = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
  const bizV1 = graphV1.objects.find((o) => o.id === BUSINESS_ID);
  if (!bizV1) fail("business object missing from fixture");
  bizV1!.fields["evidence_ref"] = "contact:business-fields";

  const specV1 = generateSiteSpec(graphV1, {
    generatedAt: "2026-09-27T18:30:00Z",
  });
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fyd026b-serve-"));
  const dataDir = path.join(base, "data");
  const workDir = path.join(base, "work");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });
  const viewer = demoOwnerViewer(SLUG);
  if (!enterDemoOwnerMode(viewer, { explicit: true, workDir })) {
    fail("demo owner mode entry refused");
  }

  const intent = interpretRequest(
    graphV1,
    specV1,
    "my phone number is " + CORRECTED_PHONE,
  );
  if (!intent || intent.kind !== "correct_field") {
    fail("interpretRequest did not yield a correct_field intent");
  }
  const proposed = applyIntent(graphV1, specV1, intent, viewer, {
    dataDir,
    workDir,
  });
  if (!proposed.ok) fail("proposal rejected");
  const approved = applyProposal(
    SLUG,
    specV1,
    proposed.proposal,
    proposed.decisionType,
    proposed.decisionTarget,
    viewer,
    { dataDir, workDir, observedGraph: graphV1 },
  );
  if (!approved.ok) fail("approval refused");

  const result = regenerate({
    siteSlug: SLUG,
    sourceHtmlV2: fs.readFileSync(EVIDENCE),
    ownerIntentDecisions: [approved.decision],
    graphV1,
    observedAt: "2026-09-27T18:30:00Z",
  });

  const observations = loadObservations(SLUG);

  function whyThisHtml(graph: ObjectGraph): string {
    const obj = graph.objects.find((o) => o.id === BUSINESS_ID);
    if (!obj) fail("business object missing from graph");
    const ctx: RenderContext = {
      spec: result.specV2,
      graph,
      viewer: { viewerId: null, displayName: null },
      evidence: { observations, conflicts: [], viewer: OWNER_VIEWER },
    };
    return renderToStaticMarkup(
      React.createElement(WhyThis, {
        ctx,
        objects: [obj as PingObject],
        valueField: "phone",
      }),
    ) as string;
  }

  const routes: Record<string, string> = {
    "/owner/why-this-phone": whyThisHtml(result.presentationGraphV2),
    "/observed/why-this-phone": whyThisHtml(result.graphV2),
  };
  const server = http.createServer((req, res) => {
    const body = routes[req.url ?? ""];
    if (body === undefined) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  console.log("serving on ephemeral port " + port);

  const get = (p: string): Promise<string> =>
    new Promise((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port, path: p }, (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve(data));
        })
        .on("error", reject);
    });

  try {
    const ownerServed = await get("/owner/why-this-phone");
    if (DUMP) fs.writeFileSync(DUMP, ownerServed, "utf8");
    if (!ownerServed.includes(CORRECTED_PHONE)) {
      fail("owner route missing the corrected phone value");
    }
    pass("owner route serves the corrected phone (" + CORRECTED_PHONE + ")");
    if (ownerServed.includes(SOURCE_PHONE)) {
      fail("owner route leaks the overridden source phone");
    }
    pass("owner route does not show the overridden source phone");
    if (!ownerServed.includes("Demo addition")) {
      fail('owner route missing the FYD-038 "Demo addition" badge');
    }
    pass('owner route carries the FYD-038 "Demo addition" badge');
    if (!ownerServed.includes('data-claim-classification="OWNER_AUTHORED"')) {
      fail('owner route missing data-claim-classification="OWNER_AUTHORED"');
    }
    pass(
      'owner route serves data-claim-classification="OWNER_AUTHORED" for the corrected value',
    );

    const observedServed = await get("/observed/why-this-phone");
    if (!observedServed.includes(SOURCE_PHONE)) {
      fail("observed route missing the source phone value");
    }
    pass("observed route serves the source phone (observed world uncorrected)");
    if (!observedServed.includes('data-claim-classification="DIRECT"')) {
      fail('observed route missing data-claim-classification="DIRECT"');
    }
    pass(
      'observed route keeps the source classification DIRECT ("Website statement" badge)',
    );
    if (!observedServed.includes("Website statement")) {
      fail('observed route missing the "Website statement" badge');
    }
    pass('observed route carries the "Website statement" FYD-038 badge');
  } finally {
    server.close();
  }
  console.log("ALL SERVED-PATH CHECKS PASSED");
}

main().catch((e) =>
  fail(String(e && (e as Error).message ? (e as Error).message : e)),
);
