/**
 * Build a job queue manifest from fixtures x seeds.
 *
 * Usage:
 *   node enqueue.js --fixtures-dir <dir> --out <manifest.jsonl>
 *                   --seeds 0,7 | 0-49 --pig-fixtures-dir <dir>
 *
 * job_id = sha256(fixture_id + ":" + seed). Idempotent: re-running with the
 * same fixtures/seeds produces identical job_ids, so re-enqueueing never
 * duplicates work (queue-runner treats done jobs as no-ops).
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

function parseSeeds(s) {
  const out = [];
  for (const part of s.split(",")) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) {
      for (let i = parseInt(m[1], 10); i <= parseInt(m[2], 10); i++) out.push(i);
    } else {
      out.push(parseInt(part, 10));
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const isDir = e.isDirectory() || (e.isSymbolicLink() && fs.statSync(p).isDirectory());
    if (isDir) yield* walk(p);
    else if (e.name.endsWith(".json")) yield p;
  }
}

const fixturesDir = arg("--fixtures-dir");
const outPath = arg("--out");
const seeds = parseSeeds(arg("--seeds", "0"));
const pigFixturesDir = arg("--pig-fixtures-dir", fixturesDir);
if (!path.isAbsolute(pigFixturesDir)) {
  // The worker resolves fixture paths exactly as written; a relative path
  // would resolve against the worker's CWD and ENOENT every job. Fail closed.
  console.error(`--pig-fixtures-dir must be absolute, got: ${pigFixturesDir}`);
  process.exit(2);
}

const existing = new Map();
if (fs.existsSync(outPath)) {
  for (const line of fs.readFileSync(outPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    existing.set(j.job_id, j);
  }
}

const files = [...walk(fixturesDir)].sort();
const lines = [];
let added = 0;
for (const f of files) {
  const fixtureId = path.relative(fixturesDir, f).replace(/\\/g, "/");
  for (const seed of seeds) {
    const jobId = crypto.createHash("sha256").update(`${fixtureId}:${seed}`, "utf8").digest("hex");
    if (existing.has(jobId)) {
      lines.push(JSON.stringify(existing.get(jobId)));
      continue;
    }
    lines.push(JSON.stringify({
      job_id: jobId,
      fixture_id: fixtureId,
      seed,
      fixture_path: path.join(pigFixturesDir, fixtureId).replace(/\\/g, "/"),
      status: "pending",
      attempts: 0, // dispatch-based: incremented on EVERY dispatch
      isolate: false,
      quarantined: false, // quarantine is a flag on status:"failed", not a status
      publish_seq: 0, // G2: input generation; incremented on every dispatch
      done_seq: null, // G2: dispatch_seq accepted at publication
      updated_at: new Date().toISOString(),
      last_error: null,
    }));
    added++;
  }
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`manifest: ${files.length} fixtures x ${seeds.length} seeds = ${lines.length} jobs (${added} new), seeds=[${seeds.join(",")}]`);
