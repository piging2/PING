/* Integration proof: determinism + disposability of the file-dump seam.
 * Uses the REAL compiled seam modules (dist) against the REAL dump.py
 * output and a FIXED stub-journal history. NOT the live journal. */
const { createHash } = require("node:crypto");
const { readFileSync, unlinkSync, existsSync } = require("node:fs");
const { FileDumpProjectionReader } = require("@/fyd/data/file-dump-projection-reader");
const { canonicalize } = require("@/lib/ping/ask-composer");

let pass = 0, fail = 0;
const check = (n, c, d) => { if (c) { pass++; console.log("  PASS " + n); } else { fail++; console.log("  FAIL " + n + (d ? ": " + d : "")); } };

// Representative consumer: the builder consumes the snapshot's canonical
// bytes. A deterministic consumer derives identical output from identical
// bytes. (The real generateSiteSpec's deps are not landed on this line, so
// this stands in for builder consumption over the exact consumed bytes.)
function representativeConsumerOutput(canonicalBytes) {
  const doc = JSON.parse(canonicalBytes);
  const titles = doc.graph.objects.map(o => o.title).sort();
  const derived = { titles, relCount: doc.graph.relationships.length,
    intents: (doc.presentationIntent?.directives ?? []).length };
  return createHash("sha256").update(canonicalize(derived), "utf8").digest("hex");
}

(async () => {
  const reader = new FileDumpProjectionReader();
  const run1 = JSON.parse(readFileSync("/tmp/w5-int/run1.json", "utf8"));
  const run2 = JSON.parse(readFileSync("/tmp/w5-int/run2.json", "utf8"));

  // Point the reader at each run file via FYD_PROJECTION_DIR copies
  const { mkdtempSync, copyFileSync } = require("node:fs");
  const { tmpdir } = require("node:os");
  const { join } = require("node:path");
  const d1 = mkdtempSync(join(tmpdir(), "w5i1-")), d2 = mkdtempSync(join(tmpdir(), "w5i2-"));
  copyFileSync("/tmp/w5-int/run1.json", join(d1, "happy-place.json"));
  copyFileSync("/tmp/w5-int/run2.json", join(d2, "happy-place.json"));

  process.env.FYD_PROJECTION_DIR = d1;
  const s1 = await reader.readSnapshot("happy-place");
  process.env.FYD_PROJECTION_DIR = d2;
  const s2 = await reader.readSnapshot("happy-place");

  console.log("1. determinism: same history, two dump runs");
  check("snapshotDigest identical across runs", s1.snapshotDigest === s2.snapshotDigest);
  check("sourceDigest identical across runs", s1.sourceDigest === s2.sourceDigest);
  check("canonicalBytes byte-identical across runs", s1.canonicalBytes === s2.canonicalBytes);
  check("reader snapshotDigest equals digest of run1 file", s1.snapshotDigest === createHash("sha256").update(s1.canonicalBytes, "utf8").digest("hex"));
  console.log("   snapshotDigest:", s1.snapshotDigest.slice(0, 24) + "...");
  console.log("   sourceDigest:  ", s1.sourceDigest.slice(0, 24) + "...");
  const consumerOut1 = representativeConsumerOutput(s1.canonicalBytes);
  const consumerOut2 = representativeConsumerOutput(s2.canonicalBytes);
  check("representative consumer output identical", consumerOut1 === consumerOut2);

  console.log("2. disposability: delete + regenerate through the seam");
  process.env.FYD_PROJECTION_DIR = "/tmp/w5-int/out";
  process.env.FYD_DUMP_PY = "/home/hatch/workspace/lane-d-impl/tools/fyd-site-projection/dump.py";
  if (existsSync("/tmp/w5-int/out/happy-place.json")) unlinkSync("/tmp/w5-int/out/happy-place.json");
  check("snapshot deleted", !existsSync("/tmp/w5-int/out/happy-place.json"));
  let threw = false;
  try { await reader.readSnapshot("happy-place"); } catch (e) { threw = /no snapshot/.test(e.message); }
  check("read fails closed after delete", threw);
  const regen = await reader.regenerate("happy-place");
  check("regenerate returns the same snapshotDigest", regen.snapshotDigest === s1.snapshotDigest, regen.snapshotDigest);
  check("regenerate returns the same sourceDigest", regen.sourceDigest === s1.sourceDigest);
  const s3 = await reader.readSnapshot("happy-place");
  check("rebuilt snapshot canonicalBytes identical", s3.canonicalBytes === s1.canonicalBytes);
  check("representative consumer output identical after regen", representativeConsumerOutput(s3.canonicalBytes) === consumerOut1);
  console.log("   regen outPath:", regen.outPath);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("INT PROOF CRASH:", e.message); process.exit(2); });
