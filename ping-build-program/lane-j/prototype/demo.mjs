/**
 * Lane J prototype demo: synthetic connector runs exercising the writer,
 * the five queries, and all three red-team cases.
 *
 * Run: node demo.mjs   (from this directory)
 */

import { rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beginRun, readRuns, collapseHeartbeats } from "./run-ledger.mjs";
import { verifyRunRecord } from "./verify.mjs";
import { runs, changes, whyRejected, cost, whyChanged, ledgerGaps } from "./runq.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "data");
rmSync(DIR, { recursive: true, force: true });

const TENANT = "t_happy_place";
const CONN = "website";
let seq = 0;
const nextSeq = () => ++seq;
const T0 = "2026-09-23T19:39:41.002Z";

const attempt = (seqN, url, state, extra = {}) => ({
  fetch_attempt_id: `fa-demo-${String(seqN).padStart(3, "0")}`,
  seq: seqN,
  url,
  terminal_state: state,
  taxonomy_code: extra.taxonomy_code || null,
  http_status: extra.http_status ?? 200,
  bytes: extra.bytes ?? 48210,
  duration_ms: extra.duration_ms ?? 812,
  retries: extra.retries ?? 0,
  watermark_seen: extra.watermark_seen || null,
  rate_limited: false,
  at: extra.at,
});

// ---- Run 1: the worked example. Hours change on Happy Place Carpentry. ----
{
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    principal: "platform-operator", trigger: "routine-poll",
    seq: nextSeq(), started_at: T0, checkpoint_in: 'etag:W/"a91f"',
  });
  b.stream({ stream_id: "pages", mode: "incremental", records_read: 3, records_emitted: 3, checkpoint_out: 'etag:W/"c44b"' });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"b207"', at: "2026-09-23T19:39:44Z" }));
  b.attempt(attempt(2, "https://happy-place-platform.vercel.app/services", "SUCCEEDED", { watermark_seen: 'etag:W/"c44b"', at: "2026-09-23T19:39:52Z" }));
  b.attempt(attempt(3, "https://happy-place-platform.vercel.app/contact", "SUCCEEDED", { watermark_seen: 'etag:W/"c44b"', at: "2026-09-23T19:39:58Z" }));
  b.observeCounts({ discovered: 14, emitted: 14, accepted: 12, rejected: 1, unchanged: 11, changed: 1 });
  b.change({
    observation_id: "obs-website-2026-09-23T19-39-44-002Z",
    claim_id: "b81e02ff77aa19c4",
    entity_id: "biz_happy_place",
    field: "hours",
    kind: "changed",
    before: "Mon-Fri 8am-5pm",
    after: "Mon-Fri 7am-6pm, Sat 8am-12pm",
    before_event_id: "evt_9c21",
    after_event_id: "evt_a77e",
    confidence: "DIRECT",
  });
  b.rejection({
    observation_id: "obs-website-2026-09-23T19-39-44-001Z",
    claim_id: "9f2ac41d0b77e1c3",
    code: "SCHEMA_CHANGED",
    detail: "field 'hours' arrived as nested object on /contact, schema expects string; quarantined with raw payload",
    evidence_ref: "sha256:7d3a91c0",
  });
  b.rateLimits({ provider_calls: 3, quota_units: 3, limited: false, budget_remaining_pct: 97.4 });
  b.bytesIn(144630);
  b.evidenceRef("evt_a77e");
  const res = b.finish({ status: "SUCCEEDED", checkpoint_out: 'etag:W/"c44b"', finished_at: "2026-09-23T19:40:01.940Z", duration_ms: 20938 });
  console.log("run 1 (worked example) write:", res.ok ? "ok" : "FAILED: " + res.error);
}

// ---- Run 2 (RED TEAM): the run that lies about its checkpoint. ----
{
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    trigger: "routine-poll", seq: nextSeq(),
    started_at: "2026-09-24T01:39:41.002Z", checkpoint_in: 'etag:W/"c44b"',
  });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"d101"' }));
  b.attempt(attempt(2, "https://happy-place-platform.vercel.app/services", "SUCCEEDED", { watermark_seen: 'etag:W/"d202"' }));
  b.attempt(attempt(3, "https://happy-place-platform.vercel.app/contact", "FAILED", { taxonomy_code: "TIMEOUT", http_status: 0, bytes: 0 }));
  b.observeCounts({ discovered: 9, emitted: 9, accepted: 9, rejected: 0, unchanged: 9, changed: 0 });
  b.error({ code: "TIMEOUT", message: "contact page fetch timed out after 10s", recoverable: true, attempt_ref: "fa-demo-003" });
  // LIE: claims the watermark of the failed third attempt.
  const res = b.finish({ status: "PARTIAL", checkpoint_out: 'etag:W/"d303"', finished_at: "2026-09-24T01:39:53.000Z", duration_ms: 11998 });
  console.log("run 2 (lying checkpoint) write:", res.ok ? "ok" : "FAILED: " + res.error);
}

// ---- Run 3 (RED TEAM): clock skew. finished_at before started_at. ----
{
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    trigger: "freshness-triggered", seq: nextSeq(),
    started_at: "2026-09-24T07:00:00.000Z", checkpoint_in: 'etag:W/"c44b"',
  });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"e010"' }));
  b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
  const res = b.finish({
    status: "SUCCEEDED",
    checkpoint_out: 'etag:W/"e010"',
    finished_at: "2026-09-24T06:59:00.000Z", // skewed: an hour BEFORE start
    duration_ms: 4120,
  });
  console.log("run 3 (clock skew) write:", res.ok ? "ok" : "FAILED: " + res.error);
}

// ---- Run 4 (RED TEAM): the write fails mid-run. ----
{
  const doomedSeq = nextSeq();
  process.env.PING_LEDGER_DROP_WRITE = `run-${CONN}-20260924-${String(doomedSeq).padStart(4, "0")}`;
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    trigger: "routine-poll", seq: doomedSeq,
    started_at: "2026-09-24T13:00:00.000Z", checkpoint_in: 'etag:W/"e010"',
  });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"f111"' }));
  b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
  const res = b.finish({ status: "SUCCEEDED", checkpoint_out: 'etag:W/"f111"', finished_at: "2026-09-24T13:00:04.000Z", duration_ms: 4010 });
  delete process.env.PING_LEDGER_DROP_WRITE;
  console.log("run 4 (dropped write):", res.ok ? "UNEXPECTEDLY ok" : "failed as staged: " + res.error);
}

// ---- Run 5: the next run detects the gap left by run 4. ----
{
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    trigger: "routine-poll", seq: nextSeq(),
    started_at: "2026-09-24T19:00:00.000Z", checkpoint_in: 'etag:W/"e010"',
  });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"f222"' }));
  b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
  const res = b.finish({ status: "SUCCEEDED", checkpoint_out: 'etag:W/"f222"', finished_at: "2026-09-24T19:00:05.000Z", duration_ms: 5120 });
  console.log("run 5 write:", res.ok ? "ok" : "FAILED", "| prior_ledger_gap:", res.record.prior_ledger_gap,
    "| missing_seqs:", JSON.stringify(res.record.missing_seqs));
}

// ---- Runs 6-8: heartbeats (no changes) for the collapse demo. ----
for (let h = 0; h < 3; h++) {
  const b = beginRun(DIR, {
    connector_id: CONN, connector_version: "0.3.1", tenant_id: TENANT,
    trigger: "routine-poll", seq: nextSeq(),
    started_at: `2026-09-25T0${h}:00:00.000Z`, checkpoint_in: 'etag:W/"f222"',
  });
  b.attempt(attempt(1, "https://happy-place-platform.vercel.app/", "SUCCEEDED", { watermark_seen: 'etag:W/"f222"' }));
  b.observeCounts({ discovered: 5, emitted: 5, accepted: 5, rejected: 0, unchanged: 5, changed: 0 });
  b.finish({ status: "SUCCEEDED", checkpoint_out: 'etag:W/"f222"', finished_at: `2026-09-25T0${h}:00:04.000Z`, duration_ms: 4050 });
}

// ---- Read back, verify, query. ----
const { records, corrupt } = readRuns(DIR);
console.log(`\nledger: ${records.length} records, ${corrupt.length} corrupt lines`);

console.log("\n== verifier verdicts ==");
for (const r of records) {
  const v = verifyRunRecord(r);
  console.log(`${r.run_id}: ${v.verdict}` + (v.issues.length ? `  [${v.issues.join("; ")}]` : ""));
}

console.log("\n== ledger gaps ==");
console.log(JSON.stringify(ledgerGaps(records, CONN, TENANT)));

console.log("\n== query 1: runs by source+time ==");
for (const r of runs(records, { connector_id: CONN })) {
  console.log(`${r.run_id} ${r.status} changed=${r.observations.changed} gap=${r.prior_ledger_gap}`);
}

console.log("\n== query 2: what changed in run 1 ==");
const r1 = records[0].run_id;
console.log(JSON.stringify(changes(records, r1).changes, null, 1));

console.log("\n== query 3: why was the observation rejected ==");
console.log(JSON.stringify(whyRejected(records, "obs-website-2026-09-23T19-39-44-001Z"), null, 1));

console.log("\n== query 4: cost by source over time ==");
console.log(JSON.stringify(cost(records, { group_by: "day" }), null, 1));

console.log("\n== query 5: WHY DID FYD CHANGE (biz_happy_place.hours) ==");
const ans = whyChanged(records, "biz_happy_place", "hours");
console.log(JSON.stringify({ found: ans.found, latest: ans.latest, handoff: ans.handoff }, null, 1));

console.log("\n== heartbeat collapse ==");
const { full, rollups } = collapseHeartbeats(records);
console.log(`full records kept: ${full.length}, heartbeat rollups: ${rollups.length}`);
console.log(JSON.stringify(rollups, null, 1));
