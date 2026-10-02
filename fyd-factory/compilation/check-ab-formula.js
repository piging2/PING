const fs = require("node:fs");
const crypto = require("node:crypto");
for (const s of ["a", "b"]) {
  const l = fs.readFileSync(`/home/nolan/fyd-compile-harness/queue-shard-${s}/manifest.jsonl`, "utf8").split("\n").filter((x) => x.trim());
  const jobs = l.map((x) => JSON.parse(x));
  let bad = 0;
  for (const j of jobs) {
    const expected = crypto.createHash("sha256").update(`${j.fixture_id}:${j.seed}`, "utf8").digest("hex");
    if (expected !== j.job_id) {
      bad++;
      if (bad <= 3) {
        console.log(`shard-${s} mismatch: fixture_id=${JSON.stringify(j.fixture_id)} seed=${j.seed} status=${j.status} attempts=${j.attempts}`);
        console.log(`  expected=${expected.slice(0, 16)}... got=${j.job_id.slice(0, 16)}...`);
      }
    }
  }
  console.log(`shard-${s}: ${jobs.length} jobs, ${bad} formula mismatches`);
}
