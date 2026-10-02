#!/usr/bin/env node
/**
 * LANE A vertical slice: one repository end to end.
 *
 * Against a LOCAL bare mirror of the PING repo (read-only for ingestion;
 * one clearly-namespaced scratch ref is created and deleted for the
 * cursor-advance demo):
 *
 *   1. FULL ingest of refs/heads/fyd-factory from null -> cursor = HEAD.
 *   2. SAME-COMMIT twice: second ingest emits no new knowledge (idempotent).
 *   3. OLD HEAD -> NEW HEAD: buildPacket with an explicit older SHA walks
 *      only the delta.
 *   4. CURSOR ADVANCE on a real ref move: scratch ref + one empty commit.
 *   5. STALE race: unit-level (covered by G-09 in the test suite).
 *
 * Then query.mjs answers "what changed in <path> between <shaA> and <shaB>"
 * from the ingested packets, every claim citing commit SHA + packet evidence.
 *
 * Usage: node slice/run-slice.mjs  (run from the git-spike directory)
 */
import { execFile } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingest, loadPackets } from "../src/cursor.mjs";
import { buildPacket } from "../src/packet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPIKE = dirname(HERE);
const MIRROR = join(SPIKE, "..", "ping-mirror.git");
const STATE = join(HERE, "state");
const SLUG = "ping";
const REF = "refs/heads/fyd-factory";
const SCRATCH = "refs/heads/lane-a-slice-scratch";

const sh = (args) =>
  new Promise((res, rej) => {
    execFile("git", ["--git-dir=" + MIRROR, ...args], (e, so, se) =>
      e ? rej(new Error(`git ${args[0]}: ${String(se).slice(0, 200)}`)) : res(String(so).trim())
    );
  });

const step = (n, msg) => console.log(`\n=== [${n}] ${msg} ===`);

const summary = (label, packet) => {
  const kinds = {};
  for (const o of packet.observations) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  console.log(`${label}: status=${packet.status} commits_walked=${packet.coverage.commits_walked} ` +
    `skipped_seen=${packet.coverage.commits_skipped_seen} capped=${packet.coverage.commits_capped} ` +
    `file_changes=${packet.coverage.file_changes}`);
  console.log(`  observations: ${JSON.stringify(kinds)}`);
  console.log(`  evidence: sha256=${packet.evidence.canonical_sha256} bytes=${packet.evidence.canonical_bytes}`);
  console.log(`  cursor: ${packet.cursor.old_head ? packet.cursor.old_head.slice(0, 12) : "null"} -> ` +
    `${packet.cursor.new_head ? packet.cursor.new_head.slice(0, 12) : "null"}`);
};

const HEAD = await sh(["rev-parse", REF]);
const OLD = await sh(["rev-parse", HEAD + "~30"]);
console.log(`mirror: ${MIRROR}\nHEAD(${REF}): ${HEAD}\nOLD (HEAD~30): ${OLD}`);

// Clean slate for a reproducible slice.
if (existsSync(STATE)) rmSync(STATE, { recursive: true });

// 1. Full ingest from null.
step(1, "FULL ingest: null -> HEAD");
const r1 = await ingest(MIRROR, STATE, SLUG, REF);
summary("packet1", r1.packet);
console.log(`cursor_advanced=${r1.result.cursor_advanced} commits_new=${r1.result.commits_new}`);

// 2. Same commit twice: idempotent, no new packet content.
step(2, "SAME-COMMIT twice (idempotency)");
const r2 = await ingest(MIRROR, STATE, SLUG, REF);
summary("packet2", r2.packet);
console.log(`cursor_advanced=${r2.result.cursor_advanced} commits_new=${r2.result.commits_new} ` +
  `(expect 0 new: no duplicate canonical knowledge)`);

// 3. OLD HEAD -> NEW HEAD delta via explicit range.
step(3, "INCREMENTAL: OLD HEAD -> NEW HEAD walks only the delta");
const seen = new Set();
const delta = await buildPacket(MIRROR, SLUG, REF, OLD, seen);
summary("delta", delta);

// 4. Cursor advance on a real ref move (scratch ref, deleted afterwards).
step(4, "CURSOR ADVANCE on a real ref move");
await sh(["update-ref", SCRATCH, HEAD]);
const s1 = await ingest(MIRROR, STATE, SLUG, SCRATCH);
console.log(`scratch ingest: status=${s1.packet.status} commits_new=${s1.result.commits_new}`);
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // well-known empty tree
const newCommitRaw =
  `tree ${EMPTY_TREE}\nparent ${HEAD}\n` +
  `author Lane A <lane-a@example.com> 1720000000 +0000\n` +
  `committer Lane A <lane-a@example.com> 1720000000 +0000\n\nlane-a slice: empty marker commit\n`;
const NEWC = await new Promise((res, rej) => {
  const c = execFile("git", ["--git-dir=" + MIRROR, "hash-object", "-t", "commit", "-w", "--stdin"],
    (e, so, se) => (e ? rej(new Error(String(se).slice(0, 200))) : res(String(so).trim())));
  c.stdin.write(newCommitRaw);
  c.stdin.end();
});
await sh(["update-ref", SCRATCH, NEWC]);
const s2 = await ingest(MIRROR, STATE, SLUG, SCRATCH);
console.log(`after ref move: status=${s2.packet.status} commits_new=${s2.result.commits_new} ` +
  `cursor_advanced=${s2.result.cursor_advanced}`);
console.log(`range: ${s2.result.old_head.slice(0, 12)} -> ${s2.result.new_head.slice(0, 12)}`);
await sh(["update-ref", "-d", SCRATCH]);
console.log("scratch ref deleted");

// 5. Packet inventory + dogfood query.
step(5, "PACKET INVENTORY + dogfood query");
const packets = loadPackets(STATE, SLUG);
console.log(`persisted packets: ${packets.length} (idempotent re-ingests persist nothing)`);
for (const p of packets) {
  console.log(`  ${p.packet_id.slice(0, 16)} status=${p.status} ref=${p.cursor.ref} ` +
    `commits=${p.coverage.commits_walked}`);
}

console.log("\nSlice complete. Run the dogfood query, e.g.:");
console.log(`  node src/query.mjs --state slice/state --slug ${SLUG} --path src/fyd \\`);
console.log(`    --from ${OLD} --to ${HEAD}`);
