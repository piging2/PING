// Verify shard manifests A-J: per-manifest 500 lines/500 unique job_ids,
// zero overlap across all 10 shards, spot-check job_id formula.
const fs = require("node:fs");
const crypto = require("node:crypto");

const SHARDS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const BASE = "/home/nolan/fyd-compile-harness";

function readManifest(shard) {
  const p = `${BASE}/queue-shard-${shard}/manifest.jsonl`;
  const lines = fs.readFileSync(p, "utf8").split("\n").filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l));
}

const seen = new Map(); // job_id -> shard
let allOk = true;
for (const s of SHARDS) {
  const jobs = readManifest(s);
  const ids = jobs.map((j) => j.job_id);
  const unique = new Set(ids);
  let overlap = 0;
  for (const id of ids) {
    if (seen.has(id)) {
      overlap++;
      console.log(`OVERLAP: ${id} in shard ${s} already seen in shard ${seen.get(id)}`);
    }
    seen.set(id, s);
  }
  const ok = jobs.length === 500 && unique.size === 500 && overlap === 0;
  if (!ok) allOk = false;
  console.log(`shard-${s}: lines=${jobs.length} unique_job_ids=${unique.size} overlap_with_prior=${overlap} ${ok ? "OK" : "FAIL"}`);
}

// Spot-check job_id formula on 5 jobs per shard: sha256(fixture_id + ":" + seed)
let formulaOk = 0, formulaChecked = 0;
for (const s of SHARDS) {
  const jobs = readManifest(s);
  for (const j of [jobs[0], jobs[123], jobs[250], jobs[374], jobs[499]]) {
    formulaChecked++;
    const expected = crypto.createHash("sha256").update(`${j.fixture_id}:${j.seed}`, "utf8").digest("hex");
    if (expected === j.job_id && j.fixture_path.startsWith("/") && j.status === "pending") formulaOk++;
    else console.log(`FORMULA MISMATCH shard-${s} ${j.job_id}`);
  }
}
console.log(`formula spot-check: ${formulaOk}/${formulaChecked} OK`);
console.log(`total unique job_ids across 10 shards: ${seen.size} (expect 5000)`);
if (seen.size !== 5000) allOk = false;
console.log(allOk ? "MANIFEST VERIFICATION: PASS" : "MANIFEST VERIFICATION: FAIL");
process.exit(allOk ? 0 : 1);
