/**
 * FYD-018 served-path proof (ephemeral port; production :3100 untouched).
 *
 * Makes a REAL owner correction through the REAL lane (interpretRequest ->
 * applyIntent -> applyProposal -> persisted intent store), then serves the
 * persisted correction record over HTTP on an ephemeral port:
 *
 *   GET /owner/decisions?viewer=demo_owner - the persisted OwnerDecision
 *       record JSON, read from the on-disk store bytes. Assert the served
 *       bytes carry target/correctionField/before/after/classification/
 *       decidedAt/actor as EXPLICIT top-level keys with correct values.
 *   GET /owner/decisions?viewer=visitor     - 403. The record surface is
 *       gated by the real FYD-010 maySeeField policy: the corrected fields
 *       are owner-only, so visitors get no record and no owner values.
 *
 * Source tree != built artifact != served artifact: the served bytes are
 * read from the store file the compiled pipeline wrote; assertions run
 * against the HTTP-served bytes, never the source tree.
 *
 * Exit 0 with PASS lines, or non-zero with FAIL lines.
 */
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { HAPPY_PLACE_GRAPH } from "../../home/hatch/workspace/fyd-build/src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { generateSiteSpec } from "../../home/hatch/workspace/fyd-build/src/fyd/proceduralize/generator";
import {
  demoOwnerViewer,
  enterDemoOwnerMode,
} from "../../home/hatch/workspace/fyd-build/src/fyd/owner/demo-owner";
import { interpretRequest } from "../../home/hatch/workspace/fyd-build/src/fyd/owner/interpret";
import {
  applyIntent,
  applyProposal,
} from "../../home/hatch/workspace/fyd-build/src/fyd/owner/apply";
import {
  loadOwnerIntent,
  ownerIntentPath,
  type OwnerDecision,
} from "../../home/hatch/workspace/fyd-build/src/fyd/owner/store";
import {
  maySeeField,
  VISITOR_VIEWER,
  type Viewer,
} from "../../home/hatch/workspace/fyd-build/src/fyd/visibility/policy";

const SLUG = "happy-place";
const BUSINESS_ID = "website-business-9d13c4196b4f1092";
const OBSERVED_PHONE = "+15412865190";
const CORRECTED_PHONE = "+1-970-555-0199";

const OWNER_VIEWER: Viewer = {
  id: "demo-owner",
  displayName: "Demo Owner",
  mode: "demo_owner",
};

function fail(msg: string): never {
  console.error("FAIL: " + msg);
  process.exit(1);
}
function pass(msg: string): void {
  console.log("PASS: " + msg);
}

function get(port: number, p: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: p }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      })
      .on("error", reject);
  });
}

async function main(): Promise<void> {
  // 1. The real lane: one owner correction, persisted to a real store file.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fyd-018-serve-"));
  const dataDir = path.join(base, "data");
  const workDir = path.join(base, "work");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const graph = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH));
  const spec = generateSiteSpec(graph, { generatedAt: "2026-09-27T16:00:00Z" });
  const viewer = demoOwnerViewer(SLUG);
  if (!enterDemoOwnerMode(viewer, { explicit: true, workDir })) {
    fail("demo owner mode entry refused");
  }
  const intent = interpretRequest(graph, spec, "my phone number is " + CORRECTED_PHONE);
  if (!intent) fail("interpretRequest returned null");
  const proposed = applyIntent(graph, spec, intent, viewer, { dataDir, workDir });
  if (!proposed.ok) fail("proposal rejected: " + proposed.error);
  const approved = applyProposal(
    SLUG,
    spec,
    proposed.proposal,
    proposed.decisionType,
    proposed.decisionTarget,
    viewer,
    { dataDir, workDir, observedGraph: graph },
  );
  if (!approved.ok) fail("approval refused: " + approved.error);
  const storeFile = ownerIntentPath(SLUG, dataDir);
  if (!fs.existsSync(storeFile)) fail("store file was not written");
  pass("real lane persisted the correction record to " + storeFile);

  // 2. Ephemeral server. The record surface is gated by the REAL FYD-010
  //    policy: a record is served only when the viewer may see every
  //    corrected field it carries. Visitors never may.
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.pathname !== "/owner/decisions") {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const mode = u.searchParams.get("viewer");
    const asking: Viewer = mode === "demo_owner" ? OWNER_VIEWER : VISITOR_VIEWER;
    const decisions = loadOwnerIntent(SLUG, dataDir).decisions;
    const gated = decisions.filter((d: OwnerDecision) => {
      if (d.type !== "CORRECT" || !d.correctionField) return true;
      return maySeeField(d.correctionField, asking);
    });
    // Owner-only records must never leak to a viewer who may not see the
    // corrected fields: deny the whole surface rather than partial-leak.
    if (gated.length !== decisions.length) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden: owner records are not visible to this viewer" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ decisions: gated }, null, 2));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  console.log("serving on ephemeral port " + port);
  try {
    // 3. Owner view: explicit fields in the served bytes.
    const owner = await get(port, "/owner/decisions?viewer=demo_owner");
    if (owner.status !== 200) fail("owner view returned " + owner.status);
    let served: { decisions: OwnerDecision[] };
    try {
      served = JSON.parse(owner.body);
    } catch {
      fail("owner view body is not JSON");
    }
    if (served!.decisions.length !== 1) fail("expected exactly one decision");
    const rec = served!.decisions[0];
    const explicit: Record<string, unknown> = {};
    for (const key of [
      "type",
      "target",
      "correctionField",
      "before",
      "after",
      "classification",
      "decidedAt",
      "actor",
      "value",
    ]) {
      if (!Object.prototype.hasOwnProperty.call(rec, key)) {
        fail("served record lacks explicit top-level key: " + key);
      }
      explicit[key] = (rec as unknown as Record<string, unknown>)[key];
    }
    if (explicit["type"] !== "CORRECT") fail("type mismatch");
    if (explicit["target"] !== BUSINESS_ID) fail("target mismatch");
    if (explicit["correctionField"] !== "phone") fail("correctionField mismatch");
    if (explicit["before"] !== OBSERVED_PHONE) fail("before mismatch: " + JSON.stringify(explicit["before"]));
    if (explicit["after"] !== CORRECTED_PHONE) fail("after mismatch");
    if (explicit["classification"] !== "DEMO_SYNTHETIC") fail("classification mismatch");
    if (typeof explicit["decidedAt"] !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(explicit["decidedAt"] as string)) {
      fail("decidedAt not an explicit timestamp");
    }
    if (explicit["actor"] !== "demo_owner") fail("actor mismatch");
    if (typeof explicit["value"] !== "string" || !/^[0-9a-f]{64}$/.test(explicit["value"] as string)) {
      fail("proposal digest not pinned");
    }
    pass(
      "owner view served bytes carry explicit target/before/after/classification/timestamp/actor " +
        "(before=" + OBSERVED_PHONE + ", after=" + CORRECTED_PHONE + ")",
    );

    // 4. Visitor view: no record, no owner values in the served bytes.
    const visitor = await get(port, "/owner/decisions?viewer=visitor");
    if (visitor.status !== 403) fail("visitor view returned " + visitor.status + ", expected 403");
    for (const secret of [CORRECTED_PHONE, OBSERVED_PHONE, BUSINESS_ID]) {
      if (visitor.body.includes(secret)) {
        fail("visitor view leaked an owner value: " + secret);
      }
    }
    pass("visitor view is 403 and leaks no owner values (no before/after/target in served bytes)");
  } finally {
    server.close();
  }
  console.log("ALL SERVED-PATH CHECKS PASSED");
}

main().catch((err) => fail(String((err as Error)?.message ?? err)));
