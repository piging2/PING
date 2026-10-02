/**
 * Cursor + knowledge driver.
 *
 * Per-repo state dir layout:
 *   state/<slug>/cursor.json   { refs: {refname: sha}, updated_at }
 *   state/<slug>/seen.json      [commit SHAs already turned into knowledge]
 *   state/<slug>/packets.jsonl one canonical packet per line
 *
 * Incremental ingestion: OLD HEAD (cursor) -> NEW HEAD (ref snapshot).
 * Idempotency: a commit SHA already in seen.json contributes zero new
 * knowledge; re-ingesting the same range emits no new packet observations.
 * The cursor advances ONLY on OK packets (never STALE, never QUARANTINED).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { buildPacket } from "./packet.mjs";

export function stateDir(root, slug) {
  const d = join(root, "state", slug);
  mkdirSync(d, { recursive: true });
  return d;
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export async function ingest(gitDir, stateRoot, slug, ref) {
  const dir = stateDir(stateRoot, slug);
  const cursorPath = join(dir, "cursor.json");
  const seenPath = join(dir, "seen.json");
  const packetsPath = join(dir, "packets.jsonl");

  const cursor = loadJson(cursorPath, { refs: {}, updated_at: null });
  const seenArr = loadJson(seenPath, []);
  const seen = new Set(seenArr);

  const oldHead = cursor.refs[ref] ?? null;
  const packet = await buildPacket(gitDir, slug, ref, oldHead, seen);

  const newCommits = packet.observations.filter((o) => o.kind === "commit").map((o) => o.sha);
  const result = {
    status: packet.status,
    packet_id: packet.packet_id,
    old_head: oldHead,
    new_head: packet.cursor.new_head,
    commits_new: newCommits.length,
    commits_skipped_seen: packet.coverage.commits_skipped_seen,
    cursor_advanced: false,
  };

  if (packet.status === "OK") {
    // Persist only packets that carry new knowledge; a re-ingested range
    // produces no new packet (idempotency), but the cursor still advances.
    if (newCommits.length > 0) {
      appendFileSync(packetsPath, JSON.stringify(packet) + "\n");
      for (const sha of newCommits) seen.add(sha);
      writeFileSync(seenPath, JSON.stringify([...seen].sort(), null, 1));
    }
    cursor.refs[ref] = packet.cursor.new_head;
    cursor.updated_at = new Date().toISOString();
    writeFileSync(cursorPath, JSON.stringify(cursor, null, 1));
    result.cursor_advanced = true;
  }
  // STALE / QUARANTINED: packet is returned for audit but NOT persisted and
  // the cursor does not move. The next run retries the same range.

  return { result, packet };
}

export function loadPackets(stateRoot, slug) {
  const p = join(stateRoot, "state", slug, "packets.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
