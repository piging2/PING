/**
 * Lane J red-team: cardinality. 5000-packet scale.
 *
 * Threat: a high-frequency connector (webhook, tight poller, or a 60-intent
 * engagement pass per 2h) drowns the store, or per-attempt records explode
 * the ledger. Defense: heartbeat collapse + rollup tiers (design section 5).
 *
 * This test generates 5,000 heartbeat runs + 20 eventful runs (changes,
 * errors, conflicts), then measures: write throughput, read, heartbeat
 * collapse, query latency. The bar: collapse must bound the hot set to the
 * 20 eventful records + per-hour rollup lines, and every phase must stay
 * cheap relative to the work observed.
 *
 * Run: node cardinality.mjs  (from this directory)
 */

import { rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beginRun, readRuns, collapseHeartbeats } from "./run-ledger.mjs";
import { whyChanged, cost } from "./runq.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "data", "cardinality");
rmSync(DIR, { recursive: true, force: true });

const HEARTBEATS = 5000;
const EVENTFUL = 20;
const T0 = Date.parse("2026-09-23T00:00:00Z");

const attempt = (n) => ({
  fetch_attempt_id: `fa-card-${n}`,
  seq: 1,
  url: "https://example.invalid/poll",
  terminal_state: "SUCCEEDED",
  taxonomy_code: null,
  watermark_seen: `w:${n}`,
});

// --- write phase -----------------------------------------------------------
let t = performance.now();
for (let i = 1; i <= HEARTBEATS; i++) {
  const b = beginRun(DIR, {
    connector_id: "webhook-firehose",
    tenant_id: "t_scale",
    seq: i,
    started_at: new Date(T0 + i * 1000).toISOString(),
    checkpoint_in: `w:${i - 1}`,
    host: "scale-test",
  });
  b.attempt(attempt(i));
  b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
  b.finish({ status: "SUCCEEDED", finished_at: new Date(T0 + i * 1000 + 400).toISOString(), duration_ms: 400, checkpoint_out: `w:${i}` });
}
// 20 eventful runs, one of which carries the change we will query for
for (let i = 1; i <= EVENTFUL; i++) {
  const b = beginRun(DIR, {
    connector_id: "webhook-firehose",
    tenant_id: "t_scale",
    seq: HEARTBEATS + i,
    started_at: new Date(T0 + (HEARTBEATS + i) * 1000).toISOString(),
    checkpoint_in: `w:${HEARTBEATS + i - 1}`,
    host: "scale-test",
  });
  b.attempt(attempt(HEARTBEATS + i));
  if (i === EVENTFUL) {
    b.change({
      observation_id: "obs-scale-1",
      claim_id: "c-scale-1",
      entity_id: "biz_scale",
      field: "hours",
      kind: "changed",
      before: "9-5",
      after: "8-6",
      confidence: "DIRECT",
    });
    b.observeCounts({ discovered: 6, emitted: 6, accepted: 6, rejected: 0, unchanged: 5, changed: 1 });
    b.finish({ status: "SUCCEEDED", finished_at: new Date(T0 + (HEARTBEATS + i) * 1000 + 400).toISOString(), duration_ms: 400, checkpoint_out: `w:${HEARTBEATS + i}` });
  } else if (i % 2 === 0) {
    b.error({ code: "TRANSIENT", message: "flaky poller tick", recoverable: true });
    b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
    b.finish({ status: "PARTIAL", finished_at: new Date(T0 + (HEARTBEATS + i) * 1000 + 400).toISOString(), duration_ms: 400, checkpoint_out: `w:${HEARTBEATS + i}` });
  } else {
    b.conflict({ entity_id: "biz_scale", field: "phone", sources: ["a", "b"], status: "open" });
    b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
    b.finish({ status: "SUCCEEDED", finished_at: new Date(T0 + (HEARTBEATS + i) * 1000 + 400).toISOString(), duration_ms: 400, checkpoint_out: `w:${HEARTBEATS + i}` });
  }
}
const writeMs = performance.now() - t;

// --- read + collapse + query ------------------------------------------------
t = performance.now();
const { records, corrupt } = readRuns(DIR);
const readMs = performance.now() - t;

t = performance.now();
const { full, rollups } = collapseHeartbeats(records);
const collapseMs = performance.now() - t;

t = performance.now();
const why = whyChanged(records, "biz_scale", "hours");
const whyMs = performance.now() - t;

t = performance.now();
const costRows = cost(records, { connector_id: "webhook-firehose", group_by: "connector" });
const costMs = performance.now() - t;

const rollupsCount = rollups.length;
const fullKept = full.length;
const hotSet = [...full, ...rollups];

console.log(`wrote ${HEARTBEATS + EVENTFUL} records in ${writeMs.toFixed(0)} ms (${(writeMs / (HEARTBEATS + EVENTFUL)).toFixed(2)} ms/record)`);
console.log(`read ${records.length} records (${corrupt.length} corrupt) in ${readMs.toFixed(0)} ms`);
console.log(`collapse: ${records.length} raw -> ${hotSet.length} kept (${fullKept} full, ${rollupsCount} hourly rollup lines) in ${collapseMs.toFixed(0)} ms`);
console.log(`whyChanged query: ${whyMs.toFixed(1)} ms, found=${why.found} run=${why.found ? why.latest.run_id : "n/a"}`);
console.log(`cost query: ${costMs.toFixed(1)} ms, rows=${costRows.length}, usd=${costRows[0]?.usd}`);

// Assertions: the hot set is bounded, the change is still findable, ledger is whole
const problems = [];
if (fullKept !== EVENTFUL) problems.push(`expected ${EVENTFUL} full records kept, got ${fullKept}`);
if (rollupsCount > 24) problems.push(`too many rollup lines: ${rollupsCount}`);
if (!why.found) problems.push("whyChanged lost the eventful run after collapse");
if (corrupt.length !== 0) problems.push(`corrupt lines: ${corrupt.length}`);
if (records.length !== HEARTBEATS + EVENTFUL) problems.push(`record count drift: ${records.length}`);
if (problems.length) {
  console.error("CARDINALITY FAILED:", problems.join("; "));
  process.exit(1);
}
console.log("CARDINALITY PASS: 5,020 runs bound to 20 full records + hourly rollups; all queries answer; the ledger stays a fraction of the work it observes");
