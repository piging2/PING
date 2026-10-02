/**
 * FYD-016 served-path proof (ephemeral port; production :3100 untouched).
 *
 * Builds the REAL regen pipeline output (V1 graph -> owner CORRECT
 * decisions -> V2 changed-source regen -> presentationGraphV2), then
 * serves REAL rendered bytes over HTTP on an ephemeral port:
 *
 *   /owner/contact   - the actual Contact section rendered through the
 *                      live renderer (renderSection) with the owner-view
 *                      presentation graph.
 *   /owner/fields    - the business object's owner-visible fields through
 *                      the real FYD-010 field gate (demo_owner viewer).
 *   /observed/contact - the same Contact section rendered from the
 *                      OBSERVED V2 graph (no owner overlay).
 *
 * Asserts on the SERVED BYTES: the owner routes show the corrected
 * address/phone and not the source's values; the observed route shows the
 * source's values and not the corrections.
 *
 * Exit 0 with PASS lines, or non-zero with FAIL lines.
 */
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { HAPPY_PLACE_GRAPH } from "../../home/hatch/workspace/fyd-build/src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { generateSiteSpec } from "../../home/hatch/workspace/fyd-build/src/fyd/proceduralize/generator";
import { renderSection } from "../../home/hatch/workspace/fyd-build/src/fyd/components/renderer";
import { demoOwnerViewer } from "../../home/hatch/workspace/fyd-build/src/fyd/owner/demo-owner";
import { interpretRequest } from "../../home/hatch/workspace/fyd-build/src/fyd/owner/interpret";
import { applyIntent, applyProposal } from "../../home/hatch/workspace/fyd-build/src/fyd/owner/apply";
import { regenerate } from "../../home/hatch/workspace/fyd-build/src/fyd/regen/regenerate";
import {
  filterObjectFieldsForViewer,
} from "../../home/hatch/workspace/fyd-build/src/fyd/visibility/policy";
import type { Viewer } from "../../home/hatch/workspace/fyd-build/src/fyd/visibility/policy";
import type { ObjectGraph, ViewerContext } from "../../home/hatch/workspace/fyd-build/src/fyd/sitespec/types";

const SLUG = "happy-place";
const EVIDENCE = "/home/hatch/workspace/fyd-build/evidence/happy-place-2026-09-22.html";
const CORRECTED_ADDRESS = "123 Corrected Way, Grand Junction, CO 81501";
const CORRECTED_PHONE = "+1-970-555-0100";
const V1_PHONE = "+15412865190";
const BUSINESS_ID = "website-business-9d13c4196b4f1092";
const OWNER_VIEWER: Viewer = { id: "demo-owner", displayName: "Demo Owner", mode: "demo_owner" };
const OWNER_CTX: ViewerContext = { viewerId: "demo-owner", displayName: "Demo Owner" };

function fail(msg: string): never {
  console.error("FAIL: " + msg);
  process.exit(1);
}
function pass(msg: string): void {
  console.log("PASS: " + msg);
}

function buildV2Bytes(): Buffer {
  let html = fs.readFileSync(EVIDENCE, "utf8");
  const oldPainting =
    "Most paint failures start before the first coat goes on. We clean, sand, repair damaged areas, and prime everything first, because good prep is what keeps paint on the house.";
  html = html.replace(
    oldPainting,
    oldPainting.replace(
      "prime everything first,",
      "prime everything first, and back every job with a 5-year workmanship warranty,",
    ),
  );
  const drywallAnchor = '<a class="block" href="/estimate?service=drywall">';
  html = html.replace(
    drywallAnchor,
    '<a class="block" href="/estimate?service=gutters"><h3>Gutters</h3>' +
      "<p>Seamless gutter installation and repair.</p></a>" +
      drywallAnchor,
  );
  return Buffer.from(html, "utf8");
}

async function main(): Promise<void> {
  const graphV1 = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
  const specV1 = generateSiteSpec(graphV1, { generatedAt: "2026-09-22T15:35:00Z" });
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fyd016-serve-"));
  const dataDir = path.join(base, "data");
  const workDir = path.join(base, "work");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });
  const viewer = demoOwnerViewer(SLUG);

  const decisions = [];
  for (const req of [
    "my address is " + CORRECTED_ADDRESS,
    "my phone number is " + CORRECTED_PHONE,
  ]) {
    const intent = interpretRequest(graphV1, specV1, req);
    if (!intent) fail("interpretRequest returned null for: " + req);
    const proposed = applyIntent(graphV1, specV1, intent!, viewer, { dataDir, workDir });
    if (!proposed.ok) { const p: { error?: string } = proposed; fail("proposal rejected: " + (p.error ?? "unknown")); }
    const approved = applyProposal(
      SLUG, specV1, proposed.proposal, proposed.decisionType,
      proposed.decisionTarget, viewer, { dataDir, workDir },
    );
    if (!approved.ok) fail("approval refused");
    decisions.push(approved.decision);
  }

  const result = regenerate({
    siteSlug: SLUG,
    sourceHtmlV2: buildV2Bytes(),
    ownerIntentDecisions: decisions,
    graphV1,
    observedAt: "2026-09-22T16:00:00Z",
  });

  const home = result.specV2.pages.find((p) => p.slug === "home");
  const contact = home?.sections.find((s) => s.component === "Contact");
  if (!contact) fail("no Contact section in regenerated spec");

  const ownerContactHtml = renderToStaticMarkup(
    renderSection(contact!, { spec: result.specV2, graph: result.presentationGraphV2, viewer: OWNER_CTX }),
  ) as string;
  const observedContactHtml = renderToStaticMarkup(
    renderSection(contact!, { spec: result.specV2, graph: result.graphV2, viewer: OWNER_CTX }),
  ) as string;
  const biz = result.presentationGraphV2.objects.find((o) => o.id === BUSINESS_ID)!;
  const ownerFields = filterObjectFieldsForViewer(biz, OWNER_VIEWER).fields;
  const ownerFieldsHtml =
    "<ul>" +
    Object.entries(ownerFields)
      .map(([k, v]) => "<li>" + k + "=" + String(v) + "</li>")
      .join("") +
    "</ul>";

  const routes: Record<string, string> = {
    "/owner/contact": ownerContactHtml,
    "/owner/fields": ownerFieldsHtml,
    "/observed/contact": observedContactHtml,
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
      http.get({ host: "127.0.0.1", port, path: p }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });

  try {
    const ownerContact = await get("/owner/contact");
    if (process.env.DUMP_HTML) { fs.writeFileSync(process.env.DUMP_HTML, ownerContact, "utf8"); }
    if (!ownerContact.includes(CORRECTED_PHONE)) fail("/owner/contact missing corrected phone");
    pass("/owner/contact shows the corrected phone (" + CORRECTED_PHONE + ")");
    if (ownerContact.includes(V1_PHONE)) fail("/owner/contact leaks the source phone");
    pass("/owner/contact does not show the source phone");
    if (!ownerContact.includes("Demo addition")) fail("/owner/contact badge is not Demo addition");
    pass('/owner/contact claim badge reads "Demo addition" (FYD-038 honesty)');

    const ownerFieldsServed = await get("/owner/fields");
    if (!ownerFieldsServed.includes(CORRECTED_ADDRESS)) fail("/owner/fields missing corrected address");
    pass("/owner/fields shows the corrected address through the FYD-010 owner gate");

    const observedContact = await get("/observed/contact");
    if (!observedContact.includes(V1_PHONE)) fail("/observed/contact missing source phone");
    pass("/observed/contact shows the source phone (observed world uncorrected)");
    if (observedContact.includes(CORRECTED_PHONE)) fail("/observed/contact leaks the correction");
    pass("/observed/contact does not show the owner correction");
  } finally {
    server.close();
  }
  console.log("ALL SERVED-PATH CHECKS PASSED");
}

main().catch((e) => fail(String(e && (e as Error).message ? (e as Error).message : e)));
