#!/usr/bin/env node
/**
 * WIRING-RUNBOOK step 2/3: live POST + readback + diff.
 * EXECUTES ONLY UNDER INGEST-001 AUTHORIZATION (Nolan's GO).
 *
 * Usage (from the Pig's WSL, or any host that reaches the gateway):
 *   export PING_INGEST_BEARER='<bearer from exterior_agent_credentials>'
 *   # NEVER echo the bearer. NEVER write it to a file. NEVER put it in a report.
 *   node run-live.mjs --gateway http://127.0.0.1:8080 \
 *     --envelopes ~/workspace/ping-build-program/lane-wire/milestone-envelopes-all.jsonl \
 *     --out ./live-run-RESULTS.json
 *
 * Exit 0 = all assertions pass. Exit 1 = assertion failed (see RESULTS file).
 * Exit 2 = usage / environment error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}
const gateway = (arg("gateway") || "").replace(/\/$/, "");
const envPath = arg("envelopes");
const outPath = arg("out");
const bearer = process.env.PING_INGEST_BEARER;
if (!gateway || !envPath || !outPath) { console.error("usage: run-live.mjs --gateway <url> --envelopes <jsonl> --out <json>"); process.exit(2); }
if (!bearer) { console.error("PING_INGEST_BEARER is required (never print it)"); process.exit(2); }

const NS = "core::owner";
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const expectedEventId = (e) => sha256(JSON.stringify({ eventType: e.eventType, source: e.source, namespace: NS, logical_id: e.logicalId }));

const envelopes = readFileSync(envPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const results = { gateway, startedAt: new Date().toISOString(), posts: [], assertions: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- pass 1: POST all envelopes ---------------------------------------------
for (const e of envelopes) {
  const res = await fetch(`${gateway}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${bearer}` },
    body: JSON.stringify(e),
  });
  const body = await res.json().catch(() => ({}));
  results.posts.push({ logicalId: e.logicalId, source: e.source, http: res.status,
    eventId: body.eventId ?? null, objectId: body.objectId ?? null, error: body.error ?? null });
  await sleep(10);
}
const ok201 = results.posts.filter((p) => p.http === 201);
results.assertions.all201 = { pass: ok201.length === envelopes.length, n201: ok201.length, n: envelopes.length };

// --- readback: journal rows for our three sources via HTTP -------------------
const recent = await (await fetch(`${gateway}/events/recent?limit=10000`, {
  headers: { "authorization": `Bearer ${bearer}` },
})).json().catch(() => null);
const rows = Array.isArray(recent) ? recent : (recent?.events ?? recent?.rows ?? []);
const ours = rows.filter((r) => ["git-ingestor:lane-a", "connector:github-connector:lane-conn", "connector:google-business-profile:lane-conn"].includes(r.source));
results.readback = { httpRowsSeen: rows.length, ourSourceRows: ours.length };

// --- diff: expected eventIds vs journal ---------------------------------------
const expected = new Map(envelopes.map((e) => [expectedEventId(e), e.logicalId]));
const journalIds = new Set(ours.map((r) => r.event_id));
const missing = [...expected.keys()].filter((id) => !journalIds.has(id));
const unexpected = [...journalIds].filter((id) => !expected.has(id));
results.assertions.eventIdsMatch = { pass: missing.length === 0, missing: missing.length };
results.assertions.noExtraRows = { pass: unexpected.length === 0, unexpected: unexpected.length };
results.assertions.eventIdUnique = { pass: journalIds.size === ours.length };

// --- native Git SHA citations in readback --------------------------------------
const gitRows = ours.filter((r) => r.source === "git-ingestor:lane-a" && String(r.event_id && expected.get(r.event_id) || "").startsWith("git:commit:"));
let shaOk = 0, shaBad = 0;
for (const r of gitRows) {
  const lid = expected.get(r.event_id);
  const sha = lid.slice("git:commit:".length);
  let payload = r.payload; if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }
  if (payload && payload.sha === sha) shaOk++; else shaBad++;
}
results.assertions.gitShaCited = { pass: shaBad === 0 && shaOk > 0, shaOk, shaBad };

// --- pass 2: idempotent re-POST --------------------------------------------------
const reposts = [];
for (const e of envelopes) {
  const res = await fetch(`${gateway}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${bearer}` },
    body: JSON.stringify(e),
  });
  const body = await res.json().catch(() => ({}));
  reposts.push({ http: res.status, eventId: body.eventId ?? null });
  await sleep(10);
}
const sameIds = reposts.every((p, i) => p.http === 201 && p.eventId === results.posts[i].eventId);
const recent2 = await (await fetch(`${gateway}/events/recent?limit=10000`, {
  headers: { "authorization": `Bearer ${bearer}` },
})).json().catch(() => null);
const rows2 = Array.isArray(recent2) ? recent2 : (recent2?.events ?? recent2?.rows ?? []);
const ours2 = rows2.filter((r) => ["git-ingestor:lane-a", "connector:github-connector:lane-conn", "connector:google-business-profile:lane-conn"].includes(r.source));
results.assertions.idempotentRepost = {
  pass: sameIds && ours2.length === ours.length,
  note: "route returns 201 + identical eventId on redelivery; row count unchanged (ON CONFLICT DO NOTHING, handlers not re-triggered)",
  reposts: reposts.length, rowsBefore: ours.length, rowsAfter: ours2.length,
};

results.finishedAt = new Date().toISOString();
writeFileSync(outPath, JSON.stringify(results, null, 2));
const failed = Object.entries(results.assertions).filter(([, a]) => a.pass === false);
console.log(JSON.stringify({ assertions: Object.fromEntries(Object.entries(results.assertions).map(([k, a]) => [k, a.pass])) }, null, 2));
if (failed.length) { console.error("FAILED:", failed.map(([k]) => k).join(", ")); process.exit(1); }
console.log("ALL LIVE ASSERTIONS PASS");
