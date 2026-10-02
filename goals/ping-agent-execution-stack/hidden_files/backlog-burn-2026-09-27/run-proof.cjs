/**
 * FYD-018 served-path proof runner (plain JS, throwaway glue).
 * The real assertion logic is the compiled pipeline; this file only
 * drives it, serves it over HTTP on an ephemeral port, and asserts on
 * the SERVED BYTES. Production :3100 is untouched.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const LIB = "/tmp/fyd018-serve/lib/src";
const { HAPPY_PLACE_GRAPH } = require(LIB + "/fyd/proceduralize/__fixtures__/happy-place-graph");
const { generateSiteSpec } = require(LIB + "/fyd/proceduralize/generator");
const { demoOwnerViewer, enterDemoOwnerMode } = require(LIB + "/fyd/owner/demo-owner");
const { interpretRequest } = require(LIB + "/fyd/owner/interpret");
const { applyIntent, applyProposal } = require(LIB + "/fyd/owner/apply");
const { loadOwnerIntent, ownerIntentPath } = require(LIB + "/fyd/owner/store");
const { maySeeField, VISITOR_VIEWER } = require(LIB + "/fyd/visibility/policy");

const SLUG = "happy-place";
const BUSINESS_ID = "website-business-9d13c4196b4f1092";
const OBSERVED_PHONE = "+15412865190";
const CORRECTED_PHONE = "+1-970-555-0199";
const OWNER_VIEWER = { id: "demo-owner", displayName: "Demo Owner", mode: "demo_owner" };

function fail(msg) {
  console.error("FAIL: " + msg);
  process.exit(1);
}
function pass(msg) {
  console.log("PASS: " + msg);
}
function get(port, p) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: p }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      })
      .on("error", reject);
  });
}

async function main() {
  // 1. The real lane: one owner correction, persisted to a real store file.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fyd-018-serve-"));
  const dataDir = path.join(base, "data");
  const workDir = path.join(base, "work");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const graph = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH));
  const spec = generateSiteSpec(graph, { generatedAt: "2026-09-27T16:00:00Z" });
  const viewer = demoOwnerViewer(SLUG);
  if (!enterDemoOwnerMode(viewer, { explicit: true, workDir })) fail("demo owner mode entry refused");
  const intent = interpretRequest(graph, spec, "my phone number is " + CORRECTED_PHONE);
  if (!intent) fail("interpretRequest returned null");
  const proposed = applyIntent(graph, spec, intent, viewer, { dataDir, workDir });
  if (!proposed.ok) fail("proposal rejected: " + proposed.error);
  const approved = applyProposal(
    SLUG, spec, proposed.proposal, proposed.decisionType, proposed.decisionTarget,
    viewer, { dataDir, workDir, observedGraph: graph },
  );
  if (!approved.ok) fail("approval refused: " + approved.error);
  const storeFile = ownerIntentPath(SLUG, dataDir);
  if (!fs.existsSync(storeFile)) fail("store file was not written");
  pass("real lane persisted the correction record to " + storeFile);

  // 2. Ephemeral server. The record surface is gated by the REAL FYD-010
  //    policy: served only when the viewer may see every corrected field.
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || "/", "http://127.0.0.1");
    if (u.pathname !== "/owner/decisions") {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const asking = u.searchParams.get("viewer") === "demo_owner" ? OWNER_VIEWER : VISITOR_VIEWER;
    const decisions = loadOwnerIntent(SLUG, dataDir).decisions;
    const gated = decisions.filter((d) =>
      d.type !== "CORRECT" || !d.correctionField ? true : maySeeField(d.correctionField, asking),
    );
    if (gated.length !== decisions.length) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden: owner records are not visible to this viewer" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ decisions: gated }, null, 2));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log("serving on ephemeral port " + port);
  try {
    // 3. Owner view: explicit fields in the served bytes.
    const owner = await get(port, "/owner/decisions?viewer=demo_owner");
    if (owner.status !== 200) fail("owner view returned " + owner.status);
    let served;
    try { served = JSON.parse(owner.body); } catch { fail("owner view body is not JSON"); }
    if (served.decisions.length !== 1) fail("expected exactly one decision");
    const rec = served.decisions[0];
    const explicit = {};
    for (const key of ["type", "target", "correctionField", "before", "after", "classification", "decidedAt", "actor", "value"]) {
      if (!Object.prototype.hasOwnProperty.call(rec, key)) fail("served record lacks explicit top-level key: " + key);
      explicit[key] = rec[key];
    }
    const checks = [
      [explicit.type === "CORRECT", "type"],
      [explicit.target === BUSINESS_ID, "target"],
      [explicit.correctionField === "phone", "correctionField"],
      [explicit.before === OBSERVED_PHONE, "before (got " + JSON.stringify(explicit.before) + ")"],
      [explicit.after === CORRECTED_PHONE, "after"],
      [explicit.classification === "DEMO_SYNTHETIC", "classification"],
      [typeof explicit.decidedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(explicit.decidedAt), "decidedAt"],
      [explicit.actor === "demo_owner", "actor"],
      [typeof explicit.value === "string" && /^[0-9a-f]{64}$/.test(explicit.value), "value (proposal digest pinned)"],
    ];
    for (const [ok, name] of checks) if (!ok) fail("served field mismatch: " + name);
    pass("owner view served bytes carry explicit target/before/after/classification/timestamp/actor (before=" + OBSERVED_PHONE + ", after=" + CORRECTED_PHONE + ")");

    // 4. Visitor view: no record, no owner values in the served bytes.
    const visitor = await get(port, "/owner/decisions?viewer=visitor");
    if (visitor.status !== 403) fail("visitor view returned " + visitor.status + ", expected 403");
    for (const secret of [CORRECTED_PHONE, OBSERVED_PHONE, BUSINESS_ID]) {
      if (visitor.body.includes(secret)) fail("visitor view leaked an owner value: " + secret);
    }
    pass("visitor view is 403 and leaks no owner values (no before/after/target in served bytes)");
  } finally {
    server.close();
  }
  console.log("ALL SERVED-PATH CHECKS PASSED");
}

main().catch((err) => fail(String((err && err.message) || err)));
